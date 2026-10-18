import { bossById, STATS, type Stat } from '../content/training'
import type { ISODate } from './dates'

// Règles d’XP du § 3 de docs/specs/spec-v2-dressage.md. L’XP ne baisse jamais : chaque gain est une ligne
// ajoutée au journal d’XP, et tout le reste (total, niveau, stats, radar) se calcule à partir de ce journal.

export const XP = {
  /** Séance enregistrée, quel que soit le résultat. */
  session: 10,
  /** Par essai réussi… */
  trial: 1,
  /** …plafonné, pour ne pas pousser au volume. */
  trialMax: 5,
  /** Suggestion « Baisser » ou « Rester » acceptée : « Bonne lecture du seuil ». */
  goodRead: 3,
  /** Exposition enregistrée, voulue ou subie. */
  exposure: 5,
  /** Exposition avec réaction ≤ 1. */
  calmExposure: 3,
  /** Retraite stratégique : demi-tour ou distance augmentée. */
  retreat: 8,
  /** Jour de repos ou balade reniflage déclaré… */
  rest: 5,
  /** …compté au plus 3 fois par semaine. */
  restPerWeek: 3,
  /** Validation d’un critère de palier. */
  validation: 10,
  /** Palier acquis. */
  level: 50,
  /** Étoile de maîtrise : nouveau lieu après P5. */
  star: 30,
  /** Première fois (succès daté). */
  first: 25,
  /** Quête hebdomadaire terminée. */
  quest: 15,
}

export type Decision = 'monter' | 'rester' | 'baisser'

export function sessionXp(trials: boolean[], suggestion: Decision, decision: Decision): number {
  const successes = Math.min(XP.trialMax, trials.filter(Boolean).length) * XP.trial
  const goodRead = decision === suggestion && decision !== 'monter' ? XP.goodRead : 0
  return XP.session + successes + goodRead
}

/** La distance ne compte jamais : l’app ne récompense pas le fait de se rapprocher. */
export function exposureXp(reaction: number, retreat: boolean): number {
  return XP.exposure + (reaction <= 1 ? XP.calmExposure : 0) + (retreat ? XP.retreat : 0)
}

// ——— Journal d’XP ———

export interface XpLike {
  date: ISODate
  xp: number
  bossId?: string
  bossIds?: string[]
  kind: string
}

/** Les boss concernés par un enregistrement : un exercice peut en nourrir plusieurs. */
export const bossesOf = (record: { bossId?: string; bossIds?: string[] }): string[] => record.bossIds ?? (record.bossId ? [record.bossId] : [])

export const totalXp = (log: XpLike[]) => log.reduce((sum, entry) => sum + Math.max(0, entry.xp), 0)

/** XP cumulée par stat. Avec `upTo`, l’état à cette date (pour l’aire d’il y a 30 jours du radar). */
export function xpByStat(log: XpLike[], upTo?: ISODate): Record<Stat, number> {
  const out = Object.fromEntries(STATS.map((s) => [s.id, 0])) as Record<Stat, number>
  for (const entry of log) {
    if (upTo && entry.date > upTo) continue
    // Le repos nourrit le Calme ; le reste suit les stats du boss concerné.
    const stats: Stat[] = entry.kind === 'repos' ? ['calme'] : [...new Set(bossesOf(entry).flatMap((id) => bossById(id)?.stats ?? []))]
    for (const stat of stats) out[stat] += Math.max(0, entry.xp)
  }
  return out
}

export function xpByBoss(log: XpLike[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const entry of log) for (const id of bossesOf(entry)) out[id] = (out[id] ?? 0) + Math.max(0, entry.xp)
  return out
}

/** XP d’un jour de repos ou d’une balade reniflage : +5, au plus 3 fois par semaine (les suivants sont notés, sans XP). */
export function restXp(log: XpLike[], week: ISODate[]): number {
  const already = log.filter((e) => e.kind === 'repos' && week.includes(e.date) && e.xp > 0).length
  return already < XP.restPerWeek ? XP.rest : 0
}

// ——— Niveau global : l’effort fourni ———

/**
 * XP cumulée demandée pour atteindre le niveau L. On commence au niveau 1 :
 * 50 XP pour le niveau 2, 300 pour le 4, 2 750 pour le 11. Pas de niveau max.
 */
export const xpForLevel = (level: number) => 25 * (level - 1) * level

export interface GlobalLevel {
  level: number
  /** XP acquise dans le niveau en cours. */
  current: number
  /** XP à gagner pour passer au niveau suivant. */
  needed: number
}

export function globalLevel(xp: number): GlobalLevel {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  return { level, current: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) }
}

// ——— Rang : les objectifs atteints ———

const RANKS: [number, string][] = [
  [45, 'Légende'],
  [35, 'Complice'],
  [25, 'Citadin'],
  [15, 'Compagnon'],
  [5, 'Apprenti'],
  [0, 'Chiot curieux'],
]

/** Rang selon les paliers acquis (50 au total), puis les étoiles de maîtrise, sans fin. */
export function rank(levelsAcquired: number, stars: number): string {
  const name = RANKS.find(([min]) => levelsAcquired >= min)?.[1] ?? 'Chiot curieux'
  return name === 'Légende' && stars > 0 ? `Légende ★ ${stars}` : name
}
