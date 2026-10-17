# Spec — La carte qui se découvre et l'import Strava (17 octobre)

Martin enregistre ses balades avec **Strava gratuit** : Strava suit le GPS écran éteint, ce qu'une web app sur iPhone
ne peut pas faire. Billy importe ces balades. Chaque balade lève le brouillard sur une carte, comme la carte d'un jeu
vidéo, et Billy conseille quoi découvrir autour : points de vue, plages, parcs, spots calmes de la meute.

**Décisions :**
- **Pas d'API Strava.** Elle demande un abonnement Strava payant pour les développeurs (depuis juin 2026) et interdit
  de garder les données plus de 7 jours. On importe les fichiers de Martin (archive Strava ou GPX d'une balade).
- **Pas d'IA.** Les conseils viennent de règles simples sur OpenStreetMap et les spots de la meute.
- **La carte est privée.** Elle montre où Martin vit ; la meute ne la voit jamais.

Maquettes (canvas, section « Balades — la carte qui se découvre ») : `V3-Explorer`, `V3-ExplorerIdees`,
`V3-ImportStrava`, `V3-ImportResultat`, `V3-Balades`, `V3-NotifBalade`, `V3-AjouterStrava`. Elles sont construites sur la vraie balade du 17 octobre à Saint-Briac
(1,4 km selon Strava, 24 min, 1 418 points GPS).

## 1. Où ça vit
- L'écran **« Le territoire de Billy »** devient la carte qui se découvre (`V3-Explorer`). Il remplace l'ancien
  `V3-Territoire` (spots marqués en liste) : les spots marqués restent visibles sur la carte, avec leurs gouttes.
- On y arrive par la carte « Ses balades » de l'onglet Billy (déjà en place) et par le résultat d'un import.
- Barre d'onglets : onglet **Billy** actif.

## 2. La carte (`V3-Explorer`)
- Carte plein écran (Leaflet + OpenStreetMap, déjà utilisés), centrée sur la position actuelle si elle est autorisée,
  sinon sur la dernière balade.
- **Le brouillard** : un calque vert très foncé (#22332F, opacité 0,9) avec une texture de nuages légère. Les rues
  restent à peine visibles dessous. Les zones découvertes sont percées dans le brouillard avec un bord flou.
- Le trajet de chaque balade est dessiné en pointillés orange (#D9661F) par-dessus.
- **Lieux à découvrir** : dans le brouillard, un rond « ? » en pointillés blancs (36 px). Quand la zone est découverte,
  il devient l'icône du lieu avec son nom (ex. « Plage du Béchet »).
- **Prochaine découverte hors de l'écran** : une pastille au bord de la carte avec une flèche dans sa direction
  (« ↗ Point de vue · 1,4 km »). La toucher ouvre `V3-ExplorerIdees`.
- En haut : « ‹ L'arbre » à gauche, « Importer » à droite (→ `V3-ImportStrava`). Boutons blancs de 44 px.
- **Panneau du bas** (dans la moitié basse, pour le pouce) :
  - « Le territoire de Billy » + nombre de cases découvertes (« 56 cases ») ;
  - une barre de progression et « 2 % de Saint-Briac-sur-Mer découvert » (la commune où se trouve la carte) ;
  - la carte « Prochaine découverte » : icône, nom, type, raison adaptée à Billy ; toucher → `V3-ExplorerIdees` ;
  - **action principale** : « Y aller · 1,4 km », qui ouvre l'itinéraire à pied dans Plans
    (`https://maps.apple.com/?daddr=lat,lng&dirflg=w`).
- État vide (aucune balade) : brouillard partout, panneau « Importez vos balades Strava pour lever le brouillard »
  + bouton « Importer mes balades ». Jamais d'écran vide.

### 2 bis. Satellite, 3D et plein écran (demande du 17 octobre, maquettes `V4-Balades`, `V4-BaladesPleinEcran`)
- La carte s'ouvre en **vue satellite** par défaut. Deux interrupteurs en haut à droite : « Plan / Satellite » et
  « 2D / 3D ». Le choix est gardé sur l'appareil.
- **3D** : la carte s'incline (MapLibre GL, déjà dans l'app : `pitch` 60°, relief si la source le permet). Les
  repères (?, lieux découverts) restent droits, lisibles.
- **Plein écran** : on glisse le panneau du bas vers le bas ; il se réduit à une barre de 72 px
  (« 2 % de Saint-Briac découvert · 12 balades » + ⌃). On le remonte en le glissant ou en touchant la barre.
- En satellite, le brouillard devient des **nuages blancs** (opacité 0,7 + texture), le trajet en pointillés
  orange clair (#FFB23F) pour rester visible sur les photos.
- **Source satellite gratuite** : Esri World Imagery (attribution « Imagerie © Esri », usage perso non commercial,
  conditions à relire avant d'ouvrir à des inconnus) ou MapTiler Satellite (clé gratuite, 100 000 tuiles par mois,
  largement assez pour 10 comptes). Le plan reste OpenFreeMap.

## 3. Le brouillard : calcul
- Grille fixe d'environ 50 m : `lat` par pas de 0,00045°, `lng` par pas de 0,0007° (≈ 50 m en France).
  Identifiant de case : `"<i>_<j>"` avec `i = floor(lat / 0.00045)`, `j = floor(lng / 0.0007)`.
- Une balade découvre **toutes les cases dont le centre est à 50 m ou moins du trajet**, calculé sur les points GPS
  complets du fichier, avant l'allègement à 200 points (la balade du 17 octobre découvre 56 cases).
- Sources qui lèvent le brouillard : les balades importées et, **une seule fois** au lancement, les anciens trajets
  déjà enregistrés dans le Carnet (dont ceux tracés à la main avant le 17 octobre). **Plus de saisie de trajet à la
  main** (décision du 17 octobre, `prompt-v3-17` : traceur, trajets habituels et « Modifier le trajet » retirés).
- **Pourcentage découvert** : cases découvertes dont le centre est dans la commune × surface d'une case ÷ surface de
  la commune. Le contour de la commune vient de Nominatim (OpenStreetMap), demandé une seule fois par commune et
  gardé. Arrondi à l'entier ; « moins de 1 % » sous 1 %.
- Jamais de chiffre à battre ni de comparaison avec d'autres chiens.

## 4. Les conseils (`V3-ExplorerIdees`)
- Titre « À découvrir », sous-titre « Autour de vous, choisi pour Billy : d'abord les lieux calmes. »
- Filtres en pastilles : Tout · Jamais explorés · Points de vue · Plages (puis Parcs, Eau si présents).
- **Sources** : OpenStreetMap via l'API Overpass (gratuite), dans un rayon de 2 km autour de la position actuelle
  (ou de la dernière balade) : `tourism=viewpoint`, `natural=cape|peak|beach`, `leisure=park|dog_park|nature_reserve`,
  `amenity=drinking_water`, `historic=*` nommés. Plus les spots de la meute (avec leur niveau de calme).
  Résultat gardé 7 jours par zone. Si Overpass ne répond pas : les spots de la meute seulement, sans message d'erreur
  technique.
- **Règles de tri, sans IA** (6 idées au plus) :
  1. d'abord les lieux jamais explorés (la case du lieu est encore dans le brouillard) ;
  2. puis ce qui va avec le profil du chien (questionnaire) :
     - chien sensible ou qui a peur en ville : lieux naturels et à plus de 150 m d'une grande route
       (`highway=primary|secondary|trunk`), avec la raison « loin des voitures » ;
     - chien sportif : lieux entre 1 et 3 km ;
     - chien senior ou chiot de moins de 6 mois : lieux à moins de 1 km ;
  3. puis la distance.
- Chaque carte : icône (point de vue vert, plage bleue…), nom, type · distance, une phrase de raison, pastille
  « ? Jamais explorée » ou « ✓ Découverte le 17 oct. », bouton « Y aller » (Plans, à pied).
- Les phrases de raison sont des modèles remplis par les règles (« Sentier côtier loin des voitures… »,
  « Juste à côté de votre balade du 17 octobre »). Rien d'inventé : pas d'avis, pas de « souvent calme » sans donnée.
- Plages : toujours la note « Sur les plages, les chiens sont souvent interdits l'été : vérifiez le panneau à
  l'entrée. » Si OpenStreetMap indique `dog=no`, la carte l'affiche (« Chiens interdits, selon OpenStreetMap »).
- Mention « Lieux : © OpenStreetMap » en bas.

## 5. Importer depuis Strava (`V3-ImportStrava`)
- Titre « Importer vos balades Strava », sous-titre « Une fois par mois suffit. Les balades déjà importées sont
  sautées. »
- 3 étapes numérotées :
  1. « Demandez votre archive à Strava » : Sur strava.com : Paramètres › Mon compte › Télécharger ou supprimer votre
     compte › Demander votre archive. Lien « Ouvrir Strava » (https://www.strava.com/account, nouvel onglet).
  2. « Ouvrez le fichier zip dans Fichiers » : l'iPhone le décompresse tout seul.
  3. « Choisissez le dossier activities » : sélectionnez tous les fichiers.
- Note vie privée : « Billy garde le trajet et la durée. Le rythme cardiaque n'est jamais enregistré. Votre carte
  reste privée. »
- « Une seule balade ? Sur strava.com, ouvrez-la, puis ⋯ › Exporter GPX, et choisissez ce fichier. »
- Action principale en bas : « Choisir les fichiers » (`<input type="file" multiple>`, extensions `.gpx`, `.tcx`,
  `.fit` et leurs versions `.gz`).

## 6. Ce que fait l'import
- **Formats** : GPX (vérifié sur un vrai export Strava : `<name>`, `<type>walking</type>`, points avec `ele`, `time`
  et `gpxtpx:hr`). Les fichiers `.gz` sont décompressés avec `DecompressionStream('gzip')` (natif, pas de
  dépendance). TCX et FIT : seulement si la vraie archive de Martin en contient (à vérifier sur l'archive avant de les
  coder ; FIT demande une petite bibliothèque, à justifier).
- **Filtre** : on garde `walking` et `hiking` (GPX `<type>`), ou les lignes Marche / Randonnée de `activities.csv` si
  ce fichier est choisi avec les autres. Le reste est ignoré et compté (« 3 sorties à vélo ignorées »).
  Strava a une étiquette « With Pet » (avec un animal) : si Martin la met sur ses balades avec Billy, l'arrivée
  automatique (§ 7 quater) peut ne prendre que celles-là.
- **Doublons** : une balade a une clé = heure de départ (premier `<time>`) + premier point arrondi à 4 décimales.
  Une clé déjà connue est sautée (« 0 balade déjà importée »). Réimporter toute l'archive ne crée jamais de doublon.
- **Ce qui est gardé** : le trajet allégé à 200 points (`thin` existant), la distance (haversine sur les points
  complets, en ne gardant un point que s'il est à 8 m ou plus du précédent : sans ce filtre, les petits sauts du GPS
  à l'arrêt donnent 1,4 km au lieu des 1,4 km de Strava), la durée (dernier `time` − premier), la date (fuseau Europe/Paris), le nom. **Jamais** le rythme
  cardiaque, l'altitude point par point, ni l'heure de chaque point.
- **Nom** : les noms par défaut de Strava sont traduits : Morning Walk → « Balade du matin », Lunch Walk → « Balade
  de midi », Afternoon Walk → « Balade de l'après-midi », Evening Walk → « Balade du soir », Night Walk → « Balade
  de nuit » ; même chose avec Hike → « Randonnée ». Un nom choisi par Martin est gardé tel quel.
- Chaque balade devient un **moment du Carnet** avec son trajet (`entries/{id}.route`, format existant) et
  `source: 'strava'`. Elle lève le brouillard et peut découvrir des lieux.
- Les os : une balade importée compte comme une balade notée, une seule fois (pas d'os pour les doublons, pas d'os
  rétroactifs pour un historique de plusieurs mois : au plus les 7 derniers jours rapportent des os).
- Import de nombreux fichiers : traitement fichier par fichier avec une barre « 12 sur 85 », sans bloquer l'écran ;
  hors ligne, le résultat est écrit dans le cache Firestore et se synchronise au retour du réseau.

## 7. Après l'import (`V3-ImportResultat`)
- Titre « Le brouillard s'est levé ! », sous-titre « Billy a un nouveau bout de territoire. »
- Mini-carte centrée sur les nouvelles zones, bord doré autour de ce qui vient d'être découvert, pastille
  « + 2 % découvert ».
- 3 chiffres : balades ajoutées · kilomètres parcourus · lieux découverts.
- Liste : chaque balade ajoutée (nom, date · distance · durée · « ajoutée au Carnet » → son détail) et chaque lieu
  découvert.
- Ligne grise : « 3 sorties à vélo ignorées · 0 balade déjà importée. »
- Action principale : « Voir la carte ».
- Rien d'ajouté (tout était déjà là) : « Tout était déjà dans Billy » + « Voir la carte ».

## 7 bis. Toutes les balades et les filtres (`V3-Balades`)
- Sur la carte : **toutes** les balades sont dessinées (importées et tracées à la main), pas seulement la dernière.
- Sous les boutons du haut de la carte, une rangée de filtres en pastilles : « Toutes · 12 » · « Ce mois » ·
  « Avec une peur » · « Plus de 3 km ». Un filtre change les trajets dessinés ; le brouillard, lui, reste toujours
  calculé sur toutes les balades (on ne « reperd » jamais un territoire).
- Dans le panneau du bas, le lien « 12 balades › » ouvre la liste `V3-Balades`.
- `V3-Balades` : titre « Ses balades », résumé « 12 balades · 18,4 km · 9 h 40 ensemble » (recalculé selon le filtre),
  filtres en pastilles (Tout · Ce mois · un par commune visitée · Avec une peur · Plus de 3 km), liste groupée par
  mois. Chaque ligne : mini-carte du trajet, nom, « 17 oct. · Saint-Briac · 1,4 km · 24 min », étiquettes (Strava ou
  Tracé à la main, moments : 1 peur, Super rappel). Toucher une ligne → le détail du moment (`V3-CarnetTrajet`).
- Action principale en bas : « Voir ces 12 balades sur la carte » (garde le filtre choisi).
- La commune de chaque balade vient de Nominatim (géocodage inverse du premier point), gardée dans le moment.

## 7 ter. Après une sortie : la notification « ajoutez le trajet » (`V3-NotifBalade`, `V3-AjouterStrava`)
- **Décision du 17 octobre : Billy et Claude n'accèdent jamais au compte Strava de Martin** (les conditions de Strava
  interdisent l'accès automatisé et Martin ne veut pas risquer un blocage). C'est Martin qui exporte ; Billy lit le
  fichier.
- Déclencheur : les sorties du jour existent déjà (3 créneaux, coche sur l'accueil, `users/{uid}/walks/{date}`).
  **15 minutes après qu'une sortie est cochée**, si aucune balade n'a été ajoutée pour ce créneau, Billy envoie :
  titre « Belle sortie de l'après-midi ! » (matin / du midi / de l'après-midi / du soir selon le créneau), texte
  « Ajoutez son trajet Strava pour lever le brouillard sur la carte de Billy. » Une seule fois par créneau et par jour.
- Envoi par la tâche GitHub qui tourne déjà toutes les 15 minutes (`scripts/rappel-soir.mjs`) : même mécanique que le
  rappel des sorties. Réglage dans Profil › Sorties : « Me rappeler d'ajouter le trajet » (activé par défaut).
- Toucher la notification ouvre **`V3-AjouterStrava`** (`#/ajouter-trajet?date=…&creneau=…`) :
  - « ‹ Plus tard » (retour à l'accueil, rien n'est perdu) ;
  - titre « Ajouter le trajet de la sortie », rappel « Sortie de l'après-midi, cochée à 16 h 50 » ;
  - 3 étapes : 1. « Ouvrez vos activités Strava » + bouton contour « Ouvrir mes activités Strava »
    (https://www.strava.com/athlete/training, nouvel onglet) ; 2. « Touchez ⋯ puis Exporter GPX » ; 3. « Revenez ici
    et choisissez le fichier » ;
  - note : « Billy ne se connecte jamais à votre compte Strava : c'est vous qui exportez, Billy lit seulement le
    fichier. »
  - action principale en bas : « Choisir le fichier » → même import qu'au § 6, la balade est rattachée à ce créneau
    (la sortie a son trajet, la notification ne revient pas) → `V3-ImportResultat`.
- Sur l'accueil, une sortie cochée sans trajet affiche aussi un petit lien « + Ajouter le trajet » vers le même écran.
- **À vérifier sur l'iPhone de Martin avant de coder** : que le lien Strava s'ouvre bien dans Safari (et pas dans
  l'app Strava, qui n'a pas « Exporter GPX ») et que le menu ⋯ › Exporter GPX y est. Si l'app Strava s'ouvre à la
  place, le bouton dit « Appuyez longuement › Ouvrir dans Safari » ; si l'export n'existe pas sur le site mobile,
  on garde seulement l'import de l'archive mensuelle.

## 7 quater. Arrivée automatique : abandonnée
- Martin ne veut pas risquer un blocage de son compte Strava : pas d'accès automatisé, pas de tâche planifiée qui
  irait chercher les balades. Si un jour Martin prend un abonnement Strava, l'API officielle permettrait une vraie
  synchronisation (voir l'étude du 17 octobre).

## 8. Données
- `users/{uid}/entries/{id}` : champs existants + `source?: 'strava'`, `importKey?: string`, `commune?: string`,
  `walkSlot?: { date, creneau }` (la sortie du jour à laquelle la balade est rattachée).
- `users/{uid}/walks/{date}` (existant) : + `routeAdded?: { [creneau]: entryId }` et `routeReminderSent?: string[]`.
- `users/{uid}/fog/{zone}` : `{ cells: string[] }`, une zone = carré de 0,05° (≈ 5 km) pour garder des documents
  petits ; ajout par `arrayUnion`. Une balade de 1,4 km ≈ 56 cases ≈ 1 Ko.
- `users/{uid}/places/{communeId}` : `{ name, areaM2, bbox, polygon simplifié }`, gardé une fois par commune.
- Cache des lieux Overpass : `localStorage` 7 jours (confort, rien de vital).
- Règles Firestore : tout sous `users/{uid}`, propriétaire seulement (inchangé). Rien de visible par la meute.

## 9. Vie privée
- Carte, brouillard et trajets importés : privés. Jamais affichés dans la meute, ni sur le profil public du chien.
- Le dépôt GitHub est public : **aucun vrai fichier de balade dans les tests**. Les tests utilisent un GPX inventé
  (quelques points, un `gpxtpx:hr` pour vérifier qu'il est ignoré).

## 10. Critères d'acceptation
- Choisir le GPX du 17 octobre : 1 balade « Balade de l'après-midi », 1,4 km, 24 min, ajoutée au Carnet ; environ
  56 cases découvertes ; aucun rythme cardiaque dans Firestore.
- Réimporter le même fichier : « Tout était déjà dans Billy », aucun doublon, aucun os en plus.
- Un fichier vélo est ignoré et compté.
- La carte s'ouvre en moins de 2 s avec 100 balades importées (le brouillard est dessiné sur un canvas, pas en
  centaines de calques).
- Tout fonctionne à 390 px de large, boutons ≥ 44 px, actions principales dans la moitié basse.
- Tests (`src/lib/`) : cases d'une balade, pourcentage, doublons, noms traduits, filtre de type, suppression du
  rythme cardiaque.

## 11. Plus tard
- Rappel une fois par mois : « Ça fait un mois : importez vos balades Strava » (notification existante).
- Proposer une boucle qui passe par des zones jamais explorées (demande un calcul d'itinéraire).
