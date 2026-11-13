// Customer-side Supabase services. They use the same record shapes the storefront already uses
// (product.nameAr, order.customerId, settings.governorates …), so results can be passed straight
// into the existing components.
//
// NOTE: the running app already persists through adminDb.js → supabaseSync.js. These functions are
// the explicit, standalone API for the same operations (handy for tests, scripts or new screens).
import { supabase } from "../lib/supabaseClient"
import { TABLE_BY_NAME } from "../data/supabaseMap"

const entry = (name) => TABLE_BY_NAME[name]
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}
const records = (name, rows) => rows.map(entry(name).fromRow)

async function listAll(name, shape = (query) => query) {
  const spec = entry(name)
  let query = supabase.from(name).select("*")
  for (const [column, ascending] of spec.orderBy || []) query = query.order(column, { ascending })
  return records(name, unwrap(await shape(query)))
}

// ---- catalogue (public read) -------------------------------------------------
export const listProducts = () => listAll("products", (q) => q.eq("status", "active"))
export const listCategories = () => listAll("categories")
export const listSubcategories = () => listAll("subcategories")
export const listBrands = () => listAll("brands")
export const listBadges = () => listAll("badges")
export const listBanners = () => listAll("banners")
export const listFaqs = () => listAll("faqs")
export const listSocials = () => listAll("socials")
export const listGovernorates = () => listAll("governorates")

export async function getProduct(id) {
  const row = unwrap(await supabase.from("products").select("*").eq("id", id).eq("status", "active").maybeSingle())
  return row ? entry("products").fromRow(row) : null
}

export async function listApprovedReviews(productId) {
  return records("reviews", unwrap(await supabase.from("reviews").select("*").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false })))
}

// Server-side search across names (both languages), subtitle, description, SKU.
export async function searchProducts(text) {
  const term = String(text || "").trim().replace(/[%,()]/g, " ")
  if (!term) return listProducts()
  const like = `%${term}%`
  const rows = unwrap(
    await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .or(["name", "name_ar", "subtitle", "subtitle_ar", "description", "description_ar", "sku", "category_id", "brand_id"].map((c) => `${c}.ilike.${like}`).join(",")),
  )
  return records("products", rows)
}

export async function getStoreSettings() {
  const settings = Object.fromEntries(unwrap(await supabase.from("store_settings").select("*")).map((row) => [row.key, row.value]))
  settings.governorates = await listGovernorates()
  return settings
}

export async function getCms() {
  return Object.fromEntries(unwrap(await supabase.from("cms_entries").select("*")).map((row) => [row.key, row.value]))
}

// ---- orders (own records only; RLS enforces it) ------------------------------
export async function placeOrder(order) {
  const spec = entry("orders")
  let row = spec.toRow(order)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.from("orders").insert(row).select("*").single()
    if (!error) return spec.fromRow(data)
    if (error.code !== "23505") throw error // validation errors from the server are in error.message
    row = { ...row, id: unwrap(await supabase.rpc("next_order_id")) }
  }
  throw new Error("Could not allocate an order number")
}

export async function listMyOrders() {
  return listAll("orders")
}

export async function getMyOrder(id) {
  const row = unwrap(await supabase.from("orders").select("*").eq("id", id).maybeSingle())
  return row ? entry("orders").fromRow(row) : null
}

export async function submitReview({ orderId, productId, author, rating, text }) {
  const row = entry("reviews").toRow({
    id: `r-${Date.now()}`,
    orderId,
    productId,
    author,
    rating,
    text,
    status: "pending",
    createdAt: new Date().toISOString(),
  })
  unwrap(await supabase.from("reviews").insert(row))
  return entry("reviews").fromRow(row)
}

// ---- realtime ----------------------------------------------------------------
// Calls onChange({ table, type, record, oldRecord }) for every change the shopper may see.
export function subscribeCatalog(onChange, tables = ["products", "categories", "subcategories", "brands", "badges", "banners", "faqs", "socials", "cms_entries", "store_settings", "governorates", "reviews"]) {
  const channel = supabase.channel(`catalog-${Math.random().toString(36).slice(2)}`)
  tables.forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
      const spec = entry(table)
      onChange({
        table,
        type: payload.eventType,
        record: payload.new && Object.keys(payload.new).length ? spec.fromRow(payload.new) : null,
        oldRecord: payload.old && Object.keys(payload.old).length ? spec.fromRow(payload.old) : null,
      })
    })
  })
  channel.subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeMyOrders(onChange) {
  const channel = supabase.channel(`my-orders-${Math.random().toString(36).slice(2)}`)
  channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) =>
    onChange({ type: payload.eventType, order: payload.new?.id ? entry("orders").fromRow(payload.new) : null }),
  )
  channel.subscribe()
  return () => supabase.removeChannel(channel)
}
