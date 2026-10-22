import { describe, expect, it } from 'vitest'
import { MAP_PREFS_KEY, readMapPrefs, writeMapPrefs } from './mapPrefs'

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('« Affichage » de la carte (T-095, V6.1 § 2)', () => {
  it('au premier lancement : plan, 2D, brouillard éteint', () => {
    expect(readMapPrefs(memory())).toEqual({ satellite: false, three: false, fog: false })
    expect(readMapPrefs(undefined).fog).toBe(false)
  })

  it('le choix du brouillard survit à une relance', () => {
    const store = memory()
    writeMapPrefs({ satellite: false, three: false, fog: true }, store)
    expect(readMapPrefs(store).fog).toBe(true)
    writeMapPrefs({ ...readMapPrefs(store), fog: false }, store)
    expect(readMapPrefs(store).fog).toBe(false)
  })

  it('les choix d’avant (sans brouillard) restent, le brouillard reste éteint ; un stockage abîmé ou qui refuse ne casse rien', () => {
    const store = memory()
    store.setItem(MAP_PREFS_KEY, JSON.stringify({ satellite: true, three: false }))
    expect(readMapPrefs(store)).toEqual({ satellite: true, three: false, fog: false })
    store.setItem(MAP_PREFS_KEY, '{oups')
    expect(readMapPrefs(store).fog).toBe(false)
    const refusing = { getItem: () => null, setItem: () => { throw new Error('plein') } }
    expect(() => writeMapPrefs({ satellite: false, three: false, fog: true }, refusing)).not.toThrow()
  })
})
