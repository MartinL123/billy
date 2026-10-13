import { addMonths, type ISODate } from '../lib/dates'
import { nextAnnual } from '../lib/recurrence'
import type { BillyEvent, Dog } from './types'

const BIRTH: ISODate = '2026-05-13'
const ADOPTION: ISODate = '2026-09-19'

/**
 * Profil et dates clés du premier lancement (docs/spec-v1.md).
 * Les identifiants sont fixes : relancer le seed ne crée jamais de doublon.
 */
export function buildSeed(today: ISODate): { dog: Dog; events: Record<string, BillyEvent> } {
  const milestone = (title: string, date: ISODate, recurrence: BillyEvent['recurrence']): BillyEvent => ({
    title,
    type: 'etape',
    date,
    recurrence,
    done: false,
  })
  return {
    dog: { name: 'Billy', birthDate: BIRTH, breed: 'Croisé épagneul × labrador', adoptionDate: ADOPTION },
    events: {
      'seed-anniversaire': milestone('Anniversaire de Billy', nextAnnual(5, 13, today), 'yearly'),
      'seed-6-mois': milestone('Billy a 6 mois', addMonths(BIRTH, 6), 'none'),
      'seed-1-an': milestone('Billy a 1 an', addMonths(BIRTH, 12), 'none'),
      'seed-adoption': milestone("Anniversaire d'adoption", nextAnnual(9, 19, today), 'yearly'),
      // Date à compléter : celle de la dernière injection + 1 an.
      'seed-vaccin-chppil': { title: 'Rappel vaccin CHPPiL', type: 'vaccin', date: '', recurrence: 'yearly', done: false },
    },
  }
}
