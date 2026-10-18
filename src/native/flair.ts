import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { GpsPoint } from '../lib/gpsWalk'
import type { WatchWalk } from '../lib/watch'

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
  points: GpsPoint[]
}

interface FlairNativePlugin {
  getWalks(options: { since: string }): Promise<WatchWalks>
  /** Démarre, ou reprend la balade en cours. Rejet `denied` si la position n'est pas autorisée. */
  startWalk(): Promise<CurrentWalk>
  /** Arrête et renvoie la balade ; le fichier de l'app est effacé. */
  stopWalk(): Promise<CurrentWalk>
  cancelWalk(): Promise<void>
  currentWalk(): Promise<CurrentWalk>
  keepAwake(options: { on: boolean }): Promise<void>
  addListener(event: 'walkPoint', listener: (point: GpsPoint) => void): Promise<PluginListenerHandle>
  addListener(event: 'walkStopped', listener: () => void): Promise<PluginListenerHandle>
}

export const FlairNative = registerPlugin<FlairNativePlugin>('FlairNative')
