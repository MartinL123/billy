import { SKILLS, stepPhraseLower } from '../content/phrases'
import { bossById } from '../content/training'
import type { ProgressMap } from './bossProgress'
import { addDays, parseISO, type ISODate } from './dates'
import type { Feeling } from './moment'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « fin septembre », « début octobre », « mi-octobre ». */
export function periodLabel(date: ISODate): string {
  const { m, d } = parseISO(date)
  const month = MONTHS[m - 1]!
  if (d <= 10) return `début ${month}`
  if (d <= 20) return `mi-${month}`
  return `fin ${month}`
}

const RANK: Record<Feeling, number> = { difficile: 0, bien: 1, super: 2 }
const BEFORE_WORDS = ['souvent difficile', 'plutôt bien', 'super']

/** Ressenti dominant d’une série de moments : le plus fréquent ; à égalité, celui du milieu. */
export function dominantFeeling(feelings: Feeling[]): Feeling {
  const count = (f: Feeling) => feelings.filter((x) => x === f).length
  const sorted = [...feelings].sort((a, b) => count(b) - count(a) || Math.abs(RANK[a] - 1) - Math.abs(RANK[b] - 1))
  return sorted[0] ?? 'bien'
}

export interface StoryMoment {
  date: ISODate
  skills?: string[]
  feeling?: Feeling
}

interface LogLike {
  id: string
  date: ISODate
  kind: string
}

export interface Comparison {
  bossId: string
  name: string
  /** « fin septembre » */
  since: string
  before: string
  now: string
  /** Vrai s’il y a un progrès, faux si c’est stable. */
  better: boolean
}

/** Il faut au moins 4 moments avec un ressenti pour comparer les premiers aux derniers. */
export const MIN_MOMENTS = 4
export const MAX_COMPARISONS = 3
const WINDOW_DAYS = 30

/**
 * « Ses progrès en un mois » : pour chaque compétence, l’étape acquise il y a un mois contre celle d’aujourd’hui,
 * sinon le ressenti dominant des premiers moments contre celui des derniers.
 * On ne montre que ce qui progresse ou reste stable : jamais de « moins bien ».
 */
export function progressStory(moments: StoryMoment[], progress: ProgressMap, log: LogLike[], today: ISODate): Comparison[] {
  const start = addDays(today, -WINDOW_DAYS)
  const out: Comparison[] = []
  for (const skill of SKILLS) {
    const name = bossById(skill.id)?.name ?? skill.id
    const state = progress[skill.id]
    const level = state?.level ?? 0
    // Étapes gagnées par la pratique depuis un mois (celles d'« avant l’app » comptent comme déjà là).
    const recent = log.filter((e) => e.kind === 'palier' && e.id.startsWith(`palier-${skill.id}-`) && e.date > start && !(state?.preApp ?? []).includes(Number(e.id.split('-').pop())))
    const levelBefore = Math.max(0, level - recent.length)
    if (level > levelBefore) {
      out.push({ bossId: skill.id, name, since: periodLabel(start), before: levelBefore ? stepPhraseLower(skill.id, levelBefore) : 'pas encore', now: stepPhraseLower(skill.id, level), better: true })
      continue
    }
    const felt = moments.filter((m) => m.feeling && m.skills?.includes(skill.id)).sort((a, b) => a.date.localeCompare(b.date))
    if (felt.length < MIN_MOMENTS) continue
    const size = Math.min(3, Math.floor(felt.length / 2))
    const first = dominantFeeling(felt.slice(0, size).map((m) => m.feeling!))
    const last = dominantFeeling(felt.slice(-size).map((m) => m.feeling!))
    if (RANK[last] < RANK[first]) continue
    out.push({ bossId: skill.id, name, since: periodLabel(felt[0]!.date), before: BEFORE_WORDS[RANK[first]]!, now: BEFORE_WORDS[RANK[last]]!, better: RANK[last] > RANK[first] })
  }
  return out.sort((a, b) => Number(b.better) - Number(a.better)).slice(0, MAX_COMPARISONS)
}

/** « On travaille en ce moment » : les compétences racontées le plus récemment, complétées par les conseillées. 3 au plus. */
export function workingOn(moments: StoryMoment[], suggested: string[], progress: ProgressMap, maxLevel: number): string[] {
  const open = (id: string) => (progress[id]?.level ?? 0) < maxLevel
  const recent = [...moments].sort((a, b) => b.date.localeCompare(a.date)).flatMap((m) => m.skills ?? [])
  return [...new Set([...recent, ...suggested])].filter(open).slice(0, 3)
}
