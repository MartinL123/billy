// Rappel du soir (Web Push envoyé par une tâche planifiée GitHub). Ce fichier n’importe rien :
// il est lu tel quel par le script d’envoi (scripts/rappel-soir.mjs) et par les tests.

export interface ReminderSettings {
  /** Heure choisie, « HH:MM », dans le fuseau ci-dessous. */
  time: string
  timeZone: string
  /** Jour du dernier envoi (YYYY-MM-DD, heure locale) : une seule notification par jour et par appareil. */
  lastSent?: string
}

export const DEFAULT_REMINDER_TIME = '21:00'
export const REMINDER_TIME_ZONE = 'Europe/Paris'
/** Les tâches planifiées GitHub ont du retard : on envoie encore jusqu’à 3 heures après l’heure choisie, jamais avant. */
export const LATE_TOLERANCE_MINUTES = 180

/** La date et l’heure locales d’un instant, dans un fuseau (heure d’été et d’hiver gérées par le système). */
export function localParts(now: Date, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Faut-il envoyer maintenant ? Oui si l’heure choisie est passée (depuis moins de 3 h) et que rien n’est parti aujourd’hui. */
export function isDue(settings: ReminderSettings, now: Date): boolean {
  const local = localParts(now, settings.timeZone || REMINDER_TIME_ZONE)
  if (settings.lastSent === local.date) return false
  const late = local.minutes - toMinutes(settings.time || DEFAULT_REMINDER_TIME)
  return late >= 0 && late < LATE_TOLERANCE_MINUTES
}

/** Le texte de la notification : jamais de reproche, pas de relance. */
export function reminderText(dogName: string, restDay: boolean): { title: string; body: string } {
  const name = dogName.trim() || 'votre chien'
  return restDay
    ? { title: 'Journée repos', body: `Journée repos pour ${name} : un mot sur sa balade ?` }
    : { title: 'Le carnet du soir', body: `Comment s’est passée la journée avec ${name} ? Notez-le en 30 secondes.` }
}

/** Clé VAPID publique (base64 « URL ») → octets, pour créer l’abonnement push. */
export function vapidKeyBytes(key: string): Uint8Array {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}
