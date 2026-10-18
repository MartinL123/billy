import { MAX_LEVEL } from '../content/training'
import type { ProgressMap } from './bossProgress'
import { addDays, dayNumber, diffDays, type ISODate } from './dates'
import { weekOf } from './rhythm'
import { exercisesForStep, type PlannedExercise } from './training-plan'

/** Mission du jour (spec V3 § 5.9) : une seule chose à faire, toujours courte. */
export type QuestKind = 'exercice' | 'revision' | 'repos'

export const QUEST_XP = 15
/** « Autre idée » : 3 fois par jour au maximum. */
export const MAX_SKIPS = 3
/** Une révision d'une compétence maîtrisée revient environ 1 jour sur 5. */
const REVISION_EVERY = 5

export const REST_IDEAS = ['Une balade tranquille, à son rythme', 'Dix minutes de reniflage dans l’herbe', 'Câlins et jeux calmes à la maison']

export interface Quest {
  kind: QuestKind
  bossId?: string
  planned?: PlannedExercise
  /** Journée de repos : l'idée du jour. */
  idea?: string
  /** Le repos suit un moment difficile : « Autre idée » ne propose alors que du repos. */
  afterHardDay?: boolean
}

export interface QuestContext {
  today: ISODate
  /** Compétences en cours (3 au plus). */
  active: string[]
  progress: ProgressMap
  moments: { date: ISODate; feeling?: string }[]
  /** Jours de repos déjà notés. */
  rests: ISODate[]
  /** Exercice du défi de la semaine : la quête en propose un autre quand c'est possible. */
  avoidExerciseId?: string
  /** Premier jour d'utilisation du compte : les 3 premiers jours, jamais de repos imposé (audit R-011). */
  firstDay?: ISODate
}

const pick = <T>(items: T[], n: number): T => items[((n % items.length) + items.length) % items.length]!

/**
 * La quête du jour, la même sur tous les appareils. `skips` = nombre de « Autre idée » demandées aujourd'hui.
 * Le lendemain d'un moment « Difficile », c'est toujours une journée de repos.
 * Une compétence de peur se travaille à son étape en cours, au réglage du catalogue : au calme et à distance.
 */
export function dailyQuest({ today, active, progress, moments, rests, avoidExerciseId, firstDay }: QuestContext, skips = 0): Quest {
  const n = dayNumber(today)
  const rest = (afterHardDay: boolean): Quest => ({ kind: 'repos', idea: pick(REST_IDEAS, n + skips), afterHardDay })

  const yesterday = addDays(today, -1)
  if (moments.some((m) => m.date === yesterday && m.feeling === 'difficile')) return rest(true)

  // Un jour de repos par semaine : le dimanche, s'il n'y en a pas déjà eu un.
  const week = weekOf(today)
  const newAccount = Boolean(firstDay) && diffDays(firstDay!, today) < 3
  if (skips === 0 && !newAccount && week[6] === today && !rests.some((d) => week.includes(d))) return rest(false)

  const level = (id: string) => progress[id]?.level ?? 0
  const mastered = Object.keys(progress).filter((id) => level(id) >= MAX_LEVEL).sort()
  const pool = active.filter((id) => level(id) < MAX_LEVEL)

  const revision = (): Quest | undefined => {
    if (mastered.length === 0) return undefined
    const bossId = pick(mastered, n + skips)
    const planned = exercisesForStep(bossId, MAX_LEVEL)
    return planned.length ? { kind: 'revision', bossId, planned: pick(planned, n + skips) } : undefined
  }

  if ((n + skips) % REVISION_EVERY === 0 || pool.length === 0) {
    const quest = revision()
    if (quest) return quest
  }
  if (pool.length === 0) return rest(false)

  // On parcourt les compétences en cours à partir de celle du jour, et leurs exercices à partir de celui du jour :
  // le premier qui n'est pas l'exercice du défi de la semaine est retenu. S'il n'y a que lui, on le garde.
  let fallback: Quest | undefined
  for (let i = 0; i < pool.length; i++) {
    const bossId = pick(pool, n + skips + i)
    const planned = exercisesForStep(bossId, level(bossId))
    for (let j = 0; j < planned.length; j++) {
      const choice = pick(planned, Math.floor(n / pool.length) + skips + j)
      const quest: Quest = { kind: 'exercice', bossId, planned: choice }
      if (choice.exercise.id !== avoidExerciseId) return quest
      fallback ??= quest
    }
  }
  return fallback ?? rest(false)
}

/** La mission en une phrase : « Jeu du prénom, 3 minutes. Salon, à 1 m. » */
export function questMission(quest: Quest, minutes: number): { title: string; detail: string } {
  if (quest.kind === 'repos' || !quest.planned) {
    return { title: 'Journée de repos', detail: quest.afterHardDay ? `Hier était difficile : aujourd'hui, on souffle. ${quest.idea}.` : `${quest.idea}. Aucun exercice aujourd'hui.` }
  }
  const { exercise, setting } = quest.planned
  return { title: quest.kind === 'revision' ? `Révision : ${exercise.name}` : exercise.name, detail: `${minutes} min · ${setting.charAt(0).toLocaleLowerCase('fr')}${setting.slice(1)}` }
}

/** Texte pré-rempli de la note quand on touche « C'est fait ! ». */
export function questNote(quest: Quest, minutes: number): string {
  if (!quest.planned) return 'Journée de repos.'
  return `${quest.planned.exercise.name}, ${minutes} minutes. ${quest.planned.setting}.`
}
