import { registerPlugin } from '@capacitor/core'
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

interface FlairNativePlugin {
  getWalks(options: { since: string }): Promise<WatchWalks>
}

export const FlairNative = registerPlugin<FlairNativePlugin>('FlairNative')
