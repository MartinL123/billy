import { Bytes } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { saveMember, type Member } from '../../firebase/community'
import { loadFile } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { dogColor } from '../../lib/community'
import { dogLevel } from '../../lib/level'
import { auth } from '../../firebase/app'

/**
 * Tient à jour ce que la meute voit de ce chien (son profil public). Rien de privé n'en sort : ni santé, ni documents,
 * ni Carnet. Le défi de la meute n'est plus affiché ni compté (spec V4 : une seule récompense, les os).
 */
export function CommunitySync() {
  const { dog, bossProgress } = useData()
  const last = useRef('')
  const thumb = useRef<{ id?: string; bytes?: Bytes }>({})
  const me = auth.currentUser?.uid ?? ''

  // Profil public : seulement quand il change.
  useEffect(() => {
    if (dog.unnamed || !me) return
    let alive = true
    const publish = async () => {
      if (dog.photoThumbFileId && thumb.current.id !== dog.photoThumbFileId) {
        try {
          const blob = await loadFile(dog.photoThumbFileId)
          thumb.current = { id: dog.photoThumbFileId, bytes: Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer())) }
        } catch {
          thumb.current = { id: dog.photoThumbFileId }
        }
      }
      if (!alive) return
      const badges = Object.fromEntries(Object.entries(bossProgress).map(([id, p]) => [id, p?.level ?? 0]))
      const member: Member = { dogName: dog.name, breed: dog.breed || undefined, birthDate: dog.birthDate || undefined, level: dogLevel(bossProgress).level, badges, color: dogColor(me), photoFileId: dog.photoThumbFileId, updatedAt: new Date().toISOString() }
      const key = JSON.stringify({ ...member, updatedAt: '' })
      if (key === last.current) return
      last.current = key
      saveMember(thumb.current.bytes ? { ...member, thumb: thumb.current.bytes } : member)
    }
    void publish()
    return () => {
      alive = false
    }
  }, [dog.name, dog.unnamed, dog.breed, dog.birthDate, dog.photoThumbFileId, bossProgress, me])

  return null
}
