import { useEffect, useRef } from 'react'
import { updateEntryStory } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { missingStory, stopsWithoutStreet, withStreets } from '../../lib/walkStory'
import { missingElevation } from '../../lib/walkHealth'
import { fetchWalkWeather, needsWeather } from '../../lib/openMeteo'

/** Au plus 20 rues cherchées par ouverture : Nominatim reste ménagé, le reste viendra la fois suivante. */
const STREETS_PER_SESSION = 20
/** Au plus 30 météos cherchées par ouverture (Open-Meteo, une requête par balade) ; les autres viendront ensuite. */
const WEATHERS_PER_SESSION = 30

/**
 * V6 § 3 : les balades qui ont un trajet daté reçoivent leurs arrêts, leur allure et leur dénivelé s’ils manquent
 * (calculés à l’import depuis T-079 et T-080), puis la rue de chaque arrêt quand le réseau est là (une requête par
 * seconde). V6 § 2.2 : une balade sans météo (GPS de Flair, GPX, Watch qui ne l’a pas notée) la reçoit d’Open-Meteo
 * quand le réseau est là, juste après l’import ou à une ouverture suivante. N’écrit que ce qui manque ; rien n’est effacé.
 */
export function StoryBackfill() {
  const { entries, online } = useData()
  const latest = useRef(entries)
  latest.current = entries
  const computed = useRef(new Set<string>())
  const asked = useRef(new Set<string>())
  const busy = useRef(false)
  const weatherAsked = useRef(new Set<string>())
  const weatherBusy = useRef(false)

  useEffect(() => {
    for (const e of entries) {
      if (!e.route?.track || computed.current.has(e.id)) continue
      computed.current.add(e.id)
      const route = readRoute(e.route) ?? {}
      const missing = { ...missingStory(route), ...missingElevation(route) }
      if (Object.keys(missing).length) updateEntryStory(e.id, missing)
    }
  }, [entries])

  useEffect(() => {
    if (!online || weatherBusy.current || weatherAsked.current.size >= WEATHERS_PER_SESSION) return
    const todo = entries.filter((e) => needsWeather(e.route) && !weatherAsked.current.has(e.id)).slice(0, WEATHERS_PER_SESSION - weatherAsked.current.size)
    if (!todo.length) return
    weatherBusy.current = true
    void (async () => {
      try {
        for (const e of todo) {
          weatherAsked.current.add(e.id)
          const start = e.route!.points[0]!
          const weather = await fetchWalkWeather(start.lat, start.lng, e.route!.startTime!)
          // Entre-temps, la balade a pu être effacée ou recevoir sa météo.
          const now = latest.current.find((x) => x.id === e.id)
          if (weather && now && !now.route?.weather) updateEntryStory(e.id, { weather })
        }
      } finally {
        weatherBusy.current = false
      }
    })()
  }, [entries, online])

  useEffect(() => {
    if (!online || busy.current) return
    const todo = entries.flatMap((e) => stopsWithoutStreet(e.route?.stops).filter((s) => !asked.current.has(`${e.id}:${s.at}`)).map((s) => ({ id: e.id, stop: s })))
    if (!todo.length || asked.current.size >= STREETS_PER_SESSION) return
    busy.current = true
    void (async () => {
      try {
        const found = new Map<string, Map<number, string>>()
        for (const { id, stop } of todo.slice(0, STREETS_PER_SESSION - asked.current.size)) {
          asked.current.add(`${id}:${stop.at}`)
          const street = await stopStreet(stop.lat, stop.lng)
          if (street) found.set(id, (found.get(id) ?? new Map()).set(stop.at, street))
        }
        // Les arrêts tels qu’ils sont maintenant (un repère a pu être ajouté entre-temps), complétés de leurs rues.
        for (const [id, streets] of found) {
          const stops = latest.current.find((e) => e.id === id)?.route?.stops
          if (!stops) continue
          const next = withStreets(stops, streets)
          if (next !== stops) updateEntryStory(id, { stops: next })
        }
      } finally {
        busy.current = false
      }
    })()
  }, [entries, online])

  return null
}
