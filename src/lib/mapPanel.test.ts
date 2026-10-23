import { describe, expect, it } from 'vitest'
import { journalOnMap, outingOnMap, panelMode, tellHref, walkOnMap } from './mapPanel'

describe('Une seule carte (R-094)', () => {
  it('le mode du panneau se lit dans l’adresse', () => {
    expect(panelMode(new URLSearchParams(''))).toEqual({ kind: 'journal' })
    expect(panelMode(new URLSearchParams('filtre=mois&cran=full'))).toEqual({ kind: 'journal' })
    expect(panelMode(new URLSearchParams('balade=abc'))).toEqual({ kind: 'sheet', id: 'abc' })
    expect(panelMode(new URLSearchParams('balade=abc&revoir=1'))).toEqual({ kind: 'replay', id: 'abc' })
    // R-095 : une sortie notée sans trajet.
    expect(panelMode(new URLSearchParams(outingOnMap('2026-10-23:matin').split('?')[1]))).toEqual({ kind: 'outing', id: '2026-10-23:matin' })
    expect(outingOnMap('2026-10-23:matin', { filter: 'mois' })).toBe('/territoire?sortie=2026-10-23%3Amatin&filtre=mois')
  })

  it('l’adresse d’une balade sur la carte : résumé (cran réduit), fiche, relecture ; le filtre est gardé', () => {
    expect(walkOnMap('abc')).toBe('/territoire?balade=abc')
    expect(walkOnMap('abc', { snap: 'half' })).toBe('/territoire?balade=abc')
    expect(walkOnMap('abc', { snap: 'collapsed', filter: 'mois' })).toBe('/territoire?balade=abc&cran=collapsed&filtre=mois')
    expect(walkOnMap('a b', { replay: true, snap: 'collapsed' })).toBe('/territoire?balade=a+b&revoir=1')
    expect(walkOnMap('abc', { filter: 'toutes' })).toBe('/territoire?balade=abc')
    expect(panelMode(new URLSearchParams(walkOnMap('a b').split('?')[1]))).toEqual({ kind: 'sheet', id: 'a b' })
    expect(journalOnMap()).toBe('/territoire')
    expect(journalOnMap('toutes')).toBe('/territoire')
    expect(journalOnMap('mois')).toBe('/territoire?filtre=mois')
  })

  it('« Raconter » : ce qui attend, sinon tous les arrêts, sinon la modification', () => {
    const stop = { at: 60, durS: 90, lat: 48.85, lng: 2.35 }
    expect(tellHref('x', { stops: [stop], moments: [] })).toBe('/souvenir/x/raconter')
    expect(tellHref('x', { stops: [{ ...stop, momentIndex: 0 }], moments: [{ lat: 48.85, lng: 2.35, type: 'jeu' }] })).toBe('/souvenir/x/raconter?arret=1')
    expect(tellHref('x', { moments: [] })).toBe('/souvenir/x/modifier')
  })
})
