import { useEffect, useMemo, useState } from 'react'
import { watchCalm, watchSpots, type CalmVote, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { calmSummary } from '../../lib/community'
import { ageAt } from '../../lib/age'
import { knownFog } from '../../lib/fog'
import { overpassQuery, parseOverpass, rankIdeas, type Idea, type Place } from '../../lib/ideas'
import { useGrantedPosition } from '../../lib/useGrantedPosition'
import { useToday } from '../../lib/useToday'
import { walkItems } from '../../lib/walkList'

const WEEK_MS = 7 * 24 * 3600 * 1000
type Found = { places: Place[]; roads: { lat: number; lng: number }[][] }

// Une requête en cours est partagée : si l’écran se redessine pendant les 30 s d’attente, on ne la relance pas.
const inFlight = new Map<string, Promise<Found | undefined>>()

/** Lieux OpenStreetMap autour d’un point : gardés 7 jours sur l’appareil (confort, rien de vital). */
function nearbyPlaces(lat: number, lng: number, roads: boolean): Promise<Found | undefined> {
  const key = `${lat.toFixed(2)}_${lng.toFixed(2)}${roads ? '-routes' : ''}`
  const running = inFlight.get(key) ?? askOverpass(lat, lng, roads).finally(() => inFlight.delete(key))
  inFlight.set(key, running)
  return running
}

async function askOverpass(lat: number, lng: number, roads: boolean): Promise<Found | undefined> {
  const key = `billy-lieux-${lat.toFixed(2)}_${lng.toFixed(2)}${roads ? '-routes' : ''}`
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; found: Found } | null
    if (cached && Date.now() - cached.at < WEEK_MS) return cached.found
  } catch {
    // Pas de cache : on demande.
  }
  if (!navigator.onLine) return undefined
  try {
    // En GET (le POST est refusé depuis un navigateur) ; le serveur public peut mettre 20 à 40 s quand il est chargé.
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery(lat, lng, { roads }))}`, { signal: AbortSignal.timeout(75000) })
    if (!response.ok) return undefined
    const found = parseOverpass(await response.json())
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), found }))
    } catch {
      // Stockage plein : tant pis, on redemandera.
    }
    return found
  } catch {
    return undefined
  }
}

/**
 * Les idées « À découvrir » autour de la position (si elle est autorisée) ou de la dernière balade, choisies pour
 * le chien. Si OpenStreetMap ne répond pas : les spots calmes de la meute, sans message d’erreur.
 */
export function useIdeas(asked?: { lat: number; lng: number }): { ideas: Idea[]; here?: { lat: number; lng: number }; loading: boolean } {
  const { dog, entries, fog } = useData()
  const today = useToday()
  const position = useGrantedPosition()
  const walks = useMemo(() => walkItems(entries), [entries])
  const last = walks[0]
  // Où l’on est (T-020) : la position demandée, sinon celle déjà autorisée, sinon le départ de la dernière balade.
  const here = asked ?? position ?? (last ? { lat: last.route.points[0]![0], lng: last.route.points[0]![1] } : undefined)
  const [found, setFound] = useState<Found | null>(null)
  const [loading, setLoading] = useState(false)
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [calm, setCalm] = useState<Record<string, CalmVote[]>>({})

  useEffect(() => watchSpots(setSpots), [])
  const spotIds = spots.map((s) => s.id).join(',')
  useEffect(() => {
    const stops = (spotIds ? spotIds.split(',') : []).map((id) => watchCalm(id, (votes) => setCalm((c) => ({ ...c, [id]: votes }))))
    return () => stops.forEach((stop) => stop())
  }, [spotIds])

  const traits = dog.traits ?? []
  const sensitive = traits.includes('craintif') || traits.includes('reactif-chiens')
  const lat = here ? Number(here.lat.toFixed(3)) : undefined
  const lng = here ? Number(here.lng.toFixed(3)) : undefined
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    let live = true
    setLoading(true)
    nearbyPlaces(lat, lng, sensitive).then((result) => {
      if (!live) return
      setFound(result ?? { places: [], roads: [] })
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [lat, lng, sensitive])

  const ideas = useMemo(() => {
    if (!here) return []
    // Les spots de la meute jugés calmes s’ajoutent aux lieux d’OpenStreetMap.
    const calmSpots: Place[] = spots.filter((s) => s.category !== 'eviter' && calmSummary(calm[s.id] ?? [])?.headline.startsWith('Plutôt calme')).map((s) => ({ id: `spot/${s.id}`, name: s.name, kind: 'spot', lat: s.lat, lng: s.lng }))
    const age = dog.birthDate ? ageAt(dog.birthDate, today) : undefined
    const months = age ? age.years * 12 + age.months : undefined
    const profile = { sensitive, sporty: traits.includes('energique'), short: traits.includes('senior') || (months !== undefined && months < 6) }
    const lastWalk = last ? { date: last.date, points: last.route.points.map(([a, b]) => ({ lat: a, lng: b })) } : undefined
    return rankIdeas([...(found?.places ?? []), ...calmSpots], { here, cells: knownFog(fog), roads: found?.roads ?? [], profile, ...(lastWalk ? { lastWalk } : {}) }, 12)
  }, [here, found, spots, calm, dog, today, last, fog, sensitive])

  return { ideas, ...(here ? { here } : {}), loading }
}
