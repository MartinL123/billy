import { deleteDoc, setDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db } from './app'
import { newId, send, userDoc } from './paths'
import type { BossProgress, Entry, Exposure, Place, TrainingSession, XpEntry } from './types'
import { bossById } from '../content/training'
import { addValidation, EMPTY_PROGRESS, validateDirectly } from '../lib/bossProgress'
import type { ISODate } from '../lib/dates'
import { XP } from '../lib/xp'

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

export interface Outcome {
  /** XP gagnée au total par cette saisie. */
  xp: number
  /** Une validation du critère a été comptée. */
  validated: boolean
  levelGained?: number
  starPlaceId?: string
  progress: BossProgress
  /** Annule la saisie. À n'offrir que dans les secondes qui suivent : ensuite, rien ne baisse. */
  undo: () => void
}

interface ValidationInput {
  placeId?: string
}

/**
 * Enregistre une séance, son XP, et — si Martin a répondu « oui » — une validation du critère du palier.
 * Un palier acquis ajoute une carte souvenir au Journal.
 */
export function recordSession(session: TrainingSession, current: BossProgress | undefined, validation?: ValidationInput): Outcome {
  const batch = writeBatch(db)
  const created: ReturnType<typeof userDoc>[] = []
  const add = (ref: ReturnType<typeof userDoc>, data: DocumentData) => {
    batch.set(ref, data)
    created.push(ref)
  }
  let xp = session.xp
  const sessionId = newId('sessions')
  add(userDoc('sessions', sessionId), strip({ ...session, createdAt: now() }))
  add(xpRef(sessionId), strip<XpEntry>({ date: session.date, kind: 'seance', xp: session.xp, bossId: session.bossId, createdAt: now() }))

  const before = current ?? EMPTY_PROGRESS
  let result = { progress: before, validated: false } as ReturnType<typeof addValidation>
  if (validation) {
    result = addValidation(before, session.date, validation.placeId)
    if (result.validated) {
      const boss = bossById(session.bossId)
      batch.set(userDoc('bossProgress', session.bossId), strip(result.progress))
      const target = result.levelGained ?? Math.min(before.level + 1, 5)
      xp += XP.validation
      add(xpRef(`validation-${session.bossId}-${target}-${session.date}${result.starPlaceId ? `-${result.starPlaceId}` : ''}`), strip<XpEntry>({ date: session.date, kind: 'validation', xp: XP.validation, bossId: session.bossId, createdAt: now() }))
      if (result.levelGained && boss) {
        const level = boss.levels[result.levelGained - 1]!
        xp += XP.level
        add(xpRef(`palier-${boss.id}-${result.levelGained}`), strip<XpEntry>({ date: session.date, kind: 'palier', xp: XP.level, bossId: boss.id, label: `${boss.name} · ${level.title}`, createdAt: now() }))
        add(userDoc('entries', `palier-${boss.id}-${result.levelGained}`), levelCard(session.date, boss.name, result.levelGained, level.title, level.criterion))
      }
      if (result.starPlaceId) {
        xp += XP.star
        add(xpRef(`etoile-${session.bossId}-${result.starPlaceId}`), strip<XpEntry>({ date: session.date, kind: 'etoile', xp: XP.star, bossId: session.bossId, createdAt: now() }))
      }
    }
  }
  send(batch.commit())

  const undo = () => {
    const back = writeBatch(db)
    for (const ref of created) back.delete(ref)
    if (result.validated) {
      if (current) back.set(userDoc('bossProgress', session.bossId), strip(current))
      else back.delete(userDoc('bossProgress', session.bossId))
    }
    send(back.commit())
  }
  return { xp, validated: result.validated, levelGained: result.levelGained, starPlaceId: result.starPlaceId, progress: result.progress, undo }
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

/** « Déjà maîtrisé » : acquiert un palier sans XP. Ne fait jamais baisser. */
export function setLevelDirectly(bossId: string, current: BossProgress | undefined, level: number): void {
  send(setDoc(userDoc('bossProgress', bossId), strip(validateDirectly(current ?? EMPTY_PROGRESS, level))))
}

/** Gain d'XP unique (première fois, quête, repos du jour) : l'identifiant fixe empêche tout doublon. */
export function awardOnce(id: string, entry: Omit<XpEntry, 'createdAt'>): void {
  send(setDoc(xpRef(id), strip<XpEntry>({ ...entry, createdAt: now() })))
}

export function removeAward(id: string): void {
  send(deleteDoc(xpRef(id)))
}
