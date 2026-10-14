import { useEffect, useState } from 'react'
import type { Member } from '../../firebase/community'

/** La miniature publique d'un chien de la meute, ou son initiale sur sa couleur. */
export function MemberAvatar({ member, size = 44 }: { member: Pick<Member, 'dogName' | 'color' | 'thumb'>; size?: number }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!member.thumb) return setUrl(undefined)
    const created = URL.createObjectURL(new Blob([member.thumb.toUint8Array() as BlobPart], { type: 'image/jpeg' }))
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [member.thumb])
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-solid font-display font-bold text-white" style={{ width: size, height: size, borderColor: member.color, background: member.color, fontSize: size * 0.42 }}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : member.dogName.charAt(0).toUpperCase()}
    </span>
  )
}
