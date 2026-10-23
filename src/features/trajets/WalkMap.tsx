import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { addMarker, cameraMs, createMap, dot, fitPoints, lngLat, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { routeMomentInfo, type Route } from '../../lib/route'
import { directionArrows } from '../../lib/walkFacts'
import { stopMarker, walkSegments } from '../balades/walkLayer'
import { fitPadding } from '../../lib/mapFrame'
import { momentMarker } from './momentIcons'

const PAD = { top: 28, bottom: 28, left: 28, right: 28 }

/** T-102 : une flèche du sens de marche (chevron blanc cerné), tournée selon le cap du tracé (la carte ne tourne pas). */
function arrowMarker(deg: number): HTMLElement {
  const el = document.createElement('span')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'display:block;width:16px;height:16px;pointer-events:none'
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" style="transform:rotate(${deg}deg)"><path d="M4.5 10 8 6.5 11.5 10" fill="none" stroke="rgba(24,32,30,.45)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10 8 6.5 11.5 10" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return el
}

/**
 * La petite carte d’une balade (récap, « Raconter la balade », recadrage, boucle) : le tracé coloré par allure (sinon en
 * vert carte), le départ en vert, les arrêts numérotés, les repères qui ne sont pas sur un arrêt, et le sens de marche
 * (flèches, T-102). Sans geste. `focus` : un arrêt à regarder de près (mode « Raconter la balade »). La fiche d’une
 * balade, elle, est sur la carte de l’onglet Balades (R-094).
 */
export function WalkMap({ route, focus, className = '' }: { route: Route; focus?: { lat: number; lng: number; number?: number }; className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const pad = () => (host.current ? fitPadding(PAD, host.current.clientWidth, host.current.clientHeight, 0.2) : PAD)
  const map = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!host.current) return
    const points = route.points as LatLng[]
    const m = createMap(host.current, { interactive: false, ...(focus ? { center: [focus.lat, focus.lng], zoom: 17 } : points.length > 1 ? { bounds: { points, padding: pad() } } : points[0] ? { center: points[0], zoom: 16 } : {}) })
    map.current = m
    whenReady(m, () => setReady(true))
    return () => {
      m.remove()
      map.current = null
    }
    // Une carte par fiche : le tracé change rarement, il est redessiné plus bas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le tracé coloré par allure et les repères ; redessinés quand la balade change (un repère posé).
  useEffect(() => {
    const m = map.current
    if (!m) return
    const markers: Marker[] = []
    whenReady(m, () => {
      const segments = walkSegments(route)
      const data = { type: 'FeatureCollection' as const, features: segments.filter((s) => s.points.length > 1).map((s) => ({ type: 'Feature' as const, properties: { color: s.color }, geometry: { type: 'LineString' as const, coordinates: s.points.map((p) => lngLat(p as LatLng)) } })) }
      const source = m.getSource('fiche') as GeoJSONSource | undefined
      if (source) source.setData(data)
      else {
        m.addSource('fiche', { type: 'geojson', data })
        m.addLayer({ id: 'fiche-liseré', type: 'line', source: 'fiche', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 8 } })
        m.addLayer({ id: 'fiche', type: 'line', source: 'fiche', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 } })
      }
    })
    if (!focus) for (const a of directionArrows(route.points)) markers.push(addMarker(m, [a.lat, a.lng], arrowMarker(a.deg)))
    const first = route.points[0]
    if (first) markers.push(addMarker(m, first, dot('#1E5A50', 18, 'Départ')))
    const linked = new Set<number>()
    ;(route.stops ?? []).forEach((s, i) => {
      const moment = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
      if (s.momentIndex !== undefined) linked.add(s.momentIndex)
      const big = focus?.number === i + 1
      markers.push(addMarker(m, [s.lat, s.lng], stopMarker(i + 1, moment?.type === 'peur', big ? 30 : 22)))
    })
    route.moments.forEach((mo, i) => {
      if (!linked.has(i)) markers.push(addMarker(m, [mo.lat, mo.lng], momentMarker(mo.type, 26)))
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [route, focus?.number]) // eslint-disable-line react-hooks/exhaustive-deps

  // Un autre arrêt à regarder (mode pas à pas) : la carte s’y déplace.
  useEffect(() => {
    const m = map.current
    if (!m || !focus) return
    whenReady(m, () => m.easeTo({ center: lngLat([focus.lat, focus.lng]), zoom: 17, duration: cameraMs(400) }))
  }, [focus?.lat, focus?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le cadre suit la taille de la carte (rotation, texte agrandi).
  useEffect(() => {
    const m = map.current
    const el = host.current
    if (!m || !el || focus) return
    const observer = new ResizeObserver(() => {
      m.resize()
      whenReady(m, () => fitPoints(m, route.points as LatLng[], pad()))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [route.points, Boolean(focus)]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative isolate overflow-hidden bg-[#E8EFE9] ${className}`}>
      {!ready && <span aria-hidden="true" className="skeleton pointer-events-none absolute inset-0 z-[5] rounded-none" />}
      <div ref={host} role="img" aria-label={`Carte de la balade : le tracé coloré par allure, avec le sens de marche${route.stops?.length ? `, ${route.stops.length} arrêt${route.stops.length > 1 ? 's' : ''} numéroté${route.stops.length > 1 ? 's' : ''}` : ''}`} className="size-full" />
      {route.moments.length > 0 && <span className="sr-only">{route.moments.map((m) => routeMomentInfo(m.type).label).join(', ')}</span>}
    </div>
  )
}
