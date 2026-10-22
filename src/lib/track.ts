import { distanceMeters } from './community'
import type { TimedPoint } from './balade'

// Le trajet daté d’une balade (spec V6 § 2.1) : un point toutes les 5 s au plus, avec son heure, son altitude et sa
// vitesse. Firestore refuse les tableaux de tableaux : des colonnes parallèles (`t`, `lat`, `lng`…), de même longueur.
// Ce fichier ne dépend ni de Capacitor ni de Firestore.

export interface Track {
  /** Secondes depuis `startTime`. */
  t: number[]
  /** 5 décimales (environ 1 m). */
  lat: number[]
  lng: number[]
  /** Mètres, 1 décimale. */
  alt?: number[]
  /** Vitesse en m/s, 2 décimales : celle du GPS quand il la donne, sinon calculée entre deux points. */
  v?: number[]
}

/** Un point toutes les 5 s au plus ; au-delà de 2 h de balade, toutes les 10 s. */
export const TRACK_STEP_S = 5
export const LONG_WALK_S = 2 * 3600
export const LONG_STEP_S = 10
/** Limite dure d’un document `entries/{id}` (Firestore accepte 1 Mio). */
export const MAX_ENTRY_BYTES = 900_000
/** Place gardée pour ce qui s’ajoute après l’import (repères, arrêts, cœur…). */
export const ENTRY_MARGIN_BYTES = 50_000

const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals

/**
 * Les points datés deviennent un trajet : seulement ceux qui ont une heure lisible et qui avancent dans le temps, un
 * toutes les 5 s (10 s au-delà de 2 h), le dernier toujours gardé. Moins de 2 points datés : pas de trajet.
 */
export function buildTrack(points: TimedPoint[], startTime?: string): Track | undefined {
  const timed: (TimedPoint & { ms: number })[] = []
  for (const p of points) {
    const ms = p.time ? Date.parse(p.time) : NaN
    if (Number.isNaN(ms) || (timed.length && ms < timed[timed.length - 1]!.ms)) continue
    timed.push({ ...p, ms })
  }
  if (timed.length < 2) return undefined
  const first = timed[0]!.ms
  const last = timed[timed.length - 1]!.ms
  const start = startTime && !Number.isNaN(Date.parse(startTime)) ? Math.min(Date.parse(startTime), first) : first
  const step = (last - first) / 1000 > LONG_WALK_S ? LONG_STEP_S : TRACK_STEP_S
  const kept: (TimedPoint & { ms: number })[] = []
  for (const p of timed) {
    const prev = kept[kept.length - 1]
    if (!prev || (p.ms - prev.ms) / 1000 >= step) kept.push(p)
  }
  if (kept[kept.length - 1] !== timed[timed.length - 1]) {
    // Le dernier point est toujours gardé : il remplace l’avant-dernier s’il est trop proche.
    if (kept.length > 1 && (last - kept[kept.length - 1]!.ms) / 1000 < step) kept.pop()
    kept.push(timed[timed.length - 1]!)
  }
  if (kept.length < 2) return undefined

  // Vitesse calculée : distance au point gardé précédent sur le temps écoulé (au suivant pour le premier).
  const computed = (i: number) => {
    const [a, b] = i === 0 ? [kept[0]!, kept[1]!] : [kept[i - 1]!, kept[i]!]
    const dt = (b.ms - a.ms) / 1000
    return dt > 0 ? distanceMeters(a, b) / dt : 0
  }
  const v = kept.map((p, i) => round(p.speed !== undefined && Number.isFinite(p.speed) && p.speed >= 0 ? p.speed : computed(i), 2))

  const track: Track = {
    t: kept.map((p) => Math.round((p.ms - start) / 1000)),
    lat: kept.map((p) => round(p.lat, 5)),
    lng: kept.map((p) => round(p.lng, 5)),
  }
  // Altitude : gardée si au moins un point la donne ; un trou prend la valeur connue la plus proche avant (ou après).
  const known = kept.map((p) => (p.alt !== undefined && Number.isFinite(p.alt) ? p.alt : undefined))
  const firstAlt = known.find((a) => a !== undefined)
  if (firstAlt !== undefined) {
    let lastAlt = firstAlt
    track.alt = known.map((a) => {
      if (a !== undefined) lastAlt = a
      return round(lastAlt, 1)
    })
  }
  track.v = v
  return track
}

/** Un trajet lu dans Firestore : colonnes de même longueur, sinon il est ignoré (lecture tolérante). */
export function readTrack(track: Track | undefined): Track | undefined {
  if (!track || !Array.isArray(track.t) || !Array.isArray(track.lat) || !Array.isArray(track.lng)) return undefined
  const n = track.t.length
  if (n < 2 || track.lat.length !== n || track.lng.length !== n) return undefined
  const out: Track = { t: track.t, lat: track.lat, lng: track.lng }
  if (Array.isArray(track.alt) && track.alt.length === n) out.alt = track.alt
  if (Array.isArray(track.v) && track.v.length === n) out.v = track.v
  return out
}

/** Nombre de points du trajet. */
export const trackLength = (track: Track) => track.t.length

/**
 * Taille d’une valeur dans un document Firestore, selon ses règles de calcul : nombre et date 8 octets, booléen et
 * null 1, texte en UTF-8 + 1, nom de champ en UTF-8 + 1.
 */
export function firestoreBytes(value: unknown): number {
  if (value === null || value === undefined || typeof value === 'boolean') return 1
  if (typeof value === 'number') return 8
  if (typeof value === 'string') return new TextEncoder().encode(value).length + 1
  if (Array.isArray(value)) return value.reduce((sum: number, v) => sum + firestoreBytes(v), 0)
  if (value instanceof Date) return 8
  if (typeof value === 'object') {
    let sum = 0
    for (const [key, v] of Object.entries(value)) if (v !== undefined) sum += new TextEncoder().encode(key).length + 1 + firestoreBytes(v)
    return sum
  }
  return 8
}

/** Un document entier : ses champs + 32 octets (le nom du document est compté à part, quelques dizaines d’octets). */
export const docBytes = (data: object) => firestoreBytes(data) + 32 + 100

/**
 * Allège le trajet jusqu’à tenir dans `budget` octets : un point sur 2, puis 1 sur 3… (le dernier toujours gardé).
 * Rien à faire la plupart du temps (3 h de balade ≈ 45 Ko).
 */
export function fitTrack(track: Track, budget: number): Track | undefined {
  if (firestoreBytes(track) <= budget) return track
  const n = track.t.length
  for (let every = 2; every < n; every++) {
    const keep = [...Array(n).keys()].filter((i) => i % every === 0 || i === n - 1)
    const pick = (column: number[]) => keep.map((i) => column[i]!)
    const thinned: Track = { t: pick(track.t), lat: pick(track.lat), lng: pick(track.lng) }
    if (track.alt) thinned.alt = pick(track.alt)
    if (track.v) thinned.v = pick(track.v)
    if (firestoreBytes(thinned) <= budget) return thinned
  }
  return undefined
}

/** Le trajet d’une entrée, allégé pour que tout le document reste sous 900 Ko (avec une marge pour la suite). */
export function trackForEntry(track: Track | undefined, entryWithoutTrack: object): Track | undefined {
  if (!track) return undefined
  return fitTrack(track, MAX_ENTRY_BYTES - ENTRY_MARGIN_BYTES - docBytes(entryWithoutTrack) - firestoreBytes('track'))
}
