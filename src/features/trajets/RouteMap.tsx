import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { routeMomentInfo, type Route } from '../../lib/route'

const dot = (color: string, size: number) => L.divIcon({ className: '', html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-50%,-50%)"></span>`, iconSize: [0, 0] })

/** La grande carte d'un trajet, dans le détail d'un moment : le chemin, le départ en vert, les moments en couleur. */
export function RouteMap({ route, onMoment }: { route: Route; onMoment?: (index: number) => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current) return
    const map = L.map(host.current, { zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    const line = L.polyline(route.points, { color: '#9A4413', weight: 5 }).addTo(map)
    if (route.points[0]) L.marker(route.points[0], { icon: dot('#1E5A50', 18), interactive: false }).addTo(map)
    route.moments.forEach((m, i) => {
      const marker = L.marker([m.lat, m.lng], { icon: dot(routeMomentInfo(m.type).color, 20), title: routeMomentInfo(m.type).label }).addTo(map)
      marker.on('click', () => onMoment?.(i))
    })
    if (route.points.length > 1) map.fitBounds(line.getBounds(), { padding: [28, 28] })
    else if (route.points[0]) map.setView(route.points[0], 16)
    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])
  return <div ref={host} role="img" aria-label="Carte du trajet" className="isolate size-full" />
}
