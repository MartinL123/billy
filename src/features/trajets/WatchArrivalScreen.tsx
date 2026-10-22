import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../firebase/store'
import { useToday } from '../../lib/useToday'
import { findArrivedEntry } from '../../lib/watchArrival'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { Splash } from '../auth/Splash'
import { syncWatch, type WatchContext } from '../balades/watchImport'

/** Après la lecture, la base locale peut mettre un instant à montrer la balade : on l’attend 3 s au plus. */
const GRACE_MS = 3000

/**
 * `#/balade/arrivee?uuid=…&start=…` (T-084, spec V6 § 4) : ouvert en touchant « Belle balade avec Billy ! ». L’import
 * habituel des marches de la Watch tourne tout de suite (sans attendre les 5 minutes entre deux lectures), puis le récap
 * « Belle balade ! » de cette balade s’ouvre. Introuvable (déjà supprimée, lecture refusée) : la liste des balades.
 */
export default function WatchArrivalScreen() {
  const [params] = useSearchParams()
  const start = params.get('start') ?? ''
  const { entries, bones, fog, communes, dog } = useData()
  const today = useToday()
  const latest = useRef<WatchContext>({ entries, bones, fog, communes, today, times: walkTimes(dog.walkTimes) })
  latest.current = { entries, bones, fog, communes, today, times: walkTimes(dog.walkTimes) }
  const [givenUp, setGivenUp] = useState(false)
  const found = findArrivedEntry(entries, start)
  const known = useRef(Boolean(found))

  useEffect(() => {
    if (known.current) return
    let timer: number | undefined
    const stop = () => {
      timer = window.setTimeout(() => setGivenUp(true), GRACE_MS)
    }
    if (!isNative()) stop()
    else void syncWatch(() => latest.current, () => undefined, { force: true }).finally(stop)
    return () => window.clearTimeout(timer)
  }, [])

  if (found) return <Navigate to={`/balade/recap/${found.id}`} replace />
  if (givenUp) return <Navigate to="/balades" replace />
  return <Splash title="La balade arrive…">Flair la lit dans Santé.</Splash>
}
