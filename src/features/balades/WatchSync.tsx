import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { watchAddedLine } from '../../lib/watch'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'
import { syncWatch, type WatchContext } from './watchImport'

/**
 * App iOS (T-001) : les marches de l’Apple Watch arrivent seules, à l’ouverture et au retour au premier plan.
 * Si au moins une arrive, un bandeau en bas « 2 balades de la Watch ajoutées · Voir » (une seule : son récap). Rien sur le web.
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
    const sync = (force: boolean) => {
      if (document.visibilityState !== 'visible') return
      void syncWatch(
        () => latest.current,
        // V6 § 6.3 : une seule balade arrivée, « Voir » ouvre son récap « Belle balade ! » ; plusieurs, le résultat de l’import.
        (count, ids) => show.current.toast(`🐾 ${watchAddedLine(count)}`, { label: 'Voir', run: () => show.current.navigate(count === 1 && ids[0] ? `/balade/recap/${ids[0]}` : '/importer/resultat') }),
        { force },
      )
    }
    const run = () => sync(false)
    run()
    // T-084 : Santé annonce une nouvelle séance pendant que l’app est ouverte : lecture tout de suite.
    const arrived = FlairNative.addListener('watchArrived', () => sync(true))
    document.addEventListener('visibilitychange', run)
    // R-079 : juste après « Retrouver les balades de ma montre ».
    window.addEventListener('flair:montre', run)
    return () => {
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('flair:montre', run)
      void arrived.then((h) => h.remove())
    }
  }, [])

  return null
}
