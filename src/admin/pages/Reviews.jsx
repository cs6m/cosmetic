import { useState } from "react"
import { deleteReview, setReviewStatus } from "../../data/adminDb"
import { useAdmin } from "../context"
import { ConfirmDialog, explain, GhostButton, PageHead, Panel, StatusPill } from "../ui"

export default function Reviews() {
  const { db, t, notify } = useAdmin()
  const [filter, setFilter] = useState("pending")
  const [removeId, setRemoveId] = useState(null)
  const rows = db.reviews.filter((item) => (filter === "all" ? true : item.status === filter))

  const act = (id, status) => {
    const result = setReviewStatus(id, status)
    notify(result.ok ? t("saved") : explain(t, result))
  }

  const remove = () => {
    const result = deleteReview(removeId)
    setRemoveId(null)
    notify(result.ok ? t("saved") : explain(t, result))
  }

  return (
    <div className="space-y-5">
      <PageHead title={t("reviews")} text={t("reviewsLead")} />
      <div className="flex gap-2">
        {[
          ["pending", "pendingReviews"],
          ["approved", "approvedReviews"],
          ["all", "all"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === id ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {rows.length === 0 && <Panel className="px-4 py-12 text-center text-sm text-[#b5a194]">{t("noResults")}</Panel>}
        {rows.map((review) => {
          const product = db.products.find((item) => item.id === review.productId)
          return (
            <Panel key={review.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{review.author}</p>
                <StatusPill status={review.status === "approved" ? "delivered" : "pending"} label={review.status === "approved" ? t("approvedReviews") : t("pendingReviews")} />
                <span className="text-sm text-[#e4c99a]">{"★".repeat(review.rating)}</span>
              </div>
              <p className="text-xs text-[#b5a194]">{product?.name || review.productId}</p>
              <p className="text-sm leading-relaxed text-[#e7d3c4]">{review.text}</p>
              <div className="flex gap-2">
                {review.status !== "approved" && <GhostButton onClick={() => act(review.id, "approved")}>{t("approveReview")}</GhostButton>}
                {review.status === "approved" && <GhostButton onClick={() => act(review.id, "pending")}>{t("hideReview")}</GhostButton>}
                <GhostButton className="text-[#f0c2b8]" onClick={() => setRemoveId(review.id)}>
                  {t("remove")}
                </GhostButton>
              </div>
            </Panel>
          )
        })}
      </div>
      {removeId && <ConfirmDialog text={t("confirmDelete")} onCancel={() => setRemoveId(null)} onConfirm={remove} />}
    </div>
  )
}
