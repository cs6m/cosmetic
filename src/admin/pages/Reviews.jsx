import { money } from "../../data/adminDb"
import { useAdmin } from "../context"
import { formatWhen, GhostButton, PageHead, Panel } from "../ui"

export default function Reviews() {
  const { db, t, language, open } = useAdmin()
  const notes = [...(db.orderNotes || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const openOrder = (orderId) => {
    try {
      sessionStorage.setItem("glowora-focus-order", orderId)
    } catch {
      /* the orders page still opens */
    }
    open("orders")
  }

  return (
    <div className="space-y-5">
      <PageHead title={t("reviews")} text={t("reviewsLead")} />
      {notes.length === 0 && <Panel className="p-4 text-sm text-[#b5a194]">{t("noResults")}</Panel>}
      <div className="grid gap-3">
        {notes.map((item) => {
          const order = db.orders.find((entry) => entry.id === item.orderId)
          return (
            <Panel key={item.id} className="p-4">
              <button type="button" onClick={() => openOrder(item.orderId)} className="block w-full text-start">
                <p className="text-xs text-[#b5a194]">
                  {item.orderId} · {item.author || order?.customer?.name || ""} · {formatWhen(item.createdAt, language)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#f3e6da]">{item.note}</p>
                {order && (
                  <p className="mt-2 text-xs text-[#e4c99a]">
                    {order.customer?.city || ""} · {money(order.total, language)} · {t(order.status)}
                  </p>
                )}
              </button>
              <div className="mt-3">
                <GhostButton onClick={() => openOrder(item.orderId)}>{t("orders")}</GhostButton>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
