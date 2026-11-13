import { useEffect, useMemo, useSyncExternalStore } from "react"
import { ICON_NAMES } from "../icons"
import { normalizeGovernorates } from "../checkout"
import { MEDIA_PUBLIC_PREFIX } from "../lib/supabaseClient"
import {
  attachSync,
  changeOwnPassword,
  isStaffSession,
  pushChanges,
  rememberPassword,
  signInStaff,
  signOutStaff,
  syncEnabled,
} from "./supabaseSync"
import { getOfferProducts, brands as catalogBrands, categories as seedCategories, products as seedProducts, subcategories as seedSubs, toIqd } from "./catalog"

const KEY = "glowora-admin-db"
const SHOP_ORDERS = "glowora-orders"
const SESSION = "glowora-admin-session"
const CURRENCY_FLAG = "glowora-orders-currency"
// v5: prices and orders are stored in Iraqi Dinar; settings carry the 19 governorates.
const DB_VERSION = 5

export const PERMISSIONS = [
  "overview",
  "orders",
  "products",
  "products.delete",
  "categories",
  "customers",
  "team",
  "settings",
  "reviews",
  "brands",
]

const ADMIN_HASH = "a9f47748c89441bdf7b7ba7bd2ef152532e42829a78b68f2b17e7bd1f648d184"
const STAFF_HASH = "8d45028aae2e4019ab610c86dc750f6a7cc9c07076a36beb29d73f5200b8af28"

const CATEGORY_NAMES = {
  Skincare: ["Skincare", "العناية بالبشرة"],
  Serums: ["Serums", "السيروم"],
  Makeup: ["Makeup", "المكياج"],
  Lips: ["Lips", "الشفاه"],
  Hair: ["Hair", "الشعر"],
  Body: ["Body", "الجسم"],
  Sun: ["Sun", "الحماية من الشمس"],
  Fragrance: ["Fragrance", "العطور"],
  Sets: ["Sets", "الأطقم"],
}

const SUB_NAMES = {
  moisturizers: ["Moisturizers", "المرطبات"],
  barrier: ["Barrier Care", "العناية بالحاجز"],
  cleanse: ["Cleanse & Tone", "التنظيف والتونر"],
  brightening: ["Brightening", "التفتيح"],
  hydration: ["Hydration", "الترطيب"],
  "night-repair": ["Night Repair", "العناية الليلية"],
  face: ["Face", "البشرة"],
  cheeks: ["Cheeks", "الخدود"],
  eyes: ["Eyes", "العيون"],
  "lip-care": ["Lip Care", "العناية بالشفاه"],
  "lip-color": ["Lip Color", "الألوان"],
  "lip-shine": ["Gloss & Liner", "اللمعان والمحدد"],
  "curly-hair": ["Curly Hair", "الشعر الكيرلي"],
  "hair-loss": ["Hair Loss", "تساقط الشعر"],
  "serums-oils": ["Serum and Oils", "السيروم والزيوت"],
  bath: ["Bath & Wash", "الاستحمام"],
  "body-moisture": ["Body Moisture", "ترطيب الجسم"],
  "body-treat": ["Body Treat", "عناية الجسم"],
  "face-spf": ["Face SPF", "حماية الوجه"],
  "body-spf": ["Body SPF", "حماية الجسم"],
  "after-care": ["After Sun", "بعد الشمس"],
  warm: ["Warm", "دافئة"],
  floral: ["Floral", "زهرية"],
  fresh: ["Fresh", "منعشة"],
  "skin-sets": ["Skin Sets", "أطقم البشرة"],
  "ritual-sets": ["Ritual Sets", "الطقوس"],
  "travel-sets": ["Travel Sets", "السفر"],
}

const LOW_STOCK = new Set([
  "honey-lip-oil",
  "vitamin-c-serum",
  "silk-hair-oil",
  "daily-sun-protection",
  "blur-concealer",
  "rose-skin-perfume",
])

let state = null

function defaultSettings() {
  return {
    storeName: "Glowora",
    supportEmail: "care@glowora.com",
    currency: "IQD",
    governorates: normalizeGovernorates(),
    lowStock: 8,
    heroTitle: "Natural Glow, Confident You.",
    heroTitleAr: "إشراقة طبيعية، بثقة.",
    heroText: "Premium skincare products for healthy, radiant skin.",
    heroTextAr: "عناية فاخرة لبشرة صحية ومشرقة.",
    heroButton: "Shop Now",
    heroButtonAr: "تسوّقي الآن",
    heroImage: "/images/face.jpg",
    offers: {
      "black-friday": {
        kicker: "This week only",
        kickerAr: "هذا الأسبوع فقط",
        title: "Black Friday Offers",
        titleAr: "عروض الجمعة السوداء",
        text: "Limited prices on ritual favorites.",
        textAr: "أسعار محدودة على الطقوس المفضلة.",
        image: "",
      },
      "new-products": {
        kicker: "Just arrived",
        kickerAr: "وصل حديثاً",
        title: "New Products",
        titleAr: "منتجات جديدة",
        text: "Fresh formulas for the season.",
        textAr: "تركيبات جديدة لهذا الموسم.",
        image: "",
      },
      "weekly-offers": {
        kicker: "Every Monday",
        kickerAr: "كل اثنين",
        title: "Weekly Offers",
        titleAr: "عروض الأسبوع",
        text: "A short list of this week's edits.",
        textAr: "قائمة قصيرة من اختيارات هذا الأسبوع.",
        image: "",
      },
    },
  }
}

export const SECTION_IDS = ["black-friday", "new-products", "weekly-offers"]

export const BENEFIT_ICONS = ICON_NAMES

function defaultCms() {
  return {
    tagline: "Radiant You",
    taglineAr: "إشراقتك",
    shopTitle: "Shop By Category",
    shopTitleAr: "تسوّقي حسب القسم",
    featuredTitle: "Featured Products",
    featuredTitleAr: "منتجات مختارة",
    exploreTitle: "Explore Our Beauty Collection",
    exploreTitleAr: "اكتشفي مجموعة الجمال",
    exploreText: "Discover premium skincare, makeup and self-care essentials for your best skin.",
    exploreTextAr: "عناية، مكياج، وطقوس هادئة لبشرة أصفى.",
    brandsTitle: "Brands",
    brandsTitleAr: "الماركات",
    brandsLead: "Houses we edit, each with its own shelf.",
    brandsLeadAr: "بيوت نختارها، ولكل منها رفّه.",
    helpTitle: "Help",
    helpTitleAr: "مساعدة",
    helpLead: "We reply within a day.",
    helpLeadAr: "نجيب خلال يوم واحد.",
    bundleText: "20% off skincare bundles is applied.",
    bundleTextAr: "خصم ٢٠٪ على حزم العناية مُطبّق.",
  }
}

function seedBadges() {
  return [
    { id: "new", label: "New", labelAr: "جديد", tone: "green" },
    { id: "best-seller", label: "Best Seller", labelAr: "الأكثر مبيعاً", tone: "nude" },
    { id: "off-30", label: "30% Off", labelAr: "خصم ٣٠٪", tone: "rose" },
    { id: "sale", label: "Sale", labelAr: "تخفيض", tone: "rose" },
  ]
}

const BRAND_AR = {
  "glowora-labs": "تركيبات المنزل لإشراقة هادئة من الداخل.",
  "the-ordinary": "تراكيز واضحة بأسماء مكونات صريحة.",
  cerave: "عناية بالسيراميد لحاجز بشرة مريح.",
  "la-roche-posay": "روتين لطيف للبشرة الحساسة.",
  "drunk-elephant": "مزيج مشرق من الأحماض والفيتامينات والرطوبة.",
}

function seedBrandRecords() {
  return catalogBrands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    mark: brand.mark,
    tone: brand.tone,
    description: brand.description,
    descriptionAr: BRAND_AR[brand.id] || "",
    logo: "",
    image: "",
  }))
}

function seedFaqs() {
  return [
    {
      id: "faq-track",
      question: "How do I track an order?",
      answer: "Confirmed orders appear on the Orders page with their status, items, and total.",
      questionAr: "كيف أتتبع طلبي؟",
      answerAr: "تظهر الطلبات المؤكدة في صفحة الطلبات مع الحالة والمنتجات والمجموع.",
    },
    {
      id: "faq-cruelty",
      question: "Are the products tested on animals?",
      answer: "No. Glowora is cruelty-free.",
      questionAr: "هل المنتجات مجرّبة على الحيوانات؟",
      answerAr: "لا. Glowora خالية من التجارب على الحيوانات.",
    },
    {
      id: "faq-bundles",
      question: "How do bundle offers work?",
      answer: "From the homepage, open Shop Bundles for the skincare discount.",
      questionAr: "كيف أستخدم عرض الحزم؟",
      answerAr: "من الصفحة الرئيسية، اختاري Shop Bundles لخصم العناية بالبشرة.",
    },
  ]
}

