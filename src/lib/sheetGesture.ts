// R-099 : qui prend le geste du doigt sur le panneau de la carte, à chaque mouvement : le panneau (il suit le doigt)
// ou la liste qu’il contient (elle défile). Safari iOS ne connaît pas `touch-action: pan-up`, et un changement de
// `touch-action` ne vaut qu’au geste suivant : la décision se prend donc ici, mouvement par mouvement, dans le même geste.

/** `panel` : le panneau suit le doigt ; `list` : la liste défile ; `none` : geste horizontal, laissé au navigateur. */
export type GestureOwner = 'panel' | 'list' | 'none'

/** En deçà (px), c’est un toucher : personne ne prend le geste, le bouton ou la carte touchée s’ouvre. */
export const TAP_SLOP = 6

/**
 * Le preneur de ce mouvement.
 * - `owner` : le preneur du mouvement précédent dans ce geste (`null` : pas encore décidé) ;
 * - `y` : la position du panneau (translateY, 0 = cran haut) ;
 * - `scrollTop` : le défilement de la liste (0 si le doigt n’est pas sur la liste) ;
 * - `dx`, `dy` : le chemin parcouru depuis le début du geste ; `step` : le mouvement vertical depuis le précédent
 *   (négatif : vers le haut).
 * Règles : hors du cran haut, le panneau prend le geste ; arrivé en haut, le doigt qui monte encore fait défiler la
 * liste. Au cran haut, la liste défile ; tout en haut de la liste, le doigt qui descend fait descendre le panneau.
 */
export function sheetGesture({ owner, y, scrollTop, dx, dy, step }: { owner: GestureOwner | null; y: number; scrollTop: number; dx: number; dy: number; step: number }): GestureOwner | null {
  if (owner === 'none') return 'none'
  if (owner === null) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TAP_SLOP) return null
    // Une rangée qui défile à l’horizontale (les filtres, les idées) garde son geste.
    if (Math.abs(dx) > Math.abs(dy)) return 'none'
    if (y > 0) return 'panel'
    return dy > 0 && scrollTop <= 0 ? 'panel' : 'list'
  }
  if (owner === 'panel') return y <= 0 && step < 0 ? 'list' : 'panel'
  return scrollTop <= 0 && step > 0 ? 'panel' : 'list'
}

/**
 * Le panneau suit le doigt (`step`) depuis `y` ; il ne monte pas plus haut que le cran haut : ce qui reste du
 * mouvement vers le haut (`rest`, négatif) revient à la liste. Plus bas que le cran réduit (`max`), il résiste (un
 * tiers du geste) : `raw` garde la position sans résistance.
 */
export function movePanel(raw: number, step: number, max: number): { raw: number; y: number; rest: number } {
  const next = raw + step
  if (next < 0) return { raw: 0, y: 0, rest: next }
  return { raw: next, y: next > max ? max + (next - max) / 3 : next, rest: 0 }
}

/**
 * La liste défile à la main (après un passage du panneau à la liste dans le même geste, le défilement natif ne peut
 * plus démarrer) : `step` vers le haut la fait descendre. Ce qui dépasse le haut de la liste (`rest`, positif) revient
 * au panneau.
 */
export function moveList(scrollTop: number, step: number, maxScroll: number): { scrollTop: number; rest: number } {
  const next = scrollTop - step
  if (next < 0) return { scrollTop: 0, rest: -next }
  return { scrollTop: Math.min(maxScroll, next), rest: 0 }
}

/** La vitesse du doigt (px/ms) sur ses derniers mouvements (au plus `window` ms), pour l’élan au lâcher. */
export function releaseSpeed(samples: { y: number; t: number }[], window = 100): number {
  const last = samples[samples.length - 1]
  if (!last) return 0
  const first = samples.find((s) => last.t - s.t <= window) ?? last
  return last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
}
