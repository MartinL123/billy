import { describe, expect, it } from 'vitest'
import { missingWeatherDetails, needsWeather, needsWeatherDetails, weatherFromResponse, weatherUrl } from './openMeteo'

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

  it('T-102 : une seule requête demande aussi ressenti, vent, pluie, lever et coucher du soleil', () => {
    const url = weatherUrl(48.856613, 2.352222, '2026-10-20T07:31:00Z', NOW)!
    expect(url).toContain('hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation')
    expect(url).toContain('daily=sunrise,sunset')
  })

  it('T-102 : ressenti et vent de l’heure de départ, pluie pendant la balade, moment de la journée', () => {
    const json = {
      hourly: {
        time: ['2026-10-20T15:00', '2026-10-20T16:00', '2026-10-20T17:00', '2026-10-20T18:00'],
        temperature_2m: [12, 11.4, 10, 9],
        relative_humidity_2m: [70, 75, 80, 85],
        apparent_temperature: [10, 9.04, 8, 7],
        wind_speed_10m: [10, 14.6, 12, 9],
        precipitation: [0.5, 0.2, 0.3, 1],
      },
      daily: { time: ['2026-10-20'], sunrise: ['2026-10-20T06:18'], sunset: ['2026-10-20T16:42'] },
    }
    expect(weatherFromResponse(json, '2026-10-20T16:10:00Z', '2026-10-20T16:50:00Z')).toEqual({ tempC: 11.4, humidity: 75, source: 'open-meteo', feelsC: 9, windKmh: 15, rainMm: 0.3, daylight: 'coucher' })
    expect(weatherFromResponse(json, '2026-10-20T15:05:00Z', '2026-10-20T15:30:00Z')?.daylight).toBe('jour')
    // Sans lever ni coucher : pas de moment, le reste est là.
    expect(weatherFromResponse({ hourly: json.hourly }, '2026-10-20T16:10:00Z')).not.toHaveProperty('daylight')
  })

  it('T-102 : une météo sans ses détails les attend ; seuls les manquants sont écrits', () => {
    expect(needsWeatherDetails({ startTime: '2026-10-20T07:31:00Z', points: [{ lat: 45, lng: 1 }], weather: {} })).toBe(true)
    expect(needsWeatherDetails({ startTime: '2026-10-20T07:31:00Z', points: [{ lat: 45, lng: 1 }], weather: { daylight: 'jour' } })).toBe(false)
    expect(needsWeatherDetails({ startTime: '2026-10-20T07:31:00Z', points: [{ lat: 45, lng: 1 }] })).toBe(false)
    expect(missingWeatherDetails({ tempC: 12, source: 'watch', windKmh: 5 }, { tempC: 11, source: 'open-meteo', windKmh: 9, feelsC: 10, daylight: 'nuit' })).toEqual({ feelsC: 10, daylight: 'nuit' })
  })
})
