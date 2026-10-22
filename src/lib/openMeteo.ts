import type { WalkWeather } from './walkHealth'

// La météo d’une balade sans météo de la Watch (GPS de Flair, GPX) : Open-Meteo, gratuit et sans clé (spec V6 § 2.2).
// Une requête par balade, à l’heure et au point de départ. Seule une position arrondie à 2 décimales (environ 1 km)
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
  const common = `latitude=${coarse(lat)}&longitude=${coarse(lng)}&hourly=temperature_2m,relative_humidity_2m&timezone=UTC`
  const days = Math.round((Date.parse(utcDay(now.getTime())) - Date.parse(utcDay(start))) / DAY_MS)
  if (days > ARCHIVE_AFTER_DAYS) return `https://archive-api.open-meteo.com/v1/archive?${common}&start_date=${utcDay(start)}&end_date=${utcDay(start)}`
  return `https://api.open-meteo.com/v1/forecast?${common}&past_days=${days + 1}&forecast_days=1`
}

interface OpenMeteoHourly {
  hourly?: { time?: unknown; temperature_2m?: unknown; relative_humidity_2m?: unknown }
}

/** La température (°C, 1 décimale) et l’humidité (%) de l’heure de départ, lues dans la réponse ; rien si elles manquent. */
export function weatherFromResponse(json: OpenMeteoHourly | null | undefined, startTime: string): WalkWeather | undefined {
  const start = Date.parse(startTime)
  const h = json?.hourly
  if (Number.isNaN(start) || !h || !Array.isArray(h.time) || !Array.isArray(h.temperature_2m)) return undefined
  const i = h.time.indexOf(utcHour(start))
  const temp = h.temperature_2m[i]
  if (i < 0 || typeof temp !== 'number' || !Number.isFinite(temp)) return undefined
  const hum = Array.isArray(h.relative_humidity_2m) ? h.relative_humidity_2m[i] : undefined
  return { tempC: Math.round(temp * 10) / 10, ...(typeof hum === 'number' && Number.isFinite(hum) ? { humidity: Math.round(hum) } : {}), source: 'open-meteo' }
}

/** Une balade qui attend sa météo : une heure de départ, un point de départ, pas encore de météo. */
export function needsWeather(route: { startTime?: string; weather?: unknown; points?: { lat: number; lng: number }[] } | undefined): boolean {
  return Boolean(route && !route.weather && route.startTime && !Number.isNaN(Date.parse(route.startTime)) && route.points?.length)
}

/** Hors ligne, ou sans réponse en 6 s : rien, sans message (la météo sera cherchée à une prochaine ouverture). */
export async function fetchWalkWeather(lat: number, lng: number, startTime: string): Promise<WalkWeather | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  const url = weatherUrl(lat, lng, startTime, new Date())
  if (!url) return undefined
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!response.ok) return undefined
    return weatherFromResponse(await response.json(), startTime)
  } catch {
    return undefined
  }
}
