import { useEffect, useRef, useState } from 'react'
import { useFileUrl } from '../firebase/files'
import { PhotoIcon } from './Icons'

interface FileImageProps {
  fileId: string | undefined
  alt: string
  className?: string
  /** Charge tout de suite, sans attendre d'être à l'écran. */
  eager?: boolean
  contain?: boolean
  /** Photo introuvable : ne rien afficher du tout, plutôt qu'un grand bloc vide. */
  hideMissing?: boolean
}

/** Image stockée dans Firestore, chargée seulement quand elle approche de l'écran. */
export function FileImage({ fileId, alt, className = '', eager = false, contain = false, hideMissing = false }: FileImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(eager)

  useEffect(() => {
    if (visible || !ref.current) return
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), {
      rootMargin: '400px',
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])

  const { url, error } = useFileUrl(fileId, visible)
  // Hors ligne, la photo existe peut-être : on le dit. En ligne, une erreur veut dire qu'elle est introuvable.
  const offline = error && !navigator.onLine
  if (hideMissing && (!fileId || (error && !offline))) return null

  return (
    <div ref={ref} className={`flex items-center justify-center overflow-hidden bg-placeholder text-center text-xs text-muted ${className}`}>
      {url ? (
        <img src={url} alt={alt} draggable={false} className={`size-full ${contain ? 'object-contain' : 'object-cover'}`} />
      ) : error ? (
        <span className="p-2">{offline ? 'Image indisponible hors ligne' : 'Image introuvable'}</span>
      ) : (
        // En cours de chargement : un fond avec une icône, pas un bloc gris muet.
        <PhotoIcon size={28} className="text-[#A9B3AF]" aria-label="Photo en cours de chargement" />
      )}
    </div>
  )
}
