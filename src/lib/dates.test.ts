import { describe, expect, it } from 'vitest'
import { addDays, addMonths, diffDays, formatDayHeading, formatLong, formatMonthYear, formatRelative, formatShort, formatTime, formatWeekdayShort, isValidISO, todayISO } from './dates'

describe('dates', () => {
  it('formate en français', () => {
    expect(formatLong('2026-05-13')).toBe('13 mai 2026')
    expect(formatLong('2026-10-01')).toBe('1er octobre 2026')
    expect(formatShort('2026-10-17')).toBe('17 oct.')
    expect(formatShort('2027-01-17', 2026)).toBe('17 janv. 2027')
    expect(formatWeekdayShort('2026-10-17')).toBe('Sam. 17 oct.')
    expect(formatWeekdayShort('2026-10-01')).toBe('Jeu. 1er oct.')
    expect(formatMonthYear('2026-10-05')).toBe('Octobre 2026')
    expect(formatDayHeading('2026-10-13')).toBe('Mardi 13 octobre')
    expect(formatTime('14:00')).toBe('14 h 00')
    expect(formatTime('09:05')).toBe('9 h 05')
  })

  it('donne des dates relatives', () => {
    expect(formatRelative('2026-10-13', '2026-10-13')).toBe("aujourd'hui")
    expect(formatRelative('2026-10-14', '2026-10-13')).toBe('demain')
    expect(formatRelative('2026-10-12', '2026-10-13')).toBe('hier')
    expect(formatRelative('2026-10-17', '2026-10-13')).toBe('dans 4 jours')
    expect(formatRelative('2026-10-10', '2026-10-13')).toBe('il y a 3 jours')
  })

  it('calcule sans dérive de fuseau ni d’heure d’été', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addMonths('2026-11-13', 2)).toBe('2027-01-13')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(todayISO(new Date(2026, 9, 13, 23, 59))).toBe('2026-10-13')
  })

  it('valide les dates', () => {
    expect(isValidISO('2026-02-28')).toBe(true)
    expect(isValidISO('2026-02-30')).toBe(false)
    expect(isValidISO('')).toBe(false)
  })
})
