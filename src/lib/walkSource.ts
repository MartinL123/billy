// R-092 : d’où vient une balade, en une seule étiquette, la même dans la liste et sur la fiche.

/** « Fichier » (GPX importé), « iPhone » (GPS de l’app), « Watch » (Apple Watch), « Notée » (à la main, sans enregistrement). */
export type WalkSourceLabel = 'Fichier' | 'iPhone' | 'Watch' | 'Notée'

/**
 * La source vient de l’entrée du Carnet (`strava`, `watch`, `gps`) ou de son trajet (`gpx`, `watch`, `gps`).
 * Un fichier importé reste « Fichier » : on ne sait pas d’où il vient (Strava ou autre), on ne le devine pas.
 * Sans source, le trajet a été tracé ou noté à la main : « Notée ».
 */
export function walkSourceLabel(entrySource?: string, routeSource?: string): WalkSourceLabel {
  if (entrySource === 'watch' || routeSource === 'watch') return 'Watch'
  if (entrySource === 'gps' || routeSource === 'gps') return 'iPhone'
  if (entrySource === 'strava' || routeSource === 'gpx') return 'Fichier'
  return 'Notée'
}
