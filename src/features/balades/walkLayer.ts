import { addMarker, dot, fitPoints, lngLat, setLine, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { loadFile } from '../../firebase/files'
import { distanceMeters } from '../../lib/community'
import { bearing, cumulative, easeInOut, pointAlong, REPLAY_MS, turnToward } from '../../lib/replay'
import type { Route } from '../../lib/route'
import { momentMarker } from '../trajets/momentIcons'
import { fitPadding } from '../../lib/mapFrame'

export type WalkPhoto = { index: number; thumbFileId: string; lat: number; lng: number }

/** Les marges de la carte autour d’une balade : le panneau du bas en couvre une partie. */
export const WALK_PADDING = { top: 120, bottom: 300, left: 40, right: 40 }
const walkPadding = (m: MapLibreMap) => fitPadding(WALK_PADDING, m.getContainer().clientWidth, m.getContainer().clientHeight)

/**
 * Une balade mise en avant sur la carte unique : son tracé plein, le départ, l’arrivée, ses repères et ses photos.
 * Renvoie de quoi tout retirer.
 */
export function showWalk(m: MapLibreMap, route: Route, photos: WalkPhoto[], onPhoto: (index: number) => void, color = '#9A4413'): () => void {
  const markers: Marker[] = []
  const urls: string[] = []
  let frame = 0
  whenReady(m, () => {
    // Un liseré blanc, puis la couleur de la balade : elle se détache des autres tracés.
    const draw = (points: LatLng[]) => {
      setLine(m, 'balade-liseré', [points], { color: '#FFFFFF', width: 9 })
      setLine(m, 'balade', [points], { color, width: 5 })
    }
    draw(route.points.slice(0, 2))
    m.setPaintProperty('balade', 'line-color', color)
    m.moveLayer('balade-liseré')
    m.moveLayer('balade')
    fitPoints(m, route.points, walkPadding(m), true)
    // Le tracé se dessine du départ à l’arrivée en 1 s (T-033) ; d’un coup si l’on réduit les animations.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return draw(route.points)
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 1000)
      draw(route.points.slice(0, Math.max(2, Math.ceil(route.points.length * (1 - Math.pow(1 - p, 2))))))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  })
  const first = route.points[0]
  const last = route.points[route.points.length - 1]
  if (first) markers.push(addMarker(m, first, dot('#1E5A50', 18, 'Départ')))
  // Une boucle (arrivée à moins de 30 m du départ) : seulement le départ.
  if (first && last && route.points.length > 1 && distanceMeters({ lat: first[0], lng: first[1] }, { lat: last[0], lng: last[1] }) > 30) markers.push(addMarker(m, last, dot('#18201E', 16, 'Arrivée')))
  for (const mo of route.moments) markers.push(addMarker(m, [mo.lat, mo.lng], momentMarker(mo.type)))
  // Les photos prises pendant la balade : leur miniature, là où elles ont été prises.
  for (const photo of photos) {
    const el = document.createElement('button')
    el.type = 'button'
    el.setAttribute('aria-label', 'Voir la photo prise ici')
    el.style.cssText = 'width:44px;height:44px;padding:0;border-radius:12px;border:3px solid #fff;overflow:hidden;background:#E3E6E4;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer'
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      onPhoto(photo.index)
    })
    loadFile(photo.thumbFileId)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        urls.push(url)
        el.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
      })
      .catch(() => undefined)
    markers.push(addMarker(m, [photo.lat, photo.lng], el, { anchor: 'bottom' }))
  }
  return () => {
    cancelAnimationFrame(frame)
    markers.forEach((marker) => marker.remove())
    urls.forEach((url) => URL.revokeObjectURL(url))
    whenReady(m, () => {
      setLine(m, 'balade-liseré', [], { color: '#FFFFFF', width: 9 })
      setLine(m, 'balade', [], { color, width: 5 })
    })
  }
}

/**
 * « Revoir la balade » : la caméra suit le tracé en ~10 s, inclinée, en tournant doucement vers la suite du chemin.
 * Un toucher sur la carte arrête ; si l’iPhone réduit les animations, on montre simplement tout le trajet.
 * Renvoie la fonction qui arrête.
 */
export function replayWalk(m: MapLibreMap, route: Route, dogName: string, onEnd: () => void): () => void {
  const points = route.points
  const done = () => {
    fitPoints(m, points, walkPadding(m), true, { pitch: 0, bearing: 0 })
    onEnd()
  }
  if (points.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done()
    return () => undefined
  }
  const cum = cumulative(points)
  const total = cum[cum.length - 1]!
  const lookAhead = Math.max(30, total * 0.04)
  let heading = bearing(points[0]!, pointAlong(points, cum, lookAhead))
  const runner = addMarker(m, points[0]!, dot('#F2B544', 20, dogName))
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
    m.jumpTo({ center: lngLat(here), bearing: heading, pitch: 60, zoom: 16.5, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
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
  return stop
}
