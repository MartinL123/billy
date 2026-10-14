import { routeMomentInfo, type RouteMoment, type RoutePoint } from '../../lib/route'

/**
 * Mini-carte d'un trajet, dessinée en SVG (sans fond de carte) : légère à faire défiler dans le Carnet.
 * Départ en vert, moments en couleur.
 */
export function RouteThumb({ points, moments = [], size = 96, round = false }: { points: RoutePoint[]; moments?: RouteMoment[]; size?: number; round?: boolean }) {
  if (points.length === 0) return null
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const k = Math.cos((lats[0]! * Math.PI) / 180)
  const [minX, maxX] = [Math.min(...lngs) * k, Math.max(...lngs) * k]
  const [minY, maxY] = [Math.min(...lats), Math.max(...lats)]
  const span = Math.max(maxX - minX, maxY - minY, 1e-5)
  const pad = 12
  const scale = (100 - 2 * pad) / span
  const x = (lng: number) => pad + (lng * k - minX) * scale + ((100 - 2 * pad) - (maxX - minX) * scale) / 2
  const y = (lat: number) => 100 - (pad + (lat - minY) * scale + ((100 - 2 * pad) - (maxY - minY) * scale) / 2)
  const path = points.map(([lat, lng], i) => `${i ? 'L' : 'M'}${x(lng).toFixed(1)} ${y(lat).toFixed(1)}`).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`shrink-0 bg-[#E8EFE9] ${round ? 'rounded-full' : 'rounded-[14px]'}`}>
      <path d={path} fill="none" stroke="#9A4413" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points[0]![1])} cy={y(points[0]![0])} r="6" fill="#1E5A50" stroke="#FFFFFF" strokeWidth="2" />
      {moments.map((m, i) => (
        <circle key={i} cx={x(m.lng)} cy={y(m.lat)} r="5" fill={routeMomentInfo(m.type).color} stroke="#FFFFFF" strokeWidth="2" />
      ))}
    </svg>
  )
}
