import { useEffect, useState } from 'react'
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

  const toggle = async (kind: NotificationKind) => {
    const on = !prefs[kind]
    updateDog({ notifications: { ...prefs, [kind]: on } })
    if (on && permission !== 'granted') setPermission(await askNotificationPermission().catch(() => 'denied' as const))
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xl font-bold">Notifications</h2>
      <div className="card flex flex-col p-4">
        {KINDS.map((kind, i) => (
          <label key={kind.id} className={`flex min-h-14 items-center gap-3.5 py-2 ${i ? 'border-t border-divider' : ''}`}>
            <input type="checkbox" role="switch" checked={prefs[kind.id]} onChange={() => void toggle(kind.id)} className="size-7 shrink-0 accent-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[1rem] font-bold">{kind.title}</span>
              <span className="text-[0.8824rem] leading-snug text-muted">{kind.detail(dog.name)}</span>
            </span>
          </label>
        ))}
        {permission === 'denied' && (
          <p role="status" className="mt-2 text-[0.8824rem] leading-snug text-primary-dark">
            Les notifications sont coupées pour Flair. Pour les recevoir : Réglages › Notifications › Flair.
          </p>
        )}
      </div>
    </section>
  )
}
