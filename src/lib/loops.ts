import { ageAt } from './age'
import { distanceMeters } from './community'
import type { ISODate } from './dates'
import { revealedCells } from './fog'
import type { RoutePoint } from './route'
import { WALK_M_PER_MIN } from './spots'
import { walkSeconds } from './walkSheet'
import type { WalkItem } from './walkList'

// « Boucles pour Billy », version simple (spec V6 § 8.2, T-089) : ses propres balades passées qui partent tout près,
// une par durée (≈ 15, 30, 45 min), la mieux placée étant celle qui a le plus de brouillard autour de son tracé.
// Rien n’est calculé par un service : seulement les balades déjà faites. Fonctions pures, testées.

/** Une boucle part à moins de 300 m d’ici. */
export const LOOP_START_M = 300
/** Le brouillard compté : les cases encore cachées à moins de 100 m du tracé. */
export const LOOP_FOG_M = 100
/** Les durées proposées (minutes). */
export const LOOP_DURATIONS = [15, 30, 45] as const
export type LoopDuration = (typeof LOOP_DURATIONS)[number]
/** Au plus 3 boucles. */
export const LOOPS_MAX = 3

export type LoopLevel = 'Facile · chiot' | 'Moyen' | 'Long'

export interface Loop {
  item: WalkItem
  duration: LoopDuration
  minutes: number
  level: LoopLevel
  /** Cases de brouillard à moins de 100 m du tracé. */
  fog: number
}

/** La durée d’une balade en minutes : notée, sinon ses heures, sinon sa distance à 4,5 km/h. */
export function walkMinutes(route: WalkItem['route']): number {
  if (route.durationMin) return route.durationMin
  const seconds = walkSeconds(route)
  return seconds ? Math.round(seconds / 60) : Math.round(route.distanceM / WALK_M_PER_MIN)
}

/** Le groupe de durée le plus proche : ≈ 15 (jusqu’à 22 min), ≈ 30 (jusqu’à 37), ≈ 45 au-delà. */
export const durationGroup = (minutes: number): LoopDuration => (minutes <= 22 ? 15 : minutes <= 37 ? 30 : 45)

/** « Facile · chiot » sous 1 km ou pour un chien de moins de 6 mois ; « Moyen » de 1 à 3 km ; « Long » au-delà. */
export function loopLevel(distanceM: number, birthDate: ISODate | undefined, today: ISODate): LoopLevel {
  const age = birthDate ? ageAt(birthDate, today) : undefined
  const puppy = Boolean(age && age.years === 0 && age.months < 6)
  if (distanceM < 1000 || puppy) return 'Facile · chiot'
  return distanceM <= 3000 ? 'Moyen' : 'Long'
}

/** Les cases encore dans le brouillard à moins de 100 m du tracé. */
export function fogAround(points: RoutePoint[], known: Set<string>): number {
  let n = 0
  for (const cell of revealedCells(points.map(([lat, lng]) => ({ lat, lng })), LOOP_FOG_M)) if (!known.has(cell)) n++
  return n
}

/**
 * Les boucles à proposer : les balades qui partent à moins de 300 m, une par groupe de durée (dans l’ordre 15, 30,
 * 45 min), la meilleure étant celle qui a le plus de brouillard autour d’elle (à égalité, la plus récente).
 */
export function pickLoops(walks: WalkItem[], here: { lat: number; lng: number }, known: Set<string>, dog: { birthDate?: ISODate; today: ISODate }): Loop[] {
  const near = walks.filter((w) => {
    const first = w.route.points[0]
    return first && distanceMeters(here, { lat: first[0], lng: first[1] }) <= LOOP_START_M
  })
  const best = new Map<LoopDuration, Loop>()
  for (const item of near) {
    const minutes = walkMinutes(item.route)
    if (minutes <= 0) continue
    const duration = durationGroup(minutes)
    const current = best.get(duration)
    const fog = fogAround(item.route.points, known)
    if (current && (current.fog > fog || (current.fog === fog && current.item.date >= item.date))) continue
    best.set(duration, { item, duration, minutes, level: loopLevel(item.route.distanceM, dog.birthDate, dog.today), fog })
  }
  return LOOP_DURATIONS.flatMap((d) => (best.has(d) ? [best.get(d)!] : [])).slice(0, LOOPS_MAX)
}
