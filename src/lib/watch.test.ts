import { describe, expect, it } from 'vitest'
import { emptyTally, tallyActivity } from './importPlan'
import { newWatchWalks, shouldSync, slotWalkName, watchActivity, watchAddedLine, watchChunks, watchName, watchSince, watchStaleDays, watchStaleLine, type WatchWalk } from './watch'

const walk = (start: string, type: WatchWalk['type'] = 'walking'): WatchWalk => ({
  uuid: start,
  start,
  end: start,
  type,
  points: [
    { lat: 48.633, lng: -2.06, time: start },
    { lat: 48.634, lng: -2.06, time: new Date(Date.parse(start) + 600_000).toISOString() },
  ],
})

describe('marches de l’Apple Watch (T-001)', () => {
  it('lit les 30 derniers jours la première fois, puis depuis la dernière lecture moins un jour', () => {
    const now = new Date('2026-10-18T10:00:00Z')
    expect(watchSince(undefined, now)).toBe('2026-09-18T10:00:00.000Z')
    expect(watchSince('2026-10-17T08:00:00.000Z', now)).toBe('2026-10-16T08:00:00.000Z')
    expect(watchSince('pas une date', now)).toBe('2026-09-18T10:00:00.000Z')
  })

  it('au plus une lecture toutes les 5 minutes', () => {
    expect(shouldSync(undefined, 0)).toBe(true)
    expect(shouldSync(0, 4 * 60_000)).toBe(false)
    expect(shouldSync(0, 5 * 60_000)).toBe(true)
  })

  it('nomme la balade selon l’heure de départ à Paris', () => {
    expect(watchName('2026-10-18T06:30:00Z', 'walking')).toBe('Balade du matin') // 8 h 30 à Paris
    expect(watchName('2026-10-18T11:00:00Z', 'walking')).toBe('Balade de midi')
    expect(watchName('2026-10-18T13:00:00Z', 'hiking')).toBe('Randonnée de l’après-midi')
    expect(watchName('2026-10-18T17:30:00Z', 'walking')).toBe('Balade du soir')
    expect(watchName('2026-10-18T21:30:00Z', 'walking')).toBe('Balade de nuit')
  })

  it('passe par le même circuit qu’un fichier GPX : gardée, puis écartée comme doublon', () => {
    const tally = emptyTally()
    const known = new Set<string>()
    const first = tallyActivity(tally, watchActivity(walk('2026-10-18T06:30:00.000Z')), known)
    expect(first).toMatchObject({ name: 'Balade du matin', date: '2026-10-18', durationMin: 10, startTime: '2026-10-18T06:30:00.000Z' })
    expect(tallyActivity(tally, watchActivity(walk('2026-10-18T06:30:00.000Z')), known)).toBeUndefined()
    expect(tally.duplicates).toBe(1)
  })

  it('écarte une marche déjà importée de Strava (départ à moins de 5 minutes)', () => {
    const walks = [walk('2026-10-18T06:30:00.000Z'), walk('2026-10-18T17:00:00.000Z')]
    const kept = newWatchWalks(walks, [{ startTime: '2026-10-18T06:32:10Z' }, {}])
    expect(kept.map((w) => w.start)).toEqual(['2026-10-18T17:00:00.000Z'])
  })

  it('le bandeau', () => {
    expect(watchAddedLine(1)).toBe('1 balade de la Watch ajoutée')
    expect(watchAddedLine(2)).toBe('2 balades de la Watch ajoutées')
  })

  it('rattachée à une sortie, la balade prend le nom de cette sortie (R-047)', () => {
    expect(slotWalkName('14:30', 'Balade de midi')).toBe('Balade de l’après-midi')
    expect(slotWalkName('08:00', 'Randonnée de nuit')).toBe('Randonnée du matin')
    expect(slotWalkName('19:00', 'Balade du soir')).toBe('Balade du soir')
  })
})

describe('R-104 · rattrapage par tranches et alerte d’expiration', () => {
  const now = new Date('2026-11-10T12:00:00.000Z')

  it('une seule tranche quand la dernière lecture date de moins de 7 jours', () => {
    expect(watchChunks('2026-11-06T08:00:00.000Z', now)).toEqual([{ since: '2026-11-06T08:00:00.000Z', until: '2026-11-10T12:00:00.000Z' }])
  })

  it('17 jours à rattraper : 3 tranches de 7 jours au plus, la dernière finit maintenant', () => {
    expect(watchChunks('2026-10-24T12:00:00.000Z', now)).toEqual([
      { since: '2026-10-24T12:00:00.000Z', until: '2026-10-31T12:00:00.000Z' },
      { since: '2026-10-31T12:00:00.000Z', until: '2026-11-07T12:00:00.000Z' },
      { since: '2026-11-07T12:00:00.000Z', until: '2026-11-10T12:00:00.000Z' },
    ])
  })

  it('exactement 7 jours : une tranche', () => {
    expect(watchChunks('2026-11-03T12:00:00.000Z', now)).toHaveLength(1)
  })

  it('une date illisible ou dans le futur : une tranche jusqu’à maintenant', () => {
    expect(watchChunks('n’importe quoi', now)).toEqual([{ since: 'n’importe quoi', until: '2026-11-10T12:00:00.000Z' }])
    expect(watchChunks('2026-11-11T00:00:00.000Z', now)).toHaveLength(1)
  })

  it('l’alerte seulement au-delà de 7 jours sans lecture', () => {
    expect(watchStaleDays(undefined, now)).toBeUndefined()
    expect(watchStaleDays('2026-11-04T12:00:00.000Z', now)).toBeUndefined()
    expect(watchStaleDays('2026-11-02T11:00:00.000Z', now)).toBe(8)
    expect(watchStaleDays('2026-10-29T12:00:00.000Z', now)).toBe(12)
    expect(watchStaleLine(12)).toBe('Dernière lecture de la Watch\u00a0: il y a 12\u00a0jours')
  })
})
