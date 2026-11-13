import { X } from "lucide-react"
import { productsForSection } from "../data/adminDb"
import { sortProducts } from "../data/catalog"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"

const sorts = [
  { id: "featured", label: "sortFeatured" },
  { id: "newest", label: "sortNewest" },
  { id: "price-asc", label: "sortPriceAsc" },
  { id: "price-desc", label: "sortPriceDesc" },
  { id: "rating", label: "sortRating" },
  { id: "reviews", label: "sortReviews" },
  { id: "name-asc", label: "sortNameAsc" },
  { id: "name-desc", label: "sortNameDesc" },
]

export default function FilterSheet() {
  const { setFiltersOpen, sort, setSort, visibleProducts, offer, query, catalogProducts } = useShop()
  const t = useLang()
  const count = offer
    ? sortProducts(
        productsForSection(catalogProducts, offer).filter((product) => {
          const needle = query.trim().toLowerCase()
          return !needle || `${product.name} ${product.subtitle}`.toLowerCase().includes(needle)
        }),
        sort,
      ).length
    : visibleProducts.length

  return (
    <div className="absolute inset-x-0 top-0 bottom-[4.75rem] z-40 flex items-end bg-black/30" onClick={() => setFiltersOpen(false)}>
      <div
        className="sheet-in w-full rounded-t-[28px] bg-ivory p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-2xl text-espresso">{t("sortTitle")}</h3>
          <button type="button" aria-label={t("closeSort")} onClick={() => setFiltersOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sorts.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSort(option.id)}
              className={`rounded-full px-3.5 py-2 text-sm transition ${
                sort === option.id ? "bg-espresso text-white" : "bg-sand text-espresso"
              }`}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="mt-6 h-12 w-full rounded-full bg-espresso text-sm text-white"
        >
          {t("showProducts")} {count} {t("products")}
        </button>
      </div>
    </div>
  )
}
