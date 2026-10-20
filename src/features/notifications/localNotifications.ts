import { LocalNotifications } from '@capacitor/local-notifications'
import type { PlannedNotification } from '../../lib/localNotifications'
import { isNative } from '../../native'

// Le pont avec l'iPhone pour les notifications locales (T-042). Uniquement dans l'app iOS : sur le web, rien.

export type Permission = 'granted' | 'denied' | 'prompt'

export async function notificationPermission(): Promise<Permission> {
  if (!isNative()) return 'denied'
  const { display } = await LocalNotifications.checkPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

/** Demande l'autorisation (une seule fenêtre d'iOS, jamais au lancement : après un premier soin, ou dans les réglages). */
export async function askNotificationPermission(): Promise<Permission> {
  if (!isNative()) return 'denied'
  const current = await notificationPermission()
  if (current !== 'prompt') return current
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted' ? 'granted' : 'denied'
}

/** Remplace toutes les notifications en attente par le nouveau plan (seulement si l'autorisation est donnée). */
export async function replaceNotifications(plan: PlannedNotification[]): Promise<void> {
  if (!isNative() || (await notificationPermission()) !== 'granted') return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  if (!plan.length) return
  await LocalNotifications.schedule({
    notifications: plan.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, extra: { kind: n.kind } })),
  })
}
