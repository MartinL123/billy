import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { addMarker, createMap, dot, fitPoints, lngLat, onMarker, set3D, setSatellite, whenReady, type LatLng, type MapLibreMap, type Marker } from '../../components/maplibre'
import { fogLayout, type FogLayout } from '../../lib/fogCanvas'
import { distanceToRoute, NEAR_ROUTE, type Route } from '../../lib/route'
import { replayWalk, showWalk, type WalkPhoto } from './walkLayer'
import { ofName } from '../../lib/gender'
import { fitPadding } from '../../lib/mapFrame'

export interface MapPlace {
  id: string
  lat: number
  lng: number
  name: string
  /** Encore dans le brouillard : un « ? » ; découvert : son icône et son nom. */
  hidden: boolean
  icon: string
}

/** Une balade sur la carte : son tracé et sa couleur. */
export interface MapWalk {
  id: string
  color: string
  points: LatLng[]
}

interface Props {
  cells: Set<string>
  tracks: MapWalk[]
  /** Les points à cadrer : les balades du coin où l’on est (T-020). Par défaut, toutes. */
  frame?: LatLng[]
  /** Change quand on change de coin (ou de filtre) : la carte se recadre. */
  frameKey?: string
  /** Ma position, demandée avec « Autour de moi » : un point bleu. */
  me?: LatLng
  /** Toucher le tracé d’une balade (hors balade mise en avant) : la mettre en avant. */
  onWalk?: (id: string) => void
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
  /** Les boutons + et − : `n` change à chaque toucher, `delta` dit dans quel sens zoomer. */
  zoom?: { n: number; delta: number }
  /** Change à chaque toucher sur la boussole : la carte revient face au nord. */
  north?: number
  /** Le nom du chien du compte (libellés accessibles). */
  dogName: string
  /** Une balade mise en avant (depuis un souvenir) : son tracé, ses repères, ses photos, le replay. */
  walk?: {
    id: string
    route: Route
    photos: WalkPhoto[]
    replaying: boolean
    onReplayEnd: () => void
    /** Toucher le tracé (ou tout près) : y ajouter un repère. */
    onTapRoute: (at: { lat: number; lng: number }) => void
    /** Toucher ailleurs (ni le tracé, ni une autre balade) : revenir à toutes les balades. */
    onLeave: () => void
    onPhoto: (index: number) => void
    /** La couleur de la balade sur la carte. */
    color?: string
  }
}

// Un brouillard bien opaque : la découverte se voit (T-014).
const FOG = { plan: { color: '#22332F', opacity: 0.94 }, satellite: { color: '#FFFFFF', opacity: 0.86 } }
/** Les marges de la carte : les boutons du haut et le panneau du bas en couvrent une partie. */
const FRAME = { top: 130, bottom: 460, left: 40, right: 40 }
/** Les marges du cadrage, adaptées à la taille réelle de la carte (petits écrans). */
const frameOf = (m: MapLibreMap) => fitPadding(FRAME, m.getContainer().clientWidth, m.getContainer().clientHeight)
/** Rayon de toucher autour d’un tracé, en pixels : un doigt n’est pas une souris. */
const TAP_PX = 14

