import { describe, expect, it } from 'vitest'
import type { BillyEvent } from '../firebase/types'
import type { ISODate } from './dates'
import { careStatus, doneDate } from './health'

// Historique de soins de Billy au 13 octobre 2026, comme jeu d'essai.
const LAST_PRIMO: ISODate = '2026-09-21'

function healthHistory(): Record<string, BillyEvent> {
  const done = (event: Omit<BillyEvent, 'done' | 'doneAt'>): BillyEvent => ({ ...event, done: true, doneAt: event.date || undefined })
  return {
    'hist-vaccin-1': done({
      title: 'Primo-vaccination CHPPiL, 1re injection',
      type: 'vaccin',
      date: '',
      recurrence: 'none',
      notes: 'Juin ou juillet 2026 : date exacte à retrouver dans le carnet de santé.',
    }),
    'hist-vaccin-2': done({ title: 'Primo-vaccination CHPPiL, 2e injection', type: 'vaccin', date: '2026-08-01', recurrence: 'none' }),
    'hist-vaccin-3': done({ title: 'Primo-vaccination CHPPiL, 3e injection', type: 'vaccin', date: LAST_PRIMO, recurrence: 'none' }),
    'hist-antiparasitaire-chenil': done({
      title: 'Antiparasitaire (au chenil)',
      type: 'antiparasitaire',
      date: '',
      recurrence: 'none',
      notes: "Donné au chenil avant l'adoption, date inconnue.",
    }),
    'hist-vermifuge': { ...done({ title: 'Vermifuge', type: 'vermifuge', date: '2026-09-27', recurrence: 'quarterly' }), nextId: 'hist-vermifuge-suivant' },
    'hist-vermifuge-suivant': { title: 'Vermifuge', type: 'vermifuge', date: '2026-12-27', recurrence: 'quarterly', done: false },
    'hist-puces-tiques': {
      ...done({ title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-09-25', recurrence: 'monthly', notes: 'Protection d\'un mois.' }),
      nextId: 'hist-puces-tiques-suivant',
    },
    'hist-puces-tiques-suivant': { title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-10-25', recurrence: 'monthly', done: false },
  }
}


describe('suivi des soins', () => {
  const events = Object.entries(healthHistory()).map(([id, event]) => ({ id, ...event }))

  it('retrouve le dernier vaccin et ignore celui sans date', () => {
    expect(careStatus(events, 'vaccin').last?.date).toBe('2026-09-21')
    expect(careStatus(events, 'vaccin').next).toBeUndefined()
  })

  it('donne le dernier soin et le prochain', () => {
    const vermifuge = careStatus(events, 'vermifuge')
    expect([vermifuge.last?.date, vermifuge.next?.date]).toEqual(['2026-09-27', '2026-12-27'])
    const puces = careStatus(events, 'antiparasitaire')
    expect([puces.last?.date, puces.next?.date]).toEqual(['2026-09-25', '2026-10-25'])
  })

  it('se rabat sur un soin fait sans date, et ne trouve rien sinon', () => {
    const chenil = events.filter((e) => e.id === 'hist-antiparasitaire-chenil')
    expect(careStatus(chenil, 'antiparasitaire').last?.id).toBe('hist-antiparasitaire-chenil')
    expect(careStatus(events, 'veto')).toEqual({ last: undefined, next: undefined })
  })
})

describe('dernier soin fait (audit R-001)', () => {
  it('se base sur le jour réel de validation', () => {
    const events = [
      { type: 'vermifuge' as const, date: '2026-07-10', done: true, doneAt: '2026-10-18' },
      { type: 'vermifuge' as const, date: '2026-09-01', done: true },
    ]
    expect(careStatus(events, 'vermifuge').last?.doneAt).toBe('2026-10-18')
    expect(doneDate(events[0]!)).toBe('2026-10-18')
    expect(doneDate(events[1]!)).toBe('2026-09-01')
  })
})
