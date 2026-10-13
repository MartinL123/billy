// Idées hors progression : jeux et choses à mâcher. Aucune XP, rien à enregistrer.

export interface Idea {
  id: string
  name: string
  detail: string
  steps: string[]
  /** Illustration (voir Illustration.tsx). */
  scene: string
}

export const GAMES: Idea[] = [
  { id: 'cache-cache', name: 'Cache-cache', detail: '5 min · rappel', scene: 'rappel', steps: ['Fais-le attendre ou demande à quelqu’un de le tenir.', 'Cache-toi tout près, puis appelle-le une seule fois.', 'Fête-le quand il te trouve.'] },
  { id: 'fouille', name: 'Tapis de fouille', detail: '5 min · flair et calme', scene: 'flair', steps: ['Roule quelques croquettes de sa ration dans une vieille serviette.', 'Pose-la au sol et dis « cherche ».', 'Laisse-le se débrouiller : renifler l’apaise.'] },
  { id: 'gobelets', name: 'Les trois gobelets', detail: '5 min · concentration', scene: 'gobelets', steps: ['Cache une croquette sous un gobelet, devant lui.', 'Ajoute deux gobelets vides, puis mélange lentement.', 'Il désigne le bon : il gagne la croquette.'] },
  { id: 'tresor', name: 'Chasse au trésor', detail: '10 min · flair', scene: 'flair', steps: ['Cache 5 à 10 croquettes dans une pièce ou le jardin.', 'Libère-le avec « cherche ».', 'Commence facile, bien en vue.'] },
  { id: 'parcours', name: 'Parcours maison', detail: '10 min · confiance', scene: 'parcours', steps: ['Installe 3 obstacles simples : un coussin, un balai au sol, un carton ouvert.', 'Guide-le avec une croquette, sans le forcer.', 'Félicite chaque obstacle approché, même reniflé seulement.'] },
]

export const CHEWS: Idea[] = [
  { id: 'carotte', name: 'Carotte congelée', detail: 'À préparer au congélateur', scene: 'macher-froid', steps: ['Lave une carotte entière et mets-la 2 h au congélateur.', 'Donne-la entière : le froid soulage les dents qui poussent.'] },
  { id: 'kong', name: 'Kong glacé', detail: 'À préparer au congélateur', scene: 'macher-froid', steps: ['Mélange une part de ses croquettes avec du yaourt nature, sans sucre ni édulcorant.', 'Remplis le Kong et laisse une nuit au congélateur.'] },
  { id: 'concombre', name: 'Bâtonnets de concombre', detail: 'Prêt tout de suite', scene: 'macher', steps: ['Coupe un tronçon de concombre en gros bâtonnets.', 'Deux ou trois suffisent.'] },
  { id: 'haricots', name: 'Haricots verts glacés', detail: 'À préparer au congélateur', scene: 'macher-froid', steps: ['Haricots verts nature, sans sel ni sauce.', 'Une petite poignée, encore congelés.'] },
  { id: 'lecher', name: 'Assiette à lécher', detail: 'À préparer au congélateur', scene: 'macher-froid', steps: ['Étale du yaourt nature ou de la purée de courgette sur une assiette.', 'Congèle une heure : lécher l’apaise.'] },
]

export const CHEW_RULES = 'Toujours sous surveillance, et compté dans sa ration. Jamais de raisin, oignon, ail, avocat, chocolat ni os cuit. À valider avec le vétérinaire en cas de doute.'

/** Une idée par jour, la même toute la journée : elle change le lendemain. */
export const ideaOfTheDay = (ideas: Idea[], dayNumber: number, shift = 0): Idea => ideas[(((dayNumber + shift) % ideas.length) + ideas.length) % ideas.length]!
