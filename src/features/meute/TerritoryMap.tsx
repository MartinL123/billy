import { useEffect, useRef } from 'react'
import { addMarker, createMap, fitPoints } from '../../components/maplibre'

/** Les spots marqués, à la couleur du chien. */
export function TerritoryMap({ spots, color }: { spots: { lat: number; lng: number; name: string }[]; color: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current || spots.length === 0) return
    const map = createMap(host.current, { center: [spots[0]!.lat, spots[0]!.lng] })
    for (const s of spots) {
      const pin = document.createElement('span')
      pin.title = s.name
      pin.style.cssText = `display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box`
      addMarker(map, [s.lat, s.lng], pin, { anchor: 'bottom' })
    }
    fitPoints(map, spots.map((s) => [s.lat, s.lng]), 40)
    return () => map.remove()
  }, [spots, color])
  return <div ref={host} role="img" aria-label="Carte de son territoire" className="isolate size-full" />
}
