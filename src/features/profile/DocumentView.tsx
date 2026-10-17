import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ImportIcon, TrashIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { deleteDocument } from '../../firebase/db'
import { loadFile } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { formatLong } from '../../lib/dates'
import { openPdf, renderPdfPage } from '../../lib/pdf'
import { safeFileName, shareFiles } from '../../lib/share'
import { useBack } from '../../lib/useBack'
import { categoryLabel } from './documents'

/** Pages d'un PDF dessinées une à une (iOS n'affiche pas un PDF multipage dans une page web). */
function PdfPages({ blob }: { blob: Blob }) {
  const container = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    const host = container.current
    const run = async () => {
      const pdf = await openPdf(new Uint8Array(await blob.arrayBuffer()))
      try {
        const width = Math.min(1600, (host?.clientWidth ?? 390) * Math.min(3, window.devicePixelRatio || 1))
        for (let n = 1; n <= pdf.numPages && alive; n++) {
          const canvas = await renderPdfPage(pdf, n, width)
          if (!alive || !host) break
          canvas.className = 'block w-full rounded-lg bg-white shadow-card'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `Page ${n} sur ${pdf.numPages}`)
          host.appendChild(canvas)
          setState('ready')
        }
      } finally {
        void pdf.loadingTask.destroy()
      }
    }
    run().catch(() => alive && setState('error'))
    return () => {
      alive = false
      host?.replaceChildren()
    }
  }, [blob])

  return (
    <>
      <div ref={container} className="flex flex-col gap-3" />
      {state === 'loading' && <p className="py-8 text-center text-muted">Ouverture du PDF…</p>}
      {state === 'error' && <p className="py-8 text-center text-danger">Ce PDF n'a pas pu être affiché. Vous pouvez quand même le partager pour l'ouvrir ailleurs.</p>}
    </>
  )
}

function ImagePages({ blobs }: { blobs: Blob[] }) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const created = blobs.map((blob) => URL.createObjectURL(blob))
    setUrls(created)
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [blobs])
  return (
    <div className="flex flex-col gap-3">
      {urls.map((url, i) => (
        <img key={url} src={url} alt={`Page ${i + 1} sur ${urls.length}`} className="block w-full rounded-lg bg-white shadow-card" />
      ))}
    </div>
  )
}

export default function DocumentView() {
  const { id } = useParams()
  const { documents, events } = useData()
  const navigate = useNavigate()
  const back = useBack('/sante')
  const document_ = documents.find((d) => d.id === id)

  const [blobs, setBlobs] = useState<Blob[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fileKey = document_?.fileIds.join(',')
  useEffect(() => {
    if (!fileKey) return
    let alive = true
    setBlobs(null)
    setFailed(false)
    Promise.all(fileKey.split(',').map(loadFile))
      .then((loaded) => alive && setBlobs(loaded))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [fileKey])

  if (!document_) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">Ce document n'existe plus.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour
        </button>
      </main>
    )
  }

  const linkedEvent = events.find((e) => e.id === document_.eventId)

  const files = () =>
    (blobs ?? []).map((blob, i) => {
      const extension = document_.kind === 'pdf' ? 'pdf' : 'jpg'
      const suffix = (blobs?.length ?? 0) > 1 ? ` ${i + 1}` : ''
      return new File([blob], `${safeFileName(document_.title)}${suffix}.${extension}`, { type: blob.type })
    })

  const share = async () => {
    setMessage('')
    const outcome = await shareFiles(files(), document_.title)
    if (outcome === 'downloaded') setMessage('Partage indisponible ici : le fichier a été téléchargé.')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 py-1.5 pt-[calc(env(safe-area-inset-top)+6px)]">
        <button type="button" onClick={back} className="btn btn-outline">
          <ChevronLeftIcon />
          Retour
        </button>
      </header>

      <main className="flex flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] leading-tight font-bold">{document_.title}</h1>
          <p className="text-[15px] text-muted">
            {categoryLabel(document_.category)} · {formatLong(document_.date)}
          </p>
          <Pending show={document_.pending} />
          {linkedEvent && (
            <button
              type="button"
              onClick={() => navigate(`/evenement/${linkedEvent.id}`)}
              className="btn btn-outline self-start text-left"
            >
              Lié à « {linkedEvent.title} »{linkedEvent.date ? ` du ${formatLong(linkedEvent.date)}` : ''}
            </button>
          )}
        </div>

        {failed && (
          <p className="rounded-field bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
            Ce document n'est pas encore sur cet appareil. Reconnectez-vous à Internet pour le télécharger une première fois.
          </p>
        )}
        {!failed && !blobs && <p className="py-8 text-center text-muted">Chargement…</p>}
        {blobs && (document_.kind === 'pdf' && blobs[0] ? <PdfPages blob={blobs[0]} /> : <ImagePages blobs={blobs} />)}
        <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger">
          <TrashIcon size={20} />
          Supprimer ce document
        </button>
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button
            type="button"
            disabled={!blobs}
            onClick={() => void share()}
            className="btn btn-main w-full disabled:opacity-60"
          >
            <ImportIcon size={20} />
            Partager
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmSheet
          title="Supprimer ce document ?"
          message={`« ${document_.title} » sera supprimé définitivement de l'app.`}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteDocument(document_, Boolean(linkedEvent))
            back()
          }}
        />
      )}
    </div>
  )
}
