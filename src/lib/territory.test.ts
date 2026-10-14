import { describe, expect, it } from 'vitest'
import { spotsCount, territoryLine, territoryOf } from './territory'

const spots = [{ id: 'docks' }, { id: 'seine' }, { id: 'cafe' }, { id: 'jamais' }]
const mark = (uid: string, dogName: string, spotId: string, date: string) => ({ uid, dogName, spotId, date })

describe('le territoire', () => {
  const marks = [
    mark('me', 'Billy', 'docks', '2026-09-20'),
    mark('me', 'Billy', 'docks', '2026-10-14'),
    mark('oslo', 'Oslo', 'docks', '2026-10-14'),
    mark('me', 'Billy', 'seine', '2026-10-13'),
    mark('oslo', 'Oslo', 'seine', '2026-10-01'),
    mark('me', 'Billy', 'cafe', '2026-09-30'),
    mark('rex', 'Rex', 'cafe', '2026-09-30'),
  ]
  const t = territoryOf('me', marks, spots, '2026-10-14')

  it('ses spots, le plus récent d’abord, sans ceux qu’il n’a jamais marqués', () => {
    expect(t.spots.map((s) => s.spot.id)).toEqual(['docks', 'seine', 'cafe'])
    expect(t.spots[0]).toMatchObject({ times: 2, last: '2026-10-14', isNew: false, together: ['Oslo'] })
    expect(t.spots[1]).toMatchObject({ isNew: true, together: [] })
    expect(t.newThisMonth).toBe(1)
  })

  it('le chien avec qui il partage le plus de spots', () => {
    expect(t.shared).toEqual({ dogName: 'Oslo', count: 2 })
    expect(territoryOf('me', [mark('me', 'Billy', 'docks', '2026-10-14')], spots, '2026-10-14').shared).toBeUndefined()
  })

  it('les phrases', () => {
    expect(territoryLine(t.spots[0]!, '2026-10-14')).toBe("Marqué 2 fois · aujourd'hui avec Oslo")
    expect(territoryLine(t.spots[1]!, '2026-10-14')).toBe('Marqué 1 fois · hier · nouveau ce mois')
    expect(spotsCount(1)).toBe('1 spot marqué')
    expect(spotsCount(12)).toBe('12 spots marqués')
  })
})
