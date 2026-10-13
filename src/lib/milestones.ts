import { addMonths, isValidISO, parseISO, type ISODate } from './dates'
import { nextAnnual } from './recurrence'

interface Milestone {
  title: string
  type: 'etape'
  date: ISODate
  recurrence: 'none' | 'yearly'
  done: false
}

const milestone = (title: string, date: ISODate, recurrence: Milestone['recurrence']): Milestone => ({ title, type: 'etape', date, recurrence, done: false })

/**
 * Les étapes de vie d'un chien, à partir des dates données au questionnaire de départ :
 * son anniversaire, ses 6 mois et son 1 an s'ils sont encore à venir, l'anniversaire de son adoption.
 * Les identifiants sont fixes : les recréer ne fait jamais de doublon.
 */
export function lifeMilestones(name: string, { birth, adoption }: { birth?: ISODate; adoption?: ISODate }, today: ISODate): Record<string, Milestone> {
  const out: Record<string, Milestone> = {}
  if (birth && isValidISO(birth)) {
    const { m, d } = parseISO(birth)
    out['seed-anniversaire'] = milestone(`Anniversaire de ${name}`, nextAnnual(m, d, today), 'yearly')
    const sixMonths = addMonths(birth, 6)
    const oneYear = addMonths(birth, 12)
    if (sixMonths >= today) out['seed-6-mois'] = milestone(`${name} a 6 mois`, sixMonths, 'none')
    if (oneYear >= today) out['seed-1-an'] = milestone(`${name} a 1 an`, oneYear, 'none')
  }
  if (adoption && isValidISO(adoption)) {
    const { m, d } = parseISO(adoption)
    out['seed-adoption'] = milestone("Anniversaire d'adoption", nextAnnual(m, d, today), 'yearly')
  }
  return out
}
