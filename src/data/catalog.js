const art = {
  Skincare: ["/images/cream.svg", "/images/scrub.svg", "/images/serum.svg"],
  Serums: ["/images/serum.svg", "/images/cream.svg", "/images/oil.svg"],
  Makeup: ["/images/lip.svg", "/images/cream.svg", "/images/serum.svg"],
  Lips: ["/images/lip.svg", "/images/oil.svg", "/images/cream.svg"],
  Hair: ["/images/oil.svg", "/images/serum.svg", "/images/scrub.svg"],
  Body: ["/images/scrub.svg", "/images/cream.svg", "/images/oil.svg"],
  Sun: ["/images/sun.svg", "/images/cream.svg", "/images/serum.svg"],
  Fragrance: ["/images/oil.svg", "/images/serum.svg", "/images/sun.svg"],
  Sets: ["/images/cream.svg", "/images/serum.svg", "/images/sun.svg"],
}

const stories = {
  Skincare: "Botanicals and a soft texture, made to leave skin calm, smooth, and comfortable.",
  Serums: "A lightweight concentrate that sinks in quickly and supports a clearer, more even look.",
  Makeup: "Cream color that looks like skin, with a finish you can wear from morning to evening.",
  Lips: "Comfortable color and care in one step, so lips stay soft instead of dry.",
  Hair: "A light finish for shine and smoothness, without weighing hair down.",
  Body: "A warm, unhurried body step that leaves skin soft and quietly scented.",
  Sun: "Everyday protection with a sheer feel that layers under the rest of your routine.",
  Fragrance: "A close-wearing scent that sits on skin like warmth, never a heavy trail.",
  Sets: "A small ritual, packed together so the routine is easy to keep.",
}

const perks = {
  Skincare: [
    ["Droplets", "Hydration"],
    ["ShieldCheck", "Barrier Care"],
    ["Sparkles", "Soft Glow"],
    ["Users", "All Skin Types"],
  ],
  Serums: [
    ["Sparkles", "Even Tone"],
    ["Droplets", "Lightweight"],
    ["ShieldCheck", "Daily Care"],
    ["Users", "Layer Friendly"],
  ],
  Makeup: [
    ["Sparkles", "Soft Focus"],
    ["Droplets", "Creamy"],
    ["Sun", "Natural Flush"],
    ["Users", "Everyday"],
  ],
  Lips: [
    ["Droplets", "Comfort"],
    ["Sparkles", "Soft Color"],
    ["Leaf", "Nourishing"],
    ["Users", "All Day"],
  ],
  Hair: [
    ["Sparkles", "Shine"],
    ["ShieldCheck", "Smooths"],
    ["Droplets", "Lightweight"],
    ["Leaf", "Botanical"],
  ],
  Body: [
    ["Droplets", "Moisture"],
    ["Sparkles", "Smooths"],
    ["Leaf", "Botanical"],
    ["Users", "Daily Use"],
  ],
  Sun: [
    ["Sun", "SPF"],
    ["ShieldCheck", "Broad Spectrum"],
    ["Droplets", "Sheer Feel"],
    ["Users", "Everyday"],
  ],
  Fragrance: [
    ["Sparkles", "Skin Scent"],
    ["Leaf", "Botanical"],
    ["Droplets", "Light Wear"],
    ["Users", "Day to Night"],
  ],
  Sets: [
    ["Droplets", "Hydrate"],
    ["Sparkles", "Brighten"],
    ["Sun", "Protect"],
    ["Users", "Full Ritual"],
  ],
}

