// Live persistence for adminDb.js.
//
// adminDb keeps working exactly as before — every save/delete function still builds the next
// db object and calls commit(). This module sits behind commit():
//   • pushChanges(prev, next)  diffs the two objects and writes only what changed to Supabase
//   • hydrate()                loads the current rows from Supabase into the db object
//   • realtime                 postgres_changes events patch the db object, so every open
//                              browser (customer or admin) updates without a refresh
import { isSupabaseConfigured, MEDIA_BUCKET, supabase } from "../lib/supabaseClient"
import { diffDb, stable, TABLES, TABLE_BY_NAME } from "./supabaseMap"

let bridge = null // { get(), setRemote(db), replaceText(map), renameOrder(from, to), dropOrder(id) }
let role = null // "admin" | "staff" | null (guest)
let userId = null
let channel = null
let queue = Promise.resolve()
let pending = 0
let hydrating = null
let needsRollback = false // a save failed while others were still queued
let booted = false
const dirty = new Set()
const timers = new Map()
const memberPasswords = new Map()

export const syncEnabled = isSupabaseConfigured

export const getSyncRole = () => role
export const isStaffSession = () => Boolean(role)
export const getUserId = () => userId

function announce(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch {
    /* non-browser environment */
  }
}

function reportError(error, context) {
  const message = error?.message || String(error)
  console.warn(`[glowora sync] ${context}:`, message)
  announce("glowora-sync-error", { context, message })
}

/* ------------------------------------------------------------------ identity */

async function refreshIdentity() {
  const { data } = await supabase.auth.getSession()
  const session = data?.session
  userId = session?.user?.id || null
  role = null
  if (session && !session.user.is_anonymous) {
    const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", userId).maybeSingle()
    if (profile?.active && (profile.role === "admin" || profile.role === "staff")) role = profile.role
  }
}

async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data?.session) return
  const result = await supabase.auth.signInAnonymously()
  if (result.error) reportError(result.error, "anonymous sign-in (enable Anonymous sign-ins in Supabase Auth settings)")
}

export async function signInStaff(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, reason: "invalid" }
  await refreshIdentity()
  if (!role) {
    await signOutStaff()
    return { ok: false, reason: "invalid" }
  }
  await hydrate()
  return { ok: true, userId }
}

export async function signOutStaff() {
  await supabase.auth.signOut()
  role = null
  userId = null
  await ensureSession()
  await refreshIdentity()
  await hydrate()
}

export async function changeOwnPassword(email, currentPassword, nextPassword) {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (check.error) return { ok: false, reason: "mismatch" }
  const { error } = await supabase.auth.updateUser({ password: nextPassword })
  return error ? { ok: false, reason: "password" } : { ok: true }
}

// Remembers a teammate's password just long enough to hand it to the admin-users function.
export function rememberPassword(id, password) {
  if (password) memberPasswords.set(id, password)
}

/* ------------------------------------------------------------------ reading */

async function fetchAll(entry) {
  const out = []
  const size = 1000
  for (let from = 0; ; from += size) {
    let query = supabase.from(entry.table).select("*")
    if (entry.filter) query = entry.filter(query)
    for (const [column, ascending] of entry.orderBy || []) query = query.order(column, { ascending })
    const to = entry.limit ? entry.limit - 1 : from + size - 1
    const { data, error } = await query.range(entry.limit ? 0 : from, to)
    if (error) {
      reportError(error, `read ${entry.table}`)
      return null
    }
    out.push(...data)
    if (entry.limit || data.length < size) break
  }
  return out
}

export function hydrate() {
  if (!supabase || !bridge) return Promise.resolve()
  if (hydrating) return hydrating
  hydrating = (async () => {
    const staff = Boolean(role)
    const results = await Promise.all(
      TABLES.map(async (entry) => [entry, entry.staffOnly && !staff ? [] : await fetchAll(entry)]),
    )
    let next = bridge.get()
    // Tables are applied in dependency order (categories before subcategories, …).
    for (const [entry, rows] of results) {
      if (rows === null) continue // keep what we have if a read failed
      next = entry.write(next, rows.map(entry.fromRow))
    }
    bridge.setRemote(next)
  })()
    .catch((error) => reportError(error, "hydrate"))
    .finally(() => {
      hydrating = null
    })
  return hydrating
}

