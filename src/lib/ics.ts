import { addDays, type ISODate } from './dates'
import type { Recurrence } from './recurrence'

export interface IcsEvent {
  id: string
  title: string
  date: ISODate
  time?: string
  recurrence: Recurrence
  notes?: string
}

const RRULE: Record<Recurrence, string | undefined> = {
  none: undefined,
  monthly: 'FREQ=MONTHLY',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3',
  yearly: 'FREQ=YEARLY',
}

const compact = (date: ISODate) => date.replace(/-/g, '')
const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** Lignes de 75 octets maximum (RFC 5545), la suite précédée d'une espace. */
function fold(line: string): string {
  const parts: string[] = []
  let rest = line
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--
    parts.push(rest.slice(0, cut))
    rest = ` ${rest.slice(cut)}`
  }
  parts.push(rest)
  return parts.join('\r\n')
}

/**
 * Fichier .ics d'un événement, pour l'ajouter au calendrier de l'iPhone avec un rappel.
 * Sans heure : journée entière, rappel la veille à 18 h. Avec heure : heure locale, rappel 1 h avant.
 */
export function buildIcs(event: IcsEvent, now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Billy//App de suivi//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@billy`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeText(event.title)}`,
  ]
  if (event.time) {
    const start = `${compact(event.date)}T${event.time.replace(':', '')}00`
    lines.push(`DTSTART:${start}`, 'DURATION:PT1H')
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compact(event.date)}`, `DTEND;VALUE=DATE:${compact(addDays(event.date, 1))}`)
  }
  const rule = RRULE[event.recurrence]
  if (rule) lines.push(`RRULE:${rule}`)
  if (event.notes) lines.push(`DESCRIPTION:${escapeText(event.notes)}`)
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(event.title)}`,
    `TRIGGER:${event.time ? '-PT1H' : '-PT6H'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  )
  return `${lines.map(fold).join('\r\n')}\r\n`
}

export interface MealReminder {
  label: string
  /** « HH:MM », heure locale. */
  time: string
}

/**
 * Rappels quotidiens des repas : un événement répété chaque jour par repas, avec une alerte à l'heure dite.
 * Les identifiants sont fixes : réimporter le fichier met à jour les rappels au lieu de les doubler.
 */
export function buildMealsIcs(dogName: string, meals: MealReminder[], gramsPerMeal: number | undefined, start: ISODate, now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const portion = gramsPerMeal ? ` (${gramsPerMeal} g)` : ''
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Billy//App de suivi//FR', 'CALSCALE:GREGORIAN']
  meals.forEach((meal, i) => {
    const summary = escapeText(`Repas de ${dogName}${portion}`)
    lines.push(
      'BEGIN:VEVENT',
      `UID:repas-${i + 1}@billy`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeText(meal.label)}`,
      `DTSTART:${compact(start)}T${meal.time.replace(':', '')}00`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return `${lines.map(fold).join('\r\n')}\r\n`
}
