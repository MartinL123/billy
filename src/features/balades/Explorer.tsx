import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { fetchCommune } from '../../firebase/communes'
import { removeSpot, watchMarks, watchSpots, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { communeAt } from '../../lib/commune'
import { discoveredShare, inPolygon, knownFog, shareLabel } from '../../lib/fog'
import { useToday } from '../../lib/useToday'
import { filterWalks, FILTERS, walkItems, type WalkFilter } from '../../lib/walkList'
import type { MapPlace } from './ExplorerMap'
import { PlaceCard, type Selected } from './PlaceCard'
import { WalkPanel } from './WalkPanel'
import { PlaceMoment } from '../trajets/PlaceMoment'
import { updateEntryRoute } from '../../firebase/db'
import { readRoute, storeRoute, type Route } from '../../lib/route'
import { useIdeas } from './useIdeas'
import { arrowTo, KIND, metersLabel } from '../../lib/ideas'
import { formatRelative } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { RouteThumb } from '../trajets/RouteThumb'

const ExplorerMap = lazy(() => import('./ExplorerMap').then((m) => ({ default: m.ExplorerMap })))

// Choix gardés sur cet appareil : satellite par défaut, 2D par défaut (carte-a-decouvrir.md § 2 bis).
const PREFS_KEY = 'billy-carte'
function readPrefs(): { satellite: boolean; three: boolean } {
  try {
    return { satellite: true, three: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return { satellite: true, three: false }
  }
}
function writePrefs(prefs: { satellite: boolean; three: boolean }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Stockage indisponible : le choix vaut pour cette fois.
  }
}

const chip = (on: boolean) => `min-h-11 shrink-0 rounded-full border-0 px-3.5 text-[15px] font-bold ${on ? 'bg-primary text-white' : 'bg-bg text-text'}`

/** Réduit, le panneau garde la poignée et les filtres, plus cette marge (le bouton Aujourd'hui déborde dessus). */
const PEEK_MARGIN = 24
const SNAP = 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)'

/**
 * Le panneau glissant : il suit le doigt (glissé vertical seulement, le défilement des filtres reste horizontal),
 * puis se cale ouvert ou réduit selon la vitesse du geste ou la position la plus proche.
 */
