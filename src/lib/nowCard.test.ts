import { describe, expect, it } from 'vitest'
import { contextLine, nextLines, nowCard, type NowInput } from './nowCard'

const base: NowInput = {
  today: '2026-10-17',
  now: 17 * 60 + 40,
  care: [{ id: 'ap', title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-10-25', done: false }],
  meals: [{ time: '08:00' }, { time: '19:30' }],
  mission: { done: false, minutes: 3 },
  walks: { times: { matin: '08:00', midi: '13:00', soir: '19:00' }, done: { matin: '08:10', midi: '13:05' } },
}

describe('Aujourd’hui : une seule chose à faire', () => {
  it('la mission, avec la phrase et « Ensuite »', () => {
    const card = nowCard(base)
    expect(card.kind).toBe('mission')
    expect(contextLine(base, card)).toBe('Il est 17 h 40. Prochaine sortie à 19 h : d’ici là, 3 minutes de mission.')
    expect(nextLines(base, card)).toEqual([
      { key: 'sortie', when: '19 h', title: 'Sortie du soir', detail: '2 sur 3 faites', to: '/' },
      { key: 'ap', when: '25 oct.', title: 'Antiparasitaire puces et tiques', detail: 'Dans 8 jours', to: '/evenement/ap' },
    ])
  })

  it('un soin dû passe avant tout', () => {
    const input = { ...base, care: [{ ...base.care[0]!, date: '2026-10-17' }] }
    const card = nowCard(input)
    expect(card).toMatchObject({ kind: 'soin', event: { id: 'ap' } })
    expect(nextLines(input, card).map((l) => l.key)).toEqual(['sortie'])
  })

  it('un repas dans les 30 minutes, avant la mission', () => {
    expect(nowCard({ ...base, now: 19 * 60 + 5 })).toEqual({ kind: 'repas', time: '19:30' })
  })

  it('mission faite : la sortie si elle est dans l’heure, sinon « tout est fait »', () => {
    const done = { ...base, mission: { done: true, minutes: 3 } }
    expect(nowCard({ ...done, now: 18 * 60 + 20 })).toEqual({ kind: 'sortie', slot: 'soir', time: '19:00' })
    const evening = { ...done, now: 21 * 60, meals: [], walks: { ...done.walks, done: { matin: '08:10', midi: '13:05', soir: '19:10' } } }
    const card = nowCard(evening)
    expect(card).toEqual({ kind: 'fini' })
    expect(contextLine(evening, card)).toBe('Il est 21 h. Tout est fait pour aujourd’hui.')
  })
})
