import { describe, expect, it } from 'vitest'
import { toImported } from './activity'
import { gpsActivity, type GpsPoint } from './gpsWalk'
import { isGoodMoment, markerMoments, PICKABLE_MOMENTS, routeMomentInfo, storeRoute, type Route } from './route'
import { monthReport } from './walkBilan'
import { stopChips, stopsLine } from './walkRecap'
import { untoldStops } from './walkSheet'
import { stopsToTell, tellMoment, tellQueue } from './walkTell'
import { walkTimeline } from './walkTimeline'

// T-086 : les « Repère » touchés sur la Live Activity deviennent des moments « À raconter ».

const M_PER_DEG = 111_195

describe('repères de la Live Activity (T-086)', () => {
  it('un repère devient un moment « À raconter », gris calme, jamais proposé dans la liste', () => {
    expect(routeMomentInfo('araconter')).toMatchObject({ label: 'À raconter' })
    expect(PICKABLE_MOMENTS.some((m) => m.id === 'araconter')).toBe(false)
    expect(isGoodMoment({ lat: 0, lng: 0, type: 'araconter' })).toBe(false)
    expect(markerMoments([{ lat: 48.8566123, lng: 2.3522987, time: '2026-10-22T08:00:00Z' }])).toEqual([{ lat: 48.85661, lng: 2.3523, type: 'araconter' }])
  })

  it('positions invalides écartées, deux touchers au même endroit : un seul repère', () => {
    expect(markerMoments(undefined)).toEqual([])
    expect(markerMoments([{ lat: Number.NaN, lng: 2 }, { lat: 120, lng: 2 }])).toEqual([])
    const twice = markerMoments([
      { lat: 48.85, lng: 2.35 },
      { lat: 48.85 + 5 / M_PER_DEG, lng: 2.35 },
      { lat: 48.85 + 50 / M_PER_DEG, lng: 2.35 },
    ])
    expect(twice).toHaveLength(2)
  })

  it('la balade de l’iPhone garde ses repères jusqu’à l’enregistrement', () => {
    const start = '2026-10-22T06:00:00.000Z'
    const points: GpsPoint[] = Array.from({ length: 40 }, (_, i) => ({ lat: 48.85 + (i * 20) / M_PER_DEG, lng: 2.35, time: new Date(Date.parse(start) + i * 15_000).toISOString() }))
    const activity = gpsActivity(points, start, undefined, [{ lat: 48.851, lng: 2.35, time: '2026-10-22T06:03:00.000Z' }])
    expect(activity.markers).toHaveLength(1)
    expect(gpsActivity(points, start).markers).toBeUndefined()
    const walk = toImported(activity)!
    expect(walk.moments).toEqual([{ lat: 48.851, lng: 2.35, type: 'araconter' }])
    expect(toImported(gpsActivity(points, start))!.moments).toBeUndefined()
  })
})

