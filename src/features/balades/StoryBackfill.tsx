import { useEffect, useRef } from 'react'
import { updateEntryStory } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { fromStored, readRoute } from '../../lib/route'
import { routePlaces, stopStreet } from '../../lib/street'
import { missingStory, stopsWithoutStreet, withStreets } from '../../lib/walkStory'
import { missingElevation } from '../../lib/walkHealth'
import { fetchWalkWeather, missingWeatherDetails, needsWeather, needsWeatherDetails } from '../../lib/openMeteo'
import { markNewStreets, missingFigures, samplePoints, streetsBefore, walkMs } from '../../lib/walkFacts'

/** Au plus 20 rues cherchées par ouverture : Nominatim reste ménagé, le reste viendra la fois suivante. */
const STREETS_PER_SESSION = 20
/** Au plus 30 météos cherchées par ouverture (Open-Meteo, une requête par balade) ; les autres viendront ensuite. */
const WEATHERS_PER_SESSION = 30
/** T-102 : au plus 60 requêtes à Nominatim par ouverture pour les rues et les lieux traversés (une par seconde). */
const PLACES_PER_SESSION = 60

/**
 * V6 § 3 : les balades qui ont un trajet daté reçoivent leurs arrêts, leur allure et leur dénivelé s’ils manquent
 * (calculés à l’import depuis T-079 et T-080), puis la rue de chaque arrêt quand le réseau est là (une requête par
 * seconde). V6 § 2.2 : une balade sans météo (GPS de Flair, GPX, Watch qui ne l’a pas notée) la reçoit d’Open-Meteo
 * quand le réseau est là, juste après l’import ou à une ouverture suivante. N’écrit que ce qui manque ; rien n’est effacé.
 * T-102 : km par km, vitesse max et cadence (calculés ici), les détails de la météo (ressenti, vent, pluie, moment de la
 * journée), puis les rues et lieux traversés (un point tous les 100 m, les balades les plus récentes d’abord, 60 requêtes
 * par ouverture ; une balade commencée va jusqu’au bout ou sera reprise en entier à l’ouverture suivante).
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
      const figures = missingFigures({ ...route, ...missing })
      Object.assign(missing, figures)
      if (Object.keys(missing).length) updateEntryStory(e.id, missing)
    }
  }, [entries])

  useEffect(() => {
    if (!online || weatherBusy.current || weatherAsked.current.size >= WEATHERS_PER_SESSION) return
    const todo = entries.filter((e) => (needsWeather(e.route) || needsWeatherDetails(e.route)) && !weatherAsked.current.has(e.id)).slice(0, WEATHERS_PER_SESSION - weatherAsked.current.size)
    if (!todo.length) return
    weatherBusy.current = true
    void (async () => {
      try {
        for (const e of todo) {
          weatherAsked.current.add(e.id)
          const start = e.route!.points[0]!
          const weather = await fetchWalkWeather(start.lat, start.lng, e.route!.startTime!, e.route!.endTime)
          // Entre-temps, la balade a pu être effacée ou recevoir sa météo.
          const now = latest.current.find((x) => x.id === e.id)
          if (!weather || !now?.route) continue
          if (!now.route.weather) updateEntryStory(e.id, { weather })
          else updateEntryStory(e.id, { weatherDetails: missingWeatherDetails(now.route.weather, weather) })
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

  // T-102 : les rues et les lieux traversés.
  const placesUsed = useRef(0)
  const placesTried = useRef(new Set<string>())
  const placesBusy = useRef(false)
  useEffect(() => {
    if (!online || placesBusy.current || placesUsed.current >= PLACES_PER_SESSION) return
    const todo = entries
      .filter((e) => e.route && !e.route.streets && (e.route.points?.length ?? 0) > 1 && !placesTried.current.has(e.id))
      .sort((a, b) => walkMs({ date: b.date, startTime: b.route!.startTime }) - walkMs({ date: a.date, startTime: a.route!.startTime }))
    if (!todo.length) return
    placesBusy.current = true
    void (async () => {
      try {
        for (const e of todo) {
          const samples = samplePoints(fromStored(e.route!.points))
          // Une balade de plus seulement si elle tient dans ce qui reste (la première passe toujours).
          if (placesUsed.current > 0 && placesUsed.current + samples.length > PLACES_PER_SESSION) break
          placesTried.current.add(e.id)
          placesUsed.current += samples.length
          const found = await routePlaces(samples)
          if (!found) break // hors ligne ou service muet : la suite à une prochaine ouverture
          const now = latest.current.find((x) => x.id === e.id)
          // Effacée, déjà complétée, ou recadrée entre-temps (autres points) : on n’écrit rien.
          if (!now?.route || now.route.streets || now.route.points?.length !== e.route!.points.length) continue
          const before = streetsBefore(
            latest.current.map((x) => ({ id: x.id, date: x.date, startTime: x.route?.startTime, streets: x.route?.streets })),
            { id: e.id, date: e.date, startTime: e.route!.startTime },
          )
          updateEntryStory(e.id, { streets: markNewStreets(found.streets, before), places: found.places })
        }
      } finally {
        placesBusy.current = false
      }
    })()
  }, [entries, online])

  return null
}
