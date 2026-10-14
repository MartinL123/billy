# Prompt Claude Code — tout ce qui reste à faire (mis à jour le 14 octobre, 17 h 35)

Prompt unique : comptes en priorité (v3-5), puis retouches, v3-10, v3-15, v3-14, v3-11 et v3-6.
La partie console Firebase est déjà faite.

```
Voici tout ce qui reste à faire sur l'app, dans l'ordre. Lis d'abord CLAUDE.md, docs/specs/spec-v3-simplification.md (à jour),
docs/specs/communaute.md, docs/specs/trajets.md, docs/style-guide.html et les maquettes de docs/maquettes/ (V3-*), qui suivent maintenant l'app en ligne.
Ne modifie aucun fichier de docs/ sans me le demander. Aucune nouvelle dépendance sauf celles citées.
Firebase : j'ai déjà tout réglé dans la console (connexion par e-mail, domaines autorisés, compte de service).
Ne me redemande pas ces étapes ; s'il manque une variable ou un secret, dis-le-moi en une ligne.
Avance lot par lot, dans l'ordre ci-dessous. Si un point est déjà fait dans l'app, vérifie-le et passe au suivant.
Avant chaque lot, liste en quelques lignes ce qui change et attends mon « ok ».
Un commit par point, tests à jour, et montre-moi les écrans touchés en vue iPhone (390 × 844) avant de committer.

LOT 1 — EN PRIORITÉ : comptes des amis testeurs (10 maximum, créés par moi dans la console)
Un ami (le maître du frère de Billy) utilise déjà l'app avec un compte que j'ai créé : son espace doit être vide
de mes données et afficher le nom de SON chien. Ne touche à aucune donnée existante, ni la mienne ni la sienne.
1. Fais docs/archives/prompt-v3-5-comptes.md (mis à jour : pas d'inscription, écran d'installation, 80 Mo par
   compte).

LOT 2 — Retouches (revue de l'app en ligne + commentaires sur les maquettes)
2. Son programme (onglet Billy) : un jour marqué « jour de repos » s'affiche avec la lune, pas avec une coche
   (aujourd'hui, mardi 13 octobre a une coche alors que c'était le premier jour de repos déclaré).
3. Écran de l'exercice :
   - « Ce qu'il faut » dans une carte blanche, comme « Comment faire » et « Bon à savoir » ;
   - « Comment faire » : numéro rond 28 px centré sur la première ligne du texte (texte 17 px, interligne 28 px) ;
   - source : lien souligné + icône lien externe, ouvert dans un nouvel onglet (target="_blank"
     rel="noopener noreferrer", texte caché « (nouvel onglet) »), zone tactile 44 px. Ajoute sourceUrl à chaque
     exercice du catalogue ; sans adresse, la source reste du texte. Maquette V3-QueteExercice.
4. « C'est réussi ! » : vraie animation en CSS seul (~1,5 s) : badge en rebond (scale 0.6 → 1.08 → 1), segment
   gagné de l'anneau qui se remplit (stroke-dashoffset), 12 à 16 confettis aux couleurs du territoire (1,2 s,
   jamais sur les boutons), puis texte en fondu. Toucher l'écran passe l'animation. Pas de vibration.
   prefers-reduced-motion : simple fondu. Version courte pour un nouveau niveau (spec § 5.7).
5. Carnet (maquette V3-Carnet, nouvelle) : filtres dans cet ordre : « Tous », puis les compétences notées en
   pastilles couleur du territoire, puis les étiquettes libres. Texte des cartes limité à 4 lignes. Sur chaque carte :
   ressenti, compétences, puis étiquettes libres (déjà en place, garde-le).
6. Santé (maquette V3-SanteAVenir) : un rendez-vous avec heure l'affiche sous son titre (« 10 h 30 · … ») ; la
   colonne date tient sur une ligne même pour « 19 sept. 27 ».
7. Questionnaire : « Je ne sais pas » sur une ligne (largeur du texte, nowrap) ; « Suivant » prend le reste.
8. Onglet Billy : aucun connecteur entre les étages (spec § 5.4).
8 bis. Barre d'onglets (spec § 5.2, toutes les maquettes V3) : Carnet · Santé · ACCUEIL · Billy, l'accueil au centre en
   gros (rond primary 66 px, icône maison blanche 30 px, bord blanc 5 px, dépasse de 26 px au-dessus de la barre,
   libellé aligné avec les autres). Grille de 5 colonnes ; tant que l'onglet Meute n'existe pas, Billy occupe les 2
   dernières colonnes pour que l'accueil reste au milieu. Vérifie que le contenu des pages n'est jamais caché par le
   rond (marge basse suffisante) et que le bouton « + » du Carnet reste au-dessus de la barre.

LOT 3 — Missions, os, boutique, barres de défilement
9. Fais docs/archives/prompt-v3-10-os-boutique.md en entier, avec ces précisions (maquettes V3-Billy, V3-Boutique,
   V3-Accueil) :
   - « Quête du jour » devient « Mission du jour » partout ; la carte garde « Commencer » et « Autre idée » ;
   - carte des os dans l'onglet Billy : ≥ 76 px de haut, os dans un rond blanc, « 240 os », « Pour vos efforts »
     sur une ligne, pastille contour « Boutique › » ;
   - boutique : dans la grille, le bouton de chaque carte est collé en bas (margin-top: auto), pour que les
     boutons d'une même rangée soient à la même hauteur.

LOT 4 — Les trajets de balade (tracés après coup)
10. Fais docs/archives/prompt-v3-15-trajets.md.

LOT 5 — La meute (seulement après le lot 1)
11. Fais docs/archives/prompt-v3-14-communaute.md (carte des spots, « Marquer »), puis
    docs/archives/prompt-v3-11-defis-amis.md (le défi de la meute, version simple : un défi commun par semaine).

LOT 6 — Rappel du soir à 21 h (en dernier)
12. Fais docs/archives/prompt-v3-6-rappel-21h.md. Au point 6, ne m'explique que ce qui reste hors Firebase
    (clés VAPID, secrets GitHub, activation sur l'iPhone).

À la fin, donne-moi la liste de ce qui est fait, ce qui ne l'est pas, et pourquoi.
```
