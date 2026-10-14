import { afterEach, describe, expect, it } from 'vitest'
import { place, setNoGarden, withoutGarden } from './garden'

describe('sans jardin', () => {
  afterEach(() => setNoGarden(false))

  it('remplace « jardin » par couloir, palier, parc vide', () => {
    expect(withoutGarden('Au jardin ou dans la cour')).toBe('Dans le couloir ou un parc vide')
    expect(withoutGarden('Dans la cour ou au jardin')).toBe('Dans le couloir ou un parc vide')
    expect(withoutGarden('Suit les changements de direction au jardin')).toBe('Suit les changements de direction dans le couloir ou un parc vide')
    expect(withoutGarden('Regarde les passants depuis la fenêtre ou le jardin, détendu')).toBe('Regarde les passants depuis la fenêtre ou le palier, détendu')
    expect(withoutGarden('Maison avec distractions, ou jardin')).toBe('Maison avec distractions, ou couloir, palier')
    expect(withoutGarden('Cachez 5 à 10 croquettes dans une pièce ou le jardin.')).toBe('Cachez 5 à 10 croquettes dans une pièce ou le palier.')
    expect(withoutGarden('Dans la rue')).toBe('Dans la rue')
  })

  it('seulement pour un compte sans jardin', () => {
    expect(place('Au jardin ou dans la cour')).toBe('Au jardin ou dans la cour')
    setNoGarden(true)
    expect(place('Au jardin ou dans la cour')).toBe('Dans le couloir ou un parc vide')
  })
})
