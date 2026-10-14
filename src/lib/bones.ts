import type { ISODate } from './dates'

// Les os : la monnaie de l'effort du maître (spec V3 § 2 bis). On en gagne, on n'en perd jamais
// (ni par une correction, ni par un mauvais jour). Seul un achat dans la boutique en dépense, par choix.
// Chaque gain a un identifiant fixe : il ne peut pas être compté deux fois.

export const BONES = {
  /** Mission du jour faite. */
  mission: 10,
  /** Noter un moment, 3 fois par jour au maximum. */
  note: 3,
  /** Une réussite sur l'étape en cours (« Oui »). */
  success: 5,
  /** Nouvelle étape acquise dans l'app (jamais les étapes « Il savait déjà »). */
  step: 25,
  /** Défi de la semaine réussi. */
  challenge: 30,
  /** Semaine régulière : au moins 5 jours notés sur 7. */
  regularWeek: 20,
  /** Jour de repos respecté. */
  rest: 5,
  /** Questionnaire de départ terminé, une fois. */
  questionnaire: 50,
}

export const NOTES_PER_DAY = 3
export const REGULAR_DAYS = 5

export type BoneReason = 'mission' | 'note' | 'reussite' | 'etape' | 'defi' | 'semaine' | 'repos' | 'questionnaire' | 'achat'

/** users/{uid}/bones/{id} */
export interface Bone {
  date: ISODate
  amount: number
  reason: BoneReason
  /** Ce qui a rapporté (ou coûté) ces os : moment, étape, semaine, objet… */
  refId: string
}

export type BoneWithId = Bone & { id: string }

export const boneId = (reason: BoneReason, refId: string) => `${reason}-${refId}`
const bone = (reason: BoneReason, refId: string, date: ISODate, amount: number): BoneWithId => ({ id: boneId(reason, refId), date, amount, reason, refId })

/** Solde : tous les gains, moins ce qui a été dépensé dans la boutique. */
export const balance = (bones: { amount: number }[]): number => bones.reduce((sum, b) => sum + b.amount, 0)

/** Os déjà gagnés (sans les achats). */
export const earned = (bones: { amount: number; reason: string }[]): number => bones.filter((b) => b.reason !== 'achat').reduce((sum, b) => sum + b.amount, 0)

/**
 * Os d'un moment noté : +3 (jusqu'à 3 moments par jour), +5 par réussite sur l'étape en cours, +25 par étape acquise.
 * Les photos ne rapportent rien. `existing` = os déjà enregistrés (pour le plafond du jour).
 */
export function momentBones(entryId: string, date: ISODate, validated: { bossId: string; level: number }[], stepsGained: { bossId: string; level: number }[], existing: Bone[]): BoneWithId[] {
  const out: BoneWithId[] = []
  const notesToday = existing.filter((b) => b.reason === 'note' && b.date === date).length
  if (notesToday < NOTES_PER_DAY) out.push(bone('note', entryId, date, BONES.note))
  for (const { bossId, level } of validated) out.push(bone('reussite', `${bossId}-${level}-${date}`, date, BONES.success))
  for (const { bossId, level } of stepsGained) out.push(bone('etape', `${bossId}-${level}`, date, BONES.step))
  return out
}

/** Mission du jour faite : +10 ; une journée de repos respectée rapporte en plus +5. */
export function missionBones(date: ISODate, rest: boolean): BoneWithId[] {
  return [bone('mission', date, date, BONES.mission), ...(rest ? [bone('repos', date, date, BONES.rest)] : [])]
}

export const challengeBone = (week: ISODate, date: ISODate) => bone('defi', week, date, BONES.challenge)
export const questionnaireBone = (date: ISODate) => bone('questionnaire', 'depart', date, BONES.questionnaire)

/** Semaine régulière : dès que 5 jours de la semaine ont un moment noté. */
export function regularWeekBone(week: ISODate[], notedDays: ISODate[], date: ISODate): BoneWithId | undefined {
  const days = week.filter((d) => notedDays.includes(d)).length
  return days >= REGULAR_DAYS ? bone('semaine', week[0]!, date, BONES.regularWeek) : undefined
}

/** Un achat dans la boutique : la seule façon de dépenser des os. Une fois par objet. */
export const purchaseBone = (itemId: string, price: number, date: ISODate) => bone('achat', itemId, date, -price)

/** Libellés de « Comment gagner des os ». */
export const HOW_TO_EARN: { label: string; amount: number }[] = [
  { label: 'Mission du jour faite', amount: BONES.mission },
  { label: 'Noter un moment (3 par jour)', amount: BONES.note },
  { label: 'Une réussite sur l’étape en cours', amount: BONES.success },
  { label: 'Nouvelle étape acquise', amount: BONES.step },
  { label: 'Défi de la semaine réussi', amount: BONES.challenge },
  { label: 'Semaine régulière (5 jours notés)', amount: BONES.regularWeek },
  { label: 'Jour de repos respecté', amount: BONES.rest },
  { label: 'Questionnaire de départ terminé', amount: BONES.questionnaire },
]
