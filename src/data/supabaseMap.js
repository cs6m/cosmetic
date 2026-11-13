// Maps the app's existing in-memory records (the exact shapes used by adminDb.js and every
// component) to Supabase table rows and back. Nothing in the UI needs to know about this.
//
// Each entry describes one table:
//   read(db)          -> array of app records held in the db object
//   write(db, list)   -> new db object with that collection replaced
//   toRow(record, i)  -> database row   (i = index, used for `position` on ordered lists)
//   fromRow(row)      -> app record
//   key(record)       -> stable identity of a record
//   pk                -> primary-key column(s) used for upsert / delete / realtime events
//   orderBy           -> how the table is read (keeps the same ordering the UI already expects)
//   perm              -> admin permission needed to write it (mirrors the RLS policies)
//   staffOnly         -> never readable by guests (customers, team, audit trail)
//   incremental       -> large tables patched row-by-row on realtime events; others are re-read

const iso = (value) => (value ? new Date(value).toISOString() : new Date().toISOString())
const numOrNull = (value) => (value == null || value === "" ? null : Number(value))
const asArray = (value) => (Array.isArray(value) ? value : [])

export const TABLES = [
  {
    table: "governorates",
    pk: ["id"],
    perm: "settings",
    orderBy: [["position", true]],
    read: (db) => db.settings?.governorates || [],
    write: (db, list) => ({ ...db, settings: { ...db.settings, governorates: list } }),
    key: (r) => r.id,
    toRow: (r, i) => ({ id: r.id, name_en: r.en, name_ar: r.ar, enabled: r.enabled !== false, delivery_price: Number(r.price) || 0, position: i }),
    fromRow: (row) => ({ id: row.id, en: row.name_en, ar: row.name_ar, enabled: row.enabled, price: Number(row.delivery_price) }),
  },
  {
    table: "brands",
    pk: ["id"],
    perm: "brands",
    orderBy: [["position", true]],
    read: (db) => db.brands || [],
    write: (db, list) => ({ ...db, brands: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({
      id: r.id,
      name: r.name,
      mark: r.mark || "",
      tone: r.tone || "bg-espresso text-ivory",
      description: r.description || "",
      description_ar: r.descriptionAr || "",
      logo: r.logo || "",
      image: r.image || "",
      position: i,
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name,
      mark: row.mark,
      tone: row.tone,
      description: row.description,
      descriptionAr: row.description_ar,
      logo: row.logo,
      image: row.image,
    }),
  },
  {
    table: "categories",
    pk: ["id"],
    perm: "categories",
    orderBy: [["position", true]],
    read: (db) => db.categories || [],
    write: (db, list) => ({ ...db, categories: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({ id: r.id, name: r.name, name_ar: r.nameAr || "", image: r.image || "", position: i }),
    fromRow: (row) => ({ id: row.id, name: row.name, nameAr: row.name_ar, image: row.image }),
  },
  {
    // db.subcategories is { [categoryId]: [group, ...] } — flattened to one row per group.
    table: "subcategories",
    pk: ["category_id", "id"],
    perm: "categories",
    orderBy: [["category_id", true], ["position", true]],
    read: (db) =>
      Object.entries(db.subcategories || {}).flatMap(([categoryId, groups]) =>
        asArray(groups).map((group, index) => ({ ...group, categoryId, position: index })),
      ),
    write: (db, list) => {
      const map = {}
      ;(db.categories || []).forEach((category) => {
        map[category.id] = []
      })
      ;[...list]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .forEach(({ categoryId, position, ...group }) => {
          ;(map[categoryId] ||= []).push(group)
        })
      return { ...db, subcategories: map }
    },
    key: (r) => `${r.categoryId}/${r.id}`,
    toRow: (r) => ({
      category_id: r.categoryId,
      id: r.id,
      label: r.label || r.name || "",
      name: r.name,
      name_ar: r.nameAr || "",
      image: r.image || "",
      position: r.position ?? 0,
    }),
    fromRow: (row) => ({ id: row.id, label: row.label, name: row.name, nameAr: row.name_ar, image: row.image, categoryId: row.category_id, position: row.position }),
  },
  {
    table: "badges",
    pk: ["id"],
    perm: "products",
    orderBy: [["position", true]],
    read: (db) => db.badges || [],
    write: (db, list) => ({ ...db, badges: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({ id: r.id, label: r.label, label_ar: r.labelAr || "", tone: r.tone || "nude", position: i }),
    fromRow: (row) => ({ id: row.id, label: row.label, labelAr: row.label_ar, tone: row.tone }),
  },
  {
    table: "products",
    pk: ["id"],
    perm: "products",
    incremental: true,
    orderBy: [["created_at", false], ["id", true]],
    read: (db) => db.products || [],
    write: (db, list) => ({ ...db, products: list }),
    key: (r) => r.id,
    toRow: (r) => ({
      id: r.id,
      name: r.name,
      name_ar: r.nameAr || "",
      subtitle: r.subtitle || "",
      subtitle_ar: r.subtitleAr || "",
      sku: r.sku,
      brand_id: r.brand || null,
      category_id: r.category,
      subcategory_id: r.subcategory || null,
      price: Number(r.price) || 0,
      discount_price: numOrNull(r.discountPrice),
      description: r.description || "",
      description_ar: r.descriptionAr || "",
      stock: Math.max(0, Math.floor(Number(r.stock) || 0)),
      images: asArray(r.images),
      status: r.status === "hidden" ? "hidden" : "active",
      badge: r.badge || null,
      badges: asArray(r.badges),
      sections: asArray(r.sections),
      rating: Number(r.rating) || 5,
      reviews: Number(r.reviews) || 0,
      benefits: asArray(r.benefits),
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name,
      nameAr: row.name_ar,
      subtitle: row.subtitle,
      subtitleAr: row.subtitle_ar,
      sku: row.sku,
      brand: row.brand_id,
      category: row.category_id,
      subcategory: row.subcategory_id,
      price: Number(row.price),
      discountPrice: numOrNull(row.discount_price),
      description: row.description,
      descriptionAr: row.description_ar,
      stock: row.stock,
      images: asArray(row.images),
      status: row.status,
      badge: row.badge,
      badges: asArray(row.badges),
      sections: asArray(row.sections),
      rating: Number(row.rating),
      reviews: row.reviews,
      benefits: asArray(row.benefits),
    }),
  },
  {
    table: "customers",
    pk: ["id"],
    perm: "customers",
    staffOnly: true,
    incremental: true,
    orderBy: [["registered_at", false], ["id", true]],
    read: (db) => db.customers || [],
    write: (db, list) => ({ ...db, customers: list }),
    key: (r) => r.id,
    toRow: (r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || "",
      city: r.city || "",
      registered_at: iso(r.registeredAt),
    }),
    fromRow: (row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, city: row.city, registeredAt: iso(row.registered_at) }),
  },
  {
    table: "orders",
    pk: ["id"],
    perm: "orders",
    incremental: true,
    guestInsert: true, // shoppers may create (not change) their own orders
    orderBy: [["placed_at", false], ["id", false]],
    read: (db) => db.orders || [],
    write: (db, list) => ({ ...db, orders: [...list].sort((a, b) => new Date(b.date) - new Date(a.date)) }),
    key: (r) => r.id,
    toRow: (r) => ({
      id: r.id,
      placed_at: iso(r.date),
      status: r.status,
      items: asArray(r.items),
      total: Number(r.total) || 0,
      subtotal: numOrNull(r.subtotal),
      shipping: numOrNull(r.shipping),
      payment: "cod",
      customer: r.customer || null,
      customer_id: r.customerId || "guest-store",
      source: r.source === "admin" ? "admin" : "storefront",
      inventory_applied: Boolean(r.inventoryApplied),
      history: asArray(r.history),
    }),
    fromRow: (row) => ({
      id: row.id,
      date: iso(row.placed_at),
      status: row.status,
      items: asArray(row.items),
      total: Number(row.total),
      subtotal: numOrNull(row.subtotal),
      shipping: numOrNull(row.shipping),
      payment: row.payment,
      customer: row.customer || null,
      customerId: row.customer_id,
      source: row.source,
      inventoryApplied: row.inventory_applied,
      history: asArray(row.history),
    }),
  },
  {
    table: "reviews",
    pk: ["id"],
    perm: "reviews",
    guestInsert: true,
    orderBy: [["created_at", false], ["id", true]],
    read: (db) => db.reviews || [],
    write: (db, list) => ({ ...db, reviews: list }),
    key: (r) => r.id,
    toRow: (r) => ({
      id: r.id,
      order_id: r.orderId || null,
      product_id: r.productId,
      author: r.author,
      rating: Number(r.rating) || 5,
      text: r.text || "",
      status: r.status === "approved" ? "approved" : "pending",
      created_at: iso(r.createdAt),
    }),
    fromRow: (row) => ({
      id: row.id,
      orderId: row.order_id || undefined,
      productId: row.product_id,
      author: row.author,
      rating: row.rating,
      text: row.text,
      status: row.status,
      createdAt: iso(row.created_at),
    }),
  },
  {
    table: "faqs",
    pk: ["id"],
    perm: "settings",
    orderBy: [["position", true]],
    read: (db) => db.faqs || [],
    write: (db, list) => ({ ...db, faqs: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({ id: r.id, question: r.question || "", answer: r.answer || "", question_ar: r.questionAr || "", answer_ar: r.answerAr || "", position: i }),
    fromRow: (row) => ({ id: row.id, question: row.question, answer: row.answer, questionAr: row.question_ar, answerAr: row.answer_ar }),
  },
  {
    table: "socials",
    pk: ["id"],
    perm: "settings",
    orderBy: [["position", true]],
    read: (db) => db.socials || [],
    write: (db, list) => ({ ...db, socials: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({ id: r.id, label: r.label, href: r.href, position: i }),
    fromRow: (row) => ({ id: row.id, label: row.label, href: row.href }),
  },
  {
    table: "banners",
    pk: ["id"],
    perm: "settings",
    orderBy: [["position", true]],
    read: (db) => db.banners || [],
    write: (db, list) => ({ ...db, banners: list }),
    key: (r) => r.id,
    toRow: (r, i) => ({
      id: r.id,
      image: r.image || "",
      title: r.title || "",
      title_ar: r.titleAr || "",
      text: r.text || "",
      text_ar: r.textAr || "",
      button: r.button || "",
      button_ar: r.buttonAr || "",
      link: r.link || "",
      position: i,
    }),
    fromRow: (row) => ({
      id: row.id,
      image: row.image,
      title: row.title,
      titleAr: row.title_ar,
      text: row.text,
      textAr: row.text_ar,
      button: row.button,
      buttonAr: row.button_ar,
      link: row.link,
    }),
  },
  {
    // db.cms is a flat { key: text } object — one row per key.
    table: "cms_entries",
    pk: ["key"],
    perm: "settings",
    orderBy: [["key", true]],
    read: (db) => Object.entries(db.cms || {}).map(([key, value]) => ({ key, value })),
    write: (db, list) => ({ ...db, cms: { ...(db.cms || {}), ...Object.fromEntries(list.map((item) => [item.key, item.value])) } }),
    key: (r) => r.key,
    toRow: (r) => ({ key: r.key, value: String(r.value ?? "") }),
    fromRow: (row) => ({ key: row.key, value: row.value }),
  },
  {
    // db.settings (except governorates, which has its own table) — one row per setting.
    table: "store_settings",
    pk: ["key"],
    perm: "settings",
    orderBy: [["key", true]],
    read: (db) => Object.entries(db.settings || {}).filter(([key]) => key !== "governorates").map(([key, value]) => ({ key, value })),
    write: (db, list) => ({ ...db, settings: { ...db.settings, ...Object.fromEntries(list.map((item) => [item.key, item.value])) } }),
    key: (r) => r.key,
    toRow: (r) => ({ key: r.key, value: r.value ?? null }),
    fromRow: (row) => ({ key: row.key, value: row.value }),
  },
  {
    // The team. Passwords live in Supabase Auth, never in this table.
    table: "profiles",
    pk: ["id"],
    perm: "team",
    staffOnly: true,
    filter: (query) => query.in("role", ["admin", "staff"]),
    orderBy: [["created_at", true], ["id", true]],
    read: (db) => db.team || [],
    write: (db, list) => ({ ...db, team: list }),
    key: (r) => r.id,
    toRow: (r) => ({
      id: r.id,
      email: String(r.email || "").toLowerCase(),
      name: r.name || "",
      role: r.role === "admin" ? "admin" : "staff",
      active: r.active !== false,
      permissions: asArray(r.permissions),
    }),
    fromRow: (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, active: row.active, permissions: asArray(row.permissions) }),
  },
  {
    // Append-only: rows trimmed from the app's rolling list are kept in the database.
    table: "audit_log",
    pk: ["at", "email", "message"],
    perm: "overview",
    staffOnly: true,
    noDelete: true,
    incremental: true,
    orderBy: [["at", false]],
    limit: 200,
    read: (db) => db.audit || [],
    write: (db, list) => ({ ...db, audit: list.slice(0, 40) }),
    key: (r) => `${r.at}|${r.email}|${r.message}`,
    toRow: (r) => ({ at: iso(r.at), email: r.email || "system", message: r.message || "" }),
    fromRow: (row) => ({ at: iso(row.at), email: row.email, message: row.message }),
  },
]

export const TABLE_BY_NAME = Object.fromEntries(TABLES.map((entry) => [entry.table, entry]))

// Stable JSON (sorted keys) so two equal rows always compare equal.
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value ?? null)
}

export function rowsOf(entry, db) {
  return entry.read(db).map((record, index) => entry.toRow(record, index))
}

// Compares two db objects table by table and returns what to write.
export function diffDb(prev, next, entries = TABLES) {
  const changes = []
  for (const entry of entries) {
    const before = new Map(entry.read(prev).map((record, index) => [entry.key(record), entry.toRow(record, index)]))
    const after = new Map(entry.read(next).map((record, index) => [entry.key(record), entry.toRow(record, index)]))
    const upserts = []
    const removed = []
    after.forEach((row, key) => {
      if (!before.has(key) || stable(before.get(key)) !== stable(row)) upserts.push({ key, row, isNew: !before.has(key) })
    })
    before.forEach((row, key) => {
      if (!after.has(key)) removed.push({ key, row })
    })
    if (upserts.length || removed.length) changes.push({ entry, upserts, removed })
  }
  return changes
}
