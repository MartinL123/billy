import type { ISODate } from './dates'

export interface First {
  key: string
  label: string
  /** Succès caché : une surprise, il n'apparaît qu'une fois obtenu. */
  hidden?: boolean
}

export const FIRSTS: First[] = [
  { key: 'seance', label: 'Première séance' },
  { key: 'exposition', label: 'Première exposition notée' },
  { key: 'retraite', label: 'Première retraite stratégique' },
  { key: 'repos', label: 'Premier jour de repos déclaré' },
  { key: 'palier', label: 'Premier palier acquis' },
  { key: 'dehors', label: 'Premier palier « Dehors au calme »' },
  { key: 'etoile', label: 'Première étoile de maîtrise' },
  { key: 'sans-faute', label: 'Cinq réussites sur cinq', hidden: true },
  { key: 'detendu', label: 'Un déclencheur croisé en restant détendu', hidden: true },
  { key: 'trois-boss', label: 'Trois boss travaillés', hidden: true },
]

export const firstByKey = (key: string) => FIRSTS.find((f) => f.key === key)

export interface FirstsData {
  sessions: { date: ISODate; bossId: string; trials: boolean[] }[]
  exposures: { date: ISODate; reaction: number; retreat: boolean }[]
  /** Journal d'XP : les paliers et étoiles gagnés par la pratique y ont un identifiant fixe. */
  log: { id: string; date: ISODate; kind: string }[]
}

const earliest = (dates: ISODate[]): ISODate | undefined => [...dates].sort()[0]

/**
 * Les premières fois atteintes, avec leur date. Elles ne s'appuient que sur ce qui a été enregistré
 * par la pratique : un palier validé directement (« déjà maîtrisé ») ne compte pas.
 */
export function reachedFirsts(data: FirstsData): { key: string; date: ISODate }[] {
  const out: { key: string; date: ISODate }[] = []
  const add = (key: string, date: ISODate | undefined) => {
    if (date) out.push({ key, date })
  }
  const byKind = (kind: string) => data.log.filter((e) => e.kind === kind)
  add('seance', earliest(data.sessions.map((s) => s.date)))
  add('exposition', earliest(data.exposures.map((e) => e.date)))
  add('retraite', earliest(data.exposures.filter((e) => e.retreat).map((e) => e.date)))
  add('repos', earliest(byKind('repos').map((e) => e.date)))
  add('palier', earliest(byKind('palier').map((e) => e.date)))
  add('dehors', earliest(byKind('palier').filter((e) => /-[345]$/.test(e.id)).map((e) => e.date)))
  add('etoile', earliest(byKind('etoile').map((e) => e.date)))
  add('sans-faute', earliest(data.sessions.filter((s) => s.trials.length >= 5 && s.trials.every(Boolean)).map((s) => s.date)))
  add('detendu', earliest(data.exposures.filter((e) => e.reaction === 0).map((e) => e.date)))
  const bosses = new Map<string, ISODate>()
  for (const s of [...data.sessions].sort((a, b) => a.date.localeCompare(b.date))) if (!bosses.has(s.bossId)) bosses.set(s.bossId, s.date)
  add('trois-boss', [...bosses.values()].sort()[2])
  return out
}
