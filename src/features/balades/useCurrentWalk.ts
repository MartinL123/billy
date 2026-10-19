import { useEffect, useState } from 'react'
import { isNative } from '../../native'
import { MAX_WALK_MS } from '../../lib/gpsWalk'
import { FlairNative, type CurrentWalk } from '../../native/flair'

/**
 * Arrêtée (« Terminer » touché, ou 3 h dépassées) : l’heure de l’arrêt. Une balade interrompue (app fermée) depuis plus
 * de 3 h ne se reprend plus, elle est seulement à enregistrer (R-043).
 */
function stoppedAtOf(current: CurrentWalk): string | undefined {
  if (current.stopped) return current.stoppedAt ?? current.startedAt
  if (!current.recording && current.startedAt && Date.now() - Date.parse(current.startedAt) > MAX_WALK_MS) return new Date(Date.parse(current.startedAt) + MAX_WALK_MS).toISOString()
  return undefined
}

/**
 * App iOS (T-036) : la balade de l’iPhone en cours, relue à l’ouverture et au retour au premier plan. `undefined` sur
 * le web ou sans balade commencée.
 */
export function useCurrentWalk(): { startedAt: string; recording: boolean; stoppedAt?: string } | undefined {
  const [walk, setWalk] = useState<{ startedAt: string; recording: boolean; stoppedAt?: string }>()
  useEffect(() => {
    if (!isNative()) return
    let alive = true
    const read = () => {
      if (document.visibilityState !== 'visible') return
      FlairNative.currentWalk()
        .then((current) => alive && setWalk(current.active && current.startedAt ? { startedAt: current.startedAt, recording: current.recording, ...(stoppedAtOf(current) ? { stoppedAt: stoppedAtOf(current) } : {}) } : undefined))
        .catch(() => undefined)
    }
    read()
    document.addEventListener('visibilitychange', read)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', read)
    }
  }, [])
  return walk
}
