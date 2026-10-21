import { describe, expect, it } from 'vitest'
import { inviteLink, isWriteRoute } from './visitor'

describe('mode visiteur (T-048)', () => {
  it('les écrans d’ajout et de modification sont fermés au visiteur', () => {
    for (const path of ['/noter', '/evenement/nouveau', '/evenement/abc', '/souvenir/abc/modifier', '/importer', '/balade-en-cours', '/exercice', '/mission', '/boutique', '/profil/modifier', '/document/nouveau', '/sante/documents', '/meute', '/questionnaire']) {
      expect(isWriteRoute(path), path).toBe(true)
    }
  })

  it('tout le reste se regarde', () => {
    for (const path of ['/', '/sante', '/territoire', '/balades', '/billy', '/souvenir/abc', '/sante/poids', '/sante/evenements', '/profil', '/competence/rappel']) {
      expect(isWriteRoute(path), path).toBe(false)
    }
  })

  it('le lien d’invitation', () => {
    expect(inviteLink('abcdefghjkmn', { origin: 'https://martinl123.github.io', pathname: '/billy/' })).toBe('https://martinl123.github.io/billy/#/invitation/abcdefghjkmn')
  })
})
