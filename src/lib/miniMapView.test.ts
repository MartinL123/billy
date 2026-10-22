import { describe, expect, it } from 'vitest'
import { fitView, projectInView } from './miniMapView'

describe('le cadrage des mini-cartes du journal (T-097)', () => {
  const pts: [number, number][] = [
    [48.85, 2.35],
    [48.855, 2.36],
    [48.852, 2.345],
  ]
  it('tous les points dans l’image, avec la marge, et le cadre touché sur un côté', () => {
    const view = fitView(pts, 350, 130, 20)
    const xy = pts.map((p) => projectInView(view, 350, 130, p))
    for (const { x, y } of xy) {
      expect(x).toBeGreaterThanOrEqual(19.9)
      expect(x).toBeLessThanOrEqual(330.1)
      expect(y).toBeGreaterThanOrEqual(19.9)
      expect(y).toBeLessThanOrEqual(110.1)
    }
    const ys = xy.map((p) => p.y)
    // Une image large et basse : c’est la hauteur qui limite.
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(90, 0)
  })
  it('le nord en haut, l’est à droite, le centre au milieu', () => {
    const view = fitView(pts, 300, 300, 30)
    expect(projectInView(view, 300, 300, [48.855, 2.35]).y).toBeLessThan(projectInView(view, 300, 300, [48.85, 2.35]).y)
    expect(projectInView(view, 300, 300, [48.85, 2.36]).x).toBeGreaterThan(projectInView(view, 300, 300, [48.85, 2.35]).x)
    const c = projectInView(view, 300, 300, view.center)
    expect(c.x).toBeCloseTo(150, 5)
    expect(c.y).toBeCloseTo(150, 5)
  })
  it('un tout petit trajet ne zoome pas au-delà de 17', () => {
    expect(fitView([[48.85, 2.35], [48.85001, 2.35001]], 300, 130, 20).zoom).toBe(17)
  })
})
