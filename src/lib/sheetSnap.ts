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

/** Au-dessus de l’action fixée ou du rond Accueil : un peu d’air (px). */
export const SNAP_GAP = 12

/**
 * Les trois positions du panneau (R-091, R-082 : une seule règle pour les deux panneaux de la carte).
 * - moitié : au moins la moitié de l’écran, et assez pour montrer tout ce qui précède `halfBottom` (le bas des
 *   premières actions, ou de la première rangée de balades) au-dessus de ce qui couvre le bas (`bottomInset`) ;
 *   jamais plus haut que le cran haut (petit écran, grand texte : les deux crans se rejoignent) ;
 * - réduit : le titre (`peekBottom`) au-dessus de ce qui couvre le bas, jamais au-dessus de la moitié.
 * Les distances sont mesurées depuis le haut du panneau ; `height` est sa hauteur, `container` celle de la carte.
 */
export function sheetPositions({ height, container, peekBottom, halfBottom, bottomInset = 0 }: { height: number; container: number; peekBottom: number; halfBottom?: number; bottomInset?: number }): Record<Snap, number> {
  const needed = halfBottom === undefined ? 0 : halfBottom + bottomInset + SNAP_GAP
  const half = Math.max(0, height - Math.max(container / 2, needed))
  const collapsed = Math.max(half, height - peekBottom - SNAP_GAP - bottomInset)
  return { full: 0, half, collapsed }
}