function seedSocials() {
  return [
    { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/" },
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/" },
  ]
}

function seedReviews() {
  const day = (days) => daysAgoDate(days, 15).toISOString()
  return [
    { id: "r-1", productId: "hydrating-face-cream", author: "Amal Nasser", rating: 5, text: "Soft, and the glow stays through the day.", status: "approved", createdAt: day(12) },
    { id: "r-2", productId: "vitamin-c-serum", author: "Layla Haddad", rating: 4, text: "Bright without a sting.", status: "approved", createdAt: day(9) },
    { id: "r-3", productId: "honey-lip-oil", author: "Nora El-Sayed", rating: 5, text: "The only oil that does not feel sticky.", status: "pending", createdAt: day(2) },
    { id: "r-4", productId: "silk-hair-oil", author: "Hana Mansour", rating: 5, text: "Shine, and my hair still feels light.", status: "pending", createdAt: day(1) },
  ]
}

function legacyBadgeIds(label) {
  const map = { New: "new", "Best Seller": "best-seller", Sale: "sale", "30% Off": "off-30" }
  if (!label) return []
  return [map[label] || slug(label)]
}

function sectionsForBadge(label) {
  if (label === "New") return ["new-products"]
  if (label === "Sale") return ["black-friday"]
  if (label === "Best Seller") return ["weekly-offers"]
  return []
}

function stockFor(id, index) {
  if (LOW_STOCK.has(id)) return 2 + (index % 4)
  return 16 + ((index * 7) % 36)
}

function seedTeam() {
  return [
    {
      id: "u-lina",
      name: "Lina Haddad",
      email: "admin@glowora.com",
      role: "admin",
      active: true,
      passwordHash: ADMIN_HASH,
      permissions: [...PERMISSIONS],
    },
    {
      id: "u-omar",
      name: "Omar Nasser",
      email: "staff@glowora.com",
      role: "staff",
      active: true,
      passwordHash: STAFF_HASH,
      permissions: ["overview", "orders", "products"],
    },
    {
      id: "u-maya",
      name: "Maya Saleh",
      email: "maya@glowora.com",
      role: "staff",
      active: true,
      passwordHash: STAFF_HASH,
      permissions: ["overview", "customers"],
    },
  ]
}

function seedCustomers() {
  const people = [
    ["Amal Nasser", "amal@example.com", "+961 3 441 220", "Beirut", 2],
    ["Layla Haddad", "layla@example.com", "+971 50 220 118", "Dubai", 6],
    ["Nora El-Sayed", "nora@example.com", "+20 100 332 441", "Cairo", 11],
    ["Hana Mansour", "hana@example.com", "+966 55 901 220", "Riyadh", 18],
    ["Yara Khalil", "yara@example.com", "+962 79 441 908", "Amman", 27],
    ["Rania Saleh", "rania@example.com", "+961 70 220 441", "Beirut", 40],
    ["Dina Kassem", "dina@example.com", "+971 52 118 903", "Dubai", 70],
    ["Sara Darwish", "sara@example.com", "+20 111 220 903", "Cairo", 120],
  ]
  const customers = people.map(([name, email, phone, city, daysAgo], index) => ({
    id: `c-${index + 1}`,
    name,
    email,
    phone,
    city,
    registeredAt: daysAgoDate(daysAgo, 11).toISOString(),
  }))
  customers.push({
    id: "guest-store",
    name: "Store guest",
    email: "guest@glowora.shop",
    phone: "",
    city: "",
    registeredAt: daysAgoDate(30, 9).toISOString(),
  })
  return customers
}

function daysAgoDate(days, hour) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, (days * 7) % 60, 0, 0)
  return date
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STORY_AR = {
  Skincare: "مكونات نباتية وملمس ناعم، لتبقى البشرة هادئة ومريحة.",
  Serums: "مركز خفيف يمتص بسرعة ويدعم مظهراً أصفى وأكثر توازناً.",
  Makeup: "لون كريمي يشبه البشرة، بلمسة تدوم من الصباح إلى المساء.",
  Lips: "لون وعناية في خطوة واحدة، لتبقى الشفاه ناعمة.",
  Hair: "لمسة خفيفة للّمعان والنعومة من دون إثقال الشعر.",
  Body: "خطوة دافئة وهادئة للجسم تترك البشرة ناعمة.",
  Sun: "حماية يومية بملمس شفاف تندمج مع بقية الروتين.",
  Fragrance: "عطر قريب من البشرة كدفء خفيف، من دون أثر ثقيل.",
  Sets: "طقس صغير مجمع معاً ليبقى الروتين سهلاً.",
}

const PERK_AR = {
  Hydration: "ترطيب",
  "Barrier Care": "العناية بالحاجز",
  "Soft Glow": "إشراقة ناعمة",
  "All Skin Types": "كل أنواع البشرة",
  "Even Tone": "توحيد اللون",
  Lightweight: "خفيف",
  "Daily Care": "عناية يومية",
  "Layer Friendly": "يُدمج بسهولة",
  "Soft Focus": "تركيز ناعم",
  Creamy: "قوام كريمي",
  "Natural Flush": "تورد طبيعي",
  Everyday: "يومي",
  Comfort: "راحة",
  "Soft Color": "لون ناعم",
  Nourishing: "مغذٍ",
  "All Day": "طوال اليوم",
  Shine: "لمعان",
  Smooths: "ينعّم",
  Botanical: "نباتي",
  Moisture: "ترطيب",
  "Daily Use": "استخدام يومي",
  SPF: "حماية",
  "Broad Spectrum": "طيف واسع",
  "Sheer Feel": "ملمس شفاف",
  "Skin Scent": "عطر البشرة",
  "Light Wear": "ثبات خفيف",
  "Day to Night": "من النهار إلى الليل",
  Hydrate: "ترطيب",
  Brighten: "إشراق",
  Protect: "حماية",
  "Full Ritual": "الطقس الكامل",
}

