import { setDoc } from 'firebase/firestore'
import { communeFromNominatim, type Commune } from '../lib/commune'
import { send, userDoc } from './paths'

/**
 * Le contour de la commune qui contient ce point, demandé une seule fois à Nominatim (OpenStreetMap) puis gardé
 * dans users/{uid}/communes/{id}. Seul le point (une balade, le centre de la carte) part ; hors ligne : rien.
 */
export async function fetchCommune(lat: number, lng: number): Promise<(Commune & { id: string }) | undefined> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&polygon_geojson=1&polygon_threshold=0.0003&accept-language=fr&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return undefined
    const commune = communeFromNominatim(await response.json())
    if (commune) {
      const { id, ...data } = commune
      send(setDoc(userDoc('communes', id), data))
    }
    return commune
  } catch {
    return undefined
  }
}
