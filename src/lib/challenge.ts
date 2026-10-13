import { bossById, type Trait } from '../content/training'
import { dayNumber, type ISODate } from './dates'
import { weekOf } from './rhythm'
import { suggestedBosses } from './traits'

/** Le défi de la semaine : un seul, sur une compétence, compté d'après ce que l'utilisateur choisit lui-même. */
export interface Challenge {
  bossId: string
  label: string
  target: number
}

export const CHALLENGE_TARGET = 3

/** Le même sur tous les appareils ; il tourne chaque semaine entre les compétences conseillées pour le chien. */
export function weekChallenge(week: ISODate, traits: Trait[]): Challenge {
  const candidates = suggestedBosses(traits).slice(0, 4)
  const bossId = candidates[((Math.floor(dayNumber(week) / 7) % candidates.length) + candidates.length) % candidates.length]!
  return { bossId, label: `Raconter ${CHALLENGE_TARGET} moments pour ${bossById(bossId)?.name}`, target: CHALLENGE_TARGET }
}

interface Dated {
  date: ISODate
}

/** Moments de la semaine où la compétence a été choisie, plus les exercices faits pour elle. Plafonné à la cible. */
export function challengeProgress(challenge: Challenge, today: ISODate, moments: (Dated & { skills?: string[] })[], sessions: (Dated & { bossId: string; bossIds?: string[] })[]): number {
  const week = new Set(weekOf(today))
  const told = moments.filter((m) => week.has(m.date) && m.skills?.includes(challenge.bossId)).length
  const practiced = sessions.filter((s) => week.has(s.date) && (s.bossIds ?? [s.bossId]).includes(challenge.bossId)).length
  return Math.min(challenge.target, told + practiced)
}
