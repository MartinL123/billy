import { useEffect, useRef } from 'react'
import { BonesGained } from '../../components/BoneIcon'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { awardBone, awardOnce } from '../../firebase/training'
import { challengeBone, profilePartBone, questionnaireBone, regularWeekBone, type BoneWithId } from '../../lib/bones'
import { challengeProgress, weekChallenge } from '../../lib/challenge'
import { MOMENT_XP } from '../../lib/moment'
import { essentialsDone, partComplete, PARTS, questionnaireStatus } from '../../lib/questionnaire'
import { notedDays, weekId, weekOf } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'

/**
 * Récompenses qui ne dépendent pas d’un écran : défi de la semaine réussi (+30 os), semaine régulière (+20 os),
 * questionnaire de départ terminé (+50 os). Chaque gain a un identifiant fixe : il ne peut pas être compté deux fois.
 */
export function DressageAwards() {
  const { dog, entries, sessions, exposures, bossProgress, xpLog, bones } = useData()
  const today = useToday()
  const toast = useToast()
  const given = useRef(new Set<string>())

  useEffect(() => {
    const has = (id: string) => given.current.has(id) || bones.some((b) => b.id === id)
    const give = (gain: BoneWithId, label: string) => {
      given.current.add(gain.id)
      awardBone(gain)
      toast(<BonesGained label={label} amount={gain.amount} />)
    }

    const week = weekId(today)
    const challenge = weekChallenge(week, bossProgress)
    const defi = challengeBone(week, today)
    if (!has(defi.id) && challengeProgress(challenge, today, entries, sessions) >= challenge.target) {
      // Ancienne trace du défi (journal interne), gardée pour l’historique.
      if (!xpLog.some((e) => e.id === `defi-${week}`)) awardOnce(`defi-${week}`, { date: today, kind: 'defi', xp: MOMENT_XP.challenge, bossId: challenge.bossId, label: challenge.label })
      return give(defi, 'Défi de la semaine réussi !')
    }

    const regular = regularWeekBone(weekOf(today), notedDays(entries, sessions, exposures), today)
    if (regular && !has(regular.id)) return give(regular, 'Semaine régulière, bravo !')

    // Une partie de son profil complétée (T-012), une fois par partie (pas pour un questionnaire déjà terminé d’un bloc).
    if (essentialsDone(dog.questionnaire) && !dog.questionnaire?.completedAt)
      for (let part = 1; part <= PARTS.length; part++) {
        const gain = profilePartBone(part, today)
        if (!has(gain.id) && partComplete(dog.questionnaire, part)) return give(gain, `Profil complété : ${PARTS[part - 1]!.toLowerCase()}`)
      }

    // Questionnaire terminé : aussi pour un questionnaire fini avant l’arrivée des os.
    const done = questionnaireBone(today)
    if (!has(done.id) && questionnaireStatus(dog.questionnaire).complete) give(done, 'Questionnaire terminé !')
  }, [dog.questionnaire, bossProgress, entries, sessions, exposures, xpLog, bones, today, toast])

  return null
}