const lines = {
  Skincare: [
    ["Hydrating Face Cream", "Deep moisture & glow", 24.99, { reviews: 128, badge: "Best Seller", rating: 5 }],
    ["Cloud Moisture Balm", "Cushiony daily moisture", 28.99, { reviews: 84, rating: 5 }],
    ["Barrier Repair Cream", "Comfort for stressed skin", 32.99, { reviews: 76, rating: 5 }],
    ["Gentle Cream Cleanser", "Melts away the day", 18.99, { reviews: 112, rating: 4 }],
    ["Night Recovery Balm", "Rich care while you sleep", 36.99, { reviews: 63, badge: "New", rating: 5 }],
    ["Dewy Gel Moisturizer", "Light water-gel glow", 26.99, { reviews: 91, rating: 5 }],
    ["Calm Ceramide Cream", "Strengthens the barrier", 31.99, { reviews: 54, rating: 4 }],
    ["Soft Focus Moisturizer", "Blurred, rested look", 29.99, { reviews: 70, rating: 5 }],
    ["Milky Cloud Toner", "First layer of hydration", 22.99, { reviews: 88, rating: 5 }],
  ],
  Serums: [
    ["Vitamin C Serum", "Brightens & evens skin tone", 29.99, { reviews: 96, badge: "Best Seller", rating: 5 }],
    ["Niacinamide Serum", "Calms look of pores", 27.99, { reviews: 101, rating: 5 }],
    ["Hyaluronic Acid Serum", "Plump, glassy moisture", 26.99, { reviews: 118, rating: 5 }],
    ["Retinol Night Serum", "Smooths overnight", 38.99, { reviews: 77, rating: 4 }],
    ["Peptide Firming Serum", "Supports a bouncier look", 42.99, { reviews: 49, badge: "New", rating: 5 }],
    ["Brightening Essence", "Watery first glow", 24.99, { reviews: 66, rating: 5 }],
    ["Bakuchiol Serum", "Gentle evening renewal", 34.99, { reviews: 52, rating: 4 }],
    ["Calm Redness Serum", "Soothes a flushed look", 28.99, { reviews: 61, rating: 5 }],
    ["Glow Ampoule", "A few drops of radiance", 33.99, { reviews: 73, rating: 5 }],
  ],
  Makeup: [
    ["Luminous Blush", "Soft color, lit-from-within", 21.99, { reviews: 58, rating: 5 }],
    ["Skin Tint Veil", "Your skin, a little brighter", 32.99, { reviews: 94, badge: "Best Seller", rating: 5 }],
    ["Cream Bronzer", "Warmth without stripes", 24.99, { reviews: 47, rating: 4 }],
    ["Soft Highlight", "A quiet inner light", 22.99, { reviews: 69, rating: 5 }],
    ["Brow Sculpt", "Feathery, filled-in brows", 18.99, { reviews: 81, rating: 4 }],
    ["Lengthening Mascara", "Lifted, separated lashes", 23.99, { reviews: 110, rating: 5 }],
    ["Blur Concealer", "Covers, then disappears", 19.99, { reviews: 86, badge: "New", rating: 5 }],
    ["Setting Mist", "Melts makeup into skin", 20.99, { reviews: 55, rating: 4 }],
    ["Cream Eyeshadow", "One-swipe soft color", 18.99, { reviews: 43, rating: 5 }],
  ],
  Lips: [
    ["Soft Matte Lip Tint", "Blurred color, all day", 18.99, { reviews: 64, badge: "New", rating: 5 }],
    ["Honey Lip Oil", "Glass shine, no stick", 16.99, { reviews: 122, badge: "Best Seller", rating: 5 }],
    ["Peptide Lip Balm", "Cushion for dry lips", 14.99, { reviews: 97, rating: 5 }],
    ["Satin Lip Color", "Creamy, lived-in color", 20.99, { reviews: 51, rating: 4 }],
    ["Overnight Lip Mask", "Soft by morning", 17.99, { reviews: 74, rating: 5 }],
    ["Sheer Lip Stain", "A wash of color that stays", 16.99, { reviews: 60, rating: 4 }],
    ["Contour Lip Liner", "Defines without a hard line", 15.99, { reviews: 48, rating: 5 }],
    ["Glossy Lip Oil", "Juicy, comfortable shine", 17.99, { reviews: 83, rating: 5 }],
    ["Nude Lip Crayon", "Blurred nude in one swipe", 18.99, { reviews: 57, rating: 4 }],
  ],
  Hair: [
    ["Silk Hair Oil", "Shine without weight", 27.99, { reviews: 73, rating: 4 }],
    ["Repair Hair Mask", "Weekly softness", 24.99, { reviews: 68, rating: 5 }],
    ["Root Lift Mist", "Airy volume at the root", 22.99, { reviews: 41, badge: "New", rating: 4 }],
    ["Shine Shampoo", "A clean, glossy wash", 19.99, { reviews: 90, rating: 5 }],
    ["Moisture Conditioner", "Slip, then softness", 19.99, { reviews: 85, rating: 5 }],
    ["Frizz Serum", "Smooths humid days", 26.99, { reviews: 62, rating: 4 }],
    ["Scalp Tonic", "A cooler, calmer scalp", 28.99, { reviews: 37, rating: 5 }],
    ["Leave-In Cream", "Detangles and softens", 21.99, { reviews: 79, badge: "Best Seller", rating: 5 }],
    ["Dry Texture Spray", "Piecey, lived-in finish", 23.99, { reviews: 44, rating: 4 }],
  ],
  Body: [
    ["Body Scrub", "Smooth & renew skin", 22.99, { reviews: 87, badge: "New", rating: 5 }],
    ["Shea Body Butter", "Deep comfort after bathing", 26.99, { reviews: 102, badge: "Best Seller", rating: 5 }],
    ["Silk Body Oil", "A gleam, not a film", 29.99, { reviews: 66, rating: 5 }],
    ["Gentle Body Wash", "Creamy, low-foam cleanse", 16.99, { reviews: 91, rating: 4 }],
    ["Firming Body Cream", "Smooths the look of skin", 32.99, { reviews: 48, rating: 4 }],
    ["Cloud Hand Cream", "Soft hands, fast absorb", 12.99, { reviews: 130, rating: 5 }],
    ["Mineral Bath Soak", "A warm, quiet bath", 18.99, { reviews: 39, rating: 5 }],
    ["Daily Body Lotion", "Light moisture, every day", 21.99, { reviews: 77, rating: 5 }],
    ["Smoothing Body Polish", "Finer texture over time", 24.99, { reviews: 52, rating: 4 }],
  ],
  Sun: [
    ["Daily Sun Protection", "Broad spectrum SPF50", 19.99, { reviews: 142, badge: "Sale", rating: 4, compareAt: 26 }],
    ["Mineral SPF Fluid", "Gentle mineral veil", 28.99, { reviews: 71, rating: 5 }],
    ["Tinted SPF", "Protection with a soft tint", 29.99, { reviews: 88, badge: "Best Seller", rating: 5 }],
    ["After Sun Gel", "Cooling care after daylight", 18.99, { reviews: 46, rating: 5 }],
    ["Lip SPF Balm", "Care and cover for lips", 9.99, { reviews: 63, rating: 4 }],
    ["Body SPF Lotion", "Easy coverage, no chalk", 24.99, { reviews: 80, rating: 5 }],
    ["SPF Setting Spray", "A last layer of protection", 22.99, { reviews: 35, badge: "New", rating: 4 }],
    ["Invisible SPF Stick", "Reapply over makeup", 16.99, { reviews: 59, rating: 5 }],
    ["Glow SPF Mist", "Dewy finish, SPF 30", 21.99, { reviews: 42, rating: 4 }],
  ],
  Fragrance: [
    ["Amber Eau", "Warm skin scent", 34.99, { reviews: 41, badge: "New", rating: 5 }],
    ["Neroli Water", "Bright, clean florals", 32.99, { reviews: 54, rating: 5 }],
    ["Sandalwood Mist", "Soft woods on skin", 36.99, { reviews: 38, rating: 4 }],
    ["Rose Skin Perfume", "A petal-close rose", 48.99, { reviews: 67, badge: "Best Seller", rating: 5 }],
    ["Citrus Veil", "Sparkling, airy citrus", 29.99, { reviews: 45, rating: 4 }],
    ["Musk Oil", "Clean musk, very close", 27.99, { reviews: 72, rating: 5 }],
    ["Fig Leaf Eau", "Green, milky fig", 39.99, { reviews: 33, rating: 5 }],
    ["Vanilla Skin", "Warm vanilla, not sweet", 34.99, { reviews: 81, rating: 5 }],
    ["Tea Eau", "Steamed tea and soft musk", 42.99, { reviews: 29, badge: "New", rating: 4 }],
  ],
  Sets: [
    ["Glow Ritual Set", "Cream, serum, and sun", 62.99, { reviews: 39, badge: "Sale", rating: 5, compareAt: 74.97 }],
    ["Night Repair Set", "Cleanse, serum, balm", 68.99, { reviews: 44, rating: 5 }],
    ["Travel Minis", "Five steps, carry-on size", 36.99, { reviews: 58, badge: "Best Seller", rating: 5 }],
    ["Hydration Duo", "Toner and cream", 42.99, { reviews: 51, rating: 5 }],
    ["Brightening Trio", "Essence, serum, moisturizer", 72.99, { reviews: 36, rating: 4 }],
    ["Body Ritual Set", "Wash, scrub, and butter", 54.99, { reviews: 47, rating: 5 }],
    ["Hair Shine Set", "Oil, mask, and mist", 59.99, { reviews: 31, badge: "New", rating: 4 }],
    ["Lip Care Set", "Balm, oil, and tint", 39.99, { reviews: 62, rating: 5 }],
    ["Discovery Set", "A first look at the ritual", 28.99, { reviews: 84, badge: "Sale", rating: 5, compareAt: 36 }],
  ],
}

