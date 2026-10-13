import { deleteDoc, setDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import type { BossProgress, Entry, Exposure, Place, TrainingSession, XpEntry } from './types'
import { bossById } from '../content/training'
import { addValidation, EMPTY_PROGRESS, markPreApp } from '../lib/bossProgress'
import type { ISODate } from '../lib/dates'
import { MOMENT_XP, previewMoment } from '../lib/moment'
import { globalLevel, XP } from '../lib/xp'
import { levelTitle, stepPhraseLower } from '../content/phrases'

const now = () => new Date().toISOString()

// Les gains d'XP ont des identifiants fixes quand ils ne peuvent arriver qu'une fois (palier, étoile, validation du jour) :
// rejouer la même écriture, ou la faire depuis deux appareils, ne les compte jamais deux fois.
const xpRef = (id: string) => userDoc('xpLog', id)

function strip<T extends object>(value: T): DocumentData {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))
}

export function addPlace(name: string, bossId: string): string {
  const id = newId('places')
  const place: Place = { name: name.trim(), bossId, createdAt: now() }
  send(setDoc(userDoc('places', id), place))
  return id
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

/**
 * Enregistre une séance, son XP, et — pour chaque boss où Martin a répondu « oui » — une validation du critère
 * du palier. Un palier acquis ajoute une carte souvenir au Journal.
 */
export function recordSession(session: TrainingSession, validations: ValidationInput[] = []): Outcome {
  const batch = writeBatch(db)
  const created: ReturnType<typeof userDoc>[] = []
  const restore: (() => Promise<unknown>)[] = []
  const add = (ref: ReturnType<typeof userDoc>, data: DocumentData) => {
    batch.set(ref, data)
    created.push(ref)
  }
  let xp = session.xp
  const sessionId = newId('sessions')
  add(userDoc('sessions', sessionId), strip({ ...session, createdAt: now() }))
  add(xpRef(sessionId), strip<XpEntry>({ date: session.date, kind: 'seance', xp: session.xp, bossId: session.bossId, bossIds: session.bossIds, createdAt: now() }))

  const results: BossOutcome[] = []
  for (const { bossId, current } of validations) {
    const before = current ?? EMPTY_PROGRESS
    const result = addValidation(before, session.date)
    results.push({ bossId, ...result })
    if (!result.validated) continue
    const boss = bossById(bossId)
    const progressRef = userDoc('bossProgress', bossId)
    batch.set(progressRef, strip(result.progress))
    restore.push(() => (current ? setDoc(progressRef, strip(current)) : deleteDoc(progressRef)))
    const target = result.levelGained ?? Math.min(before.level + 1, 5)
    xp += XP.validation
    add(xpRef(`validation-${bossId}-${target}-${session.date}`), strip<XpEntry>({ date: session.date, kind: 'validation', xp: XP.validation, bossId, createdAt: now() }))
    if (result.levelGained && boss) {
      const level = boss.levels[result.levelGained - 1]!
      xp += XP.level
      add(xpRef(`palier-${boss.id}-${result.levelGained}`), strip<XpEntry>({ date: session.date, kind: 'palier', xp: XP.level, bossId: boss.id, label: `${boss.name} · ${level.title}`, createdAt: now() }))
      add(userDoc('entries', `palier-${boss.id}-${result.levelGained}`), levelCard(session.date, boss.name, result.levelGained, level.title, level.criterion))
    }
  }
  send(batch.commit())

  const undo = () => {
    const back = writeBatch(db)
    for (const ref of created) back.delete(ref)
    send(back.commit())
    for (const put of restore) send(put())
  }
  return { xp, results, undo }
}

function levelCard(date: ISODate, bossName: string, level: number, title: string, criterion: string): Entry {
  return { date, text: `Palier acquis : ${bossName}, P${level} « ${title} ».\n${criterion}.`, tags: ['Dressage'], photos: [], createdAt: now() }
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

/** Première fois : XP unique et carte souvenir datée dans le Journal. */
export function awardFirst(key: string, label: string, date: ISODate): void {
  const id = `premiere-${key}`
  awardOnce(id, { date, kind: 'premiere', xp: XP.first, key, label })
  const card: Entry = { date, text: `Première fois : ${label}.`, tags: ['Dressage'], photos: [], createdAt: now() }
  send(setDoc(userDoc('entries', id), card))
}

export function awardQuest(week: ISODate, key: string, label: string, date: ISODate): void {
  awardOnce(`quete-${week}-${key}`, { date, kind: 'quete', xp: XP.quest, key, label })
}

/** Remplace une quête de la semaine, sans pénalité. */
export function replaceQuest(week: ISODate, replaced: string[]): void {
  send(setDoc(userDoc('quests', week), { date: week, replaced }))
}

// ——— Raconter un moment (V3) ———

export interface MomentOutcome {
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
export function recordMoment(entry: Entry, yes: string[], progress: Record<string, BossProgress | undefined>, dogName: string, xpBefore: number): MomentOutcome {
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
  add(userDoc('entries', entryId), strip({ ...entry, validations: preview.validated, xp: preview.xp, createdAt: now() }))
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

  const levelBefore = globalLevel(xpBefore).level
  const levelAfter = globalLevel(xpBefore + preview.xp).level
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
