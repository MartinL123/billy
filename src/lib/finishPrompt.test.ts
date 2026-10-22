import { describe, expect, it } from 'vitest'
import { FINISH_TITLE, finishPromptAt } from './finishPrompt'

// Un point tous les ~11 m vers le nord (0,0001° de latitude), une minute d'écart.
const t0 = Date.parse('2026-10-22T06:00:00.000Z')
const at = (i: number, north: number) => ({ lat: 48.85 + north * 0.0001, lng: 2.35, time: new Date(t0 + i * 60_000).toISOString() })

describe('finishPromptAt', () => {
  it('rien tant qu’on n’est pas parti', () => {
    expect(finishPromptAt([])).toBeUndefined()
    expect(finishPromptAt([at(0, 0), at(1, 1), at(2, 2), at(3, 0)])).toBeUndefined()
  })

  it('10 min après le retour à moins de 50 m du départ', () => {
    const points = [at(0, 0), at(5, 10), at(10, 20), at(15, 10), at(20, 3), at(21, 1)]
    expect(finishPromptAt(points)).toEqual(new Date(t0 + 30 * 60_000))
  })

  it('rien si on repart', () => {
    expect(finishPromptAt([at(0, 0), at(5, 20), at(20, 3), at(22, 8)])).toBeUndefined()
  })

  it('titre avec espace insécable', () => {
    expect(FINISH_TITLE).toBe('Balade finie ?')
  })
})
