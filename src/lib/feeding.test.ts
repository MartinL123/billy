import { describe, expect, it } from 'vitest'
import { nextMealIndex, portion, sortMeals } from './feeding'

const meals = [
  { label: 'Réveil', time: '08:00' },
  { label: 'Après-midi', time: '14:00' },
  { label: 'Soir', time: '21:00' },
]

describe('repas', () => {
  it('partage la ration entre les repas', () => {
    expect(portion({ gramsPerDay: 300, meals })).toBe(100)
    expect(portion({ gramsPerDay: 250, meals })).toBe(83)
    expect(portion({ gramsPerDay: 300, meals: [] })).toBeUndefined()
  })

  it('trouve le prochain repas de la journée', () => {
    expect(nextMealIndex(meals, '06:30')).toBe(0)
    expect(nextMealIndex(meals, '08:00')).toBe(1)
    expect(nextMealIndex(meals, '15:10')).toBe(2)
    expect(nextMealIndex(meals, '21:30')).toBeUndefined()
  })

  it('range les repas par heure', () => {
    expect(sortMeals([meals[2]!, meals[0]!, meals[1]!]).map((m) => m.time)).toEqual(['08:00', '14:00', '21:00'])
  })
})
