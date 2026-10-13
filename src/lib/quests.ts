import { bossById, type Trait } from '../content/training'
import { dayNumber, type ISODate } from './dates'
import { weekOf } from './rhythm'
import { suggestedBosses } from './traits'
import { bossesOf } from './xp'

export interface Quest {
  key: string
  label: string
  target: number
}

/** Trois quêtes au plus par semaine. */
export const QUESTS_PER_WEEK = 3

/**
 * Quêtes possibles pour un chien, dans un ordre qui alterne séances, récupération et observation.
 * Aucune ne demande de se rapprocher d'un déclencheur.
 */
export function questPool(traits: Trait[]): Quest[] {
  const bosses = suggestedBosses(traits)
  const sessions = (bossId: string): Quest => ({ key: `seances-${bossId}`, label: `3 séances : ${bossById(bossId)?.name}`, target: 3 })
  return [
    sessions(bosses[0]!),
    { key: 'reniflage', label: 'Une balade reniflage dans un lieu calme', target: 1 },
    { key: 'expositions-loin', label: 'Noter 2 expositions en restant loin', target: 2 },
    sessions(bosses[1]!),
    { key: 'repos', label: 'Un jour de repos déclaré', target: 1 },
    sessions(bosses[2]!),
    sessions(bosses[3]!),
    { key: 'trois-jours', label: 'S’entraîner 3 jours différents', target: 3 },
    sessions(bosses[4]!),
  ]
}

/**
 * Les quêtes de la semaine : les mêmes sur tous les appareils, elles tournent chaque semaine.
 * Une quête remplacée laisse sa place à la suivante de la liste, sans pénalité.
 */
export function weekQuests(week: ISODate, traits: Trait[], replaced: string[] = []): Quest[] {
  const pool = questPool(traits)
  const start = ((Math.floor(dayNumber(week) / 7) * QUESTS_PER_WEEK) % pool.length + pool.length) % pool.length
  const rotated = [...pool.slice(start), ...pool.slice(0, start)]
  return rotated.filter((q) => !replaced.includes(q.key)).slice(0, QUESTS_PER_WEEK)
}

export interface QuestData {
  sessions: { date: ISODate; bossId: string; bossIds?: string[] }[]
  exposures: { date: ISODate; distance?: string; retreat: boolean }[]
  /** Jours de repos et balades reniflage déclarés. */
  rests: { date: ISODate; sniff: boolean }[]
}

/** Avancement d'une quête sur la semaine en cours, plafonné à sa cible. */
export function questProgress(quest: Quest, today: ISODate, data: QuestData): number {
  const week = new Set(weekOf(today))
  const inWeek = <T extends { date: ISODate }>(items: T[]) => items.filter((i) => week.has(i.date))
  let done = 0
  if (quest.key.startsWith('seances-')) {
    const bossId = quest.key.slice('seances-'.length)
    done = inWeek(data.sessions).filter((s) => bossesOf(s).includes(bossId)).length
  } else if (quest.key === 'reniflage') {
    done = inWeek(data.rests).filter((r) => r.sniff).length
  } else if (quest.key === 'repos') {
    done = inWeek(data.rests).length
  } else if (quest.key === 'expositions-loin') {
    // « En restant loin » : à plus de 5 m, ou en ayant pris de la distance.
    done = inWeek(data.exposures).filter((e) => e.distance === '>10' || e.distance === '5-10' || e.retreat).length
  } else if (quest.key === 'trois-jours') {
    done = new Set(inWeek(data.sessions).map((s) => s.date)).size
  }
  return Math.min(quest.target, done)
}

export const questDone = (quest: Quest, today: ISODate, data: QuestData) => questProgress(quest, today, data) >= quest.target
