import { Heart } from "lucide-react"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"
import ProductCard from "./ProductCard"

export default function WishlistScreen() {
  const { wishedProducts, navigate } = useShop()
  const t = useLang()

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("wishlist")}</h1>
      <p className="mt-2 text-sm text-muted">
        {wishedProducts.length
          ? `${wishedProducts.length} ${t("wishLeadSaved")}`
          : t("wishLeadEmpty")}
      </p>
      {wishedProducts.length === 0 ? (
        <div className="mt-6 rounded-[24px] bg-ivory px-6 py-12 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sand text-cocoa">
            <Heart size={22} />
          </span>
          <p className="mt-4 font-serif text-2xl text-espresso">Your list is quiet</p>
          <button
            type="button"
            onClick={() => navigate("shop")}
            className="mt-4 rounded-full bg-espresso px-4 py-2.5 text-sm text-white"
          >
            Browse the collection
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {wishedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
