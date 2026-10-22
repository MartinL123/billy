import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../components/Icons'
import { isNative } from '../../native'
import { POSTCARD_H, POSTCARD_W, postcardFileName } from '../../lib/postcard'
import type { ISODate } from '../../lib/dates'
import { drawPostcard, type PostcardInput } from './postcardImage'

/**
 * La carte postale en plein écran (spec V6 § 8.4) : l’image se prépare, puis s’affiche avec une seule action.
 * App iOS : « Partager » ouvre la feuille de partage d’iOS avec l’image. Web : « Enregistrer l’image » (lien de
 * téléchargement), ou un appui long sur l’image ; jamais de nouvelle fenêtre.
 */
export function Postcard({ input, date, onClose }: { input: PostcardInput; date: ISODate; onClose: () => void }) {
  const [image, setImage] = useState<{ blob: Blob; url: string }>()
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState<string>()
  const fileName = postcardFileName(date)

  useEffect(() => {
    let live = true
    let url: string | undefined
    drawPostcard(input)
      .then((blob) => {
        if (!live) return
        url = URL.createObjectURL(blob)
        setImage({ blob, url })
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
    // Dessinée une fois à l’ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const file = image ? new File([image.blob], fileName, { type: 'image/jpeg' }) : undefined
  // La feuille de partage d’iOS (WKWebView, iOS 15 et plus) ; sans elle, on fait comme sur le web.
  const canShare = Boolean(isNative() && file && navigator.canShare?.({ files: [file] }))
  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: input.title })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNote('Le partage n’a pas pu s’ouvrir. Appuyez longuement sur l’image pour l’enregistrer.')
    }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Carte postale de la balade" className="fixed inset-0 z-50 flex animate-fade flex-col bg-[#0F1412]">
      <div className="flex items-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <button type="button" onClick={onClose} className="flex min-h-12 items-center gap-2 rounded-full border-2 border-solid border-white/70 bg-black/40 px-4 text-[1rem] font-bold text-white">
          <CloseIcon size={20} />
          Fermer
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-3">
        {image ? (
          <img src={image.url} width={POSTCARD_W} height={POSTCARD_H} alt={`Carte postale : ${input.title}, ${input.line}, ${input.dateLine}`} className="max-h-full w-auto max-w-full rounded-[12px] object-contain shadow-[0_8px_30px_rgba(0,0,0,0.4)]" />
        ) : (
          <p role="status" className="text-center text-[1rem] text-white/85">
            {failed ? 'La carte postale n’a pas pu se préparer. Réessayez dans un moment.' : 'La carte postale se prépare…'}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {image && (canShare ? (
          <button type="button" onClick={() => void share()} className="btn btn-main min-h-[56px] w-full">
            Partager
          </button>
        ) : (
          <a href={image.url} download={fileName} className="btn btn-main min-h-[56px] w-full no-underline">
            Enregistrer l’image
          </a>
        ))}
        {image && <p className="m-0 text-center text-[0.8824rem] leading-snug text-white/80">{note ?? (canShare ? 'Le début et la fin du trajet sont retirés : votre adresse ne se devine pas.' : 'Ou appuyez longuement sur l’image pour l’enregistrer dans Photos. Le début et la fin du trajet sont retirés.')}</p>}
      </div>
    </div>,
    document.body,
  )
}
