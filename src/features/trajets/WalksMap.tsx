import { useEffect, useRef } from 'react'
import { addMarker, createMap, dot, fitPoints, setLine, whenReady } from '../../components/maplibre'
import { GOOD_COLOR, HARD_COLOR, isHardMoment, type Route } from '../../lib/route'

/** Tous les trajets du mois superposés : traits fins, peurs et grognes en rouge, réussites en vert. */
export function WalksMap({ routes }: { routes: Route[] }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current || routes.length === 0) return
    const map = createMap(host.current, { center: routes[0]!.points[0] })
    fitPoints(map, routes.flatMap((r) => r.points), 24)
    whenReady(map, () => setLine(map, 'balades', routes.map((r) => r.points), { color: '#9A4413', width: 4, opacity: 0.55 }))
    // Les réussites d'abord, les peurs par-dessus : on les voit toujours.
    const moments = routes.flatMap((r) => r.moments).sort((a, b) => Number(isHardMoment(a)) - Number(isHardMoment(b)))
    for (const m of moments) addMarker(map, [m.lat, m.lng], dot(isHardMoment(m) ? HARD_COLOR : GOOD_COLOR, 16))
    return () => map.remove()
  }, [routes])
  return <div ref={host} role="img" aria-label="Carte de ses balades du mois" className="isolate size-full" />
}
