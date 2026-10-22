import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { ROUTE_COLOR, ROUTE_FAST_COLOR, ROUTE_STOP_COLOR } from '../../components/maplibre'
import { TRIM_MIN_S, TRIM_STEP_S } from '../../lib/trim'
import { paceCategory, type PaceCategory } from '../../lib/walkStory'

const COLORS: Record<PaceCategory, string> = { tranquille: ROUTE_COLOR, rapide: ROUTE_FAST_COLOR, arret: ROUTE_STOP_COLOR }
const HEIGHT = 96
const TOP_KMH = 7

interface Props {
  /** L’allure de toute la balade, minute par minute (km/h). */
  pace: number[]
  /** Bornes du trajet daté (secondes depuis le départ). */
  first: number
  last: number
  startS: number
  endS: number
  onChange: (startS: number, endS: number) => void
  /** « 8 h 14 » (ou « 3 min après le départ ») pour une seconde donnée. */
  label: (s: number) => string
}

/**
 * La courbe d’allure avec deux poignées (V6 § 8.3) : le début et la fin gardés. Chaque poignée est un curseur de 44 px
 * (glisser, flèches du clavier par 15 s, Page haut/bas par minute, balayage VoiceOver vers le haut ou le bas).
 * Les minutes coupées passent en pâle.
 */
export function TrimChart({ pace, first, last, startS, endS, onChange, label }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const span = Math.max(1, last - first)
  const x = (s: number) => ((s - first) / span) * 100
  const clamp = (which: 'start' | 'end', s: number) => (which === 'start' ? Math.max(first, Math.min(s, endS - TRIM_MIN_S)) : Math.min(last, Math.max(s, startS + TRIM_MIN_S)))
  const set = (which: 'start' | 'end', s: number) => {
    const value = Math.round(clamp(which, s))
    if (which === 'start') onChange(value, endS)
    else onChange(startS, value)
  }
  const fromPointer = (which: 'start' | 'end', e: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    set(which, first + ((e.clientX - rect.left) / rect.width) * span)
  }
  const onKey = (which: 'start' | 'end') => (e: KeyboardEvent) => {
    const step = { ArrowRight: TRIM_STEP_S, ArrowUp: TRIM_STEP_S, ArrowLeft: -TRIM_STEP_S, ArrowDown: -TRIM_STEP_S, PageUp: 60, PageDown: -60 }[e.key]
    const jump = e.key === 'Home' ? first : e.key === 'End' ? last : undefined
    if (step === undefined && jump === undefined) return
    e.preventDefault()
    set(which, jump ?? (which === 'start' ? startS : endS) + step!)
  }
  const w = 100 / Math.max(1, pace.length)

  const handle = (which: 'start' | 'end') => {
    const value = which === 'start' ? startS : endS
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={which === 'start' ? 'Début de la balade' : 'Fin de la balade'}
        aria-valuemin={first}
        aria-valuemax={last}
        aria-valuenow={value}
        aria-valuetext={label(value)}
        onKeyDown={onKey(which)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(which, e)
        }}
        onPointerMove={(e) => e.buttons && fromPointer(which, e)}
        className="absolute top-0 z-10 flex h-full w-11 -translate-x-1/2 touch-none items-stretch justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        style={{ left: `${x(value)}%` }}
      >
        <span aria-hidden="true" className="relative w-1 rounded-full bg-text">
          <span className="absolute top-1/2 left-1/2 flex h-9 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-solid border-text bg-surface shadow-[0_1px_4px_rgba(24,32,30,0.3)]">
            <span className="h-3.5 w-0.5 rounded-full bg-text" />
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="relative mx-[22px] select-none" style={{ height: HEIGHT }}>
        <svg width="100%" height={HEIGHT} viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="block">
          {pace.map((kmh, i) => {
            const h = Math.max(3, (Math.min(kmh, TOP_KMH) / TOP_KMH) * (HEIGHT - 8))
            const minuteStart = first + i * 60
            const kept = minuteStart + 60 > startS && minuteStart < endS
            return <rect key={i} x={i * w + w * 0.1} y={HEIGHT - h} width={w * 0.8} height={h} rx={Math.min(1, w * 0.3)} fill={COLORS[paceCategory(kmh)]} opacity={kept ? 1 : 0.22} />
          })}
        </svg>
        {handle('start')}
        {handle('end')}
      </div>
      <p aria-hidden="true" className="m-0 flex justify-between text-[0.8824rem] font-semibold tabular-nums">
        <span>{label(startS)}</span>
        <span>{label(endS)}</span>
      </p>
    </div>
  )
}
