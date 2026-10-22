import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { ChevronLeftIcon, PencilIcon, ShareIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { DangerButton } from '../../components/Buttons'
import { ConfirmSheet } from '../../components/Sheet'
import { Stats } from '../../components/Stats'
import { reducedMotion } from '../../components/maplibre'
import { deleteEntry, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { Entry, WithId } from '../../firebase/types'
import { useReadOnly } from '../../firebase/viewer'
import { formatDayHeading } from '../../lib/dates'
import { fromStored, isToTell, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { useBack } from '../../lib/useBack'
import { sheetStats, sourceLabels, sourceLine, streetAt, walkHours } from '../../lib/walkSheet'
import { photoWhen } from '../../lib/walkReplay'
import { dogAgeLine, markNewStreets, streetsBefore } from '../../lib/walkFacts'
import { photoPins, walkNumber } from '../../lib/walkFiche'
import { walkTimeline, type TimelineEvent } from '../../lib/walkTimeline'
import { suggestedMoment, tellQueue, type TellItem } from '../../lib/walkTell'
import { postcardDateLine, postcardLine, postcardRoute } from '../../lib/postcard'
import { MomentChips } from '../journal/EntryCard'
import { PhotoViewer } from '../journal/PhotoViewer'
import { BodyBlock, PaceBlock, ReliefBlock, RouteBlock, WeatherBlock } from './WalkBlocks'
import { WalkMap } from './WalkMap'
import { WalkTimeline } from './WalkTimeline'
import { ToProfile } from './ToProfile'
import { StopTiles, SuggestedMoment, usePlaceOnStop } from './StopTiles'
import { Postcard } from './Postcard'
import { dogName } from '../../lib/dogName'

type WalkEntry = WithId<Entry> & { pending?: boolean }

/** Glisser la poignée de plus de 60 px (ou d’un geste vif) change de vue. */
const DRAG_SWITCH_PX = 60
const DRAG_SWITCH_SPEED = 0.5
const PANEL_EASE = 'transform 400ms cubic-bezier(.2,.8,.3,1)'

/** La hauteur de la fenêtre, suivie (rotation, barre de Safari). */
function useViewportHeight() {
  const [h, setH] = useState(() => window.innerHeight)
  useEffect(() => {
    const on = () => setH(window.innerHeight)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return h
}

/**
 * La fiche de balade (maquettes flair-2026-10-22 Fiche et FicheCarte, T-107) : la carte (allure, arrêts, sens de
 * marche, photos là où elles ont été prises) et, posé dessus, un panneau à poignée (haut arrondi 26 px) qui défile :
 * « Balade n° X avec Billy », le titre, la date et les heures, l’âge du chien et la ville, les Stats, l’allure, « Ce qui
 * s’est passé » (chaque arrêt ouvre « Raconter la balade » sur lui), le parcours, le relief, le corps, la météo, les
 * photos, les sources, puis Partager, Modifier et Supprimer. Glisser la poignée vers le bas : la carte en grand (le
 * panneau ne montre plus que le titre et les Stats) ; vers le haut : la fiche revient. Chaque bloc n’apparaît que s’il a
 * des données (une balade ancienne ne montre que ce qu’elle a).
 */
export function WalkSheet({ entry, route }: { entry: WalkEntry; route: Route }) {
  const readOnly = useReadOnly()
  const { dog, entries } = useData()
  const navigate = useNavigate()
  const back = useBack('/balades')
  // T-098 : le retour dit où il ramène (« La carte », « Accueil ») ; par défaut, la liste des balades.
  const backLabel = (useLocation().state as { retour?: string } | null)?.retour ?? 'Balades'
  const [cursor, setCursor] = useState<{ lat: number; lng: number }>()
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>()
  const [viewer, setViewer] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [postcard, setPostcard] = useState(false)

  const [name, ...rest] = entry.text.split('\n')
  const notes = rest.join('\n').trim()
  // La rue du départ (frise) : demandée une fois à OpenStreetMap, par la file d’attente commune ; rien hors ligne.
  const [startStreet, setStartStreet] = useState<string>()
  const first = route.points[0]
  useEffect(() => {
    if (!route.track || !first) return
    let live = true
    void stopStreet(first[0], first[1]).then((s) => live && setStartStreet(s))
    return () => {
      live = false
    }
  }, [Boolean(route.track), first?.[0], first?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  const events = useMemo(() => walkTimeline(route, { startStreet }), [route, startStreet])
  const sources = sourceLabels(route, entry.source)
  const untold = tellQueue(route)
  const age = dogAgeLine(dog, entry.date)
  // Le parcours : « nouvelle » est recalculé ici sur toutes les balades d’avant (une balade plus ancienne importée après
  // compte aussi).
  const walks = useMemo(() => entries.filter((e) => e.route).map((e) => ({ id: e.id, date: e.date, startTime: e.route!.startTime, streets: e.route!.streets, points: fromStored(e.route!.points) })), [entries])
  const streets = useMemo(() => (route.streets?.length ? markNewStreets(route.streets.map((s) => s.name), streetsBefore(walks, { id: entry.id, date: entry.date, startTime: route.startTime })) : []), [walks, route.streets, route.startTime, entry.id, entry.date])
  const number = useMemo(() => walkNumber(walks, { id: entry.id, date: entry.date, startTime: route.startTime }, dog.adoptionDate), [walks, entry.id, entry.date, route.startTime, dog.adoptionDate])
  const pins = useMemo(() => photoPins(entry.photos, route), [entry.photos, route])
  // T-108 : sous chaque photo en grand, le lieu (la rue d’un arrêt ou d’un repère proche) et l’heure de prise de vue.
  const captions = useMemo(
    () =>
      entry.photos.map((photo, i) => {
        const pin = pins.find((p) => p.index === i)
        const place = pin ? streetAt(route, pin) : undefined
        return { when: photoWhen(entry.date, photo.time), onMap: Boolean(pin), ...(place ? { place } : {}) }
      }),
    [entry.photos, entry.date, pins, route],
  )
  const showPhotoOnMap = (index: number) => {
    const pin = pins.find((p) => p.index === index)
    setViewer(null)
    if (!pin) return
    showBig(true)
    setMapCenter({ lat: pin.lat, lng: pin.lng })
  }
  const placeOnStop = usePlaceOnStop(entry.id, route)
  const removeMoment = (index: number) => updateEntryRoute(entry.id, storeRoute({ ...route, moments: route.moments.filter((_, j) => j !== index) }))
  // Sous un arrêt à raconter : « Que s’est-il passé ici ? » et ses tuiles. Sous un repère hors arrêt : « Ajouter à
  // Comment il réagit » (peur, grogne : seulement si on le choisit) et « Retirer ». Un arrêt déjà raconté se change en
  // le touchant (« Raconter la balade » sur lui).
  const momentActions = (event: TimelineEvent) => {
    // Un arrêt sans repère, ou un repère « À raconter » (T-086) : « Que s’est-il passé ici ? » et ses 6 tuiles (V6 § 6.2).
    const item: TellItem | undefined =
      event.kind === 'stop' && (!event.moment || isToTell(event.moment))
        ? { kind: 'stop', stopIndex: event.stopIndex, atS: event.atS, ...(event.moment && event.momentIndex !== undefined ? { momentIndex: event.momentIndex } : {}) }
        : event.kind === 'moment' && isToTell(event.moment)
          ? { kind: 'marker', momentIndex: event.momentIndex }
          : undefined
    if (item && !readOnly && (event.kind === 'stop' || event.kind === 'moment'))
      return (
        <div className="flex flex-col gap-2">
          <span className="text-[0.8824rem] font-bold">Que s’est-il passé ici ?</span>
          {/* T-103 : un long arrêt dans un parc propose « Jeu ? », confirmé d’un toucher (jamais compté avant). */}
          {event.kind === 'stop' && route.stops?.[event.stopIndex] && suggestedMoment(route.stops[event.stopIndex]!, event.moment) && (
            <SuggestedMoment type={suggestedMoment(route.stops[event.stopIndex]!, event.moment)!} place={route.stops[event.stopIndex]!.park} onConfirm={(type) => placeOnStop(item, type)} />
          )}
          <StopTiles stop={event.kind === 'moment' ? event.moment : event} onPick={(type, note) => placeOnStop(item, type, note)} />
          {item.momentIndex !== undefined && (
            <button type="button" aria-label="Retirer le repère À raconter" onClick={() => removeMoment(item.momentIndex!)} className="btn-text -ml-1 self-start text-[0.8824rem] text-muted">
              Retirer
            </button>
          )}
        </div>
      )
    if (event.kind !== 'moment' || readOnly) return null
    return (
      <div className="flex flex-wrap items-center gap-x-4">
        <ToProfile reaction={momentReaction(event.moment)} />
        <button type="button" aria-label={`Retirer le repère ${routeMomentInfo(event.moment.type).label}`} onClick={() => removeMoment(event.momentIndex)} className="btn-text -ml-1 text-[0.8824rem] text-muted">
          Retirer
        </button>
      </div>
    )
  }
  const tell = () => navigate(`/souvenir/${entry.id}/raconter`)
  const tellStop = (stopIndex: number) => navigate(`/souvenir/${entry.id}/raconter?arret=${stopIndex + 1}`)

  // ——— Le panneau à poignée : la fiche (le panneau sous la carte) ou la carte en grand (le panneau réduit) ———
  const vh = useViewportHeight()
  // La carte visible au-dessus du panneau : 39 % de l’écran (330 px sur 844), 200 px au moins.
  const mapH = Math.max(200, Math.round(vh * 0.39))
  const [big, setBig] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [peekH, setPeekH] = useState(200)
  const [scrolled, setScrolled] = useState(false)
  const peekRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; t: number; id: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  useLayoutEffect(() => {
    const el = peekRef.current
    if (!el) return
    const measure = () => setPeekH(Math.round(el.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > mapH - 26 - 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [mapH])
  // La carte en grand : la page ne défile plus (le panneau réduit reste en bas).
  useEffect(() => {
    if (!big) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [big])
  const showBig = (on: boolean) => {
    if (on) window.scrollTo({ top: 0 })
    setBig(on)
    setDragY(0)
  }
  // Panneau réduit : son haut à `peekH` du bas de l’écran.
  const bigOffset = Math.max(0, vh - peekH - (mapH - 26))
  const dragHandlers = {
    onPointerDown: (e: PointerEvent) => {
      if (!big && window.scrollY > 4) return
      drag.current = { y: e.clientY, t: e.timeStamp, id: e.pointerId, moved: false }
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dy = e.clientY - d.y
      if (!d.moved) {
        if (Math.abs(dy) < 6) return
        d.moved = true
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      setDragY(big ? Math.max(-bigOffset, Math.min(0, dy)) : Math.max(0, dy))
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d?.moved) return
      justDragged.current = true
      const dy = e.clientY - d.y
      const speed = dy / Math.max(1, e.timeStamp - d.t)
      showBig(big ? !(dy < -DRAG_SWITCH_PX || speed < -DRAG_SWITCH_SPEED) : dy > DRAG_SWITCH_PX || speed > DRAG_SWITCH_SPEED)
    },
    onPointerCancel: () => {
      drag.current = null
      setDragY(0)
    },
  }
  // Un toucher sur la poignée (ou sur le panneau réduit) change de vue ; pas juste après un glissé.
  const toggleFromTap = () => {
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    showBig(!big)
  }
  const dragging = dragY !== 0
  const panelStyle = { transform: `translateY(${(big ? bigOffset : 0) + dragY}px)`, transition: dragging || reducedMotion() ? 'none' : PANEL_EASE }
  const mapPadding = big ? { top: 110, bottom: peekH + 24, left: 28, right: 28 } : { top: 64, bottom: vh - mapH + 26 + 14, left: 28, right: 28 }

  // « Revoir la balade » (T-108) : son propre écran, le point qui avance sur le trajet.
  const replayButton = route.points.length > 1 && (
    <button type="button" onClick={() => navigate(`/souvenir/${entry.id}/revoir`)} className="tap map-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
      Revoir la balade
    </button>
  )

  return (
    <div className="relative mx-auto min-h-dvh max-w-[430px]">
      {/* La carte, fixe derrière la fiche : le panneau défile par-dessus. */}
      <div className="fixed inset-y-0 left-0 right-0 z-0 mx-auto w-full max-w-[430px]">
        <WalkMap route={route} dogName={dog.name} cursor={cursor} center={mapCenter} className="size-full" padding={mapPadding} interactive={big} photos={pins} onPhoto={setViewer} />
      </div>
      {/* La barre d’état reste lisible quand la fiche passe dessous. */}
      {scrolled && !big && <div aria-hidden="true" className="fixed inset-x-0 top-0 z-10 h-[env(safe-area-inset-top)] bg-bg" />}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 mx-auto flex max-w-[430px] items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button type="button" onClick={back} className="tap map-btn pr-4 pl-2 text-[0.9412rem] text-primary">
          <ChevronLeftIcon size={20} strokeWidth={2.6} />
          {backLabel}
        </button>
        {big && replayButton}
      </div>
      {!big && replayButton && (
        <div className="absolute left-3 z-[1]" style={{ top: mapH - 26 - 14 - 44 }}>
          {replayButton}
        </div>
      )}

      <div aria-hidden="true" className="pointer-events-none" style={{ height: mapH - 26 }} />
      <section aria-label="La balade" className="relative z-[2] min-h-[60dvh] rounded-t-panel bg-bg shadow-panel" style={panelStyle}>
        <div ref={peekRef} {...(big ? dragHandlers : {})} onClick={big ? toggleFromTap : undefined} className={`px-4 ${big ? 'touch-none pb-[calc(env(safe-area-inset-bottom)+16px)]' : ''}`}>
          {/* La poignée : glisser vers le bas pour la carte en grand, vers le haut pour revenir (ou toucher). */}
          <button type="button" {...(big ? {} : dragHandlers)} onClick={big ? undefined : toggleFromTap} aria-label={big ? 'Revenir à la fiche de la balade' : 'Voir la carte en grand'} className="-mb-3 flex h-11 w-full touch-none items-start justify-center border-0 bg-transparent pt-2.5">
            <span aria-hidden="true" className="block h-[5px] w-9 rounded-full bg-[#C4CCC8]" />
          </button>
          {/* Surtitre, titre, date et heures, âge et ville. */}
          <div className="flex flex-col gap-1">
            <span className="surtitre text-primary">{number ? `Balade n° ${number} avec ${dogName(dog)}` : `Balade avec ${dogName(dog)}`}</span>
            <h1 className="title-screen">{name || 'Balade'}</h1>
            {!big && (
              <>
                <p className="text-[1rem] leading-snug text-muted">{[formatDayHeading(entry.date), walkHours({ startTime: route.startTime, endTime: route.endTime, trimmed: route.track ? route.trimmed : undefined })].filter(Boolean).join(' · ')}</p>
                {(age || entry.commune) && <p className="text-[0.8824rem] leading-snug text-muted">{[age, entry.commune].filter(Boolean).join(' · ')}</p>}
                <Pending show={Boolean(entry.pending)} />
              </>
            )}
          </div>
          {/* Durée · distance · en marche · arrêts. */}
          <Stats items={sheetStats(route)} className="mt-4" />
        </div>

        <main inert={big} className={`flex flex-col gap-4 px-4 pt-4 ${untold.length && !readOnly ? 'pb-[calc(env(safe-area-inset-bottom)+112px)]' : 'pb-[calc(env(safe-area-inset-bottom)+40px)]'}`}>
          {notes && <p className="text-[1rem] leading-[1.45] whitespace-pre-wrap">{notes}</p>}
          <MomentChips entry={entry} />

          {/* L’allure : courbe, allure moyenne, au plus vite, sans pause. */}
          <PaceBlock route={route} onScrub={setCursor} />

          {/* Ce qui s’est passé : chaque arrêt ouvre « Raconter la balade » sur lui. */}
          {events.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="title-section">Ce qui s’est passé</h2>
              <WalkTimeline events={events} startTime={route.startTime} preview renderExtra={momentActions} {...(readOnly ? {} : { onOpenStop: tellStop })} />
            </section>
          )}

          {/* Le parcours, le relief, le corps, la météo. */}
          <RouteBlock streets={streets} places={route.places ?? []} />
          <ReliefBlock route={route} />
          <BodyBlock route={route} healthSource={sources.health} />
          <WeatherBlock weather={route.weather} />

          {/* Les photos de la balade, aussi sur la carte là où elles ont été prises. */}
          {entry.photos.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="title-section">Photos</h2>
                {pins.length > 0 && <span className="min-w-0 text-right text-[0.7647rem] leading-snug text-muted">aussi sur la carte, là où elles ont été prises</span>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {entry.photos.map((photo, i) => (
                  <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en grand`} onClick={() => setViewer(i)} className="block overflow-hidden rounded-field border-0 bg-transparent p-0">
                    <FileImage fileId={photo.thumbFileId} alt="" className="aspect-square w-full" hideMissing />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Les sources, puis Partager, Modifier, Supprimer. */}
          <p className="source-note">{sourceLine(route, entry.source)}</p>
          {!readOnly && (
            <div className="flex flex-col gap-2">
              {/* § 8.4 : la carte postale (l’orange reste « Raconter la balade »). */}
              <button type="button" aria-label="Partager une carte postale de la balade" onClick={() => setPostcard(true)} className="btn btn-tertiary w-full">
                <ShareIcon size={20} />
                Partager
              </button>
              {/* Un seul « Modifier » : photos, texte, tags, date, début et fin du trajet. */}
              <Link to={`/souvenir/${entry.id}/modifier`} className="btn btn-secondary w-full">
                <PencilIcon size={20} />
                Modifier
              </Link>
              {/* T-106 : « Supprimer » en tertiary rouge, pleine largeur, confirmé avant d’agir. */}
              <DangerButton onClick={() => setConfirmDelete(true)}>Supprimer</DangerButton>
            </div>
          )}
        </main>
      </section>

      {/* L’action principale : raconter les arrêts qui attendent encore un repère. */}
      {untold.length > 0 && !readOnly && !big && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-[linear-gradient(to_bottom,rgba(243,245,242,0),var(--color-bg)_30%)]">
          <div className="mx-auto max-w-[430px] px-4 pt-[18px] pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <button type="button" onClick={tell} className="btn btn-main min-h-[56px] w-full">
              Raconter la balade
            </button>
          </div>
        </div>
      )}

      {postcard && (
        <Postcard
          date={entry.date}
          onClose={() => setPostcard(false)}
          input={{ points: postcardRoute(route.points, route.distanceM), title: name || 'Balade', line: postcardLine(route.distanceM, route.durationMin), dateLine: postcardDateLine(entry.date, entry.commune), dogName: dogName(dog), ...(dog.photoThumbFileId || dog.photoFileId ? { dogPhotoFileId: dog.photoThumbFileId ?? dog.photoFileId } : {}) }}
        />
      )}
      {viewer !== null && <PhotoViewer photos={entry.photos} start={viewer} onClose={() => setViewer(null)} captions={captions} onShowOnMap={showPhotoOnMap} />}
      {confirmDelete && (
        <ConfirmSheet
          title="Supprimer cette balade ?"
          message={entry.photos.length ? 'Le tracé, ses repères et ses photos seront supprimés définitivement. Le brouillard déjà levé reste levé.' : 'Le tracé et ses repères seront supprimés définitivement. Le brouillard déjà levé reste levé.'}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteEntry(entry)
            navigate('/balades', { replace: true })
          }}
        />
      )}
    </div>
  )
}
