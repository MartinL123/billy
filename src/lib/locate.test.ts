import { describe, expect, it } from 'vitest'
import { accuracyRing, LOCATE_OPTIONS, locateView } from './locate'
import { distanceMeters as distanceM } from './community'

describe('R-114 · Me situer', () => {
  it('demande une position fraîche et précise', () => {
    expect(LOCATE_OPTIONS).toEqual({ enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 })
  })

  it('centre la carte sur le point bleu, zoom 16, dans la partie visible', () => {
    const view = locateView({ lat: 48.9, lng: 2.33 }, { top: 130, bottom: 460, left: 40, right: 40 }, 390, 844)
    expect(view.center).toEqual([2.33, 48.9])
    expect(view.zoom).toBe(16)
    expect(view.padding).toEqual({ top: 130, bottom: 460, left: 40, right: 40 })
    // Petit écran : les marges se réduisent, la carte reste centrée sur moi.
    expect(locateView({ lat: 48.9, lng: 2.33 }, { top: 130, bottom: 460, left: 40, right: 40 }, 320, 500).padding.bottom).toBeLessThan(460)
  })

  it('le cercle de précision : à la bonne distance, fermé ; rien sans précision', () => {
    const ring = accuracyRing({ lat: 48.9, lng: 2.33, accuracy: 30 })
    expect(ring).toHaveLength(49)
    expect(ring[0]).toEqual(ring[48])
    for (const [lng, lat] of ring) expect(distanceM({ lat: 48.9, lng: 2.33 }, { lat, lng })).toBeCloseTo(30, 0)
    expect(accuracyRing({ lat: 48.9, lng: 2.33 })).toEqual([])
    expect(accuracyRing({ lat: 48.9, lng: 2.33, accuracy: 3 })).toEqual([])
  })
})