const PRODUCT_AR = {
  "Hydrating Face Cream": ["كريم ترطيب الوجه", "رطوبة عميقة وإشراقة"],
  "Cloud Moisture Balm": ["بلسم الرطوبة الغيمية", "رطوبة يومية ناعمة"],
  "Barrier Repair Cream": ["كريم إصلاح الحاجز", "راحة للبشرة المتعبة"],
  "Gentle Cream Cleanser": ["غسول كريمي لطيف", "يزيل أثر اليوم"],
  "Night Recovery Balm": ["بلسم التعافي الليلي", "عناية غنية أثناء النوم"],
  "Dewy Gel Moisturizer": ["مرطب جل ندي", "إشراقة خفيفة كالماء"],
  "Calm Ceramide Cream": ["كريم السيراميد الهادئ", "يقوّي حاجز البشرة"],
  "Soft Focus Moisturizer": ["مرطب التركيز الناعم", "مظهر مرتاح ومموّه"],
  "Milky Cloud Toner": ["تونر الحليب الغيمي", "الطبقة الأولى من الترطيب"],
  "Vitamin C Serum": ["سيروم فيتامين سي", "يضيء ويوحّد لون البشرة"],
  "Niacinamide Serum": ["سيروم النياسيناميد", "يهدّئ مظهر المسام"],
  "Hyaluronic Acid Serum": ["سيروم الهيالورونيك", "رطوبة ممتلئة ولامعة"],
  "Retinol Night Serum": ["سيروم الريتينول الليلي", "ينعّم البشرة ليلاً"],
  "Peptide Firming Serum": ["سيروم الببتيد المشدّ", "يدعم مظهراً أكثر مرونة"],
  "Brightening Essence": ["خلاصة الإشراق", "أول لمعة مائية"],
  "Bakuchiol Serum": ["سيروم الباكيوشيول", "تجديد مسائي لطيف"],
  "Calm Redness Serum": ["سيروم تهدئة الاحمرار", "يلطّف المظهر المتورّد"],
  "Glow Ampoule": ["أمبول الإشراقة", "بضع قطرات من الإشراق"],
  "Luminous Blush": ["بلاش مضيء", "لون ناعم من الداخل"],
  "Skin Tint Veil": ["حجاب تينت البشرة", "بشرتك، أكثر إشراقاً"],
  "Cream Bronzer": ["برونزر كريمي", "دفء من دون خطوط"],
  "Soft Highlight": ["هايلايت ناعم", "ضوء داخلي هادئ"],
  "Brow Sculpt": ["محدد الحواجب", "حواجب ناعمة وممتلئة"],
  "Lengthening Mascara": ["ماسكارا الإطالة", "رموش مرفوعة ومفرّقة"],
  "Blur Concealer": ["كونسيلر التمويه", "يغطي ثم يختفي"],
  "Setting Mist": ["رذاذ التثبيت", "يدمج المكياج مع البشرة"],
  "Cream Eyeshadow": ["ظل عيون كريمي", "لون ناعم بمسحة واحدة"],
  "Soft Matte Lip Tint": ["تينت شفاه مطفي", "لون مموّه طوال اليوم"],
  "Honey Lip Oil": ["زيت شفاه بالعسل", "لمعة زجاجية بلا لزوجة"],
  "Peptide Lip Balm": ["بلسم شفاه بالببتيد", "وسادة للشفاه الجافة"],
  "Satin Lip Color": ["لون شفاه ساتان", "لون كريمي حيّ"],
  "Overnight Lip Mask": ["قناع شفاه ليلي", "نعومة مع الصباح"],
  "Sheer Lip Stain": ["صبغة شفاه شفافة", "غسلة لون تبقى"],
  "Contour Lip Liner": ["محدد شفاه", "يحدد من دون خط قاسٍ"],
  "Glossy Lip Oil": ["زيت شفاه لامع", "لمعة مريحة"],
  "Nude Lip Crayon": ["قلم شفاه نيود", "نيود مموّه بمسحة"],
  "Silk Hair Oil": ["زيت شعر حريري", "لمعان من دون ثقل"],
  "Repair Hair Mask": ["قناع إصلاح الشعر", "نعومة أسبوعية"],
  "Root Lift Mist": ["رذاذ رفع الجذور", "حجم خفيف عند الجذور"],
  "Shine Shampoo": ["شامبو اللمعان", "غسلة نظيفة ولامعة"],
  "Moisture Conditioner": ["بلسم الترطيب", "انزلاق ثم نعومة"],
  "Frizz Serum": ["سيروم الهيشان", "ينعّم أيام الرطوبة"],
  "Scalp Tonic": ["تونيك فروة الرأس", "فروة أبرد وأهدأ"],
  "Leave-In Cream": ["كريم يُترك على الشعر", "يفك التشابك وينعّم"],
  "Dry Texture Spray": ["رذاذ القوام الجاف", "لمسة طبيعية خفيفة"],
  "Body Scrub": ["مقشر الجسم", "ينعّم البشرة ويجدّدها"],
  "Shea Body Butter": ["زبدة الشيا للجسم", "راحة عميقة بعد الاستحمام"],
  "Silk Body Oil": ["زيت جسم حريري", "لمعة من دون طبقة"],
  "Gentle Body Wash": ["غسول جسم لطيف", "تنظيف كريمي خفيف الرغوة"],
  "Firming Body Cream": ["كريم شد الجسم", "ينعّم مظهر البشرة"],
  "Cloud Hand Cream": ["كريم يدين غيمي", "يدان ناعمتان وامتصاص سريع"],
  "Mineral Bath Soak": ["نقع استحمام معدني", "حمّام دافئ وهادئ"],
  "Daily Body Lotion": ["لوشن جسم يومي", "رطوبة خفيفة كل يوم"],
  "Smoothing Body Polish": ["ملمّع تنعيم الجسم", "ملمس أنعم مع الوقت"],
  "Daily Sun Protection": ["حماية شمس يومية", "حماية واسعة SPF50"],
  "Mineral SPF Fluid": ["سائل حماية معدني", "حجاب معدني لطيف"],
  "Tinted SPF": ["حماية ملوّنة", "حماية مع تينت ناعم"],
  "After Sun Gel": ["جل ما بعد الشمس", "عناية مبرّدة بعد الضوء"],
  "Lip SPF Balm": ["بلسم شفاه واقي", "عناية وتغطية للشفاه"],
  "Body SPF Lotion": ["لوشن حماية للجسم", "تغطية سهلة بلا بياض"],
  "SPF Setting Spray": ["رذاذ تثبيت واقي", "طبقة أخيرة من الحماية"],
  "Invisible SPF Stick": ["ستيك حماية شفاف", "إعادة وضع فوق المكياج"],
  "Glow SPF Mist": ["رذاذ إشراقة واقي", "لمسة ندية، SPF 30"],
  "Amber Eau": ["عطر العنبر", "عطر دافئ على البشرة"],
  "Neroli Water": ["ماء النيرولي", "زهور نظيفة ومشرقة"],
  "Sandalwood Mist": ["رذاذ خشب الصندل", "خشب ناعم على البشرة"],
  "Rose Skin Perfume": ["عطر الورد", "ورد قريب من البشرة"],
  "Citrus Veil": ["حجاب الحمضيات", "حمضيات متألقة وخفيفة"],
  "Musk Oil": ["زيت المسك", "مسك نظيف وقريب"],
  "Fig Leaf Eau": ["عطر ورقة التين", "تين أخضر حليبي"],
  "Vanilla Skin": ["فانيلا البشرة", "فانيلا دافئة غير حلوة"],
  "Tea Eau": ["عطر الشاي", "شاي مبخّر ومسك ناعم"],
  "Glow Ritual Set": ["طقم طقس الإشراقة", "كريم وسيروم وحماية"],
  "Night Repair Set": ["طقم الإصلاح الليلي", "تنظيف وسيروم وبلسم"],
  "Travel Minis": ["أحجام السفر", "خمس خطوات بحجم الحقيبة"],
  "Hydration Duo": ["ثنائي الترطيب", "تونر وكريم"],
  "Brightening Trio": ["ثلاثي الإشراق", "خلاصة وسيروم ومرطب"],
  "Body Ritual Set": ["طقم طقس الجسم", "غسول ومقشر وزبدة"],
  "Hair Shine Set": ["طقم لمعان الشعر", "زيت وقناع ورذاذ"],
  "Lip Care Set": ["طقم عناية الشفاه", "بلسم وزيت وتينت"],
  "Discovery Set": ["طقم الاكتشاف", "أول نظرة على الطقس"],
}

function buildCatalogRecords() {
  const products = seedProducts.map((product, index) => {
    const onSale = product.compareAt && product.compareAt > product.price
    const arabic = PRODUCT_AR[product.name] || []
    return {
      id: product.id,
      name: product.name,
      nameAr: arabic[0] || "",
      subtitle: product.subtitle,
      subtitleAr: arabic[1] || "",
      sku: `GL-${String(index + 1).padStart(4, "0")}`,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      price: onSale ? product.compareAt : product.price,
      discountPrice: onSale ? product.price : null,
      description: product.description,
      descriptionAr: STORY_AR[product.category] || "",
      stock: stockFor(product.id, index),
      images: product.images,
      status: "active",
      badge: product.badge,
      badges: legacyBadgeIds(product.badge),
      sections: sectionsForBadge(product.badge),
      rating: product.rating,
      reviews: product.reviews,
      benefits: (product.benefits || []).map((item) => ({ ...item, labelAr: PERK_AR[item.label] || "" })),
    }
  })
  const categories = seedCategories.map((category) => {
    const names = CATEGORY_NAMES[category.id] || [category.label, category.label]
    return {
      id: category.id,
      name: names[0],
      nameAr: names[1],
      image: category.image,
    }
  })
  const subcategories = {}
  Object.entries(seedSubs).forEach(([categoryId, groups]) => {
    const image = categories.find((item) => item.id === categoryId)?.image || "/images/cream.svg"
    subcategories[categoryId] = groups.map((group) => {
      const names = SUB_NAMES[group.id] || [group.id, group.id]
      return { id: group.id, label: group.label, name: names[0], nameAr: names[1], image }
    })
  })
  return { products, categories, subcategories }
}

function buildOrders(products, customers) {
  const rand = mulberry32(20261110)
  const shoppers = customers.filter((item) => item.id !== "guest-store")
  const orders = []
  for (let i = 0; i < 48; i += 1) {
    const daysAgo = i < 18 ? Math.floor(rand() * 7) : Math.floor(rand() * 120)
    const date = daysAgoDate(daysAgo, 9 + Math.floor(rand() * 10))
    let status = "delivered"
    if (daysAgo === 0) status = ["pending", "confirmed", "preparing", "out"][Math.floor(rand() * 4)]
    else if (daysAgo < 3) status = ["confirmed", "preparing", "out", "delivered"][Math.floor(rand() * 4)]
    else if (rand() < 0.08) status = "returned"
    const count = 1 + Math.floor(rand() * 3)
    const items = []
    for (let n = 0; n < count; n += 1) {
      const product = products[Math.floor(rand() * products.length)]
      if (items.some((item) => item.id === product.id)) continue
      const qty = 1 + (rand() > 0.8 ? 1 : 0)
      const price = chargedPrice(product)
      items.push({
        id: product.id,
        name: product.name,
        image: product.images[0],
        qty,
        price,
      })
    }
    if (!items.length) continue
    const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100
    orders.push({
      id: `GL-${2401 + i}`,
      date: date.toISOString(),
      status,
      items,
      total,
      customerId: shoppers[Math.floor(rand() * shoppers.length)].id,
      source: "admin",
      inventoryApplied: status === "delivered",
      history: [{ status, at: date.toISOString(), by: "seed" }],
    })
  }
  return orders.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function chargedPrice(product) {
  if (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) {
    return product.discountPrice
  }
  return product.price
}

function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(value || "")
}

function localizePair(current, defaults, keys) {
  const next = { ...defaults, ...(current || {}) }
  keys.forEach((key) => {
    const arKey = `${key}Ar`
    const written = current?.[key]
    const writtenAr = current?.[arKey]
    if (hasArabic(written) && !writtenAr) {
      next[arKey] = written
      next[key] = defaults[key] || ""
    } else {
      next[key] = written || defaults[key] || ""
      next[arKey] = writtenAr || defaults[arKey] || ""
    }
  })
  return next
}

function seedBanners(settings = {}) {
  const hero = localizePair(
    {
      title: settings.heroTitle,
      titleAr: settings.heroTitleAr,
      text: settings.heroText,
      textAr: settings.heroTextAr,
      button: settings.heroButton,
      buttonAr: settings.heroButtonAr,
    },
    {
      title: "Natural Glow, Confident You.",
      titleAr: "إشراقة طبيعية، بثقة.",
      text: "Premium skincare products for healthy, radiant skin.",
      textAr: "عناية فاخرة لبشرة صحية ومشرقة.",
      button: "Shop Now",
      buttonAr: "تسوّقي الآن",
    },
    ["title", "text", "button"],
  )
  return [
    { id: "banner-glow", image: settings.heroImage || "/images/face.jpg", link: "shop-categories", ...hero },
    {
      id: "banner-edit",
      image: "/images/portrait.jpg",
      link: "weekly-offers",
      title: "The quiet edit",
      titleAr: "اختيارات هادئة",
      text: "A short list of what we are wearing now.",
      textAr: "قائمة قصيرة مما نختاره الآن.",
      button: "See the edit",
      buttonAr: "شاهدي الاختيارات",
    },
    {
      id: "banner-ritual",
      image: "/images/brushes.jpg",
      link: "new-products",
      title: "A softer routine",
      titleAr: "روتين أهدأ",
      text: "New formulas, ready for the season.",
      textAr: "تركيبات جديدة، جاهزة لهذا الموسم.",
      button: "Shop new",
      buttonAr: "تسوّقي الجديد",
    },
  ]
}

