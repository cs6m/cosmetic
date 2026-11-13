import { useMemo, useState } from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, ShoppingBag, Sparkles, TrendingUp, Users, Wallet } from "lucide-react"
import { dashboardMetrics, dayDetails, money, textOf } from "../../data/adminDb"
import { formatFullDay, InteractiveChart } from "../charts"
import { useAdmin } from "../context"
import { formatWhen, PageHead, Panel, StatusPill } from "../ui"

const RANGES = [
  ["today", "today"],
  ["7d", "days7"],
  ["30d", "days30"],
  ["year", "year"],
  ["custom", "custom"],
]

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

export default function Overview() {
  const { db, t, language, range, setRange, customRange, setCustomRange, open } = useAdmin()
  const metrics = dashboardMetrics(db, range, customRange)
  const top = metrics.top[0]
  const series = metrics.series
  const hourly = series.granularity === "hour"
  const [picked, setPicked] = useState(null)

  // The chosen day is remembered as a timestamp, so it survives data refreshes and
  // falls back to "today" (the last point) whenever it is outside the visible range.
  const selected = useMemo(() => {
    const last = series.stamps.length - 1
    if (picked == null) {
      if (!hourly) return last
      const hour = new Date().getHours()
      return Math.min(hour, last)
    }
    const found = series.stamps.findIndex((stamp) => (hourly ? stamp === picked : sameDay(stamp, picked)))
    return found >= 0 ? found : last
  }, [series, picked, hourly])

  const select = (index) => setPicked(series.stamps[Math.max(0, Math.min(series.stamps.length - 1, index))])
  const day = useMemo(() => dayDetails(db, series.stamps[selected]), [db, series, selected])
  const dayLabel = (index) => formatFullDay(series.stamps[index], language)
  const pointLabel = (index) =>
    hourly
      ? `${formatFullDay(series.stamps[index], language)} · ${String(new Date(series.stamps[index]).getHours()).padStart(2, "0")}:00`
      : formatFullDay(series.stamps[index], language)

  return (
    <div className="space-y-5">
      <PageHead title={t("overview")} text={t("overviewLead")} />
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setRange(id)
              setPicked(null)
            }}
            className={`rounded-full px-3.5 py-2 text-sm ${range === id ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}
          >
            {t(key)}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-[#b5a194]">
              {t("from")}
              <input
                type="date"
                value={customRange.from}
                onChange={(event) => {
                  setCustomRange({ ...customRange, from: event.target.value })
                  setPicked(null)
                }}
                className="ms-2 rounded-xl border border-[#3a2d26] bg-[#120f0d] px-2 py-1.5 text-sm text-[#f6f1eb]"
              />
            </label>
            <label className="text-xs text-[#b5a194]">
              {t("to")}
              <input
                type="date"
                value={customRange.to}
                onChange={(event) => {
                  setCustomRange({ ...customRange, to: event.target.value })
                  setPicked(null)
                }}
                className="ms-2 rounded-xl border border-[#3a2d26] bg-[#120f0d] px-2 py-1.5 text-sm text-[#f6f1eb]"
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric icon={Wallet} label={t("sales")} value={money(metrics.sales, language)} hint={t("salesHint")} />
        <Metric icon={ShoppingBag} label={t("totalOrders")} value={metrics.orderCount} />
        <Metric icon={TrendingUp} label={t("aov")} value={money(metrics.aov, language)} />
        <Metric icon={Users} label={t("newCustomers")} value={metrics.newCustomers} />
        <Metric icon={Sparkles} label={t("topSelling")} value={top ? textOf(top, language, "name") : t("noTop")} hint={top ? `${top.qty} ${t("units")}` : ""} />
        <Metric icon={AlertTriangle} label={t("lowStock")} value={metrics.low.length} hint={t("alerts")} warn={metrics.low.length > 0} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel className="p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-medium text-[#f6f1eb]">{t("salesChart")}</h2>
            <span className="text-xs text-[#b5a194]">{t("salesAxis")}</span>
          </div>
          <InteractiveChart
            stamps={series.stamps}
            values={series.sales}
            granularity={series.granularity}
            language={language}
            format={(value) => money(value, language)}
            selected={selected}
            onSelect={select}
            describe={pointLabel}
            label={t("salesChart")}
          />
        </Panel>
        <Panel className="p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-medium text-[#f6f1eb]">{t("trafficChart")}</h2>
            <span className="text-xs text-[#b5a194]">{t("visitorsAxis")}</span>
          </div>
          <InteractiveChart
            stamps={series.stamps}
            values={series.visitors}
            granularity={series.granularity}
            language={language}
            format={(value) => `${value.toLocaleString("en-US")} ${t("visitors")}`}
            selected={selected}
            onSelect={select}
            describe={pointLabel}
            stroke="#e4c99a"
            fill="#8c6239"
            label={t("trafficChart")}
          />
        </Panel>
      </div>
      <p className="text-center text-xs text-[#b5a194]">{t("chartHint")}</p>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-[#b5a194]">{t("dayDetails")}</p>
            <h2 className="font-serif text-2xl text-[#f6f1eb] sm:text-3xl">{dayLabel(selected)}</h2>
          </div>
          {!hourly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("prevDay")}
                disabled={selected <= 0}
                onClick={() => select(selected - 1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#3a2d26] text-[#e7d3c4] transition hover:border-[#c6a15b] disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label={t("nextDay")}
                disabled={selected >= series.stamps.length - 1}
                onClick={() => select(selected + 1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#3a2d26] text-[#e7d3c4] transition hover:border-[#c6a15b] disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t("sales")} value={money(day.sales, language)} />
          <Stat label={t("totalOrders")} value={day.orderCount} />
          <Stat label={t("visitors")} value={day.visitors.toLocaleString("en-US")} />
          <Stat label={t("aov")} value={money(day.aov, language)} />
          <Stat label={t("unitsSold")} value={day.units} />
          <Stat label={t("conversion")} value={`${(day.conversion * 100).toFixed(1)}%`} />
          <Stat label={t("newCustomers")} value={day.newCustomers} />
          <Stat label={t("paidOrders")} value={day.paidCount} />
        </div>

        {day.byStatus.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {day.byStatus.map((row) => (
              <span key={row.status} className="inline-flex items-center gap-2 rounded-full bg-[#120f0d] px-3 py-1.5 text-xs text-[#e7d3c4]">
                <StatusPill status={row.status} label={t(row.status)} />
                {row.count}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.8fr)]">
          <div>
            <h3 className="mb-2 text-sm text-[#e7d3c4]">
              {t("ordersOnDay")} ({day.orderCount})
            </h3>
            {day.orders.length === 0 ? (
              <p className="rounded-2xl bg-[#120f0d] px-4 py-8 text-center text-sm text-[#b5a194]">{t("noOrdersDay")}</p>
            ) : (
              <ul className="admin-scroll max-h-[420px] divide-y divide-[#3a2d26] overflow-y-auto rounded-2xl bg-[#120f0d] px-3">
                {day.orders.map((order) => {
                  const person = db.customers.find((item) => item.id === order.customerId)
                  const name = order.customer?.name || (person?.id === "guest-store" ? t("guest") : person?.name) || t("guest")
                  return (
                    <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#f6f1eb]">{order.id}</p>
                        <p className="truncate text-xs text-[#b5a194]">
                          {name} · {formatWhen(order.date, language)} · {order.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} {t("units")}
                        </p>
                      </div>
                      <StatusPill status={order.status} label={t(order.status)} />
                      <span className="min-w-24 text-end text-sm text-[#e7d3c4]">{money(order.total, language)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <button type="button" onClick={() => open("orders")} className="mt-2 text-xs text-[#e4c99a]">
              {t("viewAll")}
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-sm text-[#e7d3c4]">{t("topSelling")}</h3>
            {day.top.length === 0 ? (
              <p className="rounded-2xl bg-[#120f0d] px-4 py-8 text-center text-sm text-[#b5a194]">{t("noTop")}</p>
            ) : (
              <ul className="space-y-2">
                {day.top.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#120f0d] p-2">
                    <img src={item.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{textOf(item, language, "name")}</p>
                      <p className="text-xs text-[#b5a194]">
                        {item.qty} {t("units")}
                      </p>
                    </div>
                    <span className="text-xs text-[#e7d3c4]">{money(item.revenue, language)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-[#e7d3c4]">{t("recentOrders")}</h2>
            <button type="button" onClick={() => open("orders")} className="text-xs text-[#e4c99a]">
              {t("viewAll")}
            </button>
          </div>
          {metrics.orders.length === 0 ? (
            <p className="py-8 text-sm text-[#b5a194]">{t("noOrders")}</p>
          ) : (
            <ul className="divide-y divide-[#3a2d26]">
              {metrics.orders.slice(0, 6).map((order) => {
                const person = db.customers.find((item) => item.id === order.customerId)
                return (
                  <li key={order.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#f6f1eb]">{order.id}</p>
                      <p className="truncate text-xs text-[#b5a194]">
                        {person?.id === "guest-store" ? t("guest") : person?.name} · {formatWhen(order.date, language)}
                      </p>
                    </div>
                    <StatusPill status={order.status} label={t(order.status)} />
                    <span className="min-w-24 text-end text-sm text-[#e7d3c4]">{money(order.total, language)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel className="p-4">
          <h2 className="mb-3 text-sm text-[#e7d3c4]">{t("lowStock")}</h2>
          {metrics.low.length === 0 ? (
            <p className="text-sm text-[#b5a194]">{t("noResults")}</p>
          ) : (
            <ul className="space-y-3">
              {metrics.low.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <img src={product.images[0]} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{product.name}</p>
                    <p className="text-xs text-[#b5a194]">{product.sku}</p>
                  </div>
                  <span className="text-sm text-[#f0c2b8]">{product.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#120f0d] px-4 py-3">
      <p className="text-xs text-[#b5a194]">{label}</p>
      <p className="mt-1 truncate font-serif text-2xl text-[#f6f1eb]">{value}</p>
    </div>
  )
}

function Metric({ icon: Icon, label, value, hint, warn }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide text-[#b5a194]">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-2xl ${warn ? "bg-[#3a2422] text-[#f0c2b8]" : "bg-[#2a211c] text-[#e4c99a]"}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 truncate font-serif text-3xl text-[#f6f1eb]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#b5a194]">{hint}</p>}
    </Panel>
  )
}
