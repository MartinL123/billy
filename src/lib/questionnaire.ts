import { SKILLS } from '../content/phrases'
import type { Trait } from '../content/training'
import { ageAt } from './age'
import type { ISODate } from './dates'

// Questionnaire de départ en 5 parties (docs/specs/questionnaire-depart.md).
// Une question par écran ; une réponse ne compte qu'après « Suivant ».

export interface Questionnaire {
  answers: Record<string, string>
  /** Le questionnaire s'est déjà ouvert une première fois. */
  startedAt?: string
  completedAt?: string
  /** Souvenirs des premières semaines notés depuis l'écran de résultat (identifiants du Carnet). */
  souvenirs?: string[]
}

export const PARTS = ['Sa fiche d’identité', 'Sa santé', 'Son quotidien', 'Comment il réagit', 'Ce qu’il sait déjà faire']

export type StepKind = 'text' | 'longtext' | 'number' | 'date' | 'choice' | 'multi' | 'photo' | 'contact' | 'meals' | 'reactions' | 'skill' | 'fin'

export interface Option {
  value: string
  label: string
}

export interface Step {
  id: string
  /** Partie, de 1 à 5. */
  part: number
  kind: StepKind
  /** La question ; `{nom}` est remplacé par le nom du chien. */
  title: string
  help?: string
  options?: Option[]
  placeholder?: string
  /** Champ texte complémentaire (« lequel ? », « marque »). */
  detail?: { key: string; label: string; placeholder?: string }
}

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ value: label, label }))

const BASE: Step[] = [
  { id: 'nom', part: 1, kind: 'text', title: 'Comment s’appelle-t-il ?' },
  { id: 'photo', part: 1, kind: 'photo', title: 'Une photo de {nom} ?', help: 'Elle vient de votre photothèque. Facultatif.' },
  { id: 'naissance', part: 1, kind: 'date', title: 'Sa date de naissance ?', help: 'Une date approximative convient.' },
  { id: 'sexe', part: 1, kind: 'choice', title: 'Mâle ou femelle ?', options: opts('Mâle', 'Femelle') },
  { id: 'sterilise', part: 1, kind: 'choice', title: 'Est-il stérilisé ?', options: opts('Oui', 'Non', 'C’est prévu') },
  { id: 'race', part: 1, kind: 'text', title: 'Sa race ou son croisement ?', placeholder: 'Labrador, croisé épagneul…' },
  { id: 'poids', part: 1, kind: 'number', title: 'Son poids actuel ?', help: 'En kilos. Il sera noté comme pesée du jour.', placeholder: '8,7' },
  { id: 'adoption', part: 1, kind: 'date', title: 'Quand l’avez-vous adopté ?' },
  { id: 'provenance', part: 1, kind: 'choice', title: 'D’où vient-il ?', options: opts('Élevage', 'Refuge ou association', 'Particulier', 'Autre') },
  { id: 'puce', part: 1, kind: 'text', title: 'Son numéro de puce ou de tatouage ?', help: 'Facultatif.', placeholder: '15 chiffres' },

  { id: 'veto', part: 2, kind: 'contact', title: 'Son vétérinaire ?', help: 'Pour l’appeler en un geste.' },
  { id: 'vaccin', part: 2, kind: 'date', title: 'Son dernier vaccin ?', help: 'Le rappel sera ajouté au calendrier.', detail: { key: 'vaccin-nom', label: 'Lequel ?', placeholder: 'CHPPiL, toux du chenil…' } },
  { id: 'rage', part: 2, kind: 'choice', title: 'Est-il vacciné contre la rage ?', help: 'Obligatoire pour voyager à l’étranger.', options: opts('Oui', 'Non') },
  { id: 'vermifuge', part: 2, kind: 'date', title: 'Son dernier vermifuge ?', help: 'Rappel tous les 3 mois.' },
  { id: 'antiparasitaire', part: 2, kind: 'date', title: 'Son dernier traitement puces et tiques ?', help: 'Rappel tous les mois.', detail: { key: 'antiparasitaire-type', label: 'Quel type ?', placeholder: 'Pipette, comprimé, collier' } },
  { id: 'sante-notes', part: 2, kind: 'longtext', title: 'Un traitement ou un souci de santé à surveiller ?', help: 'Facultatif.' },
  { id: 'allergie', part: 2, kind: 'longtext', title: 'Une allergie ?', help: 'Aliment ou médicament. Facultatif.' },

  { id: 'nourriture', part: 3, kind: 'choice', title: 'Que mange-t-il ?', options: opts('Croquettes', 'Pâtée', 'Mélange', 'Maison'), detail: { key: 'nourriture-marque', label: 'Quelle marque ?' } },
  { id: 'repas', part: 3, kind: 'meals', title: 'Combien par jour, en combien de repas ?' },
  { id: 'friandises', part: 3, kind: 'text', title: 'Ses friandises préférées ?', help: 'Elles serviront de récompense.', placeholder: 'Fromage, poulet séché…' },
  { id: 'jeux', part: 3, kind: 'multi', title: 'Ses jeux préférés ?', help: 'Touchez tout ce qu’il aime.', options: opts('Balle', 'Corde', 'Peluche', 'Os ou jouet à mâcher', 'Jouet qui couine', 'Course et poursuite', 'Autre') },
  { id: 'logement', part: 3, kind: 'choice', title: 'Où vivez-vous ?', options: opts('Appartement', 'Maison') },
  { id: 'jardin', part: 3, kind: 'choice', title: 'Avez-vous un jardin ou une cour ?', options: opts('Oui', 'Non', 'Parfois') },
  { id: 'seul', part: 3, kind: 'choice', title: 'Combien de temps reste-t-il seul par jour ?', options: opts('Jamais', 'Moins de 2 h', '2 à 4 h', 'Plus de 4 h') },
  { id: 'sorties', part: 3, kind: 'choice', title: 'Combien de sorties par jour ?', options: opts('1', '2', '3', '4 ou plus') },
  { id: 'educateur', part: 3, kind: 'contact', title: 'Avez-vous un éducateur canin ?', help: 'Facultatif.' },
  { id: 'foyer', part: 3, kind: 'choice', title: 'Qui s’occupe de lui au quotidien ?', options: opts('Seul', 'En couple', 'En famille avec enfants') },

  { id: 'reactions', part: 4, kind: 'reactions', title: 'Comment réagit-il ?', help: 'Décrivez-le avec vos mots : « Quand…, il est… »' },
  { id: 'humeur', part: 4, kind: 'choice', title: 'À la maison, il est plutôt…', options: opts('Calme', 'Joueur', 'Très excité') },
]

