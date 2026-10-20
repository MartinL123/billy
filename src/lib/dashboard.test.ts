import { describe, expect, it } from 'vitest'
import { healthTile, memoriesLine, memoriesTile, progressLine, progressTile, walksLine, walksTile } from './dashboard'

const TODAY = '2026-10-18'

describe('accueil en tableau de bord (T-031)', () => {
  it('ses progrès : compétences en cours et pattes de la plus avancée', () => {
    expect(progressTile(['rappel', 'calme', 'soins'], { rappel: 2, calme: 1 })).toEqual({ text: '3 choses en cours', detail: '', paws: 2 })
    expect(progressTile(['rappel'], {})).toEqual({ text: 'Une chose en cours', detail: 'On commence', paws: 0 })
    expect(progressTile([], {}).text).toBe('Choisir quoi travailler')
  })
  it('ses balades : nombre, km, part découverte', () => {
    expect(walksTile([{ distanceM: 1500 }, { distanceM: 2300 }], '2 % de Saint-Briac découvert')).toEqual({ text: '2 balades · 3,8 km', detail: '2 % de Saint-Briac découvert', km: 3.8 })
    expect(walksTile([]).text).toBe('Pas encore de balade')
  })
  it('sa santé : à jour ou en retard, puis le prochain soin', () => {
    const events = [
      { title: 'Antiparasitaire', type: 'antiparasitaire', date: '2026-10-25', done: false },
      { title: 'Rappel de vaccin', type: 'vaccin', date: '2027-03-01', done: false },
      { title: 'Séjour', type: 'sejour', date: '2026-10-01', done: false },
    ]
    expect(healthTile(events, TODAY)).toEqual({ text: 'Tout est à jour', detail: 'Antiparasitaire le 25 oct.', late: false })
    const late = healthTile([...events, { title: 'Vermifuge', type: 'vermifuge', date: '2026-10-10', done: false }], TODAY)
    expect(late).toEqual({ text: 'Vermifuge en retard', detail: 'Antiparasitaire le 25 oct.', late: true })
    expect(healthTile([], TODAY).detail).toBe('Rien de prévu')
  })
  it('ses souvenirs : nombre et date du dernier, sans les jours de repos', () => {
    const tile = memoriesTile([{ id: 'a', date: '2026-10-14' }, { id: 'b', date: '2026-10-02' }, { id: 'repos-2026-10-17', date: '2026-10-17' }], TODAY)
    expect(tile).toEqual({ text: '2 souvenirs', detail: 'Le dernier : 14 oct.', count: 2 })
    expect(memoriesTile([], TODAY).text).toBe('Pas encore de souvenir')
  })
})

describe('« Sa vie avec vous » en 4 lignes (V5, T-050)', () => {
  const nb = (t: string) => t.replace(/\u00a0/g, ' ')
  it('progrès, balades, souvenirs', () => {
    expect(progressLine(['rappel', 'calme', 'soins'])).toBe('3 compétences en route')
    expect(progressLine(['rappel'])).toBe('Une compétence en route')
    expect(nb(walksLine([{ distanceM: 2600 }, { distanceM: 2100 }], '4 % de Saint-Ouen découvert'))).toBe('4,7 km ensemble · 4 % de Saint-Ouen découvert')
    expect(walksLine([])).toBe('Pas encore de balade')
    expect(nb(memoriesLine([{ id: 'a', date: '2026-10-19' }, { id: 'repos-2026-10-20', date: '2026-10-20' }]))).toBe('Le dernier : 19 octobre 2026')
  })
})
