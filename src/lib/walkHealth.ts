import type { Pause } from './walkStory'

// Cœur, pas, dénivelé, énergie et pauses d’une balade (spec V6 § 2.1 et § 2.2). La Watch et Santé donnent des
// échantillons datés ; un GPX donne `gpxtpx:hr` point par point. Tout est ramené ici à ce qui est gardé dans
// `route` : une valeur de cœur par minute, des secondes depuis le départ. Ce fichier ne dépend ni de Capacitor ni de
// Firestore.

/** Un échantillon de rythme cardiaque daté (Santé ou GPX). */
export interface HrSample {
  time: string
  bpm: number
}

/** Une période datée (pause de la Watch). */
export interface TimeSpan {
  start: string
  end: string
}

/** La météo gardée avec la balade. */
export interface WalkWeather {
  tempC: number
  humidity?: number
  source: 'watch' | 'open-meteo'
}

/** Ce que Santé sait d’une balade (Watch, ou balade du GPS de Flair avec la Watch au poignet). */
export interface HealthExtras {
  hr?: HrSample[]
  steps?: number
  /** Énergie active, kcal. */
  energy?: number
}

/** Un rythme cardiaque hors de 30 à 240 bpm est une erreur de capteur : ignoré. */
const BPM_MIN = 30
const BPM_MAX = 240

/**
 * Une valeur par minute depuis `startTime` (bpm, arrondi) : la moyenne des échantillons de la minute. Une minute sans
 * échantillon reprend la valeur de la précédente (la première minute connue pour le début). Rien sans échantillon.
 */
export function hrPerMinute(samples: HrSample[] | undefined, startTime: string, endTime?: string): number[] | undefined {
  const start = Date.parse(startTime)
  const end = endTime ? Date.parse(endTime) : Infinity
  if (!samples?.length || Number.isNaN(start)) return undefined
  const sums: number[] = []
  const counts: number[] = []
  for (const s of samples) {
    const ms = Date.parse(s.time)
    if (Number.isNaN(ms) || ms < start || ms > end || !Number.isFinite(s.bpm) || s.bpm < BPM_MIN || s.bpm > BPM_MAX) continue
    const m = Math.floor((ms - start) / 60_000)
    sums[m] = (sums[m] ?? 0) + s.bpm
    counts[m] = (counts[m] ?? 0) + 1
  }
  if (!counts.length) return undefined
  const firstKnown = counts.findIndex((c) => c !== undefined)
  let last = Math.round(sums[firstKnown]! / counts[firstKnown]!)
  const out: number[] = []
  for (let m = 0; m < counts.length; m++) {
    if (counts[m]) last = Math.round(sums[m]! / counts[m]!)
    out.push(last)
  }
  return out
}

/** Les pauses de la Watch en secondes depuis le départ (pour les arrêts, V6 § 3). Celles qui ne se lisent pas sont ignorées. */
export function pausesSince(spans: TimeSpan[] | undefined, startTime: string): Pause[] | undefined {
  const start = Date.parse(startTime)
  if (!spans?.length || Number.isNaN(start)) return undefined
  const out = spans.flatMap((p) => {
    const a = Date.parse(p.start)
    const b = Date.parse(p.end)
    return Number.isNaN(a) || Number.isNaN(b) || b <= a ? [] : [{ startS: Math.max(0, Math.round((a - start) / 1000)), endS: Math.round((b - start) / 1000) }]
  })
  return out.length ? out : undefined
}

/** Le bruit du GPS sur l’altitude : une variation de moins de 3 m n’est pas comptée. */
export const ELEVATION_STEP_M = 3

/**
 * Dénivelé positif et négatif (m, arrondis) sur l’altitude du trajet, avec une hystérésis de 3 m : l’altitude de
 * référence ne bouge que quand on s’en écarte de 3 m ou plus. Rien sans altitude.
 */
export function elevation(alt: number[] | undefined, step = ELEVATION_STEP_M): { ascentM: number; descentM: number } | undefined {
  const values = (alt ?? []).filter((a) => Number.isFinite(a))
  if (values.length < 2) return undefined
  let ref = values[0]!
  let up = 0
  let down = 0
  for (const a of values) {
    if (a - ref >= step) {
      up += a - ref
      ref = a
    } else if (ref - a >= step) {
      down += ref - a
      ref = a
    }
  }
  return { ascentM: Math.round(up), descentM: Math.round(down) }
}

/** Le dénivelé d’une balade qui a un trajet daté avec altitude, s’il n’est pas encore calculé (rattrapage). */
export function missingElevation(route: { track?: { alt?: number[] }; ascentM?: number; descentM?: number }): { ascentM: number; descentM: number } | undefined {
  if (route.ascentM !== undefined || route.descentM !== undefined) return undefined
  return elevation(route.track?.alt)
}

/** La météo notée par la Watch (température en °C, humidité en %), si elle est lisible. */
export function watchWeather(w: { tempC?: number; humidity?: number } | undefined): WalkWeather | undefined {
  if (!w || typeof w.tempC !== 'number' || !Number.isFinite(w.tempC)) return undefined
  const humidity = typeof w.humidity === 'number' && Number.isFinite(w.humidity) ? Math.round(w.humidity) : undefined
  return { tempC: Math.round(w.tempC * 10) / 10, ...(humidity !== undefined ? { humidity } : {}), source: 'watch' }
}

/** Un nombre positif arrondi (pas, kcal), sinon rien. */
export const positiveRound = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined)
