import { describe, expect, it } from 'vitest'
import { badgeLabel } from './billyPage'
import { versionLabel } from './version'

describe('R-113 · textes', () => {
  it('la version, avec l’heure commune', () => {
    expect(versionLabel(new Date(2026, 10, 10, 14, 22))).toBe('Version du 10 novembre à 14 h 22')
    expect(versionLabel(new Date(2026, 10, 1, 9, 0))).toBe('Version du 1er novembre à 9 h')
  })

  it('un badge pour VoiceOver : des étapes acquises, pas « 3/5 »', () => {
    expect(badgeLabel('Le Rappel', 3, 'En cours')).toBe('Le Rappel\u00a0: 3 étapes acquises, en cours')
    expect(badgeLabel('La Marche', 1)).toBe('La Marche\u00a0: 1 étape acquise')
    expect(badgeLabel('Le Calme', 0)).toBe('Le Calme\u00a0: aucune étape acquise')
  })
})
