import { formatShort, parseISO, type ISODate } from './dates'
import { formatRouteDistance } from './route'

// Le panneau des Balades : la ligne d’un tracé touché sur la carte (T-098).

/** T-098 : la ligne d’un tracé touché sur la carte, « 22 oct. · 2,1 km » (le nom est affiché à part, coupé s’il est long). */
export function walkLineDetails(walk: { date: ISODate; route: { distanceM: number } }, today: ISODate): string {
  return `${formatShort(walk.date, parseISO(today).y)} · ${formatRouteDistance(walk.route.distanceM)}`
}
