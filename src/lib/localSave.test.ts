import { describe, expect, it, vi } from 'vitest'
import { ensureSavedLocally, NotSavedError } from './localSave'

describe('la balade est-elle dans la base locale ? (R-045)', () => {
  it('rien à vérifier, ou tout est là : on peut effacer la copie', async () => {
    await expect(ensureSavedLocally([], () => Promise.resolve(false))).resolves.toBeUndefined()
    await expect(ensureSavedLocally(['a', 'b'], () => Promise.resolve(true))).resolves.toBeUndefined()
  })

  it('une balade manque : on garde la copie', async () => {
    await expect(ensureSavedLocally(['a', 'b'], async (id) => id === 'a')).rejects.toThrow('1 sur 2 introuvable')
  })

  it('Firestore en panne (la lecture lève l’assertion interne) : on garde la copie', async () => {
    const crashed = () => Promise.reject(new Error('FIRESTORE (13.0.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)'))
    await expect(ensureSavedLocally(['a'], crashed)).rejects.toBeInstanceOf(NotSavedError)
  })

  it('Firestore bloqué (la lecture ne répond jamais) : on garde la copie au bout de 5 s', async () => {
    vi.useFakeTimers()
    const check = ensureSavedLocally(['a'], () => new Promise(() => undefined))
    vi.advanceTimersByTime(5000)
    await expect(check).rejects.toThrow('pas de réponse après 5 s')
    vi.useRealTimers()
  })
})
