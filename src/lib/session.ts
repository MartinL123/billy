import { MAX_DIFFICULTY } from '../content/training'
import type { ISODate } from './dates'
import type { Decision } from './xp'

/** Le niveau de difficulté N1–N5 est un réglage : il monte ou descend selon la décision de Martin. */
export function applyDecision(difficulty: number, decision: Decision): number {
  const next = difficulty + (decision === 'monter' ? 1 : decision === 'baisser' ? -1 : 0)
  return Math.max(1, Math.min(MAX_DIFFICULTY, next))
}

interface SessionLike {
  date: ISODate
  exerciseId: string
  difficulty: number
  decision: Decision
  createdAt?: string
}

const newestFirst = <T extends { date: ISODate; createdAt?: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** Difficulté à proposer pour un exercice : celle de la dernière séance, ajustée par la décision prise alors. */
export function currentDifficulty(sessions: SessionLike[], exerciseId: string): number {
  const last = sessions.filter((s) => s.exerciseId === exerciseId).sort(newestFirst)[0]
  return last ? applyDecision(last.difficulty, last.decision) : 1
}
