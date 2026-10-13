import { exerciseById } from '../content/training'
import type { ISODate } from './dates'
import { feelingOfReaction, type Feeling } from './moment'

interface LegacySession {
  id: string
  date: ISODate
  createdAt?: string
  exerciseId: string
  bossId: string
  bossIds?: string[]
  reaction?: number
}

interface LegacyExposure {
  id: string
  date: ISODate
  createdAt?: string
  bossId: string
  trigger: string
  reaction: number
  retreat: boolean
}

export interface LegacyMoment {
  id: string
  date: ISODate
  createdAt?: string
  text: string
  skills: string[]
  feeling?: Feeling
  fear?: boolean
  movedAway?: boolean
}

/** Une ancienne séance devient un moment du Carnet, en lecture seule. */
export function sessionAsMoment(session: LegacySession): LegacyMoment {
  return {
    id: `seance-${session.id}`,
    date: session.date,
    createdAt: session.createdAt,
    text: `Exercice : ${exerciseById(session.exerciseId)?.name ?? 'séance'}.`,
    skills: session.bossIds ?? [session.bossId],
    feeling: feelingOfReaction(session.reaction),
  }
}

/** Une ancienne « exposition » devient « une situation qui lui fait peur ». */
export function exposureAsMoment(exposure: LegacyExposure): LegacyMoment {
  return {
    id: `situation-${exposure.id}`,
    date: exposure.date,
    createdAt: exposure.createdAt,
    text: `Une situation qui lui fait peur : ${exposure.trigger}.`,
    skills: [exposure.bossId],
    feeling: feelingOfReaction(exposure.reaction),
    fear: true,
    movedAway: exposure.retreat,
  }
}

/** Le Carnet est la seule liste : les plus récents d'abord. */
export const byRecency = <T extends { date: ISODate; createdAt?: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