export function buildSeed() {
  const catalog = buildCatalogRecords()
  const customers = seedCustomers()
  const settings = defaultSettings()
  return {
    version: DB_VERSION,
    banners: seedBanners(settings),
    products: catalog.products,
    categories: catalog.categories,
    subcategories: catalog.subcategories,
    brands: seedBrandRecords(),
    badges: seedBadges(),
    reviews: seedReviews(),
    faqs: seedFaqs(),
    socials: seedSocials(),
    cms: defaultCms(),
    customers,
    orders: buildOrders(catalog.products, customers),
    team: seedTeam(),
    settings,
    audit: [],
  }
}

function orderToIqd(order) {
  const items = (Array.isArray(order.items) ? order.items : []).map((item) => ({ ...item, price: toIqd(item.price) }))
  const itemsTotal = items.reduce((sum, item) => sum + item.price * (Number(item.qty) || 0), 0)
  const hasBreakdown = order.subtotal != null && Number.isFinite(Number(order.subtotal))
  const shipping = hasBreakdown ? toIqd(order.shipping) : null
  return {
    ...order,
    // Online payment no longer exists; cash on delivery is the only method.
    payment: order.payment === "online" ? "cod" : order.payment,
    items,
    subtotal: hasBreakdown ? itemsTotal : order.subtotal ?? null,
    shipping: hasBreakdown ? shipping : order.shipping ?? null,
    total: hasBreakdown ? itemsTotal + shipping : itemsTotal || toIqd(order.total),
  }
}

// Orders placed in the storefront live in their own key too. Convert them once, before
// they are merged into the admin database, so no USD amounts survive anywhere.
function convertShopOrdersOnce() {
  try {
    if (localStorage.getItem(CURRENCY_FLAG) === "iqd") return
    const shop = JSON.parse(localStorage.getItem(SHOP_ORDERS) || "null")
    if (Array.isArray(shop) && shop.length) {
      localStorage.setItem(SHOP_ORDERS, JSON.stringify(shop.map(orderToIqd)))
    }
    localStorage.setItem(CURRENCY_FLAG, "iqd")
  } catch {
    /* storage can be unavailable */
  }
}

function migrate(db) {
  const legacyCurrency = (db.version || 0) < 5
  const seeded = Object.fromEntries(buildCatalogRecords().products.map((product) => [product.id, product]))
  const products = (db.products || []).map((rawProduct) => {
    const product = legacyCurrency
      ? {
          ...rawProduct,
          price: toIqd(rawProduct.price),
          discountPrice: rawProduct.discountPrice ? toIqd(rawProduct.discountPrice) : rawProduct.discountPrice ?? null,
        }
      : rawProduct
    const fallback = seeded[product.id]
    return {
      ...product,
      // "Featured" now means "has badges"; the old separate status is folded into Visible.
      status: product.status === "hidden" ? "hidden" : "active",
      nameAr: product.nameAr || fallback?.nameAr || "",
      subtitleAr: product.subtitleAr || fallback?.subtitleAr || "",
      descriptionAr: product.descriptionAr || fallback?.descriptionAr || "",
      badges: Array.isArray(product.badges) ? product.badges : legacyBadgeIds(product.badge),
      sections: Array.isArray(product.sections) ? product.sections : sectionsForBadge(product.badge),
      benefits: (product.benefits || []).map((item, index) => ({
        icon: BENEFIT_ICONS.includes(item.icon) ? item.icon : "Sparkles",
        label: item.label || "",
        labelAr: item.labelAr || fallback?.benefits?.[index]?.labelAr || "",
      })),
    }
  })
  const defaults = defaultSettings()
  const offers = {}
  SECTION_IDS.forEach((id) => {
    const current = db.settings?.offers?.[id] || {}
    offers[id] = {
      ...localizePair(current, defaults.offers[id], ["kicker", "title", "text"]),
      image: current.image || "",
    }
  })
  const settings = {
    ...defaults,
    ...(db.settings || {}),
    ...localizePair(db.settings, defaults, ["heroTitle", "heroText", "heroButton"]),
    currency: "IQD",
    governorates: normalizeGovernorates(db.settings?.governorates),
    heroImage: db.settings?.heroImage || defaults.heroImage,
    offers,
  }
  const badgeDefaults = Object.fromEntries(seedBadges().map((item) => [item.id, item]))
  const seedBrands = Object.fromEntries(seedBrandRecords().map((brand) => [brand.id, brand]))
  return {
    ...db,
    version: DB_VERSION,
    orders: legacyCurrency ? (db.orders || []).map(orderToIqd) : db.orders,
    products,
    brands: (db.brands?.length ? db.brands : seedBrandRecords()).map((brand) => ({
      ...brand,
      descriptionAr: brand.descriptionAr && brand.descriptionAr !== brand.description ? brand.descriptionAr : (seedBrands[brand.id]?.descriptionAr || brand.descriptionAr || ""),
      image: brand.image || brand.logo || "",
      logo: brand.logo || brand.image || "",
    })),
    badges: (db.badges?.length ? db.badges : seedBadges()).map((badge) => ({
      ...badge,
      labelAr: badge.labelAr || badgeDefaults[badge.id]?.labelAr || "",
    })),
    reviews: Array.isArray(db.reviews) ? db.reviews : seedReviews(),
    faqs: Array.isArray(db.faqs) ? db.faqs : seedFaqs(),
    socials: Array.isArray(db.socials) ? db.socials : seedSocials(),
    cms: localizePair(db.cms, defaultCms(), Object.keys(defaultCms()).filter((key) => !key.endsWith("Ar"))),
    banners: Array.isArray(db.banners) && db.banners.length ? db.banners : seedBanners(settings),
    settings,
  }
}

function readRaw() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null")
  } catch {
    return null
  }
}

function pullShopOrders(db) {
  let shop = []
  try {
    shop = JSON.parse(localStorage.getItem(SHOP_ORDERS) || "[]")
  } catch {
    shop = []
  }
  if (!Array.isArray(shop) || !shop.length) return { db, changed: false }
  const known = new Set(db.orders.map((order) => order.id))
  const incoming = shop.filter((order) => order?.id && !known.has(order.id)).map(normalizeShopOrder)
  if (!incoming.length) return { db, changed: false }
  const customers = db.customers.some((item) => item.id === "guest-store")
    ? db.customers
    : [...db.customers, seedCustomers().find((item) => item.id === "guest-store")]
  return {
    db: { ...db, customers, orders: [...incoming, ...db.orders] },
    changed: true,
  }
}

function normalizeShopOrder(order) {
  const status =
    {
      delivery: "out",
      completed: "delivered",
      pending: "pending",
      confirmed: "confirmed",
      preparing: "preparing",
      out: "out",
      delivered: "delivered",
      returned: "returned",
    }[order.status] || "pending"
  const customer = order.customer && typeof order.customer === "object" ? order.customer : null
  const subtotal = Number(order.subtotal)
  const shipping = Number(order.shipping)
  return {
    id: order.id,
    date: order.date || new Date().toISOString(),
    status,
    items: Array.isArray(order.items) ? order.items : [],
    total: Number(order.total) || 0,
    subtotal: Number.isFinite(subtotal) ? subtotal : null,
    shipping: Number.isFinite(shipping) ? shipping : null,
    payment: "cod",
    customer,
    customerId: order.customerId || "guest-store",
    source: "storefront",
    inventoryApplied: status === "delivered",
    history: [{ status, at: order.date || new Date().toISOString(), by: "storefront" }],
  }
}

export function ensure() {
  if (state) return state
  const parsed = readRaw()
  if (!parsed || !Array.isArray(parsed.products)) {
    state = buildSeed()
  } else {
    state = migrate(parsed)
    if (parsed.version !== DB_VERSION || !parsed.banners) write(state)
  }
  convertShopOrdersOnce()
  if (!syncEnabled) {
    // Browser-only mode. With Supabase, orders come from the database, never from this key.
    const pulled = pullShopOrders(state)
    state = pulled.db
    if (pulled.changed) write(state)
  } else {
    startLiveSync()
  }
  return state
}

// What is safe to keep in this browser's cache: personal / staff data is only cached for a
// signed-in team member, never for a guest.
function cacheable(db) {
  if (!syncEnabled || isStaffSession()) return db
  return { ...db, customers: [], team: [], audit: [], orders: db.orders.filter((order) => order.source === "storefront") }
}

function write(next) {
  localStorage.setItem(KEY, JSON.stringify(cacheable(next)))
}

function commit(next) {
  const prev = state
  try {
    write(next)
    state = next
    window.dispatchEvent(new CustomEvent("glowora-db"))
    // Persist to Supabase (diffed, queued, optimistic). No-op in browser-only mode.
    if (syncEnabled) pushChanges(prev, next)
    return { ok: true }
  } catch {
    state = prev
    return { ok: false, reason: "storage" }
  }
}

// ---- Supabase bridge: lets the sync layer read and patch the in-memory db ----
let liveStarted = false

function setRemote(next) {
  if (JSON.stringify(next) === JSON.stringify(state)) return
  state = next
  try {
    write(next)
  } catch {
    /* cache is optional */
  }
  window.dispatchEvent(new CustomEvent("glowora-db"))
}

