import { describe, expect, it } from 'vitest'
import { missionSteps } from './missionSteps'

describe('mission pas à pas', () => {
  it('une étape par geste, puis le minuteur', () => {
    const steps = missionSteps(['La laisse se tend : vous vous arrêtez, immobile comme un arbre.', 'Elle se détend : vous repartez.', 'Récompensez à hauteur de votre jambe.'], 5)
    expect(steps).toHaveLength(4)
    expect(steps[0]).toEqual({ title: 'La laisse se tend', help: 'Vous vous arrêtez, immobile comme un arbre.' })
    expect(steps[2]).toEqual({ title: 'Récompensez à hauteur de votre jambe' })
    expect(steps[3]).toMatchObject({ title: 'À vous : 5 minutes', seconds: 300 })
  })
})
