import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { brandLabel, deleteProduct, money, saveBadge, saveProduct, textOf } from "../../data/adminDb"
import { ICONS, ICON_NAMES } from "../../icons"
import { useAdmin } from "../context"
import {
  ConfirmDialog,
  explain,
  Field,
  GhostButton,
  Modal,
  PageHead,
  Panel,
  PrimaryButton,
  readImage,
  Select,
  StatusPill,
  TextArea,
  TextInput,
} from "../ui"

const SECTIONS = [
  ["black-friday", "blackFridaySection"],
  ["new-products", "newSection"],
  ["weekly-offers", "weeklySection"],
]

const FILTERS = [
  ["all", "visible"],
  ["featured", "featured"],
  ["hidden", "hidden"],
  ["low", "lowStock"],
]

const BADGE_TONES = {
  green: "bg-[#24342b] text-[#b7e0c4]",
  rose: "bg-[#3a2422] text-[#f0c2b8]",
  nude: "bg-[#3a2d22] text-[#e7d3c4]",
}

const EMPTY = {
  name: "",
  nameAr: "",
  subtitle: "",
  subtitleAr: "",
  sku: "",
  brand: "",
  category: "Skincare",
  subcategory: "",
  price: "",
  discountPrice: "",
  description: "",
  descriptionAr: "",
  stock: "",
  images: [],
  status: "active",
  badges: [],
  sections: [],
  benefits: [
    { icon: "Sparkles", label: "", labelAr: "" },
    { icon: "Droplets", label: "", labelAr: "" },
  ],
}

