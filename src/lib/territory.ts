import { formatRelative, type ISODate } from './dates'
import { formatRouteDistance } from './route'

// Le panneau des Balades (V5, T-054) : le pourcentage découvert en grand, et la phrase qui décrit la balade touchée.

/** « 4 % », « < 1 % » (un peu découvert, mais pas 1 %), « 0 % ». */
export function sharePercent(share: number): string {
  if (share > 0 && share < 0.01) return '< 1 %'
  return `${Math.round(Math.min(1, share) * 100)} %`
}

/** Sans balade touchée : l’invitation ; avec : « Hier · 2,4 km. Touchez-la encore pour revoir toutes ses balades. » */
export function territoryHint(walk: { date: ISODate; route: { distanceM: number; durationMin?: number } } | undefined, today: ISODate): string {
  if (!walk) return 'Chaque balade lève le brouillard. Touchez-en une pour la revoir.'
  const when = formatRelative(walk.date, today).replace(/^./, (c) => c.toLocaleUpperCase('fr'))
  const parts = [when, formatRouteDistance(walk.route.distanceM), walk.route.durationMin ? `${walk.route.durationMin} min` : ''].filter(Boolean)
  return `${parts.join(' · ')}. Touchez-la encore pour revoir toutes ses balades.`
}