export const brands = [
  {
    id: "glowora-labs",
    name: "Glowora Labs",
    mark: "GL",
    tone: "bg-espresso text-ivory",
    description: "House formulas for a quiet, lit-from-within glow.",
  },
  {
    id: "the-ordinary",
    name: "The Ordinary",
    mark: "TO",
    tone: "bg-sand text-espresso",
    description: "Straightforward concentrations with clear ingredient names.",
  },
  {
    id: "cerave",
    name: "CeraVe",
    mark: "CV",
    tone: "bg-cocoa text-ivory",
    description: "Ceramide-focused care for a comfortable skin barrier.",
  },
  {
    id: "la-roche-posay",
    name: "La Roche-Posay",
    mark: "LR",
    tone: "bg-[#efe2d4] text-espresso",
    description: "Gentle, dermatologist-minded routines for sensitive skin.",
  },
  {
    id: "drunk-elephant",
    name: "Drunk Elephant",
    mark: "DE",
    tone: "bg-[#4d342e] text-ivory",
    description: "Bright blends of acids, vitamins, and rich moisture.",
  },
]

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function imagesFor(category, index) {
  const set = art[category]
  return [0, 1, 2].map((step) => set[(index + step) % set.length])
}

const productGroup = {
  "Hydrating Face Cream": "moisturizers",
  "Cloud Moisture Balm": "moisturizers",
  "Dewy Gel Moisturizer": "moisturizers",
  "Barrier Repair Cream": "barrier",
  "Calm Ceramide Cream": "barrier",
  "Soft Focus Moisturizer": "barrier",
  "Night Recovery Balm": "barrier",
  "Gentle Cream Cleanser": "cleanse",
  "Milky Cloud Toner": "cleanse",
  "Vitamin C Serum": "brightening",
  "Brightening Essence": "brightening",
  "Glow Ampoule": "brightening",
  "Hyaluronic Acid Serum": "hydration",
  "Niacinamide Serum": "hydration",
  "Calm Redness Serum": "hydration",
  "Retinol Night Serum": "night-repair",
  "Peptide Firming Serum": "night-repair",
  "Bakuchiol Serum": "night-repair",
  "Skin Tint Veil": "face",
  "Blur Concealer": "face",
  "Setting Mist": "face",
  "Luminous Blush": "cheeks",
  "Cream Bronzer": "cheeks",
  "Soft Highlight": "cheeks",
  "Brow Sculpt": "eyes",
  "Lengthening Mascara": "eyes",
  "Cream Eyeshadow": "eyes",
  "Peptide Lip Balm": "lip-care",
  "Overnight Lip Mask": "lip-care",
  "Honey Lip Oil": "lip-care",
  "Soft Matte Lip Tint": "lip-color",
  "Satin Lip Color": "lip-color",
  "Nude Lip Crayon": "lip-color",
  "Glossy Lip Oil": "lip-shine",
  "Sheer Lip Stain": "lip-shine",
  "Contour Lip Liner": "lip-shine",
  "Repair Hair Mask": "curly-hair",
  "Moisture Conditioner": "curly-hair",
  "Leave-In Cream": "curly-hair",
  "Root Lift Mist": "hair-loss",
  "Scalp Tonic": "hair-loss",
  "Shine Shampoo": "hair-loss",
  "Silk Hair Oil": "serums-oils",
  "Frizz Serum": "serums-oils",
  "Dry Texture Spray": "serums-oils",
  "Gentle Body Wash": "bath",
  "Mineral Bath Soak": "bath",
  "Body Scrub": "bath",
  "Shea Body Butter": "body-moisture",
  "Silk Body Oil": "body-moisture",
  "Daily Body Lotion": "body-moisture",
  "Firming Body Cream": "body-treat",
  "Cloud Hand Cream": "body-treat",
  "Smoothing Body Polish": "body-treat",
  "Daily Sun Protection": "face-spf",
  "Mineral SPF Fluid": "face-spf",
  "Tinted SPF": "face-spf",
  "Body SPF Lotion": "body-spf",
  "Lip SPF Balm": "body-spf",
  "Invisible SPF Stick": "body-spf",
  "After Sun Gel": "after-care",
  "SPF Setting Spray": "after-care",
  "Glow SPF Mist": "after-care",
  "Amber Eau": "warm",
  "Sandalwood Mist": "warm",
  "Vanilla Skin": "warm",
  "Neroli Water": "floral",
  "Rose Skin Perfume": "floral",
  "Fig Leaf Eau": "floral",
  "Citrus Veil": "fresh",
  "Musk Oil": "fresh",
  "Tea Eau": "fresh",
  "Glow Ritual Set": "skin-sets",
  "Night Repair Set": "skin-sets",
  "Brightening Trio": "skin-sets",
  "Hydration Duo": "ritual-sets",
  "Body Ritual Set": "ritual-sets",
  "Hair Shine Set": "ritual-sets",
  "Travel Minis": "travel-sets",
  "Lip Care Set": "travel-sets",
  "Discovery Set": "travel-sets",
}

