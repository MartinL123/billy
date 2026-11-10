import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../firebase/store'
import { expiryNotification, MAX_PENDING, planNotifications, readPrefs } from '../../lib/localNotifications'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { replaceNotifications } from './localNotifications'
import { dogName } from '../../lib/dogName'

/**
 * App iOS (T-042) : replanifie les notifications locales à chaque ouverture, au retour au premier plan, et dès que le
 * calendrier, les heures de sortie, les sorties du jour ou les réglages changent. Rien sur le web.
 */
export function NotificationScheduler() {
  const { dog, events, walks } = useData()
  const today = useToday()
  const [wake, setWake] = useState(0)

  useEffect(() => {
    if (!isNative()) return
    const onVisible = () => document.visibilityState === 'visible' && setWake((n) => n + 1)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const doneToday = walks.find((w) => w.date === today)?.done
  // Une clé qui ne change que si le plan peut changer : on ne replanifie pas à chaque rendu.
  const key = useMemo(
    () => JSON.stringify([dog.name, dog.walkTimes, dog.notifications, doneToday, events.map((e) => [e.id, e.title, e.type, e.date, e.done, e.time]), today, wake]),
    [dog.name, dog.walkTimes, dog.notifications, doneToday, events, today, wake],
  )

  useEffect(() => {
    if (!isNative()) return
    const timer = window.setTimeout(() => {
      const now = new Date()
      // R-104 : « Flair expire demain », repoussée à chaque ouverture (une place gardée parmi les 64 d’iOS).
      const plan = [...planNotifications({ now, dogName: dogName(dog), events, times: walkTimes(dog.walkTimes), doneToday: doneToday ?? {}, prefs: readPrefs(dog.notifications) }).slice(0, MAX_PENDING - 1), expiryNotification(now)]
      replaceNotifications(plan).catch((error) => console.error('Notifications non planifiées', error))
    }, 500)
    return () => window.clearTimeout(timer)
    // La clé résume tout ce dont le plan dépend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return null
}
