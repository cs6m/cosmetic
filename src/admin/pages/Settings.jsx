import { useState } from "react"
import { changePassword, money, saveSettings } from "../../data/adminDb"
import { normalizeGovernorates } from "../../checkout"
import { useAdmin } from "../context"
import { explain, Field, GhostButton, PageHead, Panel, PrimaryButton, TextInput } from "../ui"

const MAX_PRICE = 1_000_000

export default function Settings() {
  const { db, t, language, notify } = useAdmin()
  const [form, setForm] = useState(db.settings)
  // Prices are edited as text so a field can be empty while typing.
  const [zones, setZones] = useState(() =>
    normalizeGovernorates(db.settings.governorates).map((item) => ({ ...item, price: String(item.price) })),
  )
  const [bulk, setBulk] = useState("")
  const [passwords, setPasswords] = useState({ current: "", next: "" })
  const [error, setError] = useState("")

  const enabledCount = zones.filter((item) => item.enabled).length
  const patchZone = (id, patch) => setZones((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  const setAll = (patch) => setZones((list) => list.map((item) => ({ ...item, ...patch })))

  const applyBulk = () => {
    const value = Number(bulk)
    if (bulk === "" || !Number.isFinite(value) || value < 0 || value > MAX_PRICE) {
      notify(t("priceInvalid"))
      return
    }
    setAll({ price: String(Math.round(value)) })
  }

  const save = () => {
    const bad = zones.find((item) => {
      const value = Number(item.price)
      return item.price === "" || !Number.isFinite(value) || value < 0 || value > MAX_PRICE
    })
    if (bad) {
      notify(`${t("priceInvalid")} (${language === "ar" ? bad.ar : bad.en})`)
      return
    }
    const result = saveSettings({
      storeName: form.storeName,
      supportEmail: form.supportEmail,
      lowStock: form.lowStock,
      governorates: zones.map((item) => ({ id: item.id, enabled: item.enabled, price: Math.round(Number(item.price)) })),
    })
    notify(result.ok ? t("settingsSaved") : explain(t, result))
  }

  const updatePassword = async () => {
    const result = await changePassword(passwords.current, passwords.next)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    setPasswords({ current: "", next: "" })
    setError("")
    notify(t("passwordUpdated"))
  }

  return (
    <div className="space-y-5">
      <PageHead title={t("settings")} text={t("settingsLead")} />
      <Panel className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label={t("storeName")}>
          <TextInput value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} />
        </Field>
        <Field label={t("supportEmail")}>
          <TextInput value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} />
        </Field>
        <Field label={t("currency")}>
          <div className="flex items-center justify-between rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb]">
            <span>{t("currencyIqd")}</span>
            <span className="text-xs text-[#b5a194]">{money(1000, language)}</span>
          </div>
        </Field>
        <Field label={t("lowStockAt")}>
          <TextInput type="number" min="1" value={form.lowStock} onChange={(event) => setForm({ ...form, lowStock: event.target.value })} />
        </Field>
      </Panel>

      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">{t("governorates")}</h2>
            <p className="mt-1 max-w-xl text-sm text-[#b5a194]">{t("governoratesLead")}</p>
          </div>
          <span className="rounded-full bg-[#2a211c] px-3 py-1.5 text-xs text-[#e4c99a]">
            {enabledCount} / {zones.length} {t("zonesActive")}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-2xl bg-[#120f0d] p-3">
          <div className="min-w-[160px] flex-1">
            <Field label={t("samePrice")}>
              <TextInput
                type="number"
                min="0"
                step="250"
                inputMode="numeric"
                value={bulk}
                placeholder="5000"
                onChange={(event) => setBulk(event.target.value)}
              />
            </Field>
          </div>
          <GhostButton onClick={applyBulk}>{t("applyToAll")}</GhostButton>
          <GhostButton onClick={() => setAll({ enabled: true })}>{t("enableAll")}</GhostButton>
          <GhostButton onClick={() => setAll({ enabled: false })}>{t("disableAll")}</GhostButton>
        </div>

        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {zones.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${item.enabled ? "border-[#3a2d26] bg-[#120f0d]" : "border-[#2c241f] bg-[#161210] opacity-70"}`}
            >
              <button
                type="button"
                role="switch"
                aria-checked={item.enabled}
                aria-label={`${t("deliveryEnabled")}: ${language === "ar" ? item.ar : item.en}`}
                onClick={() => patchZone(item.id, { enabled: !item.enabled })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${item.enabled ? "bg-[#c6a15b]" : "bg-[#3a2d26]"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#f6f1eb] transition-all ${item.enabled ? "start-[1.375rem]" : "start-0.5"}`} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{language === "ar" ? item.ar : item.en}</p>
                <p className="truncate text-[11px] text-[#b5a194]">{language === "ar" ? item.en : item.ar}</p>
              </div>
              <label className="flex items-center gap-2">
                <span className="sr-only">{t("deliveryPrice")}</span>
                <input
                  type="number"
                  min="0"
                  max={MAX_PRICE}
                  step="250"
                  inputMode="numeric"
                  value={item.price}
                  disabled={!item.enabled}
                  onChange={(event) => patchZone(item.id, { price: event.target.value })}
                  className="w-28 rounded-xl border border-[#3a2d26] bg-[#1b1613] px-3 py-2 text-end text-sm text-[#f6f1eb] outline-none focus:border-[#c6a15b] disabled:opacity-50"
                />
                <span className="w-9 text-xs text-[#b5a194]">{language === "ar" ? "د.ع" : "IQD"}</span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex justify-end">
        <PrimaryButton onClick={save}>{t("saveSettings")}</PrimaryButton>
      </div>

      <Panel className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">{t("changePassword")}</h2>
        <Field label={t("currentPassword")}>
          <TextInput type="password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} />
        </Field>
        <Field label={t("newPassword")}>
          <TextInput type="password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} />
        </Field>
        {error && <p className="text-sm text-[#f0c2b8] sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <PrimaryButton onClick={updatePassword}>{t("changePassword")}</PrimaryButton>
        </div>
      </Panel>
    </div>
  )
}
