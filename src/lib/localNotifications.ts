import { addDays, todayISO, type ISODate } from './dates'
import { ofName } from './gender'
import { formatHour, walkName, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// Notifications locales de l'app iOS (T-042) : planifiées par l'app elle-même, sans serveur. Ce fichier calcule quoi
// planifier ; src/features/notifications/ les confie à l'iPhone. Textes courts, vouvoiement, jamais de reproche.

export type NotificationKind = 'soin' | 'sortie' | 'recap'

/** Un interrupteur par type, dans Profil › Notifications. « Sortie prévue » est coupée par défaut. */
export type NotificationPrefs = Record<NotificationKind, boolean>
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { soin: true, sortie: false, recap: true }

export const readPrefs = (saved?: Partial<NotificationPrefs>): NotificationPrefs => ({ ...DEFAULT_NOTIFICATION_PREFS, ...(saved ?? {}) })

/**
 * T-084 : « Quand une balade de la Watch arrive » (activé par défaut). Cette notification n'est pas planifiée ici : l'app
 * iOS la programme seule, réveillée par Santé ; le choix lui est confié par `FlairNative.setWatchNotify`.
 */
export const watchArrivalOn = (saved?: { balade?: boolean }) => saved?.balade !== false

/** iOS garde au plus 64 notifications en attente : on planifie au plus 14 jours, et jamais plus de 64. */
export const PLAN_DAYS = 14
export const MAX_PENDING = 64
/** Heure des soins (la veille) et du récap (le dimanche). */
export const CARE_HOUR = 18
export const RECAP_HOUR = 18
/** Une sortie est annoncée 15 minutes avant. */
export const WALK_LEAD_MIN = 15

export interface PlannedNotification {
  id: number
  kind: NotificationKind
  at: Date
  title: string
  body: string
}

interface CareLike {
  id: string
  title: string
  type: string
  date: ISODate | ''
  done: boolean
  time?: string
}

/** Un identifiant numérique stable (iOS les veut entiers) : le même rappel garde le même numéro d'une fois sur l'autre. */
export function notificationId(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0
  return Math.abs(hash) % 2_000_000_000 || 1
}

const at = (iso: ISODate, minutes: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!, Math.floor(minutes / 60), minutes % 60)
}
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Ce qu'il faut planifier à partir de `now`, pour les 14 prochains jours :
 * - un soin ou un RDV du calendrier : la veille à 18 h (« Vermifuge demain ») ;
 * - une sortie du profil : 15 min avant, sauf si elle est déjà notée aujourd'hui ;
 * - le récap : chaque dimanche à 18 h.
 */
export function planNotifications({ now, dogName, events, times, doneToday, prefs }: { now: Date; dogName: string; events: CareLike[]; times: WalkTimes; doneToday: Partial<Record<WalkSlot, string>>; prefs: NotificationPrefs }): PlannedNotification[] {
  const today = todayISO(now)
  const last = addDays(today, PLAN_DAYS)
  const name = dogName.trim() || 'votre chien'
  const out: PlannedNotification[] = []

  if (prefs.soin)
    for (const e of events) {
      if (e.done || !e.date || e.type === 'etape' || e.date <= today || e.date > last) continue
      const when = at(addDays(e.date, -1), CARE_HOUR * 60)
      if (when <= now) continue
      out.push({ id: notificationId(`soin:${e.id}:${e.date}`), kind: 'soin', at: when, title: `${e.title} demain`, body: `Pour ${name}${e.time ? `, à ${formatHour(e.time)}` : ''}.` })
    }

  for (let day = 0; day < PLAN_DAYS; day++) {
    const date = addDays(today, day)
    if (prefs.sortie)
      for (const { id: slot } of WALK_SLOTS) {
        if (day === 0 && doneToday[slot]) continue
        const when = at(date, toMinutes(times[slot]) - WALK_LEAD_MIN)
        if (when <= now) continue
        const walk = walkName(times[slot])
        out.push({ id: notificationId(`sortie:${date}:${slot}`), kind: 'sortie', at: when, title: `${walk.charAt(0).toUpperCase()}${walk.slice(1)}, dans 15\u00a0min`, body: `C’est bientôt l’heure de sortir avec ${name}.` })
      }
    if (prefs.recap && at(date, 0).getDay() === 0) {
      const when = at(date, RECAP_HOUR * 60)
      if (when > now) out.push({ id: notificationId(`recap:${date}`), kind: 'recap', at: when, title: `La semaine ${ofName(name)}`, body: 'Ses balades, ses progrès et ses souvenirs de la semaine.' })
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING)
}
