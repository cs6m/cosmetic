// Admin-side Supabase services: full CRUD for every table, plus the few operations that
// aren't plain CRUD (order status, image upload, team provisioning, seeding).
// Row-level security decides what each signed-in team member may actually do.
import { MEDIA_BUCKET, supabase } from "../lib/supabaseClient"
import { buildSeed } from "../data/adminDb"
import { TABLES, TABLE_BY_NAME } from "../data/supabaseMap"

const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

// Generic CRUD for one table, in the app's own record shape.
export function crud(table) {
  const spec = TABLE_BY_NAME[table]
  if (!spec) throw new Error(`Unknown table ${table}`)
  const toRows = (items) => items.map((record, index) => spec.toRow(record, index))
  const match = (record) => Object.fromEntries(spec.pk.map((column) => [column, spec.toRow(record, 0)[column]]))
  return {
    async list() {
      let query = supabase.from(table).select("*")
      if (spec.filter) query = spec.filter(query)
      for (const [column, ascending] of spec.orderBy || []) query = query.order(column, { ascending })
      return unwrap(await query).map(spec.fromRow)
    },
    async get(match_) {
      let query = supabase.from(table).select("*")
      Object.entries(match_).forEach(([column, value]) => {
        query = query.eq(column, value)
      })
      const row = unwrap(await query.maybeSingle())
      return row ? spec.fromRow(row) : null
    },
    async create(record) {
      return spec.fromRow(unwrap(await supabase.from(table).insert(toRows([record])[0]).select("*").single()))
    },
    async update(record) {
      const row = spec.toRow(record, 0)
      return spec.fromRow(unwrap(await supabase.from(table).update(row).match(match(record)).select("*").single()))
    },
    async upsertMany(items) {
      return unwrap(await supabase.from(table).upsert(toRows(items), { onConflict: spec.pk.join(",") }).select("*")).map(spec.fromRow)
    },
    async remove(record) {
      unwrap(await supabase.from(table).delete().match(match(record)))
      return true
    },
    // Live changes: onChange({ type: "INSERT" | "UPDATE" | "DELETE", record, oldRecord })
    subscribe(onChange) {
      const channel = supabase.channel(`admin-${table}-${Math.random().toString(36).slice(2)}`)
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) =>
        onChange({
          type: payload.eventType,
          record: payload.new && Object.keys(payload.new).length ? spec.fromRow(payload.new) : null,
          oldRecord: payload.old && Object.keys(payload.old).length ? spec.fromRow(payload.old) : null,
        }),
      )
      channel.subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

export const products = crud("products")
export const categories = crud("categories")
export const subcategories = crud("subcategories")
export const brands = crud("brands")
export const badges = crud("badges")
export const banners = crud("banners")
export const faqs = crud("faqs")
export const socials = crud("socials")
export const governorates = crud("governorates")
export const customers = crud("customers")
export const orders = crud("orders")
export const reviews = crud("reviews")
export const team = crud("profiles")
export const cmsEntries = crud("cms_entries")
export const storeSettings = crud("store_settings")
export const auditLog = crud("audit_log")

// ---- non-CRUD operations -------------------------------------------------------

// Moves an order along its flow. The database refuses illegal jumps (see guard_order_flow).
export async function setOrderStatus(orderId, status, by = "admin") {
  const current = unwrap(await supabase.from("orders").select("history").eq("id", orderId).single())
  const history = [...(current.history || []), { status, at: new Date().toISOString(), by }]
  return TABLE_BY_NAME.orders.fromRow(unwrap(await supabase.from("orders").update({ status, history }).eq("id", orderId).select("*").single()))
}

export async function setReviewStatus(id, status) {
  unwrap(await supabase.from("reviews").update({ status }).eq("id", id))
}

export async function logAudit(email, message) {
  unwrap(await supabase.from("audit_log").insert({ email, message }))
}

// Uploads a File picked on the admin's device and returns its public URL.
export async function uploadImage(file, folder = "misc") {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" })
  if (error) throw error
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

// Team accounts need Supabase Auth, so they go through the admin-users Edge Function.
export async function createTeamMember({ email, password, name, role = "staff", permissions = [], active = true }) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "create", email, password, name, role, permissions, active } })
  if (error || data?.error) throw error || new Error(data.error)
  return data
}
export async function setTeamPassword(id, password) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "set-password", id, password } })
  if (error || data?.error) throw error || new Error(data.error)
}
export async function deleteTeamMember(id) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", id } })
  if (error || data?.error) throw error || new Error(data.error)
}

// One-click upload of the app's built-in demo data (the same data 02_seed_data.sql contains).
// Safe to run more than once: rows are upserted by primary key.
export async function seedFromLocalData() {
  const seed = buildSeed()
  const order = TABLES.filter((entry) => entry.table !== "profiles" && entry.table !== "audit_log")
  for (const entry of order) {
    const rows = entry.read(seed).map((record, index) => entry.toRow(record, index))
    if (!rows.length) continue
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from(entry.table).upsert(rows.slice(i, i + 200), { onConflict: entry.pk.join(",") })
      if (error) throw new Error(`${entry.table}: ${error.message}`)
    }
  }
  return true
}
