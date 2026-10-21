import { describe, expect, it } from 'vitest'
import { chrono, doubtfulSegments, durationParts, endWalkPills, gpsActivity, minutesSince, overlapShare, territoryBits, tooShort, weakSignal, withoutGpsDuplicates, type GpsPoint, stoppedAtOf } from './gpsWalk'
import type { WatchWalk } from './watch'

const start = '2026-10-18T17:00:00.000Z'
const at = (minutes: number) => new Date(Date.parse(start) + minutes * 60_000).toISOString()
/** Une ligne droite vers le nord, un point par minute, `step` mètres entre deux points. */
const line = (count: number, step = 100): GpsPoint[] => Array.from({ length: count }, (_, i) => ({ lat: 48.6 + (i * step) / 111_000, lng: -2.06, time: at(i) }))

describe('balade enregistrée par l’iPhone (T-036)', () => {
  it('le chrono et la durée de la carte', () => {
    expect(chrono(247_000)).toBe('4:07')
    expect(chrono(3_729_000)).toBe('1:02:09')
    expect(minutesSince(23 * 60_000 + 5_000)).toBe('23\u00a0min')
    expect(minutesSince(65 * 60_000)).toBe('1 h 05')
  })

  it('moins de 100 m ou moins de 2 minutes : pas gardée', () => {
    expect(tooShort(line(2, 50), start, Date.parse(at(10)))).toBe(true) // 50 m
    expect(tooShort(line(5), start, Date.parse(at(1)))).toBe(true) // 1 minute
    expect(tooShort(line(5), start, Date.parse(at(10)))).toBe(false)
  })

  it('devient une activité nommée selon l’heure de départ', () => {
    expect(gpsActivity(line(3), start)).toMatchObject({ name: 'Balade du soir', type: 'walking' })
  })

  it('une séance Watch couverte à plus de la moitié par une balade de l’iPhone est ignorée', () => {
    expect(overlapShare({ start: at(0), end: at(40) }, { start: at(5), end: at(45) })).toBeCloseTo(35 / 40)
    expect(overlapShare({ start: at(0), end: at(40) }, { start: at(50), end: at(60) })).toBe(0)
    const watch = (from: number, to: number): WatchWalk => ({ uuid: String(from), start: at(from), end: at(to), type: 'walking', points: [] })
    const known = [{ source: 'gps', route: { source: 'gps', startTime: at(2), endTime: at(38) } }, { route: { source: 'gpx', startTime: at(100), endTime: at(140) } }]
    expect(withoutGpsDuplicates([watch(0, 40), watch(30, 90), watch(100, 140)], known).map((w) => w.uuid)).toEqual(['30', '100'])
  })
})

describe('balade en cours, V5 (T-051)', () => {
  it('« 15 min 17 s »', () => {
    expect(durationParts(917_000)).toEqual({ min: 15, sec: 17 })
    expect(durationParts(-5)).toEqual({ min: 0, sec: 0 })
  })

  it('GPS faible : plus de 50 m depuis plus de 20 s', () => {
    expect(weakSignal(80, 0, 21_000)).toBe(true)
    expect(weakSignal(80, 0, 10_000)).toBe(false)
    expect(weakSignal(12, 0, 60_000)).toBe(false)
    expect(weakSignal(undefined, undefined, 60_000)).toBe(false)
  })

  it('les portions douteuses (trou de plus de 20 s)', () => {
    const pts = [at(0), at(0.2), at(1), at(1.1)].map((time) => ({ lat: 48.6, lng: -2, time }))
    expect(doubtfulSegments(pts)).toEqual([[1, 2]])
  })

  it('les bouts de territoire et les pastilles de fin : +3 os seulement s’ils sont donnés', () => {
    expect(territoryBits(39)).toBe(0)
    expect(territoryBits(85)).toBe(2)
    const nb = (list: string[]) => list.map((t) => t.replace(/ /g, ' '))
    expect(nb(endWalkPills({ noteBones: 3, bits: 2, slotName: 'Sortie du soir' }))).toEqual(['+3 os', '2 nouveaux bouts de territoire', 'Sortie du soir notée'])
    // Limite de 3 notes par jour atteinte : pas de pastille d’os.
    expect(nb(endWalkPills({ noteBones: 0, bits: 1 }))).toEqual(['Un nouveau bout de territoire'])
  })
})

describe('arrêt à 3 h (R-043, T-062)', () => {
  const start = '2026-10-21T08:00:00.000Z'
  it('« Terminer » touché : l’heure de l’arrêt', () => {
    expect(stoppedAtOf({ stopped: true, stoppedAt: '2026-10-21T08:40:00.000Z', recording: false, startedAt: start }, Date.parse('2026-10-21T09:00:00Z'))).toBe('2026-10-21T08:40:00.000Z')
  })
  it('app fermée depuis plus de 3 h : arrêtée à départ + 3 h, jamais plus tard', () => {
    expect(stoppedAtOf({ recording: false, startedAt: start }, Date.parse('2026-10-21T15:00:00Z'))).toBe('2026-10-21T11:00:00.000Z')
  })
  it('moins de 3 h, ou le GPS enregistre encore : pas arrêtée', () => {
    expect(stoppedAtOf({ recording: false, startedAt: start }, Date.parse('2026-10-21T10:00:00Z'))).toBeUndefined()
    expect(stoppedAtOf({ recording: true, startedAt: start }, Date.parse('2026-10-21T15:00:00Z'))).toBeUndefined()
  })
})
