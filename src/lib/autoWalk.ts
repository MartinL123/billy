import { distanceMeters } from './community'
import { addDays, todayISO, type ISODate } from './dates'
import { formatHour, sortieName } from './walks'
import { distanceLabel } from './walkingBouts'

// T-122 (app iOS) : la balade enregistrée seule en sortant de chez soi. iOS réveille Flair à la sortie d'une zone de
// 150 m autour d'un point de départ ; l'iPhone enregistre le GPS jusqu'au retour (ou 3 h). Ce fichier décide quoi faire
// du tracé gardé : le proposer (« Balade enregistrée »), ou l'effacer (trop court, voiture, déjà couvert, trop vieux).
// Il ne dépend ni de Capacitor ni de Firestore.

/** Un point du tracé enregistré seul (comme ceux de la balade en cours). */
export interface AutoPoint {
  lat: number
  lng: number
  time: string
  /** m/s, si l'iPhone la connaît. */
  speed?: number
  accuracy?: number
}

/** Un tracé gardé sur l'iPhone, en attente de réponse. */
export interface AutoTrack {
  id: string
  startedAt: string
  endedAt: string
  points: AutoPoint[]
}

/** Un point de départ suivi : 150 m autour. */
export interface Home {
  lat: number
  lng: number
  name: string
}

export const HOME_RADIUS_M = 150
/** En dessous : les poubelles, la boîte aux lettres. */
export const MIN_AUTO_MINUTES = 10
export const MIN_AUTO_METERS = 300
/** Plus de 15 km/h tenus 2 min : une voiture, un vélo, un bus. */
export const CAR_KMH = 15
export const CAR_HOLD_MS = 2 * 60_000
/** Sans réponse, le tracé s'efface au bout de 14 jours. */
export const KEEP_DAYS = 14

export function trackMeters(points: AutoPoint[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += distanceMeters(points[i - 1]!, points[i]!)
  return sum
}

export const trackMinutes = (t: Pick<AutoTrack, 'startedAt' | 'endedAt'>) => Math.round((Date.parse(t.endedAt) - Date.parse(t.startedAt)) / 60_000)

/** Plus de 15 km/h tenus 2 min d'affilée (vitesse de l'iPhone, sinon calculée entre deux points). */
export function isCarTrip(points: AutoPoint[]): boolean {
  const limit = CAR_KMH / 3.6
  let since: number | undefined
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!
    const t = Date.parse(p.time)
    const dt = (t - Date.parse(points[i - 1]!.time)) / 1000
    const speed = p.speed !== undefined && p.speed >= 0 ? p.speed : dt > 0 ? distanceMeters(points[i - 1]!, p) / dt : 0
    if (speed > limit) {
      since ??= Date.parse(points[i - 1]!.time)
      if (t - since >= CAR_HOLD_MS) return true
    } else since = undefined
  }
  return false
}

interface EntryLike {
  route?: { startTime?: string; endTime?: string; durationMin?: number }
}

export type AutoVerdict = 'keep' | 'expired' | 'covered' | 'short' | 'car'

/**
 * Que faire du tracé : `keep` (le proposer), sinon l'effacer. `covered` : une balade (séance Watch, « Partir en balade »,
 * ou ce tracé déjà confirmé) couvre déjà ce moment.
 */
export function autoVerdict(track: AutoTrack, { walks, now }: { walks: EntryLike[]; now: number }): AutoVerdict {
  const start = Date.parse(track.startedAt)
  const end = Date.parse(track.endedAt)
  if (Number.isNaN(start) || Number.isNaN(end) || now - end > KEEP_DAYS * 86_400_000) return 'expired'
  const covered = walks.some((e) => {
    const s = e.route?.startTime ? Date.parse(e.route.startTime) : NaN
    if (Number.isNaN(s)) return false
    const parsed = e.route?.endTime ? Date.parse(e.route.endTime) : NaN
    const en = Number.isNaN(parsed) ? s + (e.route?.durationMin ?? 0) * 60_000 : parsed
    return s < end && en > start
  })
  if (covered) return 'covered'
  if (trackMinutes(track) < MIN_AUTO_MINUTES || trackMeters(track.points) < MIN_AUTO_METERS) return 'short'
  if (isCarTrip(track.points)) return 'car'
  return 'keep'
}

/** Les tracés à proposer, du plus ancien au plus récent ; et ceux à effacer. */
export function sortAutoTracks(tracks: AutoTrack[], ctx: { walks: EntryLike[]; now: number }): { keep: AutoTrack[]; drop: AutoTrack[] } {
  const keep: AutoTrack[] = []
  const drop: AutoTrack[] = []
  for (const t of tracks) (autoVerdict(t, ctx) === 'keep' ? keep : drop).push(t)
  return { keep: keep.sort((a, b) => a.startedAt.localeCompare(b.startedAt)), drop }
}

