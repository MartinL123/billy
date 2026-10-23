import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isNative } from '../../native'
import { CloseIcon, PlusIcon } from '../../components/Icons'
import { FileImage } from '../../components/FileImage'
import { MapButton } from '../../components/Buttons'
import type { Entry } from '../../firebase/types'
import { ofDog } from '../../lib/dogName'
import { pickLoops, type Loop } from '../../lib/loops'
import { journalDays, memoLine, type JournalMemo } from '../../lib/walkJournal'
import { JournalWalkCard } from './JournalWalkCard'
import { auth } from '../../firebase/app'
import { removeSpot, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { knownFog } from '../../lib/fog'
import { readMapPrefs, writeMapPrefs } from '../../lib/mapPrefs'
import { heatPoints } from '../../lib/heatmap'
import { useToday } from '../../lib/useToday'
import { emptyFilterText, filterWalks, PANEL_FILTERS, walkColors, walkItems, walksNear, walksTotals, type WalkFilter, type WalkItem } from '../../lib/walkList'
import type { MapPlace, MapWalk } from './ExplorerMap'
import { PlaceCard, type Selected } from './PlaceCard'
import { LoopsBlock } from './LoopsBlock'
import { HOME_CLEARANCE, useSheet, type Snap } from './useSheet'
import { PlaceMoment } from '../trajets/PlaceMoment'
import { WalkSheet } from '../trajets/WalkSheet'
import { ReplayPanel } from './ReplayPanel'
import type { ReplayChannel } from './walkLayer'
import { updateEntryRoute } from '../../firebase/db'
import { nearestOnRoute, readRoute, storeRoute, type Route } from '../../lib/route'
import { useGrantedPosition } from '../../lib/useGrantedPosition'
import { formatRouteDistance } from '../../lib/route'
import { journalOnMap, panelMode, walkOnMap } from '../../lib/mapPanel'
import { notedOutings } from '../../lib/notedOutings'
import { OutingSheet } from './OutingSheet'
import { photoPins, type PhotoPin } from '../../lib/walkFiche'
import { replaySpan } from '../../lib/walkReplay'
import type { Padding } from '../../lib/mapFrame'
import { useBack } from '../../lib/useBack'
import { modernCard } from '../../lib/carnet'
import { useReadOnly } from '../../firebase/viewer'
import { WatchOptIn } from './WatchOptIn'
import { ROUTE_COLOR } from '../../components/maplibre'

// R-094 : la fiche d’une balade vit sur cette carte ; si le code de la carte ne se charge pas (hors ligne sans copie
// en cache, version de l’app remplacée), l’écran ne doit pas tomber : la fiche reste lisible, sur un fond uni.
const ExplorerMap = lazy(() =>
  import('./ExplorerMap')
    .then((m) => ({ default: m.ExplorerMap }))
    .catch(() => ({ default: MapUnavailable })),
)

/** La carte n’a pas pu se charger : un message calme à la place. */
function MapUnavailable() {
  return (
    <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] flex justify-center px-4">
      <p role="status" className="rounded-full bg-surface px-4 py-2 text-[0.8824rem] font-semibold text-text shadow-float">
        La carte s’affichera avec le réseau.
      </p>
    </div>
  )
}

/** Une pastille de filtre (maquette V6-Billy-et-journal) : 32 px dessinés dans une zone de 44 px. */
const chip = (on: boolean) => `flex h-8 items-center rounded-full border border-solid px-3 text-[0.8235rem] font-bold whitespace-nowrap ${on ? 'border-primary bg-primary text-white' : 'border-[#D3D9D6] bg-surface text-text'}`


/** T-098 : le cran du panneau gardé dans l’adresse (« ?cran= ») ; R-094 : aussi le cran où s’ouvre une balade. */
const SNAPS: Snap[] = ['collapsed', 'half', 'full']

/** Ce qu’on dit au détail d’un souvenir (sans trajet) pour son bouton retour. */
const FROM_MAP = { retour: 'La carte' }

const toggle = (on: boolean) => `min-h-11 rounded-full border-0 px-3.5 text-[0.8824rem] font-bold whitespace-nowrap ${on ? 'bg-text text-white' : 'bg-transparent text-text'}`

