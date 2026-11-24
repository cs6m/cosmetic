import { useState } from "react"
import { deleteFaq, deleteSocial, labelCategory, saveBanners, saveFaq, saveHomepage, saveSocial, textOf } from "../../data/adminDb"
import { useAdmin } from "../context"
import { ConfirmDialog, explain, Field, GhostButton, ImageField, Modal, PageHead, Panel, PrimaryButton, Select, TextArea, TextInput } from "../ui"

const SECTION_TARGETS = [
  ["shop-categories", "categories"],
  ["featured", "featuredSection"],
  ["black-friday", "blackFridaySection"],
  ["new-products", "newSection"],
  ["weekly-offers", "weeklySection"],
]

const SECTIONS = [
  ["featured", "featuredSection"],
  ["black-friday", "blackFridaySection"],
  ["new-products", "newSection"],
  ["weekly-offers", "weeklySection"],
]

function linkKind(link) {
  const value = String(link || "")
  if (value.startsWith("category:")) return "category"
  if (value.startsWith("product:")) return "product"
  if (/^https:\/\//.test(value)) return "custom"
  return "section"
}

function BannerDestination({ banner, setBanner, db, t, language }) {
  const kind = linkKind(banner.link)
  const sectionId = String(banner.link || "").replace(/^section:/, "")
  const setKind = (next) => {
    if (next === "section") setBanner({ ...banner, link: `section:${SECTION_TARGETS.some((item) => item[0] === sectionId) ? sectionId : "shop-categories"}` })
    if (next === "category") setBanner({ ...banner, link: `category:${db.categories[0]?.id || ""}` })
    if (next === "product") setBanner({ ...banner, link: `product:${db.products[0]?.id || ""}` })
    if (next === "custom") setBanner({ ...banner, link: /^https:\/\//.test(banner.link || "") ? banner.link : "https://" })
  }
  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <Field label={t("bannerLink")}>
        <Select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="section">{t("destSection")}</option>
          <option value="category">{t("destCategory")}</option>
          <option value="product">{t("destProduct")}</option>
          <option value="custom">{t("destCustom")}</option>
        </Select>
      </Field>
      {kind === "section" && (
        <Field label={t("destSection")}>
          <Select value={SECTION_TARGETS.some((item) => item[0] === sectionId) ? sectionId : "shop-categories"} onChange={(event) => setBanner({ ...banner, link: `section:${event.target.value}` })}>
            {SECTION_TARGETS.map(([id, label]) => (
              <option key={id} value={id}>
                {textOf(db.settings.offers?.[id], language, "title") || (id === "featured" ? (language === "ar" ? db.cms?.featuredTitleAr : db.cms?.featuredTitle) : "") || t(label)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {kind === "category" && (
        <Field label={t("destCategory")}>
          <Select value={String(banner.link || "").slice(9)} onChange={(event) => setBanner({ ...banner, link: `category:${event.target.value}` })}>
            {db.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {labelCategory(category, language)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {kind === "product" && (
        <Field label={t("destProduct")}>
          <Select value={String(banner.link || "").slice(8)} onChange={(event) => setBanner({ ...banner, link: `product:${event.target.value}` })}>
            {db.products.map((product) => (
              <option key={product.id} value={product.id}>
                {textOf(product, language, "name")}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {kind === "custom" && (
        <Field label={t("destCustom")}>
          <TextInput value={banner.link || ""} onChange={(event) => setBanner({ ...banner, link: event.target.value })} />
        </Field>
      )}
    </div>
  )
}
export default function Content() {
  const { db, t, notify, language } = useAdmin()
  const [home, setHome] = useState(db.settings)
  const [banner, setBanner] = useState(null)
  const [link, setLink] = useState(null)
  const [faq, setFaq] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState("")
  const [remove, setRemove] = useState(null)

  const saveHome = () => {
    const result = saveHomepage(home)
    notify(result.ok ? t("saved") : explain(t, result))
  }

  const saveLink = () => {
    const result = saveSocial(link, editing)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setLink(null)
  }

  const saveTopic = () => {
    const result = saveFaq(faq, editing)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setFaq(null)
  }

  const saveBanner = () => {
    const next = editing
      ? db.banners.map((item) => (item.id === editing ? { ...banner, id: editing } : item))
      : [...db.banners, { ...banner, id: `banner-${Date.now()}` }]
    const result = saveBanners(next)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setBanner(null)
  }

  const confirmRemove = () => {
    const result =
      remove.kind === "social"
        ? deleteSocial(remove.id)
        : remove.kind === "banner"
          ? saveBanners(db.banners.filter((item) => item.id !== remove.id))
          : deleteFaq(remove.id)
    setRemove(null)
    notify(result.ok ? t("saved") : explain(t, result))
  }

  return (
    <div className="space-y-5">
      <PageHead title={t("content")} text={t("contentLead")} />
      {error && !link && !faq && !banner && <p className="text-sm text-[#f0c2b8]">{error}</p>}

      <Panel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{t("banners")}</h2>
          <GhostButton
            onClick={() => {
              setEditing(null)
              setError("")
              setBanner({ title: "", titleAr: "", text: "", textAr: "", button: "", buttonAr: "", link: "section:shop-categories", image: "" })
            }}
          >
            {t("addBanner")}
          </GhostButton>
        </div>
        {db.banners.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#120f0d] p-3">
            {item.image ? <img src={item.image} alt="" className="h-16 w-28 rounded-xl object-cover" /> : <span className="h-16 w-28 rounded-xl bg-[#1b1613]" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="truncate text-xs text-[#b5a194]">{item.titleAr}</p>
            </div>
            <GhostButton
              onClick={() => {
                setEditing(item.id)
                setError("")
                setBanner({ ...item })
              }}
            >
              {t("edit")}
            </GhostButton>
            <GhostButton className="text-[#f0c2b8]" onClick={() => setRemove({ kind: "banner", id: item.id })}>
              {t("remove")}
            </GhostButton>
          </div>
        ))}
      </Panel>

      {SECTIONS.map(([id, label]) => (
        <Panel key={id} className="grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-serif text-xl sm:col-span-2">{textOf(home.offers?.[id], language, "title") || t(label)}</h2>
          <Field label={`${t("kicker")} · ${t("english")}`}>
            <TextInput value={home.offers?.[id]?.kicker || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], kicker: event.target.value } } })} />
          </Field>
          <Field label={`${t("kicker")} · ${t("arabic")}`}>
            <TextInput value={home.offers?.[id]?.kickerAr || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], kickerAr: event.target.value } } })} />
          </Field>
          <Field label={`${t("title")} · ${t("english")}`}>
            <TextInput value={home.offers?.[id]?.title || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], title: event.target.value } } })} />
          </Field>
          <Field label={`${t("title")} · ${t("arabic")}`}>
            <TextInput value={home.offers?.[id]?.titleAr || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], titleAr: event.target.value } } })} />
          </Field>
          <Field label={`${t("blurb")} · ${t("english")}`}>
            <TextInput value={home.offers?.[id]?.text || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], text: event.target.value } } })} />
          </Field>
          <Field label={`${t("blurb")} · ${t("arabic")}`}>
            <TextInput value={home.offers?.[id]?.textAr || ""} onChange={(event) => setHome({ ...home, offers: { ...home.offers, [id]: { ...home.offers?.[id], textAr: event.target.value } } })} />
          </Field>
          <div className="sm:col-span-2">
            <ImageField
              label={t("bannerImage")}
              value={home.offers?.[id]?.image || ""}
              onChange={(image) => setHome((current) => ({ ...current, offers: { ...current.offers, [id]: { ...current.offers?.[id], image } } }))}
            />
          </div>
        </Panel>
      ))}
      <div className="flex justify-end">
        <PrimaryButton onClick={saveHome}>{t("save")}</PrimaryButton>
      </div>

      <Panel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{t("socials")}</h2>
          <GhostButton
            onClick={() => {
              setEditing(null)
              setError("")
              setLink({ label: "", href: "https://" })
            }}
          >
            {t("addLink")}
          </GhostButton>
        </div>
        {db.socials.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#120f0d] px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-sm">
              {item.label} · {item.href}
            </p>
            <GhostButton
              onClick={() => {
                setEditing(item.id)
                setError("")
                setLink({ label: item.label, href: item.href })
              }}
            >
              {t("edit")}
            </GhostButton>
            <GhostButton className="text-[#f0c2b8]" onClick={() => setRemove({ kind: "social", id: item.id })}>
              {t("remove")}
            </GhostButton>
          </div>
        ))}
      </Panel>

      <Panel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{t("faqs")}</h2>
          <GhostButton
            onClick={() => {
              setEditing(null)
              setError("")
              setFaq({ question: "", answer: "", questionAr: "", answerAr: "" })
            }}
          >
            {t("addFaq")}
          </GhostButton>
        </div>
        {db.faqs.map((item) => (
          <div key={item.id} className="rounded-2xl bg-[#120f0d] p-3">
            <p className="font-medium">{item.question}</p>
            <p className="mt-1 text-sm text-[#b5a194]">{item.answer}</p>
            <div className="mt-2 flex gap-2">
              <GhostButton
                onClick={() => {
                  setEditing(item.id)
                  setError("")
                  setFaq({ ...item })
                }}
              >
                {t("edit")}
              </GhostButton>
              <GhostButton className="text-[#f0c2b8]" onClick={() => setRemove({ kind: "faq", id: item.id })}>
                {t("remove")}
              </GhostButton>
            </div>
          </div>
        ))}
      </Panel>

      {banner && (
        <Modal title={t("banners")} onClose={() => setBanner(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("title")} · ${t("english")}`}>
              <TextInput value={banner.title} onChange={(event) => setBanner({ ...banner, title: event.target.value })} />
            </Field>
            <Field label={`${t("title")} · ${t("arabic")}`}>
              <TextInput value={banner.titleAr} onChange={(event) => setBanner({ ...banner, titleAr: event.target.value })} />
            </Field>
            <Field label={`${t("blurb")} · ${t("english")}`}>
              <TextArea value={banner.text} onChange={(event) => setBanner({ ...banner, text: event.target.value })} />
            </Field>
            <Field label={`${t("blurb")} · ${t("arabic")}`}>
              <TextArea value={banner.textAr} onChange={(event) => setBanner({ ...banner, textAr: event.target.value })} />
            </Field>
            <Field label={`${t("heroButton")} · ${t("english")}`}>
              <TextInput value={banner.button} onChange={(event) => setBanner({ ...banner, button: event.target.value })} />
            </Field>
            <Field label={`${t("heroButton")} · ${t("arabic")}`}>
              <TextInput value={banner.buttonAr} onChange={(event) => setBanner({ ...banner, buttonAr: event.target.value })} />
            </Field>
            <BannerDestination banner={banner} setBanner={setBanner} db={db} t={t} language={language} />
            <div className="sm:col-span-2">
              <ImageField label={t("bannerImage")} value={banner.image || ""} onChange={(image) => setBanner((current) => ({ ...current, image }))} />
            </div>
            {error && <p className="text-sm text-[#f0c2b8] sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <GhostButton onClick={() => setBanner(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={saveBanner}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
      {link && (
        <Modal title={t("socials")} onClose={() => setLink(null)}>
          <div className="grid gap-3">
            <Field label={t("name")}>
              <TextInput value={link.label} onChange={(event) => setLink({ ...link, label: event.target.value })} />
            </Field>
            <Field label={t("linkUrl")}>
              <TextInput value={link.href} onChange={(event) => setLink({ ...link, href: event.target.value })} />
            </Field>
            {error && <p className="text-sm text-[#f0c2b8]">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setLink(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={saveLink}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
      {faq && (
        <Modal title={t("faqs")} onClose={() => setFaq(null)}>
          <div className="grid gap-3">
            <Field label={`${t("question")} · ${t("english")}`}>
              <TextInput value={faq.question} onChange={(event) => setFaq({ ...faq, question: event.target.value })} />
            </Field>
            <Field label={`${t("answer")} · ${t("english")}`}>
              <TextArea value={faq.answer} onChange={(event) => setFaq({ ...faq, answer: event.target.value })} />
            </Field>
            <Field label={`${t("question")} · ${t("arabic")}`}>
              <TextInput value={faq.questionAr} onChange={(event) => setFaq({ ...faq, questionAr: event.target.value })} />
            </Field>
            <Field label={`${t("answer")} · ${t("arabic")}`}>
              <TextArea value={faq.answerAr} onChange={(event) => setFaq({ ...faq, answerAr: event.target.value })} />
            </Field>
            {error && <p className="text-sm text-[#f0c2b8]">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setFaq(null)}>{t("cancel")}</GhostButton>
              <PrimaryButton onClick={saveTopic}>{t("save")}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
      {remove && <ConfirmDialog text={t("confirmDelete")} onCancel={() => setRemove(null)} onConfirm={confirmRemove} />}
    </div>
  )
}
