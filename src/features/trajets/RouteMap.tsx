import { useEffect, useRef, useState } from 'react'
import { addMarker, createMap, dot, fitPoints, onMarker, set3D, setLine, whenReady, type MapLibreMap } from '../../components/maplibre'
import { momentMarker } from './momentIcons'
import { loadFile } from '../../firebase/files'
import { Map3DToggle } from '../../components/Map3DToggle'
import { distanceMeters } from '../../lib/community'
import { distanceToRoute, NEAR_ROUTE, type Route } from '../../lib/route'

/** La grande carte d'un trajet : le chemin, le départ en vert, l'arrivée, les moments en couleur. Bouton 2D/3D. */
export function RouteMap({ route, photos = [], onPhoto, onMoment, onTapRoute, onMissRoute }: { route: Route; /** Photos placées sur la balade (index dans les photos du moment). */ photos?: { index: number; thumbFileId: string; lat: number; lng: number }[]; onPhoto?: (index: number) => void; onMoment?: (index: number) => void; /** Toucher le tracé (ou tout près) : y ajouter un repère. */ onTapRoute?: (at: { lat: number; lng: number }) => void; onMissRoute?: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [is3D, setIs3D] = useState(false)
  const handlers = useRef({ onTapRoute, onMissRoute, onPhoto })
  handlers.current = { onTapRoute, onMissRoute, onPhoto }

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
