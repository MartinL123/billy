import { MAX_LEVEL, type Boss } from '../content/training'
import type { ISODate } from './dates'

export interface Validation {
  level: number
  date: ISODate
  placeId?: string
}

/** users/{uid}/bossProgress/{bossId} */
export interface BossProgress {
  /** Paliers acquis, de 0 à 5. Ne baisse jamais. */
  level: number
  validations: Validation[]
  /** Donnée de la V2, conservée : lieux validés après la dernière étape. Plus affichée. */
  masteryPlaces: string[]
  /** Étapes déclarées acquises « avant l'app » (questionnaire de départ, « Billy sait déjà faire ça »). */
  preApp?: number[]
}

export const EMPTY_PROGRESS: BossProgress = { level: 0, validations: [], masteryPlaces: [] }

/** Validations demandées pour acquérir un palier : 3 fois, sur 3 jours différents. */
export const VALIDATIONS_NEEDED = 3

const distinct = <T>(values: T[]) => [...new Set(values)]

export interface Remaining {
  /** Palier visé (1 à 5), ou `undefined` en maîtrise. */
  target?: number
  done: number
  needed: number
}

/** Où en est la validation de l'étape visée : « encore 1 fois, un autre jour ». */
export function remaining(progress: BossProgress): Remaining {
  if (progress.level >= MAX_LEVEL) return { done: 0, needed: 0 }
  const target = progress.level + 1
  const days = distinct(progress.validations.filter((v) => v.level === target).map((v) => v.date)).length
  return { target, done: Math.min(days, VALIDATIONS_NEEDED), needed: VALIDATIONS_NEEDED }
}

export interface ValidationResult {
  progress: BossProgress
  /** Une validation a été ajoutée (une seule par jour compte). */
  validated: boolean
  /** Étape acquise par cette validation. */
  levelGained?: number
}

/**
 * Ajoute un « c'est réussi » pour l'étape visée. Une étape s'acquiert après 3 réussites sur 3 jours différents,
 * la cinquième comme les autres. Une étape acquise l'est pour toujours.
 */
export function addValidation(progress: BossProgress, date: ISODate): ValidationResult {
  if (progress.level >= MAX_LEVEL) return { progress, validated: false }
  const target = progress.level + 1
  if (progress.validations.some((v) => v.level === target && v.date === date)) return { progress, validated: false }
  const next: BossProgress = { ...progress, validations: [...progress.validations, { level: target, date }] }
  if (remaining(next).done >= VALIDATIONS_NEEDED) return { progress: { ...next, level: target }, validated: true, levelGained: target }
  return { progress: next, validated: true }
}

/**
 * « Billy sait déjà faire ça » : acquiert directement les étapes jusqu'à `level`, marquées « avant l'app ».
 * Ne fait jamais baisser. Renvoie aussi les étapes nouvellement acquises.
 */
export function markPreApp(progress: BossProgress, level: number): { progress: BossProgress; gained: number[] } {
  const target = Math.max(progress.level, Math.min(MAX_LEVEL, level))
  const gained = Array.from({ length: target - progress.level }, (_, i) => progress.level + 1 + i)
  if (gained.length === 0) return { progress, gained }
  return { progress: { ...progress, level: target, preApp: [...new Set([...(progress.preApp ?? []), ...gained])].sort() }, gained }
}

export type ProgressMap = Record<string, BossProgress | undefined>

export const levelOf = (map: ProgressMap, bossId: string) => map[bossId]?.level ?? 0
export const levelsAcquired = (map: ProgressMap) => Object.values(map).reduce((sum, p) => sum + (p?.level ?? 0), 0)
export const starsEarned = (map: ProgressMap) => Object.values(map).reduce((sum, p) => sum + (p?.masteryPlaces.length ?? 0), 0)

export interface Advice {
  level: number
  /** Liens conseillés pas encore atteints. Jamais bloquants. */
  missing: { bossId: string; level: number }[]
}

/** Conseil doux pour le palier visé : ce qui le rendrait plus facile. Jamais un verrou. */
export function softAdvice(boss: Boss, map: ProgressMap): Advice | undefined {
  const target = levelOf(map, boss.id) + 1
  const missing = boss.recommends
    .filter((r) => r.level === target)
    .flatMap((r) => r.requires)
    .filter((req) => levelOf(map, req.bossId) < req.level)
  return missing.length ? { level: target, missing } : undefined
}

/** Un lien de l'arbre s'allume quand son prérequis conseillé est atteint. */
export const linkLit = (map: ProgressMap, requirement: { bossId: string; level: number }) => levelOf(map, requirement.bossId) >= requirement.level
