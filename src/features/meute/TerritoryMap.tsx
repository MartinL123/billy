import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

/** Les spots marqués, à la couleur du chien. */
export function TerritoryMap({ spots, color }: { spots: { lat: number; lng: number; name: string }[]; color: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current || spots.length === 0) return
    const map = L.map(host.current, { zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    const icon = L.divIcon({ className: '', html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>`, iconSize: [0, 0] })
    const markers = spots.map((s) => L.marker([s.lat, s.lng], { icon, title: s.name, interactive: false }).addTo(map))
    if (spots.length === 1) map.setView([spots[0]!.lat, spots[0]!.lng], 16)
    else map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [36, 36], maxZoom: 16 })
    return () => map.remove()
  }, [spots, color])
  return <div ref={host} role="img" aria-label="Carte de son territoire" className="isolate size-full" />
}
