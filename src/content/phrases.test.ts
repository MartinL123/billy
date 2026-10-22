import { describe, expect, it } from 'vitest'
import { SKILLS, skillText, stepName } from './phrases'

describe('nom court des étapes (T-104)', () => {
  it('chacune des 50 étapes a un nom de 1 ou 2 mots, 12 signes au plus', () => {
    let count = 0
    for (const skill of SKILLS) {
      const names = skillText(skill.id)?.short ?? []
      expect(names, skill.id).toHaveLength(5)
      for (const [i, name] of names.entries()) {
        count++
        expect(stepName(skill.id, i + 1)).toBe(name)
        expect(name.length, `${skill.id} ${i + 1} : « ${name} »`).toBeLessThanOrEqual(12)
        expect(name.trim().split(/\s+/).length, `${skill.id} ${i + 1} : « ${name} »`).toBeLessThanOrEqual(2)
      }
    }
    expect(count).toBe(50)
  })

  it('les noms d’une même compétence sont tous différents', () => {
    for (const skill of SKILLS) expect(new Set(skillText(skill.id)?.short).size, skill.id).toBe(5)
  })

  it('aucun nom ne parle de jardin ni ne s’accorde au masculin (ils ne sont pas réécrits)', () => {
    for (const skill of SKILLS) for (const name of skillText(skill.id)?.short ?? []) expect(name).not.toMatch(/jardin|cour\b|occupé|détendu|seul\b/i)
  })
})
