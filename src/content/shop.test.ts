import { describe, expect, it } from 'vitest'
import { buttonState, SHOP, SHOP_CATEGORIES, THEMES } from './shop'

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1! + 0.05) / (l2! + 0.05)
}

describe('la boutique', () => {
  it('respecte les prix de départ de la spec', () => {
    const range = (cat: string) => SHOP.filter((i) => i.category === cat).map((i) => i.price)
    expect(range('sticker').every((p) => p === 40)).toBe(true)
    expect(range('accessoire').every((p) => p >= 60 && p <= 300)).toBe(true)
    expect(range('cadre').every((p) => p >= 80 && p <= 120)).toBe(true)
    expect(range('fond').every((p) => p >= 200 && p <= 250)).toBe(true)
    expect(range('couleur').every((p) => p === 300)).toBe(true)
    for (const cat of SHOP_CATEGORIES) expect(range(cat.id).length).toBeGreaterThan(0)
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length)
  })

  it('un seul bouton selon l’état : acheter, porter, porté, ou ce qu’il manque', () => {
    const cape = SHOP.find((i) => i.id === 'cape')!
    expect(buttonState(cape, false, false, 240)).toEqual({ kind: 'manque', missing: 60 })
    expect(buttonState(cape, false, false, 300)).toEqual({ kind: 'acheter', price: 300 })
    expect(buttonState(cape, true, false, 0)).toEqual({ kind: 'porter' })
    expect(buttonState(cape, true, true, 0)).toEqual({ kind: 'porte' })
  })

  it('les couleurs de l’app gardent un contraste AA avec le blanc et sur leur fond clair', () => {
    for (const theme of Object.values(THEMES)) {
      expect(contrast(theme.primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
      expect(contrast(theme.dark, theme.soft)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
