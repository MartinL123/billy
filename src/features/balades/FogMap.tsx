import { useEffect, useRef } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { createMap, fitPoints, whenReady, type LatLng } from '../../components/maplibre'
// Brouillard à 0,72 : les rues restent lisibles dessous, même quand rien n'est encore découvert (carte « toute grise » du 17 octobre).
import { fogShape } from '../../lib/fogShape'

/** Le brouillard : partout, sauf sur les cellules découvertes. */
export function FogMap({ cells, center }: { cells: Set<string>; /** Sans zone découverte : la dernière balade (ou Paris). */ center?: LatLng }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<ReturnType<typeof createMap> | null>(null)

  useEffect(() => {
    if (!host.current) return
    const m = createMap(host.current, { zoom: 14, ...(center ? { center } : {}) })
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
      m.addLayer({ id: 'brouillard', type: 'fill', source: 'brouillard', paint: { 'fill-color': '#EEF0EE', 'fill-opacity': 0.72 } })
      m.addLayer({ id: 'brouillard-bord', type: 'line', source: 'brouillard', paint: { 'line-color': '#1E5A50', 'line-width': 1, 'line-opacity': 0.35 } })
    })
  }, [cells])

  // Le CSS de MapLibre met la carte en position: relative : la hauteur vient donc d'un conteneur à part,
  // sinon la carte fait 0 px de haut et l'écran reste gris (bug du 17 octobre).
  return (
    <div className="absolute inset-0 isolate">
      <div ref={host} role="img" aria-label="Carte de l'exploration : le brouillard se lève là où vous êtes passés" className="size-full" />
    </div>
  )
}
