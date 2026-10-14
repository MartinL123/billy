import { describe, expect, it } from 'vitest'
import { MAX_PDF_SIZE } from './chunks'
import { PHOTO } from './image'
import { fits, USER_QUOTA, usageLabel, usageLevel } from './usage'

const MB = 1024 * 1024

describe('espace par compte', () => {
  it('80 Mo par compte, message doux à 90 %, plein à 100 %', () => {
    expect(USER_QUOTA).toBe(80 * MB)
    expect(usageLevel(34 * MB)).toBe('ok')
    expect(usageLevel(72 * MB)).toBe('presque')
    expect(usageLevel(80 * MB)).toBe('plein')
  })

  it('refuse un ajout qui dépasserait l’espace', () => {
    expect(fits(79 * MB, 500 * 1024)).toBe(true)
    expect(fits(79.8 * MB, 500 * 1024)).toBe(false)
  })

  it('affiche l’espace en Mo', () => {
    expect(usageLabel(34 * MB)).toBe('Espace utilisé : 34 Mo sur 80 Mo')
    expect(usageLabel(0)).toBe('Espace utilisé : 0 Mo sur 80 Mo')
  })

  it('PDF limités à 5 Mo, photos à 1280 px', () => {
    expect(MAX_PDF_SIZE).toBe(5 * MB)
    expect(PHOTO).toEqual({ maxSide: 1280, quality: 0.75 })
  })
})

import { showInstallBanner } from './install'

describe('bandeau d’installation', () => {
  const day = 24 * 60 * 60 * 1000
  it('jamais depuis l’icône ; dans le navigateur, revient au plus tous les 7 jours', () => {
    expect(showInstallBanner(true, null, 0)).toBe(false)
    expect(showInstallBanner(false, null, 0)).toBe(true)
    expect(showInstallBanner(false, 0, 6 * day)).toBe(false)
    expect(showInstallBanner(false, 0, 7 * day)).toBe(true)
  })
})
