import { useEffect, useState } from 'react'
import type { Bytes } from 'firebase/firestore'

/** La miniature d'un moment partagé (une copie légère : la photo d'origine reste privée). */
export function FeedPhoto({ photo, size }: { photo: Bytes; size: number }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const created = URL.createObjectURL(new Blob([photo.toUint8Array() as BlobPart], { type: 'image/jpeg' }))
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [photo])
  return <span className="block shrink-0 overflow-hidden rounded-[12px] bg-placeholder" style={{ width: size, height: size }}>{url && <img src={url} alt="Photo du moment" className="size-full object-cover" />}</span>
}
