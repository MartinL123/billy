import { formatLong, formatShort, type ISODate } from './dates'
import { isOverdue } from './events'

// L’accueil en tableau de bord (T-031) : ce que disent les 4 tuiles « Sa vie avec vous ». Phrases courtes, pas de
// chiffre à battre ; les données viennent de ce que l’app sait déjà.

export interface Tile {
  /** La ligne principale, sous le titre de la tuile. */
  text: string
  /** La ligne du bas, en couleur (vide : rien). */
  detail: string
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Ses progrès : les compétences en cours, et les pattes de la plus avancée (0 à 5). */
export function progressTile(active: string[], levels: Record<string, number | undefined>): Tile & { paws: number } {
  const paws = Math.max(0, ...active.map((id) => levels[id] ?? 0))
  if (!active.length) return { text: 'Choisir quoi travailler', detail: '', paws: 0 }
  return { text: active.length === 1 ? 'Une chose en cours' : `${active.length} choses en cours`, detail: paws ? '' : 'On commence', paws }
}

/** Ses balades : combien, combien de km, et la part découverte de la commune quand on la connaît. */
export function walksTile(walks: { distanceM: number }[], share?: string): Tile & { km: number } {
  const km = walks.reduce((sum, w) => sum + w.distanceM, 0) / 1000
  // Le bouton est dans « Ses sorties du jour » ; la tuile, déjà un lien, garde seulement le texte (R-040).
  if (!walks.length) return { text: 'Pas encore de balade', detail: '', km: 0 }
  return { text: `${plural(walks.length, 'balade')} · ${km.toFixed(1).replace('.', ',')} km`, detail: share ?? '', km }
}

interface CareLike {
  title: string
  type: string
  date: ISODate | ''
  done: boolean
  time?: string
}

const CARE = ['vaccin', 'vermifuge', 'antiparasitaire', 'veto']

/** Sa santé : « Tout est à jour » ou le soin en retard, puis le prochain soin prévu. */
export function healthTile(events: CareLike[], today: ISODate): Tile & { late: boolean } {
  const care = events.filter((e) => CARE.includes(e.type) && !e.done && e.date)
  const late = care.filter((e) => isOverdue(e, today)).sort((a, b) => a.date.localeCompare(b.date))
  const next = care.filter((e) => !isOverdue(e, today)).sort((a, b) => a.date.localeCompare(b.date))[0]
  const year = Number(today.slice(0, 4))
  const detail = next ? `${next.title} le ${formatShort(next.date as ISODate, year)}` : 'Rien de prévu'
  if (late.length) return { text: late.length === 1 ? `${late[0]!.title} en retard` : `${late.length} soins en retard`, detail, late: true }
  return { text: 'Tout est à jour', detail, late: false }
}

/** Ses souvenirs : combien, et la date du dernier. Les journées de repos notées toutes seules ne comptent pas. */
export function memoriesTile(entries: { id: string; date: ISODate }[], today: ISODate): Tile & { count: number } {
  const own = entries.filter((e) => !e.id.startsWith('repos-'))
  if (!own.length) return { text: 'Pas encore de souvenir', detail: 'Noter le premier', count: 0 }
  const last = own.reduce((a, b) => (b.date > a.date ? b : a))
  return { text: plural(own.length, 'souvenir'), detail: `Le dernier : ${formatShort(last.date, Number(today.slice(0, 4)))}`, count: own.length }
}

// « Sa vie avec vous » en 4 lignes (V5, T-050) : une phrase par ligne, sans chiffre à battre.

/** « 3 compétences en route ». */
export function progressLine(active: string[]): string {
  if (!active.length) return 'Choisir ce qu’il apprend'
  return active.length === 1 ? 'Une compétence en route' : `${active.length} compétences en route`
}

/** « 4,7 km ensemble · 4 % de Saint-Ouen découvert ». */
export function walksLine(walks: { distanceM: number }[], share?: string): string {
  if (!walks.length) return 'Pas encore de balade'
  const km = (walks.reduce((sum, w) => sum + w.distanceM, 0) / 1000).toFixed(1).replace('.', ',')
  return share ? `${km}\u00a0km ensemble · ${share}` : `${km}\u00a0km ensemble`
}

/** « Le dernier : 19 octobre 2026 » (sans les jours de repos). */
export function memoriesLine(entries: { id: string; date: ISODate }[]): string {
  const own = entries.filter((e) => !e.id.startsWith('repos-'))
  if (!own.length) return 'Pas encore de souvenir'
  const last = own.reduce((a, b) => (b.date > a.date ? b : a))
  return `Le dernier\u00a0: ${formatLong(last.date)}`
}