const SKILL_QUESTIONS: Record<string, string> = {
  lien: 'Quand vous dites son nom, il vous regarde…',
  calme: 'Il se pose tout seul sur son panier ou son tapis…',
  soins: 'Il se laisse toucher les pattes et les oreilles…',
  laisse: 'Il marche sans tirer en laisse…',
  rappel: 'Quand vous l’appelez, il revient…',
  manieres: 'Il s’assoit quand vous le demandez…',
  nouveaute: 'Devant un objet qu’il ne connaît pas, il va le renifler…',
  ville: 'Il marche tranquillement…',
  rencontres: 'Il reste détendu quand quelqu’un passe près de lui…',
  congeneres: 'Il reste détendu quand il voit un autre chien…',
}

/** Les écrans du questionnaire, dans l'ordre : identité, santé, quotidien, réactions, ce qu'il sait déjà faire. */
export const STEPS: Step[] = [
  ...BASE,
  ...SKILLS.map((skill): Step => ({ id: skill.id, part: 5, kind: 'skill', title: SKILL_QUESTIONS[skill.id] ?? skill.name })),
  { id: 'fin', part: 5, kind: 'fin', title: '' },
]

export const isSkillStep = (step: string) => SKILLS.some((s) => s.id === step)

// ——— Partie 5 : ce qu'il sait déjà faire ———

/** Réponse à « ce qu'il sait déjà faire » pour une compétence. */
export type SkillAnswer = 'non' | 'maison' | 'dehors' | 'anime' | 'partout' | 'nsp'

