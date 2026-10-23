import type { Route } from './route'
import type { Snap } from './sheetSnap'
import { tellQueue } from './walkTell'

// R-094 « Une seule carte » : l’onglet Balades n’a qu’une carte ; son panneau montre le journal ou la fiche d’une
// balade. Ce que dit l’adresse, en fonctions pures (testées).

export type PanelMode = { kind: 'journal' } | { kind: 'sheet'; id: string } | { kind: 'replay'; id: string }

/** Le mode du panneau lu dans l’adresse : `?balade=<id>` la fiche, `&revoir=1` sa relecture ; sinon le journal. */
export function panelMode(params: URLSearchParams): PanelMode {
  const id = params.get('balade')
  if (!id) return { kind: 'journal' }
  return params.get('revoir') === '1' ? { kind: 'replay', id } : { kind: 'sheet', id }
}

/**
 * L’adresse de la carte ouverte sur une balade : sa fiche (au cran du milieu par défaut ; un tracé touché l’ouvre au
 * cran réduit, sur son résumé) ou sa relecture. Le filtre du journal est gardé pour le retour.
 */
export function walkOnMap(id: string, { snap, replay = false, filter }: { snap?: Snap; replay?: boolean; filter?: string } = {}): string {
  const q = new URLSearchParams({ balade: id })
  if (replay) q.set('revoir', '1')
  else if (snap && snap !== 'half') q.set('cran', snap)
  if (filter && filter !== 'toutes') q.set('filtre', filter)
  return `/territoire?${q.toString()}`
}

/** Le journal de la carte, avec son filtre. */
export function journalOnMap(filter?: string): string {
  return filter && filter !== 'toutes' ? `/territoire?filtre=${encodeURIComponent(filter)}` : '/territoire'
}

/**
 * Où mène « Raconter » : les arrêts et repères qui attendent ; tout est raconté : tous les arrêts, depuis le premier
 * (pour changer un récit) ; sans arrêt : la modification de la balade (un mot, une photo).
 */
export function tellHref(id: string, route: Pick<Route, 'stops' | 'moments' | 'track'>): string {
  if (tellQueue(route).length) return `/souvenir/${id}/raconter`
  if (route.stops?.length) return `/souvenir/${id}/raconter?arret=1`
  return `/souvenir/${id}/modifier`
}
