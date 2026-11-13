import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { checkoutErrors, cleanCheckout, deliveryFee, normalizeGovernorates } from "../checkout"
import { ensure, localizeProduct, recordStorefrontOrder, useDb, useStorefront } from "../data/adminDb"
import { filterProducts, products as catalogProducts, unitPrice } from "../data/catalog"

const ShopContext = createContext(null)
const ORDERS_KEY = "glowora-orders"

function orderLine(id, qty) {
  const product = catalogProducts.find((item) => item.id === id)
  if (!product) return null
  return { id, name: product.name, image: product.images[0], qty, price: product.price }
}

export function sampleOrders() {
  return [
    {
      id: "GL-1048",
      date: "2026-11-02T14:30:00.000Z",
      status: "delivery",
      items: [orderLine("silk-hair-oil", 1), orderLine("repair-hair-mask", 1)],
    },
    {
      id: "GL-1031",
      date: "2026-10-18T09:10:00.000Z",
      status: "completed",
      items: [orderLine("hydrating-face-cream", 1), orderLine("vitamin-c-serum", 2)],
    },
  ]
    .map((order) => ({
      ...order,
      items: order.items.filter(Boolean),
    }))
    .filter((order) => order.items.length)
    .map((order) => ({
      ...order,
      total: Math.round(order.items.reduce((sum, item) => sum + item.price * item.qty, 0)),
    }))
}

function loadOrders() {
  // Opening the admin database first guarantees any old USD orders are converted to IQD
  // before this list is read.
  ensure()
  try {
    const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "null")
    if (Array.isArray(saved) && saved.length) return saved
  } catch {
    /* fall through to the sample log */
  }
  const seeded = sampleOrders()
  saveOrders(seeded)
  return seeded
}

function saveOrders(list) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list))
  } catch {
    /* storage can be unavailable */
  }
}

