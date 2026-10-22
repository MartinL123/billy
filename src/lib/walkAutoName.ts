import type { PlaceKind, RoutePlace } from './walkFacts'

// T-103 (V6.1 § 9) : le nom d’une balade se fait seul, « moment + lieu marquant traversé » (« Balade du matin au square
// des Tilleuls »). Un nom choisi par la personne reste : on ne touche qu’à un nom encore automatique, c’est-à-dire le
// nom donné à l’import (« Balade du matin ») ou le dernier nom calculé ici (gardé dans `autoName` sur la balade).

/** Le nom donné à l’import : « Balade », « Balade du matin », « Randonnée de l’après-midi »… */
const MOMENT_NAME = /^(Balade|Randonnée)( (du matin|de midi|de l[’']après-midi|du soir|de nuit))?/

/** Le lieu qui donne son nom à la balade : d’abord un square, un parc, un jardin, un parc canin, la nature. */
const NOTABLE: PlaceKind[] = ['square', 'parc', 'jardin', 'canin', 'nature']

/** Le lieu marquant traversé (le premier du genre le plus parlant), ou rien. */
export function notablePlace(places: RoutePlace[] | undefined): RoutePlace | undefined {
  for (const kind of NOTABLE) {
    const found = places?.find((p) => p.kind === kind && p.name.trim())
    if (found) return found
  }
  return undefined
}

/** Le premier mot (nom commun) d’un lieu, et la façon de dire « au », « à la », « à l’ », « aux ». */
const ARTICLES: Record<string, 'au' | 'à la' | 'à l’' | 'aux'> = {
  square: 'au', parc: 'au', jardin: 'au', bois: 'au', canal: 'au', lac: 'au', quai: 'au', mail: 'au', cours: 'au', verger: 'au', potager: 'au', domaine: 'au', bord: 'au',
  promenade: 'à la', coulée: 'à la', forêt: 'à la', plaine: 'à la', prairie: 'à la', butte: 'à la', place: 'à la', roseraie: 'à la', pelouse: 'à la', colline: 'à la', base: 'à la', aire: 'à l’',
  espace: 'à l’', esplanade: 'à l’', étang: 'à l’', île: 'à l’', arboretum: 'à l’', allée: 'à l’', orée: 'à l’',
  jardins: 'aux', parcs: 'aux', berges: 'aux', bords: 'aux', squares: 'aux',
}

/** « au square des Tilleuls », « à la promenade du Ruisseau », « à l’espace vert du Moulin », « à Bellerive ». */
export function placePhrase(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  const first = clean.split(' ')[0]!
  const lower = first.toLocaleLowerCase('fr')
  const article = ARTICLES[lower]
  if (article) return `${article === 'à l’' ? article : `${article} `}${lower}${clean.slice(first.length)}`
  // « Les Jardins du Lavoir » : « aux jardins du Lavoir ».
  const plural = /^les\s+(\S+)(.*)$/i.exec(clean)
  if (plural && ARTICLES[plural[1]!.toLocaleLowerCase('fr')] === 'aux') return `aux ${plural[1]!.toLocaleLowerCase('fr')}${plural[2]}`
  // « Le Pré Vert » : « au pré Vert » ; « La Prairie » : « à la prairie » ; sinon un nom propre : « à Bellerive ».
  const le = /^le\s+(.+)$/i.exec(clean)
  if (le) return `au ${le[1]}`
  const la = /^la\s+(.+)$/i.exec(clean)
  if (la) return `à la ${la[1]}`
  return `à ${clean}`
}

/** Le moment du nom donné à l’import (« Balade du matin »), si le nom en vient encore. */
const momentOf = (name: string) => MOMENT_NAME.exec(name.trim())?.[0]

/** Le nom est-il encore automatique ? Celui de l’import tel quel, ou le dernier nom calculé ici. */
export function isAutoName(entry: { text: string; autoName?: string }): boolean {
  const text = entry.text.trim()
  if (entry.autoName && text === entry.autoName) return true
  return momentOf(text) === text && text !== ''
}

/** « Balade du matin » + lieu marquant : « Balade du matin au square des Tilleuls » (sans lieu : le moment seul). */
export function autoWalkName(moment: string, places: RoutePlace[] | undefined): string {
  const place = notablePlace(places)
  return place ? `${moment} ${placePhrase(place.name)}` : moment
}

/**
 * Le nouveau nom d’une balade dont les lieux sont connus : `undefined` si le nom a été choisi par la personne, ou s’il
 * ne change pas. Le moment vient du nom actuel (automatique), jamais recalculé (il suit la sortie cochée, R-047).
 */
export function nextAutoName(entry: { text: string; autoName?: string }, places: RoutePlace[] | undefined): string | undefined {
  if (!isAutoName(entry)) return undefined
  const moment = momentOf(entry.text)
  if (!moment) return undefined
  const name = autoWalkName(moment, places)
  return name === entry.text.trim() ? undefined : name
}
