# Prompt Claude Code — la carte qui se découvre et l'import Strava (17 octobre)

Lis `CLAUDE.md`, puis `docs/specs/carte-a-decouvrir.md` en entier, puis `docs/specs/trajets.md` (le format des
trajets et `src/lib/gpx.ts` existent déjà). Les maquettes sont sur le canvas, section « Balades — la carte qui se
découvre » : `V3-Explorer`, `V3-ExplorerIdees`, `V3-ImportStrava`, `V3-ImportResultat`, `V3-Balades`, `V3-NotifBalade`, `V3-AjouterStrava` (copies dans
`docs/maquettes/prive/`, non commitées : elles montrent un vrai lieu).

Je veux importer mes balades Strava (sans l'API Strava, je ne veux pas payer) et voir une carte qui se découvre
comme dans un jeu vidéo, avec des conseils de lieux à découvrir adaptés à Billy. Pas d'IA.

Avance par petits commits clairs, dans cet ordre :

1. **Lecture des fichiers** (`src/lib/`) : étends l'import GPX pour lire `<name>`, `<type>` et les `<time>` ;
   décompresse les `.gz` avec `DecompressionStream('gzip')` ; ne garde jamais le rythme cardiaque, l'altitude ni
   l'heure de chaque point. Noms Strava par défaut traduits (spec § 6). Clé de doublon. Tests avec un GPX inventé :
   **aucun vrai fichier de balade dans le dépôt, il est public.**
2. **Le brouillard** (`src/lib/fog.ts`) : grille de 50 m, cases à 50 m du trajet calculées sur les points complets,
   stockage `users/{uid}/fog/{zone}` avec `arrayUnion`, pourcentage par commune (contour Nominatim gardé une fois).
   Tests : la balade inventée donne le bon nombre de cases ; le pourcentage ; une case n'est jamais comptée deux fois.
   Lever aussi le brouillard, une seule fois, avec les anciens trajets déjà dans le Carnet (le traceur à la main est
   retiré par `prompt-v3-17`, à faire avant celui-ci).
3. **Écran d'import** (`V3-ImportStrava`) puis **résultat** (`V3-ImportResultat`) : sélection multiple, filtre
   marche / randonnée, doublons sautés, barre de progression, chaque balade devient un moment du Carnet
   (`source: 'strava'`). Os : une fois par balade, seulement pour les 7 derniers jours.
4. **La carte** (`V3-Explorer`) : remplace l'écran « Le territoire de Billy ». Brouillard dessiné sur un canvas
   Leaflet (pas un calque par case), trajets en pointillés orange, « ? » sur les lieux encore dans le brouillard,
   pastille de direction pour la prochaine découverte hors écran, panneau du bas avec progression, prochaine
   découverte et « Y aller » (Plans, à pied). État vide avec le bouton d'import.
5. **Les conseils** (`V3-ExplorerIdees`) : Overpass dans un rayon de 2 km, cache 7 jours, règles de tri de la spec
   § 4 selon le profil du questionnaire, filtres, note sur les chiens et les plages, mention © OpenStreetMap.
   Si Overpass ne répond pas : les spots de la meute seulement.

6. **Toutes les balades et les filtres** (`V3-Balades`, spec § 7 bis) : toutes les balades sur la carte, filtres en
   pastilles sur la carte et dans la liste, liste groupée par mois, « Voir ces balades sur la carte ».
7. **Après une sortie** (`V3-NotifBalade`, `V3-AjouterStrava`, spec § 7 ter) : 15 min après une sortie cochée sans
   trajet, notification « Belle sortie de l'après-midi ! » envoyée par `scripts/rappel-soir.mjs` ; elle ouvre l'écran
   « Ajouter le trajet » (lien vers mes activités Strava, puis « Choisir le fichier ») ; la balade est rattachée au
   créneau. Lien « + Ajouter le trajet » sur l'accueil. Réglage dans Profil › Sorties.

**Billy ne doit jamais se connecter à Strava ni aller chercher les balades tout seul** (spec § 7 quater).

Si un point est déjà fait dans l'app, vérifie-le et passe au suivant. Vérifie chaque écran en vue mobile à 390 px.
Pour TCX et FIT, ne code rien avant que je t'aie donné ma vraie archive Strava : dis-moi juste ce qu'il faudrait.
À la fin, dis-moi en 5 lignes ce qui marche, ce qui reste, et comment tester avec mon GPX du 17 octobre.
