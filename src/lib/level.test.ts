import { describe, expect, it } from 'vitest'
import { levelTitle } from '../content/phrases'
import { uncheckStep } from './bossProgress'
import { dogLevel, levelForSteps, nextLevelLabel, stepsAcquired } from './level'

const skill = (level: number) => ({ level, validations: [], masteryPlaces: [], preApp: Array.from({ length: level }, (_, i) => i + 1) })

describe('niveau calculé sur les étapes acquises', () => {
  it('vaut 1 + étapes ÷ 2, de 1 à 26', () => {
    expect([0, 1, 2, 24, 50].map(levelForSteps)).toEqual([1, 1, 2, 13, 26])
    expect(levelForSteps(3)).toBe(2)
    expect(levelForSteps(49)).toBe(25)
    expect(levelForSteps(80)).toBe(26)
  })

  it('compte les étapes d’avant l’app comme les autres', () => {
    const progress = { lien: skill(3), rappel: { level: 2, validations: [], masteryPlaces: [] } }
    expect(stepsAcquired(progress)).toBe(5)
    expect(dogLevel(progress)).toEqual({ level: 3, toNext: 1, ratio: 0.5 })
    expect(nextLevelLabel(dogLevel(progress))).toBe('Encore 1 étape avant le niveau 4')
    expect(nextLevelLabel(dogLevel({}))).toBe('Encore 2 étapes avant le niveau 2')
  })

  it('décocher une étape fait baisser le niveau ; rien d’autre ne le fait', () => {
    const progress = { lien: skill(4) }
    expect(dogLevel(progress).level).toBe(3)
    const corrected = { lien: uncheckStep(progress.lien, 2).progress }
    expect(dogLevel(corrected).level).toBe(1)
  })

  it('s’arrête à 26 quand tout l’arbre est maîtrisé', () => {
    const all = Object.fromEntries(['lien', 'calme', 'soins', 'laisse', 'rappel', 'manieres', 'nouveaute', 'ville', 'rencontres', 'congeneres'].map((id) => [id, skill(5)]))
    expect(dogLevel(all)).toEqual({ level: 26, toNext: 0, ratio: 1 })
    expect(nextLevelLabel(dogLevel(all))).not.toMatch(/XP/)
  })

  it('donne le bon titre à chaque palier de niveaux', () => {
    expect([1, 3, 4, 7, 8, 12, 13, 18, 19, 25, 26].map(levelTitle)).toEqual(['Chiot curieux', 'Chiot curieux', 'Apprenti', 'Apprenti', 'Explorateur', 'Explorateur', 'Compagnon', 'Compagnon', 'Complice', 'Complice', 'Légende'])
  })
})
