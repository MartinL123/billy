import { todayISO, type ISODate } from './dates'
import { slotForStart, WALK_SLOTS, type WalkSlot, type WalkTimes } from './walks'

// T-121 : sans séance Watch, Santé compte quand même la distance à pied (iPhone en poche, Watch au poignet, fusionnés
// sans doublon). L'app iOS la lit par tranches de 5 min (`getWalkingBouts`) ; ce fichier y repère les sorties :
// « Mar. 7 nov. · 17 h 20 · 30 min · 1,8 km », à confirmer d'un toucher (« C'était avec Billy » / « Pas avec lui »).
// Ce fichier ne dépend ni de Capacitor ni de Firestore.

/** Une tranche de 5 min de Santé : son début (ISO) et la distance à pied (m). */
export interface DistanceBucket {
  start: string
  meters: number
}

/** Une sortie repérée, gardée dans users/{uid}/walks/{date}.detected (champ optionnel). */
export interface DetectedOuting {
  /** Début et fin, ISO. */
  start: string
  end: string
  meters: number
  /** `pending` : à confirmer ; `yes` : notée avec le chien ; `no` : « Pas avec lui », plus jamais proposée. */
  status: 'pending' | 'yes' | 'no'
  /** Le créneau au moment du repérage (matin, midi, soir). */
  slot?: WalkSlot
}

export const BUCKET_MS = 5 * 60_000
/** Une tranche où l'on marche : 150 m ou plus en 5 min. */
export const ACTIVE_METERS = 150
/** Deux blocs séparés de 10 min ou moins (un arrêt, une porte) n'en font qu'un. */
export const MERGE_GAP_MS = 10 * 60_000
/** Une sortie : 15 min et 400 m au moins. */
export const MIN_MINUTES = 15
export const MIN_METERS = 400
/** La première lecture remonte 14 jours en arrière. */
export const LOOKBACK_DAYS = 14

const pad = (n: number) => String(n).padStart(2, '0')
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Une sortie trouvée, avec ce qu'il faut pour la noter. */
export interface FoundOuting {
  start: string
  end: string
  meters: number
  minutes: number
  date: ISODate
  slot: WalkSlot
  /** « HH:MM » : l'heure de départ (heure de l'iPhone), gardée comme heure de la sortie notée. */
  time: string
}

interface EntryLike {
  route?: { startTime?: string; endTime?: string; durationMin?: number }
}

interface DayLike {
  date: string
  done?: Partial<Record<WalkSlot, string>>
  noted?: Partial<Record<WalkSlot, number>>
}

/** Les spans occupés : balades avec tracé (Watch, GPS, import) et sorties déjà notées (leur heure et leur durée). */
function busySpans(walks: EntryLike[], noted: DayLike[]): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = []
  for (const e of walks) {
    const start = e.route?.startTime ? Date.parse(e.route.startTime) : NaN
    if (Number.isNaN(start)) continue
    const endParsed = e.route?.endTime ? Date.parse(e.route.endTime) : NaN
    spans.push({ start, end: Number.isNaN(endParsed) ? start + (e.route?.durationMin ?? 0) * 60_000 : endParsed })
  }
  for (const day of noted) {
    for (const { id: slot } of WALK_SLOTS) {
      const minutes = day.noted?.[slot]
      const time = day.done?.[slot]
      if (!minutes || !time || !/^\d{2}:\d{2}$/.test(time)) continue
      const start = new Date(`${day.date}T${time}:00`).getTime()
      if (!Number.isNaN(start)) spans.push({ start, end: start + minutes * 60_000 })
    }
  }
  return spans
}

/**
 * Les sorties dans les tranches de distance : les tranches à 150 m ou plus, recollées quand 10 min ou moins les
 * séparent, gardées à partir de 15 min et 400 m. Un bloc qui chevauche une balade (tracé) ou une sortie déjà notée est
 * écarté (une seule balade pour un même moment), comme un bloc sans créneau (en pleine nuit) ou dont le créneau est
 * déjà fait ce jour-là.
 */
