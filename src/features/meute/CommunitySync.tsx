import { Bytes } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { BonesGained } from '../../components/BoneIcon'
import { useToast } from '../../components/Toast'
import { saveChallengeRow, saveMember, type Member } from '../../firebase/community'
import { loadFile } from '../../firebase/files'
import { send, userDoc } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { awardBone } from '../../firebase/training'
import { setDoc } from 'firebase/firestore'
import { packChallengeBone } from '../../lib/bones'
import { dogColor, packScore, PACK_CHALLENGE_TARGET } from '../../lib/community'
import { dogLevel } from '../../lib/level'
import { weekId, weekOf } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { auth } from '../../firebase/app'

/**
 * Tient à jour ce que la meute voit de ce chien (profil public, ligne du défi de la semaine), et verse les os
 * du défi de la meute. Rien de privé n'en sort : ni santé, ni documents, ni Carnet.
 */
export function CommunitySync() {
  const { dog, bossProgress, dailyQuests, bones, inventory } = useData()
  const today = useToday()
  const toast = useToast()
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

  // Défi de la meute : les jours où la mission a été faite cette semaine, et +40 os une fois tenu.
  const week = weekId(today)
  const days = dailyQuests.filter((q) => q.done && weekOf(today).includes(q.date)).map((q) => q.date).sort()
  const daysKey = days.join(',')
  useEffect(() => {
    if (dog.unnamed || !me) return
    saveChallengeRow(week, { dogName: dog.name, color: dogColor(me), days: daysKey ? daysKey.split(',') : [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, daysKey, dog.name, dog.unnamed, me])

  useEffect(() => {
    if (packScore(days, weekOf(today)) < PACK_CHALLENGE_TARGET) return
    const gain = packChallengeBone(week, today)
    if (bones.some((b) => b.id === gain.id)) return
    awardBone(gain)
    // Au premier défi tenu, le sticker « Meute » rejoint ses objets.
    if (!inventory.some((i) => i.id === 'sticker-meute')) send(setDoc(userDoc('inventory', 'sticker-meute'), { boughtAt: new Date().toISOString(), price: 0 }))
    toast(<BonesGained label="Défi de la meute tenu !" amount={gain.amount} />)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey, week])

  return null
}
