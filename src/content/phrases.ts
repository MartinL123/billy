import { bossById, BOSSES, type Boss, type Tier } from './training'

// Ce que voit le joueur (docs/specs/spec-v3-simplification.md) : chaque étape est une phrase concrète,
// jamais un numéro. Les phrases commencent par un verbe : « Billy revient… », « Prochaine étape : revient… ».
// Rédigées pour l'app, à faire relire par l'éducateur.

interface SkillText {
  /** Une phrase par étape, de la plus facile à la plus difficile. */
  steps: [string, string, string, string, string]
  /** Les mêmes étapes en plus court, pour les badges de l'arbre : toujours avec les mots de la phrase complète. */
  short: [string, string, string, string, string]
  /** Question du questionnaire de départ, à compléter par « à la maison » ou « même dehors ». */
  question: string
  /** Ce que veut dire « À la maison » pour cette compétence. */
  atHome: string
  /** Ce que veut dire « Même dehors ». */
  outside: string
}

const TEXTS: Record<string, SkillText> = {
  lien: {
    steps: ['Regarde quand on l’appelle, à la maison au calme', 'Regarde quand on l’appelle, même occupé', 'Regarde quand on l’appelle dans une rue calme', 'Regarde quand on l’appelle malgré des passants', 'Regarde quand on l’appelle, partout'],
    short: ['Regarde quand on l’appelle, au calme', 'Regarde quand on l’appelle, même occupé', 'Regarde quand on l’appelle, rue calme', 'Regarde quand on l’appelle malgré des passants', 'Regarde quand on l’appelle, partout'],
    question: 'Quand vous dites son nom, {nom} vous regarde…',
    atHome: 'Même quand il est occupé',
    outside: 'Dans une rue calme',
  },
  calme: {
    steps: ['Se pose sur son tapis une demi-minute', 'Reste sur son tapis quand la maison s’active', 'Se pose sur son tapis dehors, au calme', 'Se pose sur un banc malgré le passage', 'Se pose partout où l’on s’arrête'],
    short: ['Se pose sur son tapis', 'Reste sur son tapis, maison qui s’active', 'Se pose sur son tapis dehors', 'Se pose sur un banc malgré le passage', 'Se pose partout'],
    question: '{nom} sait se poser sur son tapis…',
    atHome: 'Même quand ça bouge autour de lui',
    outside: 'Dehors, dans un endroit calme',
  },
  soins: {
    steps: ['Se laisse toucher les pattes et les oreilles', 'Se laisse brosser et essuyer les pattes', 'Se laisse manipuler par une autre personne', 'Reste à l’aise pendant l’examen chez le véto', 'Se laisse soigner partout, par tout le monde'],
    short: ['Se laisse toucher les pattes et les oreilles', 'Se laisse brosser et essuyer', 'Se laisse manipuler par une autre personne', 'Reste à l’aise chez le véto', 'Se laisse soigner partout'],
    question: '{nom} se laisse manipuler…',
    atHome: 'Brossage, pattes, oreilles',
    outside: 'Par une autre personne, ailleurs',
  },
  laisse: {
    steps: ['Marche quelques pas sans tirer, dans le salon', 'Suit les changements de direction au jardin', 'Marche sans tirer dans une rue calme', 'Marche sans tirer malgré les passants et les odeurs', 'Marche sans tirer partout'],
    short: ['Marche quelques pas sans tirer', 'Suit les changements de direction', 'Marche sans tirer, rue calme', 'Marche sans tirer malgré les passants', 'Marche sans tirer partout'],
    question: 'En laisse, {nom} marche sans tirer…',
    atHome: 'Au jardin ou dans la cour',
    outside: 'Dans une rue calme',
  },
  rappel: {
    steps: ['Revient quand on l’appelle d’une autre pièce', 'Revient quand on l’appelle, même en laissant un jouet', 'Revient quand on l’appelle dans un parc calme', 'Revient malgré un autre chien au loin', 'Revient quand on l’appelle, partout'],
    short: ['Revient d’une autre pièce', 'Revient même en laissant un jouet', 'Revient dans un parc calme', 'Revient malgré un autre chien', 'Revient partout'],
    question: 'Quand vous l’appelez, {nom} revient…',
    atHome: 'Il revient d’une autre pièce',
    outside: 'Au parc, à quelques mètres',
  },
  manieres: {
    steps: ['S’assoit et se couche à la demande', 'Reste en place et attend à la porte', 'S’assoit, se couche et reste, dehors au calme', 'Ne saute pas sur les gens qui arrivent', 'Garde ses bonnes manières partout'],
    short: ['S’assoit et se couche', 'Reste en place, attend à la porte', 'S’assoit, se couche et reste, dehors', 'Ne saute pas sur les gens', 'Garde ses bonnes manières partout'],
    question: 'Assis, couché, pas bouger : {nom} le fait…',
    atHome: 'Et il attend à la porte',
    outside: 'Dans un endroit calme',
  },
  nouveaute: {
    steps: ['Explore un objet nouveau à la maison', 'Reste détendu devant un son ou un reflet nouveau', 'Explore une nouveauté dehors, au calme', 'Reste à l’aise devant une nouveauté dans un lieu animé', 'Aborde la nouveauté sereinement, partout'],
    short: ['Explore un objet nouveau', 'Reste détendu devant un son ou un reflet', 'Explore une nouveauté dehors', 'Reste à l’aise dans un lieu animé', 'Aborde la nouveauté sereinement'],
    question: 'Devant un objet ou un bruit nouveau, {nom} reste à l’aise…',
    atHome: 'Objets, sols et sons de la maison',
    outside: 'Dans un endroit calme',
  },
  ville: {
    steps: ['Écoute les bruits de la ville en mangeant', 'Regarde la rue par la fenêtre, détendu', 'Se promène dix minutes dans une rue calme', 'Se promène dans une rue animée ou étroite', 'Se promène en ville, dans tous les quartiers'],
    short: ['Écoute les bruits de la ville', 'Regarde la rue par la fenêtre', 'Se promène dans une rue calme', 'Se promène dans une rue animée', 'Se promène en ville, tous les quartiers'],
    question: 'En ville, {nom} est à l’aise…',
    atHome: 'Il regarde la rue par la fenêtre',
    outside: 'Dans une rue calme',
  },
  rencontres: {
    steps: ['Reste détendu quand un proche entre', 'Regarde les passants par la fenêtre, détendu', 'Croise des passants à distance, à l’aise', 'Reste à l’aise quand un inconnu nous parle', 'Reste à l’aise avec les inconnus, partout'],
    short: ['Reste détendu quand un proche entre', 'Regarde les passants, détendu', 'Croise des passants à distance', 'Reste à l’aise quand un inconnu parle', 'Reste à l’aise avec les inconnus'],
    question: 'Avec les gens qu’il ne connaît pas, {nom} est à l’aise…',
    atHome: 'Quand quelqu’un vient à la maison',
    outside: 'En croisant des passants à distance',
  },
  congeneres: {
    steps: ['Reste détendu en entendant un chien', 'Regarde un chien par la fenêtre sans s’agiter', 'Croise un chien de loin, au calme', 'Croise un chien dans la rue poliment', 'Croise les autres chiens sereinement, partout'],
    short: ['Reste détendu en entendant un chien', 'Regarde un chien par la fenêtre', 'Croise un chien de loin', 'Croise un chien poliment', 'Croise les chiens sereinement'],
    question: 'Quand il voit un autre chien, {nom} reste calme…',
    atHome: 'Depuis la maison ou le jardin',
    outside: 'En le croisant de loin',
  },
}

