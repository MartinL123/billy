import type { ISODate } from './dates'
import { formatHour, WALK_SLOTS, type WalkDay, type WalkSlot } from './walks'

// R-095 / R-098 : une sortie notée à la main, sans trajet (« Combien de temps ? », R-044) : elle vit dans
// users/{uid}/walks/{date} (`noted` : sa durée par créneau). Une balade rattachée au même créneau la remplace.

export interface NotedOuting {
  /** « 2026-10-23:matin » : l’identifiant dans l’adresse (`?sortie=`). */
  id: string
  date: ISODate
  slot: WalkSlot
  minutes: number
  /** L’heure notée (« 08:00 »), si on la sait. */
  time?: string
}

const SLOT_NAMES: Record<WalkSlot, string> = { matin: 'Sortie du matin', midi: 'Sortie de midi', soir: 'Sortie du soir' }

/** « Sortie du matin ». */
export const outingName = (slot: WalkSlot) => SLOT_NAMES[slot]

/** « vers 8 h » (l’heure du créneau), ou rien. */
export const outingAbout = (o: Pick<NotedOuting, 'time'>) => (o.time && /^\d{2}:\d{2}$/.test(o.time) ? `vers ${formatHour(o.time)}` : '')

export const outingId = (date: ISODate, slot: WalkSlot) => `${date}:${slot}`

/** L’identifiant lu dans l’adresse : sa date et son créneau, ou rien s’il est abîmé. */
export function parseOutingId(id: string): { date: ISODate; slot: WalkSlot } | undefined {
  const match = /^(\d{4}-\d{2}-\d{2}):(matin|midi|soir)$/.exec(id)
  return match ? { date: match[1]!, slot: match[2] as WalkSlot } : undefined
}

/**
 * Les sorties notées sans trajet, de la plus récente à la plus ancienne. Un créneau qui a sa balade (rattachée par
 * `walkSlot`) n’en est plus une : la balade la remplace.
 */
export function notedOutings(days: Pick<WalkDay, 'date' | 'done' | 'noted'>[], entries: { route?: unknown; walkSlot?: { date: string; creneau: string } }[]): NotedOuting[] {
  const withWalk = new Set(entries.filter((e) => e.route && e.walkSlot).map((e) => `${e.walkSlot!.date}:${e.walkSlot!.creneau}`))
  const out: NotedOuting[] = []
  for (const day of days) {
    for (const { id: slot } of WALK_SLOTS) {
      const minutes = day.noted?.[slot]
      if (!minutes || minutes <= 0 || withWalk.has(outingId(day.date, slot))) continue
      const time = day.done?.[slot]
      out.push({ id: outingId(day.date, slot), date: day.date, slot, minutes, ...(time ? { time } : {}) })
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || WALK_SLOTS.findIndex((s) => s.id === b.slot) - WALK_SLOTS.findIndex((s) => s.id === a.slot))
}
