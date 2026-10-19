import { describe, expect, it, vi } from 'vitest'
import { errorText, TimeoutError, withTimeout } from './timeout'

describe('attente avec délai maximum (R-042)', () => {
  it('rend la valeur si elle arrive à temps', async () => {
    await expect(withTimeout(Promise.resolve(3), 1000, 'test')).resolves.toBe(3)
  })

  it('échoue au-delà du délai', async () => {
    vi.useFakeTimers()
    const never = new Promise(() => undefined)
    const result = withTimeout(never, 10_000, 'stopWalk')
    vi.advanceTimersByTime(10_000)
    await expect(result).rejects.toBeInstanceOf(TimeoutError)
    await expect(result).rejects.toThrow('stopWalk : pas de réponse après 10 s')
    vi.useRealTimers()
  })

  it('décrit n’importe quelle erreur', () => {
    expect(errorText(new Error('boum'))).toBe('Error: boum')
    expect(errorText({ code: 'denied', message: 'Refusé' })).toBe('denied Refusé')
    expect(errorText('texte')).toBe('texte')
  })
})
