import { daylightMoment } from './walkFacts'
import type { WalkWeather } from './walkHealth'

// La météo d’une balade sans météo de la Watch (GPS de Flair, GPX) : Open-Meteo, gratuit et sans clé (spec V6 § 2.2).
// Une requête par balade, à l’heure et au point de départ : température, humidité, ressenti, vent, pluie, et le lever et le
// coucher du soleil du jour (T-102). Seule une position arrondie à 2 décimales (environ 1 km)
// part chez Open-Meteo, jamais le trajet.

/** Au-delà de 7 jours, l’historique (archive) ; avant, les prévisions avec `past_days` (l’archive a quelques jours de retard). */
export const ARCHIVE_AFTER_DAYS = 7
const DAY_MS = 86_400_000

/** La position envoyée : 2 décimales, environ 1 km. */
export const coarse = (n: number) => n.toFixed(2)

/** Le jour UTC (« 2026-10-12 ») et l’heure UTC (« 2026-10-12T14:00 ») d’une heure ISO, comme Open-Meteo les écrit en UTC. */
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const utcHour = (ms: number) => `${new Date(ms).toISOString().slice(0, 13)}:00`

/** L’adresse de la requête, ou rien si l’heure de départ ne se lit pas ou est dans le futur. */
export function weatherUrl(lat: number, lng: number, startTime: string, now: Date): string | undefined {
  const start = Date.parse(startTime)
  if (Number.isNaN(start) || start > now.getTime() || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  const common = `latitude=${coarse(lat)}&longitude=${coarse(lng)}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation&daily=sunrise,sunset&timezone=UTC`
  const days = Math.round((Date.parse(utcDay(now.getTime())) - Date.parse(utcDay(start))) / DAY_MS)
  if (days > ARCHIVE_AFTER_DAYS) return `https://archive-api.open-meteo.com/v1/archive?${common}&start_date=${utcDay(start)}&end_date=${utcDay(start)}`
  return `https://api.open-meteo.com/v1/forecast?${common}&past_days=${days + 1}&forecast_days=1`
}

interface OpenMeteoHourly {
  hourly?: { time?: unknown; temperature_2m?: unknown; relative_humidity_2m?: unknown; apparent_temperature?: unknown; wind_speed_10m?: unknown; precipitation?: unknown }
  daily?: { time?: unknown; sunrise?: unknown; sunset?: unknown }
}

const num = (list: unknown, i: number): number | undefined => {
  const v = Array.isArray(list) ? list[i] : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}
/** Open-Meteo écrit ses heures UTC sans fuseau (« 2026-10-20T05:58 »). */
const utcMs = (text: unknown) => (typeof text === 'string' ? Date.parse(`${text}Z`) : NaN)

/** La pluie (mm) des heures de la balade : chaque valeur horaire est celle de l’heure qui précède son libellé. */
function rainDuring(times: unknown[], rain: unknown, start: number, end: number): number | undefined {
  let total: number | undefined
  times.forEach((t, i) => {
    const ms = utcMs(t)
    const mm = num(rain, i)
    if (mm === undefined || !(ms > start && ms - 3_600_000 < Math.max(end, start + 1))) return
    total = (total ?? 0) + mm
  })
  return total === undefined ? undefined : Math.round(total * 10) / 10
}

/**
 * Température (°C, 1 décimale), humidité (%), ressenti, vent (km/h) de l’heure de départ, pluie pendant la balade, et le
 * moment de la journée (lever et coucher du soleil du jour). Rien si la température de l’heure de départ manque.
 */
export function weatherFromResponse(json: OpenMeteoHourly | null | undefined, startTime: string, endTime?: string): WalkWeather | undefined {
  const start = Date.parse(startTime)
  const h = json?.hourly
  if (Number.isNaN(start) || !h || !Array.isArray(h.time) || !Array.isArray(h.temperature_2m)) return undefined
  const i = h.time.indexOf(utcHour(start))
  const temp = num(h.temperature_2m, i)
  if (i < 0 || temp === undefined) return undefined
  const end = endTime && !Number.isNaN(Date.parse(endTime)) ? Date.parse(endTime) : undefined
  const hum = num(h.relative_humidity_2m, i)
  const feels = num(h.apparent_temperature, i)
  const wind = num(h.wind_speed_10m, i)
  const rain = rainDuring(h.time, h.precipitation, start, end ?? start)
  const d = json?.daily
  const day = Array.isArray(d?.time) ? d.time.indexOf(utcDay(start)) : -1
  const sunrise = day >= 0 && Array.isArray(d?.sunrise) ? utcMs(d.sunrise[day]) : NaN
  const sunset = day >= 0 && Array.isArray(d?.sunset) ? utcMs(d.sunset[day]) : NaN
  const daylight = Number.isNaN(sunrise) || Number.isNaN(sunset) ? undefined : daylightMoment(start, end, sunrise, sunset)
  return {
    tempC: Math.round(temp * 10) / 10,
    ...(hum !== undefined ? { humidity: Math.round(hum) } : {}),
    source: 'open-meteo',
    ...(feels !== undefined ? { feelsC: Math.round(feels * 10) / 10 } : {}),
    ...(wind !== undefined ? { windKmh: Math.round(wind) } : {}),
    ...(rain !== undefined ? { rainMm: rain } : {}),
    ...(daylight ? { daylight } : {}),
  }
}

/** Les détails qui manquent à une météo déjà gardée (Watch, ou avant T-102) : seulement eux, jamais par-dessus. */
export function missingWeatherDetails(current: WalkWeather, fetched: WalkWeather): Partial<Pick<WalkWeather, 'feelsC' | 'windKmh' | 'rainMm' | 'daylight'>> {
  const out: Partial<Pick<WalkWeather, 'feelsC' | 'windKmh' | 'rainMm' | 'daylight'>> = {}
  for (const k of ['feelsC', 'windKmh', 'rainMm', 'daylight'] as const) if (current[k] === undefined && fetched[k] !== undefined) (out as Record<string, unknown>)[k] = fetched[k]
  return out
}

/** Une balade qui attend sa météo : une heure de départ, un point de départ, pas encore de météo. */
export function needsWeather(route: { startTime?: string; weather?: unknown; points?: { lat: number; lng: number }[] } | undefined): boolean {
  return Boolean(route && !route.weather && route.startTime && !Number.isNaN(Date.parse(route.startTime)) && route.points?.length)
}

/** Une balade dont la météo n’a pas encore ses détails (T-102) : ressenti, vent, pluie, moment de la journée. */
export function needsWeatherDetails(route: { startTime?: string; weather?: { daylight?: unknown }; points?: { lat: number; lng: number }[] } | undefined): boolean {
  return Boolean(route?.weather && route.weather.daylight === undefined && route.startTime && !Number.isNaN(Date.parse(route.startTime)) && route.points?.length)
}

/** Hors ligne, ou sans réponse en 6 s : rien, sans message (la météo sera cherchée à une prochaine ouverture). */
export async function fetchWalkWeather(lat: number, lng: number, startTime: string, endTime?: string): Promise<WalkWeather | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  const url = weatherUrl(lat, lng, startTime, new Date())
  if (!url) return undefined
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!response.ok) return undefined
    return weatherFromResponse(await response.json(), startTime, endTime)
  } catch {
    return undefined
  }
}
