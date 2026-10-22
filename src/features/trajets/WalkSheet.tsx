import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { PhotoIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { DangerButton } from '../../components/Buttons'
import { ConfirmSheet } from '../../components/Sheet'
import { Stats } from '../../components/Stats'
import { deleteEntry, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { Entry, WithId } from '../../firebase/types'
import { useReadOnly } from '../../firebase/viewer'
import { fromStored, isToTell, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { useBack } from '../../lib/useBack'
import { sheetStats, sourceLabels, sourceLine, walkSubtitle } from '../../lib/walkSheet'
import { dogAgeLine, markNewStreets, streetsBefore, timesBefore, timesBeforeText } from '../../lib/walkFacts'
import { walkTimeline, type TimelineEvent } from '../../lib/walkTimeline'
import { suggestedMoment, tellQueue, type TellItem } from '../../lib/walkTell'
import { postcardDateLine, postcardLine, postcardRoute } from '../../lib/postcard'
import { MomentChips } from '../journal/EntryCard'
import { PhotoViewer } from '../journal/PhotoViewer'
import { setDraftPhotos } from '../journal/draft'
import { BodyBlock, PaceBlock, ReliefBlock, RouteBlock, WeatherBlock } from './WalkBlocks'
import { WalkMap } from './WalkMap'
import { WalkTimeline } from './WalkTimeline'
import { ToProfile } from './ToProfile'
import { StopTiles, SuggestedMoment, usePlaceOnStop } from './StopTiles'
import { Postcard } from './Postcard'
import { dogName } from '../../lib/dogName'

type WalkEntry = WithId<Entry> & { pending?: boolean }

/**
 * La fiche de balade (spec V6 § 6.1, V6.1 § 7 / T-102) : une seule page qui défile et montre tout ce qu’on sait, en blocs
 * visibles. La carte (allure, arrêts, départ, sens de marche), le titre et l’âge du chien ce jour-là, les Stats, l’allure,
 * « Ce qui s’est passé », le parcours, le relief, le corps, la météo, les photos, les sources, puis Partager, Ajuster,
 * Modifier et Supprimer. Chaque bloc n’apparaît que s’il a des données (une balade ancienne ne montre que ce qu’elle a).
 */
export function WalkSheet({ entry, route }: { entry: WalkEntry; route: Route }) {
  const readOnly = useReadOnly()
  const { dog, entries } = useData()
  const navigate = useNavigate()
  const back = useBack('/balades')
  // T-098 : le retour dit où il ramène (« La carte », « Accueil ») ; par défaut, la liste « Ses balades ».
  const backLabel = (useLocation().state as { retour?: string } | null)?.retour ?? 'Ses balades'
  const [replaying, setReplaying] = useState(false)
  const [cursor, setCursor] = useState<{ lat: number; lng: number }>()
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
  // compte aussi) ; le trajet déjà fait, sur les balades d’avant presque identiques.
  const walks = useMemo(() => entries.filter((e) => e.route).map((e) => ({ id: e.id, date: e.date, startTime: e.route!.startTime, streets: e.route!.streets, points: fromStored(e.route!.points) })), [entries])
  const streets = useMemo(() => (route.streets?.length ? markNewStreets(route.streets.map((s) => s.name), streetsBefore(walks, { id: entry.id, date: entry.date, startTime: route.startTime })) : []), [walks, route.streets, route.startTime, entry.id, entry.date])
  const again = useMemo(() => timesBeforeText(timesBefore({ id: entry.id, date: entry.date, startTime: route.startTime, points: route.points }, walks)), [walks, route.points, route.startTime, entry.id, entry.date])
  const placeOnStop = usePlaceOnStop(entry.id, route)
  const removeMoment = (index: number) => updateEntryRoute(entry.id, storeRoute({ ...route, moments: route.moments.filter((_, j) => j !== index) }))
  // Sous un repère : « Ajouter à Comment il réagit » (peur, grogne : seulement si on le choisit) et « Retirer ».
  const momentActions = (event: TimelineEvent) => {
    const found = event.kind === 'moment' ? { moment: event.moment, index: event.momentIndex } : event.kind === 'stop' && event.moment && event.momentIndex !== undefined ? { moment: event.moment, index: event.momentIndex } : undefined
    // Un arrêt sans repère, ou un repère « À raconter » (T-086) : « Que s’est-il passé ici ? » et ses 6 tuiles (V6 § 6.2).
    const item: TellItem | undefined =
      event.kind === 'stop' && (!event.moment || isToTell(event.moment))
        ? { kind: 'stop', stopIndex: event.stopIndex, atS: event.atS, ...(event.moment && event.momentIndex !== undefined ? { momentIndex: event.momentIndex } : {}) }
        : event.kind === 'moment' && isToTell(event.moment)
          ? { kind: 'marker', momentIndex: event.momentIndex }
          : undefined
    if (item && !readOnly && (event.kind === 'stop' || event.kind === 'moment'))
      return (
        <div className="mt-1.5 flex flex-col gap-2">
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
    if (!found || readOnly) return null
    return (
      <div className="flex flex-wrap items-center gap-x-4">
        <ToProfile reaction={momentReaction(found.moment)} />
        <button type="button" aria-label={`Retirer le repère ${routeMomentInfo(found.moment.type).label}`} onClick={() => removeMoment(found.index)} className="btn-text -ml-1 text-[0.8824rem] text-muted">
          Retirer
        </button>
      </div>
    )
  }
  const tell = () => navigate(`/souvenir/${entry.id}/raconter`)

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label={backLabel} onClick={back} />
      </header>

      {/* 1. La carte (40 % de la hauteur) : « Revoir la balade » et le plein écran (la carte du territoire). */}
      <div className="relative">
        <WalkMap route={route} dogName={dog.name} cursor={cursor} replaying={replaying} onReplayEnd={() => setReplaying(false)} className="h-[40dvh] min-h-[200px]" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2 pr-9">
          {route.points.length > 1 ? (
            <button type="button" onClick={() => setReplaying(!replaying)} className="tap map-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {replaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
              {replaying ? 'Arrêter' : 'Revoir la balade'}
            </button>
          ) : (
            <span />
          )}
          <Link to={`/territoire?balade=${encodeURIComponent(entry.id)}`} aria-label="Voir la balade en plein écran sur la carte" className="tap pointer-events-auto flex size-11 items-center justify-center rounded-full bg-surface text-text shadow-float">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </Link>
        </div>
      </div>

      <main className={`flex flex-col gap-5 px-5 pt-4 ${untold.length && !readOnly ? 'pb-[calc(env(safe-area-inset-bottom)+112px)]' : 'pb-[calc(env(safe-area-inset-bottom)+40px)]'}`}>
        {/* 2. Surtitre, titre, sous-titre. */}
        <div className="flex flex-col gap-1">
          <span className="surtitre text-primary">Balade avec {dogName(dog)}</span>
          <h1 className="title-screen">{name || 'Balade'}</h1>
          <p className="text-[0.9412rem] text-muted">{walkSubtitle({ date: entry.date, startTime: route.startTime, endTime: route.endTime, commune: entry.commune, trimmed: route.track ? route.trimmed : undefined })}</p>
          {age && <p className="text-[0.9412rem] text-muted">{age}</p>}
          <Pending show={Boolean(entry.pending)} />
        </div>
        {notes && <p className="-mt-2 text-[1rem] leading-[1.45] whitespace-pre-wrap">{notes}</p>}
        <MomentChips entry={entry} />

        {/* 3. Stats : durée · distance · en marche · arrêts. */}
        <Stats items={sheetStats(route)} />
        {/* 4. L’allure : courbe, vitesse moyenne en marche, vitesse max, km par km. */}
        <PaceBlock route={route} onScrub={setCursor} />

        {/* 5. Ce qui s’est passé. */}
        {events.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Ce qui s’est passé</h2>
            <WalkTimeline events={events} startTime={route.startTime} preview renderExtra={momentActions} />
          </section>
        )}

        {/* 6 à 9. Le parcours, le relief, le corps, la météo. */}
        <RouteBlock streets={streets} places={route.places ?? []} again={again} />
        <ReliefBlock route={route} />
        <BodyBlock route={route} healthSource={sources.health} />
        <WeatherBlock weather={route.weather} />

        {/* 10. Les photos de la balade (photothèque seulement). */}
        {(entry.photos.length > 0 || !readOnly) && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Photos</h2>
            {entry.photos.length > 0 && (
              <div className={`grid gap-1.5 ${entry.photos.length > 1 ? 'grid-cols-2' : ''}`}>
                {entry.photos.map((photo, i) => (
                  <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en plein écran`} onClick={() => setViewer(i)} className="block overflow-hidden rounded-field border-0 bg-transparent p-0">
                    <FileImage fileId={photo.thumbFileId} alt="" className={entry.photos.length > 1 ? 'aspect-square w-full' : 'h-[220px] w-full'} hideMissing />
                  </button>
                ))}
              </div>
            )}
            {!readOnly && (
              <FilePicker
                accept="image/*"
                onFiles={(files) => {
                  setDraftPhotos(files)
                  navigate(`/souvenir/${entry.id}/modifier`)
                }}
                className="btn-text -ml-1 self-start"
              >
                <PhotoIcon size={20} />
                Ajouter des photos
              </FilePicker>
            )}
          </section>
        )}

        {/* 11. Les sources, puis les actions en texte. */}
        <p className="source-note">{sourceLine(route, entry.source)}</p>
        {!readOnly && (
          <div className="-mt-2 flex flex-wrap items-center gap-x-6 border-t border-divider pt-2">
            {/* § 8.4 : la carte postale (l’orange reste « Raconter la balade »). */}
            <button type="button" aria-label="Partager une carte postale de la balade" onClick={() => setPostcard(true)} className="btn-text -ml-1">
              Partager
            </button>
            {/* § 8.3 : seulement avec un trajet daté (les anciennes balades n’ont rien à recadrer). */}
            {route.track && (
              <Link to={`/souvenir/${entry.id}/recadrer`} className="btn-text">
                Ajuster le début et la fin
              </Link>
            )}
            <Link to={`/souvenir/${entry.id}/modifier`} className="btn-text">
              Modifier
            </Link>
          </div>
        )}
        {/* T-106 : « Supprimer » en tertiary rouge, pleine largeur, confirmé avant d’agir. */}
        {!readOnly && <DangerButton onClick={() => setConfirmDelete(true)}>Supprimer</DangerButton>}
      </main>

      {/* L’action principale : raconter les arrêts qui attendent encore un repère. */}
      {untold.length > 0 && !readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
          <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
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
      {viewer !== null && <PhotoViewer photos={entry.photos} start={viewer} onClose={() => setViewer(null)} />}
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