async function refetchTable(entry) {
  const rows = await fetchAll(entry)
  if (rows === null) return
  bridge.setRemote(entry.write(bridge.get(), rows.map(entry.fromRow)))
}

function scheduleRefetch(entry) {
  clearTimeout(timers.get(entry.table))
  timers.set(
    entry.table,
    setTimeout(() => {
      timers.delete(entry.table)
      refetchTable(entry).catch((error) => reportError(error, `refresh ${entry.table}`))
    }, 200),
  )
}

/* ------------------------------------------------------------------ realtime */

// Row-by-row patching for the large tables.
function applyRow(entry, payload) {
  const current = bridge.get()
  const list = entry.read(current)
  const source = payload.eventType === "DELETE" ? payload.old : payload.new
  if (!source) return
  const record = entry.fromRow(source)
  const key = entry.key(record)
  const index = list.findIndex((item) => entry.key(item) === key)

  if (payload.eventType === "DELETE") {
    if (index < 0) return
    bridge.setRemote(entry.write(current, list.filter((_, i) => i !== index)))
    return
  }
  if (index >= 0) {
    if (stable(entry.toRow(list[index], index)) === stable(entry.toRow(record, index))) return // our own echo
    bridge.setRemote(entry.write(current, list.map((item, i) => (i === index ? record : item))))
    return
  }
  bridge.setRemote(entry.write(current, [record, ...list]))
}

function onChange(entry, payload) {
  if (pending > 0) {
    dirty.add(entry.table) // we are mid-write; reconcile when it finishes
    return
  }
  if (entry.incremental) applyRow(entry, payload)
  else scheduleRefetch(entry)
  // Under RLS a guest simply stops receiving a product that was hidden, so re-read to drop it.
  if (!role && (entry.table === "products" || entry.table === "reviews")) scheduleRefetch(entry)
}

function startRealtime() {
  if (channel) return
  channel = supabase.channel("glowora-live")
  TABLES.forEach((entry) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table: entry.table }, (payload) => {
      try {
        onChange(entry, payload)
      } catch (error) {
        reportError(error, `realtime ${entry.table}`)
      }
    })
  })
  channel.subscribe((status) => {
    // After a dropped connection comes back, catch up on anything we missed.
    if (status === "SUBSCRIBED" && booted) hydrate()
  })
}

/* ------------------------------------------------------------------ media */

const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,/i

async function uploadDataUrl(dataUrl, folder) {
  const type = dataUrl.slice(5, dataUrl.indexOf(";"))
  const extension = type.split("/")[1].replace("jpeg", "jpg")
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false })
  if (error) throw error
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

async function moveImagesToStorage(entry, rows, replaced) {
  const walk = async (value) => {
    if (typeof value === "string") {
      if (!DATA_IMAGE.test(value)) return value
      if (!replaced.has(value)) replaced.set(value, await uploadDataUrl(value, entry.table))
      return replaced.get(value)
    }
    if (Array.isArray(value)) return Promise.all(value.map(walk))
    if (value && typeof value === "object") {
      const out = {}
      for (const [key, inner] of Object.entries(value)) out[key] = await walk(inner)
      return out
    }
    return value
  }
  return Promise.all(rows.map(walk))
}

/* ------------------------------------------------------------------ writing */

const pkMatch = (entry, row) => Object.fromEntries(entry.pk.map((column) => [column, row[column]]))

async function insertGuestOrders(rows) {
  for (const row of rows) {
    let attempt = row
    for (let tries = 0; tries < 4; tries += 1) {
      const { error } = await supabase.from("orders").insert(attempt)
      if (!error) {
        if (attempt.id !== row.id) bridge.renameOrder(row.id, attempt.id)
        break
      }
      if (error.code === "23505") {
        // Another shopper took this number first — ask the server for the next free one.
        const { data } = await supabase.rpc("next_order_id")
        attempt = { ...attempt, id: data }
        continue
      }
      bridge.dropOrder(row.id)
      throw error
    }
  }
}

