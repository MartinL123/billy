import { ofName } from './gender'
import { formatRouteDistance, routeMomentInfo, type Route } from './route'
import { clockAt, shareGain, type Discovery } from './walkSheet'

// Le récap « Belle balade ! » (spec V6 § 6.3) : fonctions pures, testées.

/** Stats du récap : distance · % découvert gagné · os (seulement ce qu’il y a). */
export function recapStats({ distanceM, discovery, bones }: { distanceM: number; discovery?: Discovery; bones: number }): { value: string; label: string }[] {
  const gain = discovery?.commune ? shareGain(discovery.share) : undefined
  return [
    { value: formatRouteDistance(distanceM), label: 'Ensemble' },
    { value: gain ?? '', label: discovery?.commune ? `${ofName(discovery.commune)} découvert` : 'Découvert' },
    { value: bones > 0 ? `+${bones}` : '', label: 'Os gagnés' },
  ]
}

/** « 4 arrêts. Que s’est-il passé ? » */
export const stopsLine = (n: number) => `${n} arrêt${n > 1 ? 's' : ''}. Que s’est-il passé ?`

/**
 * Les pastilles d’arrêts (2 ou 3) : les arrêts déjà racontés (« Jeu · 8 h 17 »), puis « 2 à raconter » ; sans heure
 * connue, « Arrêt 1 · 3 min ».
 */
export function stopChips(route: Pick<Route, 'stops' | 'moments' | 'startTime'>): { label: string; hard?: boolean; todo?: boolean }[] {
  const stops = route.stops ?? []
  const told = stops.flatMap((s) => {
    const m = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
    if (!m) return []
    const label = m.type === 'peur' ? 'Stress' : routeMomentInfo(m.type).label
    return [{ label: route.startTime ? `${label} · ${clockAt(route.startTime, s.at)}` : label, ...(m.type === 'peur' || m.type === 'grogne' ? { hard: true } : {}) }]
  })
  const untold = stops.length - told.length
  const chips = told.slice(0, untold ? 2 : 3)
  if (untold) chips.push({ label: `${untold} à raconter`, todo: true } as { label: string; todo: boolean })
  return chips
}