export function ShopProvider({ children }) {
  const [view, setView] = useState("home")
  const [returnTo, setReturnTo] = useState("home")
  const [activeId, setActiveId] = useState(catalogProducts[0].id)
  const storefront = useStorefront()
  const [cart, setCart] = useState({})
  const [wishlist, setWishlist] = useState(["vitamin-c-serum"])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [subcategory, setSubcategory] = useState(null)
  const [sort, setSort] = useState("featured")
  const [bundleDeal, setBundleDeal] = useState(false)
  const [focusSearch, setFocusSearch] = useState(false)
  const [orderHistory, setOrderHistory] = useState(loadOrders)
  const [origin, setOrigin] = useState({
    view: "home",
    category: "All",
    subcategory: null,
    brand: null,
    offer: null,
  })
  const [navTick, setNavTick] = useState(0)
  const [offer, setOffer] = useState(null)
  const [brand, setBrand] = useState(null)
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("glowora-lang") === "ar" ? "ar" : "en"
    } catch {
      return "en"
    }
  })
  const allProducts = useMemo(() => {
    const source = storefront.allProducts.length ? storefront.allProducts : catalogProducts
    return source.map((product) => localizeProduct(product, language))
  }, [storefront, language])
  const shelf = useMemo(() => {
    const source = storefront.products.length || storefront.allProducts.length ? storefront.products : catalogProducts
    return source.map((product) => localizeProduct(product, language))
  }, [storefront, language])
  const governorates = useMemo(() => normalizeGovernorates(storefront.settings?.governorates), [storefront])
  const searchLookups = useMemo(
    () => ({ brands: storefront.brands, categories: storefront.categories, subcategories: storefront.subcategories }),
    [storefront],
  )
  const toastTimer = useRef(null)
  const historyReady = useRef(false)
  const applyingHistory = useRef(false)
  const indexRef = useRef(0)

  const navKey = `${view}|${activeId}|${category}|${subcategory ?? ""}|${offer ?? ""}|${bundleDeal ? 1 : 0}|${brand ?? ""}`
  const isRootView = view === "home" || view === "categories" || view === "wishlist"

  const notify = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 1700)
  }, [])

  // Live order tracking: when the admin moves one of this shopper's orders along (or the
  // server re-numbers / rejects it), the order list on screen follows immediately.
  const liveDb = useDb()
  useEffect(() => {
    setOrderHistory((list) => {
      let changed = false
      const next = list.map((item) => {
        const live = liveDb.orders.find((order) => order.id === item.id)
        if (live && live.status !== item.status) {
          changed = true
          return { ...item, status: live.status }
        }
        return item
      })
      if (!changed) return list
      saveOrders(next)
      return next
    })
  }, [liveDb.orders])

  useEffect(() => {
    const renamed = (event) =>
      setOrderHistory((list) => {
        const next = list.map((item) => (item.id === event.detail.from ? { ...item, id: event.detail.to } : item))
        saveOrders(next)
        return next
      })
    const failed = (event) => {
      setOrderHistory((list) => {
        const next = list.filter((item) => item.id !== event.detail.id)
        saveOrders(next)
        return next
      })
      notify(language === "ar" ? "تعذّر إرسال الطلب. حاولي مرة أخرى." : "We couldn't place your order. Please try again.")
    }
    window.addEventListener("glowora-order-renamed", renamed)
    window.addEventListener("glowora-order-failed", failed)
    return () => {
      window.removeEventListener("glowora-order-renamed", renamed)
      window.removeEventListener("glowora-order-failed", failed)
    }
  }, [language, notify])

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart],
  )

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({
          product: allProducts.find((item) => item.id === id),
          qty,
        }))
        .filter((item) => item.product),
    [cart, allProducts],
  )

  const subtotal = cartItems.reduce(
    (sum, item) => sum + unitPrice(item.product, bundleDeal) * item.qty,
    0,
  )

  const activeProduct = allProducts.find((item) => item.id === activeId) ?? allProducts[0] ?? catalogProducts[0]
  const wishedProducts = shelf.filter((item) => wishlist.includes(item.id))
  const visibleProducts = filterProducts({ query, category, subcategory, sort, brand, source: shelf, lookups: searchLookups })

  const navigate = (next) => {
    if (next !== "shop") setBrand(null)
    setView(next)
    setOffer(null)
    setMenuOpen(false)
    setCartOpen(false)
    setFiltersOpen(false)
    setNavTick((tick) => tick + 1)
  }

  const openOffer = (id) => {
    setBrand(null)
    setOffer(id)
    setQuery("")
    setCategory("All")
    setSubcategory(null)
    setMenuOpen(false)
    setCartOpen(false)
    setFiltersOpen(false)
    setView("shop")
    setNavTick((tick) => tick + 1)
  }

  const openProduct = (id) => {
    if (view !== "product") {
      setReturnTo(view)
      setOrigin({ view, category, subcategory, brand, offer })
    }
    setActiveId(id)
    setView("product")
    setCartOpen(false)
    setMenuOpen(false)
  }

  const addToCart = (id, qty = 1) => {
    const product = allProducts.find((item) => item.id === id)
    const nextQty = (cart[id] || 0) + qty
    if (product && Number.isFinite(product.stock) && nextQty > product.stock) {
      notify(language === "ar" ? "الكمية المتبقية لا تكفي" : "Not enough stock")
      return
    }
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + qty }))
    notify(`${product?.name ?? "Item"} added to bag`)
  }

  const setQty = (id, qty) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  const toggleWish = (id) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const openBrand = (id) => {
    setBrand(id)
    setBundleDeal(false)
    setCategory("All")
    setSubcategory(null)
    setQuery("")
    setSort("featured")
    navigate("shop")
  }

  const openCategory = (id) => {
    setBrand(null)
    setBundleDeal(false)
    setCategory(id)
    setSubcategory(null)
    setQuery("")
    setSort("featured")
    navigate("shop")
  }

  const openBundles = () => {
    setBrand(null)
    setBundleDeal(true)
    setCategory("Skincare")
    setSubcategory(null)
    setQuery("")
    setSort("featured")
    navigate("shop")
  }

  const openSearch = () => {
    // Searching always starts from the whole catalogue, never from a leftover brand,
    // category or offer filter.
    setBrand(null)
    setOffer(null)
    setBundleDeal(false)
    setCategory("All")
    setSubcategory(null)
    setFocusSearch(true)
    if (view !== "shop") navigate("shop")
  }

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === "en" ? "ar" : "en"
      try {
        localStorage.setItem("glowora-lang", next)
      } catch {
        /* storage can be unavailable */
      }
      return next
    })
  }

  const goBack = () => {
    if ((window.history.state?.index ?? 0) > 0) {
      window.history.back()
      return
    }
    setView(returnTo && returnTo !== view ? returnTo : "home")
    setNavTick((tick) => tick + 1)
  }

  useEffect(() => {
    const onPop = (event) => {
      const state = event.state
      if (!state?.glowora) return
      applyingHistory.current = true
      indexRef.current = state.index ?? 0
      setView(state.view)
      setActiveId(state.activeId)
      setCategory(state.category)
      setSubcategory(state.subcategory ?? null)
      setBrand(state.brand ?? null)
      setOffer(state.offer)
      setBundleDeal(state.bundleDeal)
      setSort(state.sort)
      setQuery(state.query ?? "")
      setReturnTo(state.returnTo || "home")
      setOrigin(
        state.origin ?? {
          view: state.returnTo || "home",
          category: state.category,
          subcategory: state.subcategory ?? null,
          brand: state.brand ?? null,
          offer: state.offer,
        },
      )
      setMenuOpen(false)
      setCartOpen(false)
      setFiltersOpen(false)
      setNavTick((tick) => tick + 1)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  useEffect(() => {
    if (applyingHistory.current) {
      applyingHistory.current = false
      indexRef.current = window.history.state?.index ?? indexRef.current
      historyReady.current = true
      return
    }
    const state = {
      glowora: true,
      navKey,
      view,
      activeId,
      category,
      subcategory,
      brand,
      offer,
      bundleDeal,
      sort,
      query,
      returnTo,
      origin,
    }
    if (window.history.state?.glowora && window.history.state.navKey === navKey) {
      indexRef.current = window.history.state.index ?? 0
      historyReady.current = true
      return
    }
    if (!historyReady.current) {
      indexRef.current = 0
      window.history.replaceState({ ...state, index: 0 }, "")
      historyReady.current = true
      return
    }
    indexRef.current += 1
    window.history.pushState({ ...state, index: indexRef.current }, "")
  }, [navKey])

  const placeOrder = (form) => {
    if (!cartCount) return { ok: false, reason: "empty" }
    if (Object.keys(checkoutErrors(form || {}, governorates)).length) return { ok: false, reason: "invalid" }
    const customer = cleanCheckout(form)
    const shipping = deliveryFee(customer.city, governorates, subtotal)
    const total = Math.round(subtotal + shipping)
    const taken = orderHistory.map((item) => Number(String(item.id).replace(/\D/g, ""))).filter((value) => value > 0)
    const order = {
      id: `GL-${Math.max(1049, ...taken, 0) + 1}`,
      date: new Date().toISOString(),
      status: "pending",
      customerId: "guest-store",
      source: "storefront",
      customer,
      payment: "cod",
      subtotal: Math.round(subtotal),
      shipping,
      items: cartItems.map(({ product, qty }) => {
        const raw = storefront.allProducts.find((item) => item.id === product.id)
        return {
          id: product.id,
          name: raw?.name || product.name,
          nameAr: raw?.nameAr || "",
          image: product.images[0],
          qty,
          price: unitPrice(product, bundleDeal),
        }
      }),
      total,
    }
    const next = [order, ...orderHistory]
    setOrderHistory(next)
    saveOrders(next)
    recordStorefrontOrder(order)
    setCart({})
    return { ok: true, id: order.id }
  }

  const value = {
    view,
    activeProduct,
    cartCount,
    cartItems,
    subtotal,
    wishlist,
    wishedProducts,
    visibleProducts,
    cartOpen,
    setCartOpen,
    menuOpen,
    setMenuOpen,
    filtersOpen,
    setFiltersOpen,
    toast,
    query,
    setQuery,
    category,
    setCategory,
    subcategory,
    setSubcategory,
    sort,
    setSort,
    bundleDeal,
    setBundleDeal,
    offer,
    setOffer,
    brand,
    setBrand,
    openBrand,
    openOffer,
    focusSearch,
    setFocusSearch,
    orders: orderHistory.length,
    orderHistory,
    origin,
    navTick,
    isRootView,
    language,
    toggleLanguage,
    navigate,
    openProduct,
    goBack,
    addToCart,
    setQty,
    toggleWish,
    openCategory,
    openBundles,
    openSearch,
    placeOrder,
    notify,
    catalogProducts: shelf,
    governorates,
    searchLookups,
    categories: storefront.categories,
    subcategories: storefront.subcategories,
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const context = useContext(ShopContext)
  if (!context) throw new Error("useShop must be used within ShopProvider")
  return context
}
