import { describe, expect, it } from 'vitest'
import { balance, BONES, boneId, challengeBone, earned, missionBones, momentBones, purchaseBone, questionnaireBone, regularWeekBone } from './bones'
import { weekOf } from './rhythm'

describe('les os', () => {
  it('un moment noté rapporte +3, jusqu’à 3 fois par jour', () => {
    const day = '2026-10-14'
    const existing = [
      { date: day, amount: 3, reason: 'note' as const, refId: 'a' },
      { date: day, amount: 3, reason: 'note' as const, refId: 'b' },
    ]
    expect(momentBones('c', day, [], [], existing)).toEqual([{ id: 'note-c', date: day, amount: 3, reason: 'note', refId: 'c' }])
    const full = [...existing, { date: day, amount: 3, reason: 'note' as const, refId: 'c' }]
    expect(momentBones('d', day, [], [], full)).toEqual([])
    // Le plafond est par jour : un autre jour rapporte de nouveau.
    expect(momentBones('e', '2026-10-15', [], [], full)).toHaveLength(1)
  })

  it('une réussite rapporte +5 et une étape acquise dans l’app +25, même au-delà du plafond des notes', () => {
    const full = [1, 2, 3].map((i) => ({ date: '2026-10-14', amount: 3, reason: 'note' as const, refId: `n${i}` }))
    const gains = momentBones('x', '2026-10-14', [{ bossId: 'rappel', level: 2 }], [{ bossId: 'rappel', level: 2 }], full)
    expect(gains.map((g) => [g.id, g.amount])).toEqual([
      ['reussite-rappel-2-2026-10-14', BONES.success],
      ['etape-rappel-2', BONES.step],
    ])
  })

  it('la mission rapporte +10, et +5 de plus pour une journée de repos respectée', () => {
    expect(missionBones('2026-10-14', false).map((b) => b.amount)).toEqual([10])
    expect(missionBones('2026-10-18', true).map((b) => [b.reason, b.amount])).toEqual([
      ['mission', 10],
      ['repos', 5],
    ])
  })

  it('défi +30, questionnaire +50, chacun une seule fois (identifiant fixe)', () => {
    expect(challengeBone('2026-10-12', '2026-10-15')).toMatchObject({ id: 'defi-2026-10-12', amount: 30 })
    expect(questionnaireBone('2026-10-14')).toMatchObject({ id: 'questionnaire-depart', amount: 50 })
    expect(boneId('mission', '2026-10-14')).toBe(missionBones('2026-10-14', false)[0]!.id)
  })

  it('semaine régulière : +20 dès 5 jours notés sur 7, pas avant', () => {
    const week = weekOf('2026-10-14')
    expect(regularWeekBone(week, week.slice(0, 4), '2026-10-15')).toBeUndefined()
    expect(regularWeekBone(week, week.slice(0, 5), '2026-10-16')).toMatchObject({ id: 'semaine-2026-10-12', amount: 20 })
    // Les jours d'une autre semaine ne comptent pas.
    expect(regularWeekBone(week, ['2026-10-01', '2026-10-02', ...week.slice(0, 4)], '2026-10-15')).toBeUndefined()
  })

  it('le solde est la somme ; seul un achat en dépense', () => {
    const bones = [...missionBones('2026-10-14', false), questionnaireBone('2026-10-14'), purchaseBone('bandana-rouge', 60, '2026-10-14')]
    expect(balance(bones)).toBe(0)
    expect(earned(bones)).toBe(60)
    expect(purchaseBone('bandana-rouge', 60, '2026-10-14').id).toBe('achat-bandana-rouge')
  })
})
