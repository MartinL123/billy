import type { PhotoClue } from './balade'

/**
 * Lit l’EXIF d’une photo de la photothèque (position GPS, heure de prise de vue) AVANT sa compression,
 * qui efface ces informations. Rien n’est envoyé nulle part ; sans EXIF, la photo n’est simplement pas placée.
 */
export async function readPhotoClue(file: Blob): Promise<PhotoClue> {
  try {
    const { default: exifr } = await import('exifr')
    const tags = await exifr.parse(file, { tiff: true, exif: true, gps: true })
    if (!tags) return {}
    const date = tags.DateTimeOriginal ?? tags.CreateDate
    const time = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : undefined
    const hasGps = typeof tags.latitude === 'number' && typeof tags.longitude === 'number' && !(tags.latitude === 0 && tags.longitude === 0)
    return { ...(hasGps ? { lat: tags.latitude, lng: tags.longitude } : {}), ...(time !== undefined ? { time } : {}) }
  } catch {
    return {}
  }
}
