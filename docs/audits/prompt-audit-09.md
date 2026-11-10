# Prompt Claude Code : audit n°9 (23 octobre)

Lis CLAUDE.md, puis les tickets R-094 à R-099 du kanban (Projet = Billy).
Maquettes : https://claude.ai/artifact/RyR8UHEZb3jX1hR9SV97H7 (onglets « La carte », « Fiche sans trous », « Badges », « Défilement »).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## Tout de suite (validé)

### R-099 · Défilement du panneau de la carte (useSheet.ts) — en premier
- Aujourd'hui le geste est réparti en changeant `touch-action` pendant le geste (`pan-up pan-x` au cran haut). Safari iOS ne connaît pas `pan-up` et un changement de touch-action ne compte qu'au geste suivant.
- Remplacer par des événements tactiles : `touchstart` / `touchmove` (`passive: false`). À chaque déplacement, le panneau décide :
  - cran réduit ou moitié : il prend le geste (`preventDefault`) ; s'il atteint le cran haut et que le doigt monte encore, il rend la main à la liste dans le même geste ;
  - cran haut : la liste défile (élan natif) ; si `scrollTop <= 0` et que le doigt descend, il prend le geste et descend.
- `touch-action: pan-y` fixe sur la liste, plus aucun `pan-up`. Un glissement n'ouvre jamais la carte touchée. Garder la souris (pointer) pour le web.
- Test sur iPhone (Chrome ne reproduit pas le bug). Les mêmes règles servent au journal, à la fiche et à la relecture.

### R-096 · Revoir la balade en 3ᵉ personne
- Remettre la caméra de `replayWalk` (src/features/balades/walkLayer.ts, retirée de la fiche par c9ff9ef) : carte inclinée, caméra qui suit le chien et tourne dans le sens de la marche.
- Garder les commandes de T-108 (lecture/pause, barre de temps, × 0,5 à × 4, heure et rue) dans le panneau ; baisser le panneau laisse lecture + barre, la carte prend l'écran (point 6).
- « Réduire les animations » : la caméra ne bouge pas seule, lecture lancée à la main.

### R-097 · Ses badges (page Billy)
- 3 badges par ligne (option A de la maquette), compétences en cours d'abord ; nom sur 2 lignes au plus, jamais coupé dans un mot (`word-break: keep-all`, pas de césure). 320 et 390 px, texte agrandi.

## Après la validation des maquettes par Martin (tickets en « Conception » : ne pas commencer avant qu'ils passent en « À faire »)

### R-094 · Une seule carte
- Toucher un tracé : en avant, popin en bas (titre, date, durée, distance, « Voir › »), panneau réduit. Toucher ailleurs : popin fermée.
- Popin ou balade du journal : la fiche s'ouvre dans le panneau de la carte (cran du milieu), la carte (celle de l'onglet Balades) se cadre sur la balade, les autres tracés pâlissent ; « ‹ Le journal » revient. Supprimer la seconde carte de la fiche (WalkMap). #/souvenir/<id> ouvre l'onglet Balades sur cette fiche.

### R-095 · Fiche sans trous
- Un bloc seulement s'il a une valeur utile (tableau de la maquette) ; Stats en 3 ou 4 cases, jamais à 0 ; « Revoir » et « Raconter » côte à côte en haut ; Partager, Modifier, Supprimer en liens texte ; météo sur une ligne ; heures de la frise toujours sur une ligne (« 10 h 49 », colonne à la largeur de la plus longue, chiffres tabulaires) ; sortie notée sans trajet : encadré « Pas de trajet… ». Fonction pure testée qui dit quels blocs afficher.

### R-098 · Le journal d'Oslo
- Le panneau liste, par jour : balades (comme aujourd'hui), sorties notées sans trajet, souvenirs, séances, santé faite (soin donné, pesée). Pastilles Tout · Balades · Souvenirs · Séances · Santé. Rien de nouveau dans Firestore : on lit ce qui existe.

## Vérifier avant de pousser
- 390 × 844 et 320 × 568, texte agrandi, skill `apple-design` sur les écrans modifiés.
- `npm test`, `npm run build`, `npm run test:e2e`.
