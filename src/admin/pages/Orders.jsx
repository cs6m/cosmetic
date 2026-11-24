import { useEffect, useMemo, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { governorateLabel } from "../../checkout"
import { advanceOrder, money, textOf } from "../../data/adminDb"
import { useAdmin } from "../context"
import { ConfirmDialog, explain, Field, formatWhen, GhostButton, Modal, PageHead, Panel, PrimaryButton, Select, StatusPill, TextArea, TextInput } from "../ui"

const TABS = ["all", "pending", "preparing", "out", "delivered", "returned"]
const RANGES = ["all", "today", "week", "month"]
const ACTION = {
  pending: ["approve"],
  confirmed: ["approve"],
  preparing: ["prepared"],
  out: ["deliver", "return"],
  delivered: [],
  returned: [],
}

function startOfWeek(date) {
  const next = new Date(date)
  const sinceSaturday = (next.getDay() + 1) % 7
  next.setDate(next.getDate() - sinceSaturday)
  next.setHours(0, 0, 0, 0)
  return next
}

function inTimeRange(value, range) {
  if (range === "all") return true
  const time = new Date(value).getTime()
  const now = new Date()
  if (range === "today") {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return time >= start.getTime()
  }
  if (range === "week") return time >= startOfWeek(now).getTime()
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  return time >= month.getTime()
}

export default function Orders() {
  const { db, t, language, notify } = useAdmin()
  const [tab, setTab] = useState("pending")
  const [query, setQuery] = useState("")
  const [range, setRange] = useState("all")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [governorate, setGovernorate] = useState("")
  const [focus, setFocus] = useState("")
  const [returnNote, setReturnNote] = useState("")
  const [returnError, setReturnError] = useState("")

  useEffect(() => {
    let id = ""
    try {
      id = sessionStorage.getItem("glowora-focus-order") || ""
      if (id) sessionStorage.removeItem("glowora-focus-order")
    } catch {
      id = ""
    }
    if (!id) return
    setTab("all")
    setQuery(id)
    setFocus(id)
  }, [])

  useEffect(() => {
    if (!focus) return
    document.getElementById(`order-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [focus, tab, query])
  const [pendingAction, setPendingAction] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilters = [range !== "all", minPrice !== "", maxPrice !== "", governorate !== ""].filter(Boolean).length

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const min = minPrice === "" ? null : Number(minPrice)
    const max = maxPrice === "" ? null : Number(maxPrice)
    return db.orders.filter((order) => {
      const status = order.status === "confirmed" ? "pending" : order.status
      if (tab !== "all" && status !== tab) return false
      if (!inTimeRange(order.date, range)) return false
      if (min != null && Number.isFinite(min) && !(Number(order.total) > min)) return false
      if (max != null && Number.isFinite(max) && !(Number(order.total) < max)) return false
      if (governorate && order.customer?.city !== governorate) return false
      if (!needle) return true
      const person = db.customers.find((item) => item.id === order.customerId)
      const buyer = order.customer || {}
      return `${order.id} ${person?.name || ""} ${person?.email || ""} ${person?.phone || ""} ${buyer.name || ""} ${buyer.phone || ""}`.toLowerCase().includes(needle)
    })
  }, [db, tab, query, range, minPrice, maxPrice, governorate])

  const run = (orderId, action, returnReason) => {
    const result = advanceOrder(orderId, action, { returnReason })
    if (!result.ok) notify(explain(t, result))
    else notify(t("saved"))
    setPendingAction(null)
    setReturnNote("")
    setReturnError("")
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
        <div className="flex items-center gap-2">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchOrdersHint")}
            className="lg:max-w-xs"
            aria-label={t("searchOrders")}
          />
          <button
            type="button"
            aria-label={t("filters")}
            onClick={() => setFiltersOpen(true)}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border ${activeFilters ? "border-[#c6a15b] bg-[#c6a15b] text-[#2a1c16]" : "border-[#3a2d26] bg-[#1b1613] text-[#e7d3c4]"}`}
          >
            <SlidersHorizontal size={18} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#2a1c16] px-1 text-[10px] text-[#e4c99a]">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>
      {filtersOpen && (
        <Modal title={t("filters")} onClose={() => setFiltersOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("timeRange")}>
              <Select value={range} onChange={(event) => setRange(event.target.value)} aria-label={t("timeRange")}>
                {RANGES.map((id) => (
                  <option key={id} value={id}>
                    {t(id === "all" ? "allTime" : id === "week" ? "thisWeek" : id === "month" ? "thisMonth" : "today")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("orderStatus")}>
              <Select value={tab} onChange={(event) => setTab(event.target.value)} aria-label={t("orderStatus")}>
                {TABS.map((id) => (
                  <option key={id} value={id}>
                    {t(id === "all" ? "all" : id)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("governorate")}>
              <Select value={governorate} onChange={(event) => setGovernorate(event.target.value)} aria-label={t("governorate")}>
                <option value="">{t("all")}</option>
                {(db.settings.governorates || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {governorateLabel(item.id, language, db.settings.governorates)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("minPrice")}>
                <TextInput inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/[^\d.]/g, ""))} placeholder="IQD" aria-label={t("minPrice")} />
              </Field>
              <Field label={t("maxPrice")}>
                <TextInput inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d.]/g, ""))} placeholder="IQD" aria-label={t("maxPrice")} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton
              onClick={() => {
                setRange("all")
                setTab("all")
                setMinPrice("")
                setMaxPrice("")
                setGovernorate("")
              }}
            >
              {t("clearFilters")}
            </GhostButton>
            <PrimaryButton onClick={() => setFiltersOpen(false)}>{t("apply")}</PrimaryButton>
          </div>
        </Modal>
      )}

      {rows.length === 0 ? (
        <Panel className="px-4 py-12 text-center text-sm text-[#b5a194]">{t("noResults")}</Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => {
            const person = db.customers.find((item) => item.id === order.customerId)
            const actions = ACTION[order.status] || []
            return (
              <Panel key={order.id} id={`order-${order.id}`} className="p-4">
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
                {order.status === "returned" && order.returnReason && (
                  <div className="mt-3 rounded-2xl bg-[#3a2422] px-3 py-3">
                    <p className="text-[11px] text-[#f0c2b8]">{t("returnReason")}</p>
                    <p className="mt-1 text-sm text-[#f6f1eb]">{order.returnReason}</p>
                  </div>
                )}
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
                        <GhostButton
                        key={action}
                        className="text-[#f0c2b8]"
                        onClick={() => {
                          setReturnNote("")
                          setReturnError("")
                          setPendingAction({ id: order.id, action })
                        }}
                      >
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

      {pendingAction && pendingAction.action !== "return" && (
        <ConfirmDialog
          text={pendingAction.action === "deliver" ? t("confirmDeliver") : t("confirm")}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => run(pendingAction.id, pendingAction.action)}
        />
      )}
      {pendingAction?.action === "return" && (
        <Modal
          title={t("returnReason")}
          onClose={() => {
            setPendingAction(null)
            setReturnError("")
          }}
        >
          <Field label={t("returnReason")}>
            <TextArea
              value={returnNote}
              onChange={(event) => {
                setReturnNote(event.target.value)
                setReturnError("")
              }}
              placeholder={t("returnReasonNeed")}
              aria-label={t("returnReason")}
            />
          </Field>
          {returnError && <p className="mt-3 text-sm text-[#f0c2b8]">{returnError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton
              onClick={() => {
                setPendingAction(null)
                setReturnError("")
              }}
            >
              {t("cancel")}
            </GhostButton>
            <PrimaryButton
              onClick={() => {
                if (returnNote.trim().length < 2) {
                  setReturnError(t("returnReasonNeed"))
                  return
                }
                run(pendingAction.id, "return", returnNote.trim())
              }}
            >
              {t("returnOrder")}
            </PrimaryButton>
          </div>
        </Modal>
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
