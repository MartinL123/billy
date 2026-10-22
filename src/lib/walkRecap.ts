import { formatRouteDistance, isToTell, routeMomentInfo, type Route } from './route'
import { clockAt } from './walkSheet'
import { formatDuration } from './balade'
import { tellQueue } from './walkTell'

// Le récap « Belle balade ! » (spec V6 § 6.3) : fonctions pures, testées.

/** Stats du récap : distance · durée · os (seulement ce qu’il y a). V6.1 § 1 : plus de pourcentage découvert. */
export function recapStats({ distanceM, durationMin, bones }: { distanceM: number; durationMin?: number; bones: number }): { value: string; label: string }[] {
  return [
    { value: formatRouteDistance(distanceM), label: 'Distance' },
    { value: durationMin ? formatDuration(durationMin) : '', label: 'Durée' },
    { value: bones > 0 ? `+${bones}` : '', label: 'Os gagnés' },
  ]
}

/** « 4 arrêts. Que s’est-il passé ? » ; sans arrêt, les repères posés pendant la balade (T-086). */
export const stopsLine = (n: number, markers = 0) => (n || !markers ? `${n} arrêt${n > 1 ? 's' : ''}. Que s’est-il passé ?` : `${markers} repère${markers > 1 ? 's' : ''} posé${markers > 1 ? 's' : ''}. Que s’est-il passé ?`)

/**
 * Les pastilles d’arrêts (2 ou 3) : les arrêts déjà racontés (« Jeu · 8 h 17 »), puis « 2 à raconter » ; sans heure
 * connue, « Arrêt 1 · 3 min ».
 */
export function stopChips(route: Pick<Route, 'stops' | 'moments' | 'startTime' | 'track'>): { label: string; hard?: boolean; todo?: boolean }[] {
  const stops = route.stops ?? []
  const told = stops.flatMap((s) => {
    const m = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
    if (!m || isToTell(m)) return []
    const label = m.type === 'peur' ? 'Stress' : routeMomentInfo(m.type).label
    return [{ label: route.startTime ? `${label} · ${clockAt(route.startTime, s.at)}` : label, ...(m.type === 'peur' || m.type === 'grogne' ? { hard: true } : {}) }]
  })
  // T-086 : les repères « À raconter » posés hors arrêt comptent aussi.
  const untold = tellQueue(route).length
  const chips = told.slice(0, untold ? 2 : 3)
  if (untold) chips.push({ label: `${untold} à raconter`, todo: true } as { label: string; todo: boolean })
  return chips
}
