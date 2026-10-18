import { describe, expect, it } from 'vitest'
import { walkBudget } from './walkBudget'

const billy = { birthDate: '2026-05-13', today: '2026-10-18' }

describe('règle des 5 minutes par mois d’âge (T-019)', () => {
  it('à 5 mois : 25 min par sortie, 75 min par jour', () => {
    expect(walkBudget({ ...billy, walks: [], walksLeft: 3 })).toEqual({ months: 5, perWalk: 25, daily: 75, walked: 0, next: 25 })
  })
  it('après une grosse balade, les sorties suivantes raccourcissent', () => {
    const b = walkBudget({ ...billy, walks: [40], walksLeft: 2 })!
    expect(b.longWalk).toBe(40)
    expect(b.next).toBe(15) // 35 min restantes sur 2 sorties
    expect(walkBudget({ ...billy, walks: [40, 25], walksLeft: 1 })!.next).toBe(10)
  })
  it('le temps du jour fait : plus de balade, juste ses besoins', () => {
    expect(walkBudget({ ...billy, walks: [60, 20], walksLeft: 1 })!.next).toBe(0)
  })
  it('une balade normale ne change rien', () => {
    const b = walkBudget({ ...billy, walks: [25], walksLeft: 2 })!
    expect(b.next).toBe(25)
    expect(b.longWalk).toBeUndefined()
  })
  it('pas de règle pour un chien d’un an ou sans date de naissance', () => {
    expect(walkBudget({ birthDate: '2025-01-01', today: '2026-10-18', walks: [], walksLeft: 3 })).toBeUndefined()
    expect(walkBudget({ birthDate: '', today: '2026-10-18', walks: [], walksLeft: 3 })).toBeUndefined()
  })
})
