import { describe, expect, it } from 'vitest'
import { healthTile, memoriesTile, progressTile, walksTile } from './dashboard'

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