export default function Products() {
  const { db, t, language, notify, can } = useAdmin()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState("")
  const [removeId, setRemoveId] = useState(null)
  const [newBadge, setNewBadge] = useState({ label: "", labelAr: "" })

  // A product's badges, resolved against the badge list (a deleted badge simply drops out).
  const badgesOf = (product) => (product.badges || []).map((id) => db.badges.find((item) => item.id === id)).filter(Boolean)

  // "Visible" lists every product; "Featured" lists only products that carry a badge.
  const matchers = {
    all: () => true,
    featured: (product) => badgesOf(product).length > 0,
    hidden: (product) => product.status === "hidden",
    low: (product) => product.stock <= db.settings.lowStock,
  }
  const counts = Object.fromEntries(FILTERS.map(([id]) => [id, db.products.filter(matchers[id]).length]))

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return db.products.filter((product) => {
      if (!matchers[filter](product)) return false
      if (!needle) return true
      return `${product.name} ${product.nameAr || ""} ${product.sku} ${product.brand}`.toLowerCase().includes(needle)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, query, filter])

  const groups = draft ? db.subcategories[draft.category] || [] : []

  const openNew = () => {
    const category = db.categories[0]
    setEditingId(null)
    setError("")
    setNewBadge({ label: "", labelAr: "" })
    setDraft({
      ...EMPTY,
      brand: db.brands[0]?.id || "",
      category: category?.id || "",
      subcategory: db.subcategories[category?.id]?.[0]?.id || "",
      sku: `GL-${String(db.products.length + 1).padStart(4, "0")}`,
      benefits: EMPTY.benefits.map((item) => ({ ...item })),
    })
  }

  const openEdit = (product) => {
    setEditingId(product.id)
    setError("")
    setNewBadge({ label: "", labelAr: "" })
    setDraft({
      name: product.name,
      nameAr: product.nameAr || "",
      subtitle: product.subtitle || "",
      subtitleAr: product.subtitleAr || "",
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory || "",
      price: product.price,
      discountPrice: product.discountPrice ?? "",
      description: product.description || "",
      descriptionAr: product.descriptionAr || "",
      stock: product.stock,
      images: product.images || [],
      status: product.status,
      subtitle: product.subtitle,
      badges: product.badges || [],
      sections: product.sections || [],
      rating: product.rating,
      reviews: product.reviews,
      benefits: (product.benefits || []).map((item) => ({ ...item })),
    })
  }

  const onImage = async (file) => {
    try {
      const image = await readImage(file)
      setDraft((current) => ({ ...current, images: [...(current.images || []), image].slice(0, 3) }))
    } catch (reason) {
      setError(reason.message === "size" ? t("imageLarge") : t("imageType"))
    }
  }

  const toggle = (key, id) => {
    setDraft((current) => {
      const list = current[key] || []
      return { ...current, [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] }
    })
  }

  const addBadge = () => {
    const result = saveBadge(newBadge)
    if (!result.ok) {
      setError(result.reason === "exists" ? t("badgeTaken") : explain(t, result))
      return
    }
    setDraft((current) => ({ ...current, badges: [...current.badges, result.id].slice(0, 4) }))
    setNewBadge({ label: "", labelAr: "" })
    setError("")
  }

  const save = () => {
    const result = saveProduct(draft, editingId)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setDraft(null)
  }

  const remove = () => {
    const result = deleteProduct(removeId)
    if (!result.ok) notify(explain(t, result))
    else notify(t("saved"))
    setRemoveId(null)
  }

  return (
    <div className="space-y-5">
      <PageHead
        title={t("products")}
        text={t("productsLead")}
        action={
          <PrimaryButton onClick={openNew}>
            <Plus size={16} /> {t("addProduct")}
          </PrimaryButton>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ${filter === id ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}
            >
              {t(label)}
              <span className={`rounded-full px-1.5 text-[11px] ${filter === id ? "bg-[#2a1c16]/15" : "bg-[#2a211c] text-[#b5a194]"}`}>{counts[id]}</span>
            </button>
          ))}
        </div>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchProducts")} aria-label={t("searchProducts")} className="lg:ms-auto lg:max-w-xs" />
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && <Panel className="px-4 py-12 text-center text-sm text-[#b5a194]">{t("noResults")}</Panel>}
        {rows.map((product) => (
          <Panel key={product.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <img src={product.images[0]} alt="" className="h-20 w-full rounded-2xl object-cover sm:h-16 sm:w-16" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{product.name}</p>
                {product.status === "hidden" && <StatusPill status="returned" label={t("hidden")} />}
                {badgesOf(product).map((badge) => (
                  <span key={badge.id} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${BADGE_TONES[badge.tone] || BADGE_TONES.nude}`}>
                    {textOf(badge, language, "label")}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#b5a194]">
                {product.sku} · {brandLabel(product.brand)} · {product.stock} {t("stock")}
              </p>
            </div>
            <p className="text-sm text-[#e7d3c4]">{money(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price, language)}</p>
            <div className="flex gap-2">
              <GhostButton onClick={() => openEdit(product)}>{t("edit")}</GhostButton>
              {can("products.delete") && (
                <GhostButton className="text-[#f0c2b8]" onClick={() => setRemoveId(product.id)}>
                  {t("remove")}
                </GhostButton>
              )}
            </div>
          </Panel>
        ))}
      </div>

      {draft && (
        <Modal title={editingId ? t("editProduct") : t("addProduct")} onClose={() => setDraft(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("name")} · ${t("english")}`}>
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={`${t("name")} · ${t("arabic")}`}>
              <TextInput value={draft.nameAr} onChange={(event) => setDraft({ ...draft, nameAr: event.target.value })} />
            </Field>
            <Field label={`${t("subtitle")} · ${t("english")}`}>
              <TextInput value={draft.subtitle || ""} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} />
            </Field>
            <Field label={`${t("subtitle")} · ${t("arabic")}`}>
              <TextInput value={draft.subtitleAr || ""} onChange={(event) => setDraft({ ...draft, subtitleAr: event.target.value })} />
            </Field>
            <Field label={t("sku")}>
              <TextInput value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
            </Field>
            <Field label={t("brand")}>
              <Select value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })}>
                {db.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("visibility")}>
              <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                <option value="active">{t("visible")}</option>
                <option value="hidden">{t("hidden")}</option>
              </Select>
            </Field>
            <Field label={t("category")}>
              <Select
                value={draft.category}
                onChange={(event) => {
                  const category = event.target.value
                  setDraft({ ...draft, category, subcategory: db.subcategories[category]?.[0]?.id || "" })
                }}
              >
                {db.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("subcategory")}>
              <Select value={draft.subcategory} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value })}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("price")}>
              <TextInput type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
            </Field>
            <Field label={t("discount")}>
              <TextInput type="number" min="0" step="0.01" value={draft.discountPrice} onChange={(event) => setDraft({ ...draft, discountPrice: event.target.value })} />
            </Field>
            <Field label={t("stock")}>
              <TextInput type="number" min="0" step="1" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
            </Field>
            <Field label={t("productImages")}>
              <input type="file" accept="image/*" onChange={(event) => onImage(event.target.files?.[0])} className="block w-full text-xs text-[#b5a194]" />
            </Field>
            <div className="sm:col-span-2">
              <Field label={`${t("description")} · ${t("english")}`}>
                <TextArea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={`${t("description")} · ${t("arabic")}`}>
                <TextArea value={draft.descriptionAr || ""} onChange={(event) => setDraft({ ...draft, descriptionAr: event.target.value })} />
              </Field>
            </div>
          </div>
          {draft.images?.length > 0 && (
            <div className="mt-3 flex gap-2">
              {draft.images.map((image, index) => (
                <button key={image.slice(0, 48) + index} type="button" className="relative" onClick={() => setDraft({ ...draft, images: draft.images.filter((_, item) => item !== index) })}>
                  <img src={image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/60 text-center text-[10px]">{t("removeImage")}</span>
                </button>
              ))}
            </div>
          )}
          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#b5a194]">{t("badges")}</legend>
            <div className="flex flex-wrap gap-2">
              {db.badges.map((badge) => (
                <label key={badge.id} className="flex items-center gap-2 rounded-full bg-[#1b1613] px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={draft.badges.includes(badge.id)} onChange={() => toggle("badges", badge.id)} />
                  {badge.label}
                </label>
              ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <TextInput value={newBadge.label} onChange={(event) => setNewBadge({ ...newBadge, label: event.target.value })} placeholder={`${t("addBadge")} · ${t("english")}`} aria-label={t("addBadge")} />
              <TextInput value={newBadge.labelAr} onChange={(event) => setNewBadge({ ...newBadge, labelAr: event.target.value })} placeholder={`${t("addBadge")} · ${t("arabic")}`} aria-label={t("arabic")} />
              <GhostButton onClick={addBadge}>{t("add")}</GhostButton>
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#b5a194]">{t("homepageSections")}</legend>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 rounded-full bg-[#1b1613] px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={draft.sections.includes(id)} onChange={() => toggle("sections", id)} />
                  {t(label)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-[11px] uppercase tracking-[0.16em] text-[#b5a194]">{t("benefits")}</legend>
            {draft.benefits.map((benefit, index) => (
              <div key={index} className="grid gap-2 rounded-2xl bg-[#120f0d] p-3">
                <div className="flex flex-wrap gap-1">
                  {ICON_NAMES.map((name) => {
                    const Icon = ICONS[name]
                    const selected = benefit.icon === name
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-label={name}
                        onClick={() => {
                          const benefits = draft.benefits.map((item, itemIndex) => (itemIndex === index ? { ...item, icon: name } : item))
                          setDraft({ ...draft, benefits })
                        }}
                        className={`grid h-9 w-9 place-items-center rounded-full ${selected ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}
                      >
                        <Icon size={16} />
                      </button>
                    )
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <TextInput
                    value={benefit.label}
                    aria-label={`${t("benefits")} ${t("english")}`}
                    placeholder={t("english")}
                    onChange={(event) => {
                      const benefits = draft.benefits.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item))
                      setDraft({ ...draft, benefits })
                    }}
                  />
                  <TextInput
                    value={benefit.labelAr || ""}
                    aria-label={`${t("benefits")} ${t("arabic")}`}
                    placeholder={t("arabic")}
                    onChange={(event) => {
                      const benefits = draft.benefits.map((item, itemIndex) => (itemIndex === index ? { ...item, labelAr: event.target.value } : item))
                      setDraft({ ...draft, benefits })
                    }}
                  />
                  <GhostButton onClick={() => setDraft({ ...draft, benefits: draft.benefits.filter((_, itemIndex) => itemIndex !== index) })}>{t("remove")}</GhostButton>
                </div>
              </div>
            ))}
            <GhostButton onClick={() => setDraft({ ...draft, benefits: [...draft.benefits, { icon: "Sparkles", label: "", labelAr: "" }] })}>{t("addBenefit")}</GhostButton>
          </fieldset>
          {error && <p className="mt-3 text-sm text-[#f0c2b8]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setDraft(null)}>{t("cancel")}</GhostButton>
            <PrimaryButton onClick={save}>{t("save")}</PrimaryButton>
          </div>
        </Modal>
      )}
      {removeId && <ConfirmDialog text={t("confirmDelete")} onCancel={() => setRemoveId(null)} onConfirm={remove} />}
    </div>
  )
}
