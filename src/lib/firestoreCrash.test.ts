import { describe, expect, it } from 'vitest'
import { isFirestoreCrash, mayReload } from './firestoreCrash'

describe('panne de Firestore après l’arrière-plan (R-042)', () => {
  it('reconnaît l’assertion interne vue au Simulateur', () => {
    const message = 'FIRESTORE (13.0.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"RE":"Attempt to open a cursor in database without an in-progress transaction"}'
    expect(isFirestoreCrash(new Error(message))).toBe(true)
    expect(isFirestoreCrash({ message })).toBe(true)
    expect(isFirestoreCrash(message)).toBe(true)
    expect(isFirestoreCrash(new Error('Écriture Firestore refusée'))).toBe(false)
    expect(isFirestoreCrash(undefined)).toBe(false)
  })

  it('jamais plus d’un rechargement toutes les 30 s', () => {
    expect(mayReload(undefined, 0)).toBe(true)
    expect(mayReload(1000, 20_000)).toBe(false)
    expect(mayReload(1000, 31_000)).toBe(true)
  })
})
