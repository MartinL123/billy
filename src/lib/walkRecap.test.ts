import { describe, expect, it } from 'vitest'
import { recapStats, sniffLine, stopChips, stopsLine } from './walkRecap'

describe('le récap « Belle balade ! » (V6 § 6.3)', () => {
  it('Stats : distance · durée · nouvelles rues, seulement ce qu’il y a (maquette du 22/10 : plus d’os)', () => {
    const nb = (list: { value: string; label: string }[]) => list.filter((s) => s.value).map((s) => `${s.label} ${s.value.replace(/\u00a0/g, ' ')}`)
    expect(nb(recapStats({ distanceM: 2100, durationMin: 32, newStreets: 2 }))).toEqual(['Distance 2,1 km', 'Durée 32 min', 'Nouvelles rues +2'])
    expect(nb(recapStats({ distanceM: 650 }))).toEqual(['Distance 650 m'])
    expect(nb(recapStats({ distanceM: 650, newStreets: 0 }))).toEqual(['Distance 650 m', 'Nouvelle rue 0'])
  })

  it('« Billy a reniflé 2 rues qu’il ne connaissait pas », seulement s’il y en a', () => {
    expect(sniffLine('Billy', 2)).toBe('Billy a reniflé 2 rues qu’il ne connaissait pas')
    expect(sniffLine('Billy', 1)).toBe('Billy a reniflé 1 rue qu’il ne connaissait pas')
    expect(sniffLine('Billy', 0)).toBeUndefined()
    expect(sniffLine('Billy', undefined)).toBeUndefined()
  })

  it('les arrêts : la phrase et 2 ou 3 pastilles', () => {
    expect(stopsLine(4)).toBe('4 arrêts. Que s’est-il passé ?')
    expect(stopsLine(1)).toBe('1 arrêt. Que s’est-il passé ?')
    const route = {
      startTime: '2026-10-22T06:12:00Z',
      moments: [{ lat: 0, lng: 0, type: 'jeu' as const }, { lat: 0, lng: 0, type: 'peur' as const }],
      stops: [
        { at: 300, durS: 60, lat: 0, lng: 0, momentIndex: 0 },
        { at: 720, durS: 60, lat: 0, lng: 0, momentIndex: 1 },
        { at: 1000, durS: 60, lat: 0, lng: 0 },
        { at: 1400, durS: 60, lat: 0, lng: 0 },
      ],
    }
    expect(stopChips(route)).toEqual([{ label: 'Jeu · 8 h 17' }, { label: 'Stress · 8 h 24', hard: true }, { label: '2 à raconter', todo: true }])
    expect(stopChips({ moments: [], stops: [{ at: 1, durS: 40, lat: 0, lng: 0 }] })).toEqual([{ label: '1 à raconter', todo: true }])
    expect(stopChips({ moments: [] })).toEqual([])
  })
})
