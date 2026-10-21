// R-077 : les trois crans du panneau de la carte (translateY : 0 = haut, plus grand = plus bas).

export type Snap = 'full' | 'half' | 'collapsed'

/** Au-delà de cette vitesse (px/ms), le geste va au cran suivant dans son sens ; sinon, au cran le plus proche. */
export const FLICK = 0.4

const ORDER: Snap[] = ['full', 'half', 'collapsed']

export function nearestSnap(positions: Record<Snap, number>, y: number, speed: number): Snap {
  if (Math.abs(speed) > FLICK) {
    // Le cran suivant dans le sens du geste, à partir de la position actuelle.
    const sorted = ORDER.map((s) => ({ s, p: positions[s] }))
    if (speed > 0) return (sorted.find((c) => c.p > y + 1) ?? sorted[sorted.length - 1]!).s
    return ([...sorted].reverse().find((c) => c.p < y - 1) ?? sorted[0]!).s
  }
  return ORDER.reduce((best, s) => (Math.abs(positions[s] - y) < Math.abs(positions[best] - y) ? s : best), 'half' as Snap)
}
