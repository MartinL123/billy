// Catalogue commun du dressage (docs/specs/spec-v2-dressage.md). Le même pour tous les chiens : il vit dans le code,
// pas dans Firestore. Seuls le profil (traits) et la progression sont propres au chien.
//
// Les critères des paliers et les liens conseillés sont des hypothèses de conception,
// à valider avec l'éducateur (§ 9 de la spec).

export type Stat = 'calme' | 'courage' | 'rappel' | 'focus' | 'sociabilite'

export const STATS: { id: Stat; label: string }[] = [
  { id: 'calme', label: 'Calme' },
  { id: 'courage', label: 'Courage' },
  { id: 'rappel', label: 'Rappel' },
  { id: 'focus', label: 'Focus' },
  { id: 'sociabilite', label: 'Sociabilité' },
]

export type Trait = 'chiot' | 'craintif' | 'energique' | 'reactif-chiens' | 'adopte-adulte' | 'senior'

export type Tier = 'fondations' | 'quotidien' | 'monde'

/** Étages de l'arbre, du haut de l'écran vers le bas. */
export const TIERS: { id: Tier; label: string }[] = [
  { id: 'monde', label: 'Monde' },
  { id: 'quotidien', label: 'Quotidien' },
  { id: 'fondations', label: 'Fondations' },
]

/** La même échelle de 5 paliers pour tous les boss. */
export const LEVEL_TITLES = ['Découverte', 'Maison animée', 'Dehors au calme', 'Dehors animé', 'Partout'] as const
export const LEVEL_PLACES = [
  'À la maison, sans distraction',
  'Maison avec distractions, ou jardin',
  'Extérieur calme, peu de monde',
  'Extérieur avec passants, bruits, chiens',
  'Réussi dans 3 lieux différents',
] as const
export const MAX_LEVEL = 5

export interface BossLevel {
  title: string
  criterion: string
}

export interface Recommendation {
  /** Palier visé. */
  level: number
  /** Plus facile si ces boss ont atteint ces paliers. Jamais bloquant. */
  requires: { bossId: string; level: number }[]
}

export interface Boss {
  id: string
  name: string
  /** Nom court pour l'arbre. */
  short: string
  goal: string
  tier: Tier
  stats: Stat[]
  /** Boss lié à une peur : on y enregistre des réactions, il a une météo de confiance. */
  fear: boolean
  levels: BossLevel[]
  recommends: Recommendation[]
}

const levels = (...criteria: [string, string, string, string, string]): BossLevel[] =>
  criteria.map((criterion, i) => ({ title: LEVEL_TITLES[i]!, criterion }))

