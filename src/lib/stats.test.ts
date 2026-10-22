import { describe, expect, it } from 'vitest'
import { statParts } from './stats'

describe('statParts', () => {
  it('sépare l’unité finale', () => {
    expect(statParts('2,1 km')).toEqual({ value: '2,1', unit: 'km' })
    expect(statParts('32 min')).toEqual({ value: '32', unit: 'min' })
    expect(statParts('4 %')).toEqual({ value: '4', unit: '%' })
    expect(statParts('≈ 650 m')).toEqual({ value: '≈ 650', unit: 'm' })
  })
  it('garde entier ce qui n’a pas d’unité finale', () => {
    expect(statParts('1 h 05')).toEqual({ value: '1 h 05' })
    expect(statParts('3')).toEqual({ value: '3' })
    expect(statParts('Hier')).toEqual({ value: 'Hier' })
  })
})
