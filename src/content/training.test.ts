import { describe, expect, it } from 'vitest'
import { bossById, BOSSES, EXERCISES, exerciseById, LEVEL_TITLES, MAX_LEVEL, STATS, TIERS, TRAITS } from './training'

describe('catalogue commun', () => {
  it('a 10 boss, soit 50 paliers', () => {
    expect(BOSSES).toHaveLength(10)
    expect(BOSSES.reduce((sum, b) => sum + b.levels.length, 0)).toBe(50)
    expect(new Set(BOSSES.map((b) => b.id)).size).toBe(10)
  })

  it('donne à chaque boss la même échelle de 5 paliers, avec un critère', () => {
    for (const boss of BOSSES) {
      expect(boss.levels.map((l) => l.title)).toEqual([...LEVEL_TITLES])
      expect(boss.levels).toHaveLength(MAX_LEVEL)
      for (const level of boss.levels) expect(level.criterion.length).toBeGreaterThan(5)
      expect(boss.stats.length).toBeGreaterThanOrEqual(1)
      for (const stat of boss.stats) expect(STATS.map((s) => s.id)).toContain(stat)
    }
  })

  it('range les boss sur 3 étages', () => {
    const byTier = (tier: string) => BOSSES.filter((b) => b.tier === tier).map((b) => b.id).sort()
    expect(TIERS.map((t) => t.id)).toEqual(['monde', 'quotidien', 'fondations'])
    expect(byTier('fondations')).toEqual(['calme', 'lien', 'soins'])
    expect(byTier('quotidien')).toEqual(['laisse', 'manieres', 'nouveaute', 'rappel'])
    expect(byTier('monde')).toEqual(['congeneres', 'rencontres', 'ville'])
  })

  it('a des liens conseillés qui pointent vers des boss et des paliers existants', () => {
    for (const boss of BOSSES) {
      for (const rec of boss.recommends) {
        expect(rec.level).toBeGreaterThanOrEqual(1)
        expect(rec.level).toBeLessThanOrEqual(MAX_LEVEL)
        for (const req of rec.requires) {
          expect(bossById(req.bossId)).toBeDefined()
          expect(req.bossId).not.toBe(boss.id)
          expect(req.level).toBeLessThanOrEqual(MAX_LEVEL)
        }
      }
    }
    expect(bossById('ville')!.recommends).toEqual([
      { level: 3, requires: [{ bossId: 'lien', level: 2 }, { bossId: 'nouveaute', level: 2 }] },
      { level: 4, requires: [{ bossId: 'laisse', level: 3 }] },
    ])
  })

  it('n’a aucun lien conseillé qui remonte d’un étage vers le bas', () => {
    const height = { fondations: 0, quotidien: 1, monde: 2 }
    for (const boss of BOSSES) {
      for (const req of boss.recommends.flatMap((r) => r.requires)) {
        expect(height[bossById(req.bossId)!.tier]).toBeLessThanOrEqual(height[boss.tier])
      }
    }
  })
})

describe('exercices', () => {
  it('ont 5 niveaux de difficulté, des étapes et au moins un boss existant', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
    for (const exercise of EXERCISES) {
      expect(exercise.levels).toHaveLength(5)
      expect(exercise.steps.length).toBeGreaterThanOrEqual(2)
      expect(exercise.bossIds.length).toBeGreaterThanOrEqual(1)
      for (const id of exercise.bossIds) expect(bossById(id)).toBeDefined()
      for (const trait of exercise.traits ?? []) expect(TRAITS.map((t) => t.id)).toContain(trait)
    }
  })

  it('donnent au moins un exercice à chaque boss', () => {
    for (const boss of BOSSES) expect(EXERCISES.some((e) => e.bossIds.includes(boss.id)), boss.id).toBe(true)
  })

  it('marquent « à vérifier » les fiches décrites de mémoire', () => {
    expect(EXERCISES.filter((e) => !e.verified).map((e) => e.id).sort()).toEqual(['absences', 'assis-couche', 'cherche', 'parcours-objets', 'porte', 'quatre-pattes', 'treat-retreat', 'visite-veto'])
    expect(exerciseById('treat-retreat')!.caution).toContain('enfants')
  })

  it('ne demandent jamais de se rapprocher d’un déclencheur', () => {
    for (const exercise of EXERCISES) {
      for (const text of [...exercise.levels, ...exercise.steps]) {
        expect(text.toLowerCase(), exercise.id).not.toMatch(/réduire la distance|plus près|se rapprocher du|approche-toi/)
      }
    }
  })
})

describe('traits', () => {
  it('ne mettent en avant que des boss existants', () => {
    expect(TRAITS).toHaveLength(6)
    for (const trait of TRAITS) {
      expect(trait.guards.length).toBeGreaterThanOrEqual(1)
      for (const id of trait.bossIds) expect(bossById(id)).toBeDefined()
    }
  })
})
