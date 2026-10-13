import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../components/Icons'
import { useFileUrl } from '../../firebase/files'
import type { EntryPhoto } from '../../firebase/types'

function Slide({ photo, label, active }: { photo: EntryPhoto; label: string; active: boolean }) {
  // La miniature tout de suite, la pleine résolution seulement pour la photo affichée (et ses voisines).
  const thumb = useFileUrl(photo.thumbFileId)
  const full = useFileUrl(photo.fileId, active)
  const url = full.url ?? thumb.url
  return (
    <div className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center">
      {url ? (
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-sm text-white/70">{full.error ? 'Photo indisponible hors ligne' : 'Chargement…'}</span>
      )}
    </div>
  )
}

interface PhotoViewerProps {
  photos: EntryPhoto[]
  start: number
  onClose: () => void
}

/** Photo en plein écran, balayage horizontal entre les photos de l'entrée. */
export function PhotoViewer({ photos, start, onClose }: PhotoViewerProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(start)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = start * el.clientWidth
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [start, onClose])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photos du souvenir" className="fixed inset-0 z-50 animate-fade bg-black">
      <div
        ref={scroller}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        {photos.map((photo, i) => (
          <Slide key={photo.fileId} photo={photo} label={`Photo ${i + 1} sur ${photos.length}`} active={Math.abs(i - index) <= 1} />
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <button type="button" aria-label="Fermer" onClick={onClose} className="flex size-11 items-center justify-center rounded-full border-0 bg-white/15 text-white">
          <CloseIcon />
        </button>
        {photos.length > 1 && (
          <span aria-live="polite" className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
            {index + 1} / {photos.length}
          </span>
        )}
        <span className="w-11" />
      </div>
    </div>,
    document.body,
  )
}