/** Les sorties repérées par l'iPhone (T-121) au même moment : la balade enregistrée seule les remplace. */
export function overlapsTrack<T extends { start: string; end: string }>(track: Pick<AutoTrack, 'startedAt' | 'endedAt'>, outings: T[]): T[] {
  const s = Date.parse(track.startedAt)
  const e = Date.parse(track.endedAt)
  return outings.filter((o) => Date.parse(o.start) < e && Date.parse(o.end) > s)
}

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function dayLabel(d: Date, today: ISODate): string {
  const iso = todayISO(d)
  if (iso === today) return 'Aujourd’hui'
  if (iso === addDays(today, -1)) return 'Hier'
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** « Aujourd’hui · 17 h 20 → 17 h 52 » et « 32 min · 1,9 km · sortie de l’après-midi ». */
export function autoWalkLines(track: AutoTrack, today: ISODate): { when: string; what: string } {
  const s = new Date(track.startedAt)
  const e = new Date(track.endedAt)
  const name = sortieName(hhmm(s))
  return {
    when: `${dayLabel(s, today)} · ${formatHour(hhmm(s))} → ${formatHour(hhmm(e))}`,
    what: `${trackMinutes(track)} min · ${distanceLabel(trackMeters(track.points))} · ${name.charAt(0).toLowerCase()}${name.slice(1)}`,
  }
}

interface WalkLike {
  route: { points: [number, number][] }
  commune?: string
}

/**
 * Les points de départ à proposer : les 2 départs les plus fréquents des balades passées (regroupés à 300 m près),
 * nommés par la commune la plus fréquente de leurs balades.
 */
export function homeSuggestions(walks: WalkLike[], max = 2): Home[] {
  const groups: { lat: number; lng: number; n: number; communes: Map<string, number> }[] = []
  for (const w of walks) {
    const first = w.route.points[0]
    if (!first) continue
    const at = { lat: first[0], lng: first[1] }
    let g = groups.find((x) => distanceMeters(x, at) <= 300)
    if (!g) {
      g = { lat: at.lat, lng: at.lng, n: 0, communes: new Map() }
      groups.push(g)
    }
    g.lat = (g.lat * g.n + at.lat) / (g.n + 1)
    g.lng = (g.lng * g.n + at.lng) / (g.n + 1)
    g.n += 1
    if (w.commune) g.communes.set(w.commune, (g.communes.get(w.commune) ?? 0) + 1)
  }
  return groups
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((g, i) => ({ lat: Math.round(g.lat * 1e5) / 1e5, lng: Math.round(g.lng * 1e5) / 1e5, name: [...g.communes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `Point de départ ${i + 1}` }))
}

// R-116 : la faire découvrir (carte de l'accueil) et prévenir au retour (notification locale).

/** Ce que Martin a répondu à la carte « Nouveau : vos balades s'enregistrent seules » (Firestore, champ optionnel). */
export interface AutoWalkCardState {
  /** Réglage choisi une fois (allumé ou éteint, depuis la carte ou Son profil) : la carte ne revient plus. */
  chosen?: boolean
  /** Nombre de « Plus tard ». */
  later?: number
  /** Jour du dernier « Plus tard ». */
  laterOn?: ISODate
}

export const CARD_LATER_DAYS = 7
export const CARD_MAX_LATER = 2

/** La carte de l'accueil : tant que le réglage n'a jamais été choisi ; « Plus tard » la cache 7 jours, 2 fois au plus. */
export function showAutoWalkCard(state: AutoWalkCardState | undefined, today: ISODate): boolean {
  if (state?.chosen) return false
  const later = state?.later ?? 0
  if (later >= CARD_MAX_LATER) return false
  return !(later > 0 && state?.laterOn && today < addDays(state.laterOn, CARD_LATER_DAYS))
}

/** « Plus tard » sur la carte. */
export const cardLater = (state: AutoWalkCardState | undefined, today: ISODate): AutoWalkCardState => ({ ...state, later: (state?.later ?? 0) + 1, laterOn: today })

/**
 * La notification au retour dans la zone : « Balade enregistrée » / « 32 min, 1,9 km. C'était avec Billy ? ».
 * Miroir : `AutoWalks.notice` (FlairNativePlugin.swift), mêmes textes.
 */
export function autoWalkNotice(track: AutoTrack, dogName: string): { title: string; body: string } {
  const name = dogName.trim() || 'votre chien'
  return { title: 'Balade enregistrée', body: `${trackMinutes(track)} min, ${distanceLabel(trackMeters(track.points))}. C’était avec ${name} ?` }
}
