import { describe, expect, it } from 'vitest'
import { arrivalBody, arrivalDeliveryDate, arrivalPath, arrivalTitle, findArrivedEntry } from './watchArrival'

describe('arrivalDeliveryDate', () => {
  it('montre tout de suite en journée', () => {
    const now = new Date(2026, 9, 22, 8, 44)
    expect(arrivalDeliveryDate(now)).toBe(now)
    expect(arrivalDeliveryDate(new Date(2026, 9, 22, 7, 0))).toEqual(new Date(2026, 9, 22, 7, 0))
    expect(arrivalDeliveryDate(new Date(2026, 9, 22, 21, 59))).toEqual(new Date(2026, 9, 22, 21, 59))
  })

  it('attend 7 h le lendemain après 22 h', () => {
    expect(arrivalDeliveryDate(new Date(2026, 9, 22, 22, 0))).toEqual(new Date(2026, 9, 23, 7, 0))
    expect(arrivalDeliveryDate(new Date(2026, 9, 31, 23, 30))).toEqual(new Date(2026, 10, 1, 7, 0))
  })

  it('attend 7 h le jour même avant 7 h', () => {
    expect(arrivalDeliveryDate(new Date(2026, 9, 23, 0, 15))).toEqual(new Date(2026, 9, 23, 7, 0))
    expect(arrivalDeliveryDate(new Date(2026, 9, 23, 6, 59))).toEqual(new Date(2026, 9, 23, 7, 0))
  })
})

describe('texte de la notification', () => {
  it('titre avec le prénom et une espace insécable', () => {
    expect(arrivalTitle('Billy')).toBe('Belle balade avec Billy !')
    expect(arrivalTitle(' ')).toBe('Belle balade avec votre chien !')
  })

  it('distance et durée à la française', () => {
    expect(arrivalBody(2140, 32 * 60 + 10)).toBe('2,1 km · 32 min. Touchez pour voir ce qu’il a découvert.')
    expect(arrivalBody(846, 600)).toBe('850 m · 10 min. Touchez pour voir ce qu’il a découvert.')
    expect(arrivalBody(5000, 72 * 60)).toBe('5,0 km · 1 h 12. Touchez pour voir ce qu’il a découvert.')
  })

  it('lien profond', () => {
    expect(arrivalPath('AB-12', '2026-10-22T06:12:00.000Z')).toBe('/balade/arrivee?uuid=AB-12&start=2026-10-22T06%3A12%3A00.000Z')
  })
})

describe('findArrivedEntry', () => {
  const entries = [
    { id: 'a', source: 'strava', route: { startTime: '2026-10-22T06:12:30.000Z' } },
    { id: 'b', source: 'watch', route: { startTime: '2026-10-22T06:13:00.000Z' } },
    { id: 'c', source: 'watch', route: { startTime: '2026-10-21T06:12:00.000Z' } },
    { id: 'd' },
  ]

  it('préfère la balade de la Watch au même départ', () => {
    expect(findArrivedEntry(entries, '2026-10-22T06:12:00.000Z')?.id).toBe('b')
  })

  it('prend une autre source si la Watch n’y est pas', () => {
    expect(findArrivedEntry(entries.filter((e) => e.id !== 'b'), '2026-10-22T06:12:00.000Z')?.id).toBe('a')
  })

  it('rien au-delà de 5 minutes, ou sans date', () => {
    expect(findArrivedEntry(entries, '2026-10-22T07:00:00.000Z')).toBeUndefined()
    expect(findArrivedEntry(entries, 'pas une date')).toBeUndefined()
  })
})