// Swaps one piece of text for another everywhere in the db (used for uploaded-image URLs
// and for teammate ids that Supabase Auth has just issued).
function replaceText(map) {
  let json = JSON.stringify(state)
  map.forEach((to, from) => {
    json = json.split(JSON.stringify(from).slice(1, -1)).join(JSON.stringify(to).slice(1, -1))
  })
  setRemote(JSON.parse(json))
}

function renameOrder(from, to) {
  setRemote({ ...state, orders: state.orders.map((order) => (order.id === from ? { ...order, id: to } : order)) })
  try {
    const list = JSON.parse(localStorage.getItem(SHOP_ORDERS) || "[]")
    localStorage.setItem(SHOP_ORDERS, JSON.stringify(list.map((item) => (item.id === from ? { ...item, id: to } : item))))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("glowora-order-renamed", { detail: { from, to } }))
}

function dropOrder(id) {
  setRemote({ ...state, orders: state.orders.filter((order) => order.id !== id) })
  window.dispatchEvent(new CustomEvent("glowora-order-failed", { detail: { id } }))
}

function startLiveSync() {
  if (liveStarted) return
  liveStarted = true
  attachSync({ get: () => state, setRemote, replaceText, renameOrder, dropOrder })
}

function subscribe(callback) {
  const onLocal = () => callback()
  const onStorage = (event) => {
    if (event.key && event.key !== KEY && event.key !== SHOP_ORDERS) return
    if (syncEnabled) return // Supabase realtime is the source of truth across tabs
    state = null
    callback()
  }
  window.addEventListener("glowora-db", onLocal)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener("glowora-db", onLocal)
    window.removeEventListener("storage", onStorage)
  }
}

export function useDb() {
  return useSyncExternalStore(subscribe, ensure, ensure)
}

function safeImage(src) {
  if (!src || typeof src !== "string") return "/images/cream.svg"
  if (src.startsWith("/images/")) return src
  if (src.startsWith("data:image/")) return src
  // Images the admin uploaded live in Supabase Storage (public "media" bucket).
  if (MEDIA_PUBLIC_PREFIX && src.startsWith(MEDIA_PUBLIC_PREFIX)) return src
  return "/images/cream.svg"
}

export function adaptProduct(product, badges = [], reviews = []) {
  const onSale = product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
  const badgeItems = (product.badges || [])
    .map((id) => badges.find((item) => item.id === id))
    .filter(Boolean)
  const approved = reviews.filter((item) => item.productId === product.id && item.status === "approved")
  const rating = approved.length
    ? Math.round((approved.reduce((sum, item) => sum + item.rating, 0) / approved.length) * 10) / 10
    : product.rating ?? 5
  return {
    ...product,
    price: onSale ? Number(product.discountPrice) : Number(product.price),
    compareAt: onSale ? Number(product.price) : null,
    listPrice: Number(product.price),
    inStock: product.stock > 0,
    images: product.images?.length ? product.images.map(safeImage) : ["/images/cream.svg"],
    benefits: product.benefits?.length
      ? product.benefits
      : [
          { icon: "Sparkles", label: "Soft Glow" },
          { icon: "Droplets", label: "Daily Care" },
        ],
    subtitle: product.subtitle || product.category,
    badgeItems,
    badge: badgeItems[0]?.label || product.badge || null,
    rating,
    reviews: approved.length || product.reviews || 0,
    comments: approved,
  }
}

export function projectStorefront(db) {
  const allProducts = db.products.map((product) => adaptProduct(product, db.badges || [], db.reviews || []))
  return {
    allProducts,
    products: allProducts.filter((product) => product.status !== "hidden"),
    categories: db.categories,
    subcategories: db.subcategories,
    settings: db.settings,
    brands: db.brands || [],
    badges: db.badges || [],
    faqs: db.faqs || [],
    socials: db.socials || [],
    cms: db.cms || defaultCms(),
    banners: db.banners || [],
  }
}

export function textOf(record, language, key) {
  if (!record) return ""
  const english = record[key] || ""
  const arabic = record[`${key}Ar`] || ""
  if (language === "ar") return arabic || english
  return english || arabic
}

export function localizeProduct(product, language) {
  if (!product) return product
  const badgeItems = (product.badgeItems || []).map((item) => ({ ...item, label: textOf(item, language, "label") }))
  return {
    ...product,
    name: textOf(product, language, "name"),
    subtitle: textOf(product, language, "subtitle"),
    description: textOf(product, language, "description"),
    benefits: (product.benefits || []).map((item) => ({ ...item, label: textOf(item, language, "label") })),
    badgeItems,
    badge: badgeItems[0]?.label || product.badge || null,
  }
}

export function canReview(orderId, productId) {
  const order = ensure().orders.find((item) => item.id === orderId)
  return Boolean(
    order &&
      order.source === "storefront" &&
      order.status === "delivered" &&
      (order.items || []).some((item) => item.id === productId),
  )
}

export function productsForSection(list, id) {
  const assigned = (list || []).filter((product) => (product.sections || []).includes(id))
  if (assigned.length) return assigned
  return getOfferProducts(id, list)
}

export function cmsText(cms, language, key, fallback) {
  if (!cms) return fallback
  const localized = language === "ar" ? cms[`${key}Ar`] : cms[key]
  return localized || fallback
}

export function useStorefront() {
  const db = useDb()
  return useMemo(() => projectStorefront(db), [db])
}

export function labelCategory(category, language) {
  if (!category) return ""
  if (language === "ar") return category.nameAr || category.name || category.id
  return category.name || category.id
}

export function labelSub(group, language) {
  if (!group) return ""
  if (language === "ar") return group.nameAr || group.name || group.label || group.id
  return group.name || group.label || group.id
}

// All money in the platform is Iraqi Dinar (IQD / د.ع), shown as whole dinars.
export function money(value, language = "en") {
  const amount = Math.round(Number(value) || 0).toLocaleString("en-US")
  return language === "ar" ? `${amount} د.ع` : `${amount} IQD`
}

export function permissionsOf(user) {
  if (!user?.active) return []
  if (user.role === "admin") return [...PERMISSIONS]
  return (user.permissions || []).filter((item) => PERMISSIONS.includes(item))
}

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION) || "null")
    if (!session?.email || !session.exp || session.exp < Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function sessionUser(db = ensure()) {
  const session = readSession()
  if (!session) return null
  const user = db.team.find((item) => item.email === session.email && item.active)
  if (!user) return null
  if (syncEnabled ? user.id !== session.proof : user.passwordHash !== session.proof) return null
  if (user.role !== "admin" && user.role !== "staff") return null
  return user
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION)
  } catch {
    /* ignore */
  }
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

const LOCK = "glowora-admin-lock"
const FAILS = "glowora-admin-fails"

export async function login(email, password) {
  const lock = Number(sessionStorage.getItem(LOCK) || 0)
  if (Date.now() < lock) return { ok: false, reason: "locked" }
  const normalized = email.trim().toLowerCase()
  const blocked = new Set(["member@glowora.com", "customer@glowora.com"])
  if (blocked.has(normalized)) return { ok: false, reason: "customer" }
  const db = ensure()
  let user = db.team.find((item) => item.email.toLowerCase() === normalized)
  let hash = ""
  let remote = null
  if (syncEnabled) {
    // Supabase Auth checks the password; the profile row decides role and permissions.
    remote = await signInStaff(normalized, password)
    user = remote.ok ? ensure().team.find((item) => item.email.toLowerCase() === normalized) : null
  } else {
    hash = await sha256(password)
  }
  const credentialsOk = syncEnabled ? Boolean(remote?.ok) : Boolean(user) && user.passwordHash === hash
  if (!user || !user.active || !credentialsOk || (user.role !== "admin" && user.role !== "staff")) {
    const fails = Number(sessionStorage.getItem(FAILS) || 0) + 1
    sessionStorage.setItem(FAILS, String(fails))
    if (fails >= 5) {
      sessionStorage.setItem(LOCK, String(Date.now() + 60_000))
      sessionStorage.setItem(FAILS, "0")
      return { ok: false, reason: "locked" }
    }
    return { ok: false, reason: "invalid" }
  }
  sessionStorage.setItem(FAILS, "0")
  sessionStorage.removeItem(LOCK)
  sessionStorage.setItem(
    SESSION,
    JSON.stringify({ email: user.email, exp: Date.now() + 8 * 60 * 60 * 1000, proof: syncEnabled ? user.id : user.passwordHash }),
  )
  pushAudit(user, "Signed in")
  return { ok: true }
}

export function logout() {
  clearSession()
  if (syncEnabled) signOutStaff()
}

function actor(db) {
  return sessionUser(db)
}

function allowed(user, permission) {
  return permissionsOf(user).includes(permission)
}

function pushAudit(user, message) {
  const db = ensure()
  const audit = [{ at: new Date().toISOString(), email: user?.email || "system", message }, ...(db.audit || [])].slice(0, 40)
  commit({ ...db, audit })
}

function slug(value) {
  const base = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return base || `item-${Date.now()}`
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max)
}

export function recordStorefrontOrder(order) {
  const db = ensure()
  if (db.orders.some((item) => item.id === order.id)) return
  const next = normalizeShopOrder({ ...order, status: "pending", source: "storefront" })
  const customers = db.customers.some((item) => item.id === "guest-store")
    ? db.customers
    : [...db.customers, seedCustomers().find((item) => item.id === "guest-store")]
  commit({ ...db, customers, orders: [next, ...db.orders] })
}