async function callAdminUsers(body) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

async function writeProfiles({ upserts, removed }) {
  const renamed = new Map()
  for (const { key, row, isNew } of upserts) {
    const password = memberPasswords.get(key)
    if (isNew) {
      if (!password) throw new Error("A password is required to add a teammate.")
      const created = await callAdminUsers({ action: "create", email: row.email, password, name: row.name, role: row.role, active: row.active, permissions: row.permissions })
      renamed.set(key, created.id)
    } else {
      if (password) await callAdminUsers({ action: "set-password", id: key, password })
      const { error } = await supabase.from("profiles").update({ name: row.name, role: row.role, active: row.active, permissions: row.permissions }).eq("id", key)
      if (error) throw error
    }
    memberPasswords.delete(key)
  }
  for (const { key } of removed) await callAdminUsers({ action: "delete", id: key })
  if (renamed.size) bridge.replaceText(renamed)
}

async function runChanges(changes) {
  const replaced = new Map()
  const staff = Boolean(role)

  // 1) inserts / updates, parents before children
  for (const { entry, upserts } of changes) {
    if (!upserts.length) continue
    if (entry.table === "profiles") continue
    if (!staff) {
      if (entry.guestInsert) {
        const fresh = upserts.filter((item) => item.isNew).map((item) => item.row)
        if (entry.table === "orders") await insertGuestOrders(fresh)
        else if (fresh.length) {
          const { error } = await supabase.from(entry.table).insert(fresh)
          if (error) throw error
        }
      }
      continue // guests can't change anything else
    }
    const rows = await moveImagesToStorage(entry, upserts.map((item) => item.row), replaced)
    const { error } = await supabase.from(entry.table).upsert(rows, { onConflict: entry.pk.join(",") })
    if (error) throw Object.assign(error, { message: `${entry.table}: ${error.message}` })
  }
  const team = changes.find((item) => item.entry.table === "profiles")
  if (team && staff) await writeProfiles(team)

  // 2) deletes, children before parents
  if (staff) {
    for (const { entry, removed } of [...changes].reverse()) {
      if (!removed.length || entry.noDelete || entry.table === "profiles") continue
      if (entry.pk.length === 1) {
        const { error } = await supabase.from(entry.table).delete().in(entry.pk[0], removed.map((item) => item.row[entry.pk[0]]))
        if (error) throw Object.assign(error, { message: `${entry.table}: ${error.message}` })
      } else {
        for (const { row } of removed) {
          const { error } = await supabase.from(entry.table).delete().match(pkMatch(entry, row))
          if (error) throw Object.assign(error, { message: `${entry.table}: ${error.message}` })
        }
      }
    }
  }

  // 3) uploaded images now live in Storage; swap the local base64 copies for their URLs
  if (replaced.size) bridge.replaceText(replaced)
}

// Called by adminDb.commit() after every successful local write.
export function pushChanges(prev, next) {
  if (!supabase || !bridge || !prev) return
  const changes = diffDb(prev, next)
  if (!changes.length) return
  pending += 1
  queue = queue
    .then(() => runChanges(changes))
    .catch((error) => {
      needsRollback = true
      reportError(error, "save")
    })
    .finally(async () => {
      pending -= 1
      if (pending > 0) return
      try {
        if (needsRollback) await hydrate() // roll the screen back to what the database actually holds
        else {
          for (const name of dirty) await refetchTable(TABLE_BY_NAME[name])
        }
      } finally {
        needsRollback = false
        dirty.clear()
      }
    })
}

export function flushSync() {
  return queue
}

/* ------------------------------------------------------------------ start-up */

export function attachSync(api) {
  if (!supabase || booted) return
  bridge = api
  booted = true
  ;(async () => {
    try {
      await ensureSession()
      await refreshIdentity()
      await hydrate()
      startRealtime()
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          refreshIdentity().then(hydrate)
        }
      })
    } catch (error) {
      reportError(error, "start-up")
    }
  })()
}
