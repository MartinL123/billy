import { useEffect, useRef } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { createMap, fitPoints, whenReady, type LatLng } from '../../components/maplibre'
import { fogShape } from '../../lib/exploration'

/** Le brouillard : partout, sauf sur les cellules découvertes. */
export function FogMap({ cells }: { cells: Set<string> }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<ReturnType<typeof createMap> | null>(null)

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { zoom: 13 })
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m) return
    const { polygon, centers } = fogShape(cells)
    if (centers.length) fitPoints(m, centers as LatLng[], 40)
    whenReady(m, () => {
      const data = { type: 'Feature' as const, properties: {}, geometry: polygon }
      const source = m.getSource('brouillard') as GeoJSONSource | undefined
      if (source) return void source.setData(data)
      m.addSource('brouillard', { type: 'geojson', data })
      m.addLayer({ id: 'brouillard', type: 'fill', source: 'brouillard', paint: { 'fill-color': '#EEF0EE', 'fill-opacity': 0.9 } })
      m.addLayer({ id: 'brouillard-bord', type: 'line', source: 'brouillard', paint: { 'line-color': '#1E5A50', 'line-width': 1, 'line-opacity': 0.35 } })
    })
  }, [cells])

  return <div ref={host} role="img" aria-label="Carte de l'exploration : le brouillard se lève là où vous êtes passés" className="absolute inset-0 isolate" />
}