const FLOW = {
  pending: { approve: "confirmed", return: "returned" },
  confirmed: { prepared: "preparing", return: "returned" },
  preparing: { dispatch: "out", return: "returned" },
  out: { deliver: "delivered", return: "returned" },
  delivered: { return: "returned" },
  returned: {},
}

export function advanceOrder(orderId, action) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "orders")) return { ok: false, reason: "forbidden" }
  const order = db.orders.find((item) => item.id === orderId)
  const status = FLOW[order?.status]?.[action]
  if (!order || !status) return { ok: false, reason: "illegal" }

  let products = db.products
  if (status === "delivered" && !order.inventoryApplied) {
    const short = order.items.some((line) => {
      const product = products.find((item) => item.id === line.id)
      return !product || product.stock < line.qty
    })
    if (short) return { ok: false, reason: "stock" }
    products = products.map((product) => {
      const line = order.items.find((item) => item.id === product.id)
      if (!line) return product
      return { ...product, stock: product.stock - line.qty }
    })
  }
  if (status === "returned" && order.inventoryApplied) {
    products = products.map((product) => {
      const line = order.items.find((item) => item.id === product.id)
      if (!line) return product
      return { ...product, stock: product.stock + line.qty }
    })
  }

  const updated = {
    ...order,
    status,
    inventoryApplied: status === "delivered" ? true : status === "returned" ? false : order.inventoryApplied,
    history: [...(order.history || []), { status, at: new Date().toISOString(), by: user.email }],
  }
  const orders = db.orders.map((item) => (item.id === orderId ? updated : item))
  const saved = commit({
    ...db,
    products,
    orders,
    audit: [{ at: new Date().toISOString(), email: user.email, message: `${orderId} → ${status}` }, ...(db.audit || [])].slice(0, 40),
  })
  if (!saved.ok) return saved
  if (updated.source === "storefront") syncShopStatus(updated)
  return { ok: true, status }
}

function syncShopStatus(order) {
  try {
    const list = JSON.parse(localStorage.getItem(SHOP_ORDERS) || "[]")
    if (!Array.isArray(list)) return
    const next = list.map((item) => (item.id === order.id ? { ...item, status: order.status } : item))
    localStorage.setItem(SHOP_ORDERS, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function saveProduct(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "products")) return { ok: false, reason: "forbidden" }
  const name = cleanText(input.name, 80)
  const sku = cleanText(input.sku, 32).toUpperCase()
  const price = Number(input.price)
  const discountRaw = input.discountPrice === "" || input.discountPrice == null ? null : Number(input.discountPrice)
  const stock = Math.max(0, Math.floor(Number(input.stock) || 0))
  if (!name || !sku || !Number.isFinite(price) || price < 0) return { ok: false, reason: "invalid" }
  if (discountRaw != null && (!Number.isFinite(discountRaw) || discountRaw < 0)) return { ok: false, reason: "invalid" }
  if (db.products.some((item) => item.sku.toLowerCase() === sku.toLowerCase() && item.id !== editingId)) {
    return { ok: false, reason: "sku" }
  }
  const category = db.categories.find((item) => item.id === input.category)
  if (!category) return { ok: false, reason: "invalid" }
  const groups = db.subcategories[category.id] || []
  const subcategory = groups.some((item) => item.id === input.subcategory) ? input.subcategory : groups[0]?.id || null
  const images = (Array.isArray(input.images) && input.images.length ? input.images : [input.image])
    .map(safeImage)
    .slice(0, 3)
  const badgeIds = (input.badges || []).filter((id) => db.badges.some((item) => item.id === id)).slice(0, 4)
  const benefits = (input.benefits || [])
    .map((item) => ({
      icon: BENEFIT_ICONS.includes(item.icon) ? item.icon : "Sparkles",
      label: cleanText(item.label, 24),
      labelAr: cleanText(item.labelAr, 24),
    }))
    .filter((item) => item.label || item.labelAr)
    .slice(0, 8)
  const sections = (input.sections || []).filter((id) => SECTION_IDS.includes(id))
  const brandId = db.brands.some((item) => item.id === input.brand) ? input.brand : db.brands[0]?.id
  const next = {
    id: editingId || slug(name),
    name,
    nameAr: cleanText(input.nameAr, 80),
    subtitle: cleanText(input.subtitle, 80) || category.name,
    subtitleAr: cleanText(input.subtitleAr, 80),
    sku,
    brand: brandId,
    category: category.id,
    subcategory,
    price: Math.round(price * 100) / 100,
    discountPrice: discountRaw && discountRaw < price ? Math.round(discountRaw * 100) / 100 : null,
    description: cleanText(input.description, 600),
    descriptionAr: cleanText(input.descriptionAr, 600),
    stock,
    images: images.length ? images : ["/images/cream.svg"],
    status: input.status === "hidden" ? "hidden" : "active",
    badges: badgeIds,
    badge: db.badges.find((item) => item.id === badgeIds[0])?.label || null,
    sections,
    rating: Number(input.rating) || 5,
    reviews: Number(input.reviews) || 0,
    benefits: benefits.length
      ? benefits
      : [
          { icon: "Sparkles", label: "Soft Glow" },
          { icon: "Droplets", label: "Daily Care" },
        ],
  }
  if (!editingId && db.products.some((item) => item.id === next.id)) next.id = `${next.id}-${Date.now()}`
  const products = editingId
    ? db.products.map((item) => (item.id === editingId ? { ...item, ...next, id: editingId } : item))
    : [next, ...db.products]
  const saved = commit({ ...db, products })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} product ${next.name}`)
  return saved
}

export function deleteProduct(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "products.delete")) return { ok: false, reason: "forbidden" }
  const product = db.products.find((item) => item.id === id)
  if (!product) return { ok: false, reason: "missing" }
  const saved = commit({ ...db, products: db.products.filter((item) => item.id !== id) })
  if (saved.ok) pushAudit(user, `Deleted product ${product.name}`)
  return saved
}

export function saveCategory(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "categories")) return { ok: false, reason: "forbidden" }
  const name = cleanText(input.name, 40)
  const nameAr = cleanText(input.nameAr, 40) || name
  if (!name) return { ok: false, reason: "invalid" }
  let id = editingId || slug(name)
  if (!editingId && db.categories.some((item) => item.id === id)) id = `${id}-${Date.now()}`
  const record = { id, name, nameAr, image: safeImage(input.image) }
  const categories = editingId
    ? db.categories.map((item) => (item.id === editingId ? { ...item, ...record, id: editingId } : item))
    : [...db.categories, record]
  const subcategories = { ...db.subcategories }
  if (!editingId) subcategories[id] = []
  const saved = commit({ ...db, categories, subcategories })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} category ${name}`)
  return saved
}

export function deleteCategory(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "categories")) return { ok: false, reason: "forbidden" }
  if (db.products.some((item) => item.category === id)) return { ok: false, reason: "busy" }
  const subcategories = { ...db.subcategories }
  delete subcategories[id]
  const saved = commit({
    ...db,
    categories: db.categories.filter((item) => item.id !== id),
    subcategories,
  })
  if (saved.ok) pushAudit(user, `Deleted category ${id}`)
  return saved
}

export function saveSubcategory(categoryId, input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "categories")) return { ok: false, reason: "forbidden" }
  if (!db.categories.some((item) => item.id === categoryId)) return { ok: false, reason: "invalid" }
  const name = cleanText(input.name, 40)
  const nameAr = cleanText(input.nameAr, 40) || name
  if (!name) return { ok: false, reason: "invalid" }
  let id = editingId || slug(name)
  const current = db.subcategories[categoryId] || []
  if (!editingId && current.some((item) => item.id === id)) id = `${id}-${Date.now()}`
  const record = {
    id,
    label: name,
    name,
    nameAr,
    image: safeImage(input.image || db.categories.find((item) => item.id === categoryId)?.image),
  }
  const next = editingId
    ? current.map((item) => (item.id === editingId ? { ...item, ...record, id: editingId } : item))
    : [...current, record]
  const saved = commit({ ...db, subcategories: { ...db.subcategories, [categoryId]: next } })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} subcategory ${name}`)
  return saved
}

export function deleteSubcategory(categoryId, id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "categories")) return { ok: false, reason: "forbidden" }
  if (db.products.some((item) => item.category === categoryId && item.subcategory === id)) {
    return { ok: false, reason: "busy" }
  }
  const saved = commit({
    ...db,
    subcategories: {
      ...db.subcategories,
      [categoryId]: (db.subcategories[categoryId] || []).filter((item) => item.id !== id),
    },
  })
  if (saved.ok) pushAudit(user, `Deleted subcategory ${id}`)
  return saved
}

export function saveCustomer(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "customers")) return { ok: false, reason: "forbidden" }
  const name = cleanText(input.name, 60)
  const email = cleanText(input.email, 80).toLowerCase()
  if (!name || !email.includes("@")) return { ok: false, reason: "invalid" }
  if (db.customers.some((item) => item.email === email && item.id !== editingId)) return { ok: false, reason: "email" }
  const record = {
    id: editingId || `c-${Date.now()}`,
    name,
    email,
    phone: cleanText(input.phone, 24),
    city: cleanText(input.city, 40),
    registeredAt: editingId
      ? db.customers.find((item) => item.id === editingId)?.registeredAt || new Date().toISOString()
      : new Date().toISOString(),
  }
  const customers = editingId
    ? db.customers.map((item) => (item.id === editingId ? record : item))
    : [record, ...db.customers]
  const saved = commit({ ...db, customers })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} customer ${name}`)
  return saved
}

