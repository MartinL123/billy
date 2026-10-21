import { addDays, dayNumber, diffDays, formatLong, type ISODate } from './dates'
import { isOverdue } from './events'

// L’écran Santé V5 (T-053, maquettes V5-Sante et V5-Etat-SoinEnRetard) : phrase d’état, semaine repliée, « C’est fait »
// seulement le jour J ou en retard.

interface Dated {
  date: ISODate | ''
  done: boolean
  time?: string
  type?: string
}

/** R-068 : une étape de vie (« Oslo a 6 mois », anniversaire) se fête, elle ne se coche pas et n’est jamais en retard. */
export const isLifeStep = (e: { type?: string }) => e.type === 'etape'

/** Les 7 jours (lundi → dimanche) de la semaine de `day` : le calendrier replié. */
export function weekOf(day: ISODate): ISODate[] {
  // 1970-01-01 était un jeudi : (n + 3) % 7 donne 0 pour lundi.
  const offset = (((dayNumber(day) + 3) % 7) + 7) % 7
  return Array.from({ length: 7 }, (_, i) => addDays(day, i - offset))
}

/** « C’est fait » n’apparaît que le jour J ou en retard (jamais pour un rappel lointain, ex. « Oslo a 6 mois »). */
export const canMarkDone = (date: ISODate | '', today: ISODate) => Boolean(date) && date <= today

/** « C’est fait » pour cet événement : un soin ou un rendez-vous, le jour J ou en retard ; jamais une étape de vie. */
export const canCheck = (e: { date: ISODate | ''; type?: string }, today: ISODate) => !isLifeStep(e) && canMarkDone(e.date, today)

/** Les soins en retard, les plus anciens d’abord : ils passent en tête (seul cas de rouge). */
export function lateCare<T extends Dated>(events: T[], today: ISODate): T[] {
  return events.filter((e) => !isLifeStep(e) && isOverdue(e, today)).sort((a, b) => a.date.localeCompare(b.date))
}

/** La prochaine chose (aujourd’hui ou plus tard), hors retards. */
export function nextThing<T extends Dated>(events: T[], today: ISODate): T | undefined {
  return events
    .filter((e) => !e.done && e.date && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0]
}

/** « Dimanche 10 janvier 2027 · dans 83 jours ». */
export function whenLine(date: ISODate, today: ISODate): string {
  const days = diffDays(today, date)
  const rel = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : days > 0 ? `dans ${days} jours` : `il y a ${-days} jour${days < -1 ? 's' : ''}`
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(dayNumber(date) * 86_400_000))
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatLong(date)} · ${rel}`
}

/** La phrase sous le titre : « Tout est à jour. Rien à prévoir avant le 10 janvier 2027. » / « Une chose à faire, le reste est à jour. » */
export function healthStatus(events: Dated[], today: ISODate): string {
  const late = lateCare(events, today).length
  if (late) return `${late === 1 ? 'Une chose' : `${late} choses`} à faire, le reste est à jour.`
  const next = nextThing(events, today)
  if (!next || !next.date) return 'Tout est à jour. Rien de prévu pour l’instant.'
  if (next.date === today) return 'Tout est à jour. Une chose prévue aujourd’hui.'
  return `Tout est à jour. Rien à prévoir avant le ${formatLong(next.date)}.`
}
