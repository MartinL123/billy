import { useEffect, useRef } from 'react'
import { backfillFog } from '../../firebase/fog'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { useToday } from '../../lib/useToday'

/** Une seule fois par compte (grille de 25 m) : tous les trajets enregistrés (tracés à la main compris) lèvent le brouillard, sans os. */
export function FogBackfill() {
  const { dog, entries, fog, online } = useData()
  const today = useToday()
  const started = useRef(false)
  useEffect(() => {
    if (started.current || dog.fog25Backfilled || dog.pending || !online) return
    started.current = true
    const tracks = entries.flatMap((e) => {
      const route = readRoute(e.route)
      return route && route.points.length > 1 ? [route.points.map(([lat, lng]) => ({ lat, lng }))] : []
    })
    backfillFog(tracks, fog, today)
  }, [dog, entries, fog, online, today])
  return null
}
