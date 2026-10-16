import { deleteDoc, getDoc, setDoc } from 'firebase/firestore'
import { REMINDER_TIME_ZONE, vapidKeyBytes } from '../lib/reminder'
import { userDoc } from './paths'

// Abonnement push de cet appareil : users/{uid}/push/{appareil}. Il sert à deux rappels indépendants :
// le rappel du soir (`evening`, absent = activé, pour les anciens abonnements) et les sorties (`walks`).

export const VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
const DEVICE_KEY = 'billy.appareil'

/** Un identifiant par appareil, gardé sur l'appareil : chaque iPhone a son propre abonnement. */
export function deviceId(): string {
  try {
    const known = localStorage.getItem(DEVICE_KEY)
    if (known) return known
    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, created)
    return created
  } catch {
    return 'appareil'
  }
}

export const deviceRef = () => userDoc('push', deviceId())

/** Sur iPhone, les notifications ne marchent que si l'app est installée sur l'écran d'accueil. */
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
export const canPush = () => Boolean(VAPID_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export type PushKind = 'evening' | 'walks'

export interface PushSettings {
  evening: boolean
  walks: boolean
  time?: string
}

/** Ce qui est activé sur cet appareil. */
export async function readPush(): Promise<PushSettings> {
  const snap = await getDoc(deviceRef())
  if (!snap.exists()) return { evening: false, walks: false }
  const data = snap.data()
  return { evening: data.evening !== false, walks: data.walks === true, time: data.time as string | undefined }
}

/**
 * Active un rappel. La permission est demandée au toucher, comme l'exige l'iPhone.
 * Renvoie un message d'erreur, ou rien si c'est fait.
 */
export async function enablePush(kind: PushKind, extra: Record<string, unknown> = {}): Promise<string | undefined> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'Les notifications sont refusées. Autorisez-les dans Réglages › Notifications › Billy.'
  const registration = await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(VAPID_KEY) as BufferSource }))
  const current = await readPush()
  await setDoc(deviceRef(), {
    subscription: subscription.toJSON(),
    timeZone: REMINDER_TIME_ZONE,
    createdAt: new Date().toISOString(),
    evening: kind === 'evening' ? true : current.evening,
    walks: kind === 'walks' ? true : current.walks,
    ...extra,
  }, { merge: true })
  return undefined
}

/** Coupe un rappel ; l'abonnement n'est supprimé que si plus aucun rappel ne s'en sert. */
export async function disablePush(kind: PushKind): Promise<void> {
  const current = await readPush()
  const other = kind === 'evening' ? current.walks : current.evening
  if (other) {
    await setDoc(deviceRef(), { [kind]: false }, { merge: true })
    return
  }
  const registration = await navigator.serviceWorker.ready
  await (await registration.pushManager.getSubscription())?.unsubscribe()
  await deleteDoc(deviceRef())
}
