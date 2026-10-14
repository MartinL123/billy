import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Spot, WithId } from '../../firebase/community'
import { categoryInfo } from '../../lib/community'

export interface LatLng {
  lat: number
  lng: number
}

interface Props {
  spots: WithId<Spot>[]
  /** Marques des 7 derniers jours, par spot : les gouttes des chiens passés. */
  drops: Record<string, string[]>
  /** Spots du territoire mis en avant (filtre « Territoire de … »). */
  highlight?: Set<string>
  center: LatLng
  /** Change pour recentrer la carte (« Ma position »). */
  recenter: number
  onSpot: (id: string) => void
  /** Appui long sur la carte : nouveau spot ici. */
  onLongPress: (where: LatLng) => void
  onMove: (center: LatLng) => void
}

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** La carte de la meute : tuiles OpenStreetMap (attribution visible), un point par spot, les gouttes du jour. */
export function MeuteMap({ spots, drops, highlight, center, recenter, onSpot, onLongPress, onMove }: Props) {
  const host = useRef<HTMLDivElement>(null)
  // Leaflet n'a pas de types ici : la carte et son calque restent opaques.
  const map = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const layer = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const handlers = useRef({ onSpot, onLongPress, onMove })
  handlers.current = { onSpot, onLongPress, onMove }

  useEffect(() => {
    if (!host.current || map.current) return
    const m = L.map(host.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m)
    // Appui long (ou clic droit) : proposer un nouveau spot à cet endroit.
    m.on('contextmenu', (e: { latlng: LatLng }) => handlers.current.onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng }))
    m.on('moveend', () => {
      const c = m.getCenter()
      handlers.current.onMove({ lat: c.lat, lng: c.lng })
    })
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setView([center.lat, center.lng], Math.max(15, map.current.getZoom()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter])

  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    for (const spot of spots) {
      const info = categoryInfo(spot.category)
      const lit = highlight?.has(spot.id)
      const dots = (drops[spot.id] ?? []).slice(0, 5).map((color) => `<span style="width:10px;height:10px;border-radius:5px;background:${color};border:2px solid #fff;margin-left:-3px"></span>`).join('')
      const html = `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="display:flex;align-items:center;gap:6px;background:#fff;border:2px solid ${info.color};border-radius:16px;padding:3px 9px;font:700 13px Figtree,sans-serif;color:#18201E;white-space:nowrap;box-shadow:0 2px 6px rgba(24,32,30,.18);${lit ? 'outline:3px solid #F2B544;' : ''}">
          <span style="width:10px;height:10px;border-radius:5px;background:${info.color}"></span>${esc(spot.name)}</span>
        <span style="display:flex;margin-top:3px;padding-left:3px">${dots}</span></div>`
      const marker = L.marker([spot.lat, spot.lng], { icon: L.divIcon({ className: '', html, iconSize: [0, 0] }), keyboard: true, title: spot.name })
      marker.on('click', () => handlers.current.onSpot(spot.id))
      group.addLayer(marker)
    }
  }, [spots, drops, highlight])

  return <div ref={host} role="application" aria-label="Carte des spots de la meute" className="size-full" />
}
