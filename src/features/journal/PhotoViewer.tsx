import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../../components/Icons'
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

/** La légende d’une photo : le lieu et le moment ; `onMap` : elle est posée sur la carte. */
export interface PhotoCaption {
  place?: string
  when?: string
  onMap?: boolean
}

interface PhotoViewerProps {
  photos: EntryPhoto[]
  start: number
  onClose: () => void
  /** T-108 : sous chaque photo, le lieu et l’heure. */
  captions?: PhotoCaption[]
  /** T-108 : « Voir sur la carte » (seulement pour une photo posée sur la carte). */
  onShowOnMap?: (index: number) => void
}

/**
 * Photo en grand (maquette flair-2026-10-22/Photo, T-108) : plein écran noir, « 1 sur 3 » et Fermer en haut, balayage
 * entre les photos (et des boutons précédent / suivant, R-067), des points sous la photo, puis le lieu, l’heure et
 * « Voir sur la carte ».
 */
export function PhotoViewer({ photos, start, onClose, captions, onShowOnMap }: PhotoViewerProps) {
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

  // Boutons précédent / suivant (R-067) : le balayage n’est pas le seul moyen de changer de photo.
  const go = (i: number) => {
    const el = scroller.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const arrow = 'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-black/45 p-0 text-white'
  const caption = captions?.[index]

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photos" className="fixed inset-0 z-50 flex animate-fade flex-col bg-[#0F1413] text-white">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <span aria-live="polite" className="text-[0.9412rem] font-bold tabular-nums">
          {photos.length > 1 ? `${index + 1} sur ${photos.length}` : ''}
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full border-0 bg-white/20 p-0 text-white">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
          {photos.map((photo, i) => (
            <Slide key={photo.fileId} photo={photo} label={`Photo ${i + 1} sur ${photos.length}`} active={Math.abs(i - index) <= 1} />
          ))}
        </div>
        {index > 0 && (
          <button type="button" aria-label="Photo précédente" onClick={() => go(index - 1)} className={`${arrow} left-2`}>
            <ChevronLeftIcon />
          </button>
        )}
        {index < photos.length - 1 && (
          <button type="button" aria-label="Photo suivante" onClick={() => go(index + 1)} className={`${arrow} right-2`}>
            <ChevronRightIcon />
          </button>
        )}
      </div>
      {photos.length > 1 && (
        <div aria-hidden="true" className="flex justify-center gap-2 pt-3">
          {photos.map((p, i) => (
            <span key={p.fileId} className={`size-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
      <div className="flex min-h-[72px] items-center gap-3 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex min-w-0 flex-1 flex-col">
          {caption?.place && <span className="truncate text-[1rem] font-bold">{caption.place}</span>}
          {caption?.when && <span className="text-[0.8824rem] text-white/75">{caption.when}</span>}
        </div>
        {caption?.onMap && onShowOnMap && (
          <button type="button" onClick={() => onShowOnMap(index)} className="flex min-h-11 shrink-0 items-center rounded-full border-2 border-solid border-white/85 bg-transparent px-4 text-[0.8824rem] font-bold whitespace-nowrap text-white">
            Voir sur la carte
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
