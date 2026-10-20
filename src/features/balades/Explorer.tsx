import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isNative } from '../../native'
import { ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { fetchCommune } from '../../firebase/communes'
import { removeSpot, watchMarks, watchSpots, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { communeAt } from '../../lib/commune'
import { discoveredShare, inPolygon, knownFog, shareLabel } from '../../lib/fog'
import { useToday } from '../../lib/useToday'
import { filterWalks, walkColors, walkItems, walksNear, type WalkFilter } from '../../lib/walkList'
import type { MapPlace, MapWalk } from './ExplorerMap'
import { PlaceCard, type Selected } from './PlaceCard'
import { WalkPanel } from './WalkPanel'
import { useSheet } from './useSheet'
import { PlaceMoment } from '../trajets/PlaceMoment'
import { updateEntryRoute } from '../../firebase/db'
import { readRoute, storeRoute, type Route } from '../../lib/route'
import { useIdeas } from './useIdeas'
import { arrowTo, KIND, metersLabel } from '../../lib/ideas'
import { formatRelative } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { sharePercent, territoryHint } from '../../lib/territory'
import { ofName } from '../../lib/gender'
import { useReadOnly } from '../../firebase/viewer'

const ExplorerMap = lazy(() => import('./ExplorerMap').then((m) => ({ default: m.ExplorerMap })))

// Choix gardés sur cet appareil : plan et 2D par défaut (V5, T-054 ; nouvelle clé pour que le plan revienne une fois).
const PREFS_KEY = 'billy-carte-v5'
function readPrefs(): { satellite: boolean; three: boolean } {
  try {
    return { satellite: false, three: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return { satellite: false, three: false }
  }
}
function writePrefs(prefs: { satellite: boolean; three: boolean }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Stockage indisponible : le choix vaut pour cette fois.
  }
}

const chip = (on: boolean) => `min-h-11 shrink-0 rounded-full border-0 px-3 text-[0.8235rem] font-bold ${on ? 'bg-primary text-white' : 'bg-bg text-text'}`

/** Balades en cartes dans le panneau ; les autres sont dans « Ses balades ». */
const LIST_MAX = 8

/** Les filtres compacts du panneau (V5) ; les autres restent dans la liste des balades. */
const PANEL_FILTERS: { id: WalkFilter; label: string }[] = [
  { id: 'toutes', label: 'Mes balades' },
  { id: 'mois', label: 'Ce mois' },
]

const pill = 'pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full border-0 bg-surface px-4 text-[0.8824rem] font-bold text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]'

const toggle = (on: boolean) => `min-h-11 rounded-full border-0 px-3.5 text-[0.8824rem] font-bold ${on ? 'bg-text text-white' : 'bg-transparent text-text'}`

/** La carte qui se découvre (maquettes V3-Explorer, V4-Balades) : le territoire de Billy. */
export default function Explorer() {
  const { dog, entries, fog, communes } = useData()
  const today = useToday()
  const readOnly = useReadOnly()
  const [prefs, setPrefs] = useState(readPrefs)
  // « Voir ces balades sur la carte » garde le filtre choisi dans la liste.
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  // « Spots de la meute » : un calque de la carte (spec V4 § 1), activé d’un toucher.
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
  // Une couleur par balade, la même sur la carte et dans la liste.
  const colors = useMemo(() => walkColors(walks), [walks])
  // Une balade touchée dans le panneau : son trait s’épaissit, les autres passent à 25 % ; un autre toucher la relâche.
  const [highlight, setHighlight] = useState<string>()
  const tracks = useMemo<MapWalk[]>(() => {
    const all = shown.map((w) => ({ id: w.id, color: colors.get(w.id) ?? '#FF7A1A', points: w.route.points, bold: w.id === highlight, faded: Boolean(highlight) && w.id !== highlight }))
    // La balade mise en avant est dessinée en dernier, au-dessus des autres.
    return [...all.filter((t) => !t.bold), ...all.filter((t) => t.bold)]
  }, [shown, colors, highlight])
  const last = walks[0]
  // Où l’on est (T-020) : la position demandée avec « Autour de moi », sinon celle déjà autorisée, sinon la dernière balade.
  const [myPos, setMyPos] = useState<{ lat: number; lng: number }>()
  const [locating, setLocating] = useState(false)
  const { ideas, here } = useIdeas(myPos)
  const start = here ?? (last ? { lat: last.route.points[0]![0], lng: last.route.points[0]![1] } : undefined)
  // La carte se cadre sur les balades du coin (Saint-Ouen, la Bretagne…), pas sur toute la France.
  const local = useMemo(() => walksNear(shown, start), [shown, start?.lat, start?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  const frame = useMemo(() => local.flatMap((w) => w.route.points), [local])
  const frameKey = local.map((w) => w.id).join(',')
  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setLocating(false),
      { maximumAge: 300000, timeout: 10000 },
    )
  }

  // La commune de la dernière balade : contour gardé, sinon demandé une seule fois.
  const commune = start ? communeAt(communes, start, inPolygon) : undefined
  useEffect(() => {
    if (start && !commune) void fetchCommune(start.lat, start.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.lat, start?.lng, Boolean(commune)])
  const share = commune ? discoveredShare(cells, commune) : undefined

  // Les spots marqués par Billy restent sur la carte, avec leur goutte.
  const me = auth.currentUser?.uid ?? ''
  // Les lieux à découvrir listés dans le panneau : d’abord ceux encore dans le brouillard.
  const discover = useMemo(() => [...ideas.filter((i) => !i.explored), ...ideas.filter((i) => i.explored)].slice(0, 3), [ideas])
  const places = useMemo<MapPlace[]>(() => {
    const mine = new Set(marks.filter((m) => m.uid === me).map((m) => m.spotId))
    const marked = spots.filter((s) => mine.has(s.id)).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, name: s.name, hidden: false, icon: '💧' }))
    // Les lieux à découvrir : « ? » dans le brouillard, leur icône et leur nom une fois découverts.
    const found = ideas.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng, name: i.name, hidden: !i.explored, icon: KIND[i.kind].icon }))
    const pack = packLayer ? spots.filter((s) => !mine.has(s.id)).map((s) => ({ id: `meute:${s.id}`, lat: s.lat, lng: s.lng, name: s.name, hidden: false, icon: '🐾' })) : []
    return [...marked, ...pack, ...found]
  }, [spots, marks, me, ideas, packLayer])
  // Un lieu touché : la carte s’y centre et la petite fenêtre dit ce que c’est.
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
  const saveMoments = (moments: Route['moments']) => walkEntry && walkRoute && updateEntryRoute(walkEntry.id, storeRoute({ ...walkRoute, moments }))
  const walk =
    walkEntry && walkRoute
      ? {
          id: walkEntry.id,
          route: walkRoute,
          photos: walkPhotos,
          replaying,
          onReplayEnd: () => setReplaying(false),
          // Visiteur (T-048) : pas de repère à placer.
          onTapRoute: (at: { lat: number; lng: number }) => !readOnly && setPlacing(at),
          // Une petite fenêtre de lieu ouverte : le toucher la referme seulement.
          onLeave: () => !selectedId && closeWalk(),
          onPhoto: () => navigate(`/souvenir/${walkEntry.id}`),
          color: colors.get(walkEntry.id),
        }
      : undefined
  // Toucher un tracé (ou une balade de la liste) : elle passe au premier plan ; « Toutes les balades » revient à la vue d’ensemble.
  // Depuis la carte, ouvrir puis refermer une balade ne laisse pas d’entrée en double dans l’historique (T-024).
  const openWalk = (id: string) => navigate(`/territoire?balade=${encodeURIComponent(id)}${filter !== 'toutes' ? `&filtre=${encodeURIComponent(filter)}` : ''}`, { replace: true })
  const closeWalk = () => navigate(`/territoire${filter !== 'toutes' ? `?filtre=${encodeURIComponent(filter)}` : ''}`, { replace: true })
  // La boussole : l’aiguille suit la carte ; un toucher la remet face au nord.
  const [bearing, setBearing] = useState(0)
  const [north, setNorth] = useState(0)
  // « Affichage » : un petit panneau Plan / Satellite, 2D / 3D.
  const [display, setDisplay] = useState(false)
  const turned = Math.round(((bearing % 360) + 360) % 360) % 360 !== 0
  const highlighted = shown.find((w) => w.id === highlight)
  const onMapTap = () => {
    setSelectedId(null)
    setDisplay(false)
  }

  const setPref = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    writePrefs(value)
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] overflow-hidden bg-[#22332F]">
      <Suspense fallback={null}>
        <ExplorerMap cells={cells} tracks={tracks} frame={frame} frameKey={frameKey} me={myPos ? [myPos.lat, myPos.lng] : undefined} onWalk={openWalk} places={places} satellite={prefs.satellite} three={prefs.three} center={start ? [start.lat, start.lng] : undefined} focus={focus} onPlace={setSelectedId} onMapTap={onMapTap} onBearing={setBearing} north={north} walk={walk} dogName={dog.name} />
      </Suspense>

      {/* En haut, 2 pilules seulement (V5) : « Affichage » à gauche, « Me situer » à droite. Pincer pour zoomer. */}
      {/* Toujours au-dessus du panneau du bas (R-033), même ouvert sur un petit écran. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="flex flex-col items-start gap-2">
          <button type="button" aria-expanded={display} onClick={() => setDisplay(!display)} className={`tap ${pill}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5" />
            </svg>
            Affichage
          </button>
          {display && (
            <div className="anim-pop pointer-events-auto flex flex-col gap-2 rounded-[20px] bg-surface p-2 shadow-[0_4px_14px_rgba(24,32,30,0.25)]">
              <div role="group" aria-label="Fond de carte" className="flex rounded-full bg-bg p-1">
                <button type="button" aria-pressed={!prefs.satellite} onClick={() => setPref({ satellite: false })} className={toggle(!prefs.satellite)}>
                  Plan
                </button>
                <button type="button" aria-pressed={prefs.satellite} onClick={() => setPref({ satellite: true })} className={toggle(prefs.satellite)}>
                  Satellite
                </button>
              </div>
              <div role="group" aria-label="Vue" className="flex rounded-full bg-bg p-1">
                <button type="button" aria-pressed={!prefs.three} onClick={() => setPref({ three: false })} className={`flex-1 ${toggle(!prefs.three)}`}>
                  2D
                </button>
                <button type="button" aria-pressed={prefs.three} onClick={() => setPref({ three: true })} className={`flex-1 ${toggle(prefs.three)}`}>
                  3D
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Me situer (T-020) : la carte, la commune et les idées suivent l’endroit où l’on est. */}
          <button type="button" onClick={locate} aria-label="Me situer : les balades et les idées du coin où je suis" className={`tap ${pill} ${myPos ? 'text-[#2F7BF6]' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className={locating ? 'animate-pulse' : ''}>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            Me situer
          </button>
          {/* La boussole n’apparaît que si la carte est tournée ; un toucher la remet face au nord. */}
          {turned && (
            <button type="button" onClick={() => setNorth((n) => n + 1)} aria-label={`Remettre la carte face au nord (tournée de ${Math.round(((bearing % 360) + 360) % 360)}°)`} className="anim-pop pointer-events-auto flex size-12 items-center justify-center rounded-full border-0 bg-surface shadow-[0_2px_6px_rgba(24,32,30,0.2)]">
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)` }}>
                <path d="M13 2 L17 13 L13 11.5 L9 13 Z" fill="#C4423A" />
                <path d="M13 24 L9 13 L13 14.5 L17 13 Z" fill="#8C9692" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Panneau du bas, dans la zone du pouce : il suit le doigt et se cale ouvert ou réduit (filtres toujours visibles). */}
      <section
        ref={sheet.ref}
        aria-label={`Le territoire ${ofName(dog.name)}`}
        {...sheet.handlers}
        style={sheet.style}
        className={`absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-[calc(100%-50dvh)] max-w-[430px] ${sheet.scrollable && !sheet.collapsed ? '' : 'touch-pan-x'} ${selected || walk ? 'invisible' : ''} flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2 pb-3 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]`}
      >
        <button type="button" onClick={() => sheet.setCollapsed(!sheet.collapsed)} aria-expanded={!sheet.collapsed} aria-label={sheet.collapsed ? 'Afficher le panneau' : 'Réduire le panneau'} className="mx-auto -mb-2 flex min-h-11 w-24 shrink-0 touch-none items-center justify-center border-0 bg-transparent">
          <span className="h-1.5 w-11 rounded-full bg-line-strong" />
        </button>
        <div ref={sheet.bodyRef} style={sheet.bodyStyle} className="-mx-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 [&>*]:shrink-0" aria-hidden={(sheet.collapsed && !sheet.small) || undefined} inert={(sheet.collapsed && !sheet.small) || undefined}>
          {/* V5 : le quartier, le pourcentage découvert en grand et sa barre dorée. */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">Le quartier</span>
              <h1 className="font-display text-[1.2941rem] leading-tight font-extrabold">Le territoire {ofName(dog.name)}</h1>
            </div>
            {share !== undefined && commune && (
              <p className="flex shrink-0 flex-col items-end leading-none" aria-label={shareLabel(share, commune.name)}>
                <span className="font-display text-[2rem] font-extrabold text-milestone-dark">{sharePercent(share)}</span>
                <span className="text-[0.7647rem] font-bold text-[#3F4946]">découvert</span>
              </p>
            )}
          </div>
          {share !== undefined && commune && (
            <span className="h-2.5 overflow-hidden rounded-full bg-placeholder" aria-hidden="true">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(3, Math.min(100, share * 100))}%` }} />
            </span>
          )}
          {walks.length === 0 ? (
            // App iOS (T-001) : les marches de la Watch arrivent seules ; le fichier GPX reste en secours.
            <p className="text-[0.9412rem] leading-snug text-[#3F4946]">{isNative() ? 'Partez en balade : le tracé lève le brouillard. Vos marches de l’Apple Watch arrivent seules.' : 'Importez vos balades Strava pour lever le brouillard.'}</p>
          ) : (
            <>
              <p className="text-[0.8824rem] leading-snug text-[#3F4946]" aria-live="polite">
                {highlighted ? <strong className="text-text">{highlighted.name}. </strong> : null}
                {territoryHint(highlighted, today)}
              </p>
              <div role="group" aria-label="Quoi afficher" className="scroll-row -mx-5 flex gap-1.5 px-5">
                {PANEL_FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
                    {f.label}
                  </button>
                ))}
                {/* Les spots de la meute, avec les filtres (T-031) ; pas chez un visiteur (R-073), qui n’est pas de la meute. */}
                {!readOnly && (
                  <button type="button" aria-pressed={packLayer} onClick={() => setPackLayer(!packLayer)} className={`flex items-center gap-1.5 ${chip(packLayer)}`}>
                    <span className="size-2.5 rounded-full bg-[#2559A8]" aria-hidden="true" />
                    Spots de la meute
                  </button>
                )}
              </div>
              {/* Les balades en cartes, à l’horizontale : un toucher la met en avant sur la carte, un autre la relâche. */}
              {shown.length === 0 ? (
                <p className="text-[0.8824rem] text-muted">Aucune balade pour ce choix.</p>
              ) : (
                <ul className="scroll-row m-0 -mx-5 flex list-none gap-2 px-5 py-0.5">
                  {local.slice(0, LIST_MAX).map((w) => {
                    const on = w.id === highlight
                    return (
                      <li key={w.id} className="shrink-0">
                        <button type="button" aria-pressed={on} onClick={() => setHighlight(on ? undefined : w.id)} className={`tap flex h-full w-[148px] flex-col items-start gap-1 rounded-[16px] border-2 border-solid bg-surface px-3 py-2.5 text-left text-text ${on ? 'border-primary' : 'border-[#E6EAE7]'}`}>
                          <span className="h-1.5 w-7 rounded-full" style={{ background: colors.get(w.id) }} aria-hidden="true" />
                          <span className="line-clamp-2 text-[0.8824rem] leading-tight font-bold">{w.name}</span>
                          <span className="text-[0.7647rem] text-[#3F4946]">
                            {formatRelative(w.date, today).replace(/^./, (c) => c.toLocaleUpperCase('fr'))} · {formatRouteDistance(w.route.distanceM)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  <li className="shrink-0">
                    <Link to={`/balades${filter !== 'toutes' ? `?filtre=${encodeURIComponent(filter)}` : ''}`} className="tap flex h-full min-h-[88px] w-[96px] flex-col items-center justify-center gap-1 rounded-[16px] bg-bg text-[0.8235rem] font-bold text-primary no-underline">
                      Toutes
                      <ChevronRightIcon size={18} />
                    </Link>
                  </li>
                </ul>
              )}
              {highlighted && (
                <button type="button" onClick={() => openWalk(highlighted.id)} className="btn btn-quiet min-h-11 self-start px-0 text-[0.8824rem] text-primary">
                  La revoir et y placer des repères
                  <ChevronRightIcon size={18} />
                </button>
              )}
            </>
          )}
          {/* À découvrir (T-029) : les lieux du coin, listés ici ; un toucher centre la carte dessus. */}
          {here && discover.length > 0 && (
            <div className="flex flex-col gap-1">
              <h2 className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-muted uppercase">À découvrir</h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {discover.map((idea, i) => (
                  <li key={idea.id} className={i ? 'border-t border-divider' : ''}>
                    <button type="button" onClick={() => setSelectedId(idea.id)} className="flex min-h-12 w-full items-center gap-3 border-0 bg-transparent px-0 py-1.5 text-left text-text">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-[1.0588rem] font-extrabold" aria-hidden="true">
                        {idea.explored ? KIND[idea.kind].icon : '?'}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[1rem] font-bold">{idea.explored ? idea.name : KIND[idea.kind].label}</span>
                        <span className="truncate text-[0.8824rem] text-muted">
                          {metersLabel(idea.meters)} {arrowTo(here, idea)}
                        </span>
                      </span>
                      <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* L’action principale : partir (iOS) ; sur le web, ajouter ses balades (import). Collée au bas du panneau : jamais à faire défiler. */}
          {!readOnly && (
          <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 bg-surface px-5 pt-2 pb-1">
            {isNative() ? (
              <>
                <Link to="/balade-en-cours?depart=1" className="tap btn btn-main min-h-[56px]">
                  Partir en balade
                </Link>
                {walks.length === 0 && (
                  <Link to="/importer" className="btn btn-outline min-h-12">
                    Importer un fichier GPX
                  </Link>
                )}
              </>
            ) : (
              <Link to="/importer" className="tap btn btn-main min-h-[56px] gap-2">
                <PlusIcon size={22} />
                Ajouter mes balades
              </Link>
            )}
          </div>
          )}
        </div>
      </section>
      {walk && walkEntry && !selected && <WalkPanel readOnly={readOnly} entryId={walkEntry.id} name={walks.find((w) => w.id === walkEntry.id)?.name ?? 'La balade'} date={walkEntry.date} route={walk.route} color={walk.color} replaying={replaying} onReplay={() => setReplaying(!replaying)} onClose={closeWalk} />}
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
