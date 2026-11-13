import { useState } from "react"
import { Plus } from "lucide-react"
import { customerStats, hashPassword, money, PERMISSIONS, removeMember, saveCustomer, saveMember } from "../../data/adminDb"
import { useAdmin } from "../context"
import { explain, Field, formatWhen, GhostButton, Modal, PageHead, Panel, PrimaryButton, Select, TextInput } from "../ui"

const STAFF_PERMS = PERMISSIONS.filter((item) => item !== "team")

export default function People() {
  const { db, t, language, notify, can, user } = useAdmin()
  const [tab, setTab] = useState(can("customers") ? "customers" : "team")
  const [customer, setCustomer] = useState(null)
  const [member, setMember] = useState(null)
  const [error, setError] = useState("")

  const savePerson = () => {
    const result = saveCustomer(customer, customer.id || null)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("saved"))
    setCustomer(null)
  }

  const saveTeam = async () => {
    let passwordHash = member.passwordHash
    if (member.password) passwordHash = await hashPassword(member.password)
    const result = saveMember({ ...member, passwordHash, active: member.active !== false }, member.id || null)
    if (!result.ok) {
      setError(explain(t, result))
      return
    }
    notify(t("memberSaved"))
    setMember(null)
  }

  return (
    <div className="space-y-5">
      <PageHead
        title={t("people")}
        text={tab === "team" ? t("teamLead") : t("customerLead")}
        action={
          tab === "customers" && can("customers") ? (
            <PrimaryButton
              onClick={() => {
                setError("")
                setCustomer({ name: "", email: "", phone: "", city: "" })
              }}
            >
              <Plus size={16} /> {t("addCustomer")}
            </PrimaryButton>
          ) : tab === "team" && can("team") ? (
            <PrimaryButton
              onClick={() => {
                setError("")
                setMember({ name: "", email: "", role: "staff", active: true, password: "", permissions: ["overview", "orders"] })
              }}
            >
              <Plus size={16} /> {t("team")}
            </PrimaryButton>
          ) : null
        }
      />

      <div className="flex gap-2">
        {can("customers") && (
          <button type="button" onClick={() => setTab("customers")} className={`rounded-full px-3.5 py-2 text-sm ${tab === "customers" ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}>
            {t("customers")}
          </button>
        )}
        {can("team") && (
          <button type="button" onClick={() => setTab("team")} className={`rounded-full px-3.5 py-2 text-sm ${tab === "team" ? "bg-[#c6a15b] text-[#2a1c16]" : "bg-[#1b1613] text-[#e7d3c4]"}`}>
            {t("team")}
          </button>
        )}
      </div>

      {tab === "customers" && can("customers") && (
        <div className="grid gap-3">
          {db.customers
            .filter((item) => item.id !== "guest-store")
            .map((person) => {
              const stats = customerStats(db, person.id)
              return (
                <Panel key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-xs text-[#b5a194]">
                      {person.email} · {person.city}
                    </p>
                  </div>
                  <div className="text-sm text-[#e7d3c4]">
                    <p>{formatWhen(person.registeredAt, language)}</p>
                    <p className="text-xs text-[#b5a194]">
                      {stats.orders} {t("ordersCount")} · {money(stats.spent, language)}
                    </p>
                  </div>
                  <GhostButton
                    onClick={() => {
                      setError("")
                      setCustomer(person)
                    }}
                  >
                    {t("edit")}
                  </GhostButton>
                </Panel>
              )
            })}
        </div>
      )}

      {tab === "team" && can("team") && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {db.team.map((person) => (
              <Panel key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {person.name} {person.email === user.email && <span className="text-xs text-[#e4c99a]">· {t("you")}</span>}
                  </p>
                  <p className="text-xs text-[#b5a194]">
                    {person.email} · {person.role === "admin" ? t("adminRole") : t("staffRole")}
                    {!person.active && ` · ${t("inactive")}`}
                  </p>
                </div>
                <p className="max-w-xs text-xs text-[#b5a194]">
                  {person.role === "admin" ? t("fullAccess") : person.permissions.map((item) => t(permKey(item))).join(" · ")}
                </p>
                <div className="flex gap-2">
                  <GhostButton
                    onClick={() => {
                      setError("")
                      setMember({ ...person, password: "" })
                    }}
                  >
                    {t("edit")}
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      const result = removeMember(person.id)
                      notify(result.ok ? t("saved") : explain(t, result))
                    }}
                  >
                    {t("remove")}
                  </GhostButton>
                </div>
              </Panel>
            ))}
          </div>
          <Panel className="p-4">
            <h2 className="text-sm text-[#e7d3c4]">{t("audit")}</h2>
            <ul className="mt-3 space-y-2">
              {(db.audit || []).slice(0, 8).map((entry) => (
                <li key={entry.at + entry.message} className="flex flex-wrap justify-between gap-2 text-xs text-[#b5a194]">
                  <span>{entry.message}</span>
                  <span>
                    {entry.email} · {formatWhen(entry.at, language)}
                  </span>
                </li>
              ))}
              {(db.audit || []).length === 0 && <li className="text-sm text-[#b5a194]">{t("noResults")}</li>}
            </ul>
          </Panel>
        </div>
      )}

      {customer && (
        <Modal title={customer.id ? t("edit") : t("addCustomer")} onClose={() => setCustomer(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("name")}>
              <TextInput value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
            </Field>
            <Field label={t("email")}>
              <TextInput value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
            </Field>
            <Field label={t("phone")}>
              <TextInput value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
            </Field>
            <Field label={t("city")}>
              <TextInput value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} />
            </Field>
          </div>
          {error && <p className="mt-3 text-sm text-[#f0c2b8]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setCustomer(null)}>{t("cancel")}</GhostButton>
            <PrimaryButton onClick={savePerson}>{t("save")}</PrimaryButton>
          </div>
        </Modal>
      )}

      {member && (
        <Modal title={member.id ? t("edit") : t("team")} onClose={() => setMember(null)}>
          <div className="grid gap-3">
            <Field label={t("name")}>
              <TextInput value={member.name} onChange={(event) => setMember({ ...member, name: event.target.value })} />
            </Field>
            <Field label={t("email")}>
              <TextInput value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} />
            </Field>
            <Field label={t("role")}>
              <Select value={member.role} onChange={(event) => setMember({ ...member, role: event.target.value })}>
                <option value="admin">{t("adminRole")}</option>
                <option value="staff">{t("staffRole")}</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={member.active !== false} onChange={(event) => setMember({ ...member, active: event.target.checked })} />
              {t("activeUser")}
            </label>
            <Field label={t("newPassword")}>
              <TextInput type="password" value={member.password || ""} placeholder={member.id ? t("resetHint") : t("passwordRule")} onChange={(event) => setMember({ ...member, password: event.target.value })} />
            </Field>
            {member.role === "admin" ? (
              <p className="text-sm text-[#e4c99a]">{t("fullAccess")}</p>
            ) : (
              <fieldset>
                <legend className="mb-2 text-xs text-[#b5a194]">{t("permissions")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STAFF_PERMS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(member.permissions || []).includes(perm)}
                        onChange={(event) => {
                          const current = new Set(member.permissions || [])
                          if (event.target.checked) current.add(perm)
                          else current.delete(perm)
                          setMember({ ...member, permissions: [...current] })
                        }}
                      />
                      {t(permKey(perm))}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-[#f0c2b8]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setMember(null)}>{t("cancel")}</GhostButton>
            <PrimaryButton onClick={saveTeam}>{t("save")}</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  )
}

function permKey(perm) {
  return (
    {
      overview: "overviewPerm",
      orders: "ordersPerm",
      products: "productsPerm",
      "products.delete": "deletePerm",
      categories: "categoriesPerm",
      customers: "customersPerm",
      settings: "settingsPerm",
      reviews: "reviewsPerm",
      brands: "brandsPerm",
    }[perm] || perm
  )
}
