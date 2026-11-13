import { Leaf, Sparkles, Star } from "lucide-react"
import { cmsText, useStorefront } from "../data/adminDb"
import { formatPrice, strikePrice, unitPrice } from "../data/catalog"
import { ICONS } from "../icons"
import { useShop } from "../context/ShopContext"

export function Logo({ light = false, compact = false }) {
  const { cms } = useStorefront()
  const { language } = useShop()
  return (
    <div className={`flex flex-col items-center ${light ? "text-white" : "text-espresso"}`}>
      <Leaf size={compact ? 14 : 16} strokeWidth={1.75} />
      <span className="font-serif text-[22px] leading-none tracking-[-0.03em]">Glowora</span>
      {!compact && (
        <span
          className={`mt-1 text-[9px] uppercase tracking-[0.22em] ${light ? "text-white/75" : "text-muted"}`}
        >
          {cmsText(cms, language, "tagline")}
        </span>
      )}
    </div>
  )
}

export function IconButton({ children, label, onClick, light = false, className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full transition duration-200 hover:-translate-y-0.5 active:scale-95 ${
        light
          ? "bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
          : "bg-white text-espresso shadow-[0_6px_16px_rgba(92,58,50,0.08)] hover:shadow-[0_10px_22px_rgba(92,58,50,0.12)]"
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Stars({ value = 5, count }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <span className="inline-flex gap-0.5 text-gold">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={11}
            className={index < Math.round(value) ? "fill-gold text-gold" : "fill-sand text-sand"}
          />
        ))}
      </span>
      {count != null && <span>({count})</span>}
    </span>
  )
}

export function PriceTag({ product, large = false }) {
  const { bundleDeal, language } = useShop()
  const price = unitPrice(product, bundleDeal)
  const strike = strikePrice(product, bundleDeal)

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={large ? "text-[28px] font-semibold tracking-tight text-ink" : "text-[15px] font-semibold text-ink"}>
        {formatPrice(price, language)}
      </span>
      {strike && (
        <span className="text-xs text-muted line-through">{formatPrice(strike, language)}</span>
      )}
    </span>
  )
}

const TONES = {
  green: "bg-[#e5f0e4] text-[#2f6b45]",
  rose: "bg-[#f6ddd4] text-[#8a4638]",
  nude: "bg-[#f6e7df] text-[#7a4b40]",
}

export function Badge({ label, tone }) {
  if (!label) return null
  const color =
    TONES[tone] ||
    (label === "Sale" || label === "30% Off" ? TONES.rose : label === "New" ? TONES.green : TONES.nude)
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-medium tracking-wide ${color}`}>
      {label}
    </span>
  )
}

export function ProductBadges({ product, limit }) {
  const items = product.badgeItems?.length
    ? product.badgeItems
    : product.badge
      ? [{ id: product.badge, label: product.badge }]
      : []
  const shown = limit ? items.slice(0, limit) : items
  if (!shown.length) return null
  return (
    <span className="flex flex-col items-start gap-1">
      {shown.map((item) => (
        <Badge key={item.id || item.label} label={item.label} tone={item.tone} />
      ))}
    </span>
  )
}

export function BenefitIcon({ name, size = 18 }) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon size={size} strokeWidth={1.75} />
}

export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center px-6">
      <div className="toast-in rounded-full bg-espresso px-4 py-2 text-sm text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}
