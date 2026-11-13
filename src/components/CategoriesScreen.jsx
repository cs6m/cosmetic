import { ArrowRight } from "lucide-react"
import { labelCategory, useStorefront } from "../data/adminDb"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"

export default function CategoriesScreen() {
  const { openCategory, language } = useShop()
  const { categories, products } = useStorefront()
  const t = useLang()

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("categories")}</h1>
      <p className="mt-2 text-sm text-muted">{t("categoriesLead")}</p>
      <div className="mt-5 flex flex-col gap-3">
        {categories.map((category) => {
          const count = products.filter((product) => product.category === category.id).length
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => openCategory(category.id)}
              className="group relative h-36 overflow-hidden rounded-[24px] text-left"
            >
              <img
                src={category.image}
                alt=""
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              <span className="absolute inset-y-0 left-0 flex flex-col justify-end p-4 text-white">
                <span className="font-serif text-3xl leading-none">{labelCategory(category, language)}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-white/85">
                  {count} {t("products")} <ArrowRight size={13} className="rtl:rotate-180" />
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
