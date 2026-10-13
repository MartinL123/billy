import { bossById, BOSSES, type Boss, type Tier } from './training'

// Ce que voit le joueur (docs/specs/spec-v3-simplification.md) : chaque étape est une phrase concrète,
// jamais un numéro. Les phrases commencent par un verbe : « Billy revient… », « Prochaine étape : revient… ».
// Rédigées pour l'app, à faire relire par l'éducateur.

interface SkillText {
  /** Une phrase par étape, de la plus facile à la plus difficile. */
  steps: [string, string, string, string, string]
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
    question: 'Quand vous dites son nom, {nom} vous regarde…',
    atHome: 'Même quand il est occupé',
    outside: 'Dans une rue calme',
  },
  calme: {
    steps: ['Se pose sur son tapis une demi-minute', 'Reste sur son tapis quand la maison s’active', 'Se pose sur son tapis dehors, au calme', 'Se pose sur un banc malgré le passage', 'Se pose partout où l’on s’arrête'],
    question: '{nom} sait se poser sur son tapis…',
    atHome: 'Même quand ça bouge autour de lui',
    outside: 'Dehors, dans un endroit calme',
  },
  soins: {
    steps: ['Se laisse toucher les pattes et les oreilles', 'Se laisse brosser et essuyer les pattes', 'Se laisse manipuler par une autre personne', 'Reste à l’aise pendant l’examen chez le véto', 'Se laisse soigner partout, par tout le monde'],
    question: '{nom} se laisse manipuler…',
    atHome: 'Brossage, pattes, oreilles',
    outside: 'Par une autre personne, ailleurs',
  },
  laisse: {
    steps: ['Marche quelques pas sans tirer, dans le salon', 'Suit les changements de direction au jardin', 'Marche sans tirer dans une rue calme', 'Marche sans tirer malgré les passants et les odeurs', 'Marche sans tirer partout'],
    question: 'En laisse, {nom} marche sans tirer…',
    atHome: 'Au jardin ou dans la cour',
    outside: 'Dans une rue calme',
  },
  rappel: {
    steps: ['Revient quand on l’appelle d’une autre pièce', 'Revient quand on l’appelle, même en laissant un jouet', 'Revient quand on l’appelle dans un parc calme', 'Revient malgré un autre chien au loin', 'Revient quand on l’appelle, partout'],
    question: 'Quand vous l’appelez, {nom} revient…',
    atHome: 'Il revient d’une autre pièce',
    outside: 'Au parc, à quelques mètres',
  },
  manieres: {
    steps: ['S’assoit et se couche à la demande', 'Reste en place et attend à la porte', 'S’assoit, se couche et reste, dehors au calme', 'Ne saute pas sur les gens qui arrivent', 'Garde ses bonnes manières partout'],
    question: 'Assis, couché, pas bouger : {nom} le fait…',
    atHome: 'Et il attend à la porte',
    outside: 'Dans un endroit calme',
  },
  nouveaute: {
    steps: ['Explore un objet nouveau à la maison', 'Reste détendu devant un son ou un reflet nouveau', 'Explore une nouveauté dehors, au calme', 'Reste à l’aise devant une nouveauté dans un lieu animé', 'Aborde la nouveauté sereinement, partout'],
    question: 'Devant un objet ou un bruit nouveau, {nom} reste à l’aise…',
    atHome: 'Objets, sols et sons de la maison',
    outside: 'Dans un endroit calme',
  },
  ville: {
    steps: ['Écoute les bruits de la ville en mangeant', 'Regarde la rue par la fenêtre, détendu', 'Se promène dix minutes dans une rue calme', 'Se promène dans une rue animée ou étroite', 'Se promène en ville, dans tous les quartiers'],
    question: 'En ville, {nom} est à l’aise…',
    atHome: 'Il regarde la rue par la fenêtre',
    outside: 'Dans une rue calme',
  },
  rencontres: {
    steps: ['Reste détendu quand un proche entre', 'Regarde les passants par la fenêtre, détendu', 'Croise des passants à distance, à l’aise', 'Reste à l’aise quand un inconnu nous parle', 'Reste à l’aise avec les inconnus, partout'],
    question: 'Avec les gens qu’il ne connaît pas, {nom} est à l’aise…',
    atHome: 'Quand quelqu’un vient à la maison',
    outside: 'En croisant des passants à distance',
  },
  congeneres: {
    steps: ['Reste détendu en entendant un chien', 'Regarde un chien par la fenêtre sans s’agiter', 'Croise un chien de loin, au calme', 'Croise un chien dans la rue poliment', 'Croise les autres chiens sereinement, partout'],
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

/** Les trois groupes affichés, dans l'ordre : Les bases, Le quotidien, Le monde. */
export const SKILL_GROUPS: { tier: Tier; label: string }[] = [
  { tier: 'fondations', label: 'Les bases' },
  { tier: 'quotidien', label: 'Le quotidien' },
  { tier: 'monde', label: 'Le monde' },
]

/** Les 10 compétences dans l'ordre d'affichage : Les bases → Le monde. */
export const SKILLS: Boss[] = SKILL_GROUPS.flatMap((group) => BOSSES.filter((b) => b.tier === group.tier))

/** Titre de Billy selon son niveau. */
export function levelTitle(level: number): string {
  if (level >= 15) return 'Légende'
  if (level >= 11) return 'Complice'
  if (level >= 8) return 'Compagnon'
  if (level >= 5) return 'Explorateur'
  if (level >= 3) return 'Apprenti'
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
