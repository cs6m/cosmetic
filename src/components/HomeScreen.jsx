import { useEffect, useState } from "react"
import { ArrowRight, BadgeCheck, Heart, Leaf } from "lucide-react"
import { cmsText, labelCategory, productsForSection, textOf, useStorefront } from "../data/adminDb"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"
import ProductCard from "./ProductCard"


const trust = [
  { icon: Leaf, label: "blackFriday", target: "black-friday" },
  { icon: BadgeCheck, label: "newProducts", target: "new-products" },
  { icon: Heart, label: "weeklyOffers", target: "weekly-offers" },
]

const offers = [
  {
    id: "black-friday",
    sectionBg: "bg-[#4d342e]",
    tone: "bg-[#4d342e] text-ivory",
    kickerTone: "text-white/70",
    textTone: "text-white/75",
    button: "bg-ivory text-espresso",
  },
  {
    id: "new-products",
    sectionBg: "bg-[#f6eee6]",
    tone: "bg-[#f6eee6] text-espresso",
    kickerTone: "text-cocoa/80",
    textTone: "text-muted",
    button: "bg-espresso text-white",
  },
  {
    id: "weekly-offers",
    sectionBg: "bg-[#5c3a32]",
    tone: "bg-[#5c3a32] text-ivory",
    kickerTone: "text-white/70",
    textTone: "text-white/75",
    button: "bg-ivory text-espresso",
  },
]

