import { describe, expect, it } from 'vitest'
import { answerDetected, bannerLine, confirmedFor, detectOutings, distanceLabel, newDetected, outingCardLine, pendingOutings, type DistanceBucket } from './walkingBouts'
import { DEFAULT_WALK_TIMES } from './walks'

// Heures locales (celles de l'iPhone) : les tests ne dépendent pas du fuseau de la machine.
const at = (day: number, h: number, m: number) => new Date(2026, 10, day, h, m).toISOString()

/** Des tranches de 5 min, de `h:m` pendant `count` tranches, `meters` chacune. */
function run(day: number, h: number, m: number, count: number, meters: number): DistanceBucket[] {
  return Array.from({ length: count }, (_, i) => ({ start: at(day, h, m + 5 * i), meters }))
}

// Le 7 nov. (export Santé de Martin) : 10 h 55 → 11 h 20, 1,3 km ; 17 h 20 → 17 h 50, 1,8 km. Plus quelques pas dans la
// maison (sous 150 m) et une petite course de 10 min.
const nov7: DistanceBucket[] = [
  { start: at(7, 8, 0), meters: 40 },
  { start: at(7, 9, 30), meters: 120 },
  ...run(7, 10, 55, 5, 260),
  ...run(7, 14, 0, 2, 300),
  { start: at(7, 16, 10), meters: 60 },
  ...run(7, 17, 20, 6, 300),
]

const none = { walks: [], noted: [], times: DEFAULT_WALK_TIMES }

describe('T-121 · sorties repérées par la distance à pied', () => {
  it('le 7 nov. : 2 sorties (10 h 55 tombe sur midi avec les heures par défaut, 8 h / 13 h / 19 h)', () => {
    const found = detectOutings(nov7, none)
    expect(found).toHaveLength(2)
    expect(found[0]).toMatchObject({ start: at(7, 10, 55), end: at(7, 11, 20), meters: 1300, minutes: 25, date: '2026-11-07', slot: 'midi', time: '10:55' })
    expect(found[1]).toMatchObject({ start: at(7, 17, 20), end: at(7, 17, 50), meters: 1800, minutes: 30, slot: 'soir', time: '17:20' })
  })

  it('recolle un arrêt de 10 min au plus, et compte la distance de l’arrêt', () => {
    const buckets = [...run(8, 8, 0, 2, 200), { start: at(8, 8, 10), meters: 30 }, ...run(8, 8, 20, 2, 200)]
    expect(detectOutings(buckets, none)).toMatchObject([{ start: at(8, 8, 0), end: at(8, 8, 30), meters: 830, minutes: 30 }])
  })

  it('un arrêt de plus de 10 min coupe en deux, et deux bouts trop courts ne font rien', () => {
    const buckets = [...run(8, 8, 0, 2, 250), ...run(8, 8, 25, 2, 250)]
    expect(detectOutings(buckets, none)).toEqual([])
  })

  it('15 min mais moins de 400 m : pas une sortie', () => {
    expect(detectOutings(run(8, 8, 0, 3, 130), none)).toEqual([])
    expect(detectOutings(run(8, 8, 0, 3, 150), none)).toHaveLength(1)
  })

  it('une séance Watch au même moment : une seule balade (la sortie repérée est écartée)', () => {
    const walks = [{ route: { startTime: at(7, 17, 22), endTime: at(7, 17, 48) } }]
    expect(detectOutings(nov7, { ...none, walks }).map((o) => o.time)).toEqual(['10:55'])
  })

  it('une sortie déjà notée au même moment, ou un créneau déjà fait : écartée', () => {
    const noted = [{ date: '2026-11-07', done: { midi: '11:00' }, noted: { midi: 20 } }]
    expect(detectOutings(nov7, { ...none, noted }).map((o) => o.time)).toEqual(['17:20'])
    const done = [{ date: '2026-11-07', done: { soir: '19:30' } }]
    expect(detectOutings(nov7, { ...none, noted: done }).map((o) => o.time)).toEqual(['10:55'])
  })

  it('en pleine nuit : pas de créneau, rien', () => {
    expect(detectOutings(run(8, 2, 0, 4, 300), none)).toEqual([])
  })

  it('n’ajoute que les nouvelles, en attente, jour par jour', () => {
    const found = detectOutings(nov7, none)
    const first = newDetected(found, [])
    expect(first.get('2026-11-07')).toEqual([
      { start: at(7, 10, 55), end: at(7, 11, 20), meters: 1300, status: 'pending', slot: 'midi' },
      { start: at(7, 17, 20), end: at(7, 17, 50), meters: 1800, status: 'pending', slot: 'soir' },
    ])
    const again = newDetected(found, [{ date: '2026-11-07', detected: answerDetected(first.get('2026-11-07')!, at(7, 17, 20), 'no') }])
    expect(again.size).toBe(0)
  })

  it('la liste à confirmer : les plus récentes d’abord, sans les réponses ni ce qui est couvert depuis', () => {
    const detected = newDetected(detectOutings(nov7, none), []).get('2026-11-07')!
    const days = [{ date: '2026-11-07', detected }]
    expect(pendingOutings(days, [], DEFAULT_WALK_TIMES).map((p) => p.time)).toEqual(['17:20', '10:55'])
    const answered = [{ date: '2026-11-07', detected: answerDetected(detected, at(7, 10, 55), 'yes') }]
    expect(pendingOutings(answered, [], DEFAULT_WALK_TIMES).map((p) => p.time)).toEqual(['17:20'])
    // La séance Watch lue après coup : la sortie ne se propose plus.
    expect(pendingOutings(days, [{ route: { startTime: at(7, 17, 25), durationMin: 20 } }], DEFAULT_WALK_TIMES).map((p) => p.time)).toEqual(['10:55'])
    expect(confirmedFor(answered[0]!.detected, 'midi', '10:55')?.meters).toBe(1300)
    expect(confirmedFor(answered[0]!.detected, 'soir', '17:20')).toBeUndefined()
  })

  it('les textes', () => {
    expect(outingCardLine({ start: at(7, 17, 20), minutes: 30, meters: 1800 })).toBe('Sam. 7 nov. · 17 h 20 · 30 min · 1,8 km')
    expect(outingCardLine({ start: at(10, 8, 0), minutes: 18, meters: 840 })).toBe('Mar. 10 nov. · 8 h · 18 min · 840 m')
    expect(distanceLabel(1349)).toBe('1,3 km')
    expect(bannerLine(3)).toBe('3 sorties repérées par votre iPhone')
    expect(bannerLine(1)).toBe('1 sortie repérée par votre iPhone')
  })
})
