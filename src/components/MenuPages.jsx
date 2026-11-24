import { useState } from "react"
import { cmsText, submitOrderNote, textOf, useDb, useStorefront } from "../data/adminDb"
import { getUserId, syncEnabled } from "../data/supabaseSync"
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

export function OrdersScreen({ embedded = false }) {
  const { orderHistory, language, authUser, authReady, navigate } = useShop()
  const db = useDb()
  const t = useLang()
  const locale = language === "ar" ? "ar" : "en"
  const shell = embedded ? "" : "px-4 pb-6 pt-5"

  if (syncEnabled && authReady && !authUser) {
    return (
      <div className={shell}>
        {!embedded && <h1 className="font-serif text-[34px] leading-none text-ink">{t("ordersTitle")}</h1>}
        <p className={`${embedded ? "" : "mt-2"} text-sm text-muted`}>{t("accountGuestLead")}</p>
        <button type="button" onClick={() => navigate("account")} className="mt-4 h-12 w-full rounded-full bg-espresso text-sm text-white">
          {t("navAccount")}
        </button>
      </div>
    )
  }

  return (
    <div className={shell}>
      {!embedded && <h1 className="font-serif text-[34px] leading-none text-ink">{t("ordersTitle")}</h1>}
      <p className={`${embedded ? "" : "mt-2"} text-sm text-muted`}>{orderHistory.length ? t("ordersLead") : t("ordersEmpty")}</p>
      <ul className="mt-5 space-y-3">
        {orderHistory.map((order) => {
          const live = db.orders.find((item) => item.id === order.id)
          const status = live?.status || (order.status === "completed" ? "delivered" : order.status === "delivery" ? "out" : order.status)
          const delivered = status === "delivered"
          const source = live || order
          const itemsTotal = (source.items || []).reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0)
          const productsTotal = source.subtotal != null ? Number(source.subtotal) : itemsTotal
          const deliveryFee = source.shipping != null ? Number(source.shipping) : Math.max(0, Number(source.total) - productsTotal)
          const note = (db.orderNotes || []).find((item) => item.orderId === order.id)
          const returnReason = live?.returnReason || order.returnReason || ""
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
                    </li>
                  )
                })}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex items-center justify-between"><dt className="text-muted">{t("subtotal")}</dt><dd>{formatPrice(productsTotal, language)}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-muted">{t("shipping")}</dt><dd>{formatPrice(deliveryFee, language)}</dd></div>
                <div className="flex items-center justify-between pt-1"><dt className="font-medium text-ink">{t("grandTotal")}</dt><dd className="font-serif text-xl text-espresso">{formatPrice(source.total, language)}</dd></div>
              </dl>
              {status === "returned" && returnReason && (
                <p className="mt-3 rounded-2xl bg-[#f6e7df] px-3 py-2 text-sm text-espresso">
                  <span className="block text-[11px] uppercase tracking-[0.14em] text-cocoa">{t("returnReason")}</span>
                  {returnReason}
                </p>
              )}
              {delivered && note && <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-sm text-cocoa">{note.note}</p>}
              {delivered && !note && <OrderNote orderId={order.id} author={order.customer?.name || live?.customer?.name || authUser?.name || ""} ownerId={authUser?.id || getUserId()} />}
              {!delivered && <p className="mt-3 text-xs leading-relaxed text-muted">{t("noteAfterDelivery")}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OrderNote({ orderId, author, ownerId }) {
  const t = useLang()
  const [text, setText] = useState("")
  const [note, setNote] = useState("")

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const result = submitOrderNote({ orderId, author, ownerId, note: text })
        if (!result.ok) {
          setNote(t(result.reason === "exists" ? "noteExists" : result.reason === "not-delivered" ? "noteAfterDelivery" : "noteNeed"))
          return
        }
        setText("")
        setNote(t("noteThanks"))
      }}
    >
      <label className="text-xs text-cocoa">{t("deliveryNote")}</label>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("deliveryNotePlaceholder")}
        aria-label={t("deliveryNote")}
        className="min-h-20 rounded-2xl bg-cream px-4 py-2 text-sm text-ink outline-none"
      />
      {note && <p className="text-xs text-cocoa">{note}</p>}
      <button type="submit" className="h-10 rounded-full bg-espresso text-sm text-white">
        {t("sendNote")}
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
