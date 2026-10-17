import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from '../../components/Sheet'
import { markedSpotsOn } from '../../firebase/community'
import { addPoint, buildRoute, closeLoop, defaultRouteName, distanceToRoute, DURATIONS, durationLabel, formatRouteDistance, moveAt, NEAR_ROUTE, removeAt, removeLast, routeDistance, routeMomentInfo, ROUTE_MOMENTS, withMarkMoments, type Route, type RouteMoment, type RoutePoint } from '../../lib/route'
import type { ISODate } from '../../lib/dates'
import { streetName } from '../../lib/street'
import { MAX_GPX_BYTES, readGpx } from '../../lib/gpx'
import { simplifyWalk } from '../../lib/balade'
import { addMarker, createMap, dot, fitPoints, onMarker, PARIS, setLine, whenReady, type MapLibreMap, type Marker } from '../../components/maplibre'


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
  const [marked, setMarked] = useState<{ name: string; lat: number; lng: number }[]>([])
  useEffect(() => {
    markedSpotsOn(date).then(setMarked)
  }, [date])
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const state = useRef({ mode, points })
  state.current = { mode, points }

  // « Garder comme trajet habituel » : coché par défaut à partir de 2 points (sauf si on a choisi).
  const keeping = keep ?? (points.length >= 2 && !initial?.savedRouteId)
  const distance = routeDistance(points)

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { center: initial?.points[0] ?? PARIS, zoom: 16 })
    m.on('click', (e) => {
      // Un toucher sur un point (le déplacer, le supprimer) n'ajoute rien.
      if (onMarker(e.originalEvent)) return
      const p = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (state.current.mode === 'chemin') return setPoints((pts) => addPoint(pts, [p.lat, p.lng]))
      if (distanceToRoute(p, state.current.points) > NEAR_ROUTE) return setHint('Touchez le trajet (ou tout près) pour y placer un moment.')
      setHint('')
      setPlacing(p)
    })
    map.current = m
    // Centrer sur la position actuelle, une seule fois, si elle est autorisée. Rien n'est enregistré.
    if (!initial && 'geolocation' in navigator) navigator.geolocation.getCurrentPosition((pos) => m.jumpTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16 }), () => undefined, { timeout: 8000, maximumAge: 300000 })
    else if (initial && initial.points.length > 1) fitPoints(m, initial.points, 40)
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le tracé : la ligne, des points glissables (le premier en vert), les moments en couleur.
  useEffect(() => {
    const m = map.current
    if (!m) return
    whenReady(m, () => setLine(m, 'trace', [points], { color: '#9A4413', width: 5 }))
    markers.current.forEach((marker) => marker.remove())
    // Un tracé importé (GPX) a beaucoup de points : seulement le départ et l'arrivée, pour garder la carte lisible.
    const many = points.length > 40
    const next: Marker[] = []
    points.forEach((p, i) => {
      if (many && i !== 0 && i !== points.length - 1) return
      const el = dot(i === 0 ? '#1E5A50' : '#FFFFFF', 24, i === 0 ? 'Départ' : `Point ${i + 1}`)
      if (i !== 0) el.style.borderColor = '#9A4413'
      const marker = addMarker(m, p, el, { draggable: true })
      let dragged = false
      marker.on('dragstart', () => (dragged = true))
      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        setPoints((pts) => moveAt(pts, i, [ll.lat, ll.lng]))
      })
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (dragged) return void (dragged = false)
        setDeleting(i)
      })
      next.push(marker)
    })
    for (const mo of moments) {
      const el = dot(routeMomentInfo(mo.type).color, 20, routeMomentInfo(mo.type).label)
      el.style.pointerEvents = 'none'
      next.push(addMarker(m, [mo.lat, mo.lng], el))
    }
    markers.current = next
  }, [points, moments])

  // Un fichier GPX (montre, appli de course) depuis l'app Fichiers : ses points remplacent le tracé vide.
  const importGpx = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_GPX_BYTES) return setHint('Ce fichier est trop lourd (5 Mo au maximum).')
    const imported = simplifyWalk(readGpx(await file.text()).points.map((p): RoutePoint => [p.lat, p.lng]))
    if (imported.length < 2) return setHint('Ce fichier ne contient pas de trajet. Choisissez un fichier .gpx.')
    setHint('')
    setPoints(imported)
    if (map.current) fitPoints(map.current, imported, 40, true)
  }

  const done = () => {
    const built = buildRoute(points, moments, duration, keeping ? undefined : initial?.savedRouteId)
    // Une balade importée garde ses heures (photos, revoir la balade).
    const route = initial?.source === 'gpx' ? { ...built, source: 'gpx' as const, ...(initial.startTime ? { startTime: initial.startTime } : {}), ...(initial.endTime ? { endTime: initial.endTime } : {}) } : built
    onDone({ route: withMarkMoments(route, marked), keep: keeping ? name.trim() || defaultRouteName(date) : null })
  }
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
        {points.length === 0 && (
          <label className="btn btn-quiet min-h-11 cursor-pointer text-[15px] text-[#9A4413]">
            Importer un fichier GPX
            <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="sr-only" onChange={(e) => importGpx(e.target.files?.[0])} />
          </label>
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
