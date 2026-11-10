# Prompt Claude Code : sensation native (R-077 à R-081, R-065)

Lis CLAUDE.md, puis les tickets R-065, R-077, R-078, R-079, R-080 et R-081 du kanban (Projet = Billy).
Un commit par ticket, dans cet ordre. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.
Ne pas toucher à R-077 avant que Martin ait validé la maquette (ticket en « À faire ») ; s'il est encore en « Conception », fais le reste et arrête-toi là.

## 1. R-078 · Glisser depuis le bord gauche (app iOS)
- `ios/App/App/MainViewController.swift` : `webView?.allowsBackForwardNavigationGestures = true` (dans `capacitorDidLoad`).
- HashRouter : chaque écran est une entrée d'historique, le geste fait donc `history.back()`. Vérifie que revenir depuis la balade en cours, une feuille ouverte ou l'écran d'ouverture ne casse rien (bloquer le geste pendant `/balade-en-cours` si besoin, via une méthode FlairNative `setBackGesture(enabled)`).
- Changement natif : le dire à Martin (rebuild Xcode).

## 2. R-079 · Santé Apple demandée au bon moment
- `WatchSync` ne lance plus `getWalks` au démarrage tant que la personne n'a pas accepté. Mémoriser le choix (Firestore, profil, champ optionnel `watchSync: 'on' | 'later'`).
- Bouton « Retrouver les balades de ma montre » là où l'on ajoute ses balades (Balades) : ouvre une feuille (composant Sheet existant) qui explique en 2 phrases, vouvoiement : les balades faites avec la montre arrivent seules ; Flair lit seulement les entraînements « Marche ». Boutons « Continuer » (puis fenêtre d'iOS) et « Plus tard ».
- Si iOS refuse : texte « Activez Flair dans Réglages › Santé › Accès aux données et appareils. » ; l'app reste utilisable.
- Web : rien ne change.

## 3. R-080 · Retour haptique
- FlairNativePlugin : méthode `haptic({ style: 'success' | 'light' })` (`UINotificationFeedbackGenerator` / `UIImpactFeedbackGenerator(.light)`), sans dépendance. Côté web : `src/native/flair.ts`, `haptic()` ne fait rien hors `isNative()`.
- Succès : balade enregistrée, sortie notée, étape validée, os gagnés à la fête de fin. Léger : arrêt du panneau sur un cran (R-077). Rien d'autre.

## 4. R-081 · Appui long
- CSS : `-webkit-user-select: none; -webkit-touch-callout: none;` sur `button`, `a`, `[role=button]`, la barre d'onglets, les poignées, les cartes cliquables et la carte (MapLibre).
- Laisser sélectionnables : `input`, `textarea`, `[contenteditable]` et les textes lus (notes, détails d'un soin).

## 5. R-065 · L'app est claire et le dit
- `:root { color-scheme: light }` dans `src/index.css` et `<meta name="color-scheme" content="light">` dans `index.html`. Vérifie en mode sombre iOS : champs, cases, sélecteurs de date et barres de défilement restent clairs.

## 6. R-077 · Panneau de la carte à trois crans (après validation de la maquette)
Maquette : https://claude.ai/artifact/NWoDnajF3DYMfLHf9A5iNx (le code de la maquette montre la logique des gestes).
Dans `src/features/balades/useSheet.ts` (utilisé par Explorer et WalkPanel) :
- Remplacer `open: boolean` par `detent: 'peek' | 'mid' | 'full'`. Positions : peek = comme aujourd'hui (PEEK_MARGIN / SMALL_PEEK), mid = moitié de l'écran, full = sous la zone sûre du haut + 8 px.
- Ouverture en `mid` (petits écrans : `peek`, comme aujourd'hui).
- Geste : hors `full`, tout le panneau se tire (contenu compris), le contenu ne défile pas (`overflow: hidden`). En `full`, le contenu défile ; si `scrollTop <= 0` et que le doigt descend, le geste passe au panneau. Seuil de 6 px avant de décider.
- Fin du geste : vitesse > 0,5 px/ms = cran suivant dans le sens du geste, sinon le cran le plus proche. Au-delà des bornes : résistance (÷3).
- Animation : `transform 0.42s cubic-bezier(0.3, 1.12, 0.5, 1)`, aucune si `prefers-reduced-motion`.
- Poignée : bouton de 44 px, `aria-label` « Agrandir le panneau » / « Réduire le panneau » ; tap = peek → mid → full → mid. En `full`, bouton ⌄ « Réduire le panneau » en haut à droite (44 px).
- En `full`, « Affichage » et « Me situer » s'effacent (opacité suivant la position) et ne sont plus focusables.
- Garder le fondu du contenu en `peek`, le focus et `inert` existants (R-058).
- Tests : la fonction qui choisit le cran (position, vitesse) dans `src/lib/`, avec Vitest.

## Vérifier avant de pousser
- 390 × 844 et 320 × 568, avec « Texte agrandi » (R-056). Skill `apple-design` sur les écrans modifiés.
- `npm test`, `npm run build`.
- Me dire ce qui demande un rebuild Xcode (R-078, R-079, R-080).