// Seed prices were authored in USD. The store now trades in Iraqi Dinar, so they are
// converted once here (rounded to the nearest 250 IQD, the smallest practical note).
export const USD_TO_IQD = 1300

export function toIqd(usd) {
  return Math.round((Number(usd) || 0) * USD_TO_IQD / 250) * 250
}

export const products = Object.entries(lines)
  .flatMap(([category, items]) =>
    items.map(([name, subtitle, price, extra], index) => ({
      id: slug(name),
      name,
      subtitle,
      price: toIqd(price),
      compareAt: extra.compareAt ? toIqd(extra.compareAt) : extra.compareAt,
      rating: extra.rating,
      reviews: extra.reviews,
      badge: extra.badge ?? null,
      category,
      subcategory: productGroup[name],
      inStock: true,
      images: imagesFor(category, index),
      description: `${name} is ${subtitle.toLowerCase()}. ${stories[category]}`,
      benefits: perks[category].map(([icon, label]) => ({ icon, label })),
    })),
  )
  .map((product, index) => ({
    ...product,
    brand: brands[index % brands.length].id,
  }))

export const categories = [
  { id: "Skincare", label: "Skincare", image: "/images/cream.svg" },
  { id: "Serums", label: "Serums", image: "/images/serum.svg" },
  { id: "Makeup", label: "Makeup", image: "/images/model.jpg" },
  { id: "Lips", label: "Lips", image: "/images/face.jpg" },
  { id: "Hair", label: "Hair", image: "/images/brushes.jpg" },
  { id: "Body", label: "Body", image: "/images/hero.jpg" },
  { id: "Sun", label: "Sun", image: "/images/sun.svg" },
  { id: "Fragrance", label: "Fragrance", image: "/images/oil.svg" },
  { id: "Sets", label: "Sets", image: "/images/cream.svg" },
]

