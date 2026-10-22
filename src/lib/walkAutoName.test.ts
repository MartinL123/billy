import { describe, expect, it } from 'vitest'
import { autoWalkName, isAutoName, nextAutoName, notablePlace, placePhrase } from './walkAutoName'

// Noms de lieux inventés (le dépôt est public).
const square = { name: 'Square des Tilleuls', kind: 'square' as const }
const parc = { name: 'Parc du Moulin Bleu', kind: 'parc' as const }
const jeux = { name: 'Aire de jeux Pivert', kind: 'jeux' as const }

describe('nom automatique (T-103)', () => {
  it('choisit le lieu le plus parlant', () => {
    expect(notablePlace([jeux, parc, square])).toEqual(square)
    expect(notablePlace([jeux, parc])).toEqual(parc)
    expect(notablePlace([jeux])).toBeUndefined()
    expect(notablePlace(undefined)).toBeUndefined()
  })

  it('dit « au », « à la », « à l’ », « aux » ou « à »', () => {
    expect(placePhrase('Square des Tilleuls')).toBe('au square des Tilleuls')
    expect(placePhrase('Promenade du Ruisseau')).toBe('à la promenade du Ruisseau')
    expect(placePhrase('Espace vert du Lavoir')).toBe('à l’espace vert du Lavoir')
    expect(placePhrase('Les Jardins de Pomone')).toBe('aux jardins de Pomone')
    expect(placePhrase('Le Pré Fleuri')).toBe('au Pré Fleuri')
    expect(placePhrase('Bellerive')).toBe('à Bellerive')
  })

  it('moment + lieu, ou le moment seul', () => {
    expect(autoWalkName('Balade du matin', [square])).toBe('Balade du matin au square des Tilleuls')
    expect(autoWalkName('Balade du soir', [jeux])).toBe('Balade du soir')
  })

  it('un nom choisi par la personne reste', () => {
    expect(isAutoName({ text: 'Balade du matin' })).toBe(true)
    expect(isAutoName({ text: 'Randonnée de l’après-midi' })).toBe(true)
    expect(isAutoName({ text: 'Balade' })).toBe(true)
    expect(isAutoName({ text: 'Balade du matin au square des Tilleuls', autoName: 'Balade du matin au square des Tilleuls' })).toBe(true)
    expect(isAutoName({ text: 'Balade du matin avec Rox', autoName: 'Balade du matin au square des Tilleuls' })).toBe(false)
    expect(isAutoName({ text: 'Tour du lac' })).toBe(false)
    expect(nextAutoName({ text: 'Tour du lac' }, [square])).toBeUndefined()
  })

  it('recalculé quand les lieux arrivent, seulement si le nom est automatique', () => {
    expect(nextAutoName({ text: 'Balade du matin' }, [parc])).toBe('Balade du matin au parc du Moulin Bleu')
    expect(nextAutoName({ text: 'Balade du matin' }, [])).toBeUndefined()
    // Un recadrage : d’autres lieux, le nom suit.
    const before = { text: 'Balade du matin au parc du Moulin Bleu', autoName: 'Balade du matin au parc du Moulin Bleu' }
    expect(nextAutoName(before, [square])).toBe('Balade du matin au square des Tilleuls')
    expect(nextAutoName(before, [jeux])).toBe('Balade du matin')
    expect(nextAutoName(before, [parc])).toBeUndefined()
  })
})
