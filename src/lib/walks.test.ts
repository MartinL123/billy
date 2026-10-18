import { describe, expect, it } from 'vitest'
import { DEFAULT_WALK_TIMES, dueWalkSlots, formatHour, walkReminderText, walkState, walkTimes, walkName } from './walks'

const h = (time: string) => {
  const [a, b] = time.split(':').map(Number)
  return a! * 60 + b!
}

describe('sorties du jour', () => {
  it('complète les heures manquantes ou invalides par celles par défaut', () => {
    expect(walkTimes()).toEqual(DEFAULT_WALK_TIMES)
    expect(walkTimes({ midi: '12:30', soir: 'n’importe' })).toEqual({ matin: '08:00', midi: '12:30', soir: '19:00' })
  })

  it('dit si une sortie est faite, à faire ou pour plus tard', () => {
    expect(walkState('13:00', undefined, h('12:59'))).toBe('plus-tard')
    expect(walkState('13:00', undefined, h('13:00'))).toBe('a-faire')
    expect(walkState('13:00', '12:40', h('14:00'))).toBe('fait')
  })

  it('rappelle à l’heure du créneau, jamais avant, et pas au-delà de 90 minutes', () => {
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, {}, [], h('07:59'))).toEqual([])
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, {}, [], h('08:00'))).toEqual(['matin'])
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, {}, [], h('09:29'))).toEqual(['matin'])
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, {}, [], h('09:30'))).toEqual([])
  })

  it('ne rappelle pas une sortie déjà cochée ni un rappel déjà envoyé', () => {
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, { midi: '12:50' }, [], h('13:10'))).toEqual([])
    expect(dueWalkSlots(DEFAULT_WALK_TIMES, {}, ['midi'], h('13:10'))).toEqual([])
  })

  it('écrit l’heure en français', () => {
    expect(formatHour('08:00')).toBe('8 h')
    expect(formatHour('13:30')).toBe('13 h 30')
  })

  it('invite à sortir, sans reproche', () => {
    const text = walkReminderText('Billy', 'midi', '13:00')
    expect(text.title).toBe('13 h : la sortie de midi')
    expect(text.body).toContain('sortir Billy')
    expect(text.body).not.toMatch(/oubli|pas encore|toujours pas|n'avez pas/i)
    expect(walkReminderText('', 'soir', '19:00').body).toContain('votre chien')
  })
})

import { slotForStart } from './walks'

describe('sortie cochée par une balade importée', () => {
  const times = { matin: '08:00', midi: '13:00', soir: '19:00' }
  it('le créneau le plus proche du départ, à 3 h près', () => {
    expect(slotForStart(times, 7 * 60 + 32)).toBe('matin')
    expect(slotForStart(times, 14 * 60 + 10)).toBe('midi')
    expect(slotForStart(times, 17 * 60)).toBe('soir')
    expect(slotForStart(times, 2 * 60)).toBeUndefined()
  })
})

describe('nom de la sortie selon l’heure (audit R-025)', () => {
  it('suit l’heure réglée', () => {
    expect(walkName('08:00')).toBe('la sortie du matin')
    expect(walkName('13:00')).toBe('la sortie de midi')
    expect(walkName('14:30')).toBe('la sortie de l’après-midi')
    expect(walkName('19:00')).toBe('la sortie du soir')
  })
})