/** Les tracés des balades : un liseré blanc dessous, la couleur de chaque balade dessus. */
function drawWalks(m: MapLibreMap, walks: MapWalk[], dimmed: boolean) {
  const data = { type: 'FeatureCollection' as const, features: walks.filter((w) => w.points.length > 1).map((w) => ({ type: 'Feature' as const, properties: { id: w.id, color: w.color }, geometry: { type: 'LineString' as const, coordinates: w.points.map(lngLat) } })) }
  const source = m.getSource('trajets') as GeoJSONSource | undefined
  if (source) source.setData(data)
  else {
    m.addSource('trajets', { type: 'geojson', data })
    m.addLayer({ id: 'trajets-liseré', type: 'line', source: 'trajets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 7 } })
    m.addLayer({ id: 'trajets', type: 'line', source: 'trajets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4 } })
  }
  // Une balade mise en avant : les autres s’effacent.
  m.setPaintProperty('trajets', 'line-opacity', dimmed ? 0.3 : 1)
  m.setPaintProperty('trajets-liseré', 'line-opacity', dimmed ? 0.15 : 0.85)
  // Les trajets restent au-dessus du brouillard, la balade mise en avant au-dessus de tout.
  m.moveLayer('trajets-liseré')
  m.moveLayer('trajets')
  for (const id of ['balade-liseré', 'balade', 'parcouru']) if (m.getLayer(id)) m.moveLayer(id)
}

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
  // Le bord de l’image (1 pixel) reste transparent : l’aplat du reste du monde passe dessous, sans trou ni double voile
  // à la jonction (audit R-016).
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, layout.width, EDGE)
  ctx.fillRect(0, layout.height - EDGE, layout.width, EDGE)
  ctx.fillRect(0, 0, EDGE, layout.height)
  ctx.fillRect(layout.width - EDGE, 0, EDGE, layout.height)
  return canvas
}

/** Largeur du bord de l’image recouvert par l’aplat, en pixels d’image. */
const EDGE = 1

/** Le trou de l’aplat : le rectangle de l’image, rentré du bord transparent. */
function innerBox(layout: FogLayout): [number, number, number, number] {
  const [s, w, n, e] = layout.bbox
  const dLat = ((n - s) / layout.height) * EDGE
  const dLng = ((e - w) / layout.width) * EDGE
  return [s + dLat, w + dLng, n - dLat, e - dLng]
}

/**
 * La carte qui se découvre : le brouillard (un seul polygone troué, bords adoucis), les trajets en pointillés,
 * les lieux à découvrir. Plan ou satellite, 2D ou 3D.
 */
export function ExplorerMap({ cells, tracks, frame, frameKey, me, onWalk, places, satellite, three, center, focus, onPlace, onMapTap, onBearing, north, zoom, walk, dogName }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const handlers = useRef({ onPlace, onMapTap, onBearing, walk, onWalk })
  handlers.current = { onPlace, onMapTap, onBearing, walk, onWalk }
  const framePoints = frame && frame.length ? frame : tracks.flatMap((t) => t.points)
  const allTracks = useRef(framePoints)
  allTracks.current = framePoints
  const framed = useRef(false)
  // Le dernier brouillard dessiné : pour le faire s’effacer en fondu quand de nouvelles zones sont découvertes.
  const lastFog = useRef<{ mode: string; cells: number; canvas?: HTMLCanvasElement; coordinates: [[number, number], [number, number], [number, number], [number, number]] } | null>(null)
  // Tant que le style de carte n’est pas chargé : un indicateur discret (audit R-015).
  const [ready, setReady] = useState(false)
  // Le plan s’affiche d’abord (tuiles légères) ; le satellite arrive par-dessus une fois le plan dessiné (audit R-032).
  const [planDrawn, setPlanDrawn] = useState(false)
  const sat = satellite && planDrawn

  useEffect(() => {
    if (!host.current) return
    // Avec des balades : la carte naît cadrée sur elles, sans passer par un premier endroit (audit R-032).
    const points = walk ? walk.route.points : framePoints
    const m = createMap(host.current, points.length > 1 ? { bounds: { points, padding: fitPadding(FRAME, host.current.clientWidth, host.current.clientHeight) } } : { zoom: 15, ...(center ? { center } : {}) })
    if (points.length > 1) framed.current = true
    map.current = m
    whenReady(m, () => setReady(true))
    let drawn = false
    const showSatellite = () => {
      if (drawn) return
      drawn = true
      setPlanDrawn(true)
    }
    m.once('idle', showSatellite)
    // Réseau lent : le satellite n’attend pas plus de 4 s.
    const late = window.setTimeout(showSatellite, 4000)
    m.on('rotate', () => handlers.current.onBearing?.(m.getBearing()))
    // Sur ordinateur : la main au-dessus d’un tracé.
    m.on('mouseenter', 'trajets', () => {
      if (!handlers.current.walk) m.getCanvas().style.cursor = 'pointer'
    })
    m.on('mouseleave', 'trajets', () => {
      m.getCanvas().style.cursor = ''
    })
    // Un toucher pendant « Revoir la balade » ne fait qu’arrêter le replay : noté au moment où le doigt se pose.
    let stoppingReplay = false
    const press = () => {
      stoppingReplay = Boolean(handlers.current.walk?.replaying)
    }
    m.on('mousedown', press)
    m.on('touchstart', press)
    // Le tracé d’une balade touché (ou tout près), hors celle déjà mise en avant.
    const walkAt = ({ x, y }: { x: number; y: number }, except?: string) =>
      m.getLayer('trajets')
        ? (m.queryRenderedFeatures([[x - TAP_PX, y - TAP_PX], [x + TAP_PX, y + TAP_PX]], { layers: ['trajets'] }).map((f) => f.properties?.id as string | undefined).find((id) => id && id !== except))
        : undefined
    m.on('click', (e) => {
      if (onMarker(e.originalEvent)) return
      const w = handlers.current.walk
      handlers.current.onMapTap?.()
      if (stoppingReplay) return
      const id = walkAt(e.point, w?.id)
      if (!w) {
        // Un tracé touché : cette balade passe au premier plan.
        if (id) handlers.current.onWalk?.(id)
        return
      }
      // Balade mise en avant : son tracé reçoit un repère, une autre balade prend sa place, ailleurs on en sort.
      const at = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (distanceToRoute(at, w.route.points) <= NEAR_ROUTE) w.onTapRoute(at)
      else if (id) handlers.current.onWalk?.(id)
      else w.onLeave()
    })
    return () => {
      window.clearTimeout(late)
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
    const all = framePoints
    if (all.length) {
      // Les boutons du haut et le panneau du bas couvrent la carte : on cadre dans ce qui reste visible.
      // Une fois le style chargé : avant, le cadrage est perdu.
      framed.current = true
      whenReady(m, () => fitPoints(m, all, frameOf(m)))
    } else if (center) m.jumpTo({ center: [center[1], center[0]] })
  }, [tracks, center]) // eslint-disable-line react-hooks/exhaustive-deps

  // Nouveau coin (retour à Saint-Ouen, position demandée) ou nouveau filtre : la carte se recadre (T-020).
  const lastFrameKey = useRef(frameKey)
  useEffect(() => {
    const m = map.current
    if (!m || walk || frameKey === lastFrameKey.current) return
    lastFrameKey.current = frameKey
    if (framePoints.length) whenReady(m, () => fitPoints(m, framePoints, frameOf(m), true))
    else if (me) whenReady(m, () => m.easeTo({ center: [me[1], me[0]], zoom: 15 }))
  }, [frameKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ma position : un point bleu.
  useEffect(() => {
    const m = map.current
    if (!m || !me) return
    const marker = addMarker(m, me, dot('#2F7BF6', 20, 'Vous êtes ici'))
    return () => void marker.remove()
  }, [me?.[0], me?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current
    if (m && zoom?.n) m.easeTo({ zoom: m.getZoom() + zoom.delta, duration: 300 })
  }, [zoom?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map.current && north) map.current.easeTo({ bearing: 0, duration: 500 })
  }, [north])

  // La balade mise en avant, redessinée quand ses repères ou ses photos changent.
  const walkRoute = walk?.route
  const walkPhotos = walk?.photos
  const walkColor = walk?.color
  useEffect(() => {
    const m = map.current
    if (!m || !walkRoute) return
    const hide = showWalk(m, walkRoute, walkPhotos ?? [], (i) => handlers.current.walk?.onPhoto(i), walkColor)
    return () => {
      hide()
      // Retour à « Toutes les balades » : la carte reprend la vue d’ensemble (une autre balade se cadrera elle-même).
      const points = allTracks.current
      if (map.current === m && !handlers.current.walk && points.length) whenReady(m, () => fitPoints(m, points, frameOf(m), true))
    }
  }, [walkRoute, walkPhotos, walkColor])

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
    if (map.current) setSatellite(map.current, sat)
  }, [sat])

  useEffect(() => {
    if (map.current) set3D(map.current, three)
  }, [three])

  // Le brouillard et les trajets, redessinés quand ils changent ou quand on passe en satellite.
  useEffect(() => {
    const m = map.current
    if (!m) return
    whenReady(m, () => {
      const mode = sat ? 'satellite' : 'plan'
      const layout = fogLayout(cells)
      // De nouvelles zones découvertes (après un import) : l’ancien brouillard reste par-dessus et s’efface en fondu
      // (T-033). Pas au premier dessin, ni en changeant de fond de carte.
      const previous = lastFog.current
      const revealed = previous && previous.mode === mode && cells.size > previous.cells && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      for (const id of ['brouillard-ancien']) {
        if (m.getLayer(id)) m.removeLayer(id)
        if (m.getSource(id)) m.removeSource(id)
      }
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
      const rings = layout ? [world, rectangle(innerBox(layout))] : [world]
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
      if (revealed && previous.canvas) {
        m.addSource('brouillard-ancien', { type: 'canvas', canvas: previous.canvas, animate: false, coordinates: previous.coordinates })
        m.addLayer({ id: 'brouillard-ancien', type: 'raster', source: 'brouillard-ancien', paint: { 'raster-fade-duration': 0, 'raster-opacity': 1, 'raster-opacity-transition': { duration: 900, delay: 150 } } })
        requestAnimationFrame(() => m.getLayer('brouillard-ancien') && m.setPaintProperty('brouillard-ancien', 'raster-opacity', 0))
        window.setTimeout(() => {
          if (m.getLayer('brouillard-ancien')) m.removeLayer('brouillard-ancien')
          if (m.getSource('brouillard-ancien')) m.removeSource('brouillard-ancien')
        }, 1200)
      }
      const image = m.getSource('brouillard-image') as { getCanvas?: () => HTMLCanvasElement; coordinates?: [number, number][] } | undefined
      lastFog.current = { mode, cells: cells.size, canvas: image?.getCanvas?.(), coordinates: (image?.coordinates ?? []) as [[number, number], [number, number], [number, number], [number, number]] }
      drawWalks(m, tracks, Boolean(walkRoute))
    })
  }, [cells, tracks, sat, Boolean(walkRoute)]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Tant que la carte charge : un fond qui scintille doucement (squelette, T-033) et l’indicateur (R-015). */}
      {!ready && <span aria-hidden="true" className="skeleton pointer-events-none absolute inset-0 z-[5] rounded-none" />}
      {!ready && (
        <div role="status" className="pointer-events-none absolute inset-x-0 top-[40%] z-10 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[15px] font-semibold text-text shadow-[0_2px_8px_rgba(24,32,30,0.2)]">
            <span className="size-4 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" aria-hidden="true" />
            Chargement de la carte…
          </span>
        </div>
      )}
      <div ref={host} role="application" aria-label={`Carte du territoire ${ofName(dogName)}`} className="size-full" />
    </div>
  )
}
