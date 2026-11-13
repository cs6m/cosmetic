// The 19 governorates of Iraq. Admin settings store an editable copy of this list
// (enabled flag + delivery price per governorate); this is the seed and the fallback.
export const DEFAULT_DELIVERY_PRICE = 8000

export const GOVERNORATES = [
  { id: "baghdad", en: "Baghdad", ar: "بغداد", price: 5000 },
  { id: "basra", en: "Basra", ar: "البصرة", price: 8000 },
  { id: "nineveh", en: "Nineveh", ar: "نينوى", price: 8000 },
  { id: "erbil", en: "Erbil", ar: "أربيل", price: 8000 },
  { id: "sulaymaniyah", en: "Sulaymaniyah", ar: "السليمانية", price: 8000 },
  { id: "duhok", en: "Duhok", ar: "دهوك", price: 8000 },
  { id: "kirkuk", en: "Kirkuk", ar: "كركوك", price: 8000 },
  { id: "anbar", en: "Anbar", ar: "الأنبار", price: 8000 },
  { id: "babylon", en: "Babylon", ar: "بابل", price: 7000 },
  { id: "karbala", en: "Karbala", ar: "كربلاء", price: 7000 },
  { id: "najaf", en: "Najaf", ar: "النجف", price: 7000 },
  { id: "diyala", en: "Diyala", ar: "ديالى", price: 8000 },
  { id: "wasit", en: "Wasit", ar: "واسط", price: 8000 },
  { id: "dhi-qar", en: "Dhi Qar", ar: "ذي قار", price: 8000 },
  { id: "maysan", en: "Maysan", ar: "ميسان", price: 8000 },
  { id: "muthanna", en: "Al-Muthanna", ar: "المثنى", price: 8000 },
  { id: "qadisiyyah", en: "Al-Qadisiyyah", ar: "القادسية", price: 8000 },
  { id: "saladin", en: "Saladin", ar: "صلاح الدين", price: 8000 },
  { id: "halabja", en: "Halabja", ar: "حلبجة", price: 8000 },
].map((item) => ({ ...item, enabled: true }))

// Cash on delivery is the only payment method.
export const PAYMENTS = ["cod"]

// Always returns all 19 governorates, merging whatever the admin has saved on top of
// the defaults so a missing or damaged setting can never remove a region.
export function normalizeGovernorates(saved) {
  const byId = new Map((Array.isArray(saved) ? saved : []).map((item) => [item?.id, item]))
  return GOVERNORATES.map((base) => {
    const stored = byId.get(base.id)
    const price = Number(stored?.price)
    return {
      ...base,
      enabled: stored ? stored.enabled !== false : true,
      price: Number.isFinite(price) && price >= 0 ? Math.round(price) : base.price,
    }
  })
}

export function governorateLabel(id, language, list = GOVERNORATES) {
  const found = list.find((item) => item.id === id)
  if (!found) return id || ""
  return language === "ar" ? found.ar : found.en
}

// Kept for older call sites (admin order details).
export const cityLabel = (id, language, list) => governorateLabel(id, language, list)

// Delivery price is whatever the admin set for the chosen governorate.
export function deliveryFee(governorateId, list = GOVERNORATES, subtotal = 1) {
  if (!(Number(subtotal) > 0)) return 0
  const found = list.find((item) => item.id === governorateId)
  if (!found || !found.enabled) return 0
  return Math.max(0, Math.round(Number(found.price) || 0))
}

function text(value) {
  return String(value || "").trim()
}

// Iraqi mobile number: exactly 11 digits, starting with 07 (e.g. 07701234567).
// Spaces and dashes are tolerated while typing; Arabic-Indic digits are converted.
export function normalizePhone(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\s-]/g, "")
}

export const PHONE_PATTERN = /^07\d{9}$/

export function checkoutErrors(form, governorates = GOVERNORATES) {
  const errors = {}
  if (text(form.name).length < 2) errors.name = "required"
  const phone = normalizePhone(form.phone)
  if (!phone) errors.phone = "required"
  else if (!PHONE_PATTERN.test(phone)) errors.phone = "phoneInvalid"
  const chosen = governorates.find((item) => item.id === form.city)
  if (!chosen) errors.city = "required"
  else if (!chosen.enabled) errors.city = "cityUnavailable"
  if (!text(form.neighborhood)) errors.neighborhood = "required"
  if (!text(form.street)) errors.street = "required"
  if (!text(form.building)) errors.building = "required"
  const map = text(form.mapLink)
  if (map && !/^https:\/\/\S+$/i.test(map)) errors.mapLink = "mapInvalid"
  return errors
}

export function cleanCheckout(form) {
  return {
    name: text(form.name).slice(0, 80),
    phone: normalizePhone(form.phone).slice(0, 11),
    city: form.city,
    neighborhood: text(form.neighborhood).slice(0, 60),
    street: text(form.street).slice(0, 80),
    building: text(form.building).slice(0, 40),
    details: text(form.details).slice(0, 200),
    mapLink: text(form.mapLink).slice(0, 240),
    gift: text(form.gift).slice(0, 300),
    notes: text(form.notes).slice(0, 300),
    payment: "cod",
  }
}
