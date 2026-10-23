import { useEffect, useState } from 'react'
import { coarse, forecastUrl, hourKey, nextHourFromResponse, type NextHourWeather } from './openMeteo'

// T-118 : la météo de l’heure qui vient (Open-Meteo, sans clé). Une requête par heure au plus : la réponse est gardée en
// mémoire et sur l’appareil (localStorage), avec l’heure et la position arrondie. Hors ligne ou sans réponse : rien.

const KEY = 'flair.meteo-heure'

type Cached = { hour: string; at: string; weather: NextHourWeather | null }

let memory: Cached | undefined
let pending: { id: string; promise: Promise<NextHourWeather | undefined> } | undefined

function readCache(): Cached | undefined {
  if (memory) return memory
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    memory = raw ? (JSON.parse(raw) as Cached) : undefined
  } catch {
    memory = undefined
  }
  return memory
}

function writeCache(value: Cached) {
  memory = value
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(value))
  } catch {
    // Stockage indisponible : la mémoire suffit jusqu’à la prochaine ouverture.
  }
}

async function load(lat: number, lng: number): Promise<NextHourWeather | undefined> {
  const now = new Date()
  const hour = hourKey(now)
  const at = `${coarse(lat)},${coarse(lng)}`
  const cached = readCache()
  // Déjà demandée cette heure-ci, à cet endroit (même sans réponse utile) : pas de nouvelle requête.
  if (cached && cached.hour === hour && cached.at === at) return cached.weather ?? undefined
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  const id = `${hour}|${at}`
  if (pending?.id === id) return pending.promise
  const url = forecastUrl(lat, lng)
  if (!url) return undefined
  const promise = fetch(url, { signal: AbortSignal.timeout(6000) })
    .then(async (response) => {
      const weather = response.ok ? nextHourFromResponse(await response.json(), now) : undefined
      writeCache({ hour, at, weather: weather ?? null })
      return weather
    })
    .catch(() => undefined)
  pending = { id, promise }
  return promise
}

/** La météo de l’heure qui vient à cet endroit ; `undefined` tant qu’elle n’est pas connue (ou sans endroit). */
export function useNextHourWeather(at: { lat: number; lng: number } | undefined): NextHourWeather | undefined {
  const lat = at ? Number(coarse(at.lat)) : undefined
  const lng = at ? Number(coarse(at.lng)) : undefined
  const [weather, setWeather] = useState<{ id: string; value: NextHourWeather | undefined }>()
  const id = lat === undefined || lng === undefined ? '' : `${lat},${lng}`
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    let live = true
    void load(lat, lng).then((value) => live && setWeather({ id: `${lat},${lng}`, value }))
    return () => {
      live = false
    }
  }, [lat, lng])
  return weather?.id === id ? weather.value : undefined
}