/**
 * La carte qui se découvre (maquettes V3-Explorer, V4-Balades) : le territoire de Billy. R-094 « Une seule carte » :
 * son panneau montre le journal, la fiche d’une balade (`?balade=`) ou sa relecture en 3ᵉ personne (`&revoir=1`,
 * R-096), toujours sur cette même carte.
 */
export default function Explorer() {
  const { dog, entries, fog, walks: walkDays } = useData()
  const today = useToday()
  const readOnly = useReadOnly()
  const [prefs, setPrefs] = useState(() => readMapPrefs())
  // « Voir ces balades sur la carte » garde le filtre choisi dans la liste.
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  // Gelé (T-072) : la carte ne lit plus la meute (ni spots, ni marques) et n’a plus le calque « Spots de la meute ».
  // Le code des spots reste en place, branché sur des listes vides.
  const packLayer = false
  const spots = useMemo<WithId<Spot>[]>(() => [], [])
  const marks = useMemo<WithId<Mark>[]>(() => [], [])

  const cells = useMemo(() => knownFog(fog), [fog])
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  // T-109 : « Lieux les plus fréquentés » (« Affichage », éteint par défaut) : les passages de toutes les balades.
  const heat = useMemo(() => (prefs.heat ? heatPoints(walks.map((w) => w.route.points)) : undefined), [walks, prefs.heat])
  // Une couleur par balade, la même sur la carte et dans la liste. Brouillard éteint (V6.1 § 2) : toutes en vert carte.
  const colors = useMemo(() => (prefs.fog ? walkColors(walks) : new Map(walks.map((w) => [w.id, ROUTE_COLOR]))), [walks, prefs.fog])
  // T-097 : une idée de balade touchée : la boucle s’affiche sur la carte, le bouton devient « Partir sur cette boucle ».
  const [idea, setIdea] = useState<Loop>()
  const tracks = useMemo<MapWalk[]>(() => {
    const all = shown.map((w) => ({ id: w.id, color: colors.get(w.id) ?? ROUTE_COLOR, points: w.route.points, faded: Boolean(idea) }))
    // L’idée choisie, au-dessus de tout.
    return [...all, ...(idea ? [{ id: `idee:${idea.item.id}`, color: IDEA_COLOR, points: idea.item.route.points, bold: true }] : [])]
  }, [shown, colors, idea])
  const last = walks[0]
  // Où l’on est (T-020) : la position demandée avec « Autour de moi », sinon celle déjà autorisée, sinon la dernière balade.
  const [myPos, setMyPos] = useState<{ lat: number; lng: number }>()
  const [locating, setLocating] = useState(false)
  const position = useGrantedPosition()
  const here = myPos ?? position
  // T-097 : « Idées de balade » (app iOS, avec la position) : jusqu’à 3 balades passées qui partent d’ici.
  const loops = useMemo(() => (isNative() && !readOnly && here && prefs.ideas ? pickLoops(walks, here, cells, { birthDate: dog.birthDate, today }) : []), [walks, here?.lat, here?.lng, cells, dog.birthDate, today, readOnly, prefs.ideas]) // eslint-disable-line react-hooks/exhaustive-deps
  const start = myPos ?? position ?? (last ? { lat: last.route.points[0]![0], lng: last.route.points[0]![1] } : undefined)
  // La carte se cadre sur les balades du coin (Saint-Ouen, la Bretagne…), pas sur toute la France.
  const local = useMemo(() => walksNear(shown, start), [shown, start?.lat, start?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  // Une idée choisie : la carte se cadre sur sa boucle.
  const frame = useMemo(() => (idea ? idea.item.route.points : local.flatMap((w) => w.route.points)), [local, idea])
  const frameKey = idea ? `idee:${idea.item.id}` : local.map((w) => w.id).join(',')
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

  // R-094 : ce que montre le panneau, lu dans l’adresse : le journal, la fiche d’une balade ou sa relecture.
  const mode = panelMode(params)
  const walkId = mode.kind === 'journal' || mode.kind === 'outing' ? null : mode.id
  const found = walkId ? entries.find((e) => e.id === walkId) : undefined
  const walkEntry = useMemo(() => (found ? modernCard(found) : undefined), [found])
  const walkRoute = useMemo(() => readRoute(walkEntry?.route), [walkEntry?.route])
  const canReplay = Boolean(walkRoute && replaySpan(walkRoute))
  // R-095 : une sortie notée sans trajet ouvre sa petite fiche dans le panneau (la carte reste sur toutes les balades).
  const outings = useMemo(() => notedOutings(walkDays, entries), [walkDays, entries])
  const outing = mode.kind === 'outing' ? outings.find((o) => o.id === mode.id) : undefined
  const kind: 'journal' | 'sheet' | 'replay' | 'outing' = outing ? 'outing' : !walkEntry || !walkRoute ? 'journal' : mode.kind === 'replay' && canReplay ? 'replay' : 'sheet'
  // Ouverte depuis un autre écran (Accueil, Billy…) : le retour y ramène et le dit (« ‹ Accueil »).
  const retour = (location.state as { retour?: string } | null)?.retour
  const back = useBack(journalOnMap(filter))

  // R-077 : le panneau à trois crans dans tous les modes ; réduit, il garde le titre du journal, le résumé d’une
  // balade, ou la lecture et sa barre.
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
  }, [readOnly, kind])
  // T-097 : au cran du milieu, le titre, le résumé, les filtres et le début des « Idées de balade » au-dessus de l’action
  // fixée en bas ; réduit, le panneau se colle à la barre d’onglets (sans action), le titre coupé à mi-hauteur.
  const ideasHead = useRef<HTMLDivElement>(null)
  const filtersRow = useRef<HTMLDivElement>(null)
  // La fiche : réduit, le résumé (jusqu’à « Revoir » et « Raconter ») ; la relecture : réduit, lecture et barre, au
  // milieu, les vitesses aussi.
  const sheetPeek = useRef<HTMLDivElement>(null)
  const outingPeek = useRef<HTMLDivElement>(null)
  const replayPeek = useRef<HTMLDivElement>(null)
  const replayHalf = useRef<HTMLDivElement>(null)
  const snapParam = SNAPS.find((c) => c === params.get('cran'))
  const sheet = useSheet({
    peekRef: kind === 'journal' ? peekRef : kind === 'sheet' ? sheetPeek : kind === 'outing' ? outingPeek : replayPeek,
    halfRef: kind === 'journal' ? (loops.length ? ideasHead : filtersRow) : kind === 'replay' ? replayHalf : undefined,
    bottomInset: kind === 'journal' ? footerHeight || HOME_CLEARANCE : HOME_CLEARANCE,
    ...(kind === 'journal' ? { peekInset: 0, peekGap: 0 } : {}),
    start: snapParam ?? 'half',
  })

  // La photo ouverte en grand, le doigt sur la courbe d’allure, une photo à montrer sur la carte : ceux de la balade ouverte.
  const [viewer, setViewer] = useState<number | null>(null)
  const [cursor, setCursor] = useState<{ lat: number; lng: number }>()
  const [photoAt, setPhotoAt] = useState<{ lat: number; lng: number; n: number }>()
  // Un autre mode ou une autre balade : le panneau prend le cran demandé (un tracé touché : réduit, sur le résumé).
  const modeKey = `${kind}:${walkId ?? outing?.id ?? ''}`
  const lastMode = useRef(modeKey)
  useEffect(() => {
    if (lastMode.current === modeKey) return
    lastMode.current = modeKey
    setViewer(null)
    setCursor(undefined)
    setPhotoAt(undefined)
    sheet.setSnap(kind === 'replay' ? 'half' : (snapParam ?? 'half'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeKey])

  // La carte se cadre dans ce que le panneau laisse voir (sous les boutons du haut, au-dessus du panneau).
  const rootRef = useRef<HTMLDivElement>(null)
  const [mapPad, setMapPad] = useState<Padding>({ top: 72, bottom: 300, left: 32, right: 32 })
  useLayoutEffect(() => {
    const root = rootRef.current
    const panel = sheet.ref.current
    if (!root || !panel) return
    const top = panel.offsetTop
    const bottom = Math.max(32, root.clientHeight - (top + sheet.offset) + 16)
    setMapPad((p) => (p.top === top + 8 && p.bottom === bottom ? p : { top: top + 8, bottom, left: 32, right: 32 }))
  }, [sheet.offset, kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const pins = useMemo(() => (walkEntry && walkRoute ? photoPins(walkEntry.photos, walkRoute) : []), [walkEntry, walkRoute])
  const [placing, setPlacing] = useState<{ lat: number; lng: number } | null>(null)
  // R-059 : « Ajouter un repère » sans viser la carte : au point du tracé le plus proche du centre de ce qu’on voit
  // au-dessus du panneau ; carte pas encore prête : le milieu du tracé. Puis la même fenêtre que toucher le tracé.
  const centerRef = useRef<((visibleBottom: number) => { lat: number; lng: number }) | null>(null)
  const addMark = () => {
    if (!walkRoute?.points.length) return
    const center = centerRef.current?.(sheet.ref.current?.getBoundingClientRect().top ?? window.innerHeight)
    const middle = walkRoute.points[Math.floor(walkRoute.points.length / 2)]!
    const at = center && Number.isFinite(center.lat) ? nearestOnRoute(center, walkRoute.points) : { lat: middle[0], lng: middle[1] }
    if (at) setPlacing(at)
  }
  const saveMoments = (moments: Route['moments']) => walkEntry && walkRoute && updateEntryRoute(walkEntry.id, storeRoute({ ...walkRoute, moments }))
  // R-096 : le lien entre l’horloge de la relecture (dans le panneau) et la caméra de la carte.
  const replayChannel = useRef<ReplayChannel>({})
  // Dans l’onglet, passer du journal à une balade, à sa relecture, et revenir ne laisse pas d’entrée en double dans
  // l’historique (T-024) ; l’écran d’où l’on vient (`retour`) reste connu.
  const go = (to: string) => navigate(to, { replace: true, state: location.state })
  const openWalk = (id: string, snap?: Snap) => go(walkOnMap(id, { snap, filter }))
  const toJournal = () => navigate(journalOnMap(filter), { replace: true })
  const walk =
    walkEntry && walkRoute
      ? {
          id: walkEntry.id,
          route: walkRoute,
          photos: pins,
          // Visiteur (T-048) : pas de repère à placer.
          onTapRoute: (at: { lat: number; lng: number }) => !readOnly && kind === 'sheet' && setPlacing(at),
          // Une petite fenêtre de lieu ouverte : le toucher la referme seulement.
          onLeave: () => !selectedId && toJournal(),
          onPhoto: (index: number) => kind === 'sheet' && setViewer(index),
          // V6 § 1 : la balade ouverte, en vert carte (colorée par allure si on la connaît).
          color: ROUTE_COLOR,
          padding: mapPad,
          cursor,
          center: photoAt,
          centerRef,
          ...(kind === 'replay' ? { replay: replayChannel } : {}),
        }
      : undefined
  // T-098 : le filtre et le cran du panneau dans l’adresse (sans nouvelle entrée d’historique) : le retour d’une balade
  // retrouve le journal tel qu’on l’a laissé.
  useEffect(() => {
    if (walkId || kind === 'outing') return
    const next = new URLSearchParams(params)
    if (filter === 'toutes') next.delete('filtre')
    else next.set('filtre', filter)
    if (sheet.snap === 'half') next.delete('cran')
    else next.set('cran', sheet.snap)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sheet.snap, walkId])
  // R-094 : un tracé touché sur la carte : la balade s’ouvre dans le panneau, réduit sur son résumé.
  const onTrack = (id: string) => {
    if (id.startsWith('idee:')) return
    setIdea(undefined)
    openWalk(id, 'collapsed')
  }
  // « Voir sur la carte » d’une photo : le panneau descend, la carte va à la photo.
  const showOnMap = (pin: PhotoPin) => {
    sheet.setSnap('collapsed')
    setPhotoAt((p) => ({ lat: pin.lat, lng: pin.lng, n: (p?.n ?? 0) + 1 }))
  }
  // L’heure et la rue de la relecture, posées en haut à droite de la carte.
  const [pillSlot, setPillSlot] = useState<HTMLDivElement | null>(null)
  // La boussole : l’aiguille suit la carte ; un toucher la remet face au nord.
  const [bearing, setBearing] = useState(0)
  const [north, setNorth] = useState(0)
  // « Affichage » : un petit panneau Plan / Satellite, 2D / 3D, Brouillard (V6.1 § 2).
  const [display, setDisplay] = useState(false)
  const turned = Math.round(((bearing % 360) + 360) % 360) % 360 !== 0
  const onMapTap = () => {
    setSelectedId(null)
    setIdea(undefined)
    setDisplay(false)
  }
  const pickIdea = (loop: Loop) => {
    setIdea(loop)
    sheet.setSnap('collapsed')
  }
  // Réduit, sans idée touchée : la carte en plein écran, pas de bouton (V6.1 § 4).
  const footerShown = !sheet.collapsed || Boolean(idea)

  const setPref = (next: Partial<typeof prefs>) => {
    const value = { ...prefs, ...next }
    setPrefs(value)
    writeMapPrefs(value)
  }

  return (
    <div ref={rootRef} className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] overflow-hidden bg-[#22332F]">
      <Suspense fallback={null}>
        <ExplorerMap cells={cells} tracks={tracks} frame={frame} frameKey={frameKey} me={myPos ? [myPos.lat, myPos.lng] : undefined} onWalk={onTrack} places={places} satellite={prefs.satellite} three={prefs.three} fog={prefs.fog} heat={heat} center={start ? [start.lat, start.lng] : undefined} focus={focus} onPlace={setSelectedId} onMapTap={onMapTap} onBearing={setBearing} north={north} walk={walk} dogName={dog.name} />
      </Suspense>

      {/* En haut, 2 pilules seulement (V5) : « Affichage » à gauche, « Me situer » à droite. Pincer pour zoomer. */}
      {/* Toujours au-dessus du panneau du bas (R-033), même ouvert sur un petit écran. */}
      {/* R-096 : pendant la relecture, l’heure et la rue à leur place (la carte suit le chien). */}
      {kind === 'replay' && <div ref={setPillSlot} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 pt-[calc(env(safe-area-inset-top)+8px)] pl-16" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)] ${kind === 'replay' ? 'hidden' : ''}`}>
        <div className="flex flex-col items-start gap-2">
          <MapButton kind="display" aria-expanded={display} onClick={() => setDisplay(!display)} />
          {display && (
            <div className="anim-pop pointer-events-auto flex flex-col gap-2 rounded-card bg-surface p-2 shadow-[0_4px_14px_rgba(24,32,30,0.25)]">
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
              <Switch label="Brouillard" hint="Les zones où vous n’êtes jamais allés restent dans la brume" on={prefs.fog} onChange={(fog) => setPref({ fog })} />
              <Switch label="Lieux les plus fréquentés" hint="Plus c’est orange, plus vous y passez souvent" on={prefs.heat} onChange={(heat) => setPref({ heat })} />
              {/* T-097 : les idées masquées depuis le panneau se remettent ici. */}
              {isNative() && !readOnly && <Switch label="Idées de balade" hint="Des balades déjà faites qui partent d’ici" on={prefs.ideas} onChange={(ideas) => setPref({ ideas })} />}
              {/* L’import reste ici (V6.1 § 4), plus en bas du panneau. */}
              {!readOnly && (
                <Link to="/importer" className="flex min-h-11 items-center gap-2 rounded-field px-2 text-[0.8824rem] font-bold text-primary no-underline">
                  <PlusIcon size={18} />
                  {isNative() ? 'Importer des balades' : 'Ajouter mes balades'}
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Me situer (T-020) : la carte et la commune suivent l’endroit où l’on est. */}
          <MapButton kind="locate" onClick={locate} aria-label="Me situer : les balades du coin où je suis" active={Boolean(myPos)} busy={locating} />
          {/* La boussole n’apparaît que si la carte est tournée ; un toucher la remet face au nord. */}
          {turned && (
            <button type="button" onClick={() => setNorth((n) => n + 1)} aria-label={`Remettre la carte face au nord (tournée de ${Math.round(((bearing % 360) + 360) % 360)}°)`} className="anim-pop pointer-events-auto flex size-12 items-center justify-center rounded-full border-0 bg-surface shadow-float">
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)` }}>
                <path d="M13 2 L17 13 L13 11.5 L9 13 Z" fill="#C4423A" />
                <path d="M13 24 L9 13 L13 14.5 L17 13 Z" fill="#8C9692" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Panneau du bas, dans la zone du pouce (V6.1 § 4) : un seul panneau, trois hauteurs, le même contenu — tout en
          bas (le haut du panneau collé à la barre), à mi-hauteur, en grand (sous « Affichage » et « Me situer »). */}
      <section
        ref={sheet.ref}
        aria-label={kind === 'journal' ? `Les balades ${ofDog(dog)}` : kind === 'sheet' ? 'La balade' : kind === 'outing' ? 'La sortie' : 'Revoir la balade'}
        {...sheet.handlers}
        style={sheet.style}
        className={`absolute inset-x-0 top-[calc(env(safe-area-inset-top)+62px)] bottom-0 z-10 mx-auto flex max-w-[430px] ${selected ? 'invisible' : ''} flex-col rounded-t-panel bg-surface px-4 shadow-[0_-6px_20px_rgba(0,0,0,0.10)]`}
      >
        {/* La poignée : 36 × 5 px, 14 px d’air dessus et dessous (marge intérieure : pas de fusion de marges) ; sa zone
            tactile descend jusqu’à 44 px. Réduit → moitié → haut → moitié. */}
        <button type="button" onClick={sheet.cycle} aria-expanded={!sheet.collapsed} aria-label={sheet.handleLabel} className="relative mx-auto flex h-[33px] w-24 shrink-0 touch-none items-center justify-center border-0 bg-transparent p-0 before:absolute before:inset-x-0 before:top-0 before:-bottom-[11px] before:content-['']">
          <span className="block h-[5px] w-9 rounded-full bg-[#D3D9D6]" />
        </button>
        <div
          ref={sheet.bodyRef}
          style={{ paddingBottom: (kind === 'journal' ? footerHeight || HOME_CLEARANCE : HOME_CLEARANCE) + 12 }}
          className={`-mx-4 flex min-h-0 flex-1 touch-pan-y flex-col gap-3 overscroll-contain px-4 [&>*]:shrink-0 ${sheet.snap === 'full' ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
        >
          {kind === 'sheet' && walkEntry && walkRoute ? (
            <WalkSheet
              key={walkEntry.id}
              entry={walkEntry}
              route={walkRoute}
              pins={pins}
              backLabel={retour ?? 'Le journal'}
              onBack={retour ? back : toJournal}
              {...(canReplay ? { onReplay: () => go(walkOnMap(walkEntry.id, { replay: true, filter })) } : {})}
              onCursor={setCursor}
              viewer={viewer}
              onViewer={setViewer}
              onShowOnMap={showOnMap}
              onAddMark={addMark}
              peekRef={sheetPeek}
            />
          ) : kind === 'outing' && outing ? (
            <OutingSheet key={outing.id} outing={outing} backLabel={retour ?? 'Le journal'} onBack={retour ? back : toJournal} onDeleted={toJournal} peekRef={outingPeek} />
          ) : kind === 'replay' && walkEntry && walkRoute ? (
            <ReplayPanel key={walkEntry.id} route={walkRoute} channel={replayChannel} onBack={() => openWalk(walkEntry.id)} peekRef={replayPeek} halfRef={replayHalf} pillSlot={pillSlot} />
          ) : (
          <>
          {/* 1. Le quartier : surtitre et titre (réduit, on n’en voit que le haut, coupé à mi-hauteur du titre). */}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-milestone-dark surtitre">Le quartier</span>
            <h1 className="title-section relative">
              Les balades {ofDog(dog)}
              <span ref={peekRef} aria-hidden="true" className="absolute top-1/2 left-0 h-0 w-0" />
            </h1>
          </div>
          {walks.length > 0 && (
            <>
              {/* V6.1 § 1 : une ligne de résumé ; elle suit le filtre. */}
              <WalksSummary items={shown} />
              {/* V6.1 § 3 : un seul choix, sans nombre sur la pastille. (« Spots de la meute » irait dans « Affichage »,
                  mais la meute reste gelée, T-072.) */}
              <div ref={filtersRow} role="group" aria-label="Filtrer les balades" className="scroll-row -mx-4 -my-1.5 flex gap-1.5 px-4">
                {PANEL_FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className="flex min-h-11 shrink-0 items-center border-0 bg-transparent p-0">
                    <span className={chip(filter === f.id)}>{f.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {/* 2. Idées de balade (app iOS, avec la position). */}
          <LoopsBlock loops={loops} picked={idea?.item.id} onPick={pickIdea} onHide={() => setPref({ ideas: false })} headRef={ideasHead} />
          {/* 3. Le journal, groupé par jour : un toucher sur une balade ouvre sa fiche (T-098). */}
          {shown.length === 0 ? (
            <div className="flex flex-col gap-3 pt-1">
              <p className="text-[0.9412rem] leading-snug text-[#3F4946]">{emptyFilterText(filter)}</p>
              {/* R-079 : l’accès à Santé seulement si on le choisit. */}
              {walks.length === 0 && !readOnly && <WatchOptIn compact />}
            </div>
          ) : (
            <Journal walks={shown} entries={entries} today={today} filter={filter} />
          )}
          </>
          )}
        </div>
      </section>
      {/* L’action principale, fixée en bas au-dessus des onglets (le contenu passe dessous en fondu) : « Partir en balade »
          (iOS), « Partir sur cette boucle » pour une idée choisie ; sur le web, « Ajouter mes balades » quand il n’y en a
          pas. Cachée tout en bas. Au-dessus du rond Accueil qui dépasse de 26 px de la barre (R-072). */}
      {!readOnly && kind === 'journal' && (isNative() || shown.length === 0) && (
        <div
          ref={footerRef}
          aria-hidden={!footerShown || undefined}
          inert={!footerShown || undefined}
          className={`absolute inset-x-0 bottom-0 z-[11] mx-auto flex max-w-[430px] flex-col gap-2 bg-gradient-to-b from-transparent to-surface to-[22px] px-4 pt-6 pb-9 transition-opacity duration-150 motion-reduce:transition-none ${selected ? 'invisible' : ''} ${footerShown ? '' : 'pointer-events-none opacity-0'}`}
        >
          {idea && <IdeaLine idea={idea} onClose={() => setIdea(undefined)} />}
          {isNative() ? (
            <Link to={`/balade-en-cours?depart=1${idea ? `&boucle=${encodeURIComponent(idea.item.id)}` : ''}`} className="tap btn btn-main min-h-[56px]">
              {idea ? 'Partir sur cette boucle' : 'Partir en balade'}
            </Link>
          ) : (
            shown.length === 0 && (
              <Link to="/importer" className="tap btn btn-main min-h-[56px] gap-2">
                <PlusIcon size={22} />
                Ajouter mes balades
              </Link>
            )
          )}
        </div>
      )}
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

/**
 * V6.1 § 1 : « 12 balades · 18,4 km · 9 h 40 de balade », chiffres en gras, les trois valeurs réparties sur toute la
 * largeur. Elles suivent le filtre choisi.
 */
function WalksSummary({ items }: { items: WalkItem[] }) {
  const t = walksTotals(items)
  return (
    <p className="flex flex-wrap justify-between gap-x-3 text-[0.8824rem] text-[#3F4946] tabular-nums" aria-live="polite">
      <span className="whitespace-nowrap">
        <b className="text-text">{t.count}</b> {t.countLabel}
      </span>
      <b className="whitespace-nowrap text-text">{t.distance}</b>
      {t.time && (
        <span className="whitespace-nowrap">
          <b className="text-text">{t.time}</b> de balade
        </span>
      )}
    </p>
  )
}

/** Un interrupteur d’« Affichage » (V6.1 § 2) : toute la ligne se touche, 44 px au moins. */
function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 w-[16.5rem] max-w-full items-center gap-3 rounded-field border-0 bg-transparent px-2 py-1.5 text-left text-text">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.8824rem] font-bold whitespace-nowrap">{label}</span>
        <span className="text-[0.7647rem] leading-snug text-[#3F4946]">{hint}</span>
      </span>
      <span aria-hidden="true" className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none ${on ? 'bg-primary' : 'bg-line-strong'}`}>
        <span className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-150 motion-reduce:transition-none ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

/** La couleur de la boucle d’une idée choisie, sur la carte (le vert foncé des idées de la maquette). */
const IDEA_COLOR = '#1E5A50'

/** T-097 : l’idée choisie, « Le tour du square · ≈ 15 min · 1,2 km », et ✕ pour la relâcher. */
function IdeaLine({ idea, onClose }: { idea: Loop; onClose: () => void }) {
  return (
    <div className="anim-pop -mx-1 flex min-h-12 items-center gap-2.5 rounded-field bg-bg py-1 pl-3 text-[0.9412rem]">
      <span className="flex min-w-0 flex-1 gap-1">
        <span className="min-w-0 truncate font-bold">{idea.item.name}</span>
        <span className="shrink-0 text-[#3F4946]">
          · ≈{'\u00a0'}{idea.duration}{'\u00a0'}min · {formatRouteDistance(idea.item.route.distanceM)}
        </span>
      </span>
      <button type="button" onClick={onClose} aria-label="Retirer cette idée de la carte" className="flex size-11 shrink-0 items-center justify-center border-0 bg-transparent text-[#3F4946]">
        <CloseIcon size={18} />
      </button>
    </div>
  )
}

/** Les balades montrées d’abord ; les suivantes arrivent quand on approche du bas du journal. */
const JOURNAL_PAGE = 15

/**
 * Le journal (V6.1 § 4) : les balades du filtre, groupées par jour, et les souvenirs sans trajet de ces jours-là en
 * petite ligne. Rien d’autre en bas.
 */
function Journal({ walks, entries, today, filter }: { walks: WalkItem[]; entries: WithId<Entry>[]; today: string; filter: WalkFilter }) {
  const [count, setCount] = useState(JOURNAL_PAGE)
  const more = useRef<HTMLDivElement>(null)
  const visible = useMemo(() => walks.slice(0, count), [walks, count])
  const memos = useMemo<JournalMemo[]>(
    () => entries.filter((e) => !e.route?.points?.length && !e.id.startsWith('repos-') && (e.text.trim() || e.photos.length)).map((e) => ({ id: e.id, date: e.date, text: e.text.split('\n')[0] || 'Un souvenir', ...(e.createdAt ? { createdAt: e.createdAt } : {}), ...(e.photos[0] ? { thumb: e.photos[0].thumbFileId } : {}) })),
    [entries],
  )
  const days = useMemo(() => journalDays(visible, memos, today), [visible, memos, today])
  // Les photos posées sur la carte de chaque balade : celles dont on connaît l’endroit.
  const photos = useMemo(() => new Map(entries.map((e) => [e.id, e.photos.flatMap((p) => (p.lat !== undefined && p.lng !== undefined ? [{ thumbFileId: p.thumbFileId, lat: p.lat, lng: p.lng }] : []))])), [entries])
  useEffect(() => {
    const el = more.current
    if (!el || count >= walks.length) return
    const observer = new IntersectionObserver((seen) => seen.some((s) => s.isIntersecting) && setCount((c) => c + JOURNAL_PAGE), { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [count, walks.length])
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => (
        <section key={day.date} aria-label={day.label} className="flex flex-col gap-2.5">
          <h2 className="mt-1 font-display text-[1rem] font-semibold">{day.label}</h2>
          {day.rows.map((row) =>
            row.kind === 'balade' ? (
              // R-094 : la balade s’ouvre dans le panneau, sur la même carte (au cran du milieu).
              <JournalWalkCard key={row.walk.id} walk={row.walk} photos={photos.get(row.walk.id) ?? []} to={walkOnMap(row.walk.id, { filter })} replace />
            ) : (
              <Link key={row.memo.id} to={`/souvenir/${encodeURIComponent(row.memo.id)}`} state={FROM_MAP} className="tap grid min-h-14 grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 rounded-field border border-solid border-[#E6EAE7] bg-surface p-2 text-text no-underline">
                {row.memo.thumb ? <FileImage fileId={row.memo.thumb} alt="" className="size-11 rounded-[10px]" /> : <span aria-hidden="true" className="size-11 rounded-[10px] bg-gold-soft" />}
                <span className="flex min-w-0 flex-col">
                  <b className="truncate text-[0.9412rem]">{row.memo.text}</b>
                  <span className="text-[0.8235rem] text-[#3F4946]">{memoLine(row.memo)}</span>
                </span>
              </Link>
            ),
          )}
        </section>
      ))}
      {count < walks.length && <div ref={more} aria-hidden="true" className="h-px" />}
    </div>
  )
}
