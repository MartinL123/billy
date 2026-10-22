import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { PhotoIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { Stats } from '../../components/Stats'
import { deleteEntry, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { Entry, WithId } from '../../firebase/types'
import { useReadOnly } from '../../firebase/viewer'
import { ofName } from '../../lib/gender'
import { momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { useBack } from '../../lib/useBack'
import { discoverySentence, shareGain, sheetStats, sourceLabels, untoldStops, walkDiscovery, walkSubtitle, CELLS_PER_BIT } from '../../lib/walkSheet'
import { walkTimeline, type TimelineEvent } from '../../lib/walkTimeline'
import { postcardDateLine, postcardLine, postcardRoute } from '../../lib/postcard'
import { MomentChips } from '../journal/EntryCard'
import { PhotoViewer } from '../journal/PhotoViewer'
import { setDraftPhotos } from '../journal/draft'
import { PaceChart } from './PaceChart'
import { hasNumbers, WalkNumbers } from './WalkNumbers'
import { WalkMap } from './WalkMap'
import { WalkTimeline } from './WalkTimeline'
import { ToProfile } from './ToProfile'
import { StopTiles, usePlaceOnStop } from './StopTiles'
import { Postcard } from './Postcard'

type WalkEntry = WithId<Entry> & { pending?: boolean }

/**
 * La fiche de balade (spec V6 § 6.1, remplace V3-CarnetTrajet) : une seule page qui défile. La carte colorée par allure,
 * le titre, les Stats, l’allure, « Ce qui s’est passé », « Ce qu’il a découvert », les photos, « Tous les chiffres »
 * (replié), les sources, puis Modifier et Supprimer. Une balade ancienne (sans trajet daté) ne montre que ce qu’elle a.
 */
export function WalkSheet({ entry, route }: { entry: WalkEntry; route: Route }) {
  const readOnly = useReadOnly()
  const { dog, entries, communes } = useData()
  const navigate = useNavigate()
  const back = useBack('/balades')
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
  const discovery = useMemo(() => walkDiscovery(entry.id, entries, communes), [entry.id, entries, communes])
  const sources = sourceLabels(route)
  const untold = untoldStops(route)
  const showPace = Boolean(route.track && route.pace && route.pace.length > 1)
  const bits = discovery ? Math.floor(discovery.newCells / CELLS_PER_BIT) : 0
  const placeOnStop = usePlaceOnStop(entry.id, route)
  const removeMoment = (index: number) => updateEntryRoute(entry.id, storeRoute({ ...route, moments: route.moments.filter((_, j) => j !== index) }))
  // Sous un repère : « Ajouter à Comment il réagit » (peur, grogne : seulement si on le choisit) et « Retirer ».
  const momentActions = (event: TimelineEvent) => {
    const found = event.kind === 'moment' ? { moment: event.moment, index: event.momentIndex } : event.kind === 'stop' && event.moment && event.momentIndex !== undefined ? { moment: event.moment, index: event.momentIndex } : undefined
    // Un arrêt sans repère : « Que s’est-il passé ici ? » et ses 6 tuiles (V6 § 6.2).
    if (event.kind === 'stop' && !event.moment && !readOnly)
      return (
        <div className="mt-1.5 flex flex-col gap-2">
          <span className="text-[0.8824rem] font-bold">Que s’est-il passé ici ?</span>
          <StopTiles stop={event} onPick={(type, note) => placeOnStop(event.stopIndex, type, note)} />
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
        <BackLink label="Ses balades" onClick={back} />
      </header>

      {/* 1. La carte (40 % de la hauteur) : « Revoir la balade » et le plein écran (la carte du territoire). */}
      <div className="relative">
        <WalkMap route={route} dogName={dog.name} cursor={cursor} replaying={replaying} onReplayEnd={() => setReplaying(false)} className="h-[40dvh] min-h-[200px]" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2 pr-9">
          {route.points.length > 1 ? (
            <button type="button" onClick={() => setReplaying(!replaying)} className="tap pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full border-0 bg-surface px-4 text-[0.8824rem] font-bold text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {replaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
              {replaying ? 'Arrêter' : 'Revoir la balade'}
            </button>
          ) : (
            <span />
          )}
          <Link to={`/territoire?balade=${encodeURIComponent(entry.id)}`} aria-label="Voir la balade en plein écran sur la carte" className="tap pointer-events-auto flex size-11 items-center justify-center rounded-full bg-surface text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </Link>
        </div>
      </div>

      <main className={`flex flex-col gap-5 px-5 pt-4 ${untold.length && !readOnly ? 'pb-[calc(env(safe-area-inset-bottom)+112px)]' : 'pb-[calc(env(safe-area-inset-bottom)+40px)]'}`}>
        {/* 2. Surtitre, titre, sous-titre. */}
        <div className="flex flex-col gap-1">
          <span className="surtitre text-primary">Balade avec {dog.name}</span>
          <h1 className="title-screen">{name || 'Balade'}</h1>
          <p className="text-[0.9412rem] text-muted">{walkSubtitle({ date: entry.date, startTime: route.startTime, endTime: route.endTime, commune: entry.commune, trimmed: route.track ? route.trimmed : undefined })}</p>
          <Pending show={Boolean(entry.pending)} />
        </div>
        {notes && <p className="-mt-2 text-[1rem] leading-[1.45] whitespace-pre-wrap">{notes}</p>}
        <MomentChips entry={entry} />

        {/* 3. Stats : durée · distance · en marche · arrêts. */}
        <Stats items={sheetStats(route)} />
        {/* § 8.4 : la carte postale, en action secondaire (l’orange reste « Raconter la balade »). */}
        {!readOnly && (
          <button type="button" onClick={() => setPostcard(true)} className="btn-text -mt-2 -ml-1 self-start">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
              <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
            </svg>
            Partager
          </button>
        )}

        {/* 4. L’allure minute par minute. */}
        {showPace && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Allure</h2>
            <div className="card p-4">
              <PaceChart route={route} onScrub={setCursor} />
            </div>
          </section>
        )}

        {/* 5. Ce qui s’est passé. */}
        {events.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Ce qui s’est passé</h2>
            <WalkTimeline events={events} startTime={route.startTime} preview renderExtra={momentActions} />
          </section>
        )}

        {/* 6. Ce qu’il a découvert (seulement s’il y a du nouveau). */}
        {discovery && discovery.newCells > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Ce qu’il a découvert</h2>
            <div className="card flex flex-col gap-3 p-4">
              <Stats
                items={[
                  { value: discovery.commune ? (shareGain(discovery.share) ?? '') : '', label: discovery.commune ? `${ofName(discovery.commune)} découvert` : '' },
                  { value: bits ? String(bits) : '', label: bits > 1 ? 'Nouveaux bouts de territoire' : 'Nouveau bout de territoire' },
                ]}
              />
              <p className="text-[0.9412rem] leading-snug">{discoverySentence(dog.name, discovery.newCells)}.</p>
            </div>
          </section>
        )}

        {/* 7. Les photos de la balade (photothèque seulement). */}
        {(entry.photos.length > 0 || !readOnly) && (
          <section className="flex flex-col gap-2">
            <h2 className="title-section">Photos</h2>
            {entry.photos.length > 0 && (
              <div className={`grid gap-1.5 ${entry.photos.length > 1 ? 'grid-cols-2' : ''}`}>
                {entry.photos.map((photo, i) => (
                  <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en plein écran`} onClick={() => setViewer(i)} className="block overflow-hidden rounded-[18px] border-0 bg-transparent p-0">
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

        {/* 8. Tous les chiffres, repliés. */}
        {hasNumbers(route) && <WalkNumbers route={route} />}

        {/* 9. Sources, puis Modifier et Supprimer. */}
        {(sources.track || sources.weather || sources.places) && <p className="source-note -mt-2">{[sources.track, sources.weather, sources.places].filter(Boolean).join(' · ')}</p>}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-x-6 border-t border-divider pt-2">
            <Link to={`/souvenir/${entry.id}/modifier`} className="btn-text -ml-1">
              Modifier
            </Link>
            {/* § 8.3 : seulement avec un trajet daté (les anciennes balades n’ont rien à recadrer). */}
            {route.track && (
              <Link to={`/souvenir/${entry.id}/recadrer`} className="btn-text">
                Ajuster le début et la fin
              </Link>
            )}
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-text text-danger">
              Supprimer
            </button>
          </div>
        )}
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
          input={{ points: postcardRoute(route.points, route.distanceM), title: name || 'Balade', line: postcardLine(route.distanceM, discovery?.newCells ?? 0), dateLine: postcardDateLine(entry.date, entry.commune), dogName: dog.name, ...(dog.photoThumbFileId || dog.photoFileId ? { dogPhotoFileId: dog.photoThumbFileId ?? dog.photoFileId } : {}) }}
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
