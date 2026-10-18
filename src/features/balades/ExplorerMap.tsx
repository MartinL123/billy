import { useEffect, useRef } from 'react'
import { addMarker, createMap, fitPoints, onMarker, set3D, setLine, setSatellite, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { fogLayout, type FogLayout } from '../../lib/fogCanvas'
import { distanceToRoute, NEAR_ROUTE, type Route } from '../../lib/route'
import { replayWalk, showWalk, type WalkPhoto } from './walkLayer'
import { ofName } from '../../lib/gender'

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
  /** Le lieu ouvert dans la petite fenêtre : la carte s’y centre, au-dessus de la fenêtre. */
  focus?: LatLng
  /** Un toucher sur la carte, hors des repères. */
  onMapTap?: () => void
  onPlace?: (id: string) => void
  /** L’orientation de la carte (degrés), pour la boussole. */
  onBearing?: (bearing: number) => void
  /** Change à chaque toucher sur la boussole : la carte revient face au nord. */
  north?: number
  /** Le nom du chien du compte (libellés accessibles). */
  dogName: string
  /** Une balade mise en avant (depuis un souvenir) : son tracé, ses repères, ses photos, le replay. */
  walk?: {
    route: Route
    photos: WalkPhoto[]
    replaying: boolean
    onReplayEnd: () => void
    /** Toucher le tracé (ou tout près) : y ajouter un repère. */
    onTapRoute: (at: { lat: number; lng: number }) => void
    onMissRoute: () => void
    onPhoto: (index: number) => void
  }
}

const FOG = { plan: { color: '#22332F', opacity: 0.86 }, satellite: { color: '#FFFFFF', opacity: 0.72 } }
const TRACK = { plan: '#D9661F', satellite: '#FFB23F' }

const rectangle = ([s, w, n, e]: [number, number, number, number]): [number, number][] => [
  [w, s],
  [w, n],
  [e, n],
  [e, s],
  [w, s],
]

/** Petit hasard reproductible : la texture des nuages ne bouge pas d’un affichage à l’autre. */
function seeded(seed: number) {
  let x = seed || 1
  return () => {
    x = (x * 16807) % 2147483647
    return x / 2147483647
  }
}

/**
 * Le brouillard en image : un voile de la couleur du mode, une texture de nuages légère, puis une trouée ronde
 * aux bords flous sur chaque case découverte (les trouées voisines se fondent en un chemin).
 */
