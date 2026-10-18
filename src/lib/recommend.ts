import type { Exercise, Trait } from '../content/training'
import type { ISODate } from './dates'
import { currentDifficulty } from './session'
import { exercisesFor, featuredBosses, suggestedBosses } from './traits'
import type { Decision } from './xp'

interface SessionLike {
  date: ISODate
  exerciseId: string
  bossId: string
  difficulty: number
  decision: Decision
  createdAt?: string
}

export interface SessionAdvice {
  exercise: Exercise
  bossId: string
  /** Niveau de difficulté N1–N5 à proposer. */
  difficulty: number
}

const newestFirst = (a: SessionLike, b: SessionLike) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/**
 * Séance conseillée : on tourne entre les boss conseillés pour le chien (celui qui suit le boss de la dernière
 * séance), puis on prend, pour ce boss, l’exercice pratiqué il y a le plus longtemps, les jamais pratiqués d’abord.
 */
export function recommendSession(traits: Trait[], sessions: SessionLike[]): SessionAdvice | undefined {
  const featured = featuredBosses(traits)
  const bosses = featured.length ? featured : suggestedBosses(traits).slice(0, 3)
  const sorted = [...sessions].sort(newestFirst)
  const lastBoss = sorted[0]?.bossId
  const bossId = bosses[(bosses.indexOf(lastBoss ?? '') + 1) % bosses.length]
  if (!bossId) return undefined

  const lastPractice = (exerciseId: string) => sorted.find((s) => s.exerciseId === exerciseId)?.date ?? ''
  const exercise = [...exercisesFor(bossId, traits)].sort((a, b) => lastPractice(a.id).localeCompare(lastPractice(b.id)))[0]
  if (!exercise) return undefined
  return { exercise, bossId, difficulty: currentDifficulty(sessions, exercise.id) }
}

export const sessionLink = (advice: SessionAdvice) => `/seance?boss=${advice.bossId}&exercice=${advice.exercise.id}`
