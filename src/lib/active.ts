import { isFearSkill, SKILLS } from '../content/phrases'
import { MAX_LEVEL, type Trait } from '../content/training'
import type { ProgressMap } from './bossProgress'
import { diffDays, type ISODate } from './dates'
import { suggestedBosses } from './traits'

/** Le maître travaille 3 compétences à la fois, au maximum. */
export const MAX_ACTIVE = 3

const mastered = (progress: ProgressMap, id: string) => (progress[id]?.level ?? 0) >= MAX_LEVEL

/**
 * Les compétences en cours. Celles choisies par le maître (`dog.activeSkills`), sinon les 3 premières non maîtrisées
 * dans l'ordre conseillé par le questionnaire. Une compétence maîtrisée n'est jamais « en cours » : elle se révise.
 */
export function activeSkills(chosen: string[] | undefined, traits: Trait[], progress: ProgressMap): string[] {
  const known = (id: string) => SKILLS.some((s) => s.id === id)
  if (chosen) return chosen.filter((id) => known(id) && !mastered(progress, id)).slice(0, MAX_ACTIVE)
  const order = [...new Set([...suggestedBosses(traits), ...SKILLS.map((s) => s.id)])]
  return order.filter((id) => known(id) && !mastered(progress, id)).slice(0, MAX_ACTIVE)
}

/** Ajoute ou retire une compétence du choix. Une 4e est refusée : il faut d'abord en décocher une. */
export function toggleActive(chosen: string[], id: string): { chosen: string[]; refused: boolean } {
  if (chosen.includes(id)) return { chosen: chosen.filter((c) => c !== id), refused: false }
  if (chosen.length >= MAX_ACTIVE) return { chosen, refused: true }
  return { chosen: [...chosen, id], refused: false }
}

/** Ce qui lui fait peur (questionnaire) → la compétence concernée, et la phrase affichée. */
const FEAR_LINKS: { match: RegExp; bossId: string; hint: string }[] = [
  { match: /enfant/i, bossId: 'rencontres', hint: 'il a peur des enfants' },
  { match: /inconnu/i, bossId: 'rencontres', hint: 'il a peur des inconnus' },
  { match: /chien/i, bossId: 'congeneres', hint: 'il a peur des autres chiens' },
  { match: /rues? étroite/i, bossId: 'ville', hint: 'il se bloque dans les rues étroites' },
  { match: /circulation/i, bossId: 'ville', hint: 'il a peur de la circulation' },
  { match: /bruit/i, bossId: 'ville', hint: 'il a peur des bruits de la ville' },
  { match: /transports/i, bossId: 'ville', hint: 'il a peur dans les transports' },
  { match: /objet|voiture|orage|escalier/i, bossId: 'nouveaute', hint: 'la nouveauté l’inquiète' },
  { match: /reflet/i, bossId: 'nouveaute', hint: 'il a peur de son reflet' },
  { match: /seul/i, bossId: 'calme', hint: 'il n’aime pas rester seul' },
  { match: /pattes|oreilles|véto/i, bossId: 'soins', hint: 'il n’aime pas être manipulé' },
]

export interface SkillHint {
  kind: 'conseille' | 'doux'
  text: string
}

interface CareEvent {
  type: string
  date: ISODate | ''
  done: boolean
}

/** Une visite chez le vétérinaire dans les 30 jours rend Les Soins utiles maintenant. */
const VET_SOON_DAYS = 30

/**
 * Indications de l'écran « En cours », calculées sans IA :
 * « Tout doux » sur une compétence liée à une peur déclarée au questionnaire,
 * « Conseillé » pour Les Soins avant une visite véto du calendrier, et pour les compétences conseillées par le questionnaire.
 */
export function skillHints(fears: string[], traits: Trait[], events: CareEvent[], today: ISODate): Record<string, SkillHint | undefined> {
  const hints: Record<string, SkillHint | undefined> = {}
  for (const id of suggestedBosses(traits).slice(0, 3)) if (!isFearSkill(id)) hints[id] = { kind: 'conseille', text: 'Conseillé : une bonne base pour lui' }
  const vet = events.some((e) => !e.done && (e.type === 'veto' || e.type === 'vaccin') && e.date && diffDays(today, e.date) >= 0 && diffDays(today, e.date) <= VET_SOON_DAYS)
  if (vet) hints.soins = { kind: 'conseille', text: 'Conseillé : utile avant sa prochaine visite chez le véto' }
  for (const fear of fears) {
    const link = FEAR_LINKS.find((l) => l.match.test(fear))
    if (link && !hints[link.bossId]?.text.startsWith('Tout doux')) hints[link.bossId] = { kind: 'doux', text: `Tout doux : ${link.hint}` }
  }
  return hints
}
