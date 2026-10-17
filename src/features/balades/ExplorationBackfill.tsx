import { useEffect, useRef } from 'react'
import { backfillZones } from '../../firebase/exploration'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { useToday } from '../../lib/useToday'

/** Une seule fois par compte : les zones des balades tracées avant l'exploration rejoignent la carte, sans os. */
export function ExplorationBackfill() {
  const { dog, entries, exploration, online } = useData()
  const today = useToday()
  const started = useRef(false)
  useEffect(() => {
    if (started.current || dog.explorationBackfilled || dog.pending || !online) return
    started.current = true
    const routes = entries.flatMap((e) => {
      const route = readRoute(e.route)
      return route && route.points.length > 1 ? [route.points] : []
    })
    backfillZones(routes, exploration, today)
  }, [dog, entries, exploration, online, today])
  return null
}
