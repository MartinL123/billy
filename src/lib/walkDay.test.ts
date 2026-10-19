import { describe, expect, it } from 'vitest'
import { walkBudget } from './walkBudget'
import { bigWalkNotice, dayBudget, preselectedDuration, upcomingSlots, walkDayPlan, walksOfDay, yesterdayOpenSlots } from './walkDay'
import { DEFAULT_WALK_TIMES } from './walks'

const times = DEFAULT_WALK_TIMES // 8 h, 13 h, 19 h
const billy = { birthDate: '2026-05-13', today: '2026-10-18' } // 5 mois : 25 min par sortie, 75 par jour
const at = (h: number) => h * 60

describe('ses sorties du jour (T-035)', () => {
  it('une sortie passée depuis plus d’une heure sans être faite est manquée', () => {
    expect(upcomingSlots(times, {}, at(10))).toEqual(['midi', 'soir'])
    expect(upcomingSlots(times, { matin: '08:10' }, at(8.5))).toEqual(['midi', 'soir'])
  })

  it('après une grosse balade : sa durée, ce qui reste, en sorties courtes', () => {
    const done = { matin: '08:05' }
    const budget = walkBudget({ ...billy, walks: [34], walksLeft: 2 })!
    const plan = walkDayPlan({ times, done, walks: [{ slot: 'matin', minutes: 34 }], budget, now: at(10) })
    expect(plan.slots.map((s) => [s.state, s.minutes])).toEqual([
      ['faite', 34],
      ['a-venir', 20],
      ['a-venir', 20],
    ])
    expect(plan.summary.replace(/\u00a0/g, ' ')).toBe('34 min sur 1 h 15 · encore 2 sorties de 20 min')
    expect(plan.tip).toMatch(/renifler/)
  })

  it('le temps du jour fait : juste ses besoins', () => {
    const budget = walkBudget({ ...billy, walks: [60, 20], walksLeft: 1 })!
    const plan = walkDayPlan({ times, done: { matin: '08:00', midi: '13:00' }, walks: [{ slot: 'matin', minutes: 60 }, { slot: 'midi', minutes: 20 }], budget, now: at(15) })
    expect(plan.slots[2]).toMatchObject({ state: 'a-venir', minutes: 0 })
    expect(plan.summary.replace(/\u00a0/g, ' ')).toBe('1 h 20 sur 1 h 15 · juste ses besoins')
  })

  it('une journée normale : 25 min par sortie', () => {
    const budget = walkBudget({ ...billy, walks: [], walksLeft: 3 })!
    const plan = walkDayPlan({ times, done: {}, walks: [], budget, now: at(7) })
    expect(plan.summary.replace(/\u00a0/g, ' ')).toBe('0 min sur 1 h 15 · encore 3 sorties de 25 min')
    expect(plan.tip).toBe('25 min par sortie : 5 min par mois d’âge, 3 fois par jour.')
  })

  it('sans règle (chien adulte) : les sorties, sans durée conseillée', () => {
    const plan = walkDayPlan({ times, done: { matin: '08:00' }, walks: [], now: at(9) })
    expect(plan.slots[1]).toEqual({ slot: 'midi', hour: '13 h', name: 'Sortie de midi', state: 'a-venir' })
    expect(plan.summary.replace(/\u00a0/g, ' ')).toBe('1 sur 3 faites · encore 2 sorties')
  })

  it('toutes faites', () => {
    const plan = walkDayPlan({ times, done: { matin: '08:00', midi: '13:00', soir: '19:00' }, walks: [], now: at(21) })
    expect(plan.tip).toBe('Ses 3 sorties sont faites, bravo !')
  })

  it('accueil et résultat d’import donnent la même durée (R-038)', () => {
    // Chiot de 3 mois (15 min par sortie), 30 min le matin, à 19 h 30 : midi manquée, reste le soir.
    const puppy = { birthDate: '2026-07-18', today: '2026-10-18' }
    const done = { matin: '08:10' }
    const walks = [{ slot: 'matin', minutes: 30 }]
    const budget = dayBudget({ ...puppy, times, done, walks, now: at(19.5) })!
    expect(budget.next).toBe(15)
    const plan = walkDayPlan({ times, done, walks, budget, now: at(19.5) })
    expect(plan.slots.find((s) => s.state === 'a-venir')?.minutes).toBe(budget.next)
  })

  it('une sortie notée à la main compte dans le temps du jour ; une balade au même créneau la remplace (R-044)', () => {
    const noted = { matin: 25, soir: 15 }
    const entries = [{ date: '2026-10-18', route: { durationMin: 34 }, walkSlot: { date: '2026-10-18', creneau: 'soir' } }]
    const walks = walksOfDay(entries, '2026-10-18', noted)
    expect(walks).toEqual([{ minutes: 34, slot: 'soir' }, { slot: 'matin', minutes: 25, noted: true }])
    const plan = walkDayPlan({ times, done: { matin: '08:00', soir: '19:00' }, walks, now: at(20) })
    expect(plan.slots[0]).toMatchObject({ state: 'faite', minutes: 25, noted: true })
    expect(plan.slots[2]).toMatchObject({ state: 'faite', minutes: 34 })
    expect(plan.slots[2]!.noted).toBeUndefined()
  })

  it('la durée présélectionnée et les sorties d’hier (R-044)', () => {
    expect(preselectedDuration(25)).toBe(25)
    expect(preselectedDuration(15)).toBe(15) // chiot de 3 mois (R-046)
    expect(preselectedDuration(40)).toBe(40)
    expect(preselectedDuration(20)).toBe(15)
    expect(preselectedDuration(0)).toBe(25)
    expect(yesterdayOpenSlots({ matin: '08:00' }, at(9))).toEqual(['midi', 'soir'])
    expect(yesterdayOpenSlots({}, at(12))).toEqual([])
  })

  it('« Grosse balade » seulement si la prochaine sortie est vraiment raccourcie (R-049)', () => {
    const puppy = { birthDate: '2026-07-18', today: '2026-10-18' } // 3 mois : 15 min par sortie, 45 par jour
    // 30 min le matin, il reste 15 min pour la sortie du soir : la durée normale, pas de message.
    const normal = walkBudget({ ...puppy, walks: [30], walksLeft: 1 })!
    expect(normal.next).toBe(15)
    expect(bigWalkNotice(normal, true)).toBeUndefined()
    // 40 min, il reste 5 min sur 1 sortie : raccourcie.
    const short = walkBudget({ ...puppy, walks: [40], walksLeft: 1 })!
    expect(bigWalkNotice(short, true)).toMatch(/^Grosse balade aujourd’hui \(40 min, au lieu de 15 à 3 mois\)\. La prochaine sortie\u00a0: 5 min suffisent\.$/)
    expect(bigWalkNotice(short, false)).toBeUndefined()
  })
})