export const subcategories = {
  Skincare: [
    { id: "moisturizers", label: "subMoisturizers" },
    { id: "barrier", label: "subBarrier" },
    { id: "cleanse", label: "subCleanse" },
  ],
  Serums: [
    { id: "brightening", label: "subBrightening" },
    { id: "hydration", label: "subHydration" },
    { id: "night-repair", label: "subNightRepair" },
  ],
  Makeup: [
    { id: "face", label: "subFace" },
    { id: "cheeks", label: "subCheeks" },
    { id: "eyes", label: "subEyes" },
  ],
  Lips: [
    { id: "lip-care", label: "subLipCare" },
    { id: "lip-color", label: "subLipColor" },
    { id: "lip-shine", label: "subLipShine" },
  ],
  Hair: [
    { id: "curly-hair", label: "subCurlyHair" },
    { id: "hair-loss", label: "subHairLoss" },
    { id: "serums-oils", label: "subSerumsOils" },
  ],
  Body: [
    { id: "bath", label: "subBath" },
    { id: "body-moisture", label: "subBodyMoisture" },
    { id: "body-treat", label: "subBodyTreat" },
  ],
  Sun: [
    { id: "face-spf", label: "subFaceSpf" },
    { id: "body-spf", label: "subBodySpf" },
    { id: "after-care", label: "subAfterCare" },
  ],
  Fragrance: [
    { id: "warm", label: "subWarm" },
    { id: "floral", label: "subFloral" },
    { id: "fresh", label: "subFresh" },
  ],
  Sets: [
    { id: "skin-sets", label: "subSkinSets" },
    { id: "ritual-sets", label: "subRitualSets" },
    { id: "travel-sets", label: "subTravelSets" },
  ],
}

export function formatPrice(value, language = "ar") {
  const amount = Math.round(Number(value) || 0).toLocaleString("en-US")
  return language === "ar" ? `${amount} د.ع` : `${amount} IQD`
}