describe('raconter un repère (T-086)', () => {
  // Un trajet daté : départ à 0 s, un point tous les 10 m toutes les 10 s.
  const track = { t: Array.from({ length: 61 }, (_, i) => i * 10), lat: Array.from({ length: 61 }, (_, i) => 48.85 + (i * 10) / M_PER_DEG), lng: Array.from({ length: 61 }, () => 2.35), v: Array.from({ length: 61 }, () => 1) }
  const route: Route = {
    points: [
      [48.85, 2.35],
      [48.85 + 600 / M_PER_DEG, 2.35],
    ],
    distanceM: 600,
    startTime: '2026-10-22T06:00:00.000Z',
    track,
    moments: [
      { lat: 48.85 + 100 / M_PER_DEG, lng: 2.35, type: 'araconter' },
      { lat: 48.85 + 400 / M_PER_DEG, lng: 2.35, type: 'araconter' },
      { lat: 48.85 + 550 / M_PER_DEG, lng: 2.35, type: 'jeu' },
    ],
    stops: [
      { at: 100, durS: 60, lat: 48.85 + 100 / M_PER_DEG, lng: 2.35, street: 'Rue des Lilas', momentIndex: 0 },
      { at: 250, durS: 40, lat: 48.85 + 250 / M_PER_DEG, lng: 2.35 },
    ],
  }

  it('la file : les arrêts sans repère ou « À raconter », puis les repères hors arrêt, dans l’ordre de la balade', () => {
    expect(tellQueue(route)).toEqual([
      { kind: 'stop', stopIndex: 0, momentIndex: 0, atS: 100 },
      { kind: 'stop', stopIndex: 1, atS: 250 },
      { kind: 'marker', momentIndex: 1, atS: 400 },
    ])
    expect(stopsToTell(route)).toEqual([0, 1])
    expect(untoldStops(route)).toHaveLength(2)
  })

  it('T-107 : ouverte depuis un arrêt de la fiche, la file a tous les arrêts, déjà racontés compris', () => {
    const told = { ...route, moments: tellMoment(route, tellQueue(route)[0]!, 'marque')! }
    const stored = storeRoute(told)
    const all = tellQueue({ ...told, stops: stored.stops }, { told: true })
    expect(all.map((i) => (i.kind === 'stop' ? `arrêt ${i.stopIndex}` : `repère ${i.momentIndex}`))).toEqual(['arrêt 0', 'arrêt 1', 'repère 1'])
    expect(all[0]).toEqual({ kind: 'stop', stopIndex: 0, momentIndex: 0, atS: 100 })
    // Changer la réponse d’un arrêt déjà raconté la remplace (le bandeau « Annuler » rend l’ancienne).
    expect(tellMoment(told, all[0]!, 'jeu')![0]).toMatchObject({ type: 'jeu', street: 'Rue des Lilas' })
  })

  it('choisir une tuile REMPLACE le repère « À raconter » (même position, rue de l’arrêt)', () => {
    const [onStop, , loose] = tellQueue(route)
    const a = tellMoment(route, onStop!, 'reniflage')!
    expect(a).toHaveLength(3)
    expect(a[0]).toEqual({ lat: route.moments[0]!.lat, lng: 2.35, type: 'reniflage', street: 'Rue des Lilas' })
    const b = tellMoment(route, loose!, 'peur', 'Un vélo')!
    expect(b[1]).toEqual({ lat: route.moments[1]!.lat, lng: 2.35, type: 'peur', note: 'Un vélo' })
    expect(b[0]).toBe(route.moments[0])
    // Un arrêt sans repère en reçoit un nouveau.
    expect(tellMoment(route, { kind: 'stop', stopIndex: 1, atS: 250 }, 'jeu')).toHaveLength(4)
    expect(tellMoment(route, { kind: 'marker', momentIndex: 9 }, 'jeu')).toBeUndefined()
  })

  it('une fois raconté, plus rien à raconter ; l’arrêt reste rattaché', () => {
    const told = { ...route, moments: tellMoment(route, tellQueue(route)[0]!, 'marque')! }
    const stored = storeRoute(told)
    expect(stored.stops![0]!.momentIndex).toBe(0)
    expect(tellQueue({ ...told, stops: stored.stops })).toHaveLength(2)
  })

  it('la frise montre le repère hors arrêt à son heure, « À raconter »', () => {
    const events = walkTimeline(route)
    const loose = events.find((e) => e.kind === 'moment' && e.moment.type === 'araconter')
    expect(loose).toMatchObject({ atS: 400, momentIndex: 1 })
  })

  it('le récap et le bilan ne comptent pas un repère « À raconter » comme raconté', () => {
    expect(stopChips(route)).toEqual([{ label: '3 à raconter', todo: true }])
    expect(stopsLine(0, 2)).toBe('2 repères posés. Que s’est-il passé ?')
    expect(stopsLine(4, 2)).toBe('4 arrêts. Que s’est-il passé ?')
    const report = monthReport([{ id: 'w', date: '2026-10-22', route }], '2026-10')
    expect(report.toldStops).toBe(0)
    expect(report.topMoment).toBe('jeu')
  })
})
