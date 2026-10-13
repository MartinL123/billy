import { describe, expect, it } from 'vitest'
import { healthHistory } from '../firebase/seed'
import { careStatus } from './health'

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
