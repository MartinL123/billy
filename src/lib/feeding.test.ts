import { describe, expect, it } from 'vitest'
import { mealPortion, nextMealIndex, portion, resizeMeals, sortMeals } from './feeding'

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

describe('« Indiquer ses repas » : 1 à 4 repas par jour (T-111)', () => {
  const label = (time: string) => (time < '12:00' ? 'Matin' : 'Soir')

  it('un seul repas est possible ; les repas en plus prennent les heures proposées', () => {
    expect(resizeMeals([], 1, label)).toEqual([{ time: '08:00', label: 'Matin' }])
    expect(resizeMeals([], 3, label).map((m) => m.time)).toEqual(['08:00', '12:30', '19:00'])
    expect(resizeMeals([], 4, label)).toHaveLength(4)
  })

  it('les heures déjà choisies restent, les premières de la journée quand on en retire', () => {
    const two = [{ time: '18:30', label: 'Soir' }, { time: '07:15', label: 'Matin' }]
    expect(resizeMeals(two, 1, label)).toEqual([{ time: '07:15', label: 'Matin' }])
    expect(resizeMeals(two, 3, label).map((m) => m.time)).toEqual(['07:15', '12:30', '18:30'])
  })

  it('calcule la portion par repas', () => {
    expect(mealPortion(350, 3)).toBe(117)
    expect(mealPortion(300, 1)).toBe(300)
    expect(mealPortion(0, 2)).toBeUndefined()
  })
})
