import { revealedCells } from './fog'
import { ofName } from './gender'
import { formatRouteDistance, isGoodMoment, routeMomentInfo, type Route, type RouteMomentType } from './route'
import { CELLS_PER_BIT } from './walkSheet'
import type { ISODate } from './dates'

// « Ses balades : le bilan » (spec V6 § 8.5) : agrégations pures, testées. Seulement ce qui monte : des totaux et le
// mois en cours, jamais de comparaison avec le mois d’avant, ni de record.

export interface Stat {
  value: string
  label: string
}

type BilanWalk = { id: string; date: ISODate; route: Pick<Route, 'points' | 'distanceM' | 'durationMin' | 'moments' | 'stops' | 'startTime'> }

const km = (m: number) => `${(m / 1000).toFixed(1).replace('.', ',')} km`

/** « 9 h 40 », « 45 min » (le temps passé ensemble). */
export function togetherText(min: number): string {
  const h = Math.floor(min / 60)
  return h ? `${h} h ${String(min % 60).padStart(2, '0')}` : `${min} min`
}

/** « 12 % », « < 1 % » : la part découverte de la commune (rien si rien). */
export function shareText(share: number | undefined): string {
  if (!share || share <= 0) return ''
  return share < 0.01 ? '< 1 %' : `${Math.round(share * 100)} %`
}

/** Les Stats du haut : balades · km · % découvert · heures ensemble (toutes les balades). */
export function bilanStats(walks: BilanWalk[], discovered?: { share: number; commune: string }): Stat[] {
  const min = walks.reduce((s, w) => s + (w.route.durationMin ?? 0), 0)
  return [
    { value: String(walks.length), label: walks.length > 1 ? 'Balades' : 'Balade' },
    { value: km(walks.reduce((s, w) => s + w.route.distanceM, 0)), label: 'Distance' },
    { value: discovered ? shareText(discovered.share) : '', label: discovered ? `${ofName(discovered.commune)} découvert` : 'Découvert' },
    { value: min ? togetherText(min) : '', label: 'Ensemble' },
  ]
}

/** Toutes les photos des balades, des plus récentes aux plus anciennes (une photo en double n’apparaît qu’une fois). */
export function walkPhotos<P extends { fileId: string }>(entries: { date: ISODate; photos: P[]; route?: { points?: unknown[] } }[]): P[] {
  const seen = new Set<string>()
  return [...entries]
    .filter((e) => (e.route?.points?.length ?? 0) > 1)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((e) => e.photos)
    .filter((p) => (seen.has(p.fileId) ? false : (seen.add(p.fileId), true)))
}

export interface MonthReport {
  walks: number
  distanceM: number
  /** Les cases sorties du brouillard ce mois-ci (jamais vues par une balade d’avant le mois). */
  newCells: number
  /** Les arrêts racontés : un repère posé dessus. */
  toldStops: number
  /** Le moment (positif) le plus noté du mois. */
  topMoment?: RouteMomentType
}

const asLatLng = (points: Route['points']) => points.map(([lat, lng]) => ({ lat, lng }))

/** Le bilan du mois (« 2026-10 ») : ce qui s’est ajouté ce mois-là, rien d’autre. */
export function monthReport(walks: BilanWalk[], month: string): MonthReport {
  const inMonth = walks.filter((w) => w.date.startsWith(month))
  const before = new Set<string>()
  for (const w of walks) if (w.date < `${month}-01`) for (const c of revealedCells(asLatLng(w.route.points))) before.add(c)
  const fresh = new Set<string>()
  for (const w of inMonth) for (const c of revealedCells(asLatLng(w.route.points))) if (!before.has(c)) fresh.add(c)
  const counts = new Map<RouteMomentType, number>()
  for (const w of inMonth) for (const m of w.route.moments) if (isGoodMoment(m)) counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
  // À égalité, l’ordre de la liste des repères.
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return {
    walks: inMonth.length,
    distanceM: inMonth.reduce((s, w) => s + w.route.distanceM, 0),
    newCells: fresh.size,
    toldStops: inMonth.reduce((s, w) => s + (w.route.stops ?? []).filter((st) => st.momentIndex !== undefined).length, 0),
    ...(top ? { topMoment: top } : {}),
  }
}

/** Les Stats du bilan du mois ; ce qui vaut zéro ne s’affiche pas. */
export function monthStats(r: MonthReport): Stat[] {
  const bits = Math.floor(r.newCells / CELLS_PER_BIT)
  return [
    { value: r.walks ? String(r.walks) : '', label: r.walks > 1 ? 'Balades' : 'Balade' },
    { value: r.distanceM ? formatRouteDistance(r.distanceM).replace(' ', ' ') : '', label: 'Distance' },
    { value: bits ? String(bits) : '', label: bits > 1 ? 'Bouts de territoire' : 'Bout de territoire' },
    { value: r.toldStops ? String(r.toldStops) : '', label: r.toldStops > 1 ? 'Arrêts racontés' : 'Arrêt raconté' },
  ]
}

/** « Le moment le plus noté : Jeu. » */
export const topMomentLine = (type: RouteMomentType | undefined) => (type ? `Le moment le plus noté : ${routeMomentInfo(type).label.toLowerCase()}.` : undefined)
