import type { GeoJSONSource } from 'maplibre-gl'
import { addMarker, dot, fitPoints, lngLat, ROUTE_COLOR, ROUTE_FAST_COLOR, ROUTE_STOP_COLOR, setDirectionArrows, setLine, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { loadFile } from '../../firebase/files'
import { distanceMeters } from '../../lib/community'
import type { Route } from '../../lib/route'
import { effectiveTrack } from '../../lib/trim'
import { paceSegments } from '../../lib/walkSheet'
import type { PaceCategory } from '../../lib/walkStory'
import { momentMarker } from '../trajets/momentIcons'
import type { Padding } from '../../lib/mapFrame'

export type WalkPhoto = { index: number; thumbFileId: string; lat: number; lng: number }

/** Les couleurs de l’allure sur le tracé (V6 § 6.1) : tranquille en vert carte, rapide en jaune, à l’arrêt en gris. */
export const PACE_COLORS: Record<PaceCategory, string> = { tranquille: ROUTE_COLOR, rapide: ROUTE_FAST_COLOR, arret: ROUTE_STOP_COLOR }
/** Un arrêt numéroté : gris foncé (le chiffre blanc reste lisible), rouge avec un moment de stress. */
const STOP_GREY = '#5C6662'
const STOP_RED = '#C4423A'

/** Le rond numéroté d’un arrêt (22 px), en élément DOM pour MapLibre. */
export function stopMarker(n: number, red: boolean, size = 22): HTMLElement {
  const el = document.createElement('span')
  el.textContent = String(n)
  el.title = `Arrêt ${n}`
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${red ? STOP_RED : STOP_GREY};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box;font:700 12px Figtree,sans-serif`
  return el
}

/** Les portions du tracé et leur couleur : par allure si le trajet est daté, sinon d’une seule couleur. */
export function walkSegments(route: Route, color = ROUTE_COLOR): { color: string; points: LatLng[] }[] {
  const track = route.track && route.pace?.length ? effectiveTrack(route) : undefined
  if (track && route.pace) return paceSegments(track, route.pace).map((s) => ({ color: PACE_COLORS[s.category], points: s.points as LatLng[] }))
  return [{ color, points: route.points as LatLng[] }]
}

/** Les `n` premiers points des portions (le tracé qui se dessine du départ à l’arrivée). */
function firstPoints(segments: { color: string; points: LatLng[] }[], n: number) {
  const out: { color: string; points: LatLng[] }[] = []
  let left = n
  for (const s of segments) {
    if (left <= 0) break
    out.push({ color: s.color, points: s.points.slice(0, left) })
    left -= s.points.length
  }
  return out
}

/** La ligne de la balade ouverte : une portion par couleur (source et couche `balade`). */
function setWalkLine(m: MapLibreMap, segments: { color: string; points: LatLng[] }[]) {
  const data = { type: 'FeatureCollection' as const, features: segments.filter((s) => s.points.length > 1).map((s) => ({ type: 'Feature' as const, properties: { color: s.color }, geometry: { type: 'LineString' as const, coordinates: s.points.map(lngLat) } })) }
  const source = m.getSource('balade') as GeoJSONSource | undefined
  if (source) return void source.setData(data)
  m.addSource('balade', { type: 'geojson', data })
  m.addLayer({ id: 'balade', type: 'line', source: 'balade', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 5 } })
}

/**
 * La miniature d’une photo posée sur une carte (44 px, bord blanc) : un bouton qui l’ouvre en grand. L’adresse de
 * l’image est ajoutée à `urls`, à libérer quand la miniature est retirée.
 */
export function photoMarker(thumbFileId: string, onOpen: () => void, urls: string[], label = 'Voir la photo prise ici'): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', label)
  el.style.cssText = 'width:44px;height:44px;padding:0;border-radius:10px;border:3px solid #fff;overflow:hidden;background:#E3E6E4;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer'
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onOpen()
  })
  loadFile(thumbFileId)
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      urls.push(url)
      el.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
    })
    .catch(() => undefined)
  return el
}

/**
 * R-094 : la balade ouverte sur la carte unique de l’onglet Balades (sa fiche est dans le panneau) : son tracé coloré
 * par allure (sinon de sa couleur) sur un liseré blanc, le sens de marche, le départ, l’arrivée, les arrêts numérotés,
 * les repères hors arrêt et les photos là où elles ont été prises (T-107). La carte se cadre sur elle dans `padding`.
 * Renvoie de quoi tout retirer.
 */
export function showWalk(m: MapLibreMap, route: Route, photos: WalkPhoto[], onPhoto: (index: number) => void, color = ROUTE_COLOR, padding?: Padding): () => void {
  const markers: Marker[] = []
  const urls: string[] = []
  let frame = 0
  const segments = walkSegments(route, color)
  const count = segments.reduce((n, s) => n + s.points.length, 0)
  whenReady(m, () => {
    // Un liseré blanc, puis les couleurs de la balade : elle se détache des autres tracés.
    const draw = (n: number) => {
      const shown = firstPoints(segments, n)
      setLine(m, 'balade-liseré', shown.length ? [shown.flatMap((s) => s.points)] : [], { color: '#FFFFFF', width: 9 })
      setWalkLine(m, shown)
    }
    draw(2)
    m.moveLayer('balade-liseré')
    m.moveLayer('balade')
    // Dans quel sens on a marché : des chevrons le long du tracé, du départ vers l’arrivée.
    setDirectionArrows(m, 'balade')
    fitPoints(m, route.points, padding ?? 32, true)
    // Le tracé se dessine du départ à l’arrivée en 1 s (T-033) ; d’un coup si l’on réduit les animations.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return draw(count)
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 1000)
      draw(Math.max(2, Math.ceil(count * (1 - Math.pow(1 - p, 2)))))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  })
  const first = route.points[0]
  const last = route.points[route.points.length - 1]
  if (first) markers.push(addMarker(m, first, dot('#1E5A50', 18, 'Départ')))
  // Une boucle (arrivée à moins de 30 m du départ) : seulement le départ.
  if (first && last && route.points.length > 1 && distanceMeters({ lat: first[0], lng: first[1] }, { lat: last[0], lng: last[1] }) > 30) markers.push(addMarker(m, last, dot('#18201E', 16, 'Arrivée')))
  // Les arrêts numérotés (rouges avec un moment de stress), puis les repères qui ne sont pas sur un arrêt.
  const linked = new Set<number>()
  ;(route.stops ?? []).forEach((s, i) => {
    const moment = s.momentIndex !== undefined ? route.moments[s.momentIndex] : undefined
    if (s.momentIndex !== undefined) linked.add(s.momentIndex)
    markers.push(addMarker(m, [s.lat, s.lng], stopMarker(i + 1, moment?.type === 'peur')))
  })
  route.moments.forEach((mo, i) => {
    if (!linked.has(i)) markers.push(addMarker(m, [mo.lat, mo.lng], momentMarker(mo.type)))
  })
  // Les photos prises pendant la balade : leur miniature, là où elles ont été prises.
  for (const photo of photos) markers.push(addMarker(m, [photo.lat, photo.lng], photoMarker(photo.thumbFileId, () => onPhoto(photo.index), urls, `Voir la photo ${photo.index + 1} en grand`), { anchor: 'bottom' }))
  return () => {
    cancelAnimationFrame(frame)
    markers.forEach((marker) => marker.remove())
    urls.forEach((url) => URL.revokeObjectURL(url))
    whenReady(m, () => {
      setLine(m, 'balade-liseré', [], { color: '#FFFFFF', width: 9 })
      setWalkLine(m, [])
    })
  }
}
