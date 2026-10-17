import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
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
import { arrowTo, directionsUrl, KIND, metersLabel } from '../../lib/ideas'

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
  const [filter, setFilter] = useState<WalkFilter>('toutes')
  const [collapsed, setCollapsed] = useState(false)
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
    return [...marked, ...found]
  }, [spots, marks, me, ideas])

  const setPref = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    writePrefs(value)
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#22332F]">
      <Suspense fallback={null}>
        <ExplorerMap cells={cells} tracks={tracks} places={places} satellite={prefs.satellite} three={prefs.three} center={start ? [start.lat, start.lng] : undefined} onPlace={() => navigate('/territoire/idees')} />
      </Suspense>

      {/* En haut : retour, import, réglages de la carte, filtres. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => navigate('/billy')} className="pointer-events-auto btn min-h-11 gap-1 rounded-full bg-surface px-3.5 text-[15px] shadow-[0_2px_8px_rgba(24,32,30,0.25)]">
            <ChevronLeftIcon size={18} />
            L’arbre
          </button>
          <Link to="/importer" className="pointer-events-auto btn min-h-11 rounded-full bg-surface px-4 text-[15px] shadow-[0_2px_8px_rgba(24,32,30,0.25)]">
            Importer
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label="Filtrer les balades" className="pointer-events-auto scroll-row flex min-w-0 gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`min-h-11 shrink-0 rounded-full border-0 px-3.5 text-[15px] font-bold shadow-[0_2px_6px_rgba(24,32,30,0.2)] ${filter === f.id ? 'bg-primary text-white' : 'bg-surface text-text'}`}>
                {f.id === 'toutes' ? `${f.label} · ${walks.length}` : f.label}
              </button>
            ))}
          </div>
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
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_18px_rgba(24,32,30,0.18)]"
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
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="font-display text-[22px] font-extrabold">Le territoire de {dog.name}</h1>
              <Link to="/balades" className="flex min-h-11 shrink-0 items-center gap-0.5 text-[15px] font-bold text-primary no-underline">
                {walks.length} balade{walks.length > 1 ? 's' : ''}
                <ChevronRightIcon size={18} />
              </Link>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="h-2.5 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(3, Math.min(100, (share ?? 0) * 100))}%` }} />
              </span>
              <span className="text-[15px] text-[#3F4946]">{[share !== undefined && commune ? shareLabel(share, commune.name) : '', cellsLabel(cells.size)].filter(Boolean).join(' · ')}</span>
            </div>
            {next && (
              <div className="flex flex-col gap-2 rounded-[18px] bg-bg p-3">
                <Link to="/territoire/idees" className="flex min-w-0 items-center gap-3 text-text no-underline">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[20px]">
                    {KIND[next.kind].icon}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-bold tracking-[0.5px] text-muted uppercase">Prochaine découverte</span>
                    <span className="text-[17px] leading-snug font-bold">{next.name}</span>
                    <span className="text-[15px] leading-snug text-muted">{next.reason}</span>
                  </span>
                </Link>
                <a href={directionsUrl(next.lat, next.lng)} className="btn btn-outline min-h-11 self-end px-4 text-[15px]">
                  Y aller · {metersLabel(next.meters)}
                </a>
              </div>
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
