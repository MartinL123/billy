import { addMonths, isValidISO, parseISO, type ISODate } from './dates'
import { nextAnnual } from './recurrence'
import { ofName } from './gender'

interface Milestone {
  title: string
  type: 'etape'
  date: ISODate
  recurrence: 'none' | 'yearly'
  done: false
}

const milestone = (title: string, date: ISODate, recurrence: Milestone['recurrence']): Milestone => ({ title, type: 'etape', date, recurrence, done: false })

/**
 * Les étapes de vie d’un chien, à partir des dates données au questionnaire de départ :
 * son anniversaire, ses 6 mois et son 1 an s’ils sont encore à venir, l’anniversaire de son adoption.
 * Les identifiants sont fixes : les recréer ne fait jamais de doublon.
 */
export function lifeMilestones(name: string, { birth, adoption }: { birth?: ISODate; adoption?: ISODate }, today: ISODate): Record<string, Milestone> {
  const out: Record<string, Milestone> = {}
  if (birth && isValidISO(birth)) {
    const { m, d } = parseISO(birth)
    const sixMonths = addMonths(birth, 6)
    const oneYear = addMonths(birth, 12)
    if (sixMonths >= today) out['seed-6-mois'] = milestone(`${name} a 6 mois`, sixMonths, 'none')
    if (oneYear >= today) out['seed-1-an'] = milestone(`${name} a 1 an`, oneYear, 'none')
    // R-074 : le premier anniversaire est déjà « … a 1 an » : l’anniversaire qui revient chaque année part du suivant.
    const next = nextAnnual(m, d, today)
    out['seed-anniversaire'] = milestone(`Anniversaire ${ofName(name)}`, oneYear >= today && next === oneYear ? addMonths(birth, 24) : next, 'yearly')
  }
  if (adoption && isValidISO(adoption)) {
    const { m, d } = parseISO(adoption)
    out['seed-adoption'] = milestone("Anniversaire d’adoption", nextAnnual(m, d, today), 'yearly')
  }
  return out
}

/**
 * R-074, comptes d’avant : l’anniversaire annuel tombe le même jour que « … a 1 an » (deux lignes pour un seul
 * jour). Renvoie la nouvelle date de l’anniversaire (l’année suivante), ou rien s’il n’y a pas de doublon.
 */
export function birthdayFix(events: { id: string; date: ISODate | ''; done?: boolean }[]): { id: string; date: ISODate } | undefined {
  const oneYear = events.find((e) => e.id === 'seed-1-an')
  const birthday = events.find((e) => e.id === 'seed-anniversaire')
  if (!oneYear?.date || !birthday?.date || birthday.done || birthday.date !== oneYear.date) return undefined
  return { id: birthday.id, date: addMonths(birthday.date, 12) }
}
