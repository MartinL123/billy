import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { GOOD_COLOR, HARD_COLOR, isHardMoment, type Route } from '../../lib/route'

const dot = (color: string) => L.divIcon({ className: '', html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-50%,-50%)"></span>`, iconSize: [0, 0] })

/** Tous les trajets du mois superposés : traits fins, peurs et grognes en rouge, réussites en vert. */
export function WalksMap({ routes }: { routes: Route[] }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current || routes.length === 0) return
    const map = L.map(host.current, { zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    const lines = routes.map((r) => L.polyline(r.points, { color: '#9A4413', weight: 4, opacity: 0.55 }).addTo(map))
    // Les réussites d'abord, les peurs par-dessus : on les voit toujours.
    const moments = routes.flatMap((r) => r.moments).sort((a, b) => Number(isHardMoment(a)) - Number(isHardMoment(b)))
    for (const m of moments) L.marker([m.lat, m.lng], { icon: dot(isHardMoment(m) ? HARD_COLOR : GOOD_COLOR), interactive: false }).addTo(map)
    map.fitBounds(L.featureGroup(lines).getBounds(), { padding: [24, 24] })
    return () => map.remove()
  }, [routes])
  return <div ref={host} role="img" aria-label="Carte de ses balades du mois" className="isolate size-full" />
}
