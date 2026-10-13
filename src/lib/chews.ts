import { dayNumber, type ISODate } from './dates'

export interface Chew {
  id: string
  name: string
  /** À préparer à l'avance au congélateur. */
  frozen: boolean
  steps: string[]
}

/**
 * Choses à mâcher ou à lécher, pour occuper et apaiser. Uniquement des aliments courants sans danger pour le chien,
 * nature, en petite quantité. À faire valider par le vétérinaire en cas de doute.
 */
export const CHEWS: Chew[] = [
  { id: 'carotte', name: 'Carotte congelée', frozen: true, steps: ['Lave une carotte entière et mets-la 2 h au congélateur.', 'Donne-la entière : le froid soulage les dents qui poussent.'] },
  { id: 'kong', name: 'Kong glacé', frozen: true, steps: ['Mélange une part de ses croquettes avec du yaourt nature, sans sucre ni édulcorant.', 'Remplis le Kong et laisse une nuit au congélateur.'] },
  { id: 'concombre', name: 'Bâtonnets de concombre', frozen: false, steps: ['Coupe un tronçon de concombre en gros bâtonnets.', 'Frais ou sortis du congélateur, deux ou trois suffisent.'] },
  { id: 'haricots', name: 'Haricots verts glacés', frozen: true, steps: ['Haricots verts nature, sans sel ni sauce.', 'Une petite poignée, encore congelés.'] },
  { id: 'courgette', name: 'Rondelles de courgette', frozen: true, steps: ['Coupe une courgette crue en rondelles épaisses.', 'Congèle-les à plat, donnes-en quelques-unes.'] },
  { id: 'pomme', name: 'Quartier de pomme', frozen: true, steps: ['Retire le trognon et tous les pépins.', 'Un quartier, frais ou congelé.'] },
  { id: 'glacons', name: 'Glaçons de bouillon', frozen: true, steps: ['Bouillon maison sans sel, sans oignon ni ail, dans un bac à glaçons.', 'Un ou deux glaçons, dehors ou sur une serviette.'] },
  { id: 'torchon', name: 'Torchon noué glacé', frozen: true, steps: ['Mouille un torchon propre, fais un gros nœud, congèle-le.', 'Reprends-le s’il commence à le déchiqueter.'] },
  { id: 'lecher', name: 'Assiette à lécher', frozen: true, steps: ['Étale du yaourt nature ou de la purée de courgette sur une assiette ou un tapis à lécher.', 'Congèle une heure : lécher l’apaise.'] },
]

export const CHEW_RULES = 'Toujours sous surveillance, et compté dans sa ration. Jamais de raisin, oignon, ail, avocat, chocolat ni os cuit.'

const CHEW_PREFIX = 'macher-'
export const chewSessionId = (chew: Chew) => `${CHEW_PREFIX}${chew.id}`
export const isChew = (session: { exerciseId: string }) => session.exerciseId.startsWith(CHEW_PREFIX)

/** Idée du jour : la même toute la journée. */
export const chewOfTheDay = (today: ISODate): Chew => CHEWS[(((dayNumber(today) * 4) % CHEWS.length) + CHEWS.length) % CHEWS.length]!
