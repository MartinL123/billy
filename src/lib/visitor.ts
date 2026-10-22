// Mode visiteur (T-048) : ce qu’un proche invité peut ouvrir. Il voit tout (balades, souvenirs, santé, progrès),
// sauf les documents, et ne modifie rien : les écrans qui servent à ajouter ou à changer quelque chose le renvoient
// à l’accueil.

const WRITE_ROUTES = [
  /^\/noter$/,
  /^\/questionnaire/,
  /^\/bienvenue$/,
  /^\/boutique$/,
  /^\/importer/,
  /^\/balade-en-cours$/,
  /^\/boucle\//,
  /^\/exercice$/,
  /^\/mission$/,
  /^\/en-cours$/,
  /^\/profil\/modifier$/,
  /^\/evenement\//,
  /^\/souvenir\/[^/]+\/modifier$/,
  /^\/document\//,
  /^\/sante\/documents$/,
  /^\/meute/,
  /^\/mesure$/,
]

/** Vrai pour un écran qu’un visiteur ne peut pas ouvrir. */
export const isWriteRoute = (pathname: string) => WRITE_ROUTES.some((route) => route.test(pathname))

/** Le lien à envoyer au proche : il l’ouvre une fois connecté à son compte. */
export function inviteLink(code: string, location: { origin: string; pathname: string }): string {
  return `${location.origin}${location.pathname}#/invitation/${code}`
}
