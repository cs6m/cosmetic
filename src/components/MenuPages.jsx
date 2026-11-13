import { useState } from "react"
import { canReview, cmsText, submitReview, textOf, useDb, useStorefront } from "../data/adminDb"
import { formatPrice } from "../data/catalog"
import { useShop } from "../context/ShopContext"
import { useLang } from "../i18n"

function orderStatusKey(status) {
  return (
    {
      pending: "statusPending",
      confirmed: "statusConfirmed",
      preparing: "statusPreparing",
      out: "statusOut",
      delivery: "statusOut",
      delivered: "statusDelivered",
      completed: "statusDelivered",
      returned: "statusReturned",
    }[status] || "statusPending"
  )
}

export function BrandsScreen() {
  const { openBrand, language } = useShop()
  const { products, brands, cms } = useStorefront()
  const t = useLang()

  return (
    <div className="px-4 pb-6 pt-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-cocoa">{t("brandsKicker")}</p>
      <h1 className="mt-1 font-serif text-[34px] leading-none text-ink">{cmsText(cms, language, "brandsTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{cmsText(cms, language, "brandsLead")}</p>
      <ul className="mt-5 grid gap-3">
        {brands.map((brand) => {
          const count = products.filter((product) => product.brand === brand.id).length
          const about = textOf(brand, language, "description")
          return (
            <li key={brand.id}>
              <button
                type="button"
                onClick={() => openBrand(brand.id)}
                className="flex w-full items-center gap-4 rounded-[24px] bg-ivory p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5"
              >
                {brand.image || brand.logo ? (
                  <img src={brand.image || brand.logo} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-serif text-lg ${brand.tone}`}>
                    {brand.mark}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-serif text-[22px] leading-none text-ink">{brand.name}</span>
                  <span className="mt-1.5 block text-sm leading-snug text-muted">{about}</span>
                  <span className="mt-2 block text-[11px] uppercase tracking-[0.14em] text-cocoa">{count} {t("products")}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function OrdersScreen() {
  const { orderHistory, language } = useShop()
  const db = useDb()
  const t = useLang()
  const locale = language === "ar" ? "ar" : "en"

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="font-serif text-[34px] leading-none text-ink">{t("ordersTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{orderHistory.length ? t("ordersLead") : t("ordersEmpty")}</p>
      <ul className="mt-5 space-y-3">
        {orderHistory.map((order) => {
          const live = db.orders.find((item) => item.id === order.id)
          const status = live?.status || (order.status === "completed" ? "delivered" : order.status === "delivery" ? "out" : order.status)
          const delivered = status === "delivered"
          return (
            <li key={order.id} className="rounded-[24px] bg-ivory p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cocoa">{order.id}</p>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(order.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${delivered ? "bg-sage/15 text-sage" : "bg-sand text-espresso"}`}>
                  {t(orderStatusKey(status))}
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {order.items.map((item) => {
                  const name = language === "ar" ? item.nameAr || item.name : item.name
                  const sent = (db.reviews || []).some((review) => review.orderId === order.id && review.productId === item.id)
                  const open = canReview(order.id, item.id)
                  return (
                    <li key={`${order.id}-${item.id}`} className="rounded-2xl bg-cream/70 p-2">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">{name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {t("orderQty")} {item.qty}
                          </p>
                        </div>
                        <p className="text-sm text-cocoa">{formatPrice(item.price * item.qty, language)}</p>
                      </div>
                      {open && sent && <p className="mt-2 px-1 text-xs text-cocoa">{t("reviewThanks")}</p>}
                      {open && !sent && <OrderReview orderId={order.id} productId={item.id} author={order.customer?.name || live?.customer?.name || ""} />}
                    </li>
                  )
                })}
              </ul>
              {!delivered && <p className="mt-3 text-xs leading-relaxed text-muted">{t("reviewAfterDelivery")}</p>}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm text-muted">{t("orderTotal")}</span>
                <span className="font-serif text-xl text-espresso">{formatPrice(order.total, language)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OrderReview({ orderId, productId, author }) {
  const t = useLang()
  const [draft, setDraft] = useState({ author, rating: 5, text: "" })
  const [note, setNote] = useState("")

  return (
    <form
      className="mt-2 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const result = submitReview({ ...draft, orderId, productId })
        if (!result.ok) {
          setNote(t(result.reason === "exists" ? "reviewExists" : result.reason === "not-delivered" ? "reviewAfterDelivery" : "reviewNeed"))
          return
        }
        setNote("")
      }}
    >
      <input
        value={draft.author}
        onChange={(event) => setDraft({ ...draft, author: event.target.value })}
        placeholder={t("yourName")}
        aria-label={t("yourName")}
        className="h-10 rounded-full bg-ivory px-4 text-sm text-ink outline-none"
      />
      <label className="flex items-center gap-2 text-xs text-muted">
        {t("stars")}
        <select
          value={draft.rating}
          aria-label={t("stars")}
          onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}
          className="h-8 rounded-full bg-ivory px-3 text-ink"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={draft.text}
        onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        placeholder={t("yourReview")}
        aria-label={t("yourReview")}
        className="min-h-20 rounded-2xl bg-ivory px-4 py-2 text-sm text-ink outline-none"
      />
      {note && <p className="text-xs text-cocoa">{note}</p>}
      <button type="submit" className="h-10 rounded-full bg-espresso text-sm text-white">
        {t("sendReview")}
      </button>
    </form>
  )
}

export function HelpScreen() {
  const { language } = useShop()
  const { faqs, cms } = useStorefront()
  const t = useLang()
  const title = cmsText(cms, language, "helpTitle")
  const lead = cmsText(cms, language, "helpLead")

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="font-serif text-[32px] font-semibold leading-none text-ink">{title}</h1>
      <p className="mt-2 text-sm text-muted">{lead}</p>
      <ul className="mt-4 space-y-3">
        {faqs.map((item) => (
          <li key={item.id} className="rounded-[22px] bg-ivory px-4 py-4">
            <p className="font-medium text-ink">{textOf(item, language, "question")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{textOf(item, language, "answer")}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Page({ title, text, children }) {
  return (
    <div dir="rtl" className="px-4 pb-6 pt-5 font-[Cairo,sans-serif]">
      <h1 className="text-[32px] font-semibold leading-none text-ink">{title}</h1>
      <p className="mt-2 text-sm text-muted">{text}</p>
      {children}
    </div>
  )
}
