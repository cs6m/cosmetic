import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { ShopProvider, useShop } from "./context/ShopContext"

const AdminApp = lazy(() => import("./admin/AdminApp"))

function isAdminRoute() {
  return window.location.hash.startsWith("#/admin")
}
import BottomNav from "./components/BottomNav"
import CartSheet from "./components/CartSheet"
import CheckoutScreen from "./components/CheckoutScreen"
import CategoriesScreen from "./components/CategoriesScreen"
import CollectionScreen from "./components/CollectionScreen"
import FilterSheet from "./components/FilterSheet"
import Header from "./components/Header"
import HomeScreen from "./components/HomeScreen"
import { BrandsScreen, HelpScreen, OrdersScreen } from "./components/MenuPages"
import MenuSheet from "./components/MenuSheet"
import ProductDetail from "./components/ProductDetail"
import WishlistScreen from "./components/WishlistScreen"
import { Toast } from "./components/ui"

function Shell() {
  const shop = useShop()
  const scroller = useRef(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [shop.view, shop.activeProduct.id, shop.navTick])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return
      shop.setCartOpen(false)
      shop.setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shop])

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fbf6f0,#e6d8cb)] sm:flex sm:items-center sm:justify-center sm:py-6">
      <div
        dir={shop.language === "ar" ? "rtl" : "ltr"}
        lang={shop.language}
        className={`relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-cream sm:h-[min(940px,calc(100dvh-3rem))] sm:rounded-[32px] sm:shadow-[0_30px_80px_rgba(74,50,40,0.18)] sm:ring-1 sm:ring-white/80 ${shop.language === "ar" ? "font-[Cairo,sans-serif]" : ""}`}
      >
        <Header />
        <div ref={scroller} className="app-scroll min-h-0 flex-1 overflow-y-auto">
          <div key={shop.view + (shop.view === "product" ? shop.activeProduct.id : "")} className="screen-in">
            {shop.view === "home" && <HomeScreen />}
            {shop.view === "shop" && <CollectionScreen />}
            {shop.view === "categories" && <CategoriesScreen />}
            {shop.view === "product" && <ProductDetail />}
            {shop.view === "wishlist" && <WishlistScreen />}
            {shop.view === "brands" && <BrandsScreen />}
            {shop.view === "orders" && <OrdersScreen />}
            {shop.view === "checkout" && <CheckoutScreen />}
            {shop.view === "help" && <HelpScreen />}
          </div>
        </div>
        <BottomNav />
        {shop.cartOpen && <CartSheet />}
        {shop.menuOpen && <MenuSheet />}
        {shop.filtersOpen && <FilterSheet />}
        <Toast message={shop.toast} />
      </div>
    </div>
  )
}

export default function App() {
  const [admin, setAdmin] = useState(isAdminRoute)

  useEffect(() => {
    const sync = () => setAdmin(isAdminRoute())
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  if (admin) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-[#100e0c]" />}>
        <AdminApp />
      </Suspense>
    )
  }

  return (
    <ShopProvider>
      <Shell />
    </ShopProvider>
  )
}
