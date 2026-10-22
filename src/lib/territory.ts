import { formatRelative, formatShort, parseISO, type ISODate } from './dates'
import { formatRouteDistance } from './route'

// Le panneau des Balades (V5, T-054) : le pourcentage découvert en grand, et la phrase qui décrit la balade touchée.

/** « 4 % », « < 1 % » (un peu découvert, mais pas 1 %), « 0 % ». */
export function sharePercent(share: number): string {
  if (share > 0 && share < 0.01) return '< 1 %'
  return `${Math.round(Math.min(1, share) * 100)} %`
}

/**
 * Sans balade touchée : l’invitation ; avec (T-098) : quand, combien, et quoi toucher ensuite (la ligne en bas du
 * panneau ouvre sa fiche).
 */
export function territoryHint(walk: { date: ISODate; route: { distanceM: number; durationMin?: number } } | undefined, today: ISODate): string {
  if (!walk) return 'Chaque balade lève le brouillard. Touchez-en une pour l’ouvrir.'
  const when = formatRelative(walk.date, today).replace(/^./, (c) => c.toLocaleUpperCase('fr'))
  const parts = [when, formatRouteDistance(walk.route.distanceM), walk.route.durationMin ? `${walk.route.durationMin}\u00a0min` : ''].filter(Boolean)
  return `${parts.join(' · ')}. Touchez la carte ailleurs pour revoir toutes ses balades.`
}

/** T-098 : la ligne d’un tracé touché sur la carte, « 22 oct. · 2,1 km » (le nom est affiché à part, coupé s’il est long). */
export function walkLineDetails(walk: { date: ISODate; route: { distanceM: number } }, today: ISODate): string {
  return `${formatShort(walk.date, parseISO(today).y)} · ${formatRouteDistance(walk.route.distanceM)}`
}
