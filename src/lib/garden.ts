// Sans jardin ni cour (questionnaire : « Avez-vous un jardin ou une cour ? » → Non), les textes du dressage
// parlent de « couloir, palier, parc vide » à la place (questionnaire-depart.md, partie 3).

const RULES: [RegExp, string][] = [
  [/au jardin ou dans la cour|dans la cour ou au jardin/gi, 'dans le couloir ou un parc vide'],
  [/au jardin/gi, 'dans le couloir ou un parc vide'],
  [/ou le jardin/gi, 'ou le palier'],
  [/ou jardin/gi, 'ou couloir, palier'],
  [/le jardin/gi, 'le couloir'],
  [/jardin/gi, 'parc vide'],
]

const keepCase = (match: string, replacement: string) => (/^[A-ZÀ-Ý]/.test(match) ? replacement.replace(/^./, (c) => c.toLocaleUpperCase('fr')) : replacement)

/** Le texte sans « jardin ». */
export function withoutGarden(text: string): string {
  return RULES.reduce((t, [pattern, replacement]) => t.replace(pattern, (m) => keepCase(m, replacement)), text)
}

// Réglage du compte, posé par le store dès que le profil est lu : les textes du catalogue sont partout dans l'app.
let noGarden = false
export const setNoGarden = (value: boolean) => {
  noGarden = value
}

/** Le texte tel qu'il faut l'afficher pour ce chien. */
export const place = (text: string): string => (noGarden ? withoutGarden(text) : text)
