import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, Minus, Plus, Share2, ShoppingBag } from "lucide-react"
import { labelCategory, labelSub, textOf, useStorefront } from "../data/adminDb"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"
import { BenefitIcon, PriceTag, ProductBadges } from "./ui"

export default function ProductDetail() {
  const { activeProduct: product, goBack, addToCart, notify, origin, categories, subcategories, language } = useShop()
  const { brands, settings } = useStorefront()
  const t = useLang()
  const [slide, setSlide] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(0)
  const pointer = useRef(null)
  const startX = useRef(0)

  const originName = (() => {
    if (origin.subcategory && origin.category && origin.category !== "All") {
      const group = subcategories?.[origin.category]?.find((item) => item.id === origin.subcategory)
      if (group) return labelSub(group, language)
    }
    if (origin.category && origin.category !== "All") {
      const category = categories?.find((item) => item.id === origin.category)
      if (category) return labelCategory(category, language)
    }
    if (origin.brand) return brands.find((item) => item.id === origin.brand)?.name ?? origin.brand
    if (origin.offer) return textOf(settings.offers?.[origin.offer], language, "title")
    if (origin.view === "wishlist") return t("wishlist")
    if (origin.view === "brands") return t("brandsTitle")
    if (origin.view === "categories") return t("categories")
    if (origin.view === "shop") return t("featured")
    return t("home")
  })()

  const settle = (width, rtl) => {
    if (!pointer.current) return
    const delta = rtl ? -dragRef.current : dragRef.current
    const threshold = Math.min(72, Math.max(36, width * 0.18))
    if (delta > threshold) setSlide((current) => Math.max(0, current - 1))
    else if (delta < -threshold) setSlide((current) => Math.min(product.images.length - 1, current + 1))
    pointer.current = null
    dragRef.current = 0
    setDrag(0)
    setDragging(false)
  }
  useEffect(() => {
    setSlide(0)
    setQty(1)
  }, [product.id])

  const share = async () => {
    const text = `${product.name} — ${product.subtitle}`
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text })
      } else {
        await navigator.clipboard.writeText(text)
        notify(t("copied"))
      }
    } catch {
      /* dismissed share sheet */
    }
  }

  const onAdd = () => {
    addToCart(product.id, qty)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1000)
  }

  return (
    <div className="pb-8">
      <div
        className={`relative mx-4 mt-2 aspect-[5/4] overflow-hidden rounded-[28px] bg-[#f3ebe3] touch-pan-y ${
          product.images.length > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        onPointerDown={(event) => {
          if (product.images.length < 2 || event.button > 0 || event.target.closest("button")) return
          pointer.current = event.pointerId
          startX.current = event.clientX
          dragRef.current = 0
          setDrag(0)
          setDragging(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (pointer.current !== event.pointerId) return
          const next = event.clientX - startX.current
          dragRef.current = next
          setDrag(next)
        }}
        onPointerUp={(event) => {
          if (pointer.current !== event.pointerId) return
          settle(event.currentTarget.clientWidth, event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl")
        }}
        onPointerCancel={(event) => {
          if (pointer.current !== event.pointerId) return
          settle(event.currentTarget.clientWidth, event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl")
        }}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(${-slide * 100}% + ${drag}px))`,
            transition: dragging ? "none" : "transform 320ms ease",
          }}
        >
          {product.images.map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt={index === slide ? product.name : ""}
              draggable={false}
              className="pointer-events-none h-full w-full shrink-0 select-none object-cover"
            />
          ))}
        </div>
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {product.images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`Show image ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === slide ? "w-5 bg-espresso" : "w-1.5 bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">{product.name}</h1>
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("shareProduct")}
              onClick={share}
              className="grid h-9 w-9 place-items-center rounded-full bg-ivory text-espresso shadow-sm"
            >
              <Share2 size={16} />
            </button>
            <ProductBadges product={product} />
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{product.subtitle}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 text-sm ${product.inStock ? "text-sage" : "text-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${product.inStock ? "bg-sage" : "bg-muted"}`} />
            {product.inStock ? t("inStock") : t("soldOut")}
          </span>
        </div>
        <div className="mt-4">
          <PriceTag product={product} large />
        </div>

        <h2 className="mt-6 font-serif text-xl text-ink">{t("productBenefits")}</h2>
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {product.benefits.map((benefit) => (
            <li key={benefit.label} className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-sand text-cocoa">
                <BenefitIcon name={benefit.icon} />
              </span>
              <span className="text-[11px] leading-tight text-cocoa">{benefit.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 items-center rounded-full bg-sand px-1.5">
            <button
              type="button"
              aria-label={t("decrease")}
              onClick={() => setQty((value) => Math.max(1, value - 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-espresso"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              aria-label={t("increase")}
              onClick={() => setQty((value) => Math.min(8, value + 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-espresso"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            type="button"
            disabled={!product.inStock}
            onClick={onAdd}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm text-white transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
              added ? "bg-sage" : "bg-espresso hover:bg-cocoa"
            }`}
          >
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
            {added ? t("added") : t("addToCart")}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => goBack()}
        className="mx-4 mt-6 flex w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-[#f6eee8] px-3 py-2.5 text-start"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-espresso text-white">
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-cocoa">{t("backTo")}</span>
          <span className="block truncate font-serif text-lg leading-tight text-espresso">{originName}</span>
        </span>
      </button>
    </div>
  )
}
