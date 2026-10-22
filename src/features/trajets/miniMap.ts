import { createMap, fitPoints, ROUTE_COLOR, setLine, whenReady, type LatLng, type MapLibreMap } from '../../components/maplibre'
import { routeMomentInfo, type RouteMoment, type RoutePoint } from '../../lib/route'

/**
 * Mini-cartes des trajets (V6 § 1, T-077) : un vrai fond de carte (OpenFreeMap, tuiles en cache) sous le tracé.
 *
 * Une carte MapLibre par vignette serait trop lourde dans une liste (Safari limite le nombre de contextes WebGL, et
 * chacun coûte de la mémoire). Une seule carte cachée, hors de l’écran, dessine donc les vignettes l’une après l’autre :
 * elle se cadre sur le trajet, attend ses tuiles, puis on garde une image (JPEG). Les images restent en mémoire et dans
 * le cache du navigateur (Cache Storage) : hors ligne, une vignette déjà vue s’affiche toujours.
 */

const CACHE = 'flair-minicartes'
/** Au-delà, la carte n’a pas pu se dessiner (hors ligne, tuiles absentes) : la vignette garde son dessin simple. */
const RENDER_MS = 8_000

const memory = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()
let renderer: { map: MapLibreMap; host: HTMLDivElement } | null = null

/** Une clé courte qui change si le tracé, les repères ou la taille changent. */
export function miniMapKey(points: RoutePoint[], moments: RouteMoment[], size: number): string {
  let h = 2166136261
  const add = (n: number) => {
    h ^= Math.round(n * 1e5)
    h = Math.imul(h, 16777619) >>> 0
  }
  for (const [lat, lng] of points) {
    add(lat)
    add(lng)
  }
  for (const m of moments) {
    add(m.lat)
    add(m.lng)
    add(m.type.length)
  }
  return `v1-${size}-${points.length}-${h.toString(36)}`
}

function getRenderer(): { map: MapLibreMap; host: HTMLDivElement } {
  if (renderer) return renderer
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:120px;height:120px;pointer-events:none'
  document.body.appendChild(host)
  const map = createMap(host, { interactive: false, attribution: false, preserveDrawingBuffer: true, pixelRatio: 2 })
  // Une vignette calme : sans noms de rues ni icônes (illisibles à cette taille).
  whenReady(map, () => {
    for (const layer of map.getStyle().layers) if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none')
  })
  renderer = { map, host }
  return renderer
}

const idle = (map: MapLibreMap) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('mini-carte trop lente')), RENDER_MS)
    map.once('idle', () => {
      window.clearTimeout(timer)
      resolve()
    })
    map.triggerRepaint()
  })

async function draw(points: RoutePoint[], moments: RouteMoment[], size: number): Promise<Blob | null> {
  const { map, host } = getRenderer()
  host.style.width = `${size}px`
  host.style.height = `${size}px`
  map.resize()
  await new Promise<void>((resolve) => whenReady(map, resolve))
  const latLngs = points as LatLng[]
  setLine(map, 'mini-liseré', [latLngs], { color: '#FFFFFF', width: size > 80 ? 6 : 4.5 })
  setLine(map, 'mini-trace', [latLngs], { color: ROUTE_COLOR, width: size > 80 ? 3.5 : 2.5 })
  const dots = { type: 'FeatureCollection' as const, features: [{ at: points[0]!, color: '#1E5A50' }, ...moments.map((m) => ({ at: [m.lat, m.lng] as RoutePoint, color: routeMomentInfo(m.type).color }))].map((d) => ({ type: 'Feature' as const, properties: { color: d.color }, geometry: { type: 'Point' as const, coordinates: [d.at[1], d.at[0]] } })) }
  const source = map.getSource('mini-points') as { setData: (d: typeof dots) => void } | undefined
  if (source) source.setData(dots)
  else {
    map.addSource('mini-points', { type: 'geojson', data: dots })
    map.addLayer({ id: 'mini-points', type: 'circle', source: 'mini-points', paint: { 'circle-radius': size > 80 ? 5 : 3.5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 } })
  }
  const pad = Math.round(size * 0.16)
  fitPoints(map, latLngs, { top: pad, bottom: pad, left: pad, right: pad })
  await idle(map)
  return new Promise((resolve) => map.getCanvas().toBlob((blob) => resolve(blob), 'image/jpeg', 0.82))
}

async function fromCache(key: string): Promise<string | null> {
  try {
    const hit = await (await caches.open(CACHE)).match(`/minicarte/${key}`)
    return hit ? URL.createObjectURL(await hit.blob()) : null
  } catch {
    return null
  }
}

async function toCache(key: string, blob: Blob) {
  try {
    await (await caches.open(CACHE)).put(`/minicarte/${key}`, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }))
  } catch {
    // Sans cache (navigation privée), l’image reste en mémoire le temps de la session.
  }
}

/** L’image de la mini-carte d’un trajet (URL d’objet), ou null si la carte n’a pas pu se dessiner. */
export function miniMapImage(points: RoutePoint[], moments: RouteMoment[], size: number): Promise<string | null> {
  const key = miniMapKey(points, moments, size)
  const known = memory.get(key)
  if (known) return Promise.resolve(known)
  const running = pending.get(key)
  if (running) return running
  const job = (async () => {
    const cached = await fromCache(key)
    if (cached) return cached
    // Une vignette à la fois, sur la même carte cachée.
    const result = queue.then(async () => {
      try {
        const blob = await draw(points, moments, size)
        if (!blob) return null
        void toCache(key, blob)
        return URL.createObjectURL(blob)
      } catch {
        return null
      }
    })
    queue = result
    return result
  })().then((url) => {
    pending.delete(key)
    if (url) memory.set(key, url)
    return url
  })
  pending.set(key, job)
  return job
}

/** La mini-carte déjà connue (mémoire), pour l’afficher sans attendre. */
export const knownMiniMap = (points: RoutePoint[], moments: RouteMoment[], size: number) => memory.get(miniMapKey(points, moments, size))

/** Une carte MapLibre peut-elle s’afficher ici (WebGL, navigateur) ? Sinon, le dessin simple suffit. */
let webgl: boolean | undefined
export function canDrawMiniMaps(): boolean {
  if (webgl !== undefined) return webgl
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return (webgl = false)
  try {
    const canvas = document.createElement('canvas')
    webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    webgl = false
  }
  return webgl
}
