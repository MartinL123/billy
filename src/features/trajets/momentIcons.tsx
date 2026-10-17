import { routeMomentInfo, type RouteMomentType } from '../../lib/route'

// Une icône par repère, dessinée en traits blancs sur la couleur du repère (carte et liste).
const PATHS: Record<RouteMomentType, string[]> = {
  peur: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  grogne: ['M3 9l4.5 6L12 9l4.5 6L21 9'],
  rencontre: ['M3 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0', 'M14 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0'],
  jeu: ['M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'M6 6.5c3 2 9 2 12 0', 'M6 17.5c3-2 9-2 12 0'],
  marque: ['M12 3c-3 5-6 8-6 11a6 6 0 0 0 12 0c0-3-3-6-6-11z'],
  rappel: ['M9 14 4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  detendu: ['M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8', 'M9 9.5h.01', 'M15 9.5h.01'],
  note: ['M4 20h4L19 9l-4-4L4 16z'],
}

const paths = (type: string) => PATHS[type as RouteMomentType] ?? PATHS.note

/** Le rond coloré avec son icône, pour la liste et les tuiles. */
export function MomentIcon({ type, size = 32 }: { type: string; size?: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: routeMomentInfo(type).color }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {paths(type).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  )
}

/** Le même, en élément DOM pour un repère MapLibre. */
export function momentMarker(type: string, size = 30): HTMLElement {
  const el = document.createElement('span')
  el.title = routeMomentInfo(type).label
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${routeMomentInfo(type).color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);box-sizing:border-box`
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  for (const [k, v] of Object.entries({ width: String(size * 0.55), height: String(size * 0.55), viewBox: '0 0 24 24', fill: 'none', stroke: '#FFFFFF', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(k, v)
  for (const d of paths(type)) {
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  el.appendChild(svg)
  return el
}
