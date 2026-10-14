import { describe, expect, it } from 'vitest'
import { streetFromNominatim } from './street'

describe('nom de la rue', () => {
  it('prend la rue, puis le chemin piéton, puis le parc', () => {
    expect(streetFromNominatim({ address: { road: 'Rue de Rivoli', city: 'Paris' } })).toBe('Rue de Rivoli')
    expect(streetFromNominatim({ address: { pedestrian: 'Quai de l’Hôtel de Ville' } })).toBe('Quai de l’Hôtel de Ville')
    expect(streetFromNominatim({ address: { park: 'Square Jean XXIII', city: 'Paris' } })).toBe('Square Jean XXIII')
  })

  it('rien si inconnu', () => {
    expect(streetFromNominatim({ address: { city: 'Paris' } })).toBeUndefined()
    expect(streetFromNominatim(null)).toBeUndefined()
    expect(streetFromNominatim({ address: { road: '  ' } })).toBeUndefined()
  })
})
