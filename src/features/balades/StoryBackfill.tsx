import { useEffect, useRef } from 'react'
import { updateEntryStory } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { stopStreet } from '../../lib/street'
import { missingStory, stopsWithoutStreet, withStreets } from '../../lib/walkStory'

/** Au plus 20 rues cherchées par ouverture : Nominatim reste ménagé, le reste viendra la fois suivante. */
const STREETS_PER_SESSION = 20

/**
 * V6 § 3 : les balades qui ont un trajet daté reçoivent leurs arrêts et leur allure s’ils manquent (calculés à l’import
 * depuis T-079), puis la rue de chaque arrêt quand le réseau est là (une requête par seconde). N’écrit que ce qui
 * manque ; rien n’est effacé.
 */
export function StoryBackfill() {
  const { entries, online } = useData()
  const latest = useRef(entries)
  latest.current = entries
  const computed = useRef(new Set<string>())
  const asked = useRef(new Set<string>())
  const busy = useRef(false)

  useEffect(() => {
    for (const e of entries) {
      if (!e.route?.track || computed.current.has(e.id)) continue
      computed.current.add(e.id)
      const missing = missingStory(readRoute(e.route) ?? {})
      if (missing) updateEntryStory(e.id, missing)
    }
  }, [entries])

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