const SKILL_LABELS: Record<string, [string, string, string]> = {
  ville: ['Pas encore', 'Dans une rue calme', 'Même en rue animée'],
  rencontres: ['Pas encore', 'De loin', 'Même de près'],
  congeneres: ['Pas encore', 'De loin', 'Même de près'],
}

/** Les 3 réponses d'une compétence : Pas encore · À la maison · Même dehors (ou leurs équivalents). */
export function skillOptions(bossId: string): { value: SkillAnswer; label: string }[] {
  const [no, home, out] = SKILL_LABELS[bossId] ?? ['Pas encore', 'À la maison', 'Même dehors']
  return [
    { value: 'non', label: no },
    { value: 'maison', label: home },
    { value: 'dehors', label: out },
  ]
}

/** Questions complémentaires pour un chien âgé ou déjà éduqué : elles donnent les étapes 4 et 5. */
export const FOLLOW_UPS: { value: SkillAnswer; question: string }[] = [
  { value: 'anime', question: 'Même dans un lieu très animé ?' },
  { value: 'partout', question: 'Partout où vous allez ?' },
]

/** Étapes acquises d'après la réponse : à la maison → 1 et 2 ; même dehors → 1 à 3 ; lieu animé → 4 ; partout → 5. */
export function stepsForAnswer(answer: string | undefined): number {
  return answer === 'partout' ? 5 : answer === 'anime' ? 4 : answer === 'dehors' ? 3 : answer === 'maison' ? 2 : 0
}

/** La réponse qui correspond aux étapes cochées sur l'écran de résultat. */
export function answerForSteps(steps: number): SkillAnswer {
  return steps >= 5 ? 'partout' : steps === 4 ? 'anime' : steps === 3 ? 'dehors' : steps === 2 ? 'maison' : 'non'
}

// ——— Partie 4 : comment il réagit ———

export type ReactionLevel = 'aise' | 'inquiet' | 'peur'

export interface Reaction {
  situation: string
  /** À l'aise, un peu inquiet, il a peur ou il réagit — ou un texte libre. */
  reaction: ReactionLevel | string
  /** Compétence concernée, quand la situation en a une. */
  bossId?: string
}

export const REACTION_LEVELS: { value: ReactionLevel; label: string }[] = [
  { value: 'aise', label: 'À l’aise' },
  { value: 'inquiet', label: 'Un peu inquiet' },
  { value: 'peur', label: 'Il a peur ou il réagit' },
]

/** Situations proposées, chacune reliée à sa compétence. */
export const SITUATIONS: { text: string; bossId: string }[] = [
  { text: 'il croise un adulte inconnu', bossId: 'rencontres' },
  { text: 'il croise des enfants', bossId: 'rencontres' },
  { text: 'il croise un autre chien', bossId: 'congeneres' },
  { text: 'il entend les bruits de la ville', bossId: 'ville' },
  { text: 'il passe dans une rue étroite', bossId: 'ville' },
  { text: 'il prend les transports', bossId: 'ville' },
  { text: 'il voit son reflet', bossId: 'nouveaute' },
  { text: 'il découvre un objet nouveau', bossId: 'nouveaute' },
  { text: 'il monte en voiture', bossId: 'nouveaute' },
  { text: 'il y a un orage', bossId: 'nouveaute' },
  { text: 'il monte un escalier', bossId: 'nouveaute' },
  { text: 'on lui touche les pattes ou les oreilles', bossId: 'soins' },
  { text: 'il va chez le véto', bossId: 'soins' },
  { text: 'il reste seul', bossId: 'calme' },
]

export const situationSkill = (situation: string): string | undefined => SITUATIONS.find((s) => s.text === situation)?.bossId

/** « Quand il croise des enfants, il a peur. » */
export function reactionSentence({ situation, reaction }: Reaction): string {
  const words = reaction === 'aise' ? 'il est à l’aise' : reaction === 'inquiet' ? 'il est un peu inquiet' : reaction === 'peur' ? 'il a peur' : `il est ${reaction}`
  return `Quand ${situation}, ${words}.`
}

