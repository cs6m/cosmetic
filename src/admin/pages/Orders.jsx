import { useMemo, useState } from "react"
import { governorateLabel } from "../../checkout"
import { advanceOrder, money, textOf } from "../../data/adminDb"
import { useAdmin } from "../context"
import { ConfirmDialog, explain, formatWhen, GhostButton, PageHead, Panel, PrimaryButton, StatusPill, TextInput } from "../ui"

const TABS = ["all", "pending", "confirmed", "preparing", "out", "delivered", "returned"]
const ACTION = {
  pending: ["approve", "return"],
  confirmed: ["prepared", "return"],
  preparing: ["dispatch", "return"],
  out: ["deliver", "return"],
  delivered: ["return"],
  returned: [],
}

export default function Orders() {
  const { db, t, language, notify } = useAdmin()
  const [tab, setTab] = useState("pending")
  const [query, setQuery] = useState("")
  const [pendingAction, setPendingAction] = useState(null)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return db.orders.filter((order) => {
      if (tab !== "all" && order.status !== tab) return false
      if (!needle) return true
      const person = db.customers.find((item) => item.id === order.customerId)
      const buyer = order.customer || {}
      return `${order.id} ${person?.name || ""} ${person?.email || ""} ${buyer.name || ""} ${buyer.phone || ""}`.toLowerCase().includes(needle)
    })
  }, [db, tab, query])

  const run = (orderId, action) => {
    const result = advanceOrder(orderId, action)
    if (!result.ok) notify(explain(t, result))
    else notify(t("saved"))
    setPendingAction(null)
  }

  return (
    <div className="space-y-5">
      <PageHead title={t("orders")} text={t("ordersLead")} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="admin-scroll flex gap-2 overflow-x-auto">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm ${tab === id ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}
            >
              {t(id === "all" ? "all" : id)}
            </button>
          ))}
        </div>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchOrders")}
          className="lg:max-w-xs"
          aria-label={t("searchOrders")}
        />
      </div>

      {rows.length === 0 ? (
        <Panel className="px-4 py-12 text-center text-sm text-[#b5a194]">{t("noResults")}</Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => {
            const person = db.customers.find((item) => item.id === order.customerId)
            const actions = ACTION[order.status] || []
            return (
              <Panel key={order.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[#f6f1eb]">{order.id}</p>
                      <StatusPill status={order.status} label={t(order.status)} />
                    </div>
                    <p className="mt-1 text-xs text-[#b5a194]">
                      {order.customer?.name || (person?.id === "guest-store" ? t("guest") : person?.name || t("guest"))} · {formatWhen(order.date, language)}
                    </p>
                  </div>
                  <p className="font-serif text-2xl text-[#e7d3c4]">{money(order.total, language)}</p>
                </div>
                {order.customer && <CheckoutDetails order={order} t={t} language={language} governorates={db.settings.governorates} />}
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.id}`} className="flex items-center gap-3 rounded-2xl bg-[#120f0d] px-3 py-2">
                      <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{textOf(item, language, "name")}</p>
                        <p className="text-xs text-[#b5a194]">
                          ×{item.qty} · {money(item.price, language)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {order.subtotal != null && (
                  <dl className="mt-3 grid gap-1 text-sm text-[#e7d3c4] sm:max-w-xs sm:ms-auto">
                    <div className="flex justify-between gap-4"><dt className="text-[#b5a194]">{t("subtotal")}</dt><dd>{money(order.subtotal, language)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#b5a194]">{t("shipping")}</dt><dd>{money(order.shipping || 0, language)}</dd></div>
                    <div className="flex justify-between gap-4 font-medium"><dt>{t("grandTotal")}</dt><dd>{money(order.total, language)}</dd></div>
                  </dl>
                )}
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map((action) =>
                      action === "return" ? (
                        <GhostButton key={action} className="text-[#f0c2b8]" onClick={() => setPendingAction({ id: order.id, action })}>
                          {t("returnOrder")}
                        </GhostButton>
                      ) : (
                        <PrimaryButton key={action} onClick={() => setPendingAction({ id: order.id, action })}>
                          {t(action)}
                        </PrimaryButton>
                      ),
                    )}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {pendingAction && (
        <ConfirmDialog
          text={pendingAction.action === "deliver" ? t("confirmDeliver") : pendingAction.action === "return" ? t("confirmReturn") : t("confirm")}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => run(pendingAction.id, pendingAction.action)}
        />
      )}
    </div>
  )
}

function CheckoutDetails({ order, t, language, governorates }) {
  const buyer = order.customer
  const rows = [
    [t("fullName"), buyer.name],
    [t("phone"), buyer.phone],
    [t("city"), governorateLabel(buyer.city, language, governorates)],
    [t("neighborhood"), buyer.neighborhood],
    [t("street"), buyer.street],
    [t("building"), buyer.building],
    [t("addressDetails"), buyer.details],
    [t("giftMessage"), buyer.gift],
    [t("deliveryNotes"), buyer.notes],
    [t("paymentMethod"), t("payCod")],
  ]
  return (
    <dl className="mt-4 grid gap-2 rounded-2xl bg-[#120f0d] p-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] text-[#b5a194]">{label}</dt>
          <dd className="text-sm text-[#f6f1eb]">{value || "—"}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="text-[11px] text-[#b5a194]">{t("mapLink")}</dt>
        <dd className="text-sm">
          {buyer.mapLink ? (
            <a href={buyer.mapLink} target="_blank" rel="noreferrer" className="break-all text-[#c6a15b] underline">
              {buyer.mapLink}
            </a>
          ) : (
            "—"
          )}
        </dd>
      </div>
    </dl>
  )
}
