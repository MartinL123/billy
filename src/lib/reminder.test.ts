import { describe, expect, it } from 'vitest'
import { isDue, localParts, reminderText, vapidKeyBytes } from './reminder'

const paris = { time: '21:00', timeZone: 'Europe/Paris' }

describe('rappel du soir', () => {
  it('lit l’heure de Paris, été comme hiver', () => {
    // 13 octobre : heure d'été (UTC+2). 1er décembre : heure d'hiver (UTC+1).
    expect(localParts(new Date('2026-10-13T19:05:00Z'), 'Europe/Paris')).toEqual({ date: '2026-10-13', minutes: 21 * 60 + 5 })
    expect(localParts(new Date('2026-12-01T20:05:00Z'), 'Europe/Paris')).toEqual({ date: '2026-12-01', minutes: 21 * 60 + 5 })
    expect(localParts(new Date('2026-10-13T22:30:00Z'), 'Europe/Paris').date).toBe('2026-10-14')
  })

  it('n’envoie jamais avant l’heure choisie', () => {
    expect(isDue(paris, new Date('2026-10-13T18:59:00Z'))).toBe(false)
    expect(isDue(paris, new Date('2026-10-13T19:00:00Z'))).toBe(true)
  })

  it('tolère le retard des tâches planifiées, mais pas au-delà de 3 heures', () => {
    expect(isDue(paris, new Date('2026-10-13T19:40:00Z'))).toBe(true)
    expect(isDue(paris, new Date('2026-10-13T21:59:00Z'))).toBe(true)
    expect(isDue(paris, new Date('2026-10-13T22:00:00Z'))).toBe(false)
  })

  it('une seule notification par jour et par appareil', () => {
    expect(isDue({ ...paris, lastSent: '2026-10-13' }, new Date('2026-10-13T19:15:00Z'))).toBe(false)
    expect(isDue({ ...paris, lastSent: '2026-10-12' }, new Date('2026-10-13T19:15:00Z'))).toBe(true)
  })

  it('respecte l’heure choisie', () => {
    expect(isDue({ time: '19:30', timeZone: 'Europe/Paris' }, new Date('2026-10-13T17:31:00Z'))).toBe(true)
    expect(isDue({ time: '19:30', timeZone: 'Europe/Paris' }, new Date('2026-10-13T17:29:00Z'))).toBe(false)
  })

  it('écrit le texte au nom du chien, sans reproche', () => {
    expect(reminderText('Billy', false).body).toBe("Comment s’est passée la journée avec Billy ? Notez-le en 30 secondes.")
    expect(reminderText('Billy', true).body).toBe('Journée repos pour Billy : un mot sur sa balade ?')
    expect(reminderText('', false).body).toContain('votre chien')
    for (const rest of [true, false]) expect(reminderText('Rex', rest).body).not.toMatch(/oubli|pas encore|toujours pas|n’avez pas/i)
  })

  it('convertit la clé publique en octets', () => {
    expect([...vapidKeyBytes('AQID')]).toEqual([1, 2, 3])
    expect([...vapidKeyBytes('_-8')]).toEqual([255, 239])
  })
})
