import { useEffect, useRef } from 'react'
import { addMarker, createMap, lngLat, onMarker, type MapLibreMap, type Marker } from '../../components/maplibre'
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
const LONG_PRESS_MS = 550

/** La carte de la meute (MapLibre, fond OpenFreeMap) : une étiquette par spot, les gouttes du jour. */
export function MeuteMap({ spots, drops, highlight, center, recenter, onSpot, onLongPress, onMove }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const handlers = useRef({ onSpot, onLongPress, onMove })
  handlers.current = { onSpot, onLongPress, onMove }

  useEffect(() => {
    if (!host.current || map.current) return
    const m = createMap(host.current, { center: [center.lat, center.lng], zoom: 15 })
    // Appui long au doigt (ou clic droit) : proposer un nouveau spot à cet endroit.
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => clearTimeout(timer)
    m.on('touchstart', (e) => {
      cancel()
      if (e.points.length !== 1 || onMarker(e.originalEvent)) return
      const at = e.lngLat
      timer = setTimeout(() => handlers.current.onLongPress({ lat: at.lat, lng: at.lng }), LONG_PRESS_MS)
    })
    m.on('touchend', cancel)
    m.on('touchcancel', cancel)
    m.on('movestart', cancel)
    m.on('contextmenu', (e) => handlers.current.onLongPress({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    m.on('moveend', () => {
      const c = m.getCenter()
      handlers.current.onMove({ lat: c.lat, lng: c.lng })
    })
    map.current = m
    return () => {
      cancel()
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current
    if (m) m.jumpTo({ center: lngLat([center.lat, center.lng]), zoom: Math.max(15, m.getZoom()) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter])

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((marker) => marker.remove())
    markers.current = spots.map((spot) => {
      const info = categoryInfo(spot.category)
      const lit = highlight?.has(spot.id)
      const dots = (drops[spot.id] ?? []).slice(0, 5).map((color) => `<span style="width:10px;height:10px;border-radius:5px;background:${color};border:2px solid #fff;margin-left:-3px"></span>`).join('')
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', spot.name)
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer'
      el.innerHTML = `<span style="display:flex;align-items:center;gap:6px;background:#fff;border:2px solid ${info.color};border-radius:16px;padding:3px 9px;font:700 13px Figtree,sans-serif;color:#18201E;white-space:nowrap;box-shadow:0 2px 6px rgba(24,32,30,.18);${lit ? 'outline:3px solid #F2B544;' : ''}">
          <span style="width:10px;height:10px;border-radius:5px;background:${info.color}"></span>${esc(spot.name)}</span>
        <span style="display:flex;margin-top:3px;padding-left:3px">${dots}</span>`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.current.onSpot(spot.id)
      })
      return addMarker(m, [spot.lat, spot.lng], el, { anchor: 'bottom' })
    })
  }, [spots, drops, highlight])

  return <div ref={host} role="application" aria-label="Carte des spots de la meute" className="size-full select-none [-webkit-touch-callout:none]" />
}
