import type { ISODate } from './dates'

// La meute (docs/specs/communaute.md) : tous les comptes de l'app. On compare l'effort, jamais le chien ;
// jamais d'heure, jamais de position en direct, seulement des spots publics.

export type SpotCategory = 'balade' | 'parc' | 'eau' | 'cafe' | 'jeux' | 'eviter'

export const SPOT_CATEGORIES: { id: SpotCategory; label: string; filter: string; color: string }[] = [
  { id: 'balade', label: 'Balade', filter: 'Balades', color: '#1E5A50' },
  { id: 'parc', label: 'Parc', filter: 'Parcs', color: '#3E8E41' },
  { id: 'eau', label: 'Point d’eau', filter: 'Eau', color: '#2559A8' },
  { id: 'cafe', label: 'Café / resto', filter: 'Cafés & restos', color: '#8A3E0C' },
  { id: 'jeux', label: 'Jeux', filter: 'Jeux', color: '#7B4FC9' },
  { id: 'eviter', label: 'Zone à éviter', filter: 'À éviter', color: '#C4423A' },
]
export const categoryInfo = (id: string) => SPOT_CATEGORIES.find((c) => c.id === id) ?? SPOT_CATEGORIES[0]!

export const SPOT_INFOS = ['Point d’eau', 'Laisse obligatoire', 'Ombre', 'Fermé la nuit']

export type CalmLevel = 'calme' | 'moyen' | 'anime'
/** « tot » : le matin avant 9 h (créneau ajouté après coup ; les anciens avis « matin » restent valables). */
export type CalmSlot = 'tot' | 'matin' | 'midi' | 'soir'
export const CALM_LEVELS: { id: CalmLevel; label: string }[] = [
  { id: 'calme', label: 'Calme' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'anime', label: 'Animé' },
]
const SLOT_WORDS: Record<Exclude<CalmSlot, 'tot'>, string> = { matin: 'le matin', midi: 'en journée', soir: 'le soir' }
const LEVEL_WORDS: Record<CalmLevel, string> = { calme: 'Plutôt calme', moyen: 'Moyennement fréquenté', anime: 'Plutôt animé' }

/** Le créneau d'un avis, d'après l'heure locale (l'heure elle-même n'est jamais enregistrée). */
export const slotOf = (hour: number): CalmSlot => (hour < 9 ? 'tot' : hour < 11 ? 'matin' : hour < 17 ? 'midi' : 'soir')

/** « Plutôt calme le matin » : l'avis le plus fréquent, et le créneau le plus cité pour cet avis. */
export function calmSummary(votes: { level: CalmLevel; slot: CalmSlot }[]): { headline: string; detail: string } | undefined {
  if (votes.length === 0) return undefined
  const count = <T extends string>(items: T[]) => items.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {})
  const top = <T extends string>(counts: Record<string, number>, order: T[]) => order.reduce((best, x) => ((counts[x] ?? 0) > (counts[best] ?? 0) ? x : best), order[0]!)
  const level = top(count(votes.map((v) => v.level)), ['calme', 'moyen', 'anime'] as CalmLevel[])
  const same = votes.filter((v) => v.level === level)
  // « avant 9 h » compte comme le matin ; on le précise quand la plupart des avis du matin sont d'avant 9 h.
  const slot = top(count(same.map((v) => (v.slot === 'tot' ? 'matin' : v.slot))), ['matin', 'midi', 'soir'] as const)
  const morning = same.filter((v) => v.slot === 'tot' || v.slot === 'matin')
  const early = slot === 'matin' && morning.filter((v) => v.slot === 'tot').length * 2 > morning.length
  return { headline: `${LEVEL_WORDS[level]} ${SLOT_WORDS[slot]}${early ? ' avant 9 h' : ''}`, detail: `avis de ${votes.length} membre${votes.length > 1 ? 's' : ''}` }
}

/** Distance en mètres entre deux points (formule de haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Marquer ne propose que les spots à moins de 300 m : jamais un point GPS libre. */
export const MARK_RADIUS = 300
export function nearbySpots<T extends { lat: number; lng: number }>(spots: T[], here: { lat: number; lng: number }): (T & { meters: number })[] {
  return spots
    .map((s) => ({ ...s, meters: distanceMeters(here, s) }))
    .filter((s) => s.meters <= MARK_RADIUS)
    .sort((a, b) => a.meters - b.meters)
}

/** « à 80 m », « à 1,2 km » */
export const formatDistance = (m: number) => (m < 1000 ? `à ${Math.round(m / 10) * 10} m` : `à ${(m / 1000).toFixed(1).replace('.', ',')} km`)

/** Une marque par spot et par jour pour un chien : l'identifiant suffit à l'empêcher deux fois. */
export const markId = (uid: string, spotId: string, date: ISODate) => `${uid}_${spotId}_${date}`

/** Les marques s'effacent de la carte au bout de 7 jours ; le territoire, lui, reste. */
export const MARK_DAYS_ON_MAP = 7

/** Chaque chien a sa couleur, toujours la même. */
const DOG_COLORS = ['#C2571A', '#2559A8', '#7B4FC9', '#3E8E41', '#C4423A', '#8A6514', '#1E5A50', '#D9661F', '#5A3796', '#2F6FD0']
export function dogColor(uid: string): string {
  let h = 0
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return DOG_COLORS[h % DOG_COLORS.length]!
}

/** Défi de la meute : chacun fait sa mission 5 jours cette semaine. */
export const PACK_CHALLENGE_TARGET = 5
export const PACK_CHALLENGE_LABEL = 'Chacun fait sa mission 5 jours cette semaine'
/** « 3/5 » : jamais plus que la cible. */
export const packScore = (days: ISODate[], week: ISODate[]) => Math.min(PACK_CHALLENGE_TARGET, new Set(days.filter((d) => week.includes(d))).size)

/** Un exercice qui se fait « dans une rue calme », « un lieu calme », « parc vide »… : on peut proposer un spot calme. */
export const needsCalmPlace = (setting: string | undefined) => Boolean(setting && /(rue|lieu|point) calme|calme dehors|parc vide|heure creuse/i.test(setting))

/**
 * Le spot calme à proposer pour une mission (communaute.md § 4) : un spot « Plutôt calme », jamais « À éviter ».
 * Le plus proche si on connaît la position, sinon celui que la meute dit calme le plus souvent.
 */
export function pickCalmSpot<T extends { id: string; lat: number; lng: number; category: string }>(
  spots: T[],
  calm: Record<string, { level: CalmLevel; slot: CalmSlot }[]>,
  here?: { lat: number; lng: number },
): (T & { headline: string; votes: number; meters?: number }) | undefined {
  const calmOnes = spots.flatMap((s) => {
    const summary = s.category === 'eviter' ? undefined : calmSummary(calm[s.id] ?? [])
    return summary?.headline.startsWith('Plutôt calme') ? [{ ...s, headline: summary.headline, votes: (calm[s.id] ?? []).filter((v) => v.level === 'calme').length }] : []
  })
  if (calmOnes.length === 0) return undefined
  const best = here
    ? calmOnes.map((s) => ({ ...s, meters: distanceMeters(s, here) })).sort((a, b) => a.meters - b.meters)[0]!
    : [...calmOnes].sort((a, b) => b.votes - a.votes)[0]!
  return best
}