// Les identifiants sont enregistrés dans Firestore : ne jamais les renommer.
export const BOSSES: Boss[] = [
  {
    id: 'lien', name: 'Le Lien', short: 'Lien', tier: 'fondations', stats: ['focus'], fear: false,
    goal: 'Répond à son nom et me regarde, même dehors.',
    levels: levels(
      'Me regarde à son prénom, à la maison au calme',
      'Me regarde à son prénom même occupé, à la maison ou au jardin',
      'Me regarde à son prénom dans une rue calme',
      'Me regarde malgré des passants ou un chien au loin',
      'Validé dans 3 lieux différents',
    ),
    recommends: [],
  },
  {
    id: 'calme', name: 'Le Calme', short: 'Calme', tier: 'fondations', stats: ['calme'], fear: false,
    goal: 'Se pose sur son tapis, reste serein seul quelques minutes.',
    levels: levels(
      'Se pose sur son tapis 30 secondes, à la maison',
      'Reste sur son tapis quand la maison s’active ; seul 2 minutes dans une pièce',
      'Se pose sur son tapis dehors, dans un lieu calme',
      'Se pose sur un banc ou en terrasse avec du passage ; seul 10 minutes à la maison',
      'Validé dans 3 lieux différents',
    ),
    recommends: [],
  },
  {
    id: 'soins', name: 'Les Soins', short: 'Soins', tier: 'fondations', stats: ['calme', 'sociabilite'], fear: true,
    goal: 'Accepte brossage, oreilles, pattes, examen chez le véto.',
    levels: levels(
      'Accepte qu’on touche ses pattes et ses oreilles quelques secondes',
      'Brossage, essuyage des pattes, regard sur les dents, à la maison',
      'Manipulé par une autre personne, dans un lieu calme',
      'Examen chez le véto, réaction ≤ 1',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 4, requires: [{ bossId: 'calme', level: 2 }] }],
  },
  {
    id: 'laisse', name: 'La Laisse', short: 'Laisse', tier: 'quotidien', stats: ['focus', 'calme'], fear: false,
    goal: 'Marche laisse détendue, suit mes changements de direction.',
    levels: levels(
      '5 pas laisse détendue dans le salon',
      'Suit un changement de direction au jardin ou dans la cour',
      '20 pas laisse détendue dans une rue calme',
      'Laisse détendue malgré les passants et les odeurs',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'lien', level: 2 }] }],
  },
  {
    id: 'rappel', name: 'Le Rappel', short: 'Rappel', tier: 'quotidien', stats: ['rappel'], fear: false,
    goal: 'Revient quand je l’appelle.',
    levels: levels(
      'Revient de l’autre pièce',
      'Revient en laissant un jouet',
      'Revient à 10 m sur une longe, parc vide',
      'Revient malgré un autre chien au loin',
      'Rappel validé dans 3 parcs',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'lien', level: 2 }] }],
  },
  {
    id: 'manieres', name: 'Les Bonnes manières', short: 'Manières', tier: 'quotidien', stats: ['calme'], fear: false,
    goal: 'Assis, couché, reste, attend à la porte, ne saute pas.',
    levels: levels(
      'Assis et couché à la maison, au calme',
      'Reste 10 secondes ; attend à la porte',
      'Assis, couché, reste dans un lieu calme dehors',
      'Ne saute pas quand quelqu’un arrive ; reste malgré du passage',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'calme', level: 2 }] }],
  },
  {
    id: 'nouveaute', name: 'La Nouveauté', short: 'Nouveauté', tier: 'quotidien', stats: ['courage'], fear: true,
    goal: 'Explore un objet, un sol, un son ou un reflet inconnu sans paniquer.',
    levels: levels(
      'Explore à son rythme un objet nouveau posé au sol, à la maison',
      'Un sol, un son ou un reflet nouveau à la maison, en restant détendu',
      'Un objet ou un sol nouveau dehors, dans un lieu calme',
      'Une nouveauté dans un lieu animé, réaction ≤ 1',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'calme', level: 1 }] }],
  },
  {
    id: 'ville', name: 'La Ville', short: 'Ville', tier: 'monde', stats: ['courage'], fear: true,
    goal: 'Se promène en ville : bruits, passants, rues étroites, foule.',
    levels: levels(
      'Écoute des sons de ville à faible volume en mangeant',
      'Regarde la rue depuis la fenêtre, détendu',
      '10 min dans une rue calme, à une heure creuse',
      'Rue commerçante ou ruelle étroite, réaction ≤ 1',
      'Validé dans 3 quartiers',
    ),
    recommends: [
      { level: 3, requires: [{ bossId: 'lien', level: 2 }, { bossId: 'nouveaute', level: 2 }] },
      { level: 4, requires: [{ bossId: 'laisse', level: 3 }] },
    ],
  },
  {
    id: 'rencontres', name: 'Les Rencontres', short: 'Rencontres', tier: 'monde', stats: ['sociabilite', 'courage'], fear: true,
    goal: 'Reste à l’aise quand un inconnu, adulte ou enfant, me parle ou passe.',
    levels: levels(
      'Reste détendu quand un proche entre à la maison',
      'Regarde les passants depuis la fenêtre ou le jardin, détendu',
      'Des passants à distance dans un lieu calme, sans interaction, réaction ≤ 1',
      'Un inconnu me parle ou passe, sans contact imposé, réaction ≤ 1',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'calme', level: 2 }, { bossId: 'lien', level: 2 }] }],
  },
  {
    id: 'congeneres', name: 'Les Congénères', short: 'Congénères', tier: 'monde', stats: ['sociabilite'], fear: true,
    goal: 'Croise un autre chien sans plus qu’un intérêt poli.',
    levels: levels(
      'Entend ou aperçoit un chien depuis la maison, détendu',
      'Voit un chien depuis la fenêtre ou le jardin sans s’agiter',
      'Croise un chien à grande distance dans un lieu calme',
      'Croise un chien dans la rue avec un intérêt poli, réaction ≤ 1',
      'Validé dans 3 lieux différents',
    ),
    recommends: [{ level: 3, requires: [{ bossId: 'lien', level: 2 }, { bossId: 'laisse', level: 2 }] }],
  },
]

