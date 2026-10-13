import { addMonths, type ISODate } from '../lib/dates'
import type { Trait } from '../content/training'
import type { Feeding } from '../lib/feeding'
import { nextAnnual } from '../lib/recurrence'
import type { BillyEvent, Dog } from './types'

const BIRTH: ISODate = '2026-05-13'
const ADOPTION: ISODate = '2026-09-19'

/** Version courante des données de départ. À augmenter quand on en ajoute. */
export const SEED_VERSION = 3

/** Traits de Billy : chiot et craintif (docs/spec-v2-dressage.md, § 5). */
export const DEFAULT_TRAITS: Trait[] = ['chiot', 'craintif']

export const DEFAULT_FEEDING: Feeding = {
  gramsPerDay: 300,
  meals: [
    { label: 'Au réveil', time: '08:00' },
    { label: 'Après-midi', time: '14:00' },
    { label: 'Soir', time: '21:00' },
  ],
}

/** Dernière injection de primo-vaccination : le rappel annuel se cale dessus. */
const LAST_PRIMO: ISODate = '2026-09-21'
export const VACCINE_REMINDER_ID = 'seed-vaccin-chppil'
export const VACCINE_REMINDER_DATE = addMonths(LAST_PRIMO, 12)

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
    dog: {
      name: 'Billy',
      birthDate: BIRTH,
      breed: 'Croisé épagneul × labrador',
      adoptionDate: ADOPTION,
      feeding: DEFAULT_FEEDING,
      traits: DEFAULT_TRAITS,
      seedVersion: SEED_VERSION,
    },
    events: {
      'seed-anniversaire': milestone('Anniversaire de Billy', nextAnnual(5, 13, today), 'yearly'),
      'seed-6-mois': milestone('Billy a 6 mois', addMonths(BIRTH, 6), 'none'),
      'seed-1-an': milestone('Billy a 1 an', addMonths(BIRTH, 12), 'none'),
      'seed-adoption': milestone("Anniversaire d'adoption", nextAnnual(9, 19, today), 'yearly'),
      [VACCINE_REMINDER_ID]: {
        title: 'Rappel vaccin CHPPiL',
        type: 'vaccin',
        date: VACCINE_REMINDER_DATE,
        recurrence: 'yearly',
        notes: 'Un an après la 3e injection du 21 septembre 2026. Date à confirmer avec le vétérinaire.',
        done: false,
      },
      ...healthHistory(),
    },
  }
}

/**
 * Soins déjà faits avant l'installation de l'app (donnés par Martin le 13/10/2026),
 * et les prochains qui en découlent.
 */
export function healthHistory(): Record<string, BillyEvent> {
  const done = (event: Omit<BillyEvent, 'done' | 'doneAt'>): BillyEvent => ({ ...event, done: true, doneAt: event.date || undefined })
  return {
    'hist-vaccin-1': done({
      title: 'Primo-vaccination CHPPiL, 1re injection',
      type: 'vaccin',
      date: '',
      recurrence: 'none',
      notes: 'Juin ou juillet 2026 : date exacte à retrouver dans le carnet de santé.',
    }),
    'hist-vaccin-2': done({ title: 'Primo-vaccination CHPPiL, 2e injection', type: 'vaccin', date: '2026-08-01', recurrence: 'none' }),
    'hist-vaccin-3': done({ title: 'Primo-vaccination CHPPiL, 3e injection', type: 'vaccin', date: LAST_PRIMO, recurrence: 'none' }),
    'hist-antiparasitaire-chenil': done({
      title: 'Antiparasitaire (au chenil)',
      type: 'antiparasitaire',
      date: '',
      recurrence: 'none',
      notes: "Donné au chenil avant l'adoption, date inconnue.",
    }),
    'hist-vermifuge': { ...done({ title: 'Vermifuge', type: 'vermifuge', date: '2026-09-27', recurrence: 'quarterly' }), nextId: 'hist-vermifuge-suivant' },
    'hist-vermifuge-suivant': { title: 'Vermifuge', type: 'vermifuge', date: '2026-12-27', recurrence: 'quarterly', done: false },
    'hist-puces-tiques': {
      ...done({ title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-09-25', recurrence: 'monthly', notes: 'Protection d\'un mois.' }),
      nextId: 'hist-puces-tiques-suivant',
    },
    'hist-puces-tiques-suivant': { title: 'Antiparasitaire puces et tiques', type: 'antiparasitaire', date: '2026-10-25', recurrence: 'monthly', done: false },
  }
}
