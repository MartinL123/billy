import { addMonths, diffDays, isValidISO, parseISO, type ISODate } from './dates'

export interface Age {
  years: number
  months: number
  days: number
}

/**
 * Âge exact au jour près. Un « mois » est atteint le même quantième que la naissance,
 * ramené au dernier jour du mois s’il n’existe pas (né un 31 → 1 mois le 28/29 févr.).
 */
export function ageAt(birth: ISODate, today: ISODate): Age {
  if (diffDays(birth, today) < 0) return { years: 0, months: 0, days: 0 }
  const b = parseISO(birth)
  const t = parseISO(today)
  let total = (t.y - b.y) * 12 + (t.m - b.m)
  if (diffDays(addMonths(birth, total), today) < 0) total -= 1
  return {
    years: Math.floor(total / 12),
    months: total % 12,
    days: diffDays(addMonths(birth, total), today),
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const years = (n: number) => plural(n, 'an', 'ans')
const months = (n: number) => `${n} mois`
const days = (n: number) => plural(n, 'jour', 'jours')

function join(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`
}

/** « 5 mois et 3 jours », « 5 mois tout pile », « 1 an et 2 mois », « 12 jours » */
export function formatAge(birth: ISODate, today: ISODate): string {
  const age = ageAt(birth, today)
  if (age.years === 0 && age.months === 0) {
    return age.days === 0 ? "Né aujourd’hui" : days(age.days)
  }
  const parts: string[] = []
  if (age.years > 0) parts.push(years(age.years))
  if (age.months > 0) parts.push(months(age.months))
  if (age.days === 0) return `${join(parts)} tout pile`
  parts.push(days(age.days))
  return join(parts)
}

/** Version courte pour le profil : « 5 mois », « 1 an et 2 mois » */
export function formatAgeShort(birth: ISODate, today: ISODate): string {
  // Date de naissance pas encore donnée (questionnaire de départ) : pas d’âge à afficher.
  if (!isValidISO(birth)) return ''
  const age = ageAt(birth, today)
  if (age.years === 0 && age.months === 0) return days(age.days)
  const parts: string[] = []
  if (age.years > 0) parts.push(years(age.years))
  if (age.months > 0) parts.push(months(age.months))
  return join(parts)
}

/**
 * Message de célébration, seulement le jour même d’une étape de vie : ses 6 mois,
 * chaque anniversaire, et l’anniversaire d’adoption. `undefined` les autres jours.
 */
export function milestoneMessage(
  name: string,
  birth: ISODate,
  adoption: ISODate | undefined,
  today: ISODate,
): string | undefined {
  if (!isValidISO(birth)) return undefined
  const age = ageAt(birth, today)
  const totalMonths = age.years * 12 + age.months
  if (age.days === 0 && totalMonths > 0) {
    if (age.months === 0) {
      return `Joyeux anniversaire ${name} ! ${years(age.years)} aujourd’hui.`
    }
    // Les autres mois sont déjà dits dans la carte du chien (« 5 mois · 6 mois le 13 novembre ») : on ne les répète pas.
    if (totalMonths === 6) return `${name} a 6 mois aujourd’hui !`
  }
  if (adoption && isValidISO(adoption)) {
    const since = ageAt(adoption, today)
    if (since.days === 0 && since.months === 0 && since.years > 0) {
      return `Ça fait ${years(since.years)} que ${name} est arrivé à la maison.`
    }
  }
  return undefined
}

/** Prochaine étape de vie : chaque mois jusqu’à 1 an, puis chaque anniversaire. « 6 mois », le 2026-11-13. */
export function nextLifeStep(birth: ISODate, today: ISODate): { label: string; date: ISODate } | undefined {
  if (!isValidISO(birth)) return undefined
  const age = ageAt(birth, today)
  const total = age.years * 12 + age.months
  if (total < 11) return { label: months(total + 1), date: addMonths(birth, total + 1) }
  return { label: years(age.years + 1), date: addMonths(birth, (age.years + 1) * 12) }
}
