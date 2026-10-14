import { describe, expect, it } from 'vitest'
import { backfillBones, balance, BONES, boneId, challengeBone, earned, missionBones, momentBones, purchaseBone, questionnaireBone, regularWeekBone } from './bones'
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

describe('os rétroactifs', () => {
  const entries = [
    { id: 'a', date: '2026-09-01' },
    { id: 'b', date: '2026-09-01' },
    { id: 'c', date: '2026-09-01' },
    { id: 'd', date: '2026-09-01' },
    { id: 'e', date: '2026-09-02' },
  ]
  const xpLog = [
    { id: 'palier-lien-1', date: '2026-09-01', kind: 'palier' },
    { id: 'palier-calme-2', date: '2026-08-20', kind: 'palier', key: 'avant' },
    { id: 'quete-jour-2026-09-02', date: '2026-09-02', kind: 'quete' },
    { id: 'repos-2026-09-03', date: '2026-09-03', kind: 'repos', key: 'repos' },
    { id: 'seance-x', date: '2026-09-03', kind: 'seance' },
  ]

  it('compte notes (3 par jour), étapes de l’app, missions, repos et questionnaire', () => {
    const gains = backfillBones({ entries, xpLog, questionnaireDoneOn: '2026-08-15' }, [])
    expect(gains.map((g) => g.id)).toEqual(['note-a', 'note-b', 'note-c', 'note-e', 'etape-lien-1', 'mission-2026-09-02', 'repos-2026-09-03', 'questionnaire-depart'])
    expect(balance(gains)).toBe(4 * 3 + 25 + 10 + 5 + 50)
  })

  it('jamais deux fois, et le plafond du jour tient compte de l’existant', () => {
    const first = backfillBones({ entries, xpLog }, [])
    expect(backfillBones({ entries, xpLog }, first)).toEqual([])
    const already = [{ id: 'note-x', date: '2026-09-01', amount: 3, reason: 'note' as const, refId: 'x' }, { id: 'note-y', date: '2026-09-01', amount: 3, reason: 'note' as const, refId: 'y' }]
    expect(backfillBones({ entries, xpLog: [] }, already).map((g) => g.id)).toEqual(['note-a', 'note-e'])
  })
})