export const skillText = (bossId: string): SkillText | undefined => TEXTS[bossId]

/** Phrase d'une étape (1 à 5), telle qu'on l'affiche : « Revient quand on l'appelle d'une autre pièce ». */
export const stepPhrase = (bossId: string, step: number): string => TEXTS[bossId]?.steps[step - 1] ?? bossById(bossId)?.levels[step - 1]?.criterion ?? ''

/** « revient quand on l'appelle… » : la même phrase, sans majuscule, pour la mettre après « Billy » ou « Prochaine étape : ». */
export const stepPhraseLower = (bossId: string, step: number): string => {
  const phrase = stepPhrase(bossId, step)
  return phrase.charAt(0).toLocaleLowerCase('fr') + phrase.slice(1)
}

/** L'étape en 4 à 6 mots, pour un badge. */
export const stepShort = (bossId: string, step: number): string => TEXTS[bossId]?.short[step - 1] ?? stepPhrase(bossId, step)

/** Les trois groupes affichés, dans l'ordre : Les bases, Le quotidien, Le monde. */
export const SKILL_GROUPS: { tier: Tier; label: string }[] = [
  { tier: 'fondations', label: 'La Maison' },
  { tier: 'quotidien', label: 'Le Quartier' },
  { tier: 'monde', label: 'Le Grand Monde' },
]

