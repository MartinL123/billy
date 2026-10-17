import { describe, expect, it } from 'vitest'
import { earnsBones, emptyTally, ignoredLine, tallyActivity } from './importPlan'
import type { Activity } from './activity'

const walk = (start: string, type = 'walking'): Activity => ({
  name: 'Morning Walk',
  type,
  points: [
    { lat: 47, lng: 2, time: start },
    { lat: 47.001, lng: 2, time: start.replace(/:00Z$/, ':59Z') },
  ],
})

describe('import d’un lot de fichiers', () => {
  it('ajoute les balades, saute les doublons, compte les vélos', () => {
    const tally = emptyTally()
    const known = new Set<string>()
    tallyActivity(tally, walk('2026-10-12T08:00:00Z'), known)
    tallyActivity(tally, walk('2026-10-12T08:00:00Z'), known)
    tallyActivity(tally, walk('2026-10-13T08:00:00Z', 'cycling'), known)
    tallyActivity(tally, walk('2026-10-14T08:00:00Z', 'cycling'), known)
    tallyActivity(tally, { points: [] }, known)
    expect(tally.added.map((w) => w.name)).toEqual(['Balade du matin'])
    expect(tally.duplicates).toBe(1)
    expect(tally.ignored).toEqual({ 'à vélo': 2 })
    expect(ignoredLine(tally)).toBe('2 sorties à vélo ignorées · 1 balade déjà importée · 1 fichier illisible.')
  })

  it('réimporter tout : rien de nouveau', () => {
    const known = new Set<string>()
    tallyActivity(emptyTally(), walk('2026-10-12T08:00:00Z'), known)
    const again = emptyTally()
    tallyActivity(again, walk('2026-10-12T08:00:00Z'), known)
    expect(again.added).toHaveLength(0)
    expect(ignoredLine(again)).toBe('1 balade déjà importée.')
  })

  it('des os seulement pour les 7 derniers jours', () => {
    expect(earnsBones('2026-10-17', '2026-10-17')).toBe(true)
    expect(earnsBones('2026-10-11', '2026-10-17')).toBe(true)
    expect(earnsBones('2026-10-10', '2026-10-17')).toBe(false)
    expect(earnsBones(undefined, '2026-10-17')).toBe(false)
  })
})
