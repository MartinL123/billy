import { useEffect, useRef } from 'react'
import { writeBatch } from 'firebase/firestore'
import { BonesGained } from '../../components/BoneIcon'
import { useToast } from '../../components/Toast'
import { db } from '../../firebase/app'
import { send, userDoc } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { backfillBones, balance } from '../../lib/bones'
import { useToday } from '../../lib/useToday'

/**
 * Une seule fois par compte : les os de ce qui a été fait avant leur arrivée (notes, étapes, missions, repos,
 * questionnaire), au barème actuel. Les identifiants fixes empêchent tout doublon.
 */
export function BonesBackfill() {
  const { dog, entries, xpLog, bones, online } = useData()
  const today = useToday()
  const toast = useToast()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || dog.bonesBackfilled || dog.pending || !online) return
    started.current = true
    const gains = backfillBones({ entries, xpLog, questionnaireDoneOn: dog.questionnaire?.completedAt?.slice(0, 10) }, bones)
    const batch = writeBatch(db)
    for (const gain of gains) batch.set(userDoc('bones', gain.id), { date: gain.date, amount: gain.amount, reason: gain.reason, refId: gain.refId })
    batch.update(userDoc('dog', 'billy'), { bonesBackfilled: today })
    send(batch.commit())
    if (gains.length) toast(<BonesGained label="Pour ce que vous aviez déjà fait :" amount={balance(gains)} />)
  }, [dog, entries, xpLog, bones, online, today, toast])

  return null
}
