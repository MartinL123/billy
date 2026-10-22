import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useData } from '../../firebase/store'
import { watchArrivalOn } from '../../lib/localNotifications'
import { arrivalPath } from '../../lib/watchArrival'
import { isNative } from '../../native'
import { setWatchNotify } from '../../native/flair'
import { watchOptedIn } from './watchImport'

/**
 * App iOS (T-084, spec V6 § 4) : le pont avec la notification « Belle balade avec Billy ! ».
 * - Confie à l’iPhone ce qu’il doit savoir pour l’envoyer seul, réveillé par Santé : lecture des marches choisie, réglage
 *   « Quand une balade de la Watch arrive », prénom du chien.
 * - Touchée, la notification ouvre `#/balade/arrivee?uuid=…&start=…`. Rien sur le web.
 */
export function WatchArrivalBridge() {
  const { dog } = useData()
  const navigate = useNavigate()
  const go = useRef(navigate)
  go.current = navigate
  const [optedIn, setOptedIn] = useState(() => watchOptedIn())
  const enabled = watchArrivalOn(dog.notifications)

  useEffect(() => {
    if (!isNative()) return
    const update = () => setOptedIn(watchOptedIn())
    window.addEventListener('flair:montre', update)
    return () => window.removeEventListener('flair:montre', update)
  }, [])

  useEffect(() => {
    setWatchNotify({ optedIn, enabled, dogName: dog.name })
  }, [optedIn, enabled, dog.name])

  useEffect(() => {
    if (!isNative()) return
    // Gardé par iOS jusqu’à ce qu’on l’écoute : une notification qui lance l’app arrive ici aussi.
    const handle = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const extra = action.notification.extra as { kind?: string; uuid?: string; start?: string } | undefined
      if (action.actionId !== 'tap' || extra?.kind !== 'balade' || !extra.uuid) return
      go.current(arrivalPath(extra.uuid, extra.start ?? ''))
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [])

  return null
}