function adminCount(team, exceptId, nextRole, nextActive) {
  return team.filter((item) => {
    if (item.id === exceptId) return nextRole === "admin" && nextActive
    return item.role === "admin" && item.active
  }).length
}

export function saveMember(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "team")) return { ok: false, reason: "forbidden" }
  const name = cleanText(input.name, 60)
  const email = cleanText(input.email, 80).toLowerCase()
  const role = input.role === "admin" ? "admin" : "staff"
  const active = Boolean(input.active)
  if (!name || !email.includes("@")) return { ok: false, reason: "invalid" }
  if (db.team.some((item) => item.email === email && item.id !== editingId)) return { ok: false, reason: "email" }
  const existing = db.team.find((item) => item.id === editingId)
  if (adminCount(db.team, editingId || "__new__", role, active) < 1) return { ok: false, reason: "last-admin" }
  let passwordHash = existing?.passwordHash
  if (!existing) {
    if (!input.password || input.password.length < 8) return { ok: false, reason: "password" }
    passwordHash = input.passwordHash
  } else if (input.password) {
    if (input.password.length < 8) return { ok: false, reason: "password" }
    passwordHash = input.passwordHash
  }
  const permissions = role === "admin" ? [...PERMISSIONS] : (input.permissions || []).filter((item) => PERMISSIONS.includes(item) && item !== "team")
  const record = {
    id: editingId || `u-${Date.now()}`,
    name,
    email,
    role,
    active,
    passwordHash,
    permissions,
  }
  const team = editingId ? db.team.map((item) => (item.id === editingId ? record : item)) : [...db.team, record]
  if (syncEnabled) rememberPassword(record.id, input.password)
  const saved = commit({ ...db, team })
  if (saved.ok && user.id === record.id) refreshSession(record)
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} teammate ${name}`)
  return saved
}

function refreshSession(member) {
  try {
    sessionStorage.setItem(
      SESSION,
      JSON.stringify({ email: member.email, exp: Date.now() + 8 * 60 * 60 * 1000, proof: syncEnabled ? member.id : member.passwordHash }),
    )
  } catch {
    /* ignore */
  }
}

export async function hashPassword(password) {
  return sha256(password)
}

export function removeMember(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "team")) return { ok: false, reason: "forbidden" }
  const member = db.team.find((item) => item.id === id)
  if (!member) return { ok: false, reason: "missing" }
  if (member.role === "admin" && member.active && db.team.filter((item) => item.role === "admin" && item.active).length < 2) {
    return { ok: false, reason: "last-admin" }
  }
  const saved = commit({ ...db, team: db.team.filter((item) => item.id !== id) })
  if (saved.ok) pushAudit(user, `Removed teammate ${member.email}`)
  return saved
}

export async function changePassword(currentPassword, nextPassword) {
  const db = ensure()
  const user = actor(db)
  if (!user) return { ok: false, reason: "forbidden" }
  if (!nextPassword || nextPassword.length < 8) return { ok: false, reason: "password" }
  if (syncEnabled) return changeOwnPassword(user.email, currentPassword || "", nextPassword)
  const current = await sha256(currentPassword || "")
  if (current !== user.passwordHash) return { ok: false, reason: "mismatch" }
  const passwordHash = await sha256(nextPassword)
  const team = db.team.map((item) => (item.id === user.id ? { ...item, passwordHash } : item))
  const saved = commit({ ...db, team })
  if (saved.ok) refreshSession({ ...user, passwordHash })
  return saved
}

export function saveSettings(input) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const offers = {}
  ;["black-friday", "new-products", "weekly-offers"].forEach((id) => {
    const source = input.offers?.[id] || {}
    offers[id] = {
      kicker: cleanText(source.kicker, 40),
      title: cleanText(source.title, 48),
      text: cleanText(source.text, 140),
      image: source.image ? safeImage(source.image) : "",
    }
  })
  const low = Math.max(1, Math.floor(Number(input.lowStock) || 8))
  const settings = {
    ...db.settings,
    storeName: cleanText(input.storeName, 40) || "Glowora",
    supportEmail: cleanText(input.supportEmail, 80) || "care@glowora.com",
    currency: "IQD",
    governorates: input.governorates ? normalizeGovernorates(input.governorates) : normalizeGovernorates(db.settings.governorates),
    lowStock: low,
    heroTitle: input.heroTitle == null ? db.settings.heroTitle : cleanText(input.heroTitle, 80),
    heroText: input.heroText == null ? db.settings.heroText : cleanText(input.heroText, 180),
    heroButton: input.heroButton == null ? db.settings.heroButton : cleanText(input.heroButton, 32),
    heroImage: input.heroImage == null ? db.settings.heroImage || "" : input.heroImage ? safeImage(input.heroImage) : "",
    offers: input.offers ? offers : db.settings.offers,
  }
  const saved = commit({ ...db, settings })
  if (saved.ok) pushAudit(user, "Updated store settings")
  return saved
}

function inRange(value, bounds) {
  const time = new Date(value).getTime()
  return time >= bounds.start.getTime() && time <= bounds.end.getTime()
}

export function rangeBounds(preset, custom) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  if (preset === "today") {
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (preset === "30d") {
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (preset === "year") {
    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (preset === "custom" && custom?.from && custom?.to) {
    const from = new Date(custom.from)
    const to = new Date(custom.to)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      return from <= to ? { start: from, end: to } : { start: to, end: from }
    }
  }
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function isRevenue(order) {
  return ["confirmed", "preparing", "out", "delivered"].includes(order.status)
}

function dayKey(date) {
  const value = new Date(date)
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
}

function visitorsForDay(date) {
  const key = dayKey(date)
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619)
  const base = 90 + (Math.abs(hash) % 150)
  const weekend = date.getDay() === 0 || date.getDay() === 6 ? 1.28 : 1
  return Math.round(base * weekend)
}

export function dashboardMetrics(db, preset, custom) {
  const bounds = rangeBounds(preset, custom)
  const orders = db.orders.filter((order) => inRange(order.date, bounds))
  const revenueOrders = orders.filter(isRevenue)
  const sales = Math.round(revenueOrders.reduce((sum, order) => sum + order.total, 0))
  const aov = revenueOrders.length ? Math.round(sales / revenueOrders.length) : 0
  const newCustomers = db.customers.filter((item) => item.id !== "guest-store" && inRange(item.registeredAt, bounds)).length
  const tally = new Map()
  revenueOrders.forEach((order) => {
    order.items.forEach((item) => {
      const current = tally.get(item.id) || { id: item.id, name: item.name, image: item.image, qty: 0, revenue: 0 }
      current.qty += item.qty
      current.revenue += item.price * item.qty
      tally.set(item.id, current)
    })
  })
  const top = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const low = db.products
    .filter((product) => product.status !== "hidden" && product.stock <= (db.settings.lowStock || 8))
    .sort((a, b) => a.stock - b.stock)
  const series = buildSeries(bounds, preset, revenueOrders, orders)
  return { bounds, orders, sales, aov, newCustomers, top, low, series, orderCount: orders.length }
}

// One point per hour for "today", otherwise one point per calendar day. Every point
// carries its real timestamp so the chart can print true dates and the dashboard can
// open that exact day.
function buildSeries(bounds, preset, orders, allOrders) {
  const stamps = []
  const sales = []
  const visitors = []
  const counts = []
  const round = (value) => Math.round(value)
  if (preset === "today") {
    const weights = [1, 1, 1, 1, 1, 2, 3, 4, 6, 7, 8, 8, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1]
    const todayVisits = visitorsForDay(bounds.start)
    const weightSum = weights.reduce((sum, value) => sum + value, 0)
    for (let hour = 0; hour < 24; hour += 1) {
      const stamp = new Date(bounds.start)
      stamp.setHours(hour, 0, 0, 0)
      const inHour = orders.filter((order) => new Date(order.date).getHours() === hour)
      stamps.push(stamp.getTime())
      sales.push(round(inHour.reduce((sum, order) => sum + order.total, 0)))
      counts.push(allOrders.filter((order) => inRange(order.date, bounds) && new Date(order.date).getHours() === hour).length)
      visitors.push(Math.round((todayVisits * weights[hour]) / weightSum))
    }
    return { granularity: "hour", stamps, sales, visitors, counts }
  }
  const salesByDay = new Map()
  orders.forEach((order) => {
    const key = dayKey(order.date)
    salesByDay.set(key, (salesByDay.get(key) || 0) + order.total)
  })
  const countByDay = new Map()
  allOrders.forEach((order) => {
    const key = dayKey(order.date)
    countByDay.set(key, (countByDay.get(key) || 0) + 1)
  })
  const cursor = new Date(bounds.start)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= bounds.end) {
    const key = dayKey(cursor)
    stamps.push(cursor.getTime())
    sales.push(round(salesByDay.get(key) || 0))
    counts.push(countByDay.get(key) || 0)
    visitors.push(visitorsForDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return { granularity: "day", stamps, sales, visitors, counts }
}

const STATUS_ORDER = ["pending", "confirmed", "preparing", "out", "delivered", "returned"]

// Everything the dashboard shows when the admin clicks or scrubs to one day on a chart.
export function dayDetails(db, timestamp) {
  const start = new Date(timestamp)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  const bounds = { start, end }
  const orders = db.orders.filter((order) => inRange(order.date, bounds)).sort((a, b) => new Date(b.date) - new Date(a.date))
  const revenueOrders = orders.filter(isRevenue)
  const sales = Math.round(revenueOrders.reduce((sum, order) => sum + order.total, 0))
  const visitors = visitorsForDay(start)
  const units = revenueOrders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + (Number(item.qty) || 0), 0), 0)
  const tally = new Map()
  revenueOrders.forEach((order) => {
    order.items.forEach((item) => {
      const current = tally.get(item.id) || { id: item.id, name: item.name, nameAr: item.nameAr, image: item.image, qty: 0, revenue: 0 }
      current.qty += Number(item.qty) || 0
      current.revenue += item.price * (Number(item.qty) || 0)
      tally.set(item.id, current)
    })
  })
  return {
    start,
    orders,
    sales,
    visitors,
    orderCount: orders.length,
    paidCount: revenueOrders.length,
    aov: revenueOrders.length ? Math.round(sales / revenueOrders.length) : 0,
    units,
    conversion: visitors ? orders.length / visitors : 0,
    newCustomers: db.customers.filter((item) => item.id !== "guest-store" && inRange(item.registeredAt, bounds)).length,
    top: [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    byStatus: STATUS_ORDER.map((status) => ({ status, count: orders.filter((order) => order.status === status).length })).filter((row) => row.count > 0),
  }
}

export function customerStats(db, customerId) {
  const orders = db.orders.filter((order) => order.customerId === customerId && order.status !== "returned")
  const spent = orders.filter(isRevenue).reduce((sum, order) => sum + order.total, 0)
  return { orders: orders.length, spent: Math.round(spent * 100) / 100 }
}

export function brandLabel(id) {
  return (ensure().brands || catalogBrands).find((item) => item.id === id)?.name || id
}

export function saveBadge(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "products")) return { ok: false, reason: "forbidden" }
  const source = typeof input === "string" ? { label: input } : input || {}
  const name = cleanText(source.label, 24)
  const nameAr = cleanText(source.labelAr, 24)
  if (!name && !nameAr) return { ok: false, reason: "invalid" }
  if (!editingId && db.badges.some((item) => item.label.toLowerCase() === (name || nameAr).toLowerCase())) return { ok: false, reason: "exists" }
  let id = editingId || slug(name || nameAr)
  if (!editingId && db.badges.some((item) => item.id === id)) id = `${id}-${Date.now()}`
  const record = { id, label: name || nameAr, labelAr: nameAr, tone: source.tone || "nude" }
  const badges = editingId
    ? db.badges.map((item) => (item.id === editingId ? { ...item, ...record, id: editingId, tone: item.tone } : item))
    : [...db.badges, record]
  const saved = commit({ ...db, badges })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} badge ${record.label}`)
  return saved.ok ? { ...saved, id: editingId || id } : saved
}