export const bossById = (id: string) => BOSSES.find((b) => b.id === id)

// ——— Exercices ———

export const MAX_DIFFICULTY = 5

export interface Exercise {
  id: string
  name: string
  /** Le geste, résumé en quelques temps. Résumé maison : la source fait référence. */
  steps: string[]
  bossIds: string[]
  /** Niveaux de difficulté N1 à N5 : un réglage, qui peut monter ou descendre. */
  levels: [string, string, string, string, string]
  traits?: Trait[]
  source: { name: string; url?: string }
  /** `false` : étapes décrites de mémoire dans la recherche, à vérifier avec l'éducateur. */
  verified: boolean
  /** « Ce qu'il faut » en plus des friandises. */
  needs?: string
  /** Précaution affichée avec l'exercice. */
  caution?: string
  /** Illustration (voir Illustration.tsx). */
  scene?: string
}

export const EXERCISES: Exercise[] = [
  {
    id: 'prenom', name: 'Jeu du prénom', bossIds: ['lien', 'rappel'], traits: ['chiot', 'adopte-adulte'], verified: true, scene: 'nom',
    steps: ['Dis son prénom une seule fois.', 'Il te regarde : « oui ! », friandise.', 'Recommence quand il a détourné la tête.'],
    levels: ['Salon, à 1 m', 'Depuis une autre pièce', 'Dans la cour ou au jardin', 'Dans une rue calme', 'Au parc'],
    source: { name: 'AKC', url: 'https://www.akc.org/expert-advice/training/dog-name-game/' },
  },
  {
    id: 'up-down', name: 'Up-Down', bossIds: ['lien'], traits: ['craintif'], verified: true, scene: 'regard',
    steps: ['Pose une friandise au sol devant lui.', 'Il la mange puis relève la tête vers toi : « oui ! », nouvelle friandise au sol.', 'Le regard vient de lui : ne l’appelle pas.'],
    levels: ['À la maison', 'Porte d’entrée ouverte', 'À un point calme de la balade', 'Dans un nouveau lieu calme', 'Quand ce qui lui fait peur est visible très loin, sans s’en approcher'],
    source: { name: 'Leslie McDevitt, via Wag’n Train', url: 'https://www.wagntrain.com/?p=240' },
  },
  {
    id: 'touche', name: 'Touche-main', bossIds: ['lien', 'rappel'], traits: ['chiot'], verified: true, scene: 'touche',
    steps: ['Présente ta paume, toujours de la même façon.', 'Il la touche du museau : « oui ! », friandise.', 'Sert aussi à l’éloigner de ce qui lui fait peur.'],
    levels: ['Paume près du museau', 'Paume à un pas', 'À plusieurs mètres', 'En balade, dans un lieu calme', 'En balade, avec des distractions'],
    source: { name: 'AKC', url: 'https://www.akc.org/expert-advice/training/teaching-targeting-to-your-dog/' },
  },
  {
    id: 'cherche', name: 'Cherche !', bossIds: ['calme', 'nouveaute', 'ville'], traits: ['chiot', 'craintif'], verified: false, scene: 'flair',
    needs: 'Quelques croquettes',
    steps: ['Éparpille quelques croquettes au sol et dis « cherche ».', 'Laisse-le renifler sans l’aider : cela fait baisser le stress.', 'En rue, c’est une sortie de secours : on s’arrête et on cherche.'],
    levels: ['Entre ses pattes', 'À 1 m', 'Dans l’herbe', 'En balade, lieu calme', 'En balade, ce qui lui fait peur visible très loin'],
    source: { name: 'Fiche décrite de mémoire' },
  },
  {
    id: 'tapis', name: 'Tapis puis relax', bossIds: ['calme', 'manieres'], traits: ['energique', 'adopte-adulte'], verified: true, scene: 'panier',
    needs: 'Son tapis ou son panier',
    steps: ['Il monte sur son tapis : friandise posée sur le tapis.', 'Il s’y couche : friandises calmes, entre ses pattes.', 'S’il se lève, reviens à une durée plus courte d’au moins 5 secondes.'],
    levels: ['Tenue de 2 secondes', '5 secondes', '15 secondes', '30 secondes', '30 secondes pendant que tu bouges dans la pièce'],
    source: { name: 'Today’s Veterinary Practice', url: 'https://todaysveterinarypractice.com/pet-owner-resources/teaching-relaxation-exercises-to-dogs/' },
  },
  {
    id: 'relaxation', name: 'Protocole de relaxation', bossIds: ['calme'], traits: ['energique'], verified: true, scene: 'panier',
    needs: 'Son tapis ou son panier',
    steps: ['Environ 8 minutes par jour, le chien posé sur son tapis.', 'Suis les étapes du « jour » en cours dans le document source.', 'Répète le même jour tant que toutes ses étapes ne sont pas calmes.'],
    levels: ['Jours 1 à 3', 'Jours 4 à 6', 'Jours 7 à 9', 'Jours 10 à 12', 'Jours 13 à 15'],
    source: { name: 'Karen Overall, via HSHV', url: 'https://www.hshv.org/wp-content/uploads/2021/01/Relaxation-Protocol.pdf' },
  },
  {
    id: 'bol', name: 'Jeu du bol', bossIds: ['soins'], traits: ['chiot', 'senior'], verified: true, scene: 'manipulations',
    needs: 'Un bol de friandises, puis la brosse ou la serviette',
    steps: ['Un bol de friandises posé à vue : il le regarde, tu le nourris.', 'Tant qu’il regarde le bol, tu peux toucher ; s’il détourne le regard, tu arrêtes.', 'C’est lui qui dit « stop ».'],
    levels: ['Regarder le bol = friandise', 'Toucher, puis nourrir', 'Avec les outils : brosse, serviette', 'Couché sur le flanc', 'Sans le bol'],
    source: { name: 'Guide Dogs for the Blind', url: 'https://www.guidedogs.com/puppy-raising-guidebook/fundamentals-pups-2-to-5-months/the-bucket-game' },
  },
  {
    id: '123', name: 'Jeu 1-2-3', bossIds: ['ville', 'laisse', 'lien'], traits: ['craintif'], verified: true, scene: 'pied',
    needs: 'Sa laisse dès que vous marchez',
    steps: ['Compte à voix haute « un, deux, trois ».', 'À « trois », toujours une friandise, à hauteur de ta jambe.', 'Un rituel prévisible pour passer un endroit difficile.'],
    levels: ['Sur place', 'En reculant', 'En marchant', 'Dans une rue calme', 'En croisant quelque chose à distance'],
    source: { name: 'Cattledog Publishing', url: 'https://cattledogpublishing.com/blog/walking-1-2-3/' },
  },
  {
    id: 'engage-disengage', name: 'Engage-Disengage', bossIds: ['rencontres', 'congeneres'], traits: ['reactif-chiens', 'craintif'], verified: true, scene: 'regard',
    steps: ['Étape 1 : il regarde ce qui l’inquiète, « oui ! », friandise.', 'Étape 2 : il le regarde, attends jusqu’à 3 secondes qu’il revienne vers toi, puis récompense.', 'Reste à une distance où il mange. Tu ne te rapproches pas pour réussir.'],
    levels: ['Étape 1, très loin', 'Étape 1, plusieurs jours de suite', 'Étape 2, très loin', 'Étape 2, dans un autre lieu', 'Étape 2, à la distance qu’il choisit'],
    source: { name: 'Preventive Vet', url: 'https://www.preventivevet.com/dogs/engage-disengage-dog-training-game' },
  },
  {
    id: 'lat', name: 'Look At That', bossIds: ['ville', 'nouveaute', 'rencontres', 'congeneres'], traits: ['craintif', 'reactif-chiens'], verified: true, scene: 'regard',
    steps: ['Il jette un coup d’œil à la chose : « oui ! », friandise près de toi.', 'La chose apparaît d’abord, la friandise ensuite.', 'Commence par des objets neutres.'],
    levels: ['Sur son tapis, objet neutre', 'L’objet apparaît : friandises ; il disparaît : plus rien', 'Tu marques son coup d’œil', 'Sur un signal : « Où est… ? »', 'Dans la vraie vie, de loin'],
    source: { name: 'Cattledog Publishing', url: 'https://cattledogpublishing.com/blog/a-game-changer-for-reactive-dogs-look-at-that-lat/' },
  },
  {
    id: 'demi-tour', name: 'Demi-tour d’urgence', bossIds: ['ville', 'congeneres', 'laisse'], traits: ['craintif', 'reactif-chiens'], verified: true, scene: 'laisse',
    needs: 'Sa laisse',
    steps: ['Dis ton signal joyeux (« on y va ! ») et fais demi-tour.', 'Il te suit : friandises en marchant.', 'Sans tirer sur la laisse : c’est un jeu appris au calme d’abord.'],
    levels: ['À la maison', 'Dans la cour', 'Dans une rue vide', 'Avec des passants au loin', 'En situation réelle'],
    source: { name: 'Positively', url: 'https://positively.com/dog-training/article/canine-life-skills-emergency-u-turn' },
  },
  {
    id: 'sons', name: 'Sons progressifs', bossIds: ['nouveaute', 'ville', 'congeneres'], traits: ['craintif', 'chiot'], verified: true, scene: 'bruits',
    needs: 'Un téléphone ou une enceinte, pendant son repas',
    steps: ['Diffuse le son à peine audible pendant son repas.', 'Il mange détendu : garde ce volume plusieurs jours.', 'La porte reste ouverte : il peut partir quand il veut.'],
    levels: ['À peine audible, pendant le repas', 'Volume moyen', 'Depuis une autre pièce', 'Volume réel', 'D’autres sons, depuis le début'],
    source: { name: 'Blue Cross', url: 'https://www.bluecross.ie/pet-advice/sounds/' },
  },
  {
    id: 'treat-retreat', name: 'Treat & Retreat', bossIds: ['rencontres'], traits: ['craintif'], verified: false,
    needs: 'Une personne prévenue de la consigne',
    steps: ['La personne ne s’approche pas et ne le regarde pas fixement.', 'Elle lance une friandise loin derrière lui : il s’éloigne pour la manger.', 'C’est lui qui choisit de revenir ou non. Jamais de contact imposé.'],
    levels: ['Avec un adulte connu, à la maison', 'Avec un adulte peu connu, à la maison', 'Dehors, dans un lieu calme', 'Avec plusieurs adultes, un à la fois', 'Dans un nouveau lieu calme'],
    source: { name: 'Suzanne Clothier', url: 'https://suzanneclothier.com/treat-retreat/' },
    caution: 'Pas avec de vrais enfants sans un professionnel.',
  },
  {
    id: 'rappel-ping-pong', name: 'Rappel ping-pong', bossIds: ['rappel'], verified: true, scene: 'rappel',
    needs: 'Une longe de 10 m dehors, une deuxième personne si possible',
    steps: ['Un mot de rappel réservé, dit d’une voix joyeuse.', 'Il arrive : fête et friandises.', 'Jamais de rappel pour le gronder ou finir la balade.'],
    levels: ['Dans le salon', 'D’une pièce à l’autre', 'Dans la cour', 'En longe, au parc', 'En longe, avec une distraction'],
    source: { name: 'SF SPCA', url: 'https://sfhumanesociety.org/wp-content/uploads/2024/02/Teaching-a-Reliable-Recall.pdf' },
  },
  {
    id: 'laisse-arbre', name: 'Laisse détendue : l’arbre', bossIds: ['laisse'], traits: ['energique'], verified: true, scene: 'laisse',
    needs: 'Sa laisse',
    steps: ['La laisse se tend : tu t’arrêtes, immobile comme un arbre.', 'Elle se détend : vous repartez.', 'Récompense à hauteur de ta jambe.'],
    levels: ['Dans le salon', 'Dans la cour', 'Dans une rue calme', 'Dans une rue animée', 'En croisant un chien'],
    source: { name: 'UC Davis', url: 'https://www.vetmed.ucdavis.edu/sites/g/files/dgvnsk491/files/inline-files/Loose_Leash_Walking.pdf' },
    caution: 'Pour un chien craintif, la source conseille l’avis d’un vétérinaire comportementaliste.',
  },
  // Exercices ajoutés avec l'arbre de compétences (docs/specs/arbre-competences.md), à valider avec l'éducateur.
  {
    id: 'absences', name: 'Petites absences', bossIds: ['calme'], verified: false, scene: 'panier',
    needs: 'Son tapis et un os à mâcher',
    steps: ['Il est sur son tapis avec un os à mâcher.', 'Sors de la pièce, puis reviens sans faire la fête.', 'Allonge peu à peu, de 10 à 30 secondes à la fois.'],
    levels: ['10 secondes', '2 minutes', '5 minutes', '10 minutes', '10 minutes, dans un autre lieu connu'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
  {
    id: 'visite-veto', name: 'Visite de courtoisie', bossIds: ['soins'], verified: false,
    needs: 'Prévenir le cabinet avant de passer',
    steps: ['Entrez chez le vétérinaire, sans rendez-vous de soin.', 'Une friandise donnée à l’accueil.', 'Ressortez. Aucun soin ce jour-là.'],
    levels: ['Passer devant le cabinet', 'Entrer, une friandise, ressortir', 'Rester une minute dans la salle d’attente', 'Monter sur la balance', 'Monter sur la table, sans soin'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
  {
    id: 'assis-couche', name: 'Assis et couché au leurre', bossIds: ['manieres'], verified: false,
    steps: ['Assis : une friandise passe au-dessus de sa tête.', 'Couché : la friandise descend entre ses pattes.', '« Oui ! » quand c’est fait. Ajoute le mot quand le geste est fluide.'],
    levels: ['Avec la friandise en main', 'Avec le geste, main vide', 'Au mot seul, à la maison', 'Dehors, dans un lieu calme', 'Dans un nouveau lieu'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
  {
    id: 'porte', name: 'Attendre à la porte', bossIds: ['manieres'], verified: false,
    steps: ['Pose la main sur la poignée.', 'Il se lève : la porte se referme.', 'Il reste assis : elle s’ouvre et tu dis « vas-y ».'],
    levels: ['Porte d’une pièce', 'Porte d’entrée, entrouverte', 'Porte d’entrée, grande ouverte', 'Portière de la voiture', 'Une porte dans un autre lieu'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
  {
    id: 'quatre-pattes', name: 'Quatre pattes au sol', bossIds: ['manieres'], verified: false,
    steps: ['Quelqu’un arrive.', 'Lance des friandises au sol tant que ses 4 pattes y sont.', 'Il saute : la personne se détourne, sans un mot.'],
    levels: ['Quand tu rentres', 'Avec un proche', 'Avec un invité', 'Dehors, avec une personne connue', 'Dans un autre lieu'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
  {
    id: 'parcours-objets', name: 'Parcours d’objets', bossIds: ['nouveaute'], verified: false, scene: 'flair',
    needs: 'Un carton, une bâche, un coussin',
    steps: ['Pose au sol un carton, une bâche, un coussin.', 'Mets des friandises dessus.', 'Il explore à son rythme. On ne l’attire jamais.'],
    levels: ['Un seul objet connu', 'Un objet nouveau', 'Trois objets nouveaux', 'Un objet qui bouge ou fait du bruit', 'Dans une autre pièce ou au jardin'],
    source: { name: 'docs/specs/arbre-competences.md' },
  },
]

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)

export interface StepExercise {
  id: string
  /** Réglage de l'exercice, de 1 à 5 (index dans `levels`). */
  level: number
}

const ex = (id: string, level: number): StepExercise => ({ id, level })

/**
 * Pour chaque compétence, les exercices de chacune de ses 5 étapes, avec leur réglage
 * (docs/specs/arbre-competences.md). « S'entraîner » et la quête du jour s'en servent.
 * Pour les compétences de peur, le réglage reste toujours au calme et à distance.
 */
export const STEP_EXERCISES: Record<string, [StepExercise[], StepExercise[], StepExercise[], StepExercise[], StepExercise[]]> = {
  lien: [[ex('prenom', 1)], [ex('prenom', 2)], [ex('up-down', 3), ex('prenom', 4)], [ex('prenom', 5), ex('touche', 5)], [ex('prenom', 5), ex('touche', 5), ex('up-down', 4)]],
  calme: [[ex('tapis', 1)], [ex('tapis', 5), ex('absences', 2)], [ex('tapis', 3)], [ex('tapis', 4), ex('absences', 4)], [ex('tapis', 5), ex('absences', 5)]],
  soins: [[ex('bol', 1), ex('bol', 2)], [ex('bol', 3)], [ex('bol', 2)], [ex('visite-veto', 2), ex('bol', 4)], [ex('bol', 5)]],
  laisse: [[ex('123', 3), ex('laisse-arbre', 1)], [ex('demi-tour', 2)], [ex('laisse-arbre', 3), ex('123', 4)], [ex('laisse-arbre', 4), ex('demi-tour', 4)], [ex('laisse-arbre', 4), ex('123', 4), ex('demi-tour', 4)]],
  rappel: [[ex('rappel-ping-pong', 1), ex('rappel-ping-pong', 2)], [ex('rappel-ping-pong', 2)], [ex('rappel-ping-pong', 4)], [ex('rappel-ping-pong', 5)], [ex('rappel-ping-pong', 5)]],
  manieres: [[ex('assis-couche', 1), ex('assis-couche', 3)], [ex('tapis', 3), ex('porte', 1)], [ex('assis-couche', 4), ex('tapis', 3)], [ex('quatre-pattes', 2), ex('quatre-pattes', 3)], [ex('assis-couche', 5), ex('quatre-pattes', 5)]],
  nouveaute: [[ex('parcours-objets', 2), ex('cherche', 2)], [ex('sons', 1), ex('lat', 1)], [ex('cherche', 4)], [ex('lat', 5)], [ex('lat', 5), ex('cherche', 4)]],
  ville: [[ex('sons', 1)], [ex('lat', 2)], [ex('123', 4), ex('cherche', 4)], [ex('123', 4), ex('demi-tour', 3)], [ex('123', 4), ex('cherche', 4), ex('demi-tour', 3)]],
  rencontres: [[ex('treat-retreat', 1)], [ex('lat', 2)], [ex('engage-disengage', 1)], [ex('treat-retreat', 2), ex('lat', 5)], [ex('treat-retreat', 5), ex('engage-disengage', 4)]],
  congeneres: [[ex('sons', 1)], [ex('lat', 2)], [ex('engage-disengage', 1)], [ex('engage-disengage', 3), ex('demi-tour', 4)], [ex('engage-disengage', 4), ex('demi-tour', 4)]],
}

/** Exercices de l'étape en cours (1 à 5) d'une compétence. Compétence maîtrisée : ceux de la dernière étape, en révision. */
export function stepExercises(bossId: string, step: number): StepExercise[] {
  return STEP_EXERCISES[bossId]?.[Math.min(MAX_LEVEL, Math.max(1, step)) - 1] ?? []
}

// ——— Traits ———

export interface TraitInfo {
  id: Trait
  label: string
  /** Boss mis en avant, dans l'ordre. */
  bossIds: string[]
  /** Garde-fous affichés dans le profil et pendant les séances. */
  guards: string[]
}

export const TRAITS: TraitInfo[] = [
  { id: 'chiot', label: 'Chiot (moins de 6 mois)', bossIds: ['lien', 'nouveaute', 'soins'], guards: ['Séances de 3 minutes maximum', 'Beaucoup de repos'] },
  {
    id: 'craintif', label: 'Craintif', bossIds: ['nouveaute', 'ville', 'rencontres'],
    guards: ['Ne jamais forcer le contact', '« A-t-il mangé ? » à chaque séance', 'Dehors animé (P4) conseillé seulement si la météo du boss est au soleil ou aux éclaircies'],
  },
  { id: 'energique', label: 'Énergique, excité', bossIds: ['calme', 'laisse', 'manieres'], guards: ['Une dépense mentale avant les séances calmes'] },
  { id: 'reactif-chiens', label: 'Réactif aux chiens', bossIds: ['congeneres', 'laisse'], guards: ['Noter sa distance de confort', 'Pas de rencontre en laisse forcée'] },
  { id: 'adopte-adulte', label: 'Adopté adulte', bossIds: ['lien', 'calme'], guards: ['2 à 3 semaines de décompression, sans objectif'] },
  { id: 'senior', label: 'Senior', bossIds: ['soins', 'calme'], guards: ['Séances courtes', 'Pas de sauts'] },
]

export const traitInfo = (id: Trait) => TRAITS.find((t) => t.id === id)
