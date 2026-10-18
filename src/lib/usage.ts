// Espace par compte (docs/specs/communaute.md § 2) : Firestore gratuit = 1 Go en tout ; avec 10 comptes,
// chacun a 80 Mo (marge gardée). Le texte reste toujours possible ; seules les photos et documents s’arrêtent.

export const USER_QUOTA = 80 * 1024 * 1024
/** À partir de 90 %, un message doux. */
export const ALMOST_FULL = 0.9

export type UsageLevel = 'ok' | 'presque' | 'plein'

export function usageLevel(bytes: number): UsageLevel {
  if (bytes >= USER_QUOTA) return 'plein'
  if (bytes >= USER_QUOTA * ALMOST_FULL) return 'presque'
  return 'ok'
}

/** Peut-on encore ajouter ce fichier ? */
export const fits = (used: number, size: number) => used + size <= USER_QUOTA

const mo = (bytes: number) => Math.max(0, Math.round(bytes / (1024 * 1024)))

/** « Espace utilisé : 34 Mo sur 80 Mo » */
export const usageLabel = (bytes: number) => `Espace utilisé : ${mo(bytes)} Mo sur ${mo(USER_QUOTA)} Mo`

export const FULL_MESSAGE = 'Votre espace est plein : supprimez d’anciennes photos ou documents pour en ajouter. Vous pouvez toujours écrire.'
export const ALMOST_FULL_MESSAGE = 'Votre espace est presque plein. Pensez à supprimer d’anciennes photos.'
