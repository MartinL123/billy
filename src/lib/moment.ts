import { SKILLS } from '../content/phrases'
import { MAX_LEVEL } from '../content/training'
import { addValidation, EMPTY_PROGRESS, type ProgressMap } from './bossProgress'
import type { ISODate } from './dates'

/** Comment ça s'est passé : trois visages. */
export type Feeling = 'difficile' | 'bien' | 'super'

export const FEELINGS: { value: Feeling; label: string }[] = [
  { value: 'difficile', label: 'Difficile' },
  { value: 'bien', label: 'Bien' },
  { value: 'super', label: 'Super' },
]

export const feelingLabel = (feeling: string | undefined) => FEELINGS.find((f) => f.value === feeling)?.label

/** XP d'un moment raconté (docs/specs/spec-v3-simplification.md § 2). Les photos ne rapportent rien. */
export const MOMENT_XP = {
  /** Raconter un moment, du jour ou passé. */
  moment: 10,
  /** Ressenti « Super ». */
  great: 5,
  /** Une situation qui lui fait peur, quel que soit le ressenti. */
  fear: 5,
  /** « On s'est éloignés » : la bonne réaction. */
  movedAway: 8,
  /** « Oui, c'est réussi » à la prochaine étape d'une compétence. */
  yes: 10,
  /** Nouvelle étape acquise. */
  step: 50,
  /** Défi de la semaine réussi. */
  challenge: 20,
}

export interface MomentInput {
  feeling?: Feeling
  fear: boolean
  movedAway: boolean
}

export function momentBaseXp({ feeling, fear, movedAway }: MomentInput): number {
  return MOMENT_XP.moment + (feeling === 'super' ? MOMENT_XP.great : 0) + (fear ? MOMENT_XP.fear : 0) + (fear && movedAway ? MOMENT_XP.movedAway : 0)
}

/**
 * On ne demande « c'est réussi ? » que si le moment s'est bien passé : pas un jour difficile, pas un jour où il a eu
 * peur. L'app ne récompense jamais le fait d'avoir poussé le chien.
 */
export const canAskStep = ({ feeling, fear }: MomentInput) => feeling !== 'difficile' && !fear

export interface MomentPreview {
  xp: number
  /** Compétences dont le « oui » compte ce jour-là. */
  validated: string[]
  /** Étapes acquises grâce à ce moment. */
  steps: { bossId: string; level: number }[]
}

/** Gain d'un moment avant de l'enregistrer, mis à jour en direct sur le bouton. */
export function previewMoment(input: MomentInput, yes: string[], progress: ProgressMap, date: ISODate): MomentPreview {
  let xp = momentBaseXp(input)
  const validated: string[] = []
  const steps: { bossId: string; level: number }[] = []
  if (canAskStep(input)) {
    for (const bossId of yes) {
      const result = addValidation(progress[bossId] ?? EMPTY_PROGRESS, date)
      if (!result.validated) continue
      validated.push(bossId)
      xp += MOMENT_XP.yes
      if (result.levelGained) {
        steps.push({ bossId, level: result.levelGained })
        xp += MOMENT_XP.step
      }
    }
  }
  return { xp, validated, steps }
}

/** Une compétence a encore une étape à travailler. */
export const hasNextStep = (progress: ProgressMap, bossId: string) => (progress[bossId]?.level ?? 0) < MAX_LEVEL

interface Usage {
  date: ISODate
  createdAt?: string
  skills: string[]
}

/**
 * Ordre des 10 tuiles : les 3 compétences utilisées le plus récemment d'abord, puis les autres des bases vers le monde.
 * Aucune n'est jamais présélectionnée.
 */
export function tileOrder(usages: Usage[]): string[] {
  const recent: string[] = []
  const sorted = [...usages].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  for (const usage of sorted) {
    for (const skill of usage.skills) if (!recent.includes(skill) && recent.length < 3) recent.push(skill)
    if (recent.length >= 3) break
  }
  return [...recent, ...SKILLS.map((s) => s.id).filter((id) => !recent.includes(id))]
}

/** Anciennes données (réaction 0–4) lues comme un ressenti : 0 super, 1 bien, 2 à 4 difficile. */
export const feelingOfReaction = (reaction: number | undefined): Feeling | undefined =>
  reaction === undefined ? undefined : reaction <= 0 ? 'super' : reaction === 1 ? 'bien' : 'difficile'
