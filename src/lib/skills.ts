import { SKILLS, stepPhrase } from '../content/phrases'
import type { ProgressMap } from './bossProgress'
import type { ISODate } from './dates'

export interface AcquiredStep {
  bossId: string
  step: number
  phrase: string
  /** Jour où l’étape a été acquise ; absent pour une étape acquise « avant l’app ». */
  date?: ISODate
}

interface LogLike {
  id: string
  date: ISODate
  kind: string
}

/**
 * Tout ce qu’il sait déjà faire, en phrases : la plus récente en haut, puis ce qui était acquis avant l’app.
 * Une étape est datée si elle a été gagnée par la pratique (journal d’XP) et pas déclarée « avant l’app ».
 */
export function acquiredSteps(progress: ProgressMap, log: LogLike[]): AcquiredStep[] {
  const dates = new Map(log.filter((e) => e.kind === 'palier').map((e) => [e.id, e.date]))
  const out: AcquiredStep[] = []
  for (const skill of SKILLS) {
    const state = progress[skill.id]
    for (let step = 1; step <= (state?.level ?? 0); step++) {
      const preApp = state?.preApp?.includes(step) ?? false
      out.push({ bossId: skill.id, step, phrase: stepPhrase(skill.id, step), date: preApp ? undefined : dates.get(`palier-${skill.id}-${step}`) })
    }
  }
  return out.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.step - a.step)
}

/** La dernière réussite datée. */
export const lastSuccess = (progress: ProgressMap, log: LogLike[]): AcquiredStep | undefined => acquiredSteps(progress, log).find((s) => s.date)
