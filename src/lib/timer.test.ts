import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../content/training'
import { formatCountdown, secondsLeft } from './timer'

describe('minuteur de l’exercice', () => {
  it('affiche le temps restant en minutes et secondes', () => {
    expect(formatCountdown(180)).toBe('3:00')
    expect(formatCountdown(179.2)).toBe('3:00')
    expect(formatCountdown(61)).toBe('1:01')
    expect(formatCountdown(0.4)).toBe('0:01')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-3)).toBe('0:00')
  })

  it('ne descend jamais sous zéro', () => {
    expect(secondsLeft(10_000, 4_000)).toBe(6)
    expect(secondsLeft(10_000, 12_000)).toBe(0)
  })

  it('« Ce qu’il faut » reste court et sans mot banni', () => {
    for (const exercise of EXERCISES) {
      if (!exercise.needs) continue
      expect(exercise.needs.split(' ').length).toBeLessThanOrEqual(12)
      expect(exercise.needs).not.toMatch(/boss|palier|déclencheur|seuil/i)
    }
  })
})
