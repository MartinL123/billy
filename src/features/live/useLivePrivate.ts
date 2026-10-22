import { useEffect, useState } from 'react'
import { watchLivePrivate } from '../../firebase/live'
import { useReadOnly } from '../../firebase/viewer'
import type { LivePrivate } from '../../lib/liveShare'

/**
 * T-087 : proches, prénom du maître et partages en cours (users/{uid}/private/live). `undefined` tant que ce n’est
 * pas lu ; un visiteur (T-048) n’y a jamais accès : `{}` sans rien demander.
 */
export function useLivePrivate(): LivePrivate | undefined {
  const readOnly = useReadOnly()
  const [data, setData] = useState<LivePrivate | undefined>(readOnly ? {} : undefined)
  useEffect(() => (readOnly ? undefined : watchLivePrivate(setData)), [readOnly])
  return data
}
