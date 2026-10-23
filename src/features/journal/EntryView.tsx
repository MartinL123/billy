import { useEffect, useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { Pending } from '../../components/Pending'
import { Bytes } from 'firebase/firestore'
import { shareMoment, unshareMoment, watchShared } from '../../firebase/community'
import { loadFile } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { modernCard } from '../../lib/carnet'
import { formatLong } from '../../lib/dates'
import { useBack } from '../../lib/useBack'
import { MomentChips } from './EntryCard'
import { PhotoViewer } from './PhotoViewer'
import { readRoute } from '../../lib/route'
import { walkOnMap } from '../../lib/mapPanel'
import { useReadOnly } from '../../firebase/viewer'

/** Le détail d’un souvenir (balade, photo ou note). C’est ici que se trouve « Modifier ». */
export default function EntryView() {
  const readOnly = useReadOnly()
  const { id } = useParams()
  const { entries } = useData()
  const back = useBack('/balades')
  // Ouvert depuis la page Billy (T-104) : le retour dit d’où l’on vient (« Billy », « Sa journée »), comme la fiche d’une balade.
  const location = useLocation()
  const backLabel = (location.state as { retour?: string } | null)?.retour ?? 'Ses balades'
  const [viewer, setViewer] = useState<number | null>(null)
  const found = entries.find((e) => e.id === id)

  if (!found) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[1rem] text-muted">Ce moment n’existe plus.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour à ses balades
        </button>
      </main>
    )
  }
  const entry = modernCard(found)
  const route = readRoute(entry.route)
  // Une balade a sa fiche (V6 § 6.1), dans le panneau de la carte de l’onglet Balades (R-094 « Une seule carte ») : on
  // y va, avec l’écran d’où l’on vient (« ‹ Accueil ») ; une photo ou une note garde ce détail simple.
  if (route) return <Navigate to={walkOnMap(entry.id)} replace state={location.state} />

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label={backLabel} onClick={back} />
      </header>
      <main className="flex flex-col gap-4 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="title-screen">Le {formatLong(entry.date)}</h1>
        <Pending show={entry.pending} />
        {entry.text && <p className="text-[1.1176rem] leading-[1.45] whitespace-pre-wrap">{entry.text}</p>}
        <MomentChips entry={entry} />
        {entry.photos.length > 0 && (
          <div className={`grid gap-1.5 ${entry.photos.length > 1 ? 'grid-cols-2' : ''}`}>
            {entry.photos.map((photo, i) => (
              <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en plein écran`} onClick={() => setViewer(i)} className="block overflow-hidden rounded-field border-0 bg-transparent p-0">
                <FileImage fileId={photo.thumbFileId} alt="" className={entry.photos.length > 1 ? 'aspect-square w-full' : 'h-[260px] w-full'} hideMissing />
              </button>
            ))}
          </div>
        )}
        {/* Visiteur (T-048) : il regarde le souvenir, sans le partager ni le modifier. */}
        {!readOnly && (
          <>
            {/* Gelé (T-072) : « Partager avec la meute » n’est plus proposé (SharedWithPack reste plus bas). */}
            <Link to={`/souvenir/${entry.id}/modifier`} className="btn btn-tertiary mt-2">
              Modifier
            </Link>
          </>
        )}
      </main>
      {viewer !== null && <PhotoViewer photos={entry.photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}

/**
 * Gelé (T-072) : plus affiché. Partager avec la meute, toujours par un choix explicite (désactivé par défaut) : le texte, le jour et la miniature
 * de la première photo. Ni heure, ni lieu, ni ressenti, ni trajet. On peut le retirer d’un toucher.
 */
export function SharedWithPack({ entry, dogName }: { entry: { id: string; date: string; text: string; photos: { thumbFileId: string }[] }; dogName: string }) {
  const [shared, setShared] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => watchShared(entry.id, setShared), [entry.id])
  const share = async () => {
    setBusy(true)
    try {
      const first = entry.photos[0]
      const thumb = first ? Bytes.fromUint8Array(new Uint8Array(await (await loadFile(first.thumbFileId)).arrayBuffer())) : undefined
      shareMoment(entry.id, { dogName, text: entry.text, date: entry.date, ...(thumb ? { photo: thumb } : {}) })
    } finally {
      setBusy(false)
    }
  }
  if (!shared)
    return (
      <button type="button" disabled={busy} onClick={share} className="btn-text min-h-12 self-start px-2 text-[0.8824rem] underline">
        Partager avec la meute
      </button>
    )
  return (
    <div className="flex items-center gap-3 rounded-field bg-primary-soft px-4 py-2">
      <span className="flex-1 text-[0.8824rem] font-semibold text-primary-dark">Partagé avec la meute</span>
      <button type="button" onClick={() => unshareMoment(entry.id)} className="btn-text min-h-11 px-3 text-[0.8824rem]">
        Retirer
      </button>
    </div>
  )
}

