import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  LayoutGrid,
  Leaf,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Stamp,
  Users,
  X,
} from "lucide-react"
import { login, logout, permissionsOf, sessionUser, useDb } from "../data/adminDb"
import { translate } from "./copy"
import { AdminContext } from "./context"
import Brands from "./pages/Brands"
import Categories from "./pages/Categories"
import Content from "./pages/Content"
import Orders from "./pages/Orders"
import Overview from "./pages/Overview"
import People from "./pages/People"
import Products from "./pages/Products"
import Reviews from "./pages/Reviews"
import SettingsPage from "./pages/Settings"

const NAV = [
  ["overview", LayoutDashboard],
  ["orders", Package],
  ["products", Sparkles],
  ["categories", LayoutGrid],
  ["brands", Stamp],
  ["reviews", MessageSquare],
  ["content", Leaf],
  ["people", Users],
  ["settings", Settings],
]

function readPage() {
  const raw = window.location.hash.replace(/^#\/admin\/?/, "").split("?")[0].split("/")[0]
  return NAV.some(([id]) => id === raw) ? raw : "overview"
}

function canOpen(page, can) {
  if (page === "people") return can("customers") || can("team")
  if (page === "brands") return can("brands") || can("products")
  if (page === "content") return can("settings")
  return can(page)
}

export default function AdminApp() {
  const db = useDb()
  const [authed, setAuthed] = useState(() => Boolean(sessionUser(db)))
  const user = authed ? sessionUser(db) : null
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("glowora-admin-lang") === "en" ? "en" : "ar"
    } catch {
      return "ar"
    }
  })
  const [page, setPage] = useState(readPage)
  const [navOpen, setNavOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [range, setRange] = useState("7d")
  const [customRange, setCustomRange] = useState({ from: "", to: "" })

  useEffect(() => {
    const previous = document.title
    document.title = "Glowora Admin"
    const sync = () => setPage(readPage())
    window.addEventListener("hashchange", sync)
    return () => {
      document.title = previous
      window.removeEventListener("hashchange", sync)
    }
  }, [])

  // Anything the database refuses (permissions, validation, network) is shown to the admin.
  useEffect(() => {
    const show = (event) => notify(event.detail?.message || "Sync error")
    window.addEventListener("glowora-sync-error", show)
    return () => window.removeEventListener("glowora-sync-error", show)
  }, [])

  const t = (key) => translate(language, key)
  const can = (permission) => (user ? permissionsOf(user).includes(permission) : false)
  const notify = (message) => {
    setToast(message)
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(""), 2200)
  }

  const open = (next) => {
    window.location.hash = `/admin/${next}`
    setPage(next)
    setNavOpen(false)
  }

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === "ar" ? "en" : "ar"
      try {
        localStorage.setItem("glowora-admin-lang", next)
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const value = useMemo(
    () => ({ db, user, t, language, can, notify, open, range, setRange, customRange, setCustomRange }),
    [db, user, language, range, customRange],
  )

  const leave = () => {
    window.location.hash = ""
  }

  if (!user) {
    return (
      <Login
        language={language}
        t={t}
        onLanguage={toggleLanguage}
        onSuccess={() => setAuthed(true)}
        onLeave={leave}
      />
    )
  }

  const visibleNav = NAV.filter(([id]) => canOpen(id, can))
  const allowed = canOpen(page, can)
  const View = {
    overview: Overview,
    orders: Orders,
    products: Products,
    categories: Categories,
    brands: Brands,
    reviews: Reviews,
    content: Content,
    people: People,
    settings: SettingsPage,
  }[page]

  return (
    <AdminContext.Provider value={value}>
      <div dir={language === "ar" ? "rtl" : "ltr"} className={`min-h-dvh bg-[#100e0c] text-[#f6f1eb] ${language === "ar" ? "font-[Cairo,sans-serif]" : ""}`}>
        <div className="mx-auto flex min-h-dvh max-w-[1500px]">
          <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-e border-[#2c241f] px-4 py-5 lg:flex">
            <Brand />
            <Nav items={visibleNav} current={page} open={open} t={t} />
            <UserFoot user={user} t={t} onLeave={leave} onLogout={() => { logout(); setAuthed(false) }} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#2c241f] bg-[#100e0c]/95 px-4 py-3 backdrop-blur">
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-[#1b1613] lg:hidden" onClick={() => setNavOpen(true)} aria-label="Menu">
                <Menu size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-xl">{t(page)}</p>
                <p className="truncate text-[11px] text-[#b5a194]">{db.settings.storeName}</p>
              </div>
              <button type="button" onClick={toggleLanguage} className="rounded-full border border-[#3a2d26] px-3 py-1.5 text-xs text-[#e7d3c4]">
                {t("language")}
              </button>
              <button type="button" className="hidden text-xs text-[#b5a194] sm:inline" onClick={() => { logout(); setAuthed(false) }}>
                {t("signOut")}
              </button>
            </header>
            <main className="admin-scroll flex-1 px-4 py-5 lg:px-8">
              {allowed && View ? <View /> : <Denied t={t} />}
            </main>
          </div>
        </div>
        {navOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setNavOpen(false)}>
            <aside
              className="flex h-full w-[min(84vw,300px)] flex-col border-e border-[#2c241f] bg-[#100e0c] px-4 py-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <Brand />
                <button type="button" onClick={() => setNavOpen(false)} aria-label={t("close")}>
                  <X size={18} />
                </button>
              </div>
              <Nav items={visibleNav} current={page} open={open} t={t} />
              <UserFoot user={user} t={t} onLeave={leave} onLogout={() => { logout(); setAuthed(false); setNavOpen(false) }} />
            </aside>
          </div>
        )}
        {toast && (
          <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="rounded-full bg-[#e7d3c4] px-4 py-2 text-sm text-[#2a1c16] shadow-lg">{toast}</div>
          </div>
        )}
      </div>
    </AdminContext.Provider>
  )
}

