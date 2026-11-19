import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { checkoutErrors, normalizePhone } from "../checkout"
import { syncEnabled } from "../data/supabaseSync"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"
import { OrdersScreen } from "./MenuPages"

const EMPTY = { phone: "", city: "", neighborhood: "", street: "", building: "", details: "" }

export function GoogleContinue({ intent = "account", label }) {
  const { signInWithGoogle, language } = useShop()
  const t = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const start = async () => {
    setError("")
    setBusy(true)
    try {
      await signInWithGoogle(intent)
    } catch (err) {
      setBusy(false)
      setError(err?.message || (language === "ar" ? "تعذّر فتح Google." : "Google sign-in could not start."))
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-medium text-ink shadow-[0_8px_20px_rgba(74,48,40,0.08)] ring-1 ring-line disabled:opacity-60"
      >
        <GoogleMark />
        <span>{busy ? t("signingIn") : label || t("continueGoogle")}</span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-[#9a4d45]">
          {error}
        </p>
      )}
    </div>
  )
}

export function GuestAccount({ checkout = false }) {
  const t = useLang()
  const benefits = [t("accountBenefitOrders"), t("accountBenefitAddress"), t("accountBenefitTrack")]

  return (
    <div className="px-4 pb-8 pt-5">
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("accountTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("accountGuestLead")}</p>
      {checkout && <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-sm text-espresso">{t("accountCheckoutNote")}</p>}
      <ul className="mt-4 space-y-2">
        {benefits.map((item) => (
          <li key={item} className="rounded-2xl bg-ivory px-4 py-3 text-sm text-ink">
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <GoogleContinue intent={checkout ? "checkout" : "account"} />
      </div>
      {!syncEnabled && (
        <p className="mt-3 text-center text-xs text-muted">
          Supabase is not configured in this browser, so Google sign-in cannot start yet.
        </p>
      )}
    </div>
  )
}

export default function AccountScreen() {
  const { authUser, authReady, authIntent, deliveryProfile, governorates, language, saveDelivery, signOutCustomer } = useShop()
  const t = useLang()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!authUser) return
    setForm({
      phone: deliveryProfile?.phone || "",
      city: deliveryProfile?.city || "",
      neighborhood: deliveryProfile?.neighborhood || "",
      street: deliveryProfile?.street || "",
      building: deliveryProfile?.building || "",
      details: deliveryProfile?.details || "",
    })
  }, [authUser, deliveryProfile])

  if (!authReady) {
    return <p className="px-4 pt-8 text-sm text-muted">{t("accountLoading")}</p>
  }
  if (!authUser) {
    return <GuestAccount checkout={authIntent === "checkout"} />
  }

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: "" }))
    setNote("")
  }

  const setPhone = (event) => {
    const value = normalizePhone(event.target.value).replace(/\D/g, "").slice(0, 11)
    setForm((current) => ({ ...current, phone: value }))
    setErrors((current) => ({ ...current, phone: "" }))
    setNote("")
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = checkoutErrors({ ...form, name: authUser.name || "Customer" }, governorates)
    delete next.mapLink
    setErrors(next)
    if (Object.keys(next).length) return
    setSending(true)
    const result = await saveDelivery({ ...form, name: authUser.name })
    setSending(false)
    setNote(result.ok ? t("deliverySaved") : result.message || "")
  }

  const logout = async () => {
    setLeaving(true)
    try {
      await signOutCustomer()
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="px-4 pb-8 pt-5">
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("accountTitle")}</h1>
      <section className="mt-4 flex items-center gap-3 rounded-[24px] bg-ivory p-4">
        {authUser.avatar ? (
          <img src={authUser.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sand font-serif text-xl text-espresso">
            {(authUser.name || "?").slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-serif text-xl text-ink">{authUser.name}</p>
          <p className="truncate text-sm text-muted">{authUser.email}</p>
        </div>
      </section>

      <form onSubmit={submit} className="mt-4 space-y-3 rounded-[24px] bg-ivory p-4" noValidate>
        <h2 className="font-serif text-xl text-ink">{t("deliveryInfo")}</h2>
        <Field label={t("phone")} error={errors.phone && t(errors.phone)}>
          <input
            value={form.phone}
            onChange={setPhone}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={11}
            dir="ltr"
            placeholder={t("phonePlaceholder")}
            className={inputClass(errors.phone)}
          />
        </Field>
        <Field label={t("city")} error={errors.city && t(errors.city)}>
          <select value={form.city} onChange={set("city")} className={inputClass(errors.city)}>
            <option value="">{t("chooseCity")}</option>
            {governorates.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.enabled}>
                {language === "ar" ? item.ar : item.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("neighborhood")} error={errors.neighborhood && t(errors.neighborhood)}>
          <input value={form.neighborhood} onChange={set("neighborhood")} className={inputClass(errors.neighborhood)} />
        </Field>
        <Field label={t("street")} error={errors.street && t(errors.street)}>
          <input value={form.street} onChange={set("street")} className={inputClass(errors.street)} />
        </Field>
        <Field label={t("building")} error={errors.building && t(errors.building)}>
          <input value={form.building} onChange={set("building")} className={inputClass(errors.building)} />
        </Field>
        <Field label={t("addressDetails")}>
          <textarea value={form.details} onChange={set("details")} className="min-h-20 w-full rounded-2xl bg-cream px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-sand" />
        </Field>
        {note && <p className={`text-sm ${note === t("deliverySaved") ? "text-cocoa" : "font-medium text-[#9a4d45]"}`}>{note}</p>}
        <button type="submit" disabled={sending} className="h-12 w-full rounded-full bg-espresso text-sm text-white disabled:opacity-60">
          {sending ? (language === "ar" ? "جاري الحفظ…" : "Saving…") : t("saveDelivery")}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="font-serif text-[28px] leading-none text-ink">{t("myOrders")}</h2>
        <div className="mt-3">
          <OrdersScreen embedded />
        </div>
      </section>

      <button
        type="button"
        onClick={logout}
        disabled={leaving}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-sm text-espresso disabled:opacity-60"
      >
        <LogOut size={16} />
        {t("signOut")}
      </button>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-cocoa">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-[#9a4d45]">{error}</span>}
    </label>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.2l6.3 5.3C37.4 38.3 44 33 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  )
}

const inputClass = (error) =>
  `h-12 w-full rounded-2xl bg-cream px-4 text-sm text-ink outline-none transition ${error ? "ring-2 ring-[#c9786c]" : "focus:ring-2 focus:ring-sand"}`
