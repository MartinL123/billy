import { describe, expect, it } from 'vitest'
import { encodeUnderLimit, fitWithin, formatBytes, isHeic, MAX_IMAGE_BYTES } from './image'

describe('fitWithin', () => {
  it('réduit le grand côté à la taille max en gardant les proportions', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(4000, 2000, 400)).toEqual({ width: 400, height: 200 })
  })

  it('n’agrandit jamais', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('encodeUnderLimit', () => {
  const fake = (bytesAt: (quality: number, scale: number) => number) => {
    const calls: [number, number][] = []
    const encode = async (quality: number, scale: number) => {
      calls.push([quality, scale])
      return new Blob([new Uint8Array(bytesAt(quality, scale))])
    }
    return { calls, encode }
  }

  it('garde la qualité de départ si le poids convient', async () => {
    const { calls, encode } = fake(() => 500_000)
    const blob = await encodeUnderLimit(encode, 0.75)
    expect(blob.size).toBe(500_000)
    expect(calls).toEqual([[0.75, 1]])
  })

  it('baisse la qualité jusqu’à passer sous 900 Ko', async () => {
    const { calls, encode } = fake((q) => q * 2_000_000)
    const blob = await encodeUnderLimit(encode, 0.75)
    expect(blob.size).toBeLessThanOrEqual(MAX_IMAGE_BYTES)
    expect(calls.map(([q]) => q)).toEqual([0.75, 0.65, 0.55, 0.45])
  })

  it('réduit ensuite les dimensions si la qualité ne suffit pas', async () => {
    const { calls, encode } = fake((_q, scale) => 3_000_000 * scale * scale)
    const blob = await encodeUnderLimit(encode, 0.8)
    expect(blob.size).toBeLessThanOrEqual(MAX_IMAGE_BYTES)
    expect(calls[calls.length - 1]![1]).toBeLessThan(1)
  })

  it('abandonne proprement si rien n’y fait', async () => {
    const { encode } = fake(() => 5_000_000)
    await expect(encodeUnderLimit(encode, 0.75)).rejects.toThrow()
  })
})

describe('utilitaires', () => {
  it('reconnaît le HEIC', () => {
    expect(isHeic({ type: 'image/heic' })).toBe(true)
    expect(isHeic({ type: '', name: 'IMG_0001.HEIC' })).toBe(true)
    expect(isHeic({ type: 'image/jpeg', name: 'a.jpg' })).toBe(false)
  })

  it('formate les tailles en français', () => {
    expect(formatBytes(2.4 * 1024 * 1024)).toBe('2,4 Mo')
    expect(formatBytes(350 * 1024)).toBe('350 Ko')
  })
})
