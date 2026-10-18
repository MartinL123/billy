import { describe, expect, it } from 'vitest'
import { weighingDue } from './weighing'

describe('rappel de pesée mensuel (T-013)', () => {
  it('propose une pesée un mois après la dernière, tant que le chien grandit', () => {
    expect(weighingDue({ today: '2026-10-18', birthDate: '2026-05-13', lastWeighed: '2026-09-21' })).toBe(false)
    expect(weighingDue({ today: '2026-10-21', birthDate: '2026-05-13', lastWeighed: '2026-09-21' })).toBe(true)
    expect(weighingDue({ today: '2026-10-18', birthDate: '2026-05-13' })).toBe(true)
  })
  it('se tait pour un chien adulte ou d’âge inconnu', () => {
    expect(weighingDue({ today: '2026-10-18', birthDate: '2024-01-01' })).toBe(false)
    expect(weighingDue({ today: '2026-10-18', birthDate: '' })).toBe(false)
  })
})

describe('pesée : cas limites', () => {
  it('« Plus tard » aujourd’hui : rien avant demain', () => {
    expect(weighingDue({ today: '2026-10-21', birthDate: '2026-05-13', lastWeighed: '2026-09-21', postponedOn: '2026-10-21' })).toBe(false)
    expect(weighingDue({ today: '2026-10-22', birthDate: '2026-05-13', lastWeighed: '2026-09-21', postponedOn: '2026-10-21' })).toBe(true)
  })
  it('une date de naissance dans le futur (erreur de saisie) : pas de pesée', () => {
    expect(weighingDue({ today: '2026-10-18', birthDate: '2027-05-13' })).toBe(false)
  })
})
