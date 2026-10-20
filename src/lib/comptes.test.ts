import { describe, expect, it } from 'vitest'
import { formatAgeShort, milestoneMessage, nextLifeStep } from './age'
import { birthdayFix, lifeMilestones } from './milestones'
import { deriveTraits, isPuppy } from './questionnaire'
import { sessionMinutes } from './training-plan'

describe('nouveau compte : un espace vide', () => {
  it('sans date de naissance, rien ne casse et on ne suppose pas un chiot', () => {
    expect(formatAgeShort('', '2026-10-13')).toBe('')
    expect(nextLifeStep('', '2026-10-13')).toBeUndefined()
    expect(milestoneMessage('Rex', '', '', '2026-10-13')).toBeUndefined()
    expect(sessionMinutes('', '2026-10-13')).toBe(5)
    expect(isPuppy('', '2026-10-13')).toBe(false)
    expect(deriveTraits([], [], undefined, '', '2026-10-13')).toEqual([])
  })

  it('crée les étapes de vie au nom du chien, à partir des dates du questionnaire', () => {
    const events = lifeMilestones('Rex', { birth: '2026-07-01', adoption: '2026-09-01' }, '2026-10-13')
    // R-074 : un seul événement le jour de son premier anniversaire (« Rex a 1 an ») ; l’anniversaire annuel part du deuxième.
    expect(events['seed-anniversaire']).toMatchObject({ title: 'Anniversaire de Rex', date: '2028-07-01', recurrence: 'yearly', type: 'etape' })
    expect(events['seed-6-mois']).toMatchObject({ title: 'Rex a 6 mois', date: '2027-01-01' })
    expect(events['seed-1-an']).toMatchObject({ title: 'Rex a 1 an', date: '2027-07-01' })
    expect(events['seed-adoption']).toMatchObject({ title: "Anniversaire d’adoption", date: '2027-09-01' })
    for (const event of Object.values(events)) expect(event.title).not.toContain('Billy')
  })

  it('ne crée pas les étapes déjà passées, ni rien sans date', () => {
    const adult = lifeMilestones('Rex', { birth: '2020-03-10' }, '2026-10-13')
    expect(Object.keys(adult)).toEqual(['seed-anniversaire'])
    expect(lifeMilestones('Rex', {}, '2026-10-13')).toEqual({})
    expect(lifeMilestones('Rex', { birth: '', adoption: '' }, '2026-10-13')).toEqual({})
  })

  it('R-074 : comptes d’avant, l’anniversaire en double avec « … a 1 an » passe à l’année suivante', () => {
    const before = [
      { id: 'seed-1-an', date: '2027-05-13' as const, done: false },
      { id: 'seed-anniversaire', date: '2027-05-13' as const, done: false },
    ]
    expect(birthdayFix(before)).toEqual({ id: 'seed-anniversaire', date: '2028-05-13' })
    expect(birthdayFix([before[0]!, { ...before[1]!, date: '2028-05-13' as const }])).toBeUndefined()
    expect(birthdayFix([before[1]!])).toBeUndefined()
  })
})