export function deleteBadge(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "products")) return { ok: false, reason: "forbidden" }
  const products = db.products.map((product) => ({
    ...product,
    badges: (product.badges || []).filter((item) => item !== id),
    badge: (product.badges || []).filter((item) => item !== id)[0]
      ? db.badges.find((item) => item.id === (product.badges || []).filter((badge) => badge !== id)[0])?.label || null
      : null,
  }))
  const saved = commit({ ...db, badges: db.badges.filter((item) => item.id !== id), products })
  if (saved.ok) pushAudit(user, `Removed badge ${id}`)
  return saved
}

export function saveBrand(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "brands") && !allowed(user, "products")) return { ok: false, reason: "forbidden" }
  const name = cleanText(input.name, 40)
  if (!name) return { ok: false, reason: "invalid" }
  let id = editingId || slug(name)
  if (!editingId && db.brands.some((item) => item.id === id)) id = `${id}-${Date.now()}`
  const record = {
    id,
    name,
    mark: cleanText(input.mark, 3).toUpperCase() || name.slice(0, 2).toUpperCase(),
    tone: input.tone || "bg-espresso text-ivory",
    description: cleanText(input.description, 160),
    descriptionAr: cleanText(input.descriptionAr, 160) || cleanText(input.description, 160),
    logo: input.logo ? safeImage(input.logo) : "",
    image: (input.image || input.logo) ? safeImage(input.image || input.logo) : "",
  }
  const brands = editingId
    ? db.brands.map((item) => (item.id === editingId ? { ...item, ...record, id: editingId } : item))
    : [...db.brands, record]
  const saved = commit({ ...db, brands })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} brand ${name}`)
  return saved
}

export function deleteBrand(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "brands") && !allowed(user, "products")) return { ok: false, reason: "forbidden" }
  if (db.products.some((item) => item.brand === id)) return { ok: false, reason: "busy" }
  if (db.brands.length < 2) return { ok: false, reason: "last" }
  const saved = commit({ ...db, brands: db.brands.filter((item) => item.id !== id) })
  if (saved.ok) pushAudit(user, `Removed brand ${id}`)
  return saved
}

export function setReviewStatus(id, status) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "reviews")) return { ok: false, reason: "forbidden" }
  if (!["approved", "pending"].includes(status)) return { ok: false, reason: "invalid" }
  const reviews = db.reviews.map((item) => (item.id === id ? { ...item, status } : item))
  const saved = commit({ ...db, reviews })
  if (saved.ok) pushAudit(user, `Review ${id} ${status}`)
  return saved
}

export function deleteReview(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "reviews")) return { ok: false, reason: "forbidden" }
  const saved = commit({ ...db, reviews: db.reviews.filter((item) => item.id !== id) })
  if (saved.ok) pushAudit(user, `Deleted review ${id}`)
  return saved
}

export function submitReview(input) {
  const db = ensure()
  const author = cleanText(input.author, 40)
  const text = cleanText(input.text, 400)
  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 0)))
  if (!author || text.length < 4 || !input.orderId || !db.products.some((item) => item.id === input.productId)) {
    return { ok: false, reason: "invalid" }
  }
  if (!canReview(input.orderId, input.productId)) return { ok: false, reason: "not-delivered" }
  if (db.reviews.some((item) => item.orderId === input.orderId && item.productId === input.productId)) {
    return { ok: false, reason: "exists" }
  }
  const record = {
    id: `r-${Date.now()}`,
    orderId: input.orderId,
    productId: input.productId,
    author,
    rating,
    text,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  return commit({ ...db, reviews: [record, ...db.reviews] })
}

export function saveHomepage(input) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const offers = {}
  SECTION_IDS.forEach((id) => {
    const source = input.offers?.[id] || {}
    offers[id] = {
      kicker: cleanText(source.kicker, 40),
      kickerAr: cleanText(source.kickerAr, 40),
      title: cleanText(source.title, 48),
      titleAr: cleanText(source.titleAr, 48),
      text: cleanText(source.text, 140),
      textAr: cleanText(source.textAr, 140),
      image: source.image ? safeImage(source.image) : "",
    }
  })
  const settings = {
    ...db.settings,
    offers,
  }
  const saved = commit({ ...db, settings })
  if (saved.ok) pushAudit(user, "Updated homepage")
  return saved
}

export function saveBanners(list) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const banners = (list || [])
    .map((item) => ({
      id: item.id || `banner-${Date.now()}`,
      image: item.image ? safeImage(item.image) : "",
      title: cleanText(item.title, 80),
      titleAr: cleanText(item.titleAr, 80),
      text: cleanText(item.text, 180),
      textAr: cleanText(item.textAr, 180),
      button: cleanText(item.button, 32),
      buttonAr: cleanText(item.buttonAr, 32),
      link: cleanText(item.link, 180),
    }))
    .filter((item) => item.image && (item.title || item.titleAr))
    .slice(0, 8)
  if (!banners.length) return { ok: false, reason: "invalid" }
  const saved = commit({ ...db, banners })
  if (saved.ok) pushAudit(user, "Updated homepage banners")
  return saved
}

export function saveCms(input) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const cms = { ...defaultCms() }
  Object.keys(cms).forEach((key) => {
    cms[key] = cleanText(input[key], 180)
  })
  const saved = commit({ ...db, cms })
  if (saved.ok) pushAudit(user, "Updated page copy")
  return saved
}

export function saveSocial(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const label = cleanText(input.label, 24)
  const href = cleanText(input.href, 180)
  if (!label || !/^https:\/\//.test(href)) return { ok: false, reason: "invalid" }
  let id = editingId || slug(label)
  if (!editingId && db.socials.some((item) => item.id === id)) id = `${id}-${Date.now()}`
  const record = { id, label, href }
  const socials = editingId
    ? db.socials.map((item) => (item.id === editingId ? record : item))
    : [...db.socials, record]
  const saved = commit({ ...db, socials })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} social ${label}`)
  return saved
}

export function deleteSocial(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  return commit({ ...db, socials: db.socials.filter((item) => item.id !== id) })
}

export function saveFaq(input, editingId) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  const question = cleanText(input.question, 120)
  const answer = cleanText(input.answer, 400)
  if (!question || !answer) return { ok: false, reason: "invalid" }
  const record = {
    id: editingId || `faq-${Date.now()}`,
    question,
    answer,
    questionAr: cleanText(input.questionAr, 120) || question,
    answerAr: cleanText(input.answerAr, 400) || answer,
  }
  const faqs = editingId ? db.faqs.map((item) => (item.id === editingId ? record : item)) : [...db.faqs, record]
  const saved = commit({ ...db, faqs })
  if (saved.ok) pushAudit(user, `${editingId ? "Updated" : "Added"} help topic`)
  return saved
}

export function deleteFaq(id) {
  const db = ensure()
  const user = actor(db)
  if (!allowed(user, "settings")) return { ok: false, reason: "forbidden" }
  return commit({ ...db, faqs: db.faqs.filter((item) => item.id !== id) })
}
