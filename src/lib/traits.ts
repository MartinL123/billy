import { BOSSES, EXERCISES, TRAITS, type Exercise, type Trait } from '../content/training'
import type { Weather } from './weather'

const info = (traits: Trait[]) => TRAITS.filter((t) => traits.includes(t.id))

/**
 * Ordre dans lequel suggérer les boss : on prend à tour de rôle le premier boss de chaque trait, puis le deuxième…
 * Les traits ne changent jamais les objectifs, seulement le chemin. Les autres boss suivent, dans l’ordre du catalogue.
 */
export function suggestedBosses(traits: Trait[]): string[] {
  const lists = info(traits).map((t) => t.bossIds)
  const out: string[] = []
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const list of lists) {
      const id = list[i]
      if (id && !out.includes(id)) out.push(id)
    }
  }
  for (const boss of BOSSES) if (!out.includes(boss.id)) out.push(boss.id)
  return out
}

/** Nombre de boss qui portent le badge « Conseillé ». */
const FEATURED = 3

export const featuredBosses = (traits: Trait[]): string[] => (traits.length ? suggestedBosses(traits).slice(0, FEATURED) : [])

/** Garde-fous de tous les traits cochés, sans doublon. */
export const guards = (traits: Trait[]): string[] => [...new Set(info(traits).flatMap((t) => t.guards))]

/** Exercices d’un boss : ceux qui correspondent aux traits du chien d’abord. */
export function exercisesFor(bossId: string, traits: Trait[]): Exercise[] {
  const matches = (e: Exercise) => Number(Boolean(e.traits?.some((t) => traits.includes(t))))
  return EXERCISES.filter((e) => e.bossIds.includes(bossId)).sort((a, b) => matches(b) - matches(a))
}

/**
 * Garde-fou « craintif » : le palier Dehors animé (P4) n’est conseillé que si la météo du boss est au soleil
 * ou aux éclaircies. C’est un conseil affiché, jamais un verrou.
 */
export function levelFourUnadvised(traits: Trait[], targetLevel: number, current: Weather | undefined): boolean {
  return traits.includes('craintif') && targetLevel === 4 && current !== undefined && current !== 'soleil' && current !== 'eclaircies'
}