export function detectOutings(buckets: DistanceBucket[], { walks, noted, times }: { walks: EntryLike[]; noted: DayLike[]; times: WalkTimes }): FoundOuting[] {
  const all = buckets
    .map((b) => ({ start: Date.parse(b.start), meters: b.meters }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.meters) && b.meters > 0)
    .sort((a, b) => a.start - b.start)
  const blocks: { start: number; end: number }[] = []
  for (const b of all) {
    if (b.meters < ACTIVE_METERS) continue
    const last = blocks[blocks.length - 1]
    if (last && b.start - last.end <= MERGE_GAP_MS) last.end = b.start + BUCKET_MS
    else blocks.push({ start: b.start, end: b.start + BUCKET_MS })
  }
  const busy = busySpans(walks, noted)
  const out: FoundOuting[] = []
  for (const block of blocks) {
    // La distance de tout le bloc, arrêts compris.
    const meters = Math.round(all.filter((b) => b.start >= block.start && b.start < block.end).reduce((sum, b) => sum + b.meters, 0))
    const minutes = Math.round((block.end - block.start) / 60_000)
    if (minutes < MIN_MINUTES || meters < MIN_METERS) continue
    if (busy.some((s) => s.start < block.end && s.end > block.start)) continue
    const start = new Date(block.start)
    const slot = slotForStart(times, start.getHours() * 60 + start.getMinutes())
    if (!slot) continue
    const date = todayISO(start)
    if (noted.find((d) => d.date === date)?.done?.[slot]) continue
    out.push({ start: start.toISOString(), end: new Date(block.end).toISOString(), meters, minutes, date, slot, time: localTime(start) })
  }
  return out
}

/**
 * Ce qu'il faut écrire, jour par jour : les sorties nouvelles ajoutées en `pending` à celles déjà gardées (reconnues
 * par leur début). Rien pour un jour sans nouveauté : pas d'écriture inutile.
 */
export function newDetected(found: FoundOuting[], days: { date: string; detected?: DetectedOuting[] }[]): Map<ISODate, DetectedOuting[]> {
  const out = new Map<ISODate, DetectedOuting[]>()
  for (const f of found) {
    const kept = out.get(f.date) ?? [...(days.find((d) => d.date === f.date)?.detected ?? [])]
    if (kept.some((d) => d.start === f.start)) continue
    kept.push({ start: f.start, end: f.end, meters: f.meters, status: 'pending', slot: f.slot })
    out.set(f.date, kept)
  }
  return out
}

/** Une sortie à confirmer, telle que la liste la montre. */
export interface PendingOuting extends DetectedOuting {
  date: ISODate
  minutes: number
  slot: WalkSlot
  time: string
}

/**
 * Les sorties encore à confirmer, de la plus récente à la plus ancienne. Une sortie couverte depuis par une balade
 * (séance Watch lue après coup) ou dont le créneau a été fait autrement ne se propose plus.
 */
export function pendingOutings(days: (DayLike & { detected?: DetectedOuting[] })[], walks: EntryLike[], times: WalkTimes): PendingOuting[] {
  const busy = busySpans(walks, [])
  const out: PendingOuting[] = []
  for (const day of days) {
    for (const d of day.detected ?? []) {
      if (d.status !== 'pending') continue
      const start = Date.parse(d.start)
      const end = Date.parse(d.end)
      if (Number.isNaN(start) || Number.isNaN(end)) continue
      if (busy.some((s) => s.start < end && s.end > start)) continue
      const at = new Date(start)
      const slot = d.slot ?? slotForStart(times, at.getHours() * 60 + at.getMinutes())
      if (!slot || day.done?.[slot]) continue
      out.push({ ...d, date: day.date, slot, minutes: Math.round((end - start) / 60_000), time: localTime(at) })
    }
  }
  return out.sort((a, b) => b.start.localeCompare(a.start))
}

/** La réponse donnée : la liste du jour, avec ce statut sur la sortie (reconnue par son début). */
export const answerDetected = (detected: DetectedOuting[], start: string, status: 'yes' | 'no'): DetectedOuting[] => detected.map((d) => (d.start === start ? { ...d, status } : d))

/** La sortie confirmée d'un créneau (pour « Repérée par l'iPhone » dans le journal), s'il y en a une. */
export function confirmedFor(detected: DetectedOuting[] | undefined, slot: WalkSlot, time: string | undefined): DetectedOuting | undefined {
  return detected?.find((d) => d.status === 'yes' && (d.slot === undefined || d.slot === slot) && (!time || localTime(new Date(d.start)) === time))
}

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « 1,8 km » ; « 850 m » sous le kilomètre. */
export function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

/** « Mar. 7 nov. · 17 h 20 · 30 min · 1,8 km ». */
export function outingCardLine(o: Pick<PendingOuting, 'start' | 'minutes' | 'meters'>): string {
  const d = new Date(o.start)
  const hour = `${d.getHours()} h${d.getMinutes() ? ` ${pad(d.getMinutes())}` : ''}`
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${hour} · ${o.minutes} min · ${distanceLabel(o.meters)}`
}

/** « 3 sorties repérées par votre iPhone ». */
export const bannerLine = (count: number) => (count > 1 ? `${count} sorties repérées par votre iPhone` : '1 sortie repérée par votre iPhone')
