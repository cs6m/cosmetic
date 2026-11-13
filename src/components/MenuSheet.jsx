import { ChevronRight, X } from "lucide-react"
import { useStorefront } from "../data/adminDb"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"
import { Logo } from "./ui"

const links = [
  { id: "home", label: "navHome" },
  { id: "brands", label: "navBrands" },
  { id: "categories", label: "navCategories" },
  { id: "orders", label: "navOrders" },
  { id: "help", label: "navHelp" },
]

function iconFor(item) {
  const key = `${item.id} ${item.label}`.toLowerCase()
  if (key.includes("whats")) return WhatsAppIcon
  if (key.includes("insta")) return InstagramIcon
  if (key.includes("face")) return FacebookIcon
  return LinkIcon
}

export default function MenuSheet() {
  const { setMenuOpen, navigate } = useShop()
  const { socials } = useStorefront()
  const t = useLang()

  return (
    <div className="absolute inset-x-0 top-0 bottom-[4.75rem] z-40 flex bg-black/35" onClick={() => setMenuOpen(false)}>
      <div
        className="drawer-in relative ml-auto flex h-full w-[84%] flex-col bg-ivory px-5 py-5 text-espresso shadow-[-12px_0_30px_rgba(74,48,40,0.08)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => setMenuOpen(false)}
          className="absolute left-4 top-5 grid h-9 w-9 place-items-center rounded-full text-espresso"
        >
          <X size={18} />
        </button>
        <div className="flex justify-center pt-1">
          <Logo />
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          {socials.map((social) => {
            const Icon = iconFor(social)
            return (
              <a
                key={social.id}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-cream text-espresso transition hover:bg-sand"
              >
                <Icon />
              </a>
            )
          })}
        </div>
        <nav className="mt-6 flex flex-col">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => navigate(link.id)}
              className="flex items-center justify-between border-b border-line py-3.5 text-[17px] font-semibold text-ink"
            >
              <span>{t(link.label)}</span>
              <ChevronRight size={16} className="text-muted rtl:rotate-180" />
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.4a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.86c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.14-.95-.3-1.64-.59-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.4.86-.4h.62c.2 0 .46-.04.72.55.27.62.91 2.15.99 2.3.08.16.13.35.03.55-.1.22-.15.35-.3.54-.14.19-.3.42-.43.56-.14.14-.29.3-.12.58.16.27.73 1.2 1.57 1.94 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.27.38-.23.64-.14.26.08 1.66.78 1.94.92.28.15.47.22.54.34.07.13.07.73-.17 1.41z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.1.4l2.1-2.1a5 5 0 0 0-7.1-7.1l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.1-.4l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.2-1.2" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14.2 21v-7.1h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H17V5.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2h-2.5v2.8H11V21h3.2z" />
    </svg>
  )
}
