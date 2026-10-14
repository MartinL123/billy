import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from '../../components/Sheet'
import { addPoint, buildRoute, closeLoop, defaultRouteName, distanceToRoute, DURATIONS, durationLabel, formatRouteDistance, moveAt, NEAR_ROUTE, removeAt, removeLast, routeDistance, routeMomentInfo, ROUTE_MOMENTS, type Route, type RouteMoment, type RoutePoint } from '../../lib/route'
import type { ISODate } from '../../lib/dates'
import { streetName } from '../../lib/street'

const PARIS: RoutePoint = [48.8566, 2.3522]

export interface TraceResult {
  route: Route
  /** Garder comme trajet habituel, avec ce nom. */
  keep: string | null
}

/**
 * Tracer le trajet après coup (docs/specs/trajets.md § 2) : toucher la carte ajoute un point, traits droits entre
 * les points. Jamais de suivi GPS : la position sert seulement à centrer la carte, si elle est autorisée.
 */
export function Tracer({ date, initial, onDone, onCancel }: { date: ISODate; initial?: Route; onDone: (result: TraceResult) => void; onCancel: () => void }) {
  const [points, setPoints] = useState<RoutePoint[]>(initial?.points ?? [])
  const [moments, setMoments] = useState<RouteMoment[]>(initial?.moments ?? [])
  const [mode, setMode] = useState<'chemin' | 'moment'>('chemin')
  const [duration, setDuration] = useState<number | undefined>(initial?.durationMin)
  const [keep, setKeep] = useState<boolean | null>(null)
  const [name, setName] = useState(defaultRouteName(date))
  const [placing, setPlacing] = useState<{ lat: number; lng: number } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [hint, setHint] = useState('')
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const layer = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const state = useRef({ mode, points })
  state.current = { mode, points }

  // « Garder comme trajet habituel » : coché par défaut à partir de 2 points (sauf si on a choisi).
  const keeping = keep ?? (points.length >= 2 && !initial?.savedRouteId)
  const distance = routeDistance(points)

  useEffect(() => {
    if (!host.current) return
    const start = initial?.points[0] ?? PARIS
    const m = L.map(host.current, { zoomControl: false }).setView(start, 16)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    m.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      const p = e.latlng
      if (state.current.mode === 'chemin') return setPoints((pts) => addPoint(pts, [p.lat, p.lng]))
      if (distanceToRoute(p, state.current.points) > NEAR_ROUTE) return setHint('Touchez le trajet (ou tout près) pour y placer un moment.')
      setHint('')
      setPlacing(p)
    })
    map.current = m
    // Centrer sur la position actuelle, une seule fois, si elle est autorisée. Rien n'est enregistré.
    if (!initial && 'geolocation' in navigator) navigator.geolocation.getCurrentPosition((pos) => m.setView([pos.coords.latitude, pos.coords.longitude], 16), () => undefined, { timeout: 8000, maximumAge: 300000 })
    else if (initial && initial.points.length > 1) m.fitBounds(L.polyline(initial.points).getBounds(), { padding: [40, 40] })
    return () => m.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le tracé : la ligne, des points glissables (le premier en vert), les moments en couleur.
  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    if (points.length > 1) L.polyline(points, { color: '#9A4413', weight: 5 }).addTo(group)
    points.forEach((p, i) => {
      const color = i === 0 ? '#1E5A50' : '#FFFFFF'
      const icon = L.divIcon({ className: '', html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:${color};border:3px solid ${i === 0 ? '#fff' : '#9A4413'};box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-50%,-50%)"></span>`, iconSize: [0, 0] })
      const marker = L.marker(p, { icon, draggable: true, title: i === 0 ? 'Départ' : `Point ${i + 1}` }).addTo(group)
      marker.on('dragend', () => {
        const ll = marker.getLatLng()
        setPoints((pts) => moveAt(pts, i, [ll.lat, ll.lng]))
      })
      marker.on('click', () => setDeleting(i))
    })
    for (const mo of moments) L.marker([mo.lat, mo.lng], { icon: L.divIcon({ className: '', html: `<span style="display:block;width:20px;height:20px;border-radius:50%;background:${routeMomentInfo(mo.type).color};border:3px solid #fff;transform:translate(-50%,-50%)"></span>`, iconSize: [0, 0] }), interactive: false }).addTo(group)
  }, [points, moments])

  const done = () => onDone({ route: buildRoute(points, moments, duration, keeping ? undefined : initial?.savedRouteId), keep: keeping ? name.trim() || defaultRouteName(date) : null })
  const round = 'flex size-[52px] items-center justify-center rounded-full border-2 border-solid border-[#9A4413] bg-surface text-[#9A4413] shadow-[0_2px_8px_rgba(24,32,30,0.2)] disabled:opacity-40'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Tracer le trajet" className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="relative isolate flex-1">
        <div ref={host} className="size-full" />
        <div className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+10px)] z-[500] flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-[18px] bg-surface px-3 py-2 shadow-[0_2px_8px_rgba(24,32,30,0.18)]">
            <button type="button" onClick={onCancel} className="btn btn-quiet min-h-11 px-3">
              Annuler
            </button>
            <span className="text-[17px] font-extrabold" aria-live="polite">
              {formatRouteDistance(distance)} · {points.length} point{points.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="rounded-[14px] bg-text/80 px-3 py-2 text-[15px] leading-snug text-white">{hint || (mode === 'chemin' ? 'Touchez la carte à chaque virage. Le point vert est le départ.' : 'Touchez le trajet là où il s’est passé quelque chose.')}</p>
        </div>
        <div className="absolute top-1/2 right-3 z-[500] flex -translate-y-1/2 flex-col gap-2.5">
          <button type="button" aria-label="Annuler le dernier point" disabled={points.length === 0} onClick={() => setPoints(removeLast)} className={round}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button type="button" aria-label="Revenir au départ" disabled={points.length < 2} onClick={() => setPoints(closeLoop)} className={round}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-3-6.2" />
              <path d="M20 4v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-divider bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div role="radiogroup" aria-label="Ce que fait un toucher sur la carte" className="grid grid-cols-2 gap-1 rounded-full bg-[#EEF0EE] p-1">
          {(
            [
              ['chemin', 'Tracer le chemin'],
              ['moment', 'Placer un moment'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} disabled={id === 'moment' && points.length < 2} onClick={() => setMode(id)} className={`min-h-11 rounded-full border-0 text-[15px] font-bold disabled:opacity-40 ${mode === id ? 'bg-surface text-text shadow-[0_1px_3px_rgba(24,32,30,0.15)]' : 'bg-transparent text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">Durée</span>
          <div className="scroll-row flex flex-1 gap-1.5">
            {DURATIONS.map((d) => (
              <button key={d} type="button" aria-pressed={duration === d} onClick={() => setDuration(duration === d ? undefined : d)} className={`min-h-11 shrink-0 rounded-full border-2 border-solid px-3 text-[15px] font-semibold ${duration === d ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
                {durationLabel(d)}
              </button>
            ))}
          </div>
        </div>
        {points.length >= 2 && (
          <div className="flex items-center gap-2.5">
            <input type="checkbox" checked={keeping} onChange={(e) => setKeep(e.target.checked)} aria-label="Garder comme trajet habituel" className="size-6 shrink-0 accent-primary" />
            <input value={name} disabled={!keeping} onChange={(e) => setName(e.target.value)} aria-label="Nom du trajet habituel" className="field min-h-11 min-w-0 flex-1 text-base disabled:opacity-50" />
          </div>
        )}
        <button type="button" onClick={done} disabled={points.length < 2} className="btn btn-main min-h-[54px] disabled:opacity-50">
          Terminé{points.length >= 2 ? ` · ${formatRouteDistance(distance)}` : ''}
        </button>
      </div>

      {placing && <PlaceMoment at={placing} onCancel={() => setPlacing(null)} onPlace={(type, note, street) => {
        setMoments((ms) => [...ms, { ...placing, type, ...(note ? { note } : {}), ...(street ? { street } : {}) }])
        setPlacing(null)
      }} />}

      {deleting !== null && (
        <Sheet label="Supprimer ce point" onClose={() => setDeleting(null)}>
          <h2 className="mt-1 text-xl font-bold">{deleting === 0 ? 'Le départ' : `Le point ${deleting + 1}`}</h2>
          <button
            type="button"
            onClick={() => {
              setPoints((pts) => removeAt(pts, deleting))
              setDeleting(null)
            }}
            className="btn border-2 border-solid border-danger bg-surface text-danger"
          >
            Supprimer ce point
          </button>
          <button type="button" onClick={() => setDeleting(null)} className="btn btn-outline">
            Garder
          </button>
        </Sheet>
      )}
    </div>,
    document.body,
  )
}

/** « Qu'est-ce qui s'est passé ici ? » (docs/specs/trajets.md § 3). */
function PlaceMoment({ at, onPlace, onCancel }: { at: { lat: number; lng: number }; onPlace: (type: RouteMoment['type'], note: string, street?: string) => void; onCancel: () => void }) {
  const [type, setType] = useState<RouteMoment['type'] | null>(null)
  const [note, setNote] = useState('')
  const [street, setStreet] = useState<string>()
  useEffect(() => {
    let live = true
    streetName(at.lat, at.lng).then((name) => live && setStreet(name))
    return () => {
      live = false
    }
  }, [at.lat, at.lng])
  return (
    <Sheet label="Qu'est-ce qui s'est passé ici ?" onClose={onCancel}>
      <div className="mt-1 flex flex-col gap-0.5">
        <h2 className="font-display text-[22px] font-extrabold">Qu'est-ce qui s'est passé ici ?</h2>
        {street && <p className="text-[15px] font-semibold text-muted">{street}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ROUTE_MOMENTS.map((m) => (
          <button key={m.id} type="button" aria-pressed={type === m.id} onClick={() => setType(m.id)} className="flex min-h-16 items-center justify-center rounded-[18px] border-[3px] border-solid px-3 text-[17px] font-extrabold" style={type === m.id ? { background: m.color, borderColor: m.color, color: '#FFFFFF' } : { background: '#FFFFFF', borderColor: m.color, color: m.color }}>
            {m.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">
          Un mot <span className="font-normal text-muted">(facultatif)</span>
        </span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un vélo est passé très près" autoComplete="off" className="field" />
      </label>
      <button type="button" disabled={!type} onClick={() => type && onPlace(type, note.trim(), street)} className="btn btn-main disabled:opacity-50">
        Placer ce moment
      </button>
    </Sheet>
  )
}
