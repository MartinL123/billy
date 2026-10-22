import { describe, expect, it } from 'vitest'
import { walkSourceLabel } from './walkSource'

describe('walkSourceLabel (R-092)', () => {
  it('une seule étiquette par source', () => {
    expect(walkSourceLabel('watch', 'watch')).toBe('Watch')
    expect(walkSourceLabel(undefined, 'watch')).toBe('Watch')
    expect(walkSourceLabel('gps', 'gps')).toBe('iPhone')
    expect(walkSourceLabel(undefined, 'gps')).toBe('iPhone')
  })
  it('un GPX importé est un « Fichier », jamais « Strava »', () => {
    expect(walkSourceLabel('strava', 'gpx')).toBe('Fichier')
    expect(walkSourceLabel('strava')).toBe('Fichier')
    expect(walkSourceLabel(undefined, 'gpx')).toBe('Fichier')
  })
  it('sans source : notée à la main', () => {
    expect(walkSourceLabel()).toBe('Notée')
  })
})
