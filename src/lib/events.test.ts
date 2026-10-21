import { describe, expect, it } from 'vitest'
import { lateLabel, markShape, typeInfo, typesSentence } from './events'

describe('soin en retard (audit R-002)', () => {
  it('dit de combien de jours', () => {
    expect(lateLabel('2026-08-10', '2026-10-18')).toBe('En retard de 69 jours')
    expect(lateLabel('2026-10-17', '2026-10-18')).toBe('En retard de 1 jour')
    expect(lateLabel('2026-10-18', '2026-10-18')).toBe('')
    expect(lateLabel('', '2026-10-18')).toBe('')
  })
})

describe('type d’un événement sans la seule couleur (R-061)', () => {
  it('une forme par famille : soin rond, rendez-vous carré, le reste en anneau', () => {
    expect(markShape('vaccin')).toBe('rond')
    expect(markShape('veto')).toBe('carre')
    expect(markShape('etape')).toBe('anneau')
    expect(markShape('inconnu')).toBe('anneau')
  })
  it('le lecteur d’écran lit les types en mots', () => {
    expect(typesSentence(['vaccin', 'veto'])).toBe('vaccin et véto')
    expect(typesSentence(['vermifuge', 'antiparasitaire', 'vermifuge', 'autre'])).toBe('vermifuge, antiparasitaire et autre')
    expect(typesSentence([])).toBe('')
  })
  it('les pastilles à texte blanc ont un fond assez foncé', () => {
    expect(typeInfo('autre').pill).toBe('#5A6662')
    expect(typeInfo('etape').pill).toBe('#8A3E0C')
  })
})
