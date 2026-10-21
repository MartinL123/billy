import { describe, expect, it } from 'vitest'
import { exportSnapshot, type ExportSource } from './exportData'

const empty: ExportSource = { dog: {}, entries: [], walks: [], events: [], weights: [], documents: [], dailyQuests: [], xpLog: [], bones: [], bossProgress: {}, sessions: [], exposures: [], inventory: [], fog: [] }

describe('export de mes données (T-065)', () => {
  it('garde dates, durées et sources ; jamais de position, de texte, de photo ni de contact', () => {
    const snapshot = exportSnapshot(
      {
        ...empty,
        dog: { name: 'Billy', birthDate: '2026-05-13', chip: '250269999999999', vet: { name: 'Dr X', phone: '0600000000' }, walkTimes: { matin: '08:00' } },
        entries: [{ id: 'e1', date: '2026-10-19', text: 'Rue de Lobau, il a eu peur', photos: [{ fileId: 'f', thumbFileId: 't', lat: 48.8, lng: 2.3 }], commune: 'Paris', source: 'gps', route: { points: [48.8, 2.3, 48.9, 2.4], distanceM: 2300, durationMin: 38, source: 'gps', startTime: '2026-10-19T11:19:00Z', moments: [{ lat: 1, lng: 2, type: 'peur', note: 'chien' }] } }],
        events: [{ id: 'v', type: 'vermifuge', title: 'Milbemax', date: '2026-10-22', done: false }],
      },
      new Date('2026-10-21T12:00:00Z'),
    )
    const text = JSON.stringify(snapshot)
    for (const secret of ['Lobau', 'Paris', '48.8', 'Billy', '2502699', 'Dr X', '0600000000', 'Milbemax', 'chien']) expect(text).not.toContain(secret)
    expect(snapshot.entries[0]).toMatchObject({ id: 'e1', date: '2026-10-19', source: 'gps', textLength: 26, photos: 1, route: { distanceM: 2300, durationMin: 38, points: 4, moments: 1 } })
    expect(snapshot.events[0]).toEqual({ id: 'v', type: 'vermifuge', date: '2026-10-22', done: false })
    expect(snapshot.dog).toMatchObject({ birthDate: '2026-05-13', walkTimes: { matin: '08:00' } })
  })
})