function drawFog(layout: FogLayout, color: string, opacity: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')!
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.fillRect(0, 0, layout.width, layout.height)
  // Nuages : de grandes taches un peu plus claires ou plus sombres.
  const random = seeded(Math.round(layout.bbox[0] * 1e4))
  const blobs = Math.round((layout.width * layout.height) / 9000)
  for (let k = 0; k < blobs; k++) {
    const x = random() * layout.width
    const y = random() * layout.height
    const r = 20 + random() * 60
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const tint = random() > 0.5 ? '255,255,255' : '0,0,0'
    g.addColorStop(0, `rgba(${tint},0.10)`)
    g.addColorStop(1, `rgba(${tint},0)`)
    ctx.globalAlpha = 1
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Les trouées.
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'destination-out'
  const r = layout.radius
  for (const [x, y] of layout.holes) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.5, 'rgba(0,0,0,0.9)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  return canvas
}

/**
 * La carte qui se découvre : le brouillard (un seul polygone troué, bords adoucis), les trajets en pointillés,
 * les lieux à découvrir. Plan ou satellite, 2D ou 3D.
 */
export function ExplorerMap({ cells, tracks, places, satellite, three, center, focus, onPlace, onMapTap, onBearing, north, walk, dogName }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const handlers = useRef({ onPlace, onMapTap, onBearing, walk })
  handlers.current = { onPlace, onMapTap, onBearing, walk }
  const framed = useRef(false)

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { zoom: 15, ...(center ? { center } : {}) })
    map.current = m
    m.on('rotate', () => handlers.current.onBearing?.(m.getBearing()))
    m.on('click', (e) => {
      if (onMarker(e.originalEvent)) return
      handlers.current.onMapTap?.()
      const w = handlers.current.walk
      if (!w) return
      const at = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (distanceToRoute(at, w.route.points) <= NEAR_ROUTE) w.onTapRoute(at)
      else w.onMissRoute()
    })
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cadrage : une fois, sur les balades (sinon le centre donné).
  useEffect(() => {
    const m = map.current
    // Une balade mise en avant se cadre elle-même.
    if (!m || framed.current || walk) return
    const all = tracks.flat()
    if (all.length) {
      // Les boutons du haut et le panneau du bas couvrent la carte : on cadre dans ce qui reste visible.
      // Une fois le style chargé : avant, le cadrage est perdu.
      framed.current = true
      whenReady(m, () => fitPoints(m, all, { top: 130, bottom: 340, left: 40, right: 40 }))
    } else if (center) m.jumpTo({ center: [center[1], center[0]] })
  }, [tracks, center]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map.current && north) map.current.easeTo({ bearing: 0, duration: 500 })
  }, [north])

  // La balade mise en avant, redessinée quand ses repères ou ses photos changent.
  const walkRoute = walk?.route
  const walkPhotos = walk?.photos
  useEffect(() => {
    const m = map.current
    if (!m || !walkRoute) return
    return showWalk(m, walkRoute, walkPhotos ?? [], (i) => handlers.current.walk?.onPhoto(i))
  }, [walkRoute, walkPhotos])

  const replaying = Boolean(walk?.replaying)
  useEffect(() => {
    const m = map.current
    if (!m || !replaying || !walkRoute) return
    const stop = replayWalk(m, walkRoute, dogName, () => handlers.current.walk?.onReplayEnd())
    return stop
  }, [replaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // Centrer sur le lieu ouvert, dans la partie de carte au-dessus de la fenêtre.
  useEffect(() => {
    const m = map.current
    if (!m || !focus) return
    whenReady(m, () => m.easeTo({ center: [focus[1], focus[0]], zoom: Math.max(m.getZoom(), 16), padding: { top: 60, bottom: 320, left: 0, right: 0 }, duration: 700 }))
  }, [focus?.[0], focus?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const layout = fogLayout(cells)
      for (const id of ['brouillard-image', 'brouillard']) {
        if (m.getLayer(id)) m.removeLayer(id)
        if (m.getSource(id)) m.removeSource(id)
      }
      // Hors de l’image : un aplat, troué exactement là où l’image commence.
      const world: [number, number][] = [
        [-180, -85],
        [180, -85],
        [180, 85],
        [-180, 85],
        [-180, -85],
      ]
      const rings = layout ? [world, rectangle(layout.bbox)] : [world]
      m.addSource('brouillard', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } } })
      m.addLayer({ id: 'brouillard', type: 'fill', source: 'brouillard', paint: { 'fill-color': FOG[mode].color, 'fill-opacity': FOG[mode].opacity, 'fill-antialias': false } })
      if (layout) {
        const [south, west, north, east] = layout.bbox
        m.addSource('brouillard-image', {
          type: 'canvas',
          canvas: drawFog(layout, FOG[mode].color, FOG[mode].opacity),
          animate: false,
          coordinates: [
            [west, north],
            [east, north],
            [east, south],
            [west, south],
          ],
        })
        m.addLayer({ id: 'brouillard-image', type: 'raster', source: 'brouillard-image', paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' } })
      }
      setLine(m, 'trajets', tracks, { color: TRACK[mode], width: 4 })
      m.setPaintProperty('trajets', 'line-color', TRACK[mode])
      m.setPaintProperty('trajets', 'line-dasharray', [1.2, 1.4])
      // Les trajets restent au-dessus du brouillard.
      m.moveLayer('trajets')
      for (const id of ['balade', 'parcouru']) if (m.getLayer(id)) m.moveLayer(id)
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
      <div ref={host} role="application" aria-label={`Carte du territoire ${ofName(dogName)}`} className="size-full" />
    </div>
  )
}
