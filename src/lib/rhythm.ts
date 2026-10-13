import { addDays, dayNumber, type ISODate } from './dates'
import { bossesOf } from './xp'

/** Les 7 jours de la semaine en cours, du lundi au dimanche. */
export function weekOf(today: ISODate): ISODate[] {
  // 1970-01-01 était un jeudi : (n + 3) % 7 donne 0 pour lundi.
  const offset = (((dayNumber(today) + 3) % 7) + 7) % 7
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - offset))
}

/** Identifiant d'une semaine : la date de son lundi. */
export const weekId = (today: ISODate): ISODate => weekOf(today)[0]!

/** Objectif doux : 4 séances par semaine. Il ne passe jamais au rouge. */
export const WEEKLY_GOAL = 4

interface Dated {
  date: ISODate
}

/** Jours de la semaine où il s'est passé quelque chose. Un jour vide reste neutre. */
export function activeDays(today: ISODate, ...records: Dated[][]): Set<ISODate> {
  const week = new Set(weekOf(today))
  return new Set(records.flat().map((r) => r.date).filter((date) => week.has(date)))
}

export const sessionsThisWeek = (today: ISODate, sessions: Dated[]) => {
  const week = new Set(weekOf(today))
  return sessions.filter((s) => week.has(s.date)).length
}

/** « X jours d'entraînement ensemble » : un compteur qui ne revient jamais à zéro. */
export const daysTogether = (...records: Dated[][]) => new Set(records.flat().map((r) => r.date)).size

/** Réussites d'un boss cette semaine, pour le message informatif de fin de séance. */
export function successesThisWeek(today: ISODate, sessions: (Dated & { bossId: string; bossIds?: string[]; trials: boolean[] })[], bossId: string): number {
  const week = new Set(weekOf(today))
  return sessions.filter((s) => bossesOf(s).includes(bossId) && week.has(s.date)).reduce((sum, s) => sum + s.trials.filter(Boolean).length, 0)
}
