// La boutique (spec V3 § 2 bis.1) : ce qu'on peut s'offrir avec les os. Le catalogue vit dans le code, le même pour tous.
// Les identifiants sont enregistrés dans Firestore (inventaire, ce que le chien porte) : ne jamais les renommer.

export type ShopCategory = 'accessoire' | 'cadre' | 'fond' | 'sticker' | 'couleur'

export const SHOP_CATEGORIES: { id: ShopCategory; label: string; /** Champ de `dog.cosmetics`. */ slot: 'accessory' | 'frame' | 'background' | 'sticker' | 'theme' }[] = [
  { id: 'accessoire', label: 'Accessoires', slot: 'accessory' },
  { id: 'cadre', label: 'Cadres photo', slot: 'frame' },
  { id: 'fond', label: 'Fonds de l’arbre', slot: 'background' },
  { id: 'sticker', label: 'Stickers du Carnet', slot: 'sticker' },
  { id: 'couleur', label: 'Couleurs de l’app', slot: 'theme' },
]

export interface ShopItem {
  id: string
  category: ShopCategory
  name: string
  price: number
}

/** Prix de départ : stickers 40, accessoires 60 à 300, cadres 80 à 120, fonds 200 à 250, couleurs 300. */
export const SHOP: ShopItem[] = [
  { id: 'bandana-rouge', category: 'accessoire', name: 'Bandana rouge', price: 60 },
  { id: 'noeud-papillon', category: 'accessoire', name: 'Nœud papillon', price: 80 },
  { id: 'casquette', category: 'accessoire', name: 'Casquette', price: 120 },
  { id: 'lunettes', category: 'accessoire', name: 'Lunettes de soleil', price: 150 },
  { id: 'couronne', category: 'accessoire', name: 'Couronne', price: 200 },
  { id: 'cape', category: 'accessoire', name: 'Cape de super-héros', price: 300 },
  { id: 'cadre-dore', category: 'cadre', name: 'Cadre doré', price: 80 },
  { id: 'cadre-fleurs', category: 'cadre', name: 'Cadre fleuri', price: 100 },
  { id: 'cadre-pois', category: 'cadre', name: 'Cadre à pois', price: 120 },
  { id: 'fond-automne', category: 'fond', name: 'Automne', price: 200 },
  { id: 'fond-neige', category: 'fond', name: 'Neige', price: 220 },
  { id: 'fond-mer', category: 'fond', name: 'Bord de mer', price: 250 },
  { id: 'sticker-patte', category: 'sticker', name: 'Patte', price: 40 },
  { id: 'sticker-coeur', category: 'sticker', name: 'Cœur', price: 40 },
  { id: 'sticker-os', category: 'sticker', name: 'Os', price: 40 },
  { id: 'sticker-soleil', category: 'sticker', name: 'Soleil', price: 40 },
  { id: 'couleur-nuit', category: 'couleur', name: 'Bleu nuit', price: 300 },
  { id: 'couleur-prune', category: 'couleur', name: 'Prune', price: 300 },
]

export const shopItem = (id: string | undefined) => SHOP.find((i) => i.id === id)
export const slotOf = (category: ShopCategory) => SHOP_CATEGORIES.find((c) => c.id === category)!.slot

/**
 * Couleurs de l'app : elles remplacent seulement le vert principal (cartes, onglet actif, boutons contour).
 * Les couleurs des territoires et l'orange de l'action ne changent jamais. Blanc sur `primary` : contraste AA vérifié.
 */
export const THEMES: Record<string, { primary: string; dark: string; soft: string }> = {
  'couleur-nuit': { primary: '#2B4C7E', dark: '#1D355C', soft: '#E3EAF8' },
  'couleur-prune': { primary: '#6B3A6E', dark: '#4E2851', soft: '#F1E4F1' },
}

export type ButtonState = { kind: 'acheter'; price: number } | { kind: 'porter' } | { kind: 'porte' } | { kind: 'manque'; missing: number }

/** Le seul bouton d'une carte d'objet, selon son état. Jamais rouge quand il manque des os. */
export function buttonState(item: ShopItem, owned: boolean, worn: boolean, bones: number): ButtonState {
  if (worn) return { kind: 'porte' }
  if (owned) return { kind: 'porter' }
  if (bones >= item.price) return { kind: 'acheter', price: item.price }
  return { kind: 'manque', missing: item.price - bones }
}
