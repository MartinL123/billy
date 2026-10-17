import { useEffect, useRef, useState } from 'react'
import { addMarker, createMap, dot, fitPoints, onMarker, set3D, setLine, whenReady, type MapLibreMap } from '../../components/maplibre'
import { momentMarker } from './momentIcons'
import { Map3DToggle } from '../../components/Map3DToggle'
import { distanceMeters } from '../../lib/community'
import { distanceToRoute, NEAR_ROUTE, type Route } from '../../lib/route'

/** La grande carte d'un trajet : le chemin, le départ en vert, l'arrivée, les moments en couleur. Bouton 2D/3D. */
export function RouteMap({ route, onMoment, onTapRoute, onMissRoute }: { route: Route; onMoment?: (index: number) => void; /** Toucher le tracé (ou tout près) : y ajouter un repère. */ onTapRoute?: (at: { lat: number; lng: number }) => void; onMissRoute?: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [is3D, setIs3D] = useState(false)
  const handlers = useRef({ onTapRoute, onMissRoute })
  handlers.current = { onTapRoute, onMissRoute }

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { center: route.points[0] })
    map.current = m
    fitPoints(m, route.points, 36)
    whenReady(m, () => setLine(m, 'trajet', [route.points], { color: '#9A4413', width: 5 }))
    const first = route.points[0]
    const last = route.points[route.points.length - 1]
    if (first) addMarker(m, first, dot('#1E5A50', 18, 'Départ'))
    // Une boucle (arrivée à moins de 30 m du départ) : seulement le départ.
    if (first && last && route.points.length > 1 && distanceMeters({ lat: first[0], lng: first[1] }, { lat: last[0], lng: last[1] }) > 30) addMarker(m, last, dot('#18201E', 16, 'Arrivée'))
    route.moments.forEach((mo, i) => {
      const el = momentMarker(mo.type)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onMoment?.(i)
      })
      addMarker(m, [mo.lat, mo.lng], el)
    })
    m.on('click', (e) => {
      if (onMarker(e.originalEvent) || !handlers.current.onTapRoute) return
      const at = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (distanceToRoute(at, route.points) <= NEAR_ROUTE) handlers.current.onTapRoute(at)
      else handlers.current.onMissRoute?.()
    })
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  const toggle = (on: boolean) => {
    setIs3D(on)
    if (map.current) set3D(map.current, on)
  }

  return (
    <div className="relative isolate size-full">
      <div ref={host} role="img" aria-label="Carte du trajet" className="size-full" />
      <Map3DToggle on={is3D} onChange={toggle} />
    </div>
  )
}
