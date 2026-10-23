import { useEffect, useMemo, useState, type Ref } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { FileImage } from '../../components/FileImage'
import { PinIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { Stats } from '../../components/Stats'
import { deleteEntry, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { Entry, WithId } from '../../firebase/types'
import { useReadOnly } from '../../firebase/viewer'
import { formatDayHeading } from '../../lib/dates'
import { fromStored, isToTell, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { sourceLabels, sourceLine, streetAt, walkHours } from '../../lib/walkSheet'
import { sheetBlocks } from '../../lib/walkBlocks'
import { photoWhen } from '../../lib/walkReplay'
import { dogAgeLine, markNewStreets, streetsBefore } from '../../lib/walkFacts'
import { walkNumber, type PhotoPin } from '../../lib/walkFiche'
import { walkTimeline, type TimelineEvent } from '../../lib/walkTimeline'
import { suggestedMoment, type TellItem } from '../../lib/walkTell'
import { journalOnMap, tellHref } from '../../lib/mapPanel'
import { postcardDateLine, postcardLine, postcardRoute } from '../../lib/postcard'
import { MomentChips } from '../journal/EntryCard'
import { PhotoViewer } from '../journal/PhotoViewer'
import { BodyBlock, PaceBlock, ReliefBlock, RouteBlock, WeatherBlock } from './WalkBlocks'
import { WalkTimeline } from './WalkTimeline'
import { ToProfile } from './ToProfile'
import { StopTiles, SuggestedMoment, usePlaceOnStop } from './StopTiles'
import { Postcard } from './Postcard'
import { dogName } from '../../lib/dogName'

type WalkEntry = WithId<Entry> & { pending?: boolean }

/**
 * La fiche d’une balade (maquettes flair-2026-10-22 Fiche, T-107), dans le panneau de la carte de l’onglet Balades
 * (R-094 « Une seule carte » : plus de carte à elle, la carte de l’onglet se cadre sur la balade). Réduit, le panneau
 * montre son résumé : « ‹ Le journal », « Balade n° X avec Billy », le titre, la date et les heures, les Stats,
 * « ▶ Revoir la balade » et « Raconter ». Remonté : l’allure, « Ce qui s’est passé » (chaque arrêt ouvre « Raconter
 * la balade » sur lui), le parcours, le relief, le corps, la météo, les photos, les sources, puis Partager, Modifier et
 * Supprimer. Chaque bloc n’apparaît que s’il a des données (une balade ancienne ne montre que ce qu’elle a).
 */
export function WalkSheet({ entry, route, pins, backLabel, onBack, onReplay, onCursor, viewer, onViewer, onShowOnMap, onAddMark, peekRef, halfRef }: {
  entry: WalkEntry
  route: Route
  /** Les photos placées sur la carte (là où elles ont été prises). */
  pins: PhotoPin[]
  /** « ‹ Le journal », ou l’écran d’où l’on vient (« ‹ Accueil »). */
  backLabel: string
  onBack: () => void
  /** « Revoir la balade » (R-096) ; absent sans tracé à revoir. */
  onReplay?: () => void
  /** Le doigt sur la courbe d’allure : un rond doré sur la carte. */
  onCursor: (at: { lat: number; lng: number } | undefined) => void
  /** La photo ouverte en grand (aussi depuis sa miniature sur la carte). */
  viewer: number | null
  onViewer: (index: number | null) => void
  /** « Voir sur la carte » d’une photo : le panneau descend, la carte y va. */
  onShowOnMap: (pin: PhotoPin) => void
  /** R-059 : poser un repère sans viser la carte (VoiceOver, Switch Control). */
  onAddMark?: () => void
  /** R-102 : le bas du titre (le jour, les heures) : ce que montre le panneau réduit. */
  peekRef: Ref<HTMLDivElement>
  /** Le bas du résumé (jusqu’à « Revoir » et « Raconter ») : ce que montre le panneau au cran du milieu. */
  halfRef: Ref<HTMLDivElement>
}) {
  const readOnly = useReadOnly()
  const { dog, entries } = useData()
  const navigate = useNavigate()
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
  // R-095 : chaque bloc seulement s’il dit quelque chose.
  const blocks = useMemo(() => sheetBlocks(route, { photos: entry.photos.length, events }), [route, entry.photos.length, events])
  const sources = sourceLabels(route, entry.source)
  const age = dogAgeLine(dog, entry.date)
  // Le parcours : « nouvelle » est recalculé ici sur toutes les balades d’avant (une balade plus ancienne importée après
  // compte aussi).
  const walks = useMemo(() => entries.filter((e) => e.route).map((e) => ({ id: e.id, date: e.date, startTime: e.route!.startTime, streets: e.route!.streets, points: fromStored(e.route!.points) })), [entries])
  const streets = useMemo(() => (route.streets?.length ? markNewStreets(route.streets.map((s) => s.name), streetsBefore(walks, { id: entry.id, date: entry.date, startTime: route.startTime })) : []), [walks, route.streets, route.startTime, entry.id, entry.date])
  const number = useMemo(() => walkNumber(walks, { id: entry.id, date: entry.date, startTime: route.startTime }, dog.adoptionDate), [walks, entry.id, entry.date, route.startTime, dog.adoptionDate])
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
    onViewer(null)
    if (pin) onShowOnMap(pin)
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
  const tellStop = (stopIndex: number) => navigate(`/souvenir/${entry.id}/raconter?arret=${stopIndex + 1}`)

  return (
    <>
      {/* Le résumé : ce que montre le panneau au cran du milieu ; réduit, le titre seulement (R-102). */}
      <div className="flex flex-col gap-3">
        <BackLink label={backLabel} onClick={onBack} className="-mt-1 -mb-2" />
        <div ref={peekRef} className="flex flex-col gap-1">
          <span className="surtitre text-primary">{number ? `Balade n° ${number} avec ${dogName(dog)}` : `Balade avec ${dogName(dog)}`}</span>
          <h1 className="title-screen">{name || 'Balade'}</h1>
          <p className="text-[1rem] leading-snug text-muted">{[formatDayHeading(entry.date), walkHours({ startTime: route.startTime, endTime: route.endTime, trimmed: route.track ? route.trimmed : undefined })].filter(Boolean).join(' · ')}</p>
          {(age || entry.commune) && <p className="text-[0.8824rem] leading-snug text-muted">{[age, entry.commune].filter(Boolean).join(' · ')}</p>}
          <Pending show={Boolean(entry.pending)} />
        </div>
        {/* Durée · distance · en marche · arrêts (ou l’allure moyenne) : 3 ou 4 cases, jamais à 0 (R-095). */}
        <Stats items={blocks.stats} />
        {/* R-094 : revoir (vert plein) et raconter (vert clair), côte à côte ; l’orange reste à « Partir en balade ». */}
        {(onReplay || !readOnly) && (
          <div ref={halfRef} className="flex flex-wrap gap-2">
            {onReplay && (
              <button type="button" onClick={onReplay} className="btn btn-primary min-h-12 flex-[1_1_auto] px-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Revoir la balade
              </button>
            )}
            {!readOnly && (
              <Link to={tellHref(entry.id, route)} className="btn btn-secondary min-h-12 flex-[1_1_auto] px-4">
                Raconter
              </Link>
            )}
          </div>
        )}
        {!onReplay && readOnly && <div ref={halfRef} aria-hidden="true" className="h-0" />}
      </div>

      <div className="flex flex-col gap-4 pt-1">
        {notes && <p className="text-[1rem] leading-[1.45] whitespace-pre-wrap">{notes}</p>}
        <MomentChips entry={entry} />

        {/* L’allure : courbe (le doigt dessus pose un rond doré sur la carte) et sa ligne de résumé. */}
        {blocks.pace && <PaceBlock route={route} line={blocks.paceLine} onScrub={onCursor} />}

        {/* Ce qui s’est passé : chaque arrêt ouvre « Raconter la balade » sur lui. Sans arrêt, repère, passage rapide ni
            photo, pas de frise « Départ → Retour » (R-095) : « sans pause » est dit sous l’allure. */}
        {blocks.timeline && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Ce qui s’est passé</h2>
            <WalkTimeline events={events} startTime={route.startTime} preview renderExtra={momentActions} {...(readOnly ? {} : { onOpenStop: tellStop })} />
          </section>
        )}

        {/* R-059 : la même chose que toucher le tracé, sans viser la carte (VoiceOver, Switch Control). */}
        {!readOnly && onAddMark && route.points.length > 0 && (
          <button type="button" onClick={onAddMark} className="btn-text -mt-2 -ml-1 self-start">
            <PinIcon size={20} />
            Ajouter un repère
          </button>
        )}

        {/* Le parcours, le relief, le corps, la météo. */}
        <RouteBlock streets={streets} places={route.places ?? []} />
        {blocks.relief && <ReliefBlock route={route} />}
        {blocks.body && <BodyBlock route={route} healthSource={sources.health} />}
        {blocks.weatherLine && <WeatherBlock line={blocks.weatherLine} />}

        {/* Les photos de la balade, aussi sur la carte là où elles ont été prises. */}
        {blocks.photos ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="title-section">Photos</h2>
              {pins.length > 0 && <span className="min-w-0 text-right text-[0.7647rem] leading-snug text-muted">aussi sur la carte, là où elles ont été prises</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {entry.photos.map((photo, i) => (
                <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en grand`} onClick={() => onViewer(i)} className="block overflow-hidden rounded-field border-0 bg-transparent p-0">
                  <FileImage fileId={photo.thumbFileId} alt="" className="aspect-square w-full" hideMissing />
                </button>
              ))}
            </div>
          </section>
        ) : (
          !readOnly && (
            <Link to={`/souvenir/${entry.id}/modifier`} className="btn-text -my-1 -ml-1 self-start">
              Ajouter un mot ou une photo
            </Link>
          )
        )}

        {/* Les sources, puis Partager, Modifier, Supprimer en liens texte (R-095 : Supprimer en rouge, confirmé). */}
        <p className="source-note">{sourceLine(route, entry.source)}</p>
        {!readOnly && (
          <div className="-ml-1 flex flex-wrap gap-x-5">
            {/* § 8.4 : la carte postale. */}
            <button type="button" aria-label="Partager une carte postale de la balade" onClick={() => setPostcard(true)} className="btn-text">
              Partager
            </button>
            {/* Un seul « Modifier » : photos, texte, tags, date, début et fin du trajet. */}
            <Link to={`/souvenir/${entry.id}/modifier`} className="btn-text">
              Modifier
            </Link>
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-text text-danger">
              Supprimer
            </button>
          </div>
        )}
      </div>

      {postcard && (
        <Postcard
          date={entry.date}
          onClose={() => setPostcard(false)}
          input={{ points: postcardRoute(route.points, route.distanceM), title: name || 'Balade', line: postcardLine(route.distanceM, route.durationMin), dateLine: postcardDateLine(entry.date, entry.commune), dogName: dogName(dog), ...(dog.photoThumbFileId || dog.photoFileId ? { dogPhotoFileId: dog.photoThumbFileId ?? dog.photoFileId } : {}) }}
        />
      )}
      {viewer !== null && <PhotoViewer photos={entry.photos} start={viewer} onClose={() => onViewer(null)} captions={captions} onShowOnMap={showPhotoOnMap} />}
      {confirmDelete && (
        <ConfirmSheet
          title="Supprimer cette balade ?"
          message={entry.photos.length ? 'Le tracé, ses repères et ses photos seront supprimés définitivement. Le brouillard déjà levé reste levé.' : 'Le tracé et ses repères seront supprimés définitivement. Le brouillard déjà levé reste levé.'}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteEntry(entry)
            navigate(journalOnMap(), { replace: true })
          }}
        />
      )}
    </>
  )
}
