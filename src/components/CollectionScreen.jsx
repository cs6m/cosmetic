import { useEffect, useRef } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { cmsText, labelCategory, labelSub, productsForSection, textOf, useStorefront } from "../data/adminDb"
import { sortProducts } from "../data/catalog"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"
import ProductCard from "./ProductCard"

export default function CollectionScreen() {
  const {
    query,
    setQuery,
    category,
    setCategory,
    subcategory,
    setSubcategory,
    visibleProducts,
    bundleDeal,
    setBundleDeal,
    focusSearch,
    setFocusSearch,
    setFiltersOpen,
    offer,
    brand,
    sort,
    catalogProducts,
    categories,
    subcategories,
    language,
  } = useShop()
  const { settings, brands, cms } = useStorefront()
  const t = useLang()
  const inputRef = useRef(null)

  useEffect(() => {
    if (focusSearch) {
      inputRef.current?.focus()
      setFocusSearch(false)
    }
  }, [focusSearch, setFocusSearch])

  // While the shopper is typing, the search covers the whole catalogue; any open brand,
  // category or offer view steps aside so no matching product can be hidden by it.
  const searching = query.trim().length > 0
  const activeBrand = !searching ? brands.find((item) => item.id === brand) ?? null : null
  const showEditorial = !searching && !offer && !activeBrand && category === "All"
  const groups = !searching && !offer && !activeBrand && category !== "All" ? subcategories?.[category] ?? [] : []
  const offerList = offer && !searching ? productsForSection(catalogProducts, offer) : null
  const currentCategory = !searching ? categories?.find((item) => item.id === category) : null
  const shown = offerList ? sortProducts(offerList, sort) : visibleProducts
  const showOffer = Boolean(offer) && !searching

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 pt-4">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-full bg-ivory px-4 shadow-[0_8px_20px_rgba(74,48,40,0.05)]">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" aria-label={t("clearSearch")} onClick={() => setQuery("")}>
              <X size={14} className="text-muted" />
            </button>
          )}
        </label>
        <button
          type="button"
          aria-label={t("sortTitle")}
          onClick={() => setFiltersOpen(true)}
          className="grid h-12 w-12 place-items-center rounded-full bg-ivory text-espresso shadow-[0_8px_20px_rgba(74,48,40,0.05)]"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {showEditorial && (
        <>
          <header className="px-5 pb-2 pt-6">
            <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.03em] text-ink">
              {cmsText(cms, language, "exploreTitle")}
            </h1>
            <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
              {cmsText(cms, language, "exploreText")}
            </p>
          </header>
        </>
      )}

      {bundleDeal && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-[#f6e7df] px-4 py-3 text-sm text-espresso">
          <span>{cmsText(cms, language, "bundleText")}</span>
          <button type="button" aria-label={t("dismissOffer")} onClick={() => setBundleDeal(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 flex items-end justify-between px-5">
        <div>
          <h2 className="font-serif text-[26px] text-ink">
            {searching ? t("searchResults") : showOffer ? textOf(settings.offers?.[offer], language, "title") : activeBrand ? activeBrand.name : currentCategory ? labelCategory(currentCategory, language) : cmsText(cms, language, "featuredTitle")}
          </h2>
          {activeBrand && !showOffer && (
            <p className="mt-1 max-w-[28ch] text-sm text-muted">{textOf(activeBrand, language, "description")}</p>
          )}
        </div>
        <span className="text-xs text-muted">{shown.length} {t("items")}</span>
      </div>

      {groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 px-4">
          {[{ id: null, label: "subAll" }, ...groups].map((group) => {
            const active = (subcategory ?? null) === group.id
            return (
              <button
                key={group.id ?? "all"}
                type="button"
                onClick={() => setSubcategory(group.id)}
                className={`rounded-full px-3.5 py-2 text-sm ${active ? "bg-espresso text-white" : "bg-ivory text-espresso shadow-[0_8px_20px_rgba(74,48,40,0.05)]"}`}
              >
                {group.id ? labelSub(group, language) : t(group.label)}
              </button>
            )
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="mx-4 mt-4 rounded-[24px] bg-ivory px-6 py-10 text-center">
          <p className="font-serif text-2xl text-espresso">{t("nothingMatches")}</p>
          <p className="mt-2 text-sm text-muted">{t("nothingMatchesLead")}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setCategory("All")
              setSubcategory(null)
            }}
            className="mt-4 rounded-full bg-espresso px-4 py-2 text-sm text-white"
          >
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
