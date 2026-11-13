import { useEffect, useId, useMemo, useRef, useState } from "react"

const HEIGHT = 300
const PAD = { top: 20, right: 18, bottom: 44, left: 72 }

// Latin digits in both languages so figures stay easy to compare on the axis.
const numberLocale = (language) => (language === "ar" ? "ar-u-nu-latn" : "en-US")

export function formatCompact(value, language) {
  return new Intl.NumberFormat(numberLocale(language), { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

export function formatDay(stamp, language, withYear = false) {
  return new Intl.DateTimeFormat(numberLocale(language), {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(stamp)
}

export function formatFullDay(stamp, language) {
  return new Intl.DateTimeFormat(numberLocale(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(stamp)
}

function formatHour(stamp, language) {
  return new Intl.DateTimeFormat(numberLocale(language), { hour: "numeric", hour12: true }).format(stamp)
}

// "Nice" axis maximum and step so the Y ticks land on round, easy-to-read numbers.
function niceScale(max, ticks = 4) {
  const safe = Math.max(max, 1)
  const rough = safe / ticks
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / magnitude
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * magnitude
  return { step, max: step * Math.ceil(safe / step) }
}

function useWidth(ref) {
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const update = () => setWidth(Math.max(280, Math.round(node.getBoundingClientRect().width)))
    update()
    if (typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return width
}

// Evenly spaced X-axis label positions; the count adapts to the available width.
function tickIndexes(length, width) {
  if (length <= 1) return [0]
  const target = Math.max(2, Math.min(length, Math.floor((width - PAD.left - PAD.right) / 86)))
  const indexes = []
  for (let i = 0; i < target; i += 1) indexes.push(Math.round((i * (length - 1)) / (target - 1)))
  return [...new Set(indexes)]
}

/**
 * Area chart that can be hovered, dragged across (mouse or touch), clicked, or driven
 * with the arrow keys. Every point is a real day (or hour, for "today"); picking one
 * calls onSelect(index) so the dashboard can open that day's details.
 */
export function InteractiveChart({
  stamps,
  values,
  granularity = "day",
  language = "en",
  format,
  selected = -1,
  onSelect,
  stroke = "#e7d3c4",
  fill = "#c6a15b",
  describe,
  label,
}) {
  const gradientId = useId().replace(/:/g, "")
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState(-1)
  const dragging = useRef(false)

  const innerW = width - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const scale = useMemo(() => niceScale(Math.max(...values, 0)), [values])
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0
  const xAt = (index) => PAD.left + (values.length > 1 ? index * stepX : innerW / 2)
  const yAt = (value) => PAD.top + innerH - (value / scale.max) * innerH

  const points = values.map((value, index) => [xAt(index), yAt(value)])
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = points.length
    ? `${line} L${points[points.length - 1][0].toFixed(1)},${PAD.top + innerH} L${points[0][0].toFixed(1)},${PAD.top + innerH} Z`
    : ""

  const yTicks = []
  for (let value = 0; value <= scale.max + 0.0001; value += scale.step) yTicks.push(value)

  const spansYears = stamps.length > 1 && new Date(stamps[0]).getFullYear() !== new Date(stamps[stamps.length - 1]).getFullYear()
  const tickLabel = (stamp) => (granularity === "hour" ? formatHour(stamp, language) : formatDay(stamp, language, spansYears))

  const indexFromEvent = (event) => {
    const rect = wrapRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - PAD.left
    if (values.length <= 1) return 0
    return Math.max(0, Math.min(values.length - 1, Math.round(x / stepX)))
  }

  const onPointerDown = (event) => {
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const index = indexFromEvent(event)
    setHover(index)
    onSelect?.(index)
  }
  const onPointerMove = (event) => {
    const index = indexFromEvent(event)
    setHover(index)
    if (dragging.current) onSelect?.(index)
  }
  const endDrag = () => {
    dragging.current = false
  }
  const onKeyDown = (event) => {
    const current = selected >= 0 ? selected : values.length - 1
    let next = current
    if (event.key === "ArrowLeft") next = current - 1
    else if (event.key === "ArrowRight") next = current + 1
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = values.length - 1
    else return
    event.preventDefault()
    onSelect?.(Math.max(0, Math.min(values.length - 1, next)))
  }

  const active = hover >= 0 ? hover : selected
  const tipLeft = active >= 0 ? Math.min(Math.max(xAt(active), 90), width - 90) : 0

  return (
    <div ref={wrapRef} dir="ltr" className="relative select-none">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(values.length - 1, 0)}
        aria-valuenow={Math.max(selected, 0)}
        aria-valuetext={selected >= 0 ? describe?.(selected) : undefined}
        className="block cursor-crosshair touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (!dragging.current) setHover(-1)
        }}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.45" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={width - PAD.right} y1={yAt(value)} y2={yAt(value)} stroke={value === 0 ? "#5a4638" : "#3a2d26"} strokeDasharray={value === 0 ? undefined : "3 6"} />
            <text x={PAD.left - 10} y={yAt(value) + 5} textAnchor="end" fill="#f1e3d6" fontSize="14" fontWeight="600">
              {formatCompact(value, language)}
            </text>
          </g>
        ))}

        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && <path d={line} fill="none" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />}

        {tickIndexes(values.length, width).map((index) => (
          <g key={index}>
            <line x1={xAt(index)} x2={xAt(index)} y1={PAD.top + innerH} y2={PAD.top + innerH + 5} stroke="#5a4638" />
            <text x={xAt(index)} y={HEIGHT - 14} textAnchor={index === 0 ? "start" : index === values.length - 1 && values.length > 1 ? "end" : "middle"} fill="#e7d3c4" fontSize="13" fontWeight="500">
              {tickLabel(stamps[index])}
            </text>
          </g>
        ))}

        {selected >= 0 && selected < values.length && (
          <g>
            <line x1={xAt(selected)} x2={xAt(selected)} y1={PAD.top} y2={PAD.top + innerH} stroke="#c6a15b" strokeWidth="1.5" />
            <circle cx={xAt(selected)} cy={yAt(values[selected])} r="6.5" fill="#c6a15b" stroke="#1b1613" strokeWidth="3" />
          </g>
        )}
        {hover >= 0 && hover !== selected && (
          <g>
            <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#e7d3c4" strokeOpacity="0.5" strokeDasharray="4 4" />
            <circle cx={xAt(hover)} cy={yAt(values[hover])} r="5" fill={stroke} stroke="#1b1613" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {active >= 0 && active < values.length && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-[#5a4638] bg-[#120f0d]/95 px-3 py-2 text-center shadow-xl"
          style={{ left: tipLeft }}
        >
          <p className="whitespace-nowrap text-xs text-[#b5a194]">{describe ? describe(active) : tickLabel(stamps[active])}</p>
          <p className="whitespace-nowrap font-serif text-lg leading-tight text-[#f6f1eb]">{format ? format(values[active]) : values[active]}</p>
        </div>
      )}
    </div>
  )
}
