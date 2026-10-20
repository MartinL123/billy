import { describe, expect, it } from 'vitest'
import { textClasses, textLevel } from './textSize'

describe('texte agrandi (R-056)', () => {
  it('17 et 19 px : rien ne change ; 21 px : grand ; 28 px : très grand', () => {
    expect(textLevel(17)).toBe('normal')
    expect(textLevel(19)).toBe('normal')
    expect(textLevel(21)).toBe('grand')
    expect(textLevel(23)).toBe('grand')
    expect(textLevel(28)).toBe('tres-grand')
  })

  it('les classes s’ajoutent', () => {
    expect(textClasses('normal')).toEqual([])
    expect(textClasses('grand')).toEqual(['texte-grand'])
    expect(textClasses('tres-grand')).toEqual(['texte-grand', 'texte-tres-grand'])
  })
})
