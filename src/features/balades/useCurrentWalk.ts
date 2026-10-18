import { useEffect, useState } from 'react'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'

/**
 * App iOS (T-036) : la balade de l’iPhone en cours, relue à l’ouverture et au retour au premier plan. `undefined` sur
 * le web ou sans balade commencée.
 */
export function useCurrentWalk(): { startedAt: string; recording: boolean } | undefined {
  const [walk, setWalk] = useState<{ startedAt: string; recording: boolean }>()
  useEffect(() => {
    if (!isNative()) return
    let alive = true
    const read = () => {
      if (document.visibilityState !== 'visible') return
      FlairNative.currentWalk()
        .then((current) => alive && setWalk(current.active && current.startedAt ? { startedAt: current.startedAt, recording: current.recording } : undefined))
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
