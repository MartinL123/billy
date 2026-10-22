import { cachedParks, parksQuery, parksZone, parseParks, storeParks, type ParkArea, type ParksCache } from '../../lib/parkDwell'

// T-101 : les parcs à moins de 2 km du départ d’une balade, une requête Overpass (OpenStreetMap, gratuite, sans clé)
// gardée 7 jours sur l’appareil (5 zones au plus). Rien de vital : sans réponse, aucun exercice proposé, sans message.

const KEY = 'flair-parcs'

function readCache(): ParksCache {
  try {
    const cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    return cache && typeof cache === 'object' ? (cache as ParksCache) : {}
  } catch {
    return {}
  }
}

export async function loadParks(lat: number, lng: number): Promise<ParkArea[]> {
  const zone = parksZone(lat, lng)
  const known = cachedParks(readCache(), zone, Date.now())
  if (known) return known
  if (!navigator.onLine) return []
  try {
    // En GET (le POST est refusé depuis un navigateur) ; une seule requête par balade, abandonnée après 30 s.
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(parksQuery(lat, lng))}`, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) return []
    const parks = parseParks(await response.json())
    try {
      localStorage.setItem(KEY, JSON.stringify(storeParks(readCache(), zone, parks, Date.now())))
    } catch {
      // Stockage plein ou bloqué : on redemandera à la prochaine balade.
    }
    return parks
  } catch {
    return []
  }
}
