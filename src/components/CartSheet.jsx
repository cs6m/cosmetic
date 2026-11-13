import { Minus, Plus, X } from "lucide-react"
import { cmsText, useStorefront } from "../data/adminDb"
import { formatPrice, unitPrice } from "../data/catalog"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"

export default function CartSheet() {
  const { cartItems, subtotal, setQty, setCartOpen, bundleDeal, navigate, language } = useShop()
  const { cms } = useStorefront()
  const t = useLang()

  return (
    <div className="absolute inset-x-0 top-0 bottom-[4.75rem] z-40 flex items-end bg-black/35" onClick={() => setCartOpen(false)}>
      <div
        className="sheet-in flex max-h-[82%] w-full flex-col rounded-t-[28px] bg-ivory"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="font-serif text-2xl text-espresso">{t("yourBag")}</h2>
          <button type="button" aria-label={t("closeBag")} onClick={() => setCartOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="font-serif text-2xl text-espresso">{t("bagEmpty")}</p>
            <p className="mt-2 text-sm text-muted">{t("bagEmptyLead")}</p>
            <button
              type="button"
              onClick={() => {
                setCartOpen(false)
                navigate("shop")
              }}
              className="mt-5 h-12 w-full rounded-full bg-espresso text-sm text-white"
            >
              {t("exploreCollection")}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-2">
              {cartItems.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3">
                  <img src={product.images[0]} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                    <p className="text-sm text-cocoa">{formatPrice(unitPrice(product, bundleDeal), language)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" aria-label={t("decrease")} onClick={() => setQty(product.id, qty - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-sand">
                        <Minus size={12} />
                      </button>
                      <span className="w-4 text-center text-sm">{qty}</span>
                      <button type="button" aria-label={t("increase")} onClick={() => setQty(product.id, qty + 1)} className="grid h-7 w-7 place-items-center rounded-full bg-sand">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-6 pt-3">
              {bundleDeal && <p className="mb-2 text-xs text-cocoa">{cmsText(cms, language, "bundleText")}</p>}
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted">{t("subtotal")}</span>
                <span className="font-semibold text-ink">{formatPrice(subtotal, language)}</span>
              </div>
              <button type="button" onClick={() => navigate("checkout")} className="h-12 w-full rounded-full bg-espresso text-sm text-white">
                {t("checkout")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
