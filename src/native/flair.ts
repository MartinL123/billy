import { isNative } from '../native'
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { GpsPoint } from '../lib/gpsWalk'
import type { WatchWalk } from '../lib/watch'
import type { HealthExtras } from '../lib/walkHealth'
import { withTimeout } from '../lib/timeout'

// Le plugin local de l'app iOS (`ios/App/App/FlairNativePlugin.swift`). À n'appeler que derrière `isNative()` :
// sur le web, il n'existe pas.

export interface WatchWalks {
  /** Faux sur un appareil sans Santé (iPad). */
  available: boolean
  /** Les marches et randonnées avec un tracé, de la plus ancienne à la plus récente. */
  walks: WatchWalk[]
  /** Les marches sans tracé (en intérieur, GPS coupé) : comptées, pas importées. */
  withoutRoute: number
  /** Toutes les séances lues (tous sports) : 0 peut vouloir dire que la lecture n'est pas autorisée. */
  workouts: number
}

/** La balade enregistrée par l'iPhone (T-036). */
export interface CurrentWalk {
  /** Une balade est commencée (même si l'app a été fermée depuis). */
  active: boolean
  /** Le GPS enregistre en ce moment. Faux si l'app a été tuée ou après l'arrêt automatique de 3 h. */
  recording: boolean
  startedAt?: string
  autoStopped?: boolean
  /** « Terminer » a été touché : le GPS est arrêté, la balade attend d’être enregistrée (R-042). */
  stopped?: boolean
  stoppedAt?: string
  points: GpsPoint[]
  /** T-060 : « Position exacte » coupée : les positions sont trop imprécises pour un tracé. */
  reducedAccuracy?: boolean
  /** T-061 : déjà enregistrée dans la base locale (cette entrée), en attente d’envoi au serveur : rien à faire. */
  savedAs?: string
}

interface FlairNativePlugin {
  getWalks(options: { since: string }): Promise<WatchWalks>
  /** T-080 : le cœur, les pas et l’énergie que Santé a sur cette fenêtre (vide si rien, ou si la lecture n’est pas permise). */
  healthWindow(options: { start: string; end: string }): Promise<HealthExtras>
  /** Démarre, ou reprend la balade en cours. Rejet `denied` si la position n'est pas autorisée. */
  startWalk(): Promise<CurrentWalk>
  /** Arrête le GPS et renvoie la balade. Le fichier est gardé jusqu'à `clearWalk()` (R-042). */
  stopWalk(): Promise<CurrentWalk>
  /** Efface la balade : seulement après un enregistrement réussi. */
  clearWalk(): Promise<void>
  cancelWalk(): Promise<void>
  currentWalk(): Promise<CurrentWalk>
  keepAwake(options: { on: boolean }): Promise<void>
  /** R-078 : retour par glissement depuis le bord gauche (coupé pendant une balade en cours). */
  setBackGesture(options: { on: boolean }): Promise<void>
  /** R-080 : une petite vibration (succès) ou un léger « clic » (sélection). */
  haptic(options: { type: 'success' | 'selection' }): Promise<void>
  /** T-061 : la balade est dans la base locale, pas encore au serveur ; sa copie est gardée. */
  markSaved(options: { entryId: string }): Promise<void>
  /** T-061 : les entrées dont la copie attend que l’envoi soit confirmé. */
  pendingSent(): Promise<{ ids: string[] }>
  clearSent(options: { ids: string[] }): Promise<void>
  addListener(event: 'walkPoint', listener: (point: GpsPoint) => void): Promise<PluginListenerHandle>
  addListener(event: 'walkStopped', listener: (data: { stoppedAt?: string }) => void): Promise<PluginListenerHandle>
  /** La précision du GPS à chaque mise à jour (même pour un point écarté) : signal faible (T-051). */
  /** T-062 : un point n’a pas pu être écrit sur l’iPhone (`storage` : stockage plein). */
  addListener(event: 'walkError', listener: (data: { code: string }) => void): Promise<PluginListenerHandle>
  addListener(event: 'walkSignal', listener: (data: { accuracy: number; time: string }) => void): Promise<PluginListenerHandle>
}

export const FlairNative = registerPlugin<FlairNativePlugin>('FlairNative')

/** R-080 : retour haptique, app iOS seulement ; jamais bloquant. */
export function haptic(type: 'success' | 'selection'): void {
  if (!isNative()) return
  FlairNative.haptic({ type }).catch(() => undefined)
}

/**
 * T-080 : ce que Santé sait de la fenêtre d’une balade du GPS de Flair (Watch au poignet). Jamais bloquant : rien si
 * Santé ne répond pas en 8 s, si la lecture n’est pas permise ou si l’app iOS est plus ancienne (méthode absente).
 */
export async function readHealthWindow(start: string, end: string): Promise<HealthExtras> {
  if (!isNative()) return {}
  try {
    return (await withTimeout(FlairNative.healthWindow({ start, end }), 8_000, 'healthWindow')) ?? {}
  } catch {
    return {}
  }
}
