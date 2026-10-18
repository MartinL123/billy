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