function useSheet() {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [travel, setTravel] = useState(0)
  const drag = useRef<{ y: number; t: number; from: number; moving: boolean; id: number } | null>(null)
  const moved = useRef(false)

  // Distance de repli : tout le contenu sous les filtres.
  useLayoutEffect(() => {
    const el = ref.current
    const body = bodyRef.current
    if (!el || !body) return
    // Le contenu commence 12 px (gap-3) sous les filtres.
    const measure = () => setTravel(Math.max(0, el.offsetHeight - (body.offsetTop - 12 + PEEK_MARGIN)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const offset = collapsed ? travel : 0
  const place = (y: number, animate: boolean) => {
    if (!ref.current) return
    ref.current.style.transition = animate ? SNAP : 'none'
    ref.current.style.transform = `translateY(${y}px)`
    // Le contenu s'efface à mesure qu'il passe sous la barre d'onglets.
    if (bodyRef.current) {
      bodyRef.current.style.transition = animate ? 'opacity 0.32s' : 'none'
      bodyRef.current.style.opacity = String(travel ? Math.min(1, Math.max(0, 1 - y / travel)) : 1)
    }
  }

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      drag.current = { y: e.clientY, t: e.timeStamp, from: offset, moving: false, id: e.pointerId }
      moved.current = false
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dy = e.clientY - d.y
      if (!d.moving) {
        if (Math.abs(dy) < 6) return
        d.moving = true
        ref.current?.setPointerCapture(e.pointerId)
      }
      // Au-delà des bords, le panneau résiste (un tiers du geste).
      const raw = d.from + dy
      const y = raw < 0 ? raw / 3 : raw > travel ? travel + (raw - travel) / 3 : raw
      place(y, false)
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d?.moving) return
      moved.current = true
      const dy = e.clientY - d.y
      const speed = dy / Math.max(1, e.timeStamp - d.t)
      const y = d.from + dy
      const next = speed > 0.4 ? true : speed < -0.4 ? false : y > travel / 2
      setCollapsed(next)
      place(next ? travel : 0, true)
    },
    onPointerCancel: () => {
      if (drag.current?.moving) place(offset, true)
      drag.current = null
    },
    // Un glissé ne déclenche pas le bouton ou le lien sous le doigt.
    onClickCapture: (e: MouseEvent) => {
      if (!moved.current) return
      moved.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }

  return {
    ref,
    bodyRef,
    collapsed,
    setCollapsed,
    handlers,
    style: { transform: `translateY(${offset}px)`, transition: SNAP },
    bodyStyle: { opacity: collapsed ? 0 : 1, transition: 'opacity 0.32s' },
  }
}

const toggle = (on: boolean) => `min-h-11 rounded-full border-0 px-3.5 text-[15px] font-bold ${on ? 'bg-text text-white' : 'bg-transparent text-text'}`

/** La carte qui se découvre (maquettes V3-Explorer, V4-Balades) : le territoire de Billy. */
export default function Explorer() {
  const { dog, entries, fog, communes } = useData()
  const today = useToday()
  const [prefs, setPrefs] = useState(readPrefs)
  // « Voir ces balades sur la carte » garde le filtre choisi dans la liste.
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  // « Spots de la meute » : un calque de la carte (spec V4 § 1), activé d'un toucher.
  // Depuis la meute : « Voir sur la carte » (?meute=1) ou un spot précis (?spot=…).
  const [packLayer, setPackLayer] = useState(() => params.has('meute') || params.has('spot'))
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [marks, setMarks] = useState<WithId<Mark>[]>([])
  useEffect(() => {
    const stops = [watchSpots(setSpots), watchMarks(setMarks)]
    return () => stops.forEach((stop) => stop())
  }, [])

  const cells = useMemo(() => knownFog(fog), [fog])
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  const tracks = useMemo(() => shown.map((w) => w.route.points), [shown])
  const last = walks[0]
  const start = last ? { lat: last.route.points[0]![0], lng: last.route.points[0]![1] } : undefined

  // La commune de la dernière balade : contour gardé, sinon demandé une seule fois.
  const commune = start ? communeAt(communes, start, inPolygon) : undefined
  useEffect(() => {
    if (start && !commune) void fetchCommune(start.lat, start.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.lat, start?.lng, Boolean(commune)])
  const share = commune ? discoveredShare(cells, commune) : undefined

  // Les spots marqués par Billy restent sur la carte, avec leur goutte.
  const me = auth.currentUser?.uid ?? ''
  const { ideas, here } = useIdeas()
  const next = ideas.find((i) => !i.explored)
  const places = useMemo<MapPlace[]>(() => {
    const mine = new Set(marks.filter((m) => m.uid === me).map((m) => m.spotId))
    const marked = spots.filter((s) => mine.has(s.id)).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, name: s.name, hidden: false, icon: '💧' }))
    // Les lieux à découvrir : « ? » dans le brouillard, leur icône et leur nom une fois découverts.
    const found = ideas.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng, name: i.name, hidden: !i.explored, icon: KIND[i.kind].icon }))
    const pack = packLayer ? spots.filter((s) => !mine.has(s.id)).map((s) => ({ id: `meute:${s.id}`, lat: s.lat, lng: s.lng, name: s.name, hidden: false, icon: '🐾' })) : []
    return [...marked, ...pack, ...found]
  }, [spots, marks, me, ideas, packLayer])
  // Un lieu touché : la carte s'y centre et la petite fenêtre dit ce que c'est.
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('spot'))
  const selected = useMemo<Selected | undefined>(() => {
    if (!selectedId) return undefined
    const spotId = selectedId.replace(/^meute:/, '')
    const spot = spots.find((s) => s.id === spotId)
    if (spot) return { kind: 'spot', spot, mine: marks.filter((m) => m.spotId === spot.id && m.uid === me) }
    const idea = ideas.find((i) => i.id === selectedId)
    return idea ? { kind: 'idea', idea } : undefined
  }, [selectedId, spots, marks, ideas, me])
  const focusAt = selected ? (selected.kind === 'idea' ? selected.idea : selected.spot) : undefined
  const focus = useMemo<[number, number] | undefined>(() => (focusAt ? [focusAt.lat, focusAt.lng] : undefined), [focusAt?.lat, focusAt?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const sheet = useSheet()

  // Une balade ouverte depuis son souvenir (?balade=…) : mise en avant, replay, repères à placer.
  const walkId = params.get('balade')
  const walkEntry = walkId ? entries.find((e) => e.id === walkId) : undefined
  const walkRoute = useMemo(() => readRoute(walkEntry?.route), [walkEntry?.route])
  const walkPhotos = useMemo(() => (walkEntry?.photos ?? []).flatMap((p, index) => (p.lat !== undefined && p.lng !== undefined ? [{ index, thumbFileId: p.thumbFileId, lat: p.lat, lng: p.lng }] : [])), [walkEntry?.photos])
  const [replaying, setReplaying] = useState(false)
  const [placing, setPlacing] = useState<{ lat: number; lng: number } | null>(null)
  const [missed, setMissed] = useState(false)
  const saveMoments = (moments: Route['moments']) => walkEntry && walkRoute && updateEntryRoute(walkEntry.id, storeRoute({ ...walkRoute, moments }))
  const walk =
    walkEntry && walkRoute
      ? {
          route: walkRoute,
          photos: walkPhotos,
          replaying,
          onReplayEnd: () => setReplaying(false),
          onTapRoute: (at: { lat: number; lng: number }) => {
            setMissed(false)
            setPlacing(at)
          },
          onMissRoute: () => setMissed(true),
          onPhoto: () => navigate(`/souvenir/${walkEntry.id}`),
        }
      : undefined
  // La boussole : l'aiguille suit la carte ; un toucher la remet face au nord.
  const [bearing, setBearing] = useState(0)
  const [north, setNorth] = useState(0)

  const setPref = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    writePrefs(value)
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] overflow-hidden bg-[#22332F]">
      <Suspense fallback={null}>
        <ExplorerMap cells={cells} tracks={tracks} places={places} satellite={prefs.satellite} three={prefs.three} center={start ? [start.lat, start.lng] : undefined} focus={focus} onPlace={setSelectedId} onMapTap={() => setSelectedId(null)} onBearing={setBearing} north={north} walk={walk} />
      </Suspense>

      {/* En haut : la prochaine découverte, puis les réglages de la carte. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        {next && here && (
          <button type="button" onClick={() => setSelectedId(next.id)} className="pointer-events-auto btn min-h-11 self-start rounded-full border-0 bg-[#22332F] px-4 text-[15px] text-white shadow-[0_2px_8px_rgba(24,32,30,0.3)]">
            À découvrir : {KIND[next.kind].label} · {metersLabel(next.meters)} {arrowTo(here, next)}
          </button>
        )}
        <div className="flex flex-col items-end gap-2">
          <div role="group" aria-label="Fond de carte" className="pointer-events-auto flex rounded-full bg-surface p-1 shadow-[0_2px_6px_rgba(24,32,30,0.2)]">
            <button type="button" aria-pressed={!prefs.satellite} onClick={() => setPref({ satellite: false })} className={toggle(!prefs.satellite)}>
              Plan
            </button>
            <button type="button" aria-pressed={prefs.satellite} onClick={() => setPref({ satellite: true })} className={toggle(prefs.satellite)}>
              Satellite
            </button>
          </div>
          <div role="group" aria-label="Vue" className="pointer-events-auto flex rounded-full bg-surface p-1 shadow-[0_2px_6px_rgba(24,32,30,0.2)]">
            <button type="button" aria-pressed={!prefs.three} onClick={() => setPref({ three: false })} className={toggle(!prefs.three)}>
              2D
            </button>
            <button type="button" aria-pressed={prefs.three} onClick={() => setPref({ three: true })} className={toggle(prefs.three)}>
              3D
            </button>
          </div>
          <button type="button" onClick={() => setNorth((n) => n + 1)} aria-label={`Remettre la carte face au nord${Math.round(bearing) ? ` (tournée de ${Math.round(((bearing % 360) + 360) % 360)}°)` : ''}`} className="pointer-events-auto flex size-12 items-center justify-center rounded-full border-0 bg-surface shadow-[0_2px_6px_rgba(24,32,30,0.2)]">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.1s linear' }}>
              <path d="M13 2 L17 13 L13 11.5 L9 13 Z" fill="#C4423A" />
              <path d="M13 24 L9 13 L13 14.5 L17 13 Z" fill="#8C9692" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau du bas, dans la zone du pouce : il suit le doigt et se cale ouvert ou réduit (filtres toujours visibles). */}
      <section
        ref={sheet.ref}
        aria-label="Le territoire de Billy"
        {...sheet.handlers}
        style={sheet.style}
        className={`absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] touch-pan-x ${selected || walk ? 'invisible' : ''} flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]`}
      >
        <button type="button" onClick={() => sheet.setCollapsed(!sheet.collapsed)} aria-expanded={!sheet.collapsed} aria-label={sheet.collapsed ? 'Afficher le panneau' : 'Réduire le panneau'} className="mx-auto -mb-2 flex min-h-11 w-24 items-center justify-center border-0 bg-transparent">
          <span className="h-1.5 w-11 rounded-full bg-[#C9CFCC]" />
        </button>
        {walks.length > 0 && (
          <div role="group" aria-label="Filtrer la carte" className="scroll-row -mx-5 flex gap-1.5 px-5">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
                {f.id === 'toutes' ? `Mes balades · ${walks.length}` : f.label}
              </button>
            ))}
            <button type="button" aria-pressed={packLayer} onClick={() => setPackLayer(!packLayer)} className={`flex items-center gap-1.5 ${chip(packLayer)}`}>
              <span className="size-2.5 rounded-full bg-[#2559A8]" aria-hidden="true" />
              Spots de la meute
            </button>
          </div>
        )}
        <div ref={sheet.bodyRef} style={sheet.bodyStyle} className="flex flex-col gap-3" aria-hidden={sheet.collapsed || undefined} inert={sheet.collapsed || undefined}>
          {walks.length === 0 ? (
            <>
              <h1 className="font-display text-[22px] font-extrabold">Le territoire de {dog.name}</h1>
              <p className="text-[17px] leading-snug text-[#3F4946]">Importez vos balades Strava pour lever le brouillard.</p>
              <Link to="/importer" className="btn btn-main min-h-[56px]">
                Importer mes balades
              </Link>
            </>
          ) : (
            <>
              <p className="text-[17px] leading-snug">
                Chaque balade lève le brouillard.{share !== undefined && commune ? <strong> {shareLabel(share, commune.name)}.</strong> : null}
              </p>
              <span className="h-2.5 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(3, Math.min(100, (share ?? 0) * 100))}%` }} />
              </span>
              {last && (
                <Link to="/balades" className="flex items-center gap-3 rounded-[18px] bg-bg p-2.5 text-text no-underline">
                  <RouteThumb points={last.route.points} moments={last.route.moments} size={48} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[17px] font-bold">{last.name}</span>
                    <span className="truncate text-[15px] text-muted">
                      {formatRelative(last.date, today).replace(/^./, (c) => c.toLocaleUpperCase('fr'))} · {formatRouteDistance(last.route.distanceM)} · voir les {walks.length} balade{walks.length > 1 ? 's' : ''}
                    </span>
                  </span>
                  <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
                </Link>
              )}
            </>
          )}
        </div>
      </section>
      {walk && walkEntry && !selected && <WalkPanel entryId={walkEntry.id} name={walks.find((w) => w.id === walkEntry.id)?.name ?? 'La balade'} date={walkEntry.date} route={walk.route} replaying={replaying} missed={missed} onReplay={() => setReplaying(!replaying)} />}
      {placing && walkRoute && (
        <PlaceMoment
          at={placing}
          onCancel={() => setPlacing(null)}
          onPlace={(type, note, street) => {
            saveMoments([...walkRoute.moments, { ...placing, type, ...(note ? { note } : {}), ...(street ? { street } : {}) }])
            setPlacing(null)
          }}
        />
      )}
      {selected && (
        <PlaceCard
          key={selectedId}
          selected={selected}
          here={here}
          me={me}
          onClose={() => setSelectedId(null)}
          onRemove={(spot, mine) => {
            removeSpot(spot, mine.map((m) => m.id))
            setSelectedId(null)
          }}
        />
      )}
    </div>
  )
}
