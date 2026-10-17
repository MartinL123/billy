import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Le worker de MapLibre, empaqueté par Vite (avec ce qu'il importe) : son chemin d'origine ne survit pas au build.
// En dev, MapLibre le trouve seul, à côté de son fichier (voir optimizeDeps dans vite.config.ts).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

if (import.meta.env.PROD) setWorkerUrl(workerUrl)

// Toutes les cartes de l'app : MapLibre GL, fond OpenFreeMap (gratuit, sans clé, bâtiments en 3D),
// relief des AWS Terrain Tiles (Terrarium). Aucun compte, aucune clé, rien de payant.

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
// Vue satellite : Esri World Imagery, sans clé (usage personnel ; conditions à relire avant d'ouvrir à des inconnus).
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

/** Un point de l'app : [latitude, longitude]. MapLibre attend l'inverse. */
export type LatLng = [number, number]
export const lngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat]

export const PARIS: LatLng = [48.8566, 2.3522]

export function createMap(container: HTMLElement, { center = PARIS, zoom = 15, interactive = true }: { center?: LatLng; zoom?: number; interactive?: boolean } = {}): MapLibreMap {
  const map = new MapLibreMap({
    container,
    style: MAP_STYLE,
    center: lngLat(center),
    zoom,
    interactive,
    attributionControl: { compact: true },
    // Au doigt : pas de rotation par erreur en 2D ; la 3D se met avec le bouton.
    dragRotate: false,
    pitchWithRotate: false,
    maxPitch: 70,
  })
  map.once('load', () => ready.add(map))
  // L'attribution reste repliée (un « i » qui l'ouvre) : sur un petit écran, dépliée, elle cache la carte.
  map.once('load', () => container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
  return map
}

// Cartes dont le style est chargé. `isStyleLoaded()` repasse à faux pendant le chargement de tuiles :
// on retient donc le premier « load », une fois pour toutes.
const ready = new WeakSet<MapLibreMap>()

/** Lance `run` quand le style est prêt (tout de suite s'il l'est déjà). */
export function whenReady(map: MapLibreMap, run: () => void): void {
  if (ready.has(map)) run()
  else map.once('load', run)
}

/** Une ligne (GeoJSON) : créée la première fois, mise à jour ensuite. */
export function setLine(map: MapLibreMap, id: string, lines: LatLng[][], paint: { color: string; width: number; opacity?: number }): void {
  const data = { type: 'FeatureCollection' as const, features: lines.filter((l) => l.length > 1).map((l) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: l.map(lngLat) } })) }
  const source = map.getSource(id) as GeoJSONSource | undefined
  if (source) return void source.setData(data)
  map.addSource(id, { type: 'geojson', data })
  map.addLayer({ id, type: 'line', source: id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': paint.color, 'line-width': paint.width, 'line-opacity': paint.opacity ?? 1 } })
}

/** Un rond coloré à bord blanc (départ, arrivée, moment). */
export function dot(color: string, size = 18, label?: string): HTMLElement {
  const el = document.createElement('span')
  el.style.cssText = `display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box`
  if (label) el.title = label
  return el
}

export function addMarker(map: MapLibreMap, at: LatLng, element: HTMLElement, options: { draggable?: boolean; anchor?: 'center' | 'bottom' | 'left' } = {}): Marker {
  return new Marker({ element, draggable: options.draggable ?? false, anchor: options.anchor ?? 'center' }).setLngLat(lngLat(at)).addTo(map)
}

/** Cadre la carte sur des points (un seul point : zoom de quartier). */
export function fitPoints(map: MapLibreMap, points: LatLng[], padding: number | { top: number; bottom: number; left: number; right: number } = 32, animate = false, camera: { pitch?: number; bearing?: number } = {}): void {
  if (points.length === 0) return
  if (points.length === 1) return void map.jumpTo({ center: lngLat(points[0]!), zoom: 16, ...camera })
  const bounds = points.reduce((b, p) => b.extend(lngLat(p)), new LngLatBounds(lngLat(points[0]!), lngLat(points[0]!)))
  map.fitBounds(bounds, { padding, maxZoom: 17, animate, ...camera })
}

/** Un toucher sur un repère ne compte pas comme un toucher sur la carte. */
export const onMarker = (event: Event | undefined) => Boolean((event?.target as Element | null)?.closest?.('.maplibregl-marker'))

/** 3D : relief (Terrarium) et carte inclinée à 60° ; les bâtiments du style s'élèvent. 2D : à plat, vue du dessus. */
export function set3D(map: MapLibreMap, on: boolean): void {
  whenReady(map, () => {
    if (on) {
      if (!map.getSource('relief')) map.addSource('relief', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: 'Relief : Mapzen, AWS Terrain Tiles' })
      map.setTerrain({ source: 'relief', exaggeration: 1.2 })
      map.dragRotate.enable()
      map.easeTo({ pitch: 60, duration: 800 })
    } else {
      map.setTerrain(null)
      map.dragRotate.disable()
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 })
    }
  })
}

/** Satellite : l'imagerie passe sous les noms de rues et de lieux (premier calque de texte du style), au-dessus du reste. */
export function setSatellite(map: MapLibreMap, on: boolean): void {
  whenReady(map, () => {
    if (on) {
      if (!map.getSource('satellite')) map.addSource('satellite', { type: 'raster', tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 19, attribution: 'Imagerie © Esri' })
      if (!map.getLayer('satellite')) {
        const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
        map.addLayer({ id: 'satellite', type: 'raster', source: 'satellite' }, firstLabel)
      }
    } else if (map.getLayer('satellite')) map.removeLayer('satellite')
  })
}

export type { MapLibreMap, Marker }