function Brand() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2a211c] text-[#e4c99a]">
        <Leaf size={18} />
      </span>
      <span>
        <span className="block font-serif text-2xl leading-none">Glowora</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#b5a194]">Admin</span>
      </span>
    </div>
  )
}

function Nav({ items, current, open, t }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(([id, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => open(id)}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm ${current === id ? "bg-[#2a211c] text-[#f6f1eb]" : "text-[#b5a194] hover:bg-[#1b1613] hover:text-[#f6f1eb]"}`}
        >
          <Icon size={16} />
          {t(id)}
        </button>
      ))}
    </nav>
  )
}

function UserFoot({ user, t, onLeave, onLogout }) {
  return (
    <div className="mt-4 border-t border-[#2c241f] pt-4">
      <p className="truncate text-sm">{user.name}</p>
      <p className="truncate text-xs text-[#b5a194]">{user.email}</p>
      <div className="mt-3 flex gap-3 text-xs">
        <button type="button" onClick={onLogout} className="inline-flex items-center gap-1 text-[#e7d3c4]">
          <LogOut size={13} /> {t("signOut")}
        </button>
        <button type="button" onClick={onLeave} className="text-[#b5a194]">
          {t("backToStore")}
        </button>
      </div>
    </div>
  )
}

function Denied({ t }) {
  return (
    <div className="rounded-3xl border border-[#3a2d26] bg-[#1b1613] px-6 py-16 text-center">
      <h1 className="font-serif text-3xl">{t("accessDenied")}</h1>
      <p className="mt-2 text-sm text-[#b5a194]">{t("accessLead")}</p>
    </div>
  )
}

function Login({ language, t, onLanguage, onSuccess, onLeave }) {
  const [email, setEmail] = useState("admin@glowora.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    const result = await login(email, password)
    setBusy(false)
    if (!result.ok) {
      setError(t(result.reason === "customer" ? "customerBlocked" : result.reason === "locked" ? "locked" : "invalid"))
      return
    }
    onSuccess()
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={`flex min-h-dvh items-center justify-center bg-[#100e0c] px-4 text-[#f6f1eb] ${language === "ar" ? "font-[Cairo,sans-serif]" : ""}`}>
      <form onSubmit={submit} className="w-full max-w-md rounded-[28px] border border-[#3a2d26] bg-[#1b1613] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <Brand />
          <button type="button" onClick={onLanguage} className="rounded-full border border-[#3a2d26] px-3 py-1.5 text-xs text-[#e7d3c4]">
            {t("language")}
          </button>
        </div>
        <h1 className="font-serif text-4xl">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#b5a194]">{t("loginLead")}</p>
        <label className="mt-5 block text-xs text-[#b5a194]">
          {t("email")}
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb] outline-none focus:border-[#c6a15b]"
          />
        </label>
        <label className="mt-3 block text-xs text-[#b5a194]">
          {t("password")}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb] outline-none focus:border-[#c6a15b]"
          />
        </label>
        {error && <p className="mt-3 text-sm text-[#f0c2b8]">{error}</p>}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-full bg-[#c6a15b] py-3 text-sm font-medium text-[#2a1c16] disabled:opacity-60">
          {t("signIn")}
        </button>
        <div className="mt-5 rounded-2xl bg-[#120f0d] p-3 text-xs leading-relaxed text-[#b5a194]">
          <p className="text-[#e7d3c4]">{t("demoHint")}</p>
          <p className="mt-1">admin@glowora.com · Glowora#Admin — {t("demoAdmin")}</p>
          <p>staff@glowora.com · Glowora#Staff — {t("demoStaff")}</p>
          <p>maya@glowora.com · Glowora#Staff — {t("demoMaya")}</p>
          <p className="mt-2">{t("sessionNote")}</p>
        </div>
        <button type="button" onClick={onLeave} className="mt-4 text-xs text-[#b5a194]">
          {t("backToStore")}
        </button>
      </form>
    </div>
  )
}
