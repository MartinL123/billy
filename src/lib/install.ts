/** Le bandeau « Ajoutez Billy à votre écran d'accueil » revient au plus tous les 7 jours après avoir été fermé. */
export const INSTALL_BANNER_PAUSE_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

export function showInstallBanner(standalone: boolean, dismissedAt: number | null, now: number): boolean {
  if (standalone) return false
  return dismissedAt === null || now - dismissedAt >= INSTALL_BANNER_PAUSE_DAYS * DAY
}
