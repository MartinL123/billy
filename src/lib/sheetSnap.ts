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

/** R-102 : l’écart minimal entre le cran réduit et celui du milieu (px) : baisser le panneau dégage vraiment la carte. */
export const LOW_GAIN = 120

/**
 * Les trois positions du panneau (R-091, R-082 : une seule règle pour les deux panneaux de la carte).
 * - moitié : au moins la moitié de l’écran, et assez pour montrer tout ce qui précède `halfBottom` (le bas des
 *   premières actions, ou de la première rangée de balades) au-dessus de ce qui couvre le bas (`bottomInset`) ;
 *   jamais plus haut que le cran haut (petit écran, grand texte : les deux crans se rejoignent) ;
 * - réduit : le titre (`peekBottom`) au-dessus de ce qui couvre le bas, au moins `LOW_GAIN` sous la moitié. T-097 : le
 *   panneau des Balades réduit n’a plus d’action fixée en bas (`peekInset` 0) et se colle à la barre d’onglets
 *   (`peekGap` 0), son titre coupé à mi-hauteur.
 * Les distances sont mesurées depuis le haut du panneau ; `height` est sa hauteur, `container` celle de la carte.
 */
export function sheetPositions({ height, container, peekBottom, halfBottom, bottomInset = 0, peekInset = bottomInset, peekGap = SNAP_GAP }: { height: number; container: number; peekBottom: number; halfBottom?: number; bottomInset?: number; peekInset?: number; peekGap?: number }): Record<Snap, number> {
  const needed = halfBottom === undefined ? 0 : halfBottom + bottomInset + SNAP_GAP
  // R-096, R-102 : réduit, ce qu’il doit montrer y est entier (les commandes de la relecture, le titre d’une balade) ;
  // le cran du milieu laisse toujours au moins LOW_GAIN de plus au panneau (sinon il remonte, jusqu’au cran haut).
  const collapsed = Math.max(LOW_GAIN, height - peekBottom - peekGap - peekInset)
  const half = Math.max(0, Math.min(height - Math.max(container / 2, needed), collapsed - LOW_GAIN))
  // Un cran du milieu à moins de LOW_GAIN du haut ne montrerait qu’une bande de carte : il rejoint le cran haut.
  return { full: 0, half: half < LOW_GAIN ? 0 : half, collapsed }
}
