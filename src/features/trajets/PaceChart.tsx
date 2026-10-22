import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ROUTE_COLOR, ROUTE_FAST_COLOR, ROUTE_STOP_COLOR } from '../../components/maplibre'
import type { Route } from '../../lib/route'
import { kmhText, PACE_LABELS, paceAt, paceSummary } from '../../lib/walkSheet'
import { paceCategory, type PaceCategory } from '../../lib/walkStory'

const COLORS: Record<PaceCategory, string> = { tranquille: ROUTE_COLOR, rapide: ROUTE_FAST_COLOR, arret: ROUTE_STOP_COLOR }
const HEIGHT = 88
/** L’échelle : 7 km/h en haut (une marche rapide de chien) ; au-delà, la barre touche le haut. */
const TOP_KMH = 7

/**
 * L’allure minute par minute (V6 § 6.1) : une barre par minute, colorée comme le tracé. Glisser le doigt montre l’heure,
 * la vitesse et la rue, et pose un repère sur la carte (`onScrub`). Pour VoiceOver et le clavier, c’est un curseur
 * (flèches, balayage vers le haut ou le bas) avec un résumé de la balade.
 */
export function PaceChart({ route, onScrub }: { route: Route; onScrub: (at: { lat: number; lng: number } | undefined) => void }) {
  const pace = route.pace ?? []
  const [minute, setMinute] = useState<number>()
  const box = useRef<HTMLDivElement>(null)
  const info = minute !== undefined ? paceAt(route, minute) : undefined

  const pick = (m: number | undefined) => {
    setMinute(m)
    onScrub(m !== undefined ? paceAt(route, m)?.at : undefined)
  }
  const fromPointer = (e: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect || !pace.length) return
    pick(Math.max(0, Math.min(pace.length - 1, Math.floor(((e.clientX - rect.left) / rect.width) * pace.length))))
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!step) return
    e.preventDefault()
    pick(Math.max(0, Math.min(pace.length - 1, (minute ?? -1) + step)))
  }
  const valueText = (i: typeof info) => (i ? [i.clock, kmhText(i.kmh), PACE_LABELS[i.category], i.street].filter(Boolean).join(', ') : 'Glissez pour revoir la balade')
  const w = 100 / Math.max(1, pace.length)

  return (
    <div className="flex flex-col gap-2">
      {/* La ligne du doigt : réservée (pas de saut de mise en page), vide tant qu’on ne touche pas. */}
      <p aria-hidden="true" className="m-0 min-h-[1.3em] text-[0.8824rem] leading-snug font-semibold text-text">
        {info ? (
          <>
            <span className="tabular-nums">{[info.clock, kmhText(info.kmh)].filter(Boolean).join(' · ')}</span>
            {info.street && <span className="font-normal text-muted"> · {info.street}</span>}
          </>
        ) : (
          <span className="font-normal text-muted">Glissez le doigt pour revoir</span>
        )}
      </p>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Allure minute par minute"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, pace.length - 1)}
        aria-valuenow={minute ?? 0}
        aria-valuetext={valueText(info)}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
        onBlur={() => pick(undefined)}
        className="relative touch-pan-y select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        style={{ height: HEIGHT }}
      >
        <svg width="100%" height={HEIGHT} viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="block">
          {pace.map((kmh, i) => {
            const h = Math.max(3, (Math.min(kmh, TOP_KMH) / TOP_KMH) * (HEIGHT - 4))
            return <rect key={i} x={i * w + w * 0.1} y={HEIGHT - h} width={w * 0.8} height={h} rx={Math.min(1, w * 0.3)} fill={COLORS[paceCategory(kmh)]} opacity={minute === undefined || minute === i ? 1 : 0.45} />
          })}
        </svg>
      </div>
      <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[0.8235rem] text-muted">
        {(['tranquille', 'rapide', 'arret'] as const).map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-full" style={{ background: COLORS[c] }} />
            {PACE_LABELS[c]}
          </li>
        ))}
      </ul>
      <p className="sr-only">{paceSummary(pace)}</p>
    </div>
  )
}
