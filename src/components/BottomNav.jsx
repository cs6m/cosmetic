import { Heart, Home, LayoutGrid, ShoppingBag } from "lucide-react"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"

const items = [
  { id: "home", label: "home", icon: Home },
  { id: "categories", label: "categories", icon: LayoutGrid },
  { id: "wishlist", label: "wishlist", icon: Heart },
  { id: "bag", label: "bag", icon: ShoppingBag },
]

export default function BottomNav() {
  const { view, navigate, wishlist, cartOpen, setCartOpen, cartCount } = useShop()
  const t = useLang()

  return (
    <nav className="relative z-50 shrink-0 border-t border-line bg-white/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.id === "bag" ? cartOpen : view === item.id
          const Icon = item.icon
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                if (item.id === "bag") {
                  setCartOpen(!cartOpen)
                  return
                }
                navigate(item.id)
                document.querySelector(".app-scroll")?.scrollTo({ top: 0, behavior: "smooth" })
              }}
                aria-current={active ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-1 py-1 text-[11px] transition ${
                  active ? "text-espresso" : "text-muted hover:text-cocoa"
                }`}
              >
                <span
                  className={`relative grid h-8 w-11 place-items-center rounded-full transition ${
                    active ? "bg-sand" : ""
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.1 : 1.75}
                    className={item.id === "wishlist" && wishlist.length ? "fill-current" : ""}
                  />
                  {item.id === "bag" && cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-espresso px-1 text-[10px] font-semibold text-white">
                      {cartCount}
                    </span>
                  )}
                </span>
                {t(item.label)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
