import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { addMarker, cameraMs, createMap, dot, fitPoints, lngLat, ROUTE_COLOR, ROUTE_FAST_COLOR, ROUTE_STOP_COLOR, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { routeMomentInfo, type Route } from '../../lib/route'
import { paceSegments } from '../../lib/walkSheet'
import { effectiveTrack } from '../../lib/trim'
import type { PaceCategory } from '../../lib/walkStory'
import { replayWalk } from '../balades/walkLayer'
import { momentMarker } from './momentIcons'

const PACE_COLORS: Record<PaceCategory, string> = { tranquille: ROUTE_COLOR, rapide: ROUTE_FAST_COLOR, arret: ROUTE_STOP_COLOR }
/** Un arrêt numéroté : gris foncé (le chiffre blanc reste lisible), rouge avec un moment de stress. */
const STOP_GREY = '#5C6662'
const STOP_RED = '#C4423A'
const PAD = { top: 28, bottom: 28, left: 28, right: 28 }

/** Le rond numéroté d’un arrêt (22 px), en élément DOM pour MapLibre. */
function stopMarker(n: number, red: boolean, size = 22): HTMLElement {
  const el = document.createElement('span')
  el.textContent = String(n)
  el.title = `Arrêt ${n}`
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${red ? STOP_RED : STOP_GREY};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box;font:700 12px Figtree,sans-serif`
  return el
}

/**
 * La carte de la fiche de balade (V6 § 6.1) : le tracé coloré par allure (sinon en vert carte), le départ en vert, les
 * arrêts numérotés, les repères qui ne sont pas sur un arrêt. Sans geste (la page défile par-dessus) : le plein écran
 * ouvre la carte du territoire. `cursor` : le repère posé par le doigt sur la courbe d’allure ; `focus` : un arrêt à
 * regarder de près (mode « Raconter la balade »).
 */
export function WalkMap({ route, dogName, cursor, focus, replaying = false, onReplayEnd, className = '' }: { route: Route; dogName: string; cursor?: { lat: number; lng: number }; focus?: { lat: number; lng: number; number?: number }; replaying?: boolean; onReplayEnd?: () => void; className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const endRef = useRef(onReplayEnd)
  endRef.current = onReplayEnd

  useEffect(() => {
    if (!host.current) return
    const points = route.points as LatLng[]
    const m = createMap(host.current, { interactive: false, ...(focus ? { center: [focus.lat, focus.lng], zoom: 17 } : points.length > 1 ? { bounds: { points, padding: PAD } } : points[0] ? { center: points[0], zoom: 16 } : {}) })
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
      const segments = route.track && route.pace?.length ? paceSegments(effectiveTrack(route)!, route.pace).map((s) => ({ color: PACE_COLORS[s.category], points: s.points })) : [{ color: ROUTE_COLOR, points: route.points }]
      const data = { type: 'FeatureCollection' as const, features: segments.filter((s) => s.points.length > 1).map((s) => ({ type: 'Feature' as const, properties: { color: s.color }, geometry: { type: 'LineString' as const, coordinates: s.points.map((p) => lngLat(p as LatLng)) } })) }
      const source = m.getSource('fiche') as GeoJSONSource | undefined
      if (source) source.setData(data)
      else {
        m.addSource('fiche', { type: 'geojson', data })
        m.addLayer({ id: 'fiche-liseré', type: 'line', source: 'fiche', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 8 } })
        m.addLayer({ id: 'fiche', type: 'line', source: 'fiche', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 } })
      }
    })
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

  // Le doigt sur la courbe d’allure : un rond doré à cet endroit du tracé.
  useEffect(() => {
    const m = map.current
    if (!m || !cursor) return
    const marker = addMarker(m, [cursor.lat, cursor.lng], dot('#F2B544', 20, 'Ici'))
    return () => void marker.remove()
  }, [cursor?.lat, cursor?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // « Revoir la balade » : le replay de la carte du territoire, recadré dans cette petite carte à la fin.
  useEffect(() => {
    const m = map.current
    if (!m || !replaying) return
    return replayWalk(m, route, dogName, () => endRef.current?.(), PAD)
  }, [replaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le cadre suit la taille de la carte (rotation, texte agrandi).
  useEffect(() => {
    const m = map.current
    const el = host.current
    if (!m || !el || focus) return
    const observer = new ResizeObserver(() => {
      m.resize()
      if (!replaying) whenReady(m, () => fitPoints(m, route.points as LatLng[], PAD))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [route.points, replaying, Boolean(focus)]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative isolate overflow-hidden bg-[#E8EFE9] ${className}`}>
      {!ready && <span aria-hidden="true" className="skeleton pointer-events-none absolute inset-0 z-[5] rounded-none" />}
      <div ref={host} role="img" aria-label={`Carte de la balade : le tracé coloré par allure${route.stops?.length ? `, ${route.stops.length} arrêt${route.stops.length > 1 ? 's' : ''} numéroté${route.stops.length > 1 ? 's' : ''}` : ''}`} className="size-full" />
      {route.moments.length > 0 && <span className="sr-only">{route.moments.map((m) => routeMomentInfo(m.type).label).join(', ')}</span>}
    </div>
  )
}
