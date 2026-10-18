import { describe, expect, it } from 'vitest'
import { ageAt, formatAge, formatAgeShort, milestoneMessage } from './age'

describe('ageAt', () => {
  it('compte mois et jours pour Billy', () => {
    expect(ageAt('2026-05-13', '2026-10-13')).toEqual({ years: 0, months: 5, days: 0 })
    expect(ageAt('2026-05-13', '2026-10-16')).toEqual({ years: 0, months: 5, days: 3 })
    expect(ageAt('2026-05-13', '2026-10-12')).toEqual({ years: 0, months: 4, days: 29 })
    expect(ageAt('2026-05-13', '2027-05-13')).toEqual({ years: 1, months: 0, days: 0 })
    expect(ageAt('2026-05-13', '2027-05-12')).toEqual({ years: 0, months: 11, days: 29 })
  })

  it('gère les fins de mois', () => {
    // Né un 31 : 1 mois le dernier jour de février.
    expect(ageAt('2026-01-31', '2026-02-27')).toEqual({ years: 0, months: 0, days: 27 })
    expect(ageAt('2026-01-31', '2026-02-28')).toEqual({ years: 0, months: 1, days: 0 })
    expect(ageAt('2026-01-31', '2026-03-01')).toEqual({ years: 0, months: 1, days: 1 })
    expect(ageAt('2026-01-31', '2026-03-30')).toEqual({ years: 0, months: 1, days: 30 })
    expect(ageAt('2026-01-31', '2026-03-31')).toEqual({ years: 0, months: 2, days: 0 })
    expect(ageAt('2026-03-31', '2026-04-30')).toEqual({ years: 0, months: 1, days: 0 })
    expect(ageAt('2026-12-31', '2027-01-01')).toEqual({ years: 0, months: 0, days: 1 })
  })

  it('gère les années bissextiles', () => {
    expect(ageAt('2024-02-29', '2025-02-27')).toEqual({ years: 0, months: 11, days: 29 })
    expect(ageAt('2024-02-29', '2025-02-28')).toEqual({ years: 1, months: 0, days: 0 })
    expect(ageAt('2024-02-29', '2028-02-28')).toEqual({ years: 3, months: 11, days: 30 })
    expect(ageAt('2024-02-29', '2028-02-29')).toEqual({ years: 4, months: 0, days: 0 })
    expect(ageAt('2028-01-31', '2028-02-29')).toEqual({ years: 0, months: 1, days: 0 })
    expect(ageAt('2027-02-28', '2028-02-29')).toEqual({ years: 1, months: 0, days: 1 })
  })

  it('ne renvoie jamais un âge négatif', () => {
    expect(ageAt('2026-05-13', '2026-05-12')).toEqual({ years: 0, months: 0, days: 0 })
  })
})

describe('formatAge', () => {
  it('parle en langage naturel', () => {
    expect(formatAge('2026-05-13', '2026-10-16')).toBe('5 mois et 3 jours')
    expect(formatAge('2026-05-13', '2026-10-14')).toBe('5 mois et 1 jour')
    expect(formatAge('2026-05-13', '2026-10-13')).toBe('5 mois tout pile')
    expect(formatAge('2026-05-13', '2026-05-25')).toBe('12 jours')
    expect(formatAge('2026-05-13', '2026-05-14')).toBe('1 jour')
    expect(formatAge('2026-05-13', '2026-05-13')).toBe("Né aujourd’hui")
  })

  it("gère le jour d'anniversaire et les années", () => {
    expect(formatAge('2026-05-13', '2027-05-13')).toBe('1 an tout pile')
    expect(formatAge('2026-05-13', '2027-07-16')).toBe('1 an, 2 mois et 3 jours')
    expect(formatAge('2026-05-13', '2028-05-20')).toBe('2 ans et 7 jours')
    expect(formatAge('2026-05-13', '2028-08-13')).toBe('2 ans et 3 mois tout pile')
  })

  it('a une version courte', () => {
    expect(formatAgeShort('2026-05-13', '2026-10-16')).toBe('5 mois')
    expect(formatAgeShort('2026-05-13', '2027-07-16')).toBe('1 an et 2 mois')
    expect(formatAgeShort('2026-05-13', '2026-05-20')).toBe('7 jours')
  })
})

describe('milestoneMessage', () => {
  const msg = (today: string) => milestoneMessage('Billy', '2026-05-13', '2026-09-19', today)

  it('célèbre les mois, les anniversaires et l’adoption', () => {
    // Un mois ordinaire ne répète pas le sous-titre de la carte du chien.
    expect(msg('2026-10-13')).toBeUndefined()
    expect(msg('2026-11-13')).toBe("Billy a 6 mois aujourd’hui !")
    expect(msg('2027-05-13')).toBe("Joyeux anniversaire Billy ! 1 an aujourd’hui.")
    expect(msg('2028-05-13')).toBe("Joyeux anniversaire Billy ! 2 ans aujourd’hui.")
    expect(msg('2027-09-19')).toBe('Ça fait 1 an que Billy est arrivé à la maison.')
  })

  it('ne dit rien les jours ordinaires', () => {
    expect(msg('2026-10-14')).toBeUndefined()
    expect(msg('2027-06-13')).toBeUndefined()
    expect(msg('2026-09-19')).toBeUndefined()
  })
})
