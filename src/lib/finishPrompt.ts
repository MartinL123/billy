import { distanceMeters } from './community'

// T-086 : « Balade finie ? ». Pendant une balade du GPS de Flair, l'iPhone remarque qu'on est revenu au départ et qu'on
// n'en bouge plus : une notification locale, « Touchez pour terminer la balade. », 10 min après le retour. Calcul fait en
// Swift au fil des points (`watchForFinish` dans `ios/App/App/FlairNativePlugin.swift`) ; ce fichier en est le miroir testé.

/** À moins de 50 m du départ… */
export const FINISH_RADIUS_M = 50
/** …après s'en être éloigné de plus de 100 m (au départ, on est forcément près du point de départ)… */
export const FINISH_LEAVE_M = 100
/** …depuis 10 minutes. */
export const FINISH_DELAY_MS = 10 * 60_000

export const FINISH_TITLE = 'Balade finie ?'
export const FINISH_BODY = 'Touchez pour terminer la balade.'

/**
 * Quand demander « Balade finie ? », vu les points reçus jusqu'ici (dans l'ordre) : 10 min après le retour à moins de
 * 50 m du départ, si on est toujours là. `undefined` : rien à demander (pas encore parti, ou de nouveau loin).
 * Un iPhone immobile n'envoie plus de points : la notification est donc programmée d'avance, et annulée si on repart.
 */
export function finishPromptAt(points: { lat: number; lng: number; time: string }[]): Date | undefined {
  const start = points[0]
  if (!start) return undefined
  let left = false
  let nearSince: number | undefined
  for (const point of points.slice(1)) {
    const d = distanceMeters(start, point)
    if (d > FINISH_LEAVE_M) left = true
    if (d > FINISH_RADIUS_M) nearSince = undefined
    else if (left && nearSince === undefined) nearSince = Date.parse(point.time)
  }
  return nearSince === undefined || Number.isNaN(nearSince) ? undefined : new Date(nearSince + FINISH_DELAY_MS)
}
