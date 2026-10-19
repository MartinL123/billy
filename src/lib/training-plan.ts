import { exerciseById, MAX_LEVEL, stepExercises, type Exercise } from '../content/training'
import { ageAt } from './age'
import { addMonths, isValidISO, type ISODate } from './dates'

/** Âge à partir duquel les séances passent de 3 à 5 minutes. */
export const LONG_SESSIONS_FROM_MONTHS = 6
export const SHORT_SESSION_MINUTES = 3
export const LONG_SESSION_MINUTES = 5

/** Durée d’une séance : 3 minutes avant 6 mois (depuis la date de naissance), 5 minutes ensuite. */
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
 * Les exercices de l’étape en cours d’une compétence, au bon réglage.
 * `acquired` = nombre d’étapes acquises ; une compétence maîtrisée se révise avec sa dernière étape.
 */
export function exercisesForStep(bossId: string, acquired: number): PlannedExercise[] {
  return stepExercises(bossId, Math.min(MAX_LEVEL, acquired + 1)).flatMap(({ id, level }) => {
    const exercise = exerciseById(id)
    return exercise ? [{ exercise, level, setting: exercise.levels[level - 1] ?? '' }] : []
  })
}

/** L’exercice du moment d’une compétence : le premier de son étape en cours. */
export const currentExercise = (bossId: string, acquired: number): PlannedExercise | undefined => exercisesForStep(bossId, acquired)[0]

/** Réponses qui ne nomment aucune friandise : un mot générique, ou l’exemple du champ. */
const NO_TREAT = /^(treats?|friandises?|des friandises|croquettes?|oui|non|aucune?|rien|\?+|-+|fromage, poulet séché…?)$/i

/** « Ce qu’il faut » : le nom des friandises seulement s’il est vraiment renseigné dans le profil. */
export function neededTreats(treats: string | undefined): string {
  // Le même nom que dans le profil (mots anglais traduits) ; une réponse bidon (« test ») n’est jamais affichée (R-053).
  const name = treatsLabel(treats)
  return name && name !== 'Les friandises' ? `Ses friandises préférées (${name})` : 'Ses friandises préférées'
}

/** Une réponse bidon, tapée pour essayer (« test », « xxx », « ? ») : comme si rien n’était renseigné (R-053). */
const PLACEHOLDER = /^(test|tests|essai|xx+|a+|\?+|-+|\.+)$/i

// Mots anglais qui arrivent parfois dans le questionnaire (clavier ou correction automatique en anglais).
const ENGLISH: Record<string, string> = { treat: 'friandises', treats: 'friandises', cheese: 'fromage', chicken: 'poulet', beef: 'bœuf', fish: 'poisson', ham: 'jambon', carrot: 'carotte', carrots: 'carottes', apple: 'pomme', kibble: 'croquettes', biscuit: 'biscuits', biscuits: 'biscuits' }

/** « Il adore » dans le profil : la réponse en français ; un mot générique devient « les friandises ». */
export function treatsLabel(treats: string | undefined): string | undefined {
  const name = (treats ?? '').trim().replace(/\.$/, '')
  if (!name || PLACEHOLDER.test(name)) return undefined
  const french = name.replace(/[A-Za-z]+/g, (word) => ENGLISH[word.toLowerCase()] ?? word)
  const text = NO_TREAT.test(name) || NO_TREAT.test(french) ? 'les friandises' : french
  return text.replace(/^./, (c) => c.toLocaleUpperCase('fr'))
}

/** « Ses jeux » : sans « Autre » seul (il ne dit rien) ; en minuscules, séparés par des virgules. */
export function gamesLabel(games: string[] | undefined): string | undefined {
  const named = (games ?? []).filter((g) => g.trim() && g.trim().toLocaleLowerCase('fr') !== 'autre')
  if (named.length === 0) return undefined
  const more = named.length < (games ?? []).length ? ' et d’autres' : ''
  return named.join(', ').toLocaleLowerCase('fr').replace(/^./, (c) => c.toLocaleUpperCase('fr')) + more
}
