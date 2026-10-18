import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { watchAddedLine } from '../../lib/watch'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { syncWatch, type WatchContext } from './watchImport'

/**
 * App iOS (T-001) : les marches de l’Apple Watch arrivent seules, à l’ouverture et au retour au premier plan.
 * Si au moins une arrive, un bandeau en bas « 2 balades de la Watch ajoutées · Voir ». Rien sur le web.
 */
export function WatchSync() {
  const { entries, bones, fog, communes, dog } = useData()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const latest = useRef<WatchContext>({ entries, bones, fog, communes, today, times: walkTimes(dog.walkTimes) })
  latest.current = { entries, bones, fog, communes, today, times: walkTimes(dog.walkTimes) }
  const show = useRef({ toast, navigate })
  show.current = { toast, navigate }

  useEffect(() => {
    if (!isNative()) return
    const run = () => {
      if (document.visibilityState !== 'visible') return
      void syncWatch(
        () => latest.current,
        (count) => show.current.toast(`🐾 ${watchAddedLine(count)}`, { label: 'Voir', run: () => show.current.navigate('/importer/resultat') }),
      )
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [])

  return null
}
