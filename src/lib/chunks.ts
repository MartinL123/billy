/** Taille d’un morceau de PDF dans Firestore (limite d’un document : 1 Mio). */
export const CHUNK_SIZE = 750 * 1024
/** Taille maximale d’un PDF importé. */
export const MAX_PDF_SIZE = 5 * 1024 * 1024

export function splitBytes(bytes: Uint8Array, size: number = CHUNK_SIZE): Uint8Array[] {
  if (size <= 0) throw new Error('Taille de morceau invalide')
  const parts: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += size) {
    parts.push(bytes.subarray(offset, Math.min(offset + size, bytes.length)))
  }
  return parts
}

export function joinBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
