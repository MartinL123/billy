import { describe, expect, it } from 'vitest'
import { markBone } from './bones'
import { calmSummary, distanceMeters, needsCalmPlace, pickCalmSpot, dogColor, formatDistance, markId, nearbySpots, slotOf } from './community'

describe('la meute', () => {
  const parc = { id: 'parc', lat: 48.8566, lng: 2.3522 }
  it('mesure les distances et ne propose que les spots à moins de 300 m', () => {
    const near = { id: 'near', lat: 48.8584, lng: 2.3522 } // ~200 m
    const far = { id: 'far', lat: 48.8616, lng: 2.3522 } // ~560 m
    expect(Math.round(distanceMeters(parc, near))).toBeGreaterThan(190)
    expect(Math.round(distanceMeters(parc, near))).toBeLessThan(210)
    expect(nearbySpots([far, near], parc).map((s) => s.id)).toEqual(['near'])
    expect(nearbySpots([], parc)).toEqual([])
    expect(formatDistance(83)).toBe('à 80 m')
    expect(formatDistance(1234)).toBe('à 1,2 km')
  })

  it('une marque par spot et par jour, et +5 os (+10 pour un nouveau spot)', () => {
    expect(markId('u1', 'parc', '2026-10-14')).toBe('u1_parc_2026-10-14')
    expect(markBone('parc', '2026-10-14', false)).toMatchObject({ id: 'marque-parc-2026-10-14', amount: 5 })
    expect(markBone('parc', '2026-10-14', true).amount).toBe(10)
  })

  it('résume le calme sans jamais donner d’heure', () => {
    expect(calmSummary([])).toBeUndefined()
    const summary = calmSummary([
      { level: 'calme', slot: 'matin' },
      { level: 'calme', slot: 'matin' },
      { level: 'anime', slot: 'soir' },
    ])!
    expect(summary).toEqual({ headline: 'Plutôt calme le matin', detail: 'avis de 3 membres' })
    expect(`${summary.headline} ${summary.detail}`).not.toMatch(/\d+ ?h|\d{1,2}:\d{2}/)
    expect([7, 10, 12, 20].map(slotOf)).toEqual(['tot', 'matin', 'midi', 'soir'])
  })

  it('« Plutôt calme le matin avant 9 h » quand la plupart des avis du matin sont d’avant 9 h', () => {
    const early = calmSummary([
      { level: 'calme', slot: 'tot' },
      { level: 'calme', slot: 'tot' },
      { level: 'calme', slot: 'matin' },
      { level: 'anime', slot: 'soir' },
    ])!
    expect(early.headline).toBe('Plutôt calme le matin avant 9 h')
    // Jamais d'heure précise : seulement cette tranche.
    expect(early.headline.replace('avant 9 h', '')).not.toMatch(/\d/)
    expect(calmSummary([{ level: 'calme', slot: 'tot' }, { level: 'calme', slot: 'matin' }, { level: 'calme', slot: 'matin' }])!.headline).toBe('Plutôt calme le matin')
  })

  it('chaque chien garde sa couleur', () => {
    expect(dogColor('abc')).toBe(dogColor('abc'))
    expect(dogColor('abc')).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('propose un spot calme pour une mission « rue calme »', () => {
    expect(needsCalmPlace('Dans une rue calme')).toBe(true)
    expect(needsCalmPlace('Revient à 10 m sur une longe, parc vide')).toBe(true)
    expect(needsCalmPlace('Salon, à 1 m')).toBe(false)
    const spots = [
      { id: 'square', lat: 48.8566, lng: 2.3522, category: 'parc' },
      { id: 'quai', lat: 48.87, lng: 2.36, category: 'balade' },
      { id: 'bruyant', lat: 48.8567, lng: 2.3522, category: 'parc' },
      { id: 'chantier', lat: 48.8566, lng: 2.3523, category: 'eviter' },
    ]
    const calm = {
      square: [{ level: 'calme' as const, slot: 'matin' as const }],
      quai: [{ level: 'calme' as const, slot: 'tot' as const }, { level: 'calme' as const, slot: 'soir' as const }],
      bruyant: [{ level: 'anime' as const, slot: 'soir' as const }],
      chantier: [{ level: 'calme' as const, slot: 'matin' as const }],
    }
    expect(pickCalmSpot(spots, calm)?.id).toBe('quai')
    expect(pickCalmSpot(spots, calm, { lat: 48.8566, lng: 2.3522 })).toMatchObject({ id: 'square', headline: 'Plutôt calme le matin', meters: 0 })
    expect(pickCalmSpot(spots, {})).toBeUndefined()
  })
})
