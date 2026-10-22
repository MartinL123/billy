import { useEffect, useState } from 'react'
import { removeWalkPhotos, updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { EntryPhoto } from '../../firebase/types'
import type { Route } from '../../lib/route'
import { photosAddedLine } from '../../lib/walkPhotos'
import { isNative } from '../../native'
import { photosAccess } from '../../native/flair'
import { APP_NAME } from '../../appName'
import { addPhotosOfWalk } from './walkPhotosRun'

/** Les balades déjà parcourues pendant cette session (un récap rouvert ne relance rien). */
const started = new Set<string>()

type State = { kind: 'idle' } | { kind: 'searching' } | { kind: 'added'; photos: EntryPhoto[] } | { kind: 'undone' } | { kind: 'denied' }

/**
 * T-103 (V6.1 § 9) : dans le récap « Belle balade ! » (app iOS). Pas encore demandé : « Ajouter les photos prises
 * pendant la balade » (l’accès Photos d’iOS, une fois). Accepté : la photothèque est parcourue seule, une fois par
 * balade, et le récap dit « 3 photos de la balade ajoutées · Annuler ». Rien n’apparaît s’il n’y en a pas.
 */
export function RecapPhotos({ entryId, route }: { entryId: string; route: Route }) {
  const { dog, entries } = useData()
  const entry = entries.find((e) => e.id === entryId)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const consent = dog.walkPhotos

  const search = async () => {
    if (!entry || started.has(entryId)) return
    started.add(entryId)
    setState({ kind: 'searching' })
    const photos = await addPhotosOfWalk(entry, route)
    setState(photos.length ? { kind: 'added', photos } : { kind: 'idle' })
  }

  useEffect(() => {
    if (!isNative() || consent !== true || !entry || entry.photosSearchedAt || started.has(entryId)) return
    // L’accès a pu être retiré dans Réglages depuis : on ne cherche rien, sans message.
    void photosAccess(false).then((status) => (status === 'granted' || status === 'limited' ? search() : undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, entry?.id, entry?.photosSearchedAt])

  if (!isNative() || !entry) return null

  const ask = async () => {
    const status = await photosAccess(true)
    if (status === 'unavailable') return
    const ok = status === 'granted' || status === 'limited'
    updateDog({ walkPhotos: ok })
    if (ok) await search()
    else setState({ kind: 'denied' })
  }

  if (state.kind === 'searching')
    return (
      <p role="status" className="text-center text-[0.8824rem] text-muted">
        Recherche des photos de la balade…
      </p>
    )
  if (state.kind === 'added')
    return (
      <p role="status" className="flex flex-wrap items-center justify-center gap-x-1 text-center text-[0.8824rem] font-semibold">
        {photosAddedLine(state.photos.length)} ·
        <button
          type="button"
          onClick={() => {
            removeWalkPhotos(entryId, state.photos)
            setState({ kind: 'undone' })
          }}
          className="btn-text min-h-11 px-1"
        >
          Annuler
        </button>
      </p>
    )
  if (state.kind === 'undone')
    return (
      <p role="status" className="text-center text-[0.8824rem] text-muted">
        Photos retirées.
      </p>
    )
  if (state.kind === 'denied')
    return (
      <p role="status" className="text-center text-[0.8824rem] leading-snug text-muted">
        {`Accès aux photos refusé. Pour l’activer : Réglages › ${APP_NAME} › Photos.`}
      </p>
    )
  // Pas encore demandé, et rien n’a été cherché pour cette balade : on propose, sans insister.
  if (consent === undefined && !entry.photosSearchedAt)
    return (
      <button type="button" onClick={() => void ask()} className="btn-text min-h-11 self-center px-4 text-[0.9412rem]">
        Ajouter les photos prises pendant la balade
      </button>
    )
  return null
}
