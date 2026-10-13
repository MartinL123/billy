import { SKILLS } from '../content/phrases'
import type { Trait } from '../content/training'
import { ageAt } from './age'
import type { ISODate } from './dates'

/** Réponse à « ce qu'il sait déjà faire » pour une compétence. */
export type SkillAnswer = 'non' | 'maison' | 'dehors' | 'nsp'

export interface Questionnaire {
  answers: Record<string, string>
  /** Le questionnaire s'est ouvert tout seul une première fois : on ne le rouvre plus d'office. */
  startedAt?: string
  completedAt?: string
}

export const SKILL_ANSWERS: { value: SkillAnswer; label: string }[] = [
  { value: 'non', label: 'Pas encore' },
  { value: 'maison', label: 'À la maison' },
  { value: 'dehors', label: 'Même dehors' },
]

/** Les écrans du questionnaire, dans l'ordre. « Ce qui lui fait peur » n'apparaît que s'il a peur facilement. */
export function questionnaireSteps(traits: Trait[]): string[] {
  return ['identite', 'caractere', ...(traits.includes('craintif') ? ['peurs'] : []), ...SKILLS.map((s) => s.id), 'souvenirs', 'fin']
}

export const isSkillStep = (step: string) => SKILLS.some((s) => s.id === step)

/** Étapes acquises « avant l'app » d'après la réponse : à la maison → 1 et 2 ; même dehors → 1 à 3. */
export function stepsForAnswer(answer: string | undefined): number {
  return answer === 'dehors' ? 3 : answer === 'maison' ? 2 : 0
}

export interface QuestionnaireStatus {
  answered: number
  total: number
  complete: boolean
  /** Premier écran sans réponse (0 si tout est répondu). */
  resumeAt: number
}

export function questionnaireStatus(questionnaire: Questionnaire | undefined, traits: Trait[]): QuestionnaireStatus {
  const steps = questionnaireSteps(traits)
  const answers = questionnaire?.answers ?? {}
  const answered = steps.filter((s) => answers[s] !== undefined).length
  const first = steps.findIndex((s) => answers[s] === undefined)
  return { answered, total: steps.length, complete: Boolean(questionnaire?.completedAt) && first === -1, resumeAt: first === -1 ? 0 : first }
}

/** « À compléter · 6 réponses sur 15 » ou « Complété · revoir mes réponses ». */
export function statusLabel(status: QuestionnaireStatus): string {
  if (status.complete) return 'Complété · revoir mes réponses'
  if (status.answered === 0) return `À compléter · ${status.total} questions`
  return `À compléter · ${status.answered} réponse${status.answered > 1 ? 's' : ''} sur ${status.total}`
}

/** « C'est un chiot » se déduit de la date de naissance (moins de 6 mois), et reste modifiable. */
export const isPuppy = (birthDate: ISODate, today: ISODate) => {
  const age = ageAt(birthDate, today)
  return age.years === 0 && age.months < 6
}
