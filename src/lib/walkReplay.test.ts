import { describe, expect, it } from 'vitest'
import type { Route } from './route'
import type { Track } from './track'
import { photoWhen, REPLAY_DEFAULT_SPEED, REPLAY_SPEEDS, replayAdvance, replayAt, replayHeading, replayPadding, replaySpan, speedLabel } from './walkReplay'

const track: Track = { t: [0, 600, 1200], lat: [48.85, 48.86, 48.87], lng: [2.35, 2.35, 2.35] }
const route = (extra: Partial<Route> = {}): Route => ({ points: [[48.85, 2.35], [48.87, 2.35]], distanceM: 2200, moments: [], ...extra })

describe('Revoir la balade (T-108)', () => {
  it('vitesses × 0,5 · × 1 · × 2 · × 4, × 4 par défaut', () => {
    expect(REPLAY_SPEEDS.map(speedLabel)).toEqual(['× 0,5', '× 1', '× 2', '× 4'])
    expect(REPLAY_DEFAULT_SPEED).toBe(4)
  })

  it('la lecture couvre le trajet daté (recadré : la portion gardée), sinon la durée notée', () => {
    expect(replaySpan(route({ track }))).toEqual([0, 1200])
    expect(replaySpan(route({ track, trimmed: { startS: 300, endS: 900 } }))).toEqual([300, 900])
    expect(replaySpan(route({ durationMin: 25 }))).toEqual([0, 1500])
    expect(replaySpan(route())).toEqual([0, 1650])
    expect(replaySpan({ points: [[48.85, 2.35]], distanceM: 0 })).toBeUndefined()
  })

  it('× 1 : une minute de balade par seconde ; jamais au-delà de la fin', () => {
    expect(replayAdvance(0, 1000, 1, [0, 1200])).toBe(60)
    expect(replayAdvance(0, 1000, 4, [0, 1200])).toBe(240)
    expect(replayAdvance(100, 500, 0.5, [0, 1200])).toBe(115)
    expect(replayAdvance(1190, 1000, 4, [0, 1200])).toBe(1200)
    expect(replayAdvance(10, -50, 4, [0, 1200])).toBe(10)
  })

  it('le point, l’heure et la rue à une seconde donnée', () => {
    const r = route({ track, startTime: '2026-10-22T06:12:00Z', stops: [{ at: 580, durS: 60, lat: 48.86, lng: 2.35, street: 'Rue des Lilas' }] })
    const at = replayAt(r, 300)!
    expect(at.lat).toBeCloseTo(48.855, 4)
    expect(at.clock).toBe('8 h 17')
    expect(at.street).toBeUndefined()
    expect(replayAt(r, 600)).toMatchObject({ clock: '8 h 22', street: 'Rue des Lilas' })
    // Avant le début ou après la fin : les bouts du trajet.
    expect(replayAt(r, 5000)!.lat).toBeCloseTo(48.87, 4)
  })

  it('sans trajet daté : le point avance le long du tracé, sans heure', () => {
    const at = replayAt(route({ durationMin: 20 }), 600)!
    expect(at.lat).toBeCloseTo(48.86, 3)
    expect(at.clock).toBeUndefined()
  })

  it('la légende d’une photo en grand', () => {
    expect(photoWhen('2026-10-22', '2026-10-22T06:17:00Z')).toBe('Jeudi 22 octobre · 8 h 17')
    expect(photoWhen('2026-10-22')).toBe('Jeudi 22 octobre')
  })
})

describe('Revoir la balade en 3ᵉ personne (R-096)', () => {
  it('la caméra regarde dans le sens de la marche ; à l’arrêt, pas de cap', () => {
    // Vers le nord, puis vers l’est.
    const turn: Track = { t: [0, 600, 1200], lat: [48.85, 48.86, 48.86], lng: [2.35, 2.35, 2.365] }
    const r = route({ track: turn, points: [[48.85, 2.35], [48.86, 2.35], [48.86, 2.365]] })
    expect(replayHeading(r, 100)).toBeCloseTo(0, 0)
    expect(replayHeading(r, 900)! - 90).toBeLessThan(1)
    // À la toute fin : le cap d’où il vient.
    expect(replayHeading(r, 1200)! - 90).toBeLessThan(1)
    const still: Track = { t: [0, 600], lat: [48.85, 48.85], lng: [2.35, 2.35] }
    expect(replayHeading(route({ track: still, points: [[48.85, 2.35], [48.85, 2.35]] }), 300)).toBeUndefined()
    expect(replayHeading({ points: [[48.85, 2.35]], distanceM: 0, moments: [] }, 0)).toBeUndefined()
  })
})

describe('R-096 · la caméra de la relecture', () => {
  it('le chien aux deux tiers de la carte visible, entre les boutons du haut et le panneau', () => {
    // Carte de 756 px, boutons jusqu’à 78 px, panneau réduit qui couvre 300 px : 378 px visibles.
    const pad = replayPadding({ top: 78, bottom: 300 }, 756)
    const center = (pad.top + 756 - pad.bottom) / 2
    expect(center).toBe(78 + 252)
    expect(pad).toMatchObject({ bottom: 300, left: 0, right: 0 })
  })
  it('le panneau monte : le chien remonte avec la carte visible, toujours dedans', () => {
    const pad = replayPadding({ top: 78, bottom: 420 }, 756)
    const center = (pad.top + 756 - pad.bottom) / 2
    expect(center).toBeGreaterThan(78)
    expect(center).toBeLessThan(756 - 420)
  })
})
