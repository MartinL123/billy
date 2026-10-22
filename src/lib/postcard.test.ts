import { describe, expect, it } from 'vitest'
import { postcardDateLine, postcardFileName, postcardLine, postcardRoute, privacyCut, projectRoute } from './postcard'
import { routeDistance, type RoutePoint } from './route'
import { distanceMeters } from './community'

// Une ligne droite vers le nord, un point tous les ~50 m (0,00045° de latitude ≈ 50 m).
const line = (n: number, step = 0.00045): RoutePoint[] => Array.from({ length: n }, (_, i) => [48.85 + i * step, 2.35])
const ll = ([lat, lng]: RoutePoint) => ({ lat, lng })

describe('privacyCut', () => {
  it('retire les 200 premiers et les 200 derniers mètres, au mètre près', () => {
    const points = line(41) // ≈ 2 km
    const total = routeDistance(points)
    const cut = privacyCut(points)
    expect(distanceMeters(ll(points[0]!), ll(cut[0]!))).toBeCloseTo(200, 0)
    expect(distanceMeters(ll(points[points.length - 1]!), ll(cut[cut.length - 1]!))).toBeCloseTo(200, 0)
    expect(routeDistance(cut)).toBeCloseTo(total - 400, 0)
  })

  it('coupe au milieu d’un segment (points espacés)', () => {
    const points: RoutePoint[] = [[48.85, 2.35], [48.8545, 2.35], [48.859, 2.35]] // 2 segments de ≈ 500 m
    const cut = privacyCut(points)
    expect(cut).toHaveLength(3)
    expect(distanceMeters(ll(points[0]!), ll(cut[0]!))).toBeCloseTo(200, 0)
    expect(cut[1]).toEqual(points[1])
  })

  it('ne garde aucun point du domicile, même quand la balade revient au départ', () => {
    const out = line(11)
    const loop = [...out, ...out.slice(0, -1).reverse()] // aller-retour de ≈ 1 km
    const cut = privacyCut(loop)
    for (const p of cut) expect(distanceMeters(ll(loop[0]!), ll(p))).toBeGreaterThanOrEqual(199)
  })

  it('moins de 500 m : aucun tracé', () => {
    expect(privacyCut(line(10))).toEqual([]) // ≈ 450 m
    expect(privacyCut([[48.85, 2.35]])).toEqual([])
    expect(privacyCut([])).toEqual([])
  })

  it('la distance enregistrée compte aussi (balade recadrée ou points approximatifs)', () => {
    expect(postcardRoute(line(41), 450)).toEqual([])
    expect(postcardRoute(line(41), 2000).length).toBeGreaterThan(2)
  })

  it('juste au-dessus de 500 m : il reste un bout de tracé', () => {
    const cut = privacyCut(line(12)) // ≈ 550 m
    expect(cut.length).toBeGreaterThanOrEqual(2)
    expect(routeDistance(cut)).toBeCloseTo(routeDistance(line(12)) - 400, 0)
  })
})

describe('textes de la carte postale', () => {
  it('distance et bouts de territoire, avec des espaces insécables', () => {
    expect(postcardLine(2140, 130)).toBe('2,1 km · 3 bouts de territoire découverts')
    expect(postcardLine(2140, 45)).toBe('2,1 km · un nouveau bout de territoire')
    expect(postcardLine(650, 10)).toBe('650 m')
  })

  it('la date et la commune seulement', () => {
    expect(postcardDateLine('2026-10-22', 'Vertbois')).toBe('22 octobre 2026 · Vertbois')
    expect(postcardDateLine('2026-10-01')).toBe('1er octobre 2026')
  })

  it('un nom de fichier simple', () => {
    expect(postcardFileName('2026-08-15')).toBe('balade-15-aout-2026.jpg')
  })
})

describe('projectRoute', () => {
  it('centre le tracé dans le cadre, avec une marge', () => {
    const px = projectRoute(line(5), { x: 0, y: 0, w: 1000, h: 1000 })
    for (const [x, y] of px) {
      expect(x).toBeGreaterThanOrEqual(119)
      expect(x).toBeLessThanOrEqual(881)
      expect(y).toBeGreaterThanOrEqual(119)
      expect(y).toBeLessThanOrEqual(881)
    }
    // Le nord en haut.
    expect(px[0]![1]).toBeGreaterThan(px[4]![1])
  })
})
