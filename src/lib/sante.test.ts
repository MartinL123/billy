import { describe, expect, it } from 'vitest'
import { CARE_FILTERS, eventCategory, filterSummary, matchesFilter } from './events'

describe('santé : filtrer par catégorie', () => {
  it('range chaque événement dans sa catégorie ; anniversaires et âges sont des étapes', () => {
    expect(eventCategory({ type: 'vermifuge', title: 'Vermifuge' })).toBe('soins')
    expect(eventCategory({ type: 'antiparasitaire', title: 'Antiparasitaire puces et tiques' })).toBe('soins')
    expect(eventCategory({ type: 'vaccin', title: 'Rappel vaccin CHPPiL' })).toBe('vaccins')
    expect(eventCategory({ type: 'veto', title: 'RDV vétérinaire' })).toBe('veto')
    expect(eventCategory({ type: 'educateur', title: 'Séance' })).toBe('educateur')
    expect(eventCategory({ type: 'etape', title: 'Billy a 6 mois' })).toBe('etapes')
    expect(eventCategory({ type: 'autre', title: 'Anniversaire d’adoption' })).toBe('etapes')
    expect(eventCategory({ type: 'sejour', title: 'Bretagne' })).toBeUndefined()
  })

  it('« Tout » garde tout, une catégorie ne garde que les siens', () => {
    const stay = { type: 'sejour', title: 'Bretagne' }
    expect(matchesFilter(stay, 'tout')).toBe(true)
    expect(matchesFilter(stay, 'soins')).toBe(false)
    expect(matchesFilter({ type: 'vermifuge', title: 'Vermifuge' }, 'soins')).toBe(true)
  })

  it('résume le filtre en une phrase', () => {
    expect(filterSummary('soins', 2)).toBe('2 soins à venir')
    expect(filterSummary('vaccins', 1)).toBe('1 vaccin à venir')
    expect(CARE_FILTERS.map((f) => f.label)).toEqual(['Tout', 'Soins', 'Vaccins', 'Véto', 'Éducateur', 'Étapes'])
  })
})

import { healthLine } from './events'

describe('Santé : la phrase d’état', () => {
  const e = (date: string, done = false) => ({ date, done })
  it('à jour, une chose à prévoir', () => {
    expect(healthLine([e('2026-10-25'), e('2027-09-01'), e('2026-09-01', true)], '2026-10-17')).toBe('Tout est à jour. Une seule chose à prévoir.')
  })
  it('en retard', () => {
    expect(healthLine([e('2026-10-10'), e('2026-10-20'), e('2026-10-21')], '2026-10-17')).toBe('Une chose en retard. 2 choses à prévoir ce mois-ci.')
    expect(healthLine([], '2026-10-17')).toBe('Tout est à jour. Rien à prévoir ce mois-ci.')
  })
})
