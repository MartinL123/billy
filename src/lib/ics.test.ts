import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics'

const now = new Date(Date.UTC(2026, 9, 13, 11, 30, 0))
const base = { id: 'abc', title: 'Vermifuge', date: '2026-10-17', recurrence: 'none' as const }

describe('export .ics', () => {
  it('crée un événement sur la journée avec rappel la veille à 18 h', () => {
    const ics = buildIcs(base, now)
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')
    expect(ics).toContain('UID:abc@billy\r\n')
    expect(ics).toContain('DTSTAMP:20261013T113000Z\r\n')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261017\r\nDTEND;VALUE=DATE:20261018\r\n')
    expect(ics).toContain('TRIGGER:-PT6H\r\n')
    expect(ics).not.toContain('RRULE')
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
  })

  it('garde l’heure locale et rappelle une heure avant', () => {
    const ics = buildIcs({ ...base, time: '14:05' }, now)
    expect(ics).toContain('DTSTART:20261017T140500\r\nDURATION:PT1H\r\n')
    expect(ics).toContain('TRIGGER:-PT1H\r\n')
  })

  it('traduit les récurrences', () => {
    expect(buildIcs({ ...base, recurrence: 'monthly' }, now)).toContain('RRULE:FREQ=MONTHLY\r\n')
    expect(buildIcs({ ...base, recurrence: 'quarterly' }, now)).toContain('RRULE:FREQ=MONTHLY;INTERVAL=3\r\n')
    expect(buildIcs({ ...base, recurrence: 'yearly' }, now)).toContain('RRULE:FREQ=YEARLY\r\n')
  })

  it('passe la fin de mois et échappe le texte', () => {
    const ics = buildIcs({ ...base, date: '2026-12-31', title: 'Véto; rappel, CHPPiL', notes: 'Dose 1\nÀ jeun' }, now)
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
    expect(ics).toContain('SUMMARY:Véto\\; rappel\\, CHPPiL')
    expect(ics).toContain('DESCRIPTION:Dose 1\\nÀ jeun')
  })

  it('replie les lignes de plus de 75 octets', () => {
    const ics = buildIcs({ ...base, notes: 'é'.repeat(120) }, now)
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(ics.replace(/\r\n /g, '')).toContain(`DESCRIPTION:${'é'.repeat(120)}`)
  })
})
