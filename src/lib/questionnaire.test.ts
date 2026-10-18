import { describe, expect, it } from 'vitest'
import * as q from './questionnaire'


describe('questionnaire en deux temps (T-012)', () => {
  it('9 questions pour démarrer, puis une partie à la fois', () => {
    expect(q.essentialIndexes()).toHaveLength(9)
    const answers = Object.fromEntries(q.ESSENTIALS.map((id) => [id, 'ok']))
    expect(q.essentialsDone({ answers: {} })).toBe(false)
    expect(q.essentialsDone({ answers })).toBe(true)
    // La partie 1 a encore des questions (stérilisé, race, adoption…).
    expect(q.nextPart({ answers })?.part).toBe(1)
    const part1 = Object.fromEntries(q.partIndexes(1).map((i) => [q.STEPS[i]!.id, 'ok']))
    expect(q.partComplete({ answers: { ...answers, ...part1 } }, 1)).toBe(true)
    expect(q.nextPart({ answers: { ...answers, ...part1 } })?.part).toBe(2)
  })
})

describe('fin de « Compléter son profil » (T-022)', () => {
  const essentials = Object.fromEntries(q.ESSENTIALS.map((id) => [id, 'ok']))
  it('les os de partie : après le départ, tant que le questionnaire n’est pas terminé', () => {
    expect(q.profilePartsEarnBones({ answers: {} })).toBe(false)
    expect(q.profilePartsEarnBones({ answers: essentials })).toBe(true)
    expect(q.profilePartsEarnBones({ answers: essentials, completedAt: '2026-10-18T10:00:00Z' })).toBe(false)
  })
  it('la dernière partie remplie termine le questionnaire', () => {
    const all = q.STEPS.filter((s) => s.kind !== 'fin').map((s) => s.id)
    const lastPart = q.partIndexes(q.PARTS.length).map((i) => q.STEPS[i]!.id)
    const before = Object.fromEntries(all.filter((id) => !lastPart.includes(id)).map((id) => [id, 'ok']))
    expect(q.allPartsDone({ answers: before }, [])).toBe(false)
    expect(q.allPartsDone({ answers: before }, lastPart)).toBe(true)
  })
})
