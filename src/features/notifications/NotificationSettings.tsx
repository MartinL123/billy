import { useEffect, useState } from 'react'
import { SWITCH } from '../../components/Form'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { ofName } from '../../lib/gender'
import { readPrefs, type NotificationKind } from '../../lib/localNotifications'
import { askNotificationPermission, notificationPermission, type Permission } from './localNotifications'

const KINDS: { id: NotificationKind; title: string; detail: (name: string) => string }[] = [
  { id: 'soin', title: 'Soin à venir', detail: () => 'La veille à 18\u00a0h\u00a0: « Vermifuge demain »' },
  { id: 'sortie', title: 'Sortie prévue', detail: () => '15\u00a0min avant chaque sortie, si elle n’est pas déjà notée' },
  { id: 'recap', title: 'Récap du dimanche', detail: (name) => `Le dimanche à 18\u00a0h, la semaine ${ofName(name)}` },
]

/**
 * Profil › Notifications (app iOS, T-042) : un interrupteur par type. L’autorisation d’iOS est demandée au premier
 * interrupteur allumé, jamais au lancement.
 */
export function NotificationSettings() {
  const { dog } = useData()
  const prefs = readPrefs(dog.notifications)
  const [permission, setPermission] = useState<Permission>()

  useEffect(() => {
    notificationPermission().then(setPermission).catch(() => setPermission('denied'))
  }, [])

  // R-067 : l’autorisation d’abord ; refusée, l’interrupteur reste éteint et la phrase dessous explique pourquoi.
  const toggle = async (kind: NotificationKind) => {
    const on = !prefs[kind]
    if (on && permission !== 'granted') {
      const answer = await askNotificationPermission().catch(() => 'denied' as const)
      setPermission(answer)
      if (answer !== 'granted') return
    }
    updateDog({ notifications: { ...prefs, [kind]: on } })
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xl font-bold">Notifications</h2>
      <div className="card flex flex-col p-4">
        {KINDS.map((kind, i) => (
          <label key={kind.id} className={`flex min-h-14 items-center justify-between gap-3.5 py-2 ${i ? 'border-t border-divider' : ''}`}>
            <span className="flex flex-col gap-0.5">
              <span className="text-[1rem] font-bold">{kind.title}</span>
              <span className="text-[0.8824rem] leading-snug text-muted">{kind.detail(dog.name)}</span>
            </span>
            <input type="checkbox" role="switch" {...SWITCH} checked={prefs[kind.id]} onChange={() => void toggle(kind.id)} className="shrink-0 accent-primary" />
          </label>
        ))}
        {permission === 'denied' && (
          <p role="status" className="mt-2 text-[0.8824rem] leading-snug text-primary-dark">
            Les notifications sont coupées pour Flair, les interrupteurs restent éteints. Pour les recevoir : Réglages › Notifications › Flair.
          </p>
        )}
      </div>
    </section>
  )
}
