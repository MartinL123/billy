import { useMemo } from 'react'
import { exerciseById } from '../../content/training'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { dailyQuest, MAX_SKIPS, questMission, questNote } from '../../lib/quest'
import { weekId } from '../../lib/rhythm'
import { currentExercise, sessionMinutes } from '../../lib/training-plan'
import { weekChallenge } from '../../lib/challenge'
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
    // La quête évite l'exercice du défi de la semaine : deux choses différentes à faire.
    const challenge = weekChallenge(weekId(today), bossProgress)
    const avoidExerciseId = currentExercise(challenge.bossId, bossProgress[challenge.bossId]?.level ?? 0)?.exercise.id
    const quest = dailyQuest({ today, active, progress: bossProgress, moments: entries, rests, avoidExerciseId }, skips)
    const minutes = sessionMinutes(dog.birthDate, today)
    // Une fois faite, la carte garde l'exercice réalisé, même si l'étape a avancé depuis.
    const doneName = stored?.done ? (stored.kind === 'repos' ? 'Journée de repos' : exerciseById(stored.exerciseId ?? '')?.name) : undefined
    const mission = doneName ? { title: doneName, detail: 'Bravo à vous deux.' } : questMission(quest, minutes)
    return { quest: stored?.done && stored.bossId ? { ...quest, bossId: stored.bossId } : quest, mission, note: questNote(quest, minutes), minutes, active, skips, done: Boolean(stored?.done), canSkip: skips < MAX_SKIPS }
  }, [dog.activeSkills, dog.traits, dog.birthDate, entries, bossProgress, xpLog, dailyQuests, today])
}
