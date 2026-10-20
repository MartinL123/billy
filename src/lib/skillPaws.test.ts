import { describe, expect, it } from 'vitest'
import { pawsLabel, skillPaws } from './skillPaws'

describe('les étapes en pattes (V5, T-052)', () => {
  it('acquises, en cours, à venir ; un trophée pour la dernière', () => {
    expect(skillPaws(0)).toEqual(['en-cours', 'a-venir', 'a-venir', 'a-venir', 'a-venir'])
    expect(skillPaws(1)).toEqual(['acquise', 'en-cours', 'a-venir', 'a-venir', 'a-venir'])
    expect(skillPaws(5)).toEqual(['acquise', 'acquise', 'acquise', 'acquise', 'acquise'])
  })
  it('un libellé sans « 3 sur 5 »', () => {
    expect(pawsLabel(1)).toBe('1 étape acquise, la suivante est en route')
    expect(pawsLabel(0)).toBe('La première étape est en route')
    expect(pawsLabel(5)).toBe('Toutes les étapes sont acquises')
    expect(pawsLabel(3)).not.toMatch(/sur/)
  })
})
