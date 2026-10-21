import { describe, expect, it } from 'vitest'
import { endDecision, entriesToVerify } from './walkFinish'

const points = [
  { lat: 48.8566, lng: 2.3522, time: '2026-10-19T11:14:00.538Z' },
  { lat: 48.857, lng: 2.353, time: '2026-10-19T11:20:00.000Z' },
]

describe('fin de balade : que vérifier avant d’effacer la copie de l’iPhone (T-059)', () => {
  it('ce que l’import vient d’écrire', () => {
    expect(entriesToVerify(['e1'], points, [])).toEqual(['e1'])
  })

  it('« Réessayer » : l’import ne renvoie rien, on vérifie la balade déjà connue par sa clé', () => {
    const entries = [
      { id: 'autre', importKey: '2026-10-18T08:00:00Z_48.0000_2.0000' },
      { id: 'e1', importKey: '2026-10-19T11:14:00.538Z_48.8566_2.3522' },
    ]
    expect(entriesToVerify([], points, entries)).toEqual(['e1'])
  })

  it('rien d’écrit et rien de connu : rien à vérifier, donc on n’efface pas', () => {
    expect(entriesToVerify([], points, [{ id: 'autre', importKey: 'x' }])).toBeUndefined()
    expect(entriesToVerify([], [], [])).toBeUndefined()
  })
})

describe('balade arrêtée : garder, effacer ou demander (T-060)', () => {
  it('assez de chemin : on garde', () => expect(endDecision(false, 30 * 60_000)).toBe('garder'))
  it('moins de 2 min : un départ par erreur, effacé', () => expect(endDecision(true, 90_000)).toBe('effacer'))
  it('30 min mais presque aucun point GPS : on demande, jamais d’effacement silencieux', () => expect(endDecision(true, 30 * 60_000)).toBe('demander'))
})