export interface Territory {
  tier: Tier
  name: string
  floor: string
  subtitle: string
  /** Couleur du territoire, et son fond clair. */
  color: string
  soft: string
  /** Carte-lien en bas de l'étage : vers quel étage, et pourquoi. */
  link: { to: Tier; label: string; text: string; up?: boolean }
}

/** Les 3 étages de l'arbre, des racines aux branches. */
export const TERRITORIES: Territory[] = [
  {
    tier: 'fondations', name: 'La Maison', floor: 'Étage 1 · les racines', subtitle: 'Là où tout commence', color: '#1E5A50', soft: '#DCEBE6',
    link: { to: 'quotidien', label: 'Mène au Quartier', text: 'Le lien et le calme préparent les balades' },
  },
  {
    tier: 'quotidien', name: 'Le Quartier', floor: 'Étage 2 · le tronc', subtitle: 'Les balades de tous les jours', color: '#2559A8', soft: '#E3EAF8',
    link: { to: 'monde', label: 'Mène au Grand Monde', text: 'Laisse et rappel ouvrent la ville et les rencontres' },
  },
  {
    tier: 'monde', name: 'Le Grand Monde', floor: 'Étage 3 · les branches', subtitle: 'La ville, les gens, les autres chiens', color: '#C2571A', soft: '#FBE6D4',
    link: { to: 'quotidien', label: 'Vient du Quartier', text: 'Un moment difficile ? On revient aux balades calmes', up: true },
  },
]

/** Couleur du texte sur le fond clair du territoire. L'orange du Grand Monde y serait trop pâle (4:1) : on le fonce (AA). */
export const inkOn = (territory: Territory): string => (territory.tier === 'monde' ? '#9A4413' : territory.color)

export const territoryOf = (bossId: string): Territory => TERRITORIES.find((t) => t.tier === bossById(bossId)?.tier) ?? TERRITORIES[0]!

/** Compétences de peur : un moment « Difficile » y compte comme une situation de peur (spec V3 § 3). */
export const FEAR_SKILLS = ['nouveaute', 'ville', 'rencontres', 'congeneres']
export const isFearSkill = (bossId: string) => FEAR_SKILLS.includes(bossId)

/** Les 10 compétences dans l'ordre d'affichage : Les bases → Le monde. */
export const SKILLS: Boss[] = SKILL_GROUPS.flatMap((group) => BOSSES.filter((b) => b.tier === group.tier))

/** Titre de Billy selon son niveau. */
export function levelTitle(level: number): string {
  if (level >= 26) return 'Légende'
  if (level >= 19) return 'Complice'
  if (level >= 13) return 'Compagnon'
  if (level >= 8) return 'Explorateur'
  if (level >= 4) return 'Apprenti'
  return 'Chiot curieux'
}

/** Ce qui peut lui faire peur (questionnaire de départ). */
export const FEARS = ['Les enfants', 'Les inconnus', 'Les autres chiens', 'La circulation', 'Les rues étroites', 'Les bruits forts', 'Son reflet', 'Rester seul']

/** Caractère : des phrases simples, reliées aux traits internes. */
export const CHARACTER: { trait: 'craintif' | 'energique' | 'reactif-chiens' | 'chiot' | 'senior'; label: string }[] = [
  { trait: 'craintif', label: 'Il a peur facilement' },
  { trait: 'energique', label: 'Il est plein d’énergie' },
  { trait: 'reactif-chiens', label: 'Il réagit aux autres chiens' },
  { trait: 'chiot', label: 'C’est un chiot' },
  { trait: 'senior', label: 'Il est âgé' },
]
