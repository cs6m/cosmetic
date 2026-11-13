import { ChevronLeft, ChevronRight, Heart, Menu, Search, ShoppingBag } from "lucide-react"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"
import { IconButton, Logo } from "./ui"

export default function Header() {
  const { isRootView, setMenuOpen, setCartOpen, openSearch, navigate, cartCount, wishlist, goBack, language, toggleLanguage } = useShop()
  const t = useLang()
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft

  return (
    <header
      dir={language === "ar" ? "rtl" : "ltr"}
      className="z-30 grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 bg-cream/95 px-4 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isRootView ? t("openMenu") : t("goBack")}
          onClick={() => (isRootView ? setMenuOpen(true) : goBack())}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-espresso shadow-[0_6px_16px_rgba(92,58,50,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          <span className="relative block h-[18px] w-[18px]">
            <Menu
              size={18}
              className={`absolute inset-0 transition duration-200 ${isRootView ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
            />
            <BackIcon
              size={18}
              className={`absolute inset-0 transition duration-200 ${isRootView ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}
            />
          </span>
        </button>
        <button
          type="button"
          aria-label={t("language")}
          onClick={toggleLanguage}
          className="grid h-10 w-10 place-items-center rounded-full bg-white font-serif text-[15px] text-espresso shadow-[0_6px_16px_rgba(92,58,50,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          {t("languageMark")}
        </button>
      </div>
      <div className="flex justify-center">
        <Logo compact />
      </div>
      <div className="flex items-center gap-2">
        <IconButton label={t("search")} onClick={openSearch}>
          <Search size={18} />
        </IconButton>
        <span className="relative">
          <IconButton label={t("wishlist")} onClick={() => navigate("wishlist")}>
            <Heart size={18} className={wishlist.length ? "fill-cocoa text-cocoa" : ""} />
          </IconButton>
          {wishlist.length > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sand px-1 text-[10px] font-semibold text-espresso">
              {wishlist.length}
            </span>
          )}
        </span>
        <span className="relative">
          <IconButton label={t("openBag")} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} />
          </IconButton>
          {cartCount > 0 && (
            <span
              key={cartCount}
              className="badge-pop pointer-events-none absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-espresso px-1 text-[10px] font-semibold text-ivory"
            >
              {cartCount}
            </span>
          )}
        </span>
      </div>
    </header>
  )
}
