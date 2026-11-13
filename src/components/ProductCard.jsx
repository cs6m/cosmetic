import { useState } from "react"
import { Check, Heart, ShoppingBag } from "lucide-react"
import { useShop } from "../context/ShopContext"
import { PriceTag, ProductBadges, Stars } from "./ui"

export default function ProductCard({ product }) {
  const { openProduct, addToCart, toggleWish, wishlist } = useShop()
  const [added, setAdded] = useState(false)
  const wished = wishlist.includes(product.id)

  const onAdd = (event) => {
    event.stopPropagation()
    addToCart(product.id, 1)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 900)
  }

  return (
    <article className="group rounded-2xl bg-ivory p-2.5 shadow-[0_10px_28px_rgba(74,48,40,0.06)] ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(74,48,40,0.1)]">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-sand">
        <button type="button" aria-label={`View ${product.name}`} onClick={() => openProduct(product.id)} className="block h-full w-full">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </button>
        <div className="pointer-events-none absolute left-2 top-2">
          <ProductBadges product={product} limit={2} />
        </div>
        <button
          type="button"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          onClick={() => toggleWish(product.id)}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-espresso shadow-sm transition hover:scale-105"
        >
          <Heart size={15} className={wished ? "fill-cocoa text-cocoa" : ""} />
        </button>
      </div>
      <div className="px-1 pb-1 pt-3">
        <button type="button" onClick={() => openProduct(product.id)} className="block w-full text-left">
          <h3 className="truncate font-medium text-[14px] text-ink">{product.name}</h3>
          <p className="mt-0.5 truncate text-[12px] text-muted">{product.subtitle}</p>
          <div className="mt-2">
            <Stars value={product.rating} count={product.reviews} />
          </div>
        </button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <PriceTag product={product} />
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={onAdd}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition duration-200 hover:scale-105 active:scale-95 ${
              added ? "bg-sage" : "bg-espresso hover:bg-cocoa"
            }`}
          >
            {added ? <Check size={15} /> : <ShoppingBag size={14} />}
          </button>
        </div>
      </div>
    </article>
  )
}
