import { describe, expect, it, vi } from 'vitest'
import { communeFromAddress, NOMINATIM_GAP_MS, nominatimTurn, streetFromNominatim } from './street'

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
  it('nom de la commune', () => {
    expect(communeFromAddress({ address: { village: 'Bourg-en-Test', county: 'Test' } })).toBe('Bourg-en-Test')
    expect(communeFromAddress({ address: { city: 'Paris', suburb: 'Marais' } })).toBe('Paris')
    expect(communeFromAddress({ address: {} })).toBeUndefined()
  })
})


describe('file d’attente de Nominatim', () => {
  it('une requête par seconde au plus, dans l’ordre', async () => {
    vi.useFakeTimers()
    try {
      const times: number[] = []
      const ask = (n: number) => nominatimTurn(async () => (times.push(Date.now()), n))
      const all = Promise.all([ask(1), ask(2), ask(3)])
      await vi.runAllTimersAsync()
      expect(await all).toEqual([1, 2, 3])
      expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(NOMINATIM_GAP_MS)
      expect(times[2]! - times[1]!).toBeGreaterThanOrEqual(NOMINATIM_GAP_MS)
    } finally {
      vi.useRealTimers()
    }
  })

  it('une tâche en échec ne bloque pas les suivantes', async () => {
    vi.useFakeTimers()
    try {
      const failed = nominatimTurn(() => Promise.reject(new Error('réseau')))
      const next = nominatimTurn(async () => 'ok')
      failed.catch(() => undefined)
      await vi.runAllTimersAsync()
      await expect(failed).rejects.toThrow('réseau')
      expect(await next).toBe('ok')
    } finally {
      vi.useRealTimers()
    }
  })
})
