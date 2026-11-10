# Prompt Claude Code : suite de l'audit n°7 (R-082 à R-085)

Lis CLAUDE.md, puis les tickets R-082, R-083, R-084 et R-085 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## R-085 · Bienvenue (src/features/start/Welcome.tsx), d'abord
- Retirer « … et rapporte des os » (le profil ne rapporte plus d'os depuis T-072).
- Bloc « Ses balades » : dans l'app iOS (`isNative()`), « Partez en balade : l'iPhone l'enregistre, même écran verrouillé. » ; sur le web, l'import Strava reste.
- Les trois blocs suivent les 3 métiers (balade, santé, entraînement du jour). Garder « +10 os pour bien commencer » seulement s'il est vraiment crédité.

## R-082 · Balades, panneau au cran du milieu
- À l'ouverture (cran du milieu), au moins une rangée de cartes de balades entièrement visible au-dessus du bouton collé « Ajouter mes balades » / « Partir en balade ».
- Piste la plus simple : ne pas coller le bouton sur la liste au cran du milieu (il suit la liste), ou raccourcir le texte d'introduction. Garder le comportement des crans (R-077).
- Vérifier à 320 × 568, 390 × 844 et en texte agrandi.

## R-083 · Santé à 320 px
- Ligne Antiparasitaire : « Aucun rappel prévu » ne doit jamais finir en « … » à côté de « Le prévoir ». Le texte passe à la ligne ou le bouton passe dessous. Même règle pour toutes les lignes de soins.

## R-084 · Mesure (#/mesure)
- Les lignes JSON du journal passent à la ligne (`overflow-wrap: anywhere`) ou défilent dans leur propre bloc : la page ne défile jamais de côté (aujourd'hui 526 px à 390 px).
- « Rechargements après une coupure » au lieu de « … (R-042) ».

## Vérifier avant de pousser
- 390 × 844 et 320 × 568, texte agrandi, skill `apple-design` sur les écrans modifiés.
- `npm test`, `npm run build`, `npm run test:e2e`.
