import { useEffect, useRef, useState } from "react"
import { ImagePlus, Trash2, Upload } from "lucide-react"
import { useAdmin } from "./context"

export function Panel({ className = "", children }) {
  return <section className={`rounded-3xl border border-[#3a2d26] bg-[#1b1613] ${className}`}>{children}</section>
}

export function PageHead({ title, text, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl tracking-[-0.03em] text-[#f6f1eb] sm:text-4xl">{title}</h1>
        {text && <p className="mt-1 max-w-xl text-sm text-[#b5a194]">{text}</p>}
      </div>
      {action}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs tracking-wide text-[#b5a194]">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb] outline-none placeholder:text-[#8d7568] focus:border-[#c6a15b] ${props.className || ""}`}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb] outline-none placeholder:text-[#8d7568] focus:border-[#c6a15b] ${props.className || ""}`}
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-[#3a2d26] bg-[#120f0d] px-3 py-2.5 text-sm text-[#f6f1eb] outline-none focus:border-[#c6a15b] ${props.className || ""}`}
    />
  )
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#c6a15b] px-4 py-2.5 text-sm font-medium text-[#2a1c16] transition hover:bg-[#d8b56d] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#3a2d26] px-4 py-2.5 text-sm text-[#f6f1eb] transition hover:border-[#c6a15b] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

const TONES = {
  pending: "bg-[#3a2d22] text-[#e7d3c4]",
  confirmed: "bg-[#2c3330] text-[#d5e4d4]",
  preparing: "bg-[#332818] text-[#e4c99a]",
  out: "bg-[#2a3038] text-[#d5deea]",
  delivered: "bg-[#24342b] text-[#b7e0c4]",
  returned: "bg-[#3a2422] text-[#f0c2b8]",
}

export function StatusPill({ status, label }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ${TONES[status] || TONES.pending}`}>{label}</span>
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={onClose}>
      <div
        className="admin-scroll max-h-[min(92dvh,820px)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#3a2d26] bg-[#1b1613] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-[#f6f1eb]">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[#b5a194]">
            <CloseLabel />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CloseLabel() {
  const { t } = useAdmin()
  return t("close")
}

export function ConfirmDialog({ text, onCancel, onConfirm }) {
  const { t } = useAdmin()
  return (
    <Modal title={t("confirm")} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-[#e7d3c4]">{text}</p>
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>{t("cancel")}</GhostButton>
        <PrimaryButton onClick={onConfirm}>{t("confirm")}</PrimaryButton>
      </div>
    </Modal>
  )
}

export function explain(t, result) {
  if (!result || result.ok) return ""
  if (result.reason === "stock") return t("stockShort")
  if (result.reason === "storage") return t("storageFull")
  if (result.reason === "sku") return t("skuTaken")
  if (result.reason === "busy") return t("categoryBlocked")
  if (result.reason === "last-admin") return t("lastAdmin")
  if (result.reason === "email") return t("emailTaken")
  if (result.reason === "password") return t("passwordRule")
  if (result.reason === "mismatch") return t("passwordMismatch")
  if (result.reason === "forbidden") return t("accessDenied")
  return t("invalidForm")
}

// Reads an image picked on the admin's own device, shrinks it, and returns a data URL.
// Photos straight off a phone are several megabytes, so they are scaled down (longest
// side `max`) and re-encoded; that keeps the saved catalogue small enough for the
// browser's storage while still looking sharp on the storefront.
export function readImage(file, { max = 1200, quality = 0.84 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("type"))
      return
    }
    if (file.size > 12_000_000) {
      reject(new Error("size"))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        const width = Math.max(1, Math.round(img.naturalWidth * ratio))
        const height = Math.max(1, Math.round(img.naturalHeight * ratio))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        context.drawImage(img, 0, 0, width, height)
        // WebP keeps transparency (brand logos) at a fraction of PNG's size; browsers
        // without WebP encoding silently return PNG, which is still valid.
        let output = canvas.toDataURL("image/webp", quality)
        if (output.length > 700_000) output = canvas.toDataURL("image/jpeg", 0.7)
        resolve(output)
      } catch {
        reject(new Error("read"))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("type"))
    }
    img.src = url
  })
}

// Drop-zone + file picker for choosing an image from the admin's device.
export function ImageField({ label, value, onChange, max = 900, rounded = "rounded-2xl" }) {
  const { t } = useAdmin()
  const input = useRef(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const take = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await readImage(file, { max }))
      setError("")
    } catch (reason) {
      setError(reason.message === "size" ? t("imageLarge") : t("imageType"))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div>
      {label && <span className="mb-1.5 block text-xs tracking-wide text-[#b5a194]">{label}</span>}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          take(event.dataTransfer.files?.[0])
        }}
        className={`flex flex-wrap items-center gap-4 border border-dashed p-3 transition ${rounded} ${over ? "border-[#c6a15b] bg-[#241b15]" : "border-[#3a2d26] bg-[#120f0d]"}`}
      >
        {value ? (
          <img src={value} alt="" className={`h-24 w-24 shrink-0 object-cover ${rounded}`} />
        ) : (
          <span className={`grid h-24 w-24 shrink-0 place-items-center bg-[#1b1613] text-[#8d7568] ${rounded}`}>
            <ImagePlus size={26} />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs leading-relaxed text-[#b5a194]">{busy ? t("imageProcessing") : t("imageHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[#c6a15b] px-3.5 py-2 text-xs font-medium text-[#2a1c16] transition hover:bg-[#d8b56d] disabled:opacity-50"
            >
              <Upload size={14} />
              {value ? t("replaceImage") : t("uploadImage")}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-2 rounded-full border border-[#3a2d26] px-3.5 py-2 text-xs text-[#f0c2b8] transition hover:border-[#c6a15b]"
              >
                <Trash2 size={14} />
                {t("removeImage")}
              </button>
            )}
          </div>
        </div>
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(event) => take(event.target.files?.[0])} />
      </div>
      {error && <p className="mt-1.5 text-xs text-[#f0c2b8]">{error}</p>}
    </div>
  )
}

export function formatWhen(value, language) {
  return new Date(value).toLocaleString(language === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
