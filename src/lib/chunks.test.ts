import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, joinBytes, splitBytes } from './chunks'

function sample(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) bytes[i] = (i * 31 + 7) % 256
  return bytes
}

// Comparaison octet par octet : `toEqual` est trop lent sur plusieurs Mo.
function same(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

describe('découpage des PDF', () => {
  it('découpe en morceaux de 750 Ko, le dernier plus court', () => {
    const parts = splitBytes(sample(CHUNK_SIZE * 2 + 123))
    expect(parts.map((p) => p.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 123])
  })

  it('ne crée pas de morceau vide sur une taille exacte', () => {
    expect(splitBytes(sample(CHUNK_SIZE * 3)).length).toBe(3)
    expect(splitBytes(new Uint8Array(0))).toEqual([])
  })

  it('garde un petit fichier en un seul morceau', () => {
    expect(splitBytes(sample(10)).length).toBe(1)
  })

  it('recolle à l’identique', () => {
    const original = sample(CHUNK_SIZE * 3 + 4567)
    expect(same(joinBytes(splitBytes(original)), original)).toBe(true)
    expect(same(joinBytes(splitBytes(sample(1000), 7)), sample(1000))).toBe(true)
  })

  it('tient un PDF de 8 Mo en 11 morceaux sous la limite Firestore', () => {
    const parts = splitBytes(new Uint8Array(8 * 1024 * 1024))
    expect(parts.length).toBe(11)
    expect(Math.max(...parts.map((p) => p.length))).toBeLessThan(1_000_000)
  })
})
