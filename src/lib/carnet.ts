import { stepPhrase } from '../content/phrases'
import { BOSSES, exerciseById } from '../content/training'
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

const OLD_CARD = /^Palier acquis : (.+), P([1-5]) «/

/** Les « premières fois » de la V2, avec les mots d'aujourd'hui. */
const OLD_FIRSTS: [string, string][] = [
  ['Première séance', 'Premier exercice'],
  ['Première exposition notée', 'Première situation qui lui fait peur racontée'],
  ['Première retraite stratégique', 'Première fois où on s’est éloignés pour qu’il se sente mieux'],
  ['Premier palier acquis', 'Première étape acquise'],
  ['Premier palier « Dehors au calme »', 'Première étape acquise dehors, au calme'],
  ['Première étoile de maîtrise', 'Première compétence réussie dans un nouveau lieu'],
  ['Un déclencheur croisé en restant détendu', 'Il a croisé ce qui lui fait peur en restant détendu'],
  ['Trois boss travaillés', 'Trois compétences travaillées'],
]

/**
 * Les cartes de réussite écrites avant la V3 parlaient de « palier » : on les affiche avec les mots d'aujourd'hui.
 * Rien n'est modifié dans les données.
 */
export function modernCard<T extends { text: string; tags: string[] }>(entry: T): T {
  if (!entry.tags.includes('Dressage')) return entry
  const tags = entry.tags.map((t) => (t === 'Dressage' ? 'Réussite' : t))
  const old = OLD_CARD.exec(entry.text)
  const boss = old && BOSSES.find((b) => b.name === old[1])
  if (old && boss) return { ...entry, text: `C'est réussi ! ${stepPhrase(boss.id, Number(old[2]))}.`, tags }
  const text = OLD_FIRSTS.reduce((t, [before, now]) => t.replace(before, now), entry.text)
  return { ...entry, text, tags }
}
