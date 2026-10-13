import { useEffect, useRef, useState } from 'react'
import { useFileUrl } from '../firebase/files'

interface FileImageProps {
  fileId: string | undefined
  alt: string
  className?: string
  /** Charge tout de suite, sans attendre d'être à l'écran. */
  eager?: boolean
  contain?: boolean
}

/** Image stockée dans Firestore, chargée seulement quand elle approche de l'écran. */
export function FileImage({ fileId, alt, className = '', eager = false, contain = false }: FileImageProps) {
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

  return (
    <div ref={ref} className={`flex items-center justify-center overflow-hidden bg-placeholder text-center text-xs text-muted ${className}`}>
      {url ? (
        <img src={url} alt={alt} draggable={false} className={`size-full ${contain ? 'object-contain' : 'object-cover'}`} />
      ) : error ? (
        <span className="p-2">Image indisponible hors ligne</span>
      ) : null}
    </div>
  )
}