export function unitPrice(product, bundleDeal) {
  const discounted = bundleDeal && product.category === "Skincare"
  const amount = discounted ? product.price * 0.8 : product.price
  return Math.round(amount)
}

export function strikePrice(product, bundleDeal) {
  if (bundleDeal && product.category === "Skincare") return product.price
  return product.compareAt ?? null
}

function uniqueProducts(list) {
  const seen = new Set()
  return list.filter((product) => {
    if (seen.has(product.id)) return false
    seen.add(product.id)
    return true
  })
}

export const offerMeta = {
  "black-friday": { title: "blackFriday" },
  "new-products": { title: "newProducts" },
  "weekly-offers": { title: "weeklyOffers" },
}

export function getOfferProducts(id, source = products) {
  const pool = source ?? products
  const blackFriday = uniqueProducts([
    ...pool.filter((product) => product.badge === "Sale"),
    ...pool.filter((product) => product.category === "Sets"),
    ...pool.filter((product) => product.category === "Sun"),
  ])
  const newcomers = pool.filter((product) => product.badge === "New")
  if (id === "black-friday") return blackFriday
  if (id === "new-products") return newcomers
  const taken = new Set([...blackFriday, ...newcomers].map((product) => product.id))
  return [...pool].filter((product) => !taken.has(product.id)).sort((a, b) => b.reviews - a.reviews)
}

const catalogOrder = new Map(products.map((product, index) => [product.id, index]))

export function sortProducts(list, sort) {
  const items = [...list]
  if (sort === "price-asc") return items.sort((a, b) => a.price - b.price)
  if (sort === "price-desc") return items.sort((a, b) => b.price - a.price)
  if (sort === "rating") return items.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
  if (sort === "reviews") return items.sort((a, b) => b.reviews - a.reviews)
  if (sort === "name-asc") return items.sort((a, b) => a.name.localeCompare(b.name))
  if (sort === "name-desc") return items.sort((a, b) => b.name.localeCompare(a.name))
  if (sort === "newest") {
    return items.sort((a, b) => {
      const aNew = a.badge === "New" ? 1 : 0
      const bNew = b.badge === "New" ? 1 : 0
      if (aNew !== bNew) return bNew - aNew
      return (catalogOrder.get(b.id) ?? 0) - (catalogOrder.get(a.id) ?? 0)
    })
  }
  return items
}

// Arabic/English-insensitive text used for matching: lowercases, strips diacritics and
// tatweel, and folds the common Arabic letter variants (أإآ→ا, ى→ي, ة→ه, ؤ→و, ئ→ي).
export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036F]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim()
}

// Everything a shopper could reasonably type to find a product, in both languages.
export function searchHaystack(product, lookups = {}) {
  const brand = lookups.brands?.find((item) => item.id === product.brand)
  const category = lookups.categories?.find((item) => item.id === product.category)
  const group = lookups.subcategories?.[product.category]?.find((item) => item.id === product.subcategory)
  return normalizeText(
    [
      product.name,
      product.nameAr,
      product.subtitle,
      product.subtitleAr,
      product.description,
      product.descriptionAr,
      product.sku,
      product.id,
      product.category,
      product.subcategory,
      product.brand,
      brand?.name,
      category?.name,
      category?.nameAr,
      group?.name,
      group?.nameAr,
      ...(product.badgeItems || []).flatMap((badge) => [badge.label, badge.labelAr]),
      ...(product.benefits || []).flatMap((benefit) => [benefit.label, benefit.labelAr]),
    ]
      .filter(Boolean)
      .join(" "),
  )
}

// Every word the shopper typed must appear somewhere in the product's searchable text.
export function matchesQuery(product, query, lookups) {
  const words = normalizeText(query).split(" ").filter(Boolean)
  if (!words.length) return true
  const haystack = searchHaystack(product, lookups)
  return words.every((word) => haystack.includes(word))
}

export function filterProducts({ query, category, subcategory, sort, brand, source, lookups }) {
  const pool = source ?? products
  const searching = normalizeText(query).length > 0
  const list = pool.filter((product) => {
    // A typed search always looks at the whole catalogue; category/brand filters only
    // apply while browsing, so a search can never hide a matching product.
    if (searching) return matchesQuery(product, query, lookups)
    const matchesCategory = category === "All" || product.category === category
    const matchesGroup = !subcategory || product.subcategory === subcategory
    const matchesBrand = !brand || product.brand === brand
    return matchesCategory && matchesGroup && matchesBrand
  })

  return sortProducts(list, sort)
}
