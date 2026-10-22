import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Stats } from '../../components/Stats'
import { formatDuration } from '../../lib/balade'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isNative } from '../../native'
import { ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { removeSpot, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { knownFog } from '../../lib/fog'
import { useToday } from '../../lib/useToday'
import { filterWalks, walkColors, walkItems, walksNear, walksTotals, type WalkFilter, type WalkItem } from '../../lib/walkList'
import type { MapPlace, MapWalk } from './ExplorerMap'
import { PlaceCard, type Selected } from './PlaceCard'
import { WalkPanel } from './WalkPanel'
import { LoopsBlock } from './LoopsBlock'
import { useSheet, type Snap } from './useSheet'
import { PlaceMoment } from '../trajets/PlaceMoment'
import { updateEntryRoute } from '../../firebase/db'
import { nearestOnRoute, readRoute, storeRoute, type Route } from '../../lib/route'
import { useGrantedPosition } from '../../lib/useGrantedPosition'
import { formatRelative } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { territoryHint, walkLineDetails } from '../../lib/territory'
import { ofName } from '../../lib/gender'
import { useReadOnly } from '../../firebase/viewer'
import { WatchOptIn } from './WatchOptIn'
import { ROUTE_COLOR } from '../../components/maplibre'

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

/** T-098 : le cran du panneau gardé dans l’adresse (« ?cran= »), pour le retrouver au retour de la fiche d’une balade. */
const SNAPS: Snap[] = ['collapsed', 'half', 'full']

/** T-098 : ce qu’on dit à la fiche d’une balade pour son bouton retour. */
const FROM_MAP = { retour: 'La carte' }

const pill = 'pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full border-0 bg-surface px-4 text-[0.8824rem] font-bold text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]'

const toggle = (on: boolean) => `min-h-11 rounded-full border-0 px-3.5 text-[0.8824rem] font-bold ${on ? 'bg-text text-white' : 'bg-transparent text-text'}`

/** La carte qui se découvre (maquettes V3-Explorer, V4-Balades) : le territoire de Billy. */
export default function Explorer() {
  const { dog, entries, fog } = useData()
  const today = useToday()
  const readOnly = useReadOnly()
  const [prefs, setPrefs] = useState(readPrefs)
  // « Voir ces balades sur la carte » garde le filtre choisi dans la liste.
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  // Gelé (T-072) : la carte ne lit plus la meute (ni spots, ni marques) et n’a plus le calque « Spots de la meute ».
  // Le code des spots reste en place, branché sur des listes vides.
  const packLayer = false
  const spots = useMemo<WithId<Spot>[]>(() => [], [])
  const marks = useMemo<WithId<Mark>[]>(() => [], [])

  const cells = useMemo(() => knownFog(fog), [fog])
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  // Une couleur par balade, la même sur la carte et dans la liste.
  const colors = useMemo(() => walkColors(walks), [walks])
  // Une balade touchée dans le panneau : son trait s’épaissit, les autres passent à 25 % ; un autre toucher la relâche.
  const [highlight, setHighlight] = useState<string>()
  const tracks = useMemo<MapWalk[]>(() => {
    const all = shown.map((w) => ({ id: w.id, color: colors.get(w.id) ?? ROUTE_COLOR, points: w.route.points, bold: w.id === highlight, faded: Boolean(highlight) && w.id !== highlight }))
    // La balade mise en avant est dessinée en dernier, au-dessus des autres.
    return [...all.filter((t) => !t.bold), ...all.filter((t) => t.bold)]
  }, [shown, colors, highlight])
  const last = walks[0]
  // Où l’on est (T-020) : la position demandée avec « Autour de moi », sinon celle déjà autorisée, sinon la dernière balade.
  const [myPos, setMyPos] = useState<{ lat: number; lng: number }>()
  const [locating, setLocating] = useState(false)
  const position = useGrantedPosition()
  const here = myPos ?? position
  const start = myPos ?? position ?? (last ? { lat: last.route.points[0]![0], lng: last.route.points[0]![1] } : undefined)
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


  // Les spots marqués par Billy restent sur la carte, avec leur goutte.
  const me = auth.currentUser?.uid ?? ''
  const places = useMemo<MapPlace[]>(() => {
    const mine = new Set(marks.filter((m) => m.uid === me).map((m) => m.spotId))
    const marked = spots.filter((s) => mine.has(s.id)).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, name: s.name, icon: '💧' }))
    const pack = packLayer ? spots.filter((s) => !mine.has(s.id)).map((s) => ({ id: `meute:${s.id}`, lat: s.lat, lng: s.lng, name: s.name, icon: '🐾' })) : []
    return [...marked, ...pack]
  }, [spots, marks, me, packLayer])
  // Un lieu touché : la carte s’y centre et la petite fenêtre dit ce que c’est.
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('spot'))
  const selected = useMemo<Selected | undefined>(() => {
    if (!selectedId) return undefined
    const spotId = selectedId.replace(/^meute:/, '')
    const spot = spots.find((s) => s.id === spotId)
    return spot ? { spot, mine: marks.filter((m) => m.spotId === spot.id && m.uid === me) } : undefined
  }, [selectedId, spots, marks, me])
  const focusAt = selected?.spot
  const focus = useMemo<[number, number] | undefined>(() => (focusAt ? [focusAt.lat, focusAt.lng] : undefined), [focusAt?.lat, focusAt?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // R-077 : le panneau à trois crans ; réduit, il garde le titre et le pourcentage au-dessus de l’action fixée en bas.
  const peekRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [footerHeight, setFooterHeight] = useState(0)
  useLayoutEffect(() => {
    const footer = footerRef.current
    if (!footer) return setFooterHeight(0)
    const measure = () => setFooterHeight(footer.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [readOnly])
  // R-082 : au cran du milieu, la première rangée de balades entière au-dessus de l’action fixée en bas.
  const firstRow = useRef<HTMLUListElement>(null)
  const sheet = useSheet({ peekRef, halfRef: firstRow, bottomInset: footerHeight, start: SNAPS.find((c) => c === params.get('cran')) ?? 'half' })

  // Une balade ouverte depuis son souvenir (?balade=…) : mise en avant, replay, repères à placer.
  const walkId = params.get('balade')
  const walkEntry = walkId ? entries.find((e) => e.id === walkId) : undefined
  const walkRoute = useMemo(() => readRoute(walkEntry?.route), [walkEntry?.route])
  const walkPhotos = useMemo(() => (walkEntry?.photos ?? []).flatMap((p, index) => (p.lat !== undefined && p.lng !== undefined ? [{ index, thumbFileId: p.thumbFileId, lat: p.lat, lng: p.lng }] : [])), [walkEntry?.photos])
  const [replaying, setReplaying] = useState(false)
  const [placing, setPlacing] = useState<{ lat: number; lng: number } | null>(null)
  const centerRef = useRef<((visibleBottom: number) => { lat: number; lng: number }) | null>(null)
  // R-059 : « Ajouter un repère » sans viser la carte : au point du tracé le plus proche du centre de ce qu’on voit.
  const addMark = (visibleBottom: number) => {
    if (!walkRoute?.points.length) return
    const center = centerRef.current?.(visibleBottom)
    // Carte pas encore prête : le milieu du tracé.
    const middle = walkRoute.points[Math.floor(walkRoute.points.length / 2)]!
    const at = center && Number.isFinite(center.lat) ? nearestOnRoute(center, walkRoute.points) : { lat: middle[0], lng: middle[1] }
    if (at) setPlacing(at)
  }
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
          centerRef,
          // Une petite fenêtre de lieu ouverte : le toucher la referme seulement.
          onLeave: () => !selectedId && closeWalk(),
          onPhoto: () => navigate(`/souvenir/${walkEntry.id}`),
          // V6 § 1 : la balade ouverte, en vert carte.
          color: ROUTE_COLOR,
        }
      : undefined
  // Toucher un tracé (ou une balade de la liste) : elle passe au premier plan ; « Toutes les balades » revient à la vue d’ensemble.
  // Depuis la carte, ouvrir puis refermer une balade ne laisse pas d’entrée en double dans l’historique (T-024).
  const openWalk = (id: string) => navigate(`/territoire?balade=${encodeURIComponent(id)}${filter !== 'toutes' ? `&filtre=${encodeURIComponent(filter)}` : ''}`, { replace: true })
  const closeWalk = () => navigate(`/territoire${filter !== 'toutes' ? `?filtre=${encodeURIComponent(filter)}` : ''}`, { replace: true })
  // T-098 : la carte en plein écran s’ouvre depuis la fiche d’une balade ; son retour y ramène.
  const backToSheet = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else if (walkEntry) navigate(`/souvenir/${encodeURIComponent(walkEntry.id)}`, { replace: true })
    else closeWalk()
  }
  // T-098 : le filtre et le cran du panneau dans l’adresse (sans nouvelle entrée d’historique) : le retour de la fiche
  // d’une balade retrouve le panneau tel qu’on l’a laissé.
  useEffect(() => {
    if (walkId) return
    const next = new URLSearchParams(params)
    if (filter === 'toutes') next.delete('filtre')
    else next.set('filtre', filter)
    if (sheet.snap === 'half') next.delete('cran')
    else next.set('cran', sheet.snap)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sheet.snap, walkId])
  // T-098 : un tracé touché sur la carte est mis en avant (sa ligne apparaît en bas du panneau) ; touché encore, sa
  // fiche s’ouvre. Une balade ouverte en plein écran (depuis sa fiche) : un autre tracé prend sa place.
  const openSheet = (id: string) => navigate(`/souvenir/${encodeURIComponent(id)}`, { state: FROM_MAP })
  const onTrack = (id: string) => (walk ? openWalk(id) : id === highlight ? openSheet(id) : setHighlight(id))
  // La boussole : l’aiguille suit la carte ; un toucher la remet face au nord.
  const [bearing, setBearing] = useState(0)
  const [north, setNorth] = useState(0)
  // « Affichage » : un petit panneau Plan / Satellite, 2D / 3D.
  const [display, setDisplay] = useState(false)
  const turned = Math.round(((bearing % 360) + 360) % 360) % 360 !== 0
  const highlighted = shown.find((w) => w.id === highlight)
  const onMapTap = () => {
    setSelectedId(null)
    setHighlight(undefined)
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
        <ExplorerMap cells={cells} tracks={tracks} frame={frame} frameKey={frameKey} me={myPos ? [myPos.lat, myPos.lng] : undefined} onWalk={onTrack} places={places} satellite={prefs.satellite} three={prefs.three} center={start ? [start.lat, start.lng] : undefined} focus={focus} onPlace={setSelectedId} onMapTap={onMapTap} onBearing={setBearing} north={north} walk={walk} dogName={dog.name} />
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
          {/* Me situer (T-020) : la carte et la commune suivent l’endroit où l’on est. */}
          <button type="button" onClick={locate} aria-label="Me situer : les balades du coin où je suis" className={`tap ${pill}`}>
            {/* Actif : seule l’icône passe en bleu, le texte garde sa couleur (contraste, R-067). */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className={`${locating ? 'animate-pulse' : ''} ${myPos ? 'text-[#2F7BF6]' : ''}`}>
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
        aria-label={dog.unnamed ? 'Son territoire' : `Le territoire ${ofName(dog.name)}`}
        {...sheet.handlers}
        style={sheet.style}
        className={`absolute inset-x-0 top-[calc(env(safe-area-inset-top)+62px)] bottom-0 z-10 mx-auto flex max-w-[430px] ${selected || walk ? 'invisible' : ''} flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]`}
      >
        {/* La poignée : réduit → moitié → haut → moitié ; au cran haut, une flèche ⌄ pour réduire. */}
        <button type="button" onClick={sheet.cycle} aria-expanded={!sheet.collapsed} aria-label={sheet.handleLabel} className="mx-auto -mb-2 flex min-h-11 w-24 shrink-0 touch-none items-center justify-center border-0 bg-transparent">
          {sheet.snap === 'full' ? (
            <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
              <path d="M3 3l11 8 11-8" fill="none" stroke="#7D8783" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="h-1.5 w-11 rounded-full bg-line-strong" />
          )}
        </button>
        <div
          ref={sheet.bodyRef}
          onScroll={sheet.onBodyScroll}
          style={{ paddingBottom: footerHeight + 12 }}
          className={`-mx-5 flex min-h-0 flex-1 flex-col gap-3 overscroll-contain px-5 [&>*]:shrink-0 ${sheet.snap === 'full' ? 'overflow-y-auto' : 'overflow-y-hidden [&_.scroll-row]:touch-pan-x'}`}
        >
          {/* V5 : le quartier (visible même réduit). */}
          <div ref={peekRef} className="flex min-w-0 flex-col">
            <span className="text-milestone-dark surtitre">Le quartier</span>
            {/* R-089 : sans nom, « Son territoire ». */}
            <h1 className="title-section">{dog.unnamed ? 'Son territoire' : `Le territoire ${ofName(dog.name)}`}</h1>
          </div>
          {/* V6.1 § 1 : une ligne de résumé à la place du pourcentage découvert ; elle suit le filtre. */}
          {walks.length > 0 && <WalksSummary items={shown} />}
          {walks.length === 0 ? (
            // App iOS (T-001) : les marches de la Watch arrivent seules ; le fichier GPX reste en secours.
            <>
              <p className="text-[0.9412rem] leading-snug text-[#3F4946]">{isNative() ? 'Partez en balade : le tracé lève le brouillard.' : 'Importez vos balades Strava pour lever le brouillard.'}</p>
              {/* R-079 : l’accès à Santé seulement si on le choisit. */}
              {!readOnly && <WatchOptIn compact />}
            </>
          ) : (
            <>
              <p className="text-[0.8824rem] leading-snug text-[#3F4946]" aria-live="polite">
                {territoryHint(highlighted, today)}
              </p>
              <div role="group" aria-label="Quoi afficher" className="scroll-row -mx-5 flex gap-1.5 px-5">
                {PANEL_FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
                    {f.label}
                  </button>
                ))}
                {/* Gelé (T-072) : le bouton « Spots de la meute » est retiré. */}
              </div>
              {/* Les balades en cartes, à l’horizontale : un toucher ouvre sa fiche (T-098). */}
              {shown.length === 0 ? (
                <p className="text-[0.8824rem] text-muted">Aucune balade pour ce choix.</p>
              ) : (
                <ul ref={firstRow} className="scroll-row m-0 -mx-5 flex list-none gap-2 px-5 py-0.5">
                  {local.slice(0, LIST_MAX).map((w) => {
                    const on = w.id === highlight
                    return (
                      <li key={w.id} className="shrink-0">
                        <Link to={`/souvenir/${encodeURIComponent(w.id)}`} state={FROM_MAP} className={`tap flex h-full w-[164px] flex-col items-start gap-1 rounded-[16px] border-2 border-solid bg-surface px-3 py-2.5 text-left text-text no-underline ${on ? 'border-primary' : 'border-[#E6EAE7]'}`}>
                          <span className="h-1.5 w-7 rounded-full" style={{ background: colors.get(w.id) }} aria-hidden="true" />
                          <span className="title-card line-clamp-2">{w.name}</span>
                          <span className="text-[0.7647rem] text-[#3F4946]">{formatRelative(w.date, today).replace(/^./, (c) => c.toLocaleUpperCase('fr'))}</span>
                          <Stats items={[{ value: formatRouteDistance(w.route.distanceM), label: 'Distance' }, { value: w.route.durationMin ? formatDuration(w.route.durationMin) : '', label: 'Durée' }]} className="mt-auto self-stretch" />
                        </Link>
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
              {/* T-089 : « Boucles pour Billy » (app iOS : on part de là en balade), seulement avec la position. */}
              {isNative() && !readOnly && here && <LoopsBlock walks={walks} here={here} known={cells} dogName={dog.name} birthDate={dog.birthDate} today={today} />}
            </>
          )}
        </div>
      </section>
      {/* L’action principale : partir (iOS) ; sur le web, ajouter ses balades (import). Fixée en bas, à tous les crans du
          panneau (R-077), au-dessus du rond Accueil qui dépasse de 26 px de la barre (R-072). */}
      {!readOnly && (
          <div ref={footerRef} className={`absolute inset-x-0 bottom-0 z-[11] mx-auto flex max-w-[430px] flex-col gap-2 bg-surface px-5 pt-2 pb-9 ${selected || walk ? 'invisible' : ''}`}>
            {highlighted && <TrackLine walk={highlighted} color={colors.get(highlighted.id)} today={today} />}
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
      {/* Visiteur : pas d’action fixée en bas, la ligne du tracé touché y prend place seule. */}
      {readOnly && highlighted && !selected && !walk && (
        <div className="absolute inset-x-0 bottom-0 z-[11] mx-auto flex max-w-[430px] flex-col bg-surface px-5 pt-2 pb-9">
          <TrackLine walk={highlighted} color={colors.get(highlighted.id)} today={today} />
        </div>
      )}
      {walk && walkEntry && !selected && <WalkPanel readOnly={readOnly} source={walkEntry.source} name={walks.find((w) => w.id === walkEntry.id)?.name ?? 'La balade'} date={walkEntry.date} route={walk.route} color={walk.color} replaying={replaying} onReplay={() => setReplaying(!replaying)} onAddMark={addMark} onClose={backToSheet} />}
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
          here={myPos ?? position}
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

/** T-098 : la ligne d’un tracé touché sur la carte, « Balade du matin · 22 oct. · 2,1 km › » : la toucher ouvre sa fiche. */
function TrackLine({ walk, color, today }: { walk: WalkItem; color?: string; today: string }) {
  return (
    <Link to={`/souvenir/${encodeURIComponent(walk.id)}`} state={FROM_MAP} aria-label={`${walk.name}, ${walkLineDetails(walk, today)}. Ouvrir sa fiche`} className="anim-pop tap -mx-2 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-bg px-3 text-[0.9412rem] text-text no-underline">
      <span className="h-1.5 w-6 shrink-0 rounded-full" style={{ background: color ?? ROUTE_COLOR }} aria-hidden="true" />
      <span className="flex min-w-0 gap-1">
        <span className="min-w-0 truncate font-bold">{walk.name}</span>
        <span className="shrink-0 text-[#3F4946]">· {walkLineDetails(walk, today)}</span>
      </span>
      <ChevronRightIcon size={18} className="ml-auto shrink-0 text-primary" />
    </Link>
  )
}

/**
 * V6.1 § 1 : « 12 balades · 18,4 km · 9 h 40 de balade », chiffres en gras, les trois valeurs réparties sur toute la
 * largeur. Elles suivent le filtre choisi.
 */
function WalksSummary({ items }: { items: WalkItem[] }) {
  const t = walksTotals(items)
  return (
    <p className="flex flex-wrap justify-between gap-x-3 text-[0.8824rem] text-[#3F4946] tabular-nums" aria-live="polite">
      <span>
        <b className="text-text">{t.count}</b> {t.countLabel}
      </span>
      <b className="text-text">{t.distance}</b>
      {t.time && (
        <span>
          <b className="text-text">{t.time}</b> de balade
        </span>
      )}
    </p>
  )
}
