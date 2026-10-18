import { distanceMeters } from './community'

// L'aperçu de la carte sur l'accueil (T-035) : les tracés du coin de la dernière balade, dessinés en SVG.
// Rien à charger (ni tuiles, ni réseau) : il s'affiche aussi hors ligne.

type Point = [number, number]

/** Les balades à moins de 3 km du départ de la dernière, 12 au plus. */
const AROUND_M = 3000
const MAX_WALKS = 12
/** Points gardés par tracé : bien assez pour un aperçu. */
const MAX_POINTS = 60

/**
 * Les chemins SVG (`d`) des tracés, dans un carré `size` × `size` avec une marge. `walks` : du plus récent au plus
 * ancien, chacun une liste de [lat, lng]. Vide s'il n'y a rien à dessiner.
 */
export function trackThumb(walks: Point[][], size: number, margin = 8): string[] {
  const usable = walks.filter((w) => w.length > 1)
  const origin = usable[0]?.[0]
  if (!origin) return []
  const near = usable.filter((w) => distanceMeters({ lat: w[0]![0], lng: w[0]![1] }, { lat: origin[0], lng: origin[1] }) <= AROUND_M).slice(0, MAX_WALKS)
  // Projection simple : la longitude resserrée selon la latitude, pour garder les proportions.
  const k = Math.cos((origin[0] * Math.PI) / 180)
  const projected = near.map((w) => {
    const step = Math.max(1, Math.ceil(w.length / MAX_POINTS))
    const kept = w.filter((_, i) => i % step === 0 || i === w.length - 1)
    return kept.map(([lat, lng]) => [lng * k, -lat] as Point)
  })
  const all = projected.flat()
  const minX = Math.min(...all.map((p) => p[0]))
  const maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1]))
  const maxY = Math.max(...all.map((p) => p[1]))
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const scale = (size - 2 * margin) / span
  // Centré dans le carré.
  const offX = margin + (size - 2 * margin - (maxX - minX) * scale) / 2
  const offY = margin + (size - 2 * margin - (maxY - minY) * scale) / 2
  const r = (n: number) => Math.round(n * 10) / 10
  return projected.map((w) => w.map(([x, y], i) => `${i ? 'L' : 'M'}${r(offX + (x - minX) * scale)} ${r(offY + (y - minY) * scale)}`).join(''))
}
