# Prompt Claude Code : suite de l'audit n°8

Lis CLAUDE.md, puis les tickets R-082 à R-085 (audit n°7, pas encore livrés) et R-090 à R-093 (audit n°8) du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.
R-086 à R-089 (seconde passe de l'audit n°7) ont leur propre prompt, `prompt-audit-07b.md` : à faire aussi, R-086 (majeur) juste après R-093.
Ordre : R-093 d'abord (le banc de test doit être fiable avant le reste), puis R-085, R-091, R-082, R-090, R-083, R-092, R-084.

## R-093 · Banc de test instable
- 3 lancements de suite de `npm run test:e2e` à 10 sur 10. Erreur vue : « profil du premier lancement au serveur » (expect.poll) qui expire ; cas 13 aussi en échec une fois.
- Rendre le démarrage du compte robuste (attendre la confirmation du serveur, délai de poll plus long pour la première écriture), sans ralentir les cas qui passent.

## R-085 · Bienvenue (src/features/start/Welcome.tsx)
- Retirer « … et rapporte des os » (T-072). Bloc « Ses balades » : app iOS « Partez en balade : l'iPhone l'enregistre, même écran verrouillé. » ; web : l'import reste.

## R-091 et R-082 · Boutons sous le rond Accueil, au cran du milieu
- Balade ouverte sur la carte : « Revoir la balade » et « Ajouter un repère » entièrement visibles au-dessus du rond Accueil (ou « Ajouter un repère » en action texte à côté).
- Panneau des balades : au moins une rangée de cartes entière au-dessus du bouton collé.
- Une seule règle pour les deux panneaux (useSheet / WalkPanel) ; vérifier 320 × 568, 390 × 844, texte agrandi.

## R-090 · Stats
- Dans le composant Stats, les chiffres d'une ligne restent alignés en haut quel que soit le libellé. « Ses balades » : libellé « découvert » (la commune est dite ailleurs) ou commune sur une ligne.

## R-083 · Santé à 320 px
- « Aucun rappel prévu » jamais en « … » à côté de « Le prévoir » : le texte passe à la ligne ou le bouton passe dessous.

## R-092 · Source d'une balade
- Une seule étiquette, la même dans la liste et sur la fiche : « Fichier » pour un GPX (« Strava » seulement si c'est sûr), « iPhone », « Watch », « Notée ».

## R-084 · #/mesure
- Les lignes JSON passent à la ligne, la page ne défile jamais de côté ; « Rechargements après une coupure » sans « (R-042) ».

## Vérifier avant de pousser
- 390 × 844 et 320 × 568, texte agrandi, skill `apple-design` sur les écrans modifiés.
- `npm test`, `npm run build`, `npm run test:e2e` trois fois.
