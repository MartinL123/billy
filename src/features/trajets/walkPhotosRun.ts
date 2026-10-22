import { addWalkPhotos } from '../../firebase/db'
import { saveImage } from '../../firebase/files'
import type { EntryPhoto } from '../../firebase/types'
import { compressImage, PHOTO } from '../../lib/image'
import type { Route } from '../../lib/route'
import { photosInWindow, placeOnWalk, walkWindow } from '../../lib/walkPhotos'
import { readWalkPhotos } from '../../native/flair'

/** Le JPEG en base64 que donne l’iPhone, en Blob. */
function jpegBlob(base64: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'image/jpeg' })
}

/**
 * T-103 : cherche dans la photothèque les photos prises pendant la balade, les compresse comme une photo importée
 * (1280 px JPEG 0,75 et miniature 400 px, chaque fichier < 900 Ko), les pose sur le tracé et les ajoute au souvenir.
 * Une seule fois par balade (`photosSearchedAt`). Une photo illisible ou un stockage plein : elle est passée.
 */
export async function addPhotosOfWalk(entry: { id: string; photos: EntryPhoto[] }, route: Route): Promise<EntryPhoto[]> {
  const window = walkWindow(route)
  const found = window ? photosInWindow(await readWalkPhotos(window.start, window.end), window, entry.photos) : []
  const photos: EntryPhoto[] = []
  for (const photo of found) {
    try {
      const { full, thumb } = await compressImage(jpegBlob(photo.data), PHOTO)
      const at = placeOnWalk(photo, route)
      photos.push({ fileId: await saveImage(full), thumbFileId: await saveImage(thumb), ...(at ? { lat: at.lat, lng: at.lng } : {}), ...(photo.time ? { time: photo.time } : {}), auto: true })
    } catch {
      // Illisible, trop lourde ou stockage plein : la suivante.
    }
  }
  addWalkPhotos(entry.id, photos)
  return photos
}
