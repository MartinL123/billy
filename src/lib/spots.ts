import { calmMoment, distanceMeters, type CalmLevel, type CalmSlot } from './community'
import type { ISODate } from './dates'
import { distanceToRoute, formatRouteDistance, type RoutePoint } from './route'

// Les spots de la meute façon « Highlight » de Komoot (spec V6 § 8.1, T-088) : la fiche d’un spot et sa création.
// Fonctions pures, testées ; les composants ne font que mettre en page.

/** Un spot se crée seulement à moins de 60 m d’un trajet déjà fait : jamais un point libre (ni un domicile isolé). */
export const SPOT_ON_ROUTE_M = 60
/** Les spots à moins de 100 m sont proposés d’abord (« C’est l’un de ceux-là ? ») : pas de doublon. */
export const SPOT_DUPLICATE_M = 100
/** Marche avec un chien : 4,5 km/h, soit 75 m par minute. */
export const WALK_M_PER_MIN = 75
/** Un conseil de la meute : un texte court. */
export const TIP_MAX = 140
/** Les conseils affichés sur la fiche, les plus récents d’abord. */
export const TIPS_SHOWN = 3

type LatLng = { lat: number; lng: number }

/** La distance au plus proche des trajets déjà faits (Infinity sans trajet). */
export function distanceToRoutes(here: LatLng, routes: RoutePoint[][]): number {
  let best = Infinity
  for (const points of routes) if (points.length) best = Math.min(best, distanceToRoute(here, points))
  return best
}

/** Les spots à moins de 100 m, du plus proche au plus loin. */
export function duplicateCandidates<T extends LatLng>(spots: T[], here: LatLng): (T & { meters: number })[] {
  return spots
    .map((s) => ({ ...s, meters: distanceMeters(here, s) }))
    .filter((s) => s.meters <= SPOT_DUPLICATE_M)
    .sort((a, b) => a.meters - b.meters)
}

/**
 * Créer un spot ici ? « loin » : à plus de 60 m de tout trajet déjà fait ; « doublons » : des spots à moins de 100 m,
 * à proposer d’abord ; sinon « ok ».
 */
export type NewSpotCheck<T> = { kind: 'loin' } | { kind: 'doublons'; candidates: (T & { meters: number })[] } | { kind: 'ok' }
export function newSpotCheck<T extends LatLng>(here: LatLng, routes: RoutePoint[][], spots: T[]): NewSpotCheck<T> {
  if (distanceToRoutes(here, routes) > SPOT_ON_ROUTE_M) return { kind: 'loin' }
  const candidates = duplicateCandidates(spots, here)
  return candidates.length ? { kind: 'doublons', candidates } : { kind: 'ok' }
}

/** Les minutes à pied (1 au moins). */
export const walkingMinutes = (meters: number) => Math.max(1, Math.round(meters / WALK_M_PER_MIN))

/** « Y aller · 8 min à pied » ; sans position, « Y aller ». */
export const goLabel = (meters: number | undefined) => (meters !== undefined && Number.isFinite(meters) ? `Y aller · ${walkingMinutes(meters)} min à pied` : 'Y aller')

/** Les chiens passés au spot cette semaine (un chien compte une fois, même s’il a marqué plusieurs jours). */
export function dogsThisWeek(marks: { spotId: string; uid: string; date: ISODate }[], spotId: string, weekDays: ISODate[]): number {
  return new Set(marks.filter((m) => m.spotId === spotId && weekDays.includes(m.date)).map((m) => m.uid)).size
}

const LEVEL_SHORT: Record<CalmLevel, string> = { calme: 'Calme', moyen: 'Moyen', anime: 'Animé' }

/** Les Stats de la fiche : calme et moment · chiens cette semaine · distance ; seulement ce qu’on sait. */
export function spotStats({ votes, dogs, meters }: { votes: { level?: CalmLevel; slot?: CalmSlot }[]; dogs: number; meters?: number }): { value: string; label: string }[] {
  const calm = calmMoment(votes)
  return [
    { value: calm ? LEVEL_SHORT[calm.level] : '', label: calm ? calm.moment.replace(/^./, (c) => c.toLocaleUpperCase('fr')) : 'Calme' },
    { value: dogs ? `${dogs}\u00a0chien${dogs > 1 ? 's' : ''}` : '', label: 'Cette semaine' },
    { value: meters !== undefined && Number.isFinite(meters) ? formatRouteDistance(meters) : '', label: 'D’ici' },
  ]
}

export interface SpotTip {
  text: string
  by: string
  date: ISODate
}

/** Les conseils de la meute : texte court, auteur, date ; les plus récents d’abord, 3 au plus. */
export function spotTips(votes: { tip?: string; dogName?: string; date?: ISODate }[]): SpotTip[] {
  return votes
    .flatMap((v) => {
      const text = v.tip?.trim()
      return text && v.date ? [{ text: text.slice(0, TIP_MAX), by: v.dogName?.trim() || 'Un membre', date: v.date }] : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, TIPS_SHOWN)
}

/** Les pastilles d’infos, dans l’ordre de la fiche : eau, ombre, laisse, puis le reste. */
const PILL_ORDER = ['Point d’eau', 'Ombre', 'Laisse obligatoire']
export function spotPills(info: string[] | undefined): string[] {
  const rank = (i: string) => (PILL_ORDER.includes(i) ? PILL_ORDER.indexOf(i) : PILL_ORDER.length)
  return [...new Set(info ?? [])].sort((a, b) => rank(a) - rank(b))
}
