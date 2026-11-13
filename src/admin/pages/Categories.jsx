import { useState } from "react"
import { Plus } from "lucide-react"
import { deleteCategory, deleteSubcategory, labelCategory, saveCategory, saveSubcategory } from "../../data/adminDb"
import { useAdmin } from "../context"
import { explain, Field, GhostButton, ImageField, Modal, PageHead, Panel, PrimaryButton, TextInput } from "../ui"

export default function Categories() {
  const { db, t, language, notify } = useAdmin()
  const [categoryDraft, setCategoryDraft] = useState(null)
  const [subDraft, setSubDraft] = useState(null)
  const [error, setError] = useState("")

  const saveCat = () => {
    const result = saveCategory(categoryDraft, categoryDraft.id || null)
    if (!result.ok) {
      setError(result.reason === "busy" ? t("categoryBlocked") : explain(t, result))
      return
    }
    notify(t("saved"))
    setCategoryDraft(null)
  }

  const removeCat = (id) => {
    const result = deleteCategory(id)
    notify(result.ok ? t("saved") : result.reason === "busy" ? t("categoryBlocked") : explain(t, result))
  }

  const saveSub = () => {
    const result = saveSubcategory(subDraft.categoryId, subDraft, subDraft.editingId || null)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setSubDraft(null)
  }

  return (
    <div className="space-y-5">
      <PageHead
        title={t("categories")}
        text={t("categoriesLead")}
        action={
          <PrimaryButton
            onClick={() => {
              setError("")
              setCategoryDraft({ name: "", nameAr: "", image: "/images/cream.svg" })
            }}
          >
            <Plus size={16} /> {t("addCategory")}
          </PrimaryButton>
        }
      />
      <div className="grid gap-4">
        {db.categories.map((category) => {
          const subs = db.subcategories[category.id] || []
          const count = db.products.filter((product) => product.category === category.id).length
          return (
            <Panel key={category.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <img src={category.image} alt="" className="h-36 w-full rounded-2xl object-cover sm:h-28 sm:w-36" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-2xl">{labelCategory(category, language)}</h2>
                  <p className="mt-1 text-xs text-[#b5a194]">
                    {count} {t("items")} · {subs.length} {t("subcategories")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GhostButton
                      onClick={() => {
                        setError("")
                        setCategoryDraft({ ...category })
                      }}
                    >
                      {t("edit")}
                    </GhostButton>
                    <GhostButton onClick={() => removeCat(category.id)}>{t("remove")}</GhostButton>
                    <PrimaryButton
                      onClick={() => {
                        setError("")
                        setSubDraft({ categoryId: category.id, name: "", nameAr: "", image: category.image })
                      }}
                    >
                      {t("addSub")}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
              <ul className="grid gap-2 border-t border-[#3a2d26] p-4 sm:grid-cols-2 xl:grid-cols-3">
                {subs.length === 0 && <li className="text-sm text-[#b5a194]">{t("emptySubs")}</li>}
                {subs.map((group) => {
                  const items = db.products.filter((product) => product.category === category.id && product.subcategory === group.id).length
                  return (
                    <li key={group.id} className="flex items-center gap-3 rounded-2xl bg-[#120f0d] p-2">
                      <img src={group.image || category.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{language === "ar" ? group.nameAr || group.name : group.name}</p>
                        <p className="text-xs text-[#b5a194]">
                          {items} {t("items")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-[#e4c99a]"
                        onClick={() => {
                          setError("")
                          setSubDraft({ categoryId: category.id, editingId: group.id, name: group.name, nameAr: group.nameAr, image: group.image })
                        }}
                      >
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[#f0c2b8]"
                        onClick={() => {
                          const result = deleteSubcategory(category.id, group.id)
                          notify(result.ok ? t("saved") : result.reason === "busy" ? t("subBlocked") : explain(t, result))
                        }}
                      >
                        {t("remove")}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )
        })}
      </div>

      {categoryDraft && (
        <Modal title={categoryDraft.id ? t("editCategory") : t("addCategory")} onClose={() => setCategoryDraft(null)}>
          <div className="grid gap-3">
            <Field label={t("nameEn")}>
              <TextInput value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} />
            </Field>
            <Field label={t("nameAr")}>
              <TextInput value={categoryDraft.nameAr} onChange={(event) => setCategoryDraft({ ...categoryDraft, nameAr: event.target.value })} />
            </Field>
            <ImageField label={t("image")} value={categoryDraft.image || ""} onChange={(image) => setCategoryDraft((current) => ({ ...current, image }))} />
            {error && <p className="text-sm text-[#f0c2b8]">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setCategoryDraft(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={saveCat}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {subDraft && (
        <Modal title={subDraft.editingId ? t("edit") : t("addSub")} onClose={() => setSubDraft(null)}>
          <div className="grid gap-3">
            <Field label={t("nameEn")}>
              <TextInput value={subDraft.name} onChange={(event) => setSubDraft({ ...subDraft, name: event.target.value })} />
            </Field>
            <Field label={t("nameAr")}>
              <TextInput value={subDraft.nameAr} onChange={(event) => setSubDraft({ ...subDraft, nameAr: event.target.value })} />
            </Field>
            <ImageField label={t("image")} value={subDraft.image || ""} onChange={(image) => setSubDraft((current) => ({ ...current, image }))} />
            {error && <p className="text-sm text-[#f0c2b8]">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setSubDraft(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={saveSub}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
