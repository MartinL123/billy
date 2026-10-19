// Les sorties de Billy : 3 créneaux fixes par jour (matin, midi, soir), hors du jardin.
// Ce fichier n’importe rien : il est lu tel quel par le script d’envoi (scripts/rappel-soir.mjs) et par les tests.

export type WalkSlot = 'matin' | 'midi' | 'soir'

export const WALK_SLOTS: { id: WalkSlot; label: string }[] = [
  { id: 'matin', label: 'Matin' },
  { id: 'midi', label: 'Midi' },
  { id: 'soir', label: 'Soir' },
]

export type WalkTimes = Record<WalkSlot, string>

export const DEFAULT_WALK_TIMES: WalkTimes = { matin: '08:00', midi: '13:00', soir: '19:00' }

/** Après l’heure d’un créneau, la notification part encore pendant 90 minutes (retard des tâches planifiées), jamais avant. */
export const WALK_TOLERANCE_MINUTES = 90

/** users/{uid}/walks/{date} : l’heure (« HH:MM ») à laquelle chaque sortie a été cochée. */
export interface WalkDay {
  date: string
  done: Partial<Record<WalkSlot, string>>
  /** Sorties notées à la main, sans tracé (R-044) : leur durée en minutes. Une balade du même créneau la remplace. */
  noted?: Partial<Record<WalkSlot, number>>
}

const isTime = (value: unknown): value is string => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)

/** Les heures choisies dans le profil, complétées par celles par défaut. */
export function walkTimes(saved?: Partial<WalkTimes>): WalkTimes {
  return {
    matin: isTime(saved?.matin) ? saved.matin : DEFAULT_WALK_TIMES.matin,
    midi: isTime(saved?.midi) ? saved.midi : DEFAULT_WALK_TIMES.midi,
    soir: isTime(saved?.soir) ? saved.soir : DEFAULT_WALK_TIMES.soir,
  }
}

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export type WalkState = 'fait' | 'a-faire' | 'plus-tard'

/** Fait, à faire (l’heure est passée) ou plus tard dans la journée. */
export function walkState(time: string, doneAt: string | undefined, nowMinutes: number): WalkState {
  if (doneAt) return 'fait'
  return nowMinutes >= timeToMinutes(time) ? 'a-faire' : 'plus-tard'
}

/** Créneaux à rappeler maintenant : heure passée depuis moins de 90 min, sortie pas cochée, rappel pas encore envoyé. */
export function dueWalkSlots(times: WalkTimes, done: Partial<Record<WalkSlot, string>>, alreadySent: string[], nowMinutes: number): WalkSlot[] {
  return WALK_SLOTS.map((s) => s.id).filter((slot) => {
    if (done[slot] || alreadySent.includes(slot)) return false
    const late = nowMinutes - timeToMinutes(times[slot])
    return late >= 0 && late < WALK_TOLERANCE_MINUTES
  })
}

/**
 * « la sortie du matin », « de midi », « de l’après-midi », « du soir » : le nom suit l'heure réglée, pas le créneau
 * (audit R-025 : une sortie réglée à 14 h 30 n'est plus « de midi »).
 */
export function walkName(time: string): string {
  const minutes = timeToMinutes(time)
  if (minutes < 11 * 60) return 'la sortie du matin'
  if (minutes < 14 * 60) return 'la sortie de midi'
  if (minutes < 18 * 60) return 'la sortie de l’après-midi'
  return 'la sortie du soir'
}

/** « 8 h », « 13 h 30 ». */
export function formatHour(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)} h` : `${Number(h)} h ${m}`
}

/** Le texte de la notification : une invitation, jamais un reproche. */
export function walkReminderText(dogName: string, slot: WalkSlot, time: string): { title: string; body: string; tag: string; url: string } {
  const name = dogName.trim() || 'votre chien'
  return {
    title: `${formatHour(time)} : ${walkName(time)}`,
    body: `C’est l’heure de sortir ${name} 🐾 Hors du jardin, même 15 minutes.`,
    tag: `sortie-${slot}`,
    url: './#/',
  }
}

/**
 * Le créneau d’une balade importée (spec V4 § 1) : celui dont l’heure est la plus proche du départ, à 3 h près.
 * Une balade à 2 h du matin ne coche rien.
 */
export function slotForStart(times: WalkTimes, startMinutes: number): WalkSlot | undefined {
  const best = WALK_SLOTS.map((s) => ({ slot: s.id, gap: Math.abs(timeToMinutes(times[s.id]) - startMinutes) })).sort((a, b) => a.gap - b.gap)[0]
  return best && best.gap <= 180 ? best.slot : undefined
}
