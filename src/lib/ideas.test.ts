import { describe, expect, it } from 'vitest'
import { arrowTo, directionsUrl, metersLabel } from './ideas'

describe('un lieu sur la carte', () => {
  const here = { lat: 47, lng: 2 }

  it('petites aides', () => {
    expect(metersLabel(712)).toBe('700 m')
    expect(metersLabel(1400)).toBe('1,4 km')
    expect(directionsUrl(47, 2)).toBe('https://maps.apple.com/?daddr=47.00000,2.00000&dirflg=w')
    expect(arrowTo(here, { lat: 47.01, lng: 2.01 })).toBe('↗')
    expect(arrowTo(here, { lat: 46.99, lng: 2 })).toBe('↓')
  })
})
