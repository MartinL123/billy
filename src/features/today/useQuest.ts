import { useMemo } from 'react'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { dailyQuest, MAX_SKIPS, questMission, questNote } from '../../lib/quest'
import { sessionMinutes } from '../../lib/training-plan'
import { useToday } from '../../lib/useToday'

/** La quête du jour, calculée à partir des compétences en cours. Seuls « fait » et « autre idée » sont enregistrés. */
export function useQuest() {
  const { dog, entries, bossProgress, xpLog, dailyQuests } = useData()
  const today = useToday()
  return useMemo(() => {
    const stored = dailyQuests.find((q) => q.date === today)
    const skips = Math.min(MAX_SKIPS, stored?.skips ?? 0)
    const active = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)
    const rests = xpLog.filter((e) => e.kind === 'repos').map((e) => e.date)
    const quest = dailyQuest({ today, active, progress: bossProgress, moments: entries, rests }, skips)
    const minutes = sessionMinutes(dog.birthDate, today)
    return { quest, mission: questMission(quest, minutes), note: questNote(quest, minutes), minutes, active, skips, done: Boolean(stored?.done), canSkip: skips < MAX_SKIPS }
  }, [dog.activeSkills, dog.traits, dog.birthDate, entries, bossProgress, xpLog, dailyQuests, today])
}
