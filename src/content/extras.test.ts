import { describe, expect, it } from 'vitest'
import { CHEWS, chewsFor } from './extras'

describe('idées à mâcher et allergies', () => {
  it('sans allergie : toutes les idées', () => {
    expect(chewsFor(undefined)).toHaveLength(CHEWS.length)
    expect(chewsFor('  ')).toHaveLength(CHEWS.length)
  })

  it('retire les idées qui contiennent ce qui est cité, sans tenir compte des accents ni des majuscules', () => {
    const ids = (text: string) => chewsFor(text).map((i) => i.id)
    expect(ids('Intolérant au lactose')).toEqual(['carotte', 'concombre', 'haricots'])
    expect(ids('CAROTTES')).not.toContain('carotte')
    expect(ids('Yaourt et haricots verts')).toEqual(['carotte', 'concombre'])
    expect(ids('poulet')).toHaveLength(CHEWS.length)
  })

  it('chaque idée à mâcher dit ce qu’elle contient', () => {
    expect(CHEWS.every((i) => (i.ingredients ?? []).length > 0)).toBe(true)
  })
})
