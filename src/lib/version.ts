import { formatHour } from './walks'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** R-113 : « Version du 10 novembre à 14 h 22 » (Son profil, bas), avec l’heure commune (`formatHour`), heure de l’appareil. */
export function versionLabel(built: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Version du ${built.getDate() === 1 ? '1er' : built.getDate()} ${MONTHS[built.getMonth()]} à ${formatHour(`${pad(built.getHours())}:${pad(built.getMinutes())}`)}`
}
