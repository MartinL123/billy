import { describe, expect, it } from 'vitest'
import { needsWeather, weatherFromResponse, weatherUrl } from './openMeteo'

const NOW = new Date('2026-10-22T10:00:00Z')

describe('météo Open-Meteo (V6 § 2.2)', () => {
  it('une balade récente : prévisions avec past_days, position arrondie à 2 décimales', () => {
    const url = weatherUrl(48.856613, 2.352222, '2026-10-20T07:31:00Z', NOW)!
    expect(url).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/)
    expect(url).toContain('latitude=48.86&longitude=2.35')
    expect(url).toContain('past_days=3')
    expect(url).toContain('hourly=temperature_2m,relative_humidity_2m')
    expect(url).toContain('timezone=UTC')
    expect(url).not.toMatch(/48\.856|2\.352/)
  })

  it('une balade ancienne : l’archive, ce jour-là seulement', () => {
    const url = weatherUrl(45.1234, 1.5678, '2026-09-01T16:10:00Z', NOW)!
    expect(url).toMatch(/^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/)
    expect(url).toContain('latitude=45.12&longitude=1.57')
    expect(url).toContain('start_date=2026-09-01&end_date=2026-09-01')
  })

  it('pas de requête pour une heure illisible ou dans le futur', () => {
    expect(weatherUrl(45, 1, 'demain', NOW)).toBeUndefined()
    expect(weatherUrl(45, 1, '2026-10-23T10:00:00Z', NOW)).toBeUndefined()
  })

  it('lit la température et l’humidité de l’heure de départ (UTC)', () => {
    const json = { hourly: { time: ['2026-10-20T06:00', '2026-10-20T07:00', '2026-10-20T08:00'], temperature_2m: [8.04, 9.26, 11], relative_humidity_2m: [90, 85.4, 80] } }
    expect(weatherFromResponse(json, '2026-10-20T07:31:00Z')).toEqual({ tempC: 9.3, humidity: 85, source: 'open-meteo' })
  })

  it('rien si l’heure manque ou si la valeur est vide', () => {
    expect(weatherFromResponse({ hourly: { time: ['2026-10-20T06:00'], temperature_2m: [8] } }, '2026-10-20T07:31:00Z')).toBeUndefined()
    expect(weatherFromResponse({ hourly: { time: ['2026-10-20T07:00'], temperature_2m: [null] } }, '2026-10-20T07:31:00Z')).toBeUndefined()
    expect(weatherFromResponse({ hourly: { time: ['2026-10-20T07:00'], temperature_2m: [8] } }, '2026-10-20T07:31:00Z')).toEqual({ tempC: 8, source: 'open-meteo' })
    expect(weatherFromResponse(null, '2026-10-20T07:31:00Z')).toBeUndefined()
  })

  it('seules les balades datées, avec un trajet et sans météo, attendent leur météo', () => {
    expect(needsWeather({ startTime: '2026-10-20T07:31:00Z', points: [{ lat: 45, lng: 1 }] })).toBe(true)
    expect(needsWeather({ startTime: '2026-10-20T07:31:00Z', points: [{ lat: 45, lng: 1 }], weather: { tempC: 9 } })).toBe(false)
    expect(needsWeather({ points: [{ lat: 45, lng: 1 }] })).toBe(false)
    expect(needsWeather({ startTime: '2026-10-20T07:31:00Z', points: [] })).toBe(false)
    expect(needsWeather(undefined)).toBe(false)
  })
})
