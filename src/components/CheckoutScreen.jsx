import { useEffect, useRef, useState } from "react"
import { Banknote, Check } from "lucide-react"
import { checkoutErrors, cleanCheckout, deliveryFee, normalizePhone } from "../checkout"
import { formatPrice, unitPrice } from "../data/catalog"
import { useLang } from "../i18n"
import { useShop } from "../context/ShopContext"

const EMPTY = {
  name: "",
  phone: "",
  city: "",
  neighborhood: "",
  street: "",
  building: "",
  details: "",
  mapLink: "",
  gift: "",
  notes: "",
}

// Order in which fields appear on the page, so the first error is always the topmost one.
const FIELD_ORDER = ["name", "phone", "city", "neighborhood", "street", "building", "mapLink"]

export default function CheckoutScreen() {
  const { cartItems, subtotal, bundleDeal, placeOrder, navigate, language, governorates } = useShop()
  const t = useLang()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef(null)
  const city = governorates.find((item) => item.id === form.city)
  const shipping = city?.enabled ? deliveryFee(city.id, governorates, subtotal) : 0
  const total = Math.round(subtotal + shipping)

  // After a failed submit, glide to the first field that needs attention (the error text
  // has been rendered by then) and put the cursor in it.
  useEffect(() => {
    if (!attempt) return
    const first = FIELD_ORDER.find((key) => errors[key])
    if (!first) return
    const target = formRef.current?.querySelector(`[data-field="${first}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    const control = target.querySelector("input, select, textarea")
    window.setTimeout(() => control?.focus({ preventScroll: true }), 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }

  // Phone: digits only, Arabic-Indic digits converted, capped at 11 characters.
  const setPhone = (event) => {
    const value = normalizePhone(event.target.value).replace(/\D/g, "").slice(0, 11)
    setForm((current) => ({ ...current, phone: value }))
    setErrors((current) => ({ ...current, phone: "" }))
  }

  const submit = (event) => {
    event.preventDefault()
    const next = checkoutErrors(form, governorates)
    setErrors(next)
    if (Object.keys(next).length) {
      setAttempt((count) => count + 1)
      return
    }
    const result = placeOrder(cleanCheckout(form))
    if (!result?.ok) return
    navigate("orders")
  }

  if (!cartItems.length) {
    return (
      <div className="px-4 pb-8 pt-5">
        <h1 className="font-serif text-[34px] leading-none text-ink">{t("checkoutTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("bagEmptyLead")}</p>
        <button type="button" onClick={() => navigate("shop")} className="mt-5 h-12 w-full rounded-full bg-espresso text-sm text-white">
          {t("exploreCollection")}
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} className="px-4 pb-8 pt-5" noValidate>
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("checkoutTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("checkoutLead")}</p>

      <section className="mt-5 space-y-3 rounded-[24px] bg-ivory p-4">
        <Field name="name" label={t("fullName")} required error={errors.name && t(errors.name)}>
          <input value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={Boolean(errors.name)} className={inputClass(errors.name)} />
        </Field>
        <Field name="phone" label={t("phone")} required error={errors.phone && t(errors.phone)}>
          <input
            value={form.phone}
            onChange={setPhone}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={11}
            dir="ltr"
            placeholder={t("phonePlaceholder")}
            aria-invalid={Boolean(errors.phone)}
            className={`${inputClass(errors.phone)} text-start tracking-wide`}
          />
        </Field>
        <Field name="city" label={t("city")} required error={errors.city && t(errors.city)}>
          <select value={form.city} onChange={set("city")} aria-invalid={Boolean(errors.city)} className={inputClass(errors.city)}>
            <option value="">{t("chooseCity")}</option>
            {governorates.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.enabled}>
                {language === "ar" ? item.ar : item.en}
                {item.enabled ? "" : ` — ${t("cityOff")}`}
              </option>
            ))}
          </select>
        </Field>
        <Field name="neighborhood" label={t("neighborhood")} required error={errors.neighborhood && t(errors.neighborhood)}>
          <input value={form.neighborhood} onChange={set("neighborhood")} aria-invalid={Boolean(errors.neighborhood)} className={inputClass(errors.neighborhood)} />
        </Field>
        <Field name="street" label={t("street")} required error={errors.street && t(errors.street)}>
          <input value={form.street} onChange={set("street")} aria-invalid={Boolean(errors.street)} className={inputClass(errors.street)} />
        </Field>
        <Field name="building" label={t("building")} required error={errors.building && t(errors.building)}>
          <input value={form.building} onChange={set("building")} aria-invalid={Boolean(errors.building)} className={inputClass(errors.building)} />
        </Field>
        <Field name="details" label={t("addressDetails")}>
          <textarea value={form.details} onChange={set("details")} className={areaClass} />
        </Field>
        <Field name="mapLink" label={t("mapLink")} error={errors.mapLink && t(errors.mapLink)}>
          <input value={form.mapLink} onChange={set("mapLink")} inputMode="url" dir="ltr" placeholder="https://" aria-invalid={Boolean(errors.mapLink)} className={`${inputClass(errors.mapLink)} text-start`} />
        </Field>
        <Field name="gift" label={t("giftMessage")}>
          <textarea value={form.gift} onChange={set("gift")} className={areaClass} />
        </Field>
        <Field name="notes" label={t("deliveryNotes")}>
          <textarea value={form.notes} onChange={set("notes")} className={areaClass} />
        </Field>
      </section>

      <section className="mt-4 rounded-[24px] bg-ivory p-4">
        <h2 className="font-serif text-xl text-ink">{t("paymentTitle")}</h2>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sand px-4 py-3 ring-1 ring-espresso">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-espresso">
            <Banknote size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">{t("payCod")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("payCodLead")}</span>
          </span>
          <Check size={18} className="shrink-0 text-espresso" aria-hidden="true" />
        </div>
        <p className="mt-2 text-[11px] text-muted">{t("codOnlyNote")}</p>
      </section>

      <section className="mt-4 rounded-[24px] bg-ivory p-4">
        <h2 className="font-serif text-xl text-ink">{t("orderSummary")}</h2>
        <ul className="mt-3 space-y-3">
          {cartItems.map(({ product, qty }) => (
            <li key={product.id} className="flex items-center gap-3">
              <img src={product.images[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{product.name}</p>
                <p className="text-xs text-muted">×{qty}</p>
              </div>
              <p className="text-sm text-cocoa">{formatPrice(unitPrice(product, bundleDeal) * qty, language)}</p>
            </li>
          ))}
        </ul>
        {bundleDeal && <p className="mt-3 text-xs text-cocoa">{t("bundleIncluded")}</p>}
        <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
          <Row label={t("subtotal")} value={formatPrice(subtotal, language)} />
          <Row label={t("shipping")} value={city?.enabled ? formatPrice(shipping, language) : t("pickCityFirst")} />
          <div className="flex items-center justify-between pt-1">
            <dt className="font-medium text-ink">{t("grandTotal")}</dt>
            <dd className="font-serif text-2xl text-espresso">{formatPrice(total, language)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-muted">{t("shippingNote")}</p>
        <button type="submit" className="mt-4 h-12 w-full rounded-full bg-espresso text-sm text-white">
          {t("confirmOrder")}
        </button>
      </section>
    </form>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

function Field({ name, label, required, error, children }) {
  return (
    <label className="block scroll-mt-24" data-field={name}>
      <span className="mb-1.5 block text-xs text-cocoa">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-medium text-[#9a4d45]">
          {error}
        </span>
      )}
    </label>
  )
}

const baseInput = "h-12 w-full rounded-2xl bg-cream px-4 text-sm text-ink outline-none transition"
const inputClass = (error) => `${baseInput} ${error ? "ring-2 ring-[#c9786c]" : "focus:ring-2 focus:ring-sand"}`
const areaClass = "min-h-20 w-full rounded-2xl bg-cream px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-sand"
