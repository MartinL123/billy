# Prompt Claude Code : audit n°10 (23 octobre, 14 h)

Lis CLAUDE.md, puis les tickets R-096, R-100 et R-101 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## R-096 · Revoir la balade : on doit voir la carte (en premier)
La vue en 3ᵉ personne est revenue, mais :
- « ▶ Revoir la balade » ouvre le panneau au cran HAUT : il couvre toute la carte. Ouvrir la lecture au cran bas, à la hauteur des commandes seulement (« ‹ La balade », lecture/pause, barre de temps, vitesses), la carte au-dessus en grand. La phrase « Baissez le panneau… » devient inutile : la retirer.
- Panneau au cran du milieu, le chien est tout en haut de l'écran, presque caché : la caméra de replayWalk doit centrer le chien dans la partie visible de la carte (padding = hauteur du panneau + boutons du haut), et suivre quand le panneau change de cran.
- Vérifier à 390 × 844 et 320 × 568 : le chien et 100 m de trajet devant lui toujours visibles.

## R-101 · Test e2e R-094 / R-096
- Le test attend « Pause » après « Revoir » mais la balade de test (24 points) est relue en moins d'une seconde à × 4. Choisir × 0,5 avant, ou une balade de test plus longue. 3 lancements de suite à 17 sur 17.

## R-100 · Journal : ancien soin
- « Prochain : … » seulement sur le dernier soin de chaque type ; un soin plus ancien montre juste « Vermifuge donné ».

## Vérifier avant de pousser
- `npm test`, `npm run build`, `npm run test:e2e`, skill `apple-design` sur Revoir.
