import { deleteDoc, setDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import type { BossProgress, DailyQuestDoc, Entry, Exposure, XpEntry } from './types'
import { bossById } from '../content/training'
import { addValidation, checkStep, EMPTY_PROGRESS, markPreApp, uncheckPreApp, uncheckStep } from '../lib/bossProgress'
import type { ISODate } from '../lib/dates'
import { MOMENT_XP, previewMoment } from '../lib/moment'
import { missionBones, momentBones, type Bone, type BoneWithId } from '../lib/bones'
import { levelForSteps, stepsAcquired } from '../lib/level'
import { XP } from '../lib/xp'
import { levelTitle, stepPhraseLower } from '../content/phrases'

const now = () => new Date().toISOString()

// Les gains d'XP ont des identifiants fixes quand ils ne peuvent arriver qu'une fois (palier, étoile, validation du jour) :
// rejouer la même écriture, ou la faire depuis deux appareils, ne les compte jamais deux fois.
const xpRef = (id: string) => userDoc('xpLog', id)
const boneData = ({ date, amount, reason, refId }: BoneWithId): Bone => ({ date, amount, reason, refId })

/** Un gain d'os unique (défi, semaine régulière, questionnaire) : l'identifiant fixe empêche tout doublon. */
export function awardBone(gain: BoneWithId): void {
  send(setDoc(userDoc('bones', gain.id), boneData(gain)))
}

function strip<T extends object>(value: T): DocumentData {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))
}

export interface BossOutcome {
  bossId: string
  /** Une validation du critère a été comptée. */
  validated: boolean
  levelGained?: number
  progress: BossProgress
}

export interface Outcome {
  /** XP gagnée au total par cette saisie. */
  xp: number
  /** Un résultat par boss dont le critère a été déclaré atteint. */
  results: BossOutcome[]
  /** Annule la saisie. À n'offrir que dans les secondes qui suivent : ensuite, rien ne baisse. */
  undo: () => void
}

export interface ValidationInput {
  bossId: string
  current: BossProgress | undefined
}

/** Enregistre une exposition et son XP. La distance n'entre jamais dans le calcul. */
export function recordExposure(exposure: Exposure): { undo: () => void } {
  const id = newId('exposures')
  const batch = writeBatch(db)
  batch.set(userDoc('exposures', id), strip({ ...exposure, createdAt: now() }))
  batch.set(xpRef(id), strip<XpEntry>({ date: exposure.date, kind: 'exposition', xp: exposure.xp, bossId: exposure.bossId, createdAt: now() }))
  send(batch.commit())
  return {
    undo: () => {
      send(deleteDoc(userDoc('exposures', id)))
      send(deleteDoc(xpRef(id)))
    },
  }
}

/**
 * « Billy sait déjà faire ça » (fiche d'une compétence, questionnaire de départ) : les étapes jusqu'à `level`
 * sont acquises « avant l'app ». Chaque nouvelle étape rapporte l'XP normale, une seule fois. Ne fait jamais baisser.
 */
export function declarePreApp(bossId: string, current: BossProgress | undefined, level: number, date: ISODate): number[] {
  const { progress, gained } = markPreApp(current ?? EMPTY_PROGRESS, level)
  if (gained.length === 0) return gained
  const boss = bossById(bossId)
  const batch = writeBatch(db)
  batch.set(userDoc('bossProgress', bossId), strip(progress))
  for (const step of gained) {
    batch.set(xpRef(`palier-${bossId}-${step}`), strip<XpEntry>({ date, kind: 'palier', xp: XP.level, bossId, key: 'avant', label: `${boss?.name} · avant l'app`, createdAt: now() }))
  }
  send(batch.commit())
  return gained
}

/**
 * Écran de résultat du questionnaire : décoche une étape « avant l'app » et les plus difficiles.
 * Leurs lignes d'XP « étape acquise » sont retirées : c'est une correction avant le départ, pas une baisse.
 * Une étape validée dans l'app n'est jamais concernée. Renvoie de quoi annuler.
 */