function offerProducts(products) {
  return {
    "black-friday": productsForSection(products, "black-friday").slice(0, 8),
    "new-products": productsForSection(products, "new-products").slice(0, 8),
    "weekly-offers": productsForSection(products, "weekly-offers").slice(0, 8),
  }
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function openBanner(link) {
  if (!link) return
  if (/^https:\/\//.test(link)) {
    window.open(link, "_blank", "noopener")
    return
  }
  document.getElementById(link)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function BannerCarousel({ banners, language }) {
  const [index, setIndex] = useState(0)
  const rtl = language === "ar"
  useEffect(() => {
    if (banners.length < 2) return undefined
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % banners.length), 4800)
    return () => window.clearInterval(timer)
  }, [banners.length, language])

  if (!banners.length) return null
  const place = (itemIndex) => {
    if (itemIndex === index) return "translate-x-0"
    const previous = (index - 1 + banners.length) % banners.length
    if (itemIndex === previous) return rtl ? "translate-x-full" : "-translate-x-full"
    return rtl ? "-translate-x-full" : "translate-x-full"
  }

  return (
    <section className="relative min-h-[440px] overflow-hidden rounded-3xl">
      {banners.map((banner, itemIndex) => (
        <div key={banner.id} className={`absolute inset-0 transition-transform duration-700 ease-in-out ${place(itemIndex)}`}>
          <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/45 to-black/75" />
          <div className="relative z-10 flex min-h-[440px] flex-col px-6 pb-24 pt-8 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
            <h1 className="max-w-[12ch] font-serif text-[46px] font-medium leading-[0.98] tracking-[-0.03em]">{textOf(banner, language, "title")}</h1>
            <p className="mt-4 max-w-[24ch] text-sm leading-relaxed text-white/85">{textOf(banner, language, "text")}</p>
            {textOf(banner, language, "button") && (
              <button type="button" onClick={() => openBanner(banner.link)} className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#3c2a26]/85 px-5 py-3 text-sm text-white shadow-lg backdrop-blur-sm transition hover:bg-[#2d201c]">
                {textOf(banner, language, "button")} <ArrowRight size={16} className="rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      ))}
      {banners.length > 1 && (
        <div className="absolute bottom-16 z-10 flex w-full justify-center gap-1.5">
          {banners.map((banner, itemIndex) => (
            <button key={banner.id} type="button" aria-label={textOf(banner, language, "title")} onClick={() => setIndex(itemIndex)} className={`h-1.5 rounded-full ${itemIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomeScreen() {
  const { openCategory, openOffer, navigate, language, catalogProducts: products } = useShop()
  const { categories, settings, cms, banners } = useStorefront()
  const t = useLang()
  const featured = products.filter((product) => (product.badgeItems || []).length > 0).slice(0, 4)
  const picks = featured.length ? featured : products.slice(0, 4)
  const shelves = offerProducts(products)
  const copyOf = (id) => textOf(settings.offers?.[id], language, "title")

  return (
    <div>
      <BannerCarousel banners={banners} language={language} />

      <section className="relative z-10 mx-4 -mt-8 grid grid-cols-3 overflow-hidden rounded-3xl bg-ivory px-2 py-3 shadow-[0_12px_30px_rgba(74,48,40,0.06)]">
        {trust.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => scrollToSection(item.target)}
            className="flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition hover:bg-sand/70 active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-cocoa">
              <item.icon size={18} strokeWidth={1.75} />
            </span>
            <span className="text-[11px] leading-tight text-cocoa">{copyOf(item.target)}</span>
          </button>
        ))}
      </section>

      <section id="shop-categories" className="scroll-mt-4 overflow-hidden rounded-3xl bg-[#faf4ee] px-4 py-6">
        <SectionTitle title={cmsText(cms, language, "shopTitle")} action={t("viewAll")} onAction={() => navigate("categories")} />
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => openCategory(category.id)}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl text-left"
            >
              <img
                src={category.image}
                alt=""
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-full bg-white/92 px-2.5 py-1.5 text-[11px] font-medium text-espresso shadow-sm">
                {labelCategory(category, language)}
                <ArrowRight size={12} className="rtl:rotate-180" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {offers.map((offer) => (
        <OfferShelf key={offer.id} offer={offer} items={shelves[offer.id]} onViewAll={() => openOffer(offer.id)} />
      ))}

      <section className="overflow-hidden rounded-3xl bg-[#f8f1ea] px-4 py-6">
        <SectionTitle title={cmsText(cms, language, "featuredTitle")} action={t("viewAll")} onAction={() => navigate("shop")} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {picks.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}

function OfferShelf({ offer, items, onViewAll }) {
  const t = useLang()
  const { language } = useShop()
  const { settings } = useStorefront()
  const custom = settings.offers?.[offer.id] || {}
  return (
    <section id={offer.id} className={`scroll-mt-4 overflow-hidden rounded-3xl ${offer.sectionBg}`}>
      <div
        className={`relative flex min-h-[168px] w-full flex-col justify-center overflow-hidden px-5 py-5 ${custom.image ? "text-ivory" : offer.tone}`}
        style={custom.image ? { backgroundImage: `linear-gradient(rgba(20,12,10,0.45), rgba(20,12,10,0.55)), url(${custom.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <p className={`text-[11px] uppercase tracking-[0.16em] ${custom.image ? "text-white/75" : offer.kickerTone}`}>{textOf(custom, language, "kicker")}</p>
        <h2 className="mt-1 font-serif text-[28px] leading-[1.05]">{textOf(custom, language, "title")}</h2>
        <p className={`mt-1 text-xs leading-relaxed ${custom.image ? "text-white/80" : offer.textTone}`}>{textOf(custom, language, "text")}</p>
        <button
          type="button"
          onClick={onViewAll}
          className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition hover:opacity-90 ${offer.button}`}
        >
          {t("viewAll")} <ArrowRight size={13} className="rtl:rotate-180" />
        </button>
      </div>
      <div
        id={`${offer.id}-products`}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((product) => (
          <div key={product.id} className="w-[68%] shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionTitle({ title, action, onAction }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-serif text-[26px] leading-none text-ink">{title}</h2>
      <button type="button" onClick={onAction} className="shrink-0 text-xs text-cocoa">
        {action} →
      </button>
    </div>
  )
}
