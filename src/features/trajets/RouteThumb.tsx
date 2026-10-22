import { useEffect, useRef, useState } from 'react'
import { routeMomentInfo, type RouteMoment, type RoutePoint } from '../../lib/route'
import { canDrawMiniMaps, knownMiniMap, miniMapImage, miniMapKey } from './miniMap'

/**
 * Mini-carte d’un trajet (V6 § 1, T-077) : le tracé vert sur un vrai fond de carte (OpenFreeMap), départ en vert foncé,
 * repères en couleur. L’image n’est demandée qu’une fois la vignette à l’écran (une liste longue ne dessine que ce qu’on
 * voit). En attendant, ou sans carte possible (hors ligne et jamais vue), le tracé seul, dessiné en SVG.
 */
export function RouteThumb({ points, moments = [], size = 96, round = false }: { points: RoutePoint[]; moments?: RouteMoment[]; size?: number; round?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const key = miniMapKey(points, moments, size)
  const [drawn, setDrawn] = useState<{ key: string; url: string } | undefined>()
  const image = drawn?.key === key ? drawn.url : points.length > 1 ? knownMiniMap(points, moments, size) : undefined

  useEffect(() => {
    const el = ref.current
    if (image || !el || points.length < 2 || !canDrawMiniMaps()) return
    let live = true
    const observer = new IntersectionObserver(
      (seen) => {
        if (!seen.some((s) => s.isIntersecting)) return
        observer.disconnect()
        void miniMapImage(points, moments, size).then((url) => live && url && setDrawn({ key, url }))
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => {
      live = false
      observer.disconnect()
    }
    // La clé résume le tracé, les repères et la taille.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, image])

  if (points.length === 0) return null
  const shape = round ? 'rounded-full' : 'rounded-field'
  return (
    <span ref={ref} aria-hidden="true" className={`relative block shrink-0 overflow-hidden bg-[#E8EFE9] ${shape}`} style={{ width: size, height: size }}>
      {image ? <img src={image} alt="" width={size} height={size} className="block size-full object-cover" /> : <TrackSvg points={points} moments={moments} size={size} />}
    </span>
  )
}

/** Le tracé seul, en SVG : l’attente de la carte, ou la vignette hors ligne. */
function TrackSvg({ points, moments, size }: { points: RoutePoint[]; moments: RouteMoment[]; size: number }) {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const k = Math.cos((lats[0]! * Math.PI) / 180)
  const [minX, maxX] = [Math.min(...lngs) * k, Math.max(...lngs) * k]
  const [minY, maxY] = [Math.min(...lats), Math.max(...lats)]
  const span = Math.max(maxX - minX, maxY - minY, 1e-5)
  const pad = 16
  const scale = (100 - 2 * pad) / span
  const x = (lng: number) => pad + (lng * k - minX) * scale + (100 - 2 * pad - (maxX - minX) * scale) / 2
  const y = (lat: number) => 100 - (pad + (lat - minY) * scale + (100 - 2 * pad - (maxY - minY) * scale) / 2)
  const path = points.map(([lat, lng], i) => `${i ? 'L' : 'M'}${x(lng).toFixed(1)} ${y(lat).toFixed(1)}`).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block">
      <path d={path} fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="var(--color-route)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points[0]![1])} cy={y(points[0]![0])} r="6" fill="#1E5A50" stroke="#FFFFFF" strokeWidth="2" />
      {moments.map((m, i) => (
        <circle key={i} cx={x(m.lng)} cy={y(m.lat)} r="5" fill={routeMomentInfo(m.type).color} stroke="#FFFFFF" strokeWidth="2" />
      ))}
    </svg>
  )
}
