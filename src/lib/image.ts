/** Taille maximale d'une image dans un document Firestore. */
export const MAX_IMAGE_BYTES = 900 * 1024

export interface ImagePreset {
  maxSide: number
  quality: number
}

export const PHOTO: ImagePreset = { maxSide: 1600, quality: 0.75 }
export const DOCUMENT_PAGE: ImagePreset = { maxSide: 2000, quality: 0.8 }
export const THUMBNAIL: ImagePreset = { maxSide: 400, quality: 0.7 }

export class UnreadableImageError extends Error {
  constructor(public readonly heic: boolean) {
    super(
      heic
        ? "Cette photo est au format HEIC et n'a pas pu être lue. Dans Réglages › Appareil photo › Formats, choisis « Le plus compatible », ou exporte-la en JPEG."
        : "Cette image n'a pas pu être lue. Essaie avec une photo JPEG ou PNG.",
    )
  }
}

export function isHeic(file: { type: string; name?: string }): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name ?? '')
}

/** Dimensions réduites pour tenir dans `maxSide`, sans jamais agrandir. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Encode en baissant la qualité tant que le résultat dépasse `maxBytes`.
 * `encode` reçoit la qualité (0–1) et un facteur d'échelle (1 = taille prévue).
 */
export async function encodeUnderLimit(
  encode: (quality: number, scale: number) => Promise<Blob>,
  startQuality: number,
  maxBytes: number = MAX_IMAGE_BYTES,
): Promise<Blob> {
  let quality = startQuality
  let scale = 1
  for (let attempt = 0; attempt < 12; attempt++) {
    const blob = await encode(quality, scale)
    if (blob.size <= maxBytes) return blob
    if (quality > 0.4) quality = Math.round((quality - 0.1) * 100) / 100
    else scale *= 0.8
  }
  throw new Error("Impossible de réduire assez cette image.")
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

type Drawable = HTMLImageElement | HTMLCanvasElement

function drawToBlob(source: Drawable, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas indisponible'))
  // Fond blanc : le JPEG n'a pas de transparence.
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage impossible'))), 'image/jpeg', quality),
  )
}

function sizeOf(source: Drawable) {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height }
}

export function compressDrawable(source: Drawable, preset: ImagePreset): Promise<Blob> {
  const natural = sizeOf(source)
  const target = fitWithin(natural.width, natural.height, preset.maxSide)
  return encodeUnderLimit(
    (quality, scale) =>
      drawToBlob(source, Math.max(1, Math.round(target.width * scale)), Math.max(1, Math.round(target.height * scale)), quality),
    preset.quality,
  )
}

export interface CompressedImage {
  full: Blob
  thumb: Blob
}

/** Compresse une image importée et fabrique sa miniature. */
export async function compressImage(file: File | Blob, preset: ImagePreset): Promise<CompressedImage> {
  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    throw new UnreadableImageError(isHeic({ type: file.type, name: file instanceof File ? file.name : '' }))
  }
  const [full, thumb] = await Promise.all([compressDrawable(img, preset), compressDrawable(img, THUMBNAIL)])
  return { full, thumb }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}
