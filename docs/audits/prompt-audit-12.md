# Prompt Claude Code : audit n°12 (10 novembre)

Lis CLAUDE.md, puis les tickets R-104, R-105 et R-106 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## R-104 · Balades de la Watch : rattrapage sûr et alerte d'expiration
Contexte : l'app iOS expire après 7 jours (compte Apple gratuit). Dernière lecture vers le 24/10, soit ~17 jours à rattraper.
- `readAndImport` (src/features/balades/watchImport.ts) : si `since` date de plus de 7 jours, lire par tranches de 7 jours
  (getWalks avec une fin de tranche — ajouter `until` au plugin natif si besoin, sinon filtrer côté JS) et enregistrer
  `watchSyncedAt` = fin de la tranche après chaque tranche réussie. Une tranche qui échoue n'empêche pas la suivante à la prochaine ouverture.
  Fonction pure testée dans src/lib/watch.ts (`watchChunks(since, now)`).
- Notification locale planifiée 6 jours après chaque ouverture de l'app iOS : « Flair expire demain : relancez-le depuis Xcode ». Replanifiée à chaque ouverture.
- Web et iOS : dans Balades, une ligne discrète « Dernière lecture de la Watch : il y a 12 jours » quand `watchSyncedAt` date de plus de 7 jours (compte qui lit la Watch seulement).

## R-105 · Panneau : geste saccadé
- `releaseSpeed` (src/lib/sheetGesture.ts) : avec un seul mouvement dans les 100 dernières ms, prendre la vitesse entre les deux derniers mouvements. Test unitaire.
- panneau.spec.ts:172 passe 3 fois de suite dans la suite complète.

## R-106 · « Me situer » et Affichage
- Pendant qu'Affichage est ouvert, « Me situer » reste en place (ou se cache entièrement).
- À 320 × 568, la fenêtre Affichage finit au-dessus du rond Accueil (ou défile).

## Vérifier avant de pousser
- `npm test`, `npm run build`, `npm run test:e2e`, skill `apple-design` sur Balades.
- Puis `npm run build:ios` : Martin fera Run dans Xcode.

## T-121 · Sorties détectées par les pas (validé par Martin le 10 nov.)
Constat (export Santé du 10/11) : Martin porte rarement sa Watch. Flair ne lit que les séances Watch, donc ses vraies
sorties avec l'iPhone en poche n'arrivent jamais (12 sorties de 15 min ou plus entre le 27/10 et le 10/11, toutes invisibles).
Montrer d'abord la maquette de la carte « Sortie détectée » à Martin, puis coder.

**Natif (FlairNativePlugin.swift, sous isNative())**
- Nouvelle méthode `getWalkingBouts({ since })` : `HKStatisticsCollectionQuery` sur `distanceWalkingRunning`,
  `.cumulativeSum`, intervalle 5 min (Santé fusionne seul iPhone + Watch, pas de doublon). Renvoie `[{ start, meters }]`.
- Ajouter `distanceWalkingRunning` aux types lus (même demande d'autorisation que getWalks).

**Logique (src/lib/walkingBouts.ts, fonction pure testée)**
- `detectOutings(buckets, { walks, noted })` : blocs de tranches à 150 m ou plus, trous de 10 min au plus fusionnés,
  15 min et 400 m au minimum. Écarter un bloc qui chevauche une balade (tracé) ou une sortie déjà notée.
- Créneau (matin, midi, soir) selon l'heure de départ, avec les règles existantes de `src/lib/walks.ts`.

**Données**
- `users/{uid}/walks/{date}.detected` (nouveau champ optionnel) : `[{ start, end, meters, status: 'pending' | 'yes' | 'no' }]`.
- « C'était avec Billy » : `noted[slot]` = durée en minutes, `done[slot]` = heure de départ (réutilise NotedOuting, R-044/R-095).
  La sortie compte alors dans « Ses sorties du jour » et le journal, comme « J'ai fait cette sortie ».
- « Pas avec lui » : `status: 'no'`, plus jamais proposée.

**Interface**
- À l'ouverture de l'app iOS (même moment que syncWatch, rattrapage sur 14 jours la première fois) : un bandeau
  « 3 sorties repérées par votre iPhone » ouvre la liste. Chaque carte : « Mar. 7 nov. · 17 h 20 · 30 min · 1,8 km »,
  deux boutons sur une ligne : primary « C'était avec Billy », tertiary « Pas avec lui ».
- Dans le journal, une sortie confirmée affiche « Repérée par l'iPhone » (sans tracé ni carte).
- Web : rien de nouveau (Santé n'y est pas lisible).

**Recette**
- Tests de detectOutings avec les données du 7 nov. (10 h 55 → 11 h 20, 1,3 km ; 17 h 20 → 17 h 50, 1,8 km) : 2 sorties.
- Une séance Watch et une sortie détectée au même moment : une seule balade.