export function uncheckSteps(bossId: string, current: BossProgress, step: number, log: (XpEntry & { id: string })[]): { removed: number[]; undo: () => void } {
  const { progress, removed } = uncheckPreApp(current, step)
  if (removed.length === 0) return { removed, undo: () => undefined }
  const ids = removed.map((s) => `palier-${bossId}-${s}`)
  const previous = log.filter((e) => ids.includes(e.id))
  const batch = writeBatch(db)
  batch.set(userDoc('bossProgress', bossId), strip(progress))
  for (const id of ids) batch.delete(xpRef(id))
  send(batch.commit())
  return {
    removed,
    undo: () => {
      const back = writeBatch(db)
      back.set(userDoc('bossProgress', bossId), strip({ level: current.level, validations: current.validations, masteryPlaces: current.masteryPlaces, preApp: current.preApp }))
      for (const { id, ...entry } of previous) back.set(xpRef(id), strip<XpEntry>({ date: entry.date, kind: entry.kind, xp: entry.xp, bossId: entry.bossId, key: entry.key, label: entry.label, createdAt: entry.createdAt }))
      send(back.commit())
    },
  }
}

/**
 * Chemin d'une compétence : coche ou décoche une étape. Seule la progression change ; le journal d'XP n'est jamais touché.
 * Renvoie de quoi annuler.
 */
export function setStepChecked(bossId: string, current: BossProgress | undefined, step: number, checked: boolean): { changed: number[]; undo: () => void } {
  const before = current ?? EMPTY_PROGRESS
  const result = checked ? checkStep(before, step) : uncheckStep(before, step)
  const changed = 'gained' in result ? result.gained : result.removed
  if (changed.length === 0) return { changed, undo: () => undefined }
  const ref = userDoc('bossProgress', bossId)
  const plain = (p: BossProgress) => strip({ level: p.level, validations: p.validations, masteryPlaces: p.masteryPlaces, preApp: p.preApp })
  send(setDoc(ref, plain(result.progress)))
  return { changed, undo: () => send(current ? setDoc(ref, plain(current)) : deleteDoc(ref)) }
}

/** Gain d'XP unique (première fois, quête, repos du jour) : l'identifiant fixe empêche tout doublon. */
export function awardOnce(id: string, entry: Omit<XpEntry, 'createdAt'>): void {
  send(setDoc(xpRef(id), strip<XpEntry>({ ...entry, createdAt: now() })))
}

export function removeAward(id: string): void {
  send(deleteDoc(xpRef(id)))
}

/** Jour de repos ou balade reniflage : un seul par jour. */
export function declareRest(date: ISODate, sniff: boolean, xp: number): { undo: () => void } {
  const id = `repos-${date}`
  awardOnce(id, { date, kind: 'repos', xp, key: sniff ? 'reniflage' : 'repos', label: sniff ? 'Balade reniflage' : 'Jour de repos' })
  return { undo: () => removeAward(id) }
}

// ——— Mission du jour (V3 § 5.9) ———

/** « Autre idée » : on retient combien de fois on l'a demandé aujourd'hui. */
export function skipQuest(date: ISODate, skips: number): void {
  send(setDoc(userDoc('dailyQuest', date), { date, done: false, skips } satisfies DailyQuestDoc, { merge: true }))
}

/**
 * Mission du jour faite : +15 XP, une seule fois par jour (identifiant fixe).
 * Une journée de repos compte comme une vraie action, et s'ajoute au Carnet.
 */
export function completeQuest(date: ISODate, quest: { kind: 'exercice' | 'revision' | 'repos'; bossId?: string; exerciseId?: string }, skips: number, xp: number): void {
  const batch = writeBatch(db)
  batch.set(userDoc('dailyQuest', date), strip<DailyQuestDoc>({ date, kind: quest.kind, bossId: quest.bossId, exerciseId: quest.exerciseId, done: true, skips }))
  for (const gain of missionBones(date, quest.kind === 'repos')) batch.set(userDoc('bones', gain.id), boneData(gain))
  if (quest.kind === 'repos') {
    batch.set(xpRef(`repos-${date}`), strip<XpEntry>({ date, kind: 'repos', xp, key: 'repos', label: 'Jour de repos', createdAt: now() }))
    batch.set(userDoc('entries', `repos-${date}`), { date, text: 'Jour de repos.', tags: [], photos: [], createdAt: now() } satisfies Entry)
  } else {
    batch.set(xpRef(`quete-jour-${date}`), strip<XpEntry>({ date, kind: 'quete', xp, bossId: quest.bossId, label: 'Mission du jour', createdAt: now() }))
  }
  send(batch.commit())
}

