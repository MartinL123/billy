import { describe, expect, it } from 'vitest'
import { dogName, ofDog, realDogName, UNNAMED_DOG } from './dogName'
import { ofName } from './gender'

describe('le nom du chien dans une phrase (R-089)', () => {
  const billy = { name: 'Billy' }
  const oscar = { name: 'Oscar' }
  const sansNom = { name: UNNAMED_DOG, unnamed: true }

  it('début ou milieu de phrase', () => {
    expect(dogName(billy, 'debut')).toBe('Billy')
    expect(dogName(billy)).toBe('Billy')
    expect(dogName(sansNom, 'debut')).toBe('Votre chien')
    expect(dogName(sansNom)).toBe('votre chien')
    expect(`Balade avec ${dogName(sansNom)}`).toBe('Balade avec votre chien')
  })

  it('« de Billy », « d’Oscar », « de votre chien »', () => {
    expect(ofDog(billy)).toBe('de Billy')
    expect(ofDog(oscar)).toBe('d’Oscar')
    expect(ofDog(sansNom)).toBe('de votre chien')
    // Les textes qui ne reçoivent que le nom affiché : « la carte de votre chien », jamais « de Votre chien ».
    expect(ofName(UNNAMED_DOG)).toBe('de votre chien')
  })

  it('le vrai nom, ou rien', () => {
    expect(realDogName(billy)).toBe('Billy')
    expect(realDogName(sansNom)).toBe('')
  })
})
