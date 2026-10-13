import { useEffect, useRef } from 'react'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { awardOnce } from '../../firebase/training'
import { challengeProgress, weekChallenge } from '../../lib/challenge'
import { MOMENT_XP } from '../../lib/moment'
import { weekId } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'

/**
 * Attribue le défi de la semaine dès qu'il est réussi, où que l'on soit dans l'app.
 * L'identifiant du gain est fixe : il ne peut pas être compté deux fois.
 */
export function DressageAwards() {
  const { dog, entries, sessions, xpLog } = useData()
  const today = useToday()
  const toast = useToast()
  const given = useRef(new Set<string>())

  useEffect(() => {
    const week = weekId(today)
    const id = `defi-${week}`
    if (given.current.has(id) || xpLog.some((e) => e.id === id)) return
    const challenge = weekChallenge(week, dog.traits ?? [])
    if (challengeProgress(challenge, today, entries, sessions) < challenge.target) return
    given.current.add(id)
    awardOnce(id, { date: today, kind: 'defi', xp: MOMENT_XP.challenge, bossId: challenge.bossId, label: challenge.label })
    toast(`Défi de la semaine réussi · +${MOMENT_XP.challenge} XP`)
  }, [dog.traits, entries, sessions, xpLog, today, toast])

  return null
}
