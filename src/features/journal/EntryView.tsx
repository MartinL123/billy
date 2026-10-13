import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { ChevronLeftIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useData } from '../../firebase/store'
import { modernCard } from '../../lib/carnet'
import { formatLong } from '../../lib/dates'
import { useBack } from '../../lib/useBack'
import { MomentChips } from './EntryCard'
import { PhotoViewer } from './PhotoViewer'

/** Le détail d'un moment du Carnet. C'est ici que se trouve « Modifier ». */
export default function EntryView() {
  const { id } = useParams()
  const { entries } = useData()
  const back = useBack('/carnet')
  const [viewer, setViewer] = useState<number | null>(null)
  const found = entries.find((e) => e.id === id)

  if (!found) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[17px] text-muted">Ce moment n'existe plus.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour au Carnet
        </button>
      </main>
    )
  }
  const entry = modernCard(found)

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          Carnet
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="font-display text-[26px] leading-tight font-extrabold">Le {formatLong(entry.date)}</h1>
        <Pending show={entry.pending} />
        {entry.text && <p className="text-[19px] leading-[1.45] whitespace-pre-wrap">{entry.text}</p>}
        <MomentChips entry={entry} />
        {entry.photos.length > 0 && (
          <div className={`grid gap-1.5 ${entry.photos.length > 1 ? 'grid-cols-2' : ''}`}>
            {entry.photos.map((photo, i) => (
              <button key={photo.fileId} type="button" aria-label={`Voir la photo ${i + 1} en plein écran`} onClick={() => setViewer(i)} className="block overflow-hidden rounded-[18px] border-0 bg-transparent p-0">
                <FileImage fileId={photo.thumbFileId} alt="" className={entry.photos.length > 1 ? 'aspect-square w-full' : 'h-[260px] w-full'} />
              </button>
            ))}
          </div>
        )}
        <Link to={`/souvenir/${entry.id}/modifier`} className="btn btn-outline mt-2">
          Modifier
        </Link>
      </main>
      {viewer !== null && <PhotoViewer photos={entry.photos} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}
