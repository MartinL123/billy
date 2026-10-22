import { ofName } from './gender'

// R-089 : le nom du chien dans une phrase, même quand il n’est pas encore donné (le store dit alors « Votre chien »,
// avec `unnamed: true`). « Bonjour, Votre chien » ou « la carte de Votre chien » ne se lisent pas : on écrit
// « votre chien » en milieu de phrase, et l’écran choisit sa tournure quand le nom manque (« Bonjour ! »).

/** Le nom affiché tant que le chien n’a pas de nom (store.tsx). */
export const UNNAMED_DOG = 'Votre chien'

type NamedDog = { name: string; unnamed?: boolean }

/** Le nom en début de phrase (« Billy », « Votre chien ») ou en milieu de phrase (« Billy », « votre chien »). */
export function dogName(dog: NamedDog, at: 'debut' | 'milieu' = 'milieu'): string {
  if (!dog.unnamed && dog.name.trim()) return dog.name
  return at === 'debut' ? UNNAMED_DOG : 'votre chien'
}

/** « de Billy », « d’Oscar », « de votre chien ». */
export const ofDog = (dog: NamedDog): string => ofName(dogName(dog))

/** Le vrai nom, ou rien (pour les textes qui ont leur propre tournure sans nom, et l’app iOS). */
export const realDogName = (dog: NamedDog): string => (dog.unnamed ? '' : dog.name.trim())
