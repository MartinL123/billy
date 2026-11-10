# Prompt Claude Code — 22 octobre 2026 (nuit) : maquettes validées de toutes les pages

Lis `docs/design/contexte-flair.md`, puis **`docs/maquettes/flair-2026-10-22/README.md`**, puis ouvre
`docs/maquettes/flair-2026-10-22/index.html` dans un navigateur. **Ces maquettes font foi** : chaque écran a son fichier
dans `docs/maquettes/flair-2026-10-22/sources/` ; le statut (Prod / Validé · à construire / Proposition) dit ce qu'il
faut changer. Pour tout le reste, `docs/specs/spec-v6-1-retours.md` reste valable.

**Pré-requis : le lot V6.1 (`prompt-claude-code-2026-10-22-soir.md`, T-094 à T-104) doit être terminé.** Sinon, finis-le
d'abord, puis enchaîne sur ce lot.

Tickets Notion (Projet = Billy) : **T-106 à T-111** (T-112 = recette avec Martin). **Un ticket = un commit**, dans l'ordre
ci-dessous. Après chaque commit poussé : ticket en « Révision du code » + ligne datée dans « Historique ». Ne passe rien en
« Done ». Enchaîne sans t'arrêter ; si une décision manque, prends le plus simple, note-le dans le ticket et continue.
Ne commite que tes propres fichiers.

## L'ordre

1. **T-106 · Composants et boutons communs** (toute l'app)
   - Convention de boutons : action orange (un par écran), primary vert plein, secondary fond vert clair (`#DCEBE6`),
     tertiary bordure verte 2 px. Crée/ajuste les composants partagés, puis remplace les variantes locales.
   - Tous les « Supprimer … » et « Annuler la balade » : tertiary **rouge** (bordure `#B3261E`, fond blanc) avec icône
     poubelle (ou croix pour Annuler), pleine largeur, confirmation avant d'agir.
   - Rien ne passe à la ligne : boutons, pastilles, filtres (rangées qui défilent horizontalement), chiffres et leurs
     libellés (`white-space: nowrap`). Rangées de chiffres en `space-between`, texte centré.
   - Arrondis et ombres du design system partout : cartes 20 px + ombre de carte, champs/tuiles 14 px, panneaux 26 px.
   - « Affichage » (icône calques) et « Me situer » (icône cible) avec leur icône sur toutes les cartes.
2. **T-107 · Fiche d'une balade** (`Fiche.dc.html`)
   - Surtitre « Balade n° X avec Billy » (numéro = rang depuis l'adoption) ; ligne 1 date + heures ; ligne 2
     « Billy avait … · Ville ».
   - Allure : « Allure moyenne · Au plus vite · Sans pause » (plus longue période de marche sans arrêt, tirée des arrêts
     détectés) — plus de « 1er km ».
   - « Le parcours » : rues avec pastilles « nouvelle » (vert) et « parc » (gris), alignées ; **aucun compteur de passages**.
   - Chaque arrêt de « Ce qui s'est passé » est touchable et ouvre « Raconter la balade » **sur cet arrêt**, rempli ou non ;
     un arrêt rempli montre sa réponse avec un petit crayon.
   - Les photos apparaissent aussi en vignettes **sur la carte, à l'endroit de la prise** (position EXIF) ; toucher une
     photo ouvre « Photo en grand » (`Photo.dc.html`).
   - Le contenu est un **panneau à poignée** posé sur la carte (haut arrondi 26 px) ; on le glisse vers le bas pour la
     carte en grand (`FicheCarte.dc.html`), vers le haut pour revenir.
   - En bas, trois boutons empilés : **Partager** (tertiary + icône partage iOS), **Modifier** (secondary, crayon),
     **Supprimer** (tertiary rouge, poubelle). Garde « Raconter la balade » en action orange fixe.
3. **T-108 · Revoir la balade, photo en grand, modifier la balade**
   - « Revoir la balade » ouvre `Revoir.dc.html` : point qui avance sur le trajet, heure + rue en haut, lecture/pause,
     barre de position, vitesses **× 0,5 · × 1 · × 2 · × 4** (× 4 par défaut).
   - `Photo.dc.html` : plein écran noir, « 1 sur N », balayage entre photos, lieu + heure, « Voir sur la carte », fermer.
   - Un seul « Modifier » : l'écran « Modifier la balade » (`ModifierSouvenir.dc.html`) contient photos, texte, tags,
     date **et** la ligne « Début et fin du trajet » qui ouvre l'écran Ajuster.
   - « Raconter la balade » (`Raconter.dc.html`) : si l'arrêt est déjà raconté, la réponse est cochée (bordure orange,
     ✓) et on peut la changer.
4. **T-109 · Balades : carte, balade en cours, import**
   - `BaladeEnCours.dc.html` : ajoute « Annuler la balade » (tertiary rouge, croix) sous Pause / Terminer ; ramène à la
     carte sans rien enregistrer, après confirmation.
   - Menu « Affichage » : ajoute un calque **« Lieux les plus fréquentés »** (heatmap des passages), éteint par défaut.
   - « Balades importées » (`ImportResultat.dc.html`) : structure de la prod, mais chiffres « Balades · Parcourus ·
     Nouvelles rues » (pas de pourcentage découvert).
5. **T-110 · Son profil** (`Profil.dc.html`)
   - Reprends la maquette : photo + « Changer la photo », identité avec « Modifier », bloc « Ce qui l'inquiète »
     (pastilles orange pour les peurs, vertes pour ce qui va bien, tirées du questionnaire), contacts, sorties, famille,
     **nouveau bloc « Réglages »** (Notifications · Balades détectées (montre) · Unités), compte.
   - Boutons du bas : « Changer mon mot de passe » primary, « Exporter mes données » secondary, « Mettre l'app sur mon
     téléphone » et « Se déconnecter » tertiary, « Supprimer mon compte et mes données » tertiary rouge.
6. **T-111 · Petites retouches**
   - Exercice : le lien vers la compétence devient une pastille d'une ligne « Voir la compétence « Le Lien » › ».
   - « Tous les événements » et « Nouvel événement » : filtres/types sur une ligne, sans compression.
   - Repas : le formulaire « Indiquer ses repas » propose **1, 2, 3 ou 4 repas par jour** (1 est possible) et calcule
     la portion par repas.

Relis chaque écran modifié avec `.claude/skills/apple-design/` et compare-le à sa maquette avant de pousser.

## Critères de fin

Chaque écran « Validé · à construire » correspond à sa maquette (captures Playwright 390 × 844 jointes au ticket) ;
`npm test`, TypeScript, Playwright et `npm run build` passent ; déploiement fait ; `npm run build:ios` passe. Puis
arrête-toi et demande à Martin de recetter (T-112).
