import { exerciseById, MAX_LEVEL, stepExercises, type Exercise } from '../content/training'
import { ageAt } from './age'
import { addMonths, isValidISO, type ISODate } from './dates'

/** Âge à partir duquel les séances passent de 3 à 5 minutes. */
export const LONG_SESSIONS_FROM_MONTHS = 6
export const SHORT_SESSION_MINUTES = 3
export const LONG_SESSION_MINUTES = 5

/** Durée d'une séance : 3 minutes avant 6 mois (depuis la date de naissance), 5 minutes ensuite. */
export function sessionMinutes(birthDate: ISODate, today: ISODate): number {
  // Sans date de naissance, on ne suppose pas un chiot.
  if (!isValidISO(birthDate)) return LONG_SESSION_MINUTES
  const age = ageAt(birthDate, today)
  return age.years === 0 && age.months < LONG_SESSIONS_FROM_MONTHS ? SHORT_SESSION_MINUTES : LONG_SESSION_MINUTES
}

/** Le jour où les séances passent à 5 minutes. */
export const longSessionsDate = (birthDate: ISODate): ISODate => addMonths(birthDate, LONG_SESSIONS_FROM_MONTHS)

export interface PlannedExercise {
  exercise: Exercise
  /** Réglage de 1 à 5. */
  level: number
  /** Le réglage en mots : « Salon, à 1 m ». */
  setting: string
}

/**
 * Les exercices de l'étape en cours d'une compétence, au bon réglage.
 * `acquired` = nombre d'étapes acquises ; une compétence maîtrisée se révise avec sa dernière étape.
 */
export function exercisesForStep(bossId: string, acquired: number): PlannedExercise[] {
  return stepExercises(bossId, Math.min(MAX_LEVEL, acquired + 1)).flatMap(({ id, level }) => {
    const exercise = exerciseById(id)
    return exercise ? [{ exercise, level, setting: exercise.levels[level - 1] ?? '' }] : []
  })
}

/** L'exercice du moment d'une compétence : le premier de son étape en cours. */
export const currentExercise = (bossId: string, acquired: number): PlannedExercise | undefined => exercisesForStep(bossId, acquired)[0]

/** Réponses qui ne nomment aucune friandise : un mot générique, ou l'exemple du champ. */
const NO_TREAT = /^(treats?|friandises?|des friandises|croquettes?|oui|non|aucune?|rien|\?+|-+|fromage, poulet séché…?)$/i

/** « Ce qu'il faut » : le nom des friandises seulement s'il est vraiment renseigné dans le profil. */
export function neededTreats(treats: string | undefined): string {
  const name = (treats ?? '').trim().replace(/\.$/, '')
  return name && !NO_TREAT.test(name) ? `Ses friandises préférées (${name})` : 'Ses friandises préférées'
}
