import { CELL_LAT, CELL_LNG } from './fog'

// Le brouillard dessiné dans une image (maquettes V3-Explorer, V4-Balades) : les zones découvertes sont des
// trouées rondes aux bords flous, pas des carrés. L’image couvre les cases découvertes et une marge ; au-delà,
// un simple aplat de la même couleur continue le brouillard.

/** Marge autour des cases découvertes, en cases (≈ 1 km). */
const MARGIN = 20
/** Pixels par case, et taille maximale de l’image (mémoire de l’iPhone). */
const PX_PER_CELL = 8
const MAX_SIDE = 4096

export interface FogLayout {
  /** [sud, ouest, nord, est] de l’image. */
  bbox: [number, number, number, number]
  width: number
  height: number
  /** Centres des cases découvertes, en pixels de l’image. */
  holes: [number, number][]
  /** Rayon d’une trouée, en pixels : un peu plus qu’une case, pour que les trouées voisines se fondent. */
  radius: number
}

export function fogLayout(cells: Iterable<string>): FogLayout | undefined {
  const ij = [...cells].map((c) => c.split('_').map(Number) as [number, number])
  if (ij.length === 0) return undefined
  const i0 = Math.min(...ij.map((c) => c[0])) - MARGIN
  const i1 = Math.max(...ij.map((c) => c[0])) + MARGIN + 1
  const j0 = Math.min(...ij.map((c) => c[1])) - MARGIN
  const j1 = Math.max(...ij.map((c) => c[1])) + MARGIN + 1
  const rows = i1 - i0
  const cols = j1 - j0
  const ppc = Math.max(1, Math.min(PX_PER_CELL, Math.floor(MAX_SIDE / Math.max(rows, cols))))
  return {
    bbox: [i0 * CELL_LAT, j0 * CELL_LNG, i1 * CELL_LAT, j1 * CELL_LNG],
    width: cols * ppc,
    height: rows * ppc,
    holes: ij.map(([i, j]) => [(j - j0 + 0.5) * ppc, (i1 - i - 0.5) * ppc]),
    radius: ppc * 1.25,
  }
}
