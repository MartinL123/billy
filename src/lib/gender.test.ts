import { describe, expect, it } from 'vitest'
import { feminize, forSex, isFemale, ofName } from './gender'

describe('accord au féminin (audit R-006)', () => {
  it('passe le chien au féminin', () => {
    expect(feminize('Ce qu’il apprend en ce moment')).toBe('Ce qu’elle apprend en ce moment')
    expect(feminize('Est-il stérilisé ?')).toBe('Est-elle stérilisée ?')
    expect(feminize('Que mange-t-il ?')).toBe('Que mange-t-elle ?')
    expect(feminize('S’il ne mange plus, il est trop stressé : arrêtez.')).toBe('Si elle ne mange plus, elle est trop stressée : arrêtez.')
    expect(feminize('Il a peur des enfants')).toBe('Elle a peur des enfants')
    expect(feminize('Né le')).toBe('Née le')
    expect(feminize('Stérilisé')).toBe('Stérilisée')
  })
  it('ne touche pas au « il » impersonnel ni au reste de la phrase', () => {
    expect(feminize('Il faut des friandises.')).toBe('Il faut des friandises.')
    expect(feminize('Il y a 2 ans')).toBe('Il y a 2 ans')
    expect(feminize('Il est 17 h 40.')).toBe('Il est 17 h 40.')
    expect(feminize('Il reste 3 minutes.')).toBe('Il reste 3 minutes.')
    expect(feminize('Il reste assis. Seul le premier compte.')).toBe('Elle reste assise. Seul le premier compte.')
    expect(feminize('Ilona joue')).toBe('Ilona joue')
  })
  it('masculin par défaut', () => {
    expect(isFemale('Femelle')).toBe(true)
    expect(isFemale('Mâle')).toBe(false)
    expect(forSex('Est-il stérilisé ?', undefined)).toBe('Est-il stérilisé ?')
    expect(forSex('Est-il stérilisé ?', 'Femelle')).toBe('Est-elle stérilisée ?')
  })
})

describe('élision devant un nom (audit R-007)', () => {
  it('d’Oslo, d’Hector, de Billy', () => {
    expect(ofName('Oslo')).toBe('d’Oslo')
    expect(ofName('Hector')).toBe('d’Hector')
    expect(ofName('Élise')).toBe('d’Élise')
    expect(ofName('Billy')).toBe('de Billy')
    expect(ofName('Yoda')).toBe('de Yoda')
    expect(ofName('Yvette')).toBe('d’Yvette')
  })
})
