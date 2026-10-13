import { useEffect, useRef } from 'react'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { awardFirst, awardQuest } from '../../firebase/training'
import { firstByKey, reachedFirsts } from '../../lib/firsts'
import { questDone, weekQuests } from '../../lib/quests'
import { weekId } from '../../lib/rhythm'
import { useToday } from '../../lib/useToday'
import { XP } from '../../lib/xp'

/** Les jours de récupération déclarés, tirés du journal d'XP. */
export const restsOf = (log: { date: string; kind: string; key?: string }[]) =>
  log.filter((e) => e.kind === 'repos').map((e) => ({ date: e.date, sniff: e.key === 'reniflage' }))

/**
 * Attribue les premières fois et les quêtes terminées dès qu'elles sont atteintes, où que l'on soit dans l'app.
 * Chaque gain a un identifiant fixe : il ne peut pas être compté deux fois.
 */
export function DressageAwards() {
  const { dog, sessions, exposures, xpLog, questWeeks } = useData()
  const today = useToday()
  const toast = useToast()
  // Déjà attribué pendant cette session, le temps que l'écriture revienne dans les données.
  const given = useRef(new Set<string>())

  useEffect(() => {
    const have = new Set([...xpLog.map((e) => e.id), ...given.current])
    for (const { key, date } of reachedFirsts({ sessions, exposures, log: xpLog })) {
      const first = firstByKey(key)
      if (!first || have.has(`premiere-${key}`)) continue
      given.current.add(`premiere-${key}`)
      awardFirst(key, first.label, date)
      toast(`Première fois : ${first.label} · +${XP.first} XP`)
    }
    const week = weekId(today)
    const replaced = questWeeks.find((q) => q.id === week)?.replaced ?? []
    const data = { sessions, exposures, rests: restsOf(xpLog) }
    for (const quest of weekQuests(week, dog.traits ?? [], replaced)) {
      if (have.has(`quete-${week}-${quest.key}`) || !questDone(quest, today, data)) continue
      given.current.add(`quete-${week}-${quest.key}`)
      awardQuest(week, quest.key, quest.label, today)
      toast(`Quête terminée : ${quest.label} · +${XP.quest} XP`)
    }
  }, [dog.traits, sessions, exposures, xpLog, questWeeks, today, toast])

  return null
}