/** Les anciennes cases « ce qui lui fait peur » deviennent des phrases, à confirmer. */
const OLD_FEARS: Record<string, string> = {
  'Les enfants': 'il croise des enfants',
  'Les inconnus': 'il croise un adulte inconnu',
  'Les autres chiens': 'il croise un autre chien',
  'La circulation': 'il entend les bruits de la ville',
  'Les bruits forts': 'il entend les bruits de la ville',
  'Les rues étroites': 'il passe dans une rue étroite',
  'Son reflet': 'il voit son reflet',
  'Rester seul': 'il reste seul',
}

export function reactionsFromFears(fears: string[]): Reaction[] {
  const situations = [...new Set(fears.map((f) => OLD_FEARS[f]).filter((s): s is string => Boolean(s)))]
  return situations.map((situation) => ({ situation, reaction: 'peur', bossId: situationSkill(situation) }))
}

const afraid = (reactions: Reaction[]) => reactions.filter((r) => r.reaction === 'peur')

/** Compétences liées à une peur déclarée : elles démarrent à leur première étape, et sont conseillées. */
export const fearSkills = (reactions: Reaction[]): string[] => [...new Set(afraid(reactions).flatMap((r) => (r.bossId ? [r.bossId] : [])))]

/** Âge à partir duquel un chien est considéré âgé. */
const SENIOR_YEARS = 8

/** « C'est un chiot » se déduit de la date de naissance : moins de 6 mois. */
export const isPuppy = (birthDate: ISODate, today: ISODate) => {
  const age = ageAt(birthDate, today)
  return age.years === 0 && age.months < 6
}

/**
 * Plus d'étiquettes à cocher : l'app déduit. Deux peurs ou plus → chien craintif ; « très excité » → énergique ;
 * peur des autres chiens → réactif ; chiot et âgé viennent de la date de naissance.
 * Les traits que le questionnaire ne sait pas déduire (adopté adulte) sont conservés.
 */
export function deriveTraits(existing: Trait[], reactions: Reaction[], mood: string | undefined, birthDate: ISODate, today: ISODate): Trait[] {
  const kept = existing.filter((t) => t === 'adopte-adulte')
  const fears = afraid(reactions)
  const derived: Trait[] = []
  if (isPuppy(birthDate, today)) derived.push('chiot')
  if (fears.length >= 2) derived.push('craintif')
  if (mood === 'Très excité') derived.push('energique')
  if (fears.some((r) => r.bossId === 'congeneres')) derived.push('reactif-chiens')
  if (ageAt(birthDate, today).years >= SENIOR_YEARS) derived.push('senior')
  return [...new Set([...derived, ...kept])]
}

// ——— Avancement ———

/** Les réponses données à l'ancien questionnaire restent valides quand elles ont un équivalent. */
export function normalizeAnswers(answers: Record<string, string>): Record<string, string> {
  if (!answers.identite) return answers
  const fromOld = { nom: 'ok', naissance: 'ok', race: 'ok', adoption: 'ok' }
  return { ...fromOld, ...answers }
}

export interface QuestionnaireStatus {
  answered: number
  total: number
  complete: boolean
  /** Premier écran sans réponse (0 si tout est répondu). */
  resumeAt: number
}

export function questionnaireStatus(questionnaire: Questionnaire | undefined): QuestionnaireStatus {
  const answers = normalizeAnswers(questionnaire?.answers ?? {})
  const answered = STEPS.filter((s) => answers[s.id] !== undefined).length
  const first = STEPS.findIndex((s) => answers[s.id] === undefined)
  return { answered, total: STEPS.length, complete: Boolean(questionnaire?.completedAt) && first === -1, resumeAt: first === -1 ? 0 : first }
}

/** « À compléter · 6 réponses sur 40 » ou « Complété · revoir mes réponses ». */
export function statusLabel(status: QuestionnaireStatus): string {
  if (status.complete) return 'Complété · revoir mes réponses'
  if (status.answered === 0) return `À compléter · ${status.total} questions`
  return `À compléter · ${status.answered} réponse${status.answered > 1 ? 's' : ''} sur ${status.total}`
}
