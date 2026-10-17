import { useEffect, useRef, useState } from 'react'
import { addMarker, createMap, dot, fitPoints, lngLat, onMarker, set3D, setLine, whenReady, type MapLibreMap } from '../../components/maplibre'
import { bearing, cumulative, easeInOut, pointAlong, REPLAY_MS, turnToward } from '../../lib/replay'
import { momentMarker } from './momentIcons'
import { loadFile } from '../../firebase/files'
import { Map3DToggle } from '../../components/Map3DToggle'
import { distanceMeters } from '../../lib/community'
import { distanceToRoute, NEAR_ROUTE, type Route } from '../../lib/route'

/** La grande carte d'un trajet : le chemin, le départ en vert, l'arrivée, les moments en couleur. Bouton 2D/3D. */
export function RouteMap({ route, photos = [], onPhoto, onMoment, onTapRoute, onMissRoute, replaying = false, onReplayEnd }: { route: Route; /** « Revoir la balade » en cours. */ replaying?: boolean; onReplayEnd?: () => void; /** Photos placées sur la balade (index dans les photos du moment). */ photos?: { index: number; thumbFileId: string; lat: number; lng: number }[]; onPhoto?: (index: number) => void; onMoment?: (index: number) => void; /** Toucher le tracé (ou tout près) : y ajouter un repère. */ onTapRoute?: (at: { lat: number; lng: number }) => void; onMissRoute?: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [is3D, setIs3D] = useState(false)
  const handlers = useRef({ onTapRoute, onMissRoute, onPhoto, onReplayEnd })
  handlers.current = { onTapRoute, onMissRoute, onPhoto, onReplayEnd }

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
    // Les photos prises pendant la balade : leur miniature, là où elles ont été prises.
    const urls: string[] = []
    for (const photo of photos) {
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', 'Voir la photo prise ici')
      el.style.cssText = 'width:44px;height:44px;padding:0;border-radius:12px;border:3px solid #fff;overflow:hidden;background:#E3E6E4;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer'
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.current.onPhoto?.(photo.index)
      })
      loadFile(photo.thumbFileId)
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          urls.push(url)
          el.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
        })
        .catch(() => undefined)
      addMarker(m, [photo.lat, photo.lng], el, { anchor: 'bottom' })
    }
    m.on('click', (e) => {
      if (onMarker(e.originalEvent) || !handlers.current.onTapRoute) return
      const at = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (distanceToRoute(at, route.points) <= NEAR_ROUTE) handlers.current.onTapRoute(at)
      else handlers.current.onMissRoute?.()
    })
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, photos])

  // « Revoir la balade » : la caméra suit le tracé en ~10 s, inclinée, en tournant doucement vers la suite du chemin.
  // Un toucher sur la carte arrête ; si l'iPhone réduit les animations, on montre simplement tout le trajet.
  useEffect(() => {
    const m = map.current
    if (!m || !replaying || route.points.length < 2) return
    const points = route.points
    const done = () => {
      fitPoints(m, points, 36, true, { pitch: is3D ? 60 : 0, bearing: 0 })
      handlers.current.onReplayEnd?.()
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return void done()
    const cum = cumulative(points)
    const total = cum[cum.length - 1]!
    const lookAhead = Math.max(30, total * 0.04)
    let heading = bearing(points[0]!, pointAlong(points, cum, lookAhead))
    const runner = addMarker(m, points[0]!, dot('#F2B544', 20, 'Billy'))
    let frame = 0
    let stopped = false
    const stop = () => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(frame)
      runner.remove()
      whenReady(m, () => setLine(m, 'parcouru', [], { color: '#F2B544', width: 6 }))
      done()
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / REPLAY_MS)
      const d = total * easeInOut(t)
      const here = pointAlong(points, cum, d)
      heading = turnToward(heading, bearing(here, pointAlong(points, cum, Math.min(total, d + lookAhead))), 0.06)
      m.jumpTo({ center: lngLat(here), bearing: heading, pitch: 60, zoom: 16.5 })
      runner.setLngLat(lngLat(here))
      const passed = cum.findIndex((c) => c > d)
      whenReady(m, () => setLine(m, 'parcouru', [[...points.slice(0, passed < 0 ? points.length : passed), here]], { color: '#F2B544', width: 6 }))
      if (t < 1) frame = requestAnimationFrame(tick)
      else stop()
    }
    frame = requestAnimationFrame(tick)
    m.once('mousedown', stop)
    m.once('touchstart', stop)
    m.once('wheel', stop)
    return () => {
      // « Arrêter » : la carte revient au trajet entier. Écran quitté : on coupe juste l'animation.
      if (map.current) return stop()
      stopped = true
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaying])

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
