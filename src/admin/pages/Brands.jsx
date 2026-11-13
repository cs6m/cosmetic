import { useState } from "react"
import { Plus } from "lucide-react"
import { deleteBrand, saveBrand } from "../../data/adminDb"
import { useAdmin } from "../context"
import { ConfirmDialog, explain, Field, GhostButton, ImageField, Modal, PageHead, Panel, PrimaryButton, TextArea, TextInput } from "../ui"

const EMPTY = { name: "", mark: "", description: "", descriptionAr: "", logo: "", tone: "bg-espresso text-ivory" }

export default function Brands() {
  const { db, t, notify } = useAdmin()
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState("")
  const [removeId, setRemoveId] = useState(null)

  const openNew = () => {
    setEditingId(null)
    setError("")
    setDraft({ ...EMPTY })
  }

  const save = () => {
    const result = saveBrand(draft, editingId)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setDraft(null)
  }

  const remove = () => {
    const result = deleteBrand(removeId)
    setRemoveId(null)
    if (!result.ok) notify(result.reason === "busy" ? t("brandBlocked") : result.reason === "last" ? t("lastBrand") : explain(t, result))
    else notify(t("saved"))
  }

  return (
    <div className="space-y-5">
      <PageHead
        title={t("brands")}
        text={t("brandsLead")}
        action={
          <PrimaryButton onClick={openNew}>
            <Plus size={16} /> {t("addBrand")}
          </PrimaryButton>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {db.brands.map((brand) => (
          <Panel key={brand.id} className="flex items-center gap-3 p-3">
            {brand.image || brand.logo ? (
              <img src={brand.image || brand.logo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <span className={`grid h-16 w-16 place-items-center rounded-2xl text-sm ${brand.tone}`}>{brand.mark}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{brand.name}</p>
              <p className="truncate text-xs text-[#b5a194]">{brand.description}</p>
            </div>
            <div className="flex flex-col gap-2">
              <GhostButton
                onClick={() => {
                  setEditingId(brand.id)
                  setError("")
                  setDraft({ ...brand })
                }}
              >
                {t("edit")}
              </GhostButton>
              <GhostButton className="text-[#f0c2b8]" onClick={() => setRemoveId(brand.id)}>
                {t("remove")}
              </GhostButton>
            </div>
          </Panel>
        ))}
      </div>
      {draft && (
        <Modal title={editingId ? t("edit") : t("addBrand")} onClose={() => setDraft(null)}>
          <div className="grid gap-3">
            <Field label={t("name")}>
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={t("description")}>
              <TextArea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Field>
            <Field label={t("arabic")}>
              <TextArea value={draft.descriptionAr} onChange={(event) => setDraft({ ...draft, descriptionAr: event.target.value })} />
            </Field>
            <ImageField
              label={t("brandImage")}
              value={draft.image || draft.logo || ""}
              onChange={(image) => setDraft((current) => ({ ...current, logo: image, image }))}
              max={700}
            />
            {error && <p className="text-sm text-[#f0c2b8]">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setDraft(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={save}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
      {removeId && <ConfirmDialog text={t("confirmDelete")} onCancel={() => setRemoveId(null)} onConfirm={remove} />}
    </div>
  )
}
