import { supabase } from "./supabaseClient"

const VISITOR_KEY = "glowora-visitor-id"
const VISIT_AT_KEY = "glowora-last-visit"
const SIX_HOURS = 6 * 60 * 60 * 1000

let inflight = null

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

async function record(pagePath) {
  if (!supabase || !pagePath || pagePath.includes("#/admin") || pagePath.includes("/admin")) return
  const id = visitorId()
  if (!id) return
  let last = 0
  try {
    last = Number(localStorage.getItem(VISIT_AT_KEY) || 0)
  } catch {
    last = 0
  }
  const now = Date.now()
  if (last && now - last < SIX_HOURS) return
  let userId = null
  try {
    const { data } = await supabase.auth.getSession()
    const user = data?.session?.user
    if (user && !user.is_anonymous) userId = user.id
  } catch {
    userId = null
  }
  const { error } = await supabase.from("page_visits").insert({
    visitor_id: id,
    page_path: String(pagePath).slice(0, 240),
    user_id: userId,
  })
  if (!error) {
    try {
      localStorage.setItem(VISIT_AT_KEY, String(Date.now()))
    } catch {
      /* the visit is stored; the next page load may record another one */
    }
  }
}

export function trackStorefrontVisit(pagePath) {
  if (inflight) return inflight
  inflight = record(pagePath).finally(() => {
    inflight = null
  })
  return inflight
}
