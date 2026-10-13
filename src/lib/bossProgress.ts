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
  /** Lieux validés après P5 : une étoile de maîtrise chacun. */
  masteryPlaces: string[]
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
  /** P5 : il faut aussi 3 lieux différents. */
  placesDone?: number
}

/** Où en est la validation du palier visé : « 2/3, il en reste 1 ». */
export function remaining(progress: BossProgress): Remaining {
  if (progress.level >= MAX_LEVEL) return { done: 0, needed: 0 }
  const target = progress.level + 1
  const own = progress.validations.filter((v) => v.level === target)
  const days = distinct(own.map((v) => v.date)).length
  if (target < MAX_LEVEL) return { target, done: Math.min(days, VALIDATIONS_NEEDED), needed: VALIDATIONS_NEEDED }
  const places = distinct(own.map((v) => v.placeId).filter(Boolean)).length
  return { target, done: Math.min(days, places, VALIDATIONS_NEEDED), needed: VALIDATIONS_NEEDED, placesDone: Math.min(places, VALIDATIONS_NEEDED) }
}

/** Le palier visé demande un lieu : P5 (3 lieux différents) et la maîtrise (un nouveau lieu = une étoile). */
export const needsPlace = (progress: BossProgress) => progress.level >= MAX_LEVEL - 1

export interface ValidationResult {
  progress: BossProgress
  /** Une validation a été ajoutée (une seule par jour compte). */
  validated: boolean
  /** Palier acquis par cette validation. */
  levelGained?: number
  /** Lieu qui vient d'apporter une étoile de maîtrise. */
  starPlaceId?: string
}

/**
 * Ajoute une validation du critère du palier visé. Un palier s'acquiert après 3 validations sur 3 jours
 * différents (et dans 3 lieux différents pour P5). Un palier acquis l'est pour toujours.
 */
export function addValidation(progress: BossProgress, date: ISODate, placeId?: string): ValidationResult {
  if (progress.level >= MAX_LEVEL) {
    // Maîtrise : chaque nouveau lieu ajoute une étoile, sans plafond.
    const known = [...progress.validations.filter((v) => v.level === MAX_LEVEL).map((v) => v.placeId), ...progress.masteryPlaces]
    if (!placeId || known.includes(placeId)) return { progress, validated: false }
    return { progress: { ...progress, masteryPlaces: [...progress.masteryPlaces, placeId] }, validated: true, starPlaceId: placeId }
  }
  const target = progress.level + 1
  if (progress.validations.some((v) => v.level === target && v.date === date)) return { progress, validated: false }
  const next: BossProgress = { ...progress, validations: [...progress.validations, { level: target, date, ...(placeId ? { placeId } : {}) }] }
  if (remaining(next).done >= VALIDATIONS_NEEDED) return { progress: { ...next, level: target }, validated: true, levelGained: target }
  return { progress: next, validated: true }
}

/** « Déjà maîtrisé » : acquiert directement un palier, sans XP. Ne fait jamais baisser. */
export function validateDirectly(progress: BossProgress, level: number): BossProgress {
  return { ...progress, level: Math.max(progress.level, Math.min(MAX_LEVEL, level)) }
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