// ——— Noter ce qu'on a fait (V3) ———

export interface MomentOutcome {
  /** Os gagnés par ce moment. */
  bones: number
  /** Identifiant du moment dans le Carnet. */
  entryId: string
  xp: number
  /** Étapes acquises grâce à ce moment. */
  steps: { bossId: string; level: number }[]
  /** Niveau atteint, si le moment en a fait passer un. */
  levelReached?: number
  undo: () => void
}

/**
 * Enregistre un moment raconté : une entrée du Carnet, son XP, et les « oui, c'est réussi » qui comptent.
 * Une étape acquise et un passage de niveau ajoutent chacun une carte au Carnet.
 */
export function recordMoment(entry: Entry, yes: string[], progress: Record<string, BossProgress | undefined>, dogName: string, bones: Bone[] = []): MomentOutcome {
  const preview = previewMoment({ feeling: entry.feeling, fear: Boolean(entry.fear), movedAway: Boolean(entry.movedAway) }, yes, progress, entry.date)
  const batch = writeBatch(db)
  const created: ReturnType<typeof userDoc>[] = []
  const restore: (() => Promise<unknown>)[] = []
  const add = (ref: ReturnType<typeof userDoc>, data: DocumentData) => {
    batch.set(ref, data)
    created.push(ref)
  }
  const entryId = newId('entries')
  const skills = entry.skills ?? []
  // Le champ `xp` des anciens moments est conservé, mais on n'en écrit plus : le niveau vient des étapes acquises.
  add(userDoc('entries', entryId), strip({ ...entry, validations: preview.validated, createdAt: now() }))
  const base = preview.xp - preview.steps.length * MOMENT_XP.step
  add(xpRef(entryId), strip<XpEntry>({ date: entry.date, kind: 'moment', xp: base, bossId: skills[0], bossIds: skills.length ? skills : undefined, createdAt: now() }))

  for (const bossId of preview.validated) {
    const current = progress[bossId]
    const result = addValidation(current ?? EMPTY_PROGRESS, entry.date)
    const ref = userDoc('bossProgress', bossId)
    batch.set(ref, strip(result.progress))
    restore.push(() => (current ? setDoc(ref, strip(current)) : deleteDoc(ref)))
    if (result.levelGained) {
      const boss = bossById(bossId)
      add(xpRef(`palier-${bossId}-${result.levelGained}`), strip<XpEntry>({ date: entry.date, kind: 'palier', xp: MOMENT_XP.step, bossId, label: boss?.name, createdAt: now() }))
      add(userDoc('entries', `palier-${bossId}-${result.levelGained}`), {
        date: entry.date,
        text: `C'est réussi ! ${dogName} ${stepPhraseLower(bossId, result.levelGained)}.`,
        tags: [],
        photos: [],
        skills: [bossId],
        createdAt: now(),
      } satisfies Entry)
    }
  }

  const stepsBefore = stepsAcquired(progress)
  // Os de l'effort : +3 pour la note (3 par jour), +5 par réussite, +25 par étape acquise dans l'app.
  const validatedLevels = preview.validated.map((bossId) => ({ bossId, level: (progress[bossId]?.level ?? 0) + 1 }))
  const gains = momentBones(entryId, entry.date, validatedLevels, preview.steps, bones)
  for (const gain of gains) add(userDoc('bones', gain.id), boneData(gain))
  const levelBefore = levelForSteps(stepsBefore)
  const levelAfter = levelForSteps(stepsBefore + preview.steps.length)
  if (levelAfter > levelBefore) {
    add(userDoc('entries', `niveau-${levelAfter}`), {
      date: entry.date,
      text: `Niveau ${levelAfter} ! ${dogName} devient ${levelTitle(levelAfter)}.`,
      tags: [],
      photos: [],
      createdAt: now(),
    } satisfies Entry)
  }
  send(batch.commit())

  return {
    bones: gains.reduce((sum, g) => sum + g.amount, 0),
    entryId,
    xp: preview.xp,
    steps: preview.steps,
    levelReached: levelAfter > levelBefore ? levelAfter : undefined,
    undo: () => {
      const back = writeBatch(db)
      for (const ref of created) back.delete(ref)
      send(back.commit())
      for (const put of restore) send(put())
    },
  }
}
