import { MAX_DIFFICULTY } from '../content/training'
import type { ISODate } from './dates'
import type { Decision } from './xp'

/** Nombre d'essais d'une séance. */
export const TRIALS = 5

/**
 * Suggestion de fin de séance : 5/5 → Monter, 3–4/5 → Rester, ≤ 2/5 → Baisser.
 * S'il n'a pas pris ses friandises, il était au-dessus de son seuil : toujours Baisser.
 * Ce n'est qu'une suggestion : elle n'est jamais appliquée automatiquement.
 */
export function suggest(trials: boolean[], ate: boolean): Decision {
  if (!ate) return 'baisser'
  const successes = trials.filter(Boolean).length
  if (trials.length > 0 && successes === trials.length) return 'monter'
  return successes >= 3 ? 'rester' : 'baisser'
}

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

/** Dernier exercice pratiqué : présélectionné au démarrage d'une séance. */
export const lastSession = <T extends SessionLike>(sessions: T[]): T | undefined => [...sessions].sort(newestFirst)[0]

/**
 * Le critère du palier ne peut être validé que si Billy était à l'aise :
 * il a pris ses friandises et sa réaction était ≤ 1 (détendu ou attentif).
 */
export const canValidate = (ate: boolean, reaction: number | undefined) => ate && reaction !== undefined && reaction <= 1

/** Échelle de réaction 0–4. */
export const REACTIONS = [
  { value: 0, label: 'Détendu', detail: 'À l’aise' },
  { value: 1, label: 'Attentif', detail: 'Regarde, se détourne seul' },
  { value: 2, label: 'Tendu', detail: 'Se fige brièvement' },
  { value: 3, label: 'Bloqué', detail: 'Se bloque, grogne ou refuse la friandise' },
  { value: 4, label: 'Panique', detail: 'Aboie, cherche à fuir' },
]

export const reactionLabel = (value: number) => REACTIONS.find((r) => r.value === value)?.label ?? ''

export const DECISIONS: { value: Decision; label: string }[] = [
  { value: 'baisser', label: 'Baisser' },
  { value: 'rester', label: 'Rester' },
  { value: 'monter', label: 'Monter' },
]
