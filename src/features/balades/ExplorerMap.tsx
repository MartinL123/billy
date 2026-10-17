import { useEffect, useRef } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { addMarker, createMap, fitPoints, set3D, setLine, setSatellite, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { fogShape } from '../../lib/fogShape'

export interface MapPlace {
  id: string
  lat: number
  lng: number
  name: string
  /** Encore dans le brouillard : un « ? » ; découvert : son icône et son nom. */
  hidden: boolean
  icon: string
}

interface Props {
  cells: Set<string>
  tracks: LatLng[][]
  places: MapPlace[]
  satellite: boolean
  three: boolean
  /** Sans balade : la position (si autorisée) ou Paris. */
  center?: LatLng
  onPlace?: (id: string) => void
}

const FOG = { plan: { color: '#22332F', opacity: 0.86 }, satellite: { color: '#FFFFFF', opacity: 0.72 } }
const TRACK = { plan: '#D9661F', satellite: '#FFB23F' }

/**
 * La carte qui se découvre : le brouillard (un seul polygone troué, bords adoucis), les trajets en pointillés,
 * les lieux à découvrir. Plan ou satellite, 2D ou 3D.
 */
export function ExplorerMap({ cells, tracks, places, satellite, three, center, onPlace }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const handlers = useRef({ onPlace })
  handlers.current = { onPlace }
  const framed = useRef(false)

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { zoom: 15, ...(center ? { center } : {}) })
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cadrage : une fois, sur les balades (sinon le centre donné).
  useEffect(() => {
    const m = map.current
    if (!m || framed.current) return
    const all = tracks.flat()
    if (all.length) {
      // Les boutons du haut et le panneau du bas couvrent la carte : on cadre dans ce qui reste visible.
      fitPoints(m, all, { top: 190, bottom: 300, left: 40, right: 40 })
      framed.current = true
    } else if (center) m.jumpTo({ center: [center[1], center[0]] })
  }, [tracks, center])

  useEffect(() => {
    if (map.current) setSatellite(map.current, satellite)
  }, [satellite])

  useEffect(() => {
    if (map.current) set3D(map.current, three)
  }, [three])

  // Le brouillard et les trajets, redessinés quand ils changent ou quand on passe en satellite.
  useEffect(() => {
    const m = map.current
    if (!m) return
    whenReady(m, () => {
      const mode = satellite ? 'satellite' : 'plan'
      const data = { type: 'Feature' as const, properties: {}, geometry: fogShape(cells).polygon }
      const source = m.getSource('brouillard') as GeoJSONSource | undefined
      if (source) source.setData(data)
      else {
        m.addSource('brouillard', { type: 'geojson', data })
        m.addLayer({ id: 'brouillard', type: 'fill', source: 'brouillard', paint: { 'fill-color': FOG[mode].color, 'fill-opacity': FOG[mode].opacity } })
        // Bords flous autour des zones découvertes.
        m.addLayer({ id: 'brouillard-bord', type: 'line', source: 'brouillard', paint: { 'line-color': FOG[mode].color, 'line-width': 14, 'line-blur': 12, 'line-opacity': FOG[mode].opacity * 0.8 } })
      }
      m.setPaintProperty('brouillard', 'fill-color', FOG[mode].color)
      m.setPaintProperty('brouillard', 'fill-opacity', FOG[mode].opacity)
      m.setPaintProperty('brouillard-bord', 'line-color', FOG[mode].color)
      setLine(m, 'trajets', tracks, { color: TRACK[mode], width: 4 })
      m.setPaintProperty('trajets', 'line-color', TRACK[mode])
      m.setPaintProperty('trajets', 'line-dasharray', [1.2, 1.4])
      // Les satellites et le brouillard restent sous les trajets.
      if (m.getLayer('trajets')) m.moveLayer('trajets')
    })
  }, [cells, tracks, satellite])

  // Les lieux : « ? » dans le brouillard, icône et nom une fois découverts. Ils restent droits en 3D.
  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((marker) => marker.remove())
    markers.current = places.map((place) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', place.hidden ? 'Lieu à découvrir' : place.name)
      el.style.cssText = 'display:flex;align-items:center;gap:6px;background:none;border:0;padding:0;cursor:pointer'
      el.innerHTML = place.hidden
        ? '<span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:2px dashed #fff;background:rgba(34,51,47,.55);color:#fff;font:800 18px Figtree,sans-serif">?</span>'
        : `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:18px">${place.icon}</span><span style="background:#fff;border-radius:12px;padding:3px 8px;font:700 13px Figtree,sans-serif;color:#18201E;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">${place.name.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}</span>`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.current.onPlace?.(place.id)
      })
      return addMarker(m, [place.lat, place.lng], el, { anchor: 'left' })
    })
  }, [places])

  return (
    <div className="absolute inset-0 isolate">
      <div ref={host} role="application" aria-label="Carte du territoire de Billy" className="size-full" />
    </div>
  )
}
