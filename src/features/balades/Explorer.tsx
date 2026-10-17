import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { fetchCommune } from '../../firebase/communes'
import { watchMarks, watchSpots, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { communeAt } from '../../lib/commune'
import { cellsLabel, discoveredShare, inPolygon, knownFog, shareLabel } from '../../lib/fog'
import { useToday } from '../../lib/useToday'
import { filterWalks, FILTERS, walkItems, type WalkFilter } from '../../lib/walkList'
import type { MapPlace } from './ExplorerMap'
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

const toggle = (on: boolean) => `min-h-11 rounded-full border-0 px-3.5 text-[15px] font-bold ${on ? 'bg-text text-white' : 'bg-transparent text-text'}`

/** La carte qui se découvre (maquettes V3-Explorer, V4-Balades) : le territoire de Billy. */
export default function Explorer() {
  const { dog, entries, fog, communes } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(readPrefs)
  // « Voir ces balades sur la carte » garde le filtre choisi dans la liste.
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  const [collapsed, setCollapsed] = useState(false)
  // « Spots de la meute » : un calque de la carte (spec V4 § 1), activé d'un toucher.
  const [packLayer, setPackLayer] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
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
  const openPlace = (id: string) => navigate(id.startsWith('meute:') ? `/meute?spot=${id.slice(6)}` : spots.some((s) => s.id === id) ? `/meute?spot=${id}` : '/territoire/idees')

  const setPref = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    writePrefs(value)
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] overflow-hidden bg-[#22332F]">
      <Suspense fallback={null}>
        <ExplorerMap cells={cells} tracks={tracks} places={places} satellite={prefs.satellite} three={prefs.three} center={start ? [start.lat, start.lng] : undefined} onPlace={openPlace} />
      </Suspense>

      {/* En haut : les filtres, le calque de la meute, puis les réglages de la carte. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div role="group" aria-label="Filtrer la carte" className="pointer-events-auto scroll-row -mx-3 flex gap-1.5 px-3">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`min-h-11 shrink-0 rounded-full border-0 px-3.5 text-[15px] font-bold shadow-[0_2px_6px_rgba(24,32,30,0.2)] ${filter === f.id ? 'bg-primary text-white' : 'bg-surface text-text'}`}>
              {f.id === 'toutes' ? `Mes balades · ${walks.length}` : f.label}
            </button>
          ))}
          <button type="button" aria-pressed={packLayer} onClick={() => setPackLayer(!packLayer)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-0 px-3.5 text-[15px] font-bold shadow-[0_2px_6px_rgba(24,32,30,0.2)] ${packLayer ? 'bg-primary text-white' : 'bg-surface text-text'}`}>
            <span className="size-2.5 rounded-full bg-[#2559A8]" aria-hidden="true" />
            Spots de la meute
          </button>
        </div>
        {next && here && (
          <Link to="/territoire/idees" className="pointer-events-auto btn min-h-11 self-start rounded-full bg-[#22332F] px-4 text-[15px] text-white shadow-[0_2px_8px_rgba(24,32,30,0.3)]">
            {arrowTo(here, next)} {KIND[next.kind].label} · {metersLabel(next.meters)}
          </Link>
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
        </div>
      </div>

      {/* Panneau du bas, dans la zone du pouce. On le glisse vers le bas pour la carte en plein écran. */}
      <section
        aria-label="Le territoire de Billy"
        onTouchStart={(e) => setDragFrom(e.touches[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const y = e.changedTouches[0]?.clientY
          if (dragFrom !== null && y !== undefined && Math.abs(y - dragFrom) > 40) setCollapsed(y > dragFrom)
          setDragFrom(null)
        }}
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]"
      >
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Afficher le panneau' : 'Réduire le panneau'} className="mx-auto flex min-h-11 w-24 items-center justify-center border-0 bg-transparent">
          <span className="h-1.5 w-11 rounded-full bg-[#C9CFCC]" />
        </button>
        {collapsed ? (
          <button type="button" onClick={() => setCollapsed(false)} className="flex min-h-11 items-center justify-between border-0 bg-transparent p-0 text-left text-[15px] font-bold text-text">
            <span>{[share !== undefined && commune ? shareLabel(share, commune.name) : cellsLabel(cells.size) + ' découvertes', `${walks.length} balade${walks.length > 1 ? 's' : ''}`].join(' · ')}</span>
            <span aria-hidden="true">⌃</span>
          </button>
        ) : walks.length === 0 ? (
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
            <Link to="/importer" className="btn btn-main min-h-[56px]">
              Ajouter mes balades Strava
            </Link>
          </>
        )}
      </section>
    </div>
  )
}
