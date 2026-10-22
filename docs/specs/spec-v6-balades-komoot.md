# Spec V6 — Les balades façon Komoot (22 octobre 2026)

Origine : étude « Komoot × Flair » du 22 octobre (`docs/recherche/komoot-flair.html`, artifact
https://claude.ai/code/artifact/7a267bb8-a461-4b74-8586-da489fc5d282) et décisions de Martin du même jour.
**Pour les balades et le style des écrans, cette spec fait foi sur la V5, la V4 et la V3.** Le reste reste valable.

Idée générale : Komoot paraît plus abouti parce que (1) son rendu est calme et précis, (2) chaque sortie a une vraie
fiche, riche et chiffrée, (3) les sorties arrivent seules. Flair reprend ces trois points et ajoute ce que Komoot n'a
pas : comprendre ce qui s'est passé pour le chien pendant la balade.

## 0. Décisions de Martin (22 octobre)

1. **Rendu façon Komoot** sur toute l'app : titres en graisse moyenne, retour en chevron sans pilule, actions
   secondaires en texte, rangée de stats (§ 1).
2. **On garde le maximum de données** de la Watch et de l'iPhone pendant une balade, **rythme cardiaque compris**
   (une valeur par minute, privé). Remplace « le rythme cardiaque n'est jamais enregistré » de `carte-a-decouvrir.md`.
3. **Chiffres détaillés gardés**, mais repliés (« Tous les chiffres ») ; jamais de record à battre ni de comparaison.
4. **Balades qui arrivent seules** : réveil en arrière-plan par Santé + notification (§ 4).
5. **Sans Watch** : accès « Mouvements et forme » pour proposer « C'était une sortie avec Billy ? » (§ 5).
6. **Partage en direct** de la position avec des proches choisis, et d'autres cas si besoin. La règle de la meute
   devient : **jamais de position en direct sans un choix explicite**, toujours avec un bandeau visible et un arrêt en
   un toucher (§ 7). Remplace « Pas de position en direct, jamais » de `communaute.md` § 1 et § 6.
7. **Ordre** : les trois lots d'un coup, enchaînés. Les tests sur iPhone (dont le test Xcode du § 4) se font avec
   Martin à la fin.

## 1. Le rendu façon Komoot (T-077)

À reporter dans `docs/style-guide.html`, `src/index.css` et le design system Flair, puis sur tous les écrans.

- **Graisses** : titre d'écran Bricolage **600** (28–30 px) ; titre de section 600 (20–22 px) ; titre de carte
  Bricolage **500** (16–17 px) ; gros chiffres (stats, « 4 % découvert », os) Bricolage **700**. Le 800 disparaît.
  Surtitres Figtree 700, 12 px, majuscules, +0,6 px. Corps inchangé.
- **Retour** : chevron + texte vert (`primary`), sans cadre ni fond, 44 px de haut, aligné sur la marge de 16 px.
  Remplace les pilules « ‹ Accueil », « ‹ Ses balades », « ‹ La carte »…
- **Actions secondaires** : texte vert gras (Figtree 700, 16 px), sans contour (« Une autre idée », « Plus tard »,
  « Voir tout son chemin »). Le bouton contour n'est gardé que pour **un** choix secondaire important par écran.
- **Stats** (nouveau composant `components/Stats.tsx`) : 2 à 4 colonnes égales ; valeur Bricolage 700 20 px,
  chiffres à largeur fixe (`tabular-nums`), unité collée en 15 px ; libellé Figtree 13 px `muted` dessous. Utilisé
  dans : balade en cours, fin de balade, fiche de balade, liste des balades, Ses balades.
- **Mini-cartes** : vrai fond de carte (OpenFreeMap, tuiles en cache) sous le tracé, jamais un cercle sur fond uni.
  Un souvenir sans photo montre la carte de son trajet, ou une icône calme (pas de carré beige).
- **Avatar** : la lettre du nom seulement tant qu'il n'y a pas de photo, en `primary-soft` sans bord orange.
- **Sources visibles** en 12 px `muted` sous les blocs concernés : « Enregistré par l'Apple Watch »,
  « Météo : Open-Meteo », « Lieux © OpenStreetMap ».
- **Couleur des tracés** : nouveau token `--route` vert carte `#2F8F6B` (et `#E0A12E` pour « rapide », `#9AA5A0`
  pour « arrêt ») ; l'orange reste réservé à l'action.
- Critère : aucun texte en 800, aucun bouton de retour en pilule, aucune donnée chiffrée hors du composant Stats sur
  les écrans de balade.

## 2. Le trajet daté et les données de la balade (T-078, T-080)

### 2.1 Ce qu'on garde

`entries/{id}.route` (tous les champs nouveaux sont **optionnels** ; les anciennes balades restent lisibles) :

```ts
track?: {            // un point toutes les 5 s au plus (moins si la balade est longue), ≤ 900 Ko au total
  t: number[]        // secondes depuis startTime
  lat: number[]      // 5 décimales
  lng: number[]
  alt?: number[]     // mètres, 1 décimale
  v?: number[]       // vitesse en m/s, 2 décimales (calculée si absente)
}
stops?: { at: number; durS: number; lat: number; lng: number; street?: string; momentIndex?: number }[]
pace?: number[]      // vitesse moyenne par minute (km/h, 1 décimale)
hr?: number[]        // rythme cardiaque par minute (bpm), Watch ou GPX ; privé
steps?: number
ascentM?: number
descentM?: number
weather?: { tempC: number; humidity?: number; source: 'watch' | 'open-meteo' }
energyKcal?: number
trimmed?: { startS: number; endS: number }   // § 8.3
```

- `points` (allégés à 200) restent pour la carte et la compatibilité ; `track` sert au détail.
- Firestore refuse les tableaux de tableaux : colonnes parallèles (`t`, `lat`, `lng`…), pas de `[[lat, lng]]`.
- Taille : 30 min ≈ 360 points ≈ 15 Ko. Au-delà de 2 h, un point toutes les 10 s. Limite dure : 900 Ko par document.

### 2.2 D'où viennent les données

| Donnée | Watch (Santé) | GPS de Flair (iOS) | Fichier GPX/Strava |
| --- | --- | --- | --- |
| Points datés, altitude, vitesse | `HKWorkoutRoute` (CLLocation) | `CLLocation` déjà reçus | `<trkpt>` `time`, `ele` |
| Cœur | `HKQuantityType.heartRate` sur la séance | Santé, même fenêtre (si Watch portée) | `gpxtpx:hr` |
| Pas | `stepCount` sur la fenêtre | `stepCount` sur la fenêtre | — |
| Dénivelé | calculé sur l'altitude | calculé | calculé |
| Météo | `HKMetadataKeyWeatherTemperature` / `Humidity` | Open-Meteo (historique, sans clé) | Open-Meteo |
| Énergie | `activeEnergyBurned` | Santé | — |
| Pauses | `HKWorkoutEvent` pause / reprise | — | — |

- `FlairNativePlugin.swift` : `getWalks` renvoie aussi `hr`, `steps`, `energy`, `weather`, `pauses` et, pour chaque
  point, `alt`, `speed`, `accuracy`. Nouvelles autorisations de lecture : rythme cardiaque, pas, énergie active.
  Le texte d'autorisation (Info.plist) explique : « Flair lit vos marches, leur tracé et votre rythme cardiaque pour
  raconter chaque balade. Rien n'est partagé. »
- Open-Meteo : `https://archive-api.open-meteo.com/v1/archive` ou `api.open-meteo.com/v1/forecast?past_days=` selon la
  date ; une seule requête par balade, à l'import ; sans réseau, la météo est ajoutée plus tard (champ optionnel).
- Le calcul est dans `src/lib/walkStory.ts` (§ 3), pas dans le Swift.

## 3. Arrêts, allure et histoire de la balade (T-079)

`src/lib/walkStory.ts`, fonctions pures avec tests (`walkStory.test.ts`) :

- **Arrêt** : vitesse lissée (moyenne glissante sur 15 s) sous 0,4 m/s pendant **30 s ou plus**, en restant dans un
  rayon de 25 m. Deux arrêts séparés de moins de 20 s fusionnent. Les pauses Watch comptent comme arrêts.
  Pas d'arrêt dans les 30 premières et dernières secondes (départ et retour).
- **Allure** : vitesse moyenne par minute (km/h). Catégories : arrêt (< 1,5), tranquille (1,5–5,2), rapide (> 5,2).
  Le tracé est coloré par catégorie (`--route`, rapide, arrêt).
- **Moment rapide** : la plus longue portion > 5,2 km/h sur au moins 150 m → ligne « Plus rapide · 6,1 km/h sur
  300 m · il a tiré ? » dans la frise (une seule par balade).
- **Pic de cœur** : hausse de plus de 20 bpm en moins d'une minute **sans** accélération → ligne
  « Votre cœur à 118 » sur l'arrêt ou le point le plus proche (suggestion de « Moment de stress », jamais automatique).
- **En marche** = durée − somme des arrêts.
- **Rue d'un arrêt** : Nominatim (géocodage inverse, 1 requête par seconde au plus, gardé dans `stops[].street`).
- **Lien avec les repères** : un repère placé à moins de 40 m d'un arrêt s'y rattache (`momentIndex`).
- Recalculé à l'import et après un recadrage (§ 8.3) ; résultat enregistré dans `route.stops` et `route.pace`.

## 4. Les balades arrivent seules (T-084, iOS)

- **Swift** : `HKObserverQuery` sur `HKWorkoutType` + `enableBackgroundDelivery(for: .workoutType(), frequency: .immediate)`
  au lancement (`AppDelegate`), avec l'entitlement `com.apple.developer.healthkit.background-delivery`.
- Réveillé : lit les marches et randonnées **en extérieur avec tracé** terminées depuis la dernière lecture, garde leurs
  UUID dans `UserDefaults` (« à importer »), et programme une **notification locale** par balade :
  titre « Belle balade avec [prénom] ! », texte « 2,1 km · 32 min. Touchez pour voir ce qu'il a découvert. »
  Jamais de reproche, jamais plus d'une notification par balade, rien la nuit (22 h – 7 h : notification retardée à 7 h).
- Toucher la notification ouvre `#/balade/arrivee?uuid=…` : l'import existant (`syncWatch`) tourne, puis le récap
  « Belle balade ! » (§ 6.3) de cette balade.
- Sans réveil possible (compte gratuit, autorisation refusée) : l'import à l'ouverture reste, sans message d'erreur.
- **À tester avec Martin dans Xcode** (iPhone + Watch) avant de passer en « Done » : réveil réel, délai, compte gratuit.
- Réglage : Profil › Notifications › « Quand une balade de la Watch arrive » (activé par défaut).

## 5. Sans Watch : « C'était une sortie avec Billy ? » (T-085, iOS)

- `CMMotionActivityManager.queryActivityStarting` (7 derniers jours, sans position) : périodes **à pied** de 10 min ou
  plus, pas déjà couvertes par une balade, une sortie notée ou une séance Watch.
- À l'ouverture, une carte calme sur l'accueil (pas une fenêtre) : « Vous avez marché 35 min vers 8 h. C'était une
  sortie avec [prénom] ? » → « Oui, la noter » (note la sortie du créneau, sans tracé, +3 os selon la règle) ·
  « Non » (ne revient plus pour cette période). Une seule carte à la fois, la plus récente.
- Accès demandé une seule fois, depuis cette carte ou le réglage, avec la phrase : « Flair regarde seulement quand vous
  marchez, jamais où. » (`NSMotionUsageDescription`).
- Rien sur le web.

## 6. La fiche de balade et le récap (T-081, T-082, T-083)

Maquettes de référence : planche « La balade en détail » de l'étude Komoot × Flair.

### 6.1 La fiche (`V3-CarnetTrajet` remplacé)

De haut en bas, une seule page qui défile :
1. **Carte** (40 % de la hauteur) : tracé coloré par allure, arrêts numérotés (ronds gris 22 px, rouge si un moment
   de stress), départ vert. Boutons : « Revoir la balade » (rejoue le tracé en 8 s, existant) et plein écran.
2. **Surtitre** « BALADE AVEC [PRÉNOM] », **titre** (nom de la balade, Bricolage 600), sous-titre
   « Jeudi 22 octobre · 8 h 12 → 8 h 44 · Vertbois ».
3. **Stats** : durée · distance · en marche · arrêts.
4. **Allure** : courbe en barres par minute (couleurs du § 3), glisser le doigt affiche l'heure, la vitesse et la rue
   et pose un repère sur la carte. Légende : marche tranquille · rapide · arrêt.
5. **Ce qui s'est passé** : la frise (§ 6.2), les 5 premières lignes + « Voir toute la balade ».
6. **Ce qu'il a découvert** : rues et lieux sortis du brouillard, « +1 % de Vertbois ».
7. **Photos** de la balade (ajout : photothèque, jamais l'appareil photo).
8. **Tous les chiffres** (replié) : allure moyenne, km par km, pas, montée et descente, énergie, cœur moyen et
   maximum avec petite courbe, météo. Chaque valeur avec sa source.
9. Sources en 12 px ; « Modifier » (texte, date, photos), « Ajuster le début et la fin » (§ 8.3), « Supprimer ».
- Une balade ancienne sans `track` : la fiche montre seulement ce qu'elle a (carte, stats, repères), sans bloc vide.
- Action principale (orange, bas de l'écran) : **« Raconter la balade »** s'il reste des arrêts sans repère, sinon aucune.

### 6.2 La frise « Ce qui s'est passé »

- Une ligne par événement, dans l'ordre : départ (rue, météo) · arrêts (heure, durée, rue, repère s'il existe) ·
  repères hors arrêt · moment rapide · pic de cœur · retour.
- Un arrêt sans repère affiche « Que s'est-il passé ici ? » et 6 tuiles de 44 px : Pipi · Rencontre · Reniflage ·
  Jeu · Moment de stress · Autre (→ les repères existants de `ROUTE_MOMENTS`, plus « Reniflage » `reniflage`
  nouveau, couleur `#6B7F3A`). Un toucher place le repère sur l'arrêt (bandeau « Annuler »).
- « Moment de stress » et « A grogné » alimentent « Comment il réagit » seulement si Martin le choisit (règle existante).
- **Raconter la balade** (bouton) : mode pas à pas, un arrêt par écran (carte zoomée sur l'arrêt, heure, rue, tuiles),
  « Passer » en texte ; à la fin, « C'est raconté ! » et +3 os **une fois par balade** (dans la limite des notes du jour).

### 6.3 Le récap « Belle balade ! »

Après « Terminer » (GPS de Flair) ou à l'arrivée d'une balade de la Watch (notification ou ouverture) :
- Carte plein écran du tracé, panneau du bas : surtitre (« ARRIVÉE DE L'APPLE WATCH » ou rien), « Belle balade ! »,
  une phrase (« Billy a découvert 3 nouvelles rues »), Stats (distance · % découvert gagné · os), « N arrêts. Que
  s'est-il passé ? » + 2 ou 3 pastilles d'arrêts, **« Raconter la balade »** (orange) et « Plus tard » (texte).
- Sans arrêt : « Voir son territoire » (orange) et « Ajouter un souvenir » (texte), comme aujourd'hui.

## 7. Partage en direct (T-087, iOS)

- Au départ d'une balade (et dans « Balade en cours ») : ligne « Partager en direct » (éteinte par défaut) → panneau :
  choisir une ou deux personnes dans « Mes proches » (prénom + numéro ou e-mail, gardés dans le profil) → « Partager ».
  Flair crée un lien `https://martinl123.github.io/billy/#/suivre/<jeton>` et ouvre la feuille de partage d'iOS
  (Messages, WhatsApp…) : Flair n'envoie rien lui-même.
- Données : `live/{jeton}` (jeton aléatoire de 128 bits) = `{ ownerUid, dogName, startedAt, updatedAt, lat, lng,
  distanceM, status: 'en cours' | 'pause' | 'terminée', endsAt }`. Mise à jour **toutes les 60 s** pendant la balade
  (≈ 60 écritures par heure). À la fin : `status: 'terminée'`, position effacée ; document supprimé après 24 h
  (nettoyage à l'ouverture suivante).
- Règles Firestore : `get` permis à tous sur `live/{jeton}` (le jeton fait office de clé), `list` interdit ; écriture
  seulement par `ownerUid`.
- Page `#/suivre/<jeton>` (sans compte) : carte, position, « Billy et Martin sont en balade depuis 23 min · 1,4 km »,
  « Mis à jour il y a 40 s », puis « Balade terminée à 8 h 44 ». Aucune autre donnée.
- Pendant le partage, bandeau permanent dans Flair : « Partagé en direct avec Coralie · Arrêter ».
- Jamais vers la meute, jamais public, jamais automatique. D'autres cas (garde du chien, balade seule le soir)
  passeront par le même panneau.

État (T-087, fait) : `src/lib/liveShare.ts` (jeton, lien, phrases, nettoyage), `src/firebase/live.ts`,
`src/features/live/` (panneau, bandeau, page « Suivre », Profil › Mes proches). Les proches, le prénom du maître
(`ownerName`) et les jetons des partages (`liveShares`) sont dans le profil (`dog/billy`) ; les jetons servent à arrêter
et à effacer après 24 h sans `list`. Mise à jour de la position : `LiveShareSync` (toutes les 60 s, quel que soit
l'écran ouvert, depuis la balade gardée par l'iPhone). **Règles Firestore modifiées** (`match /live/{token}`, testées
dans `tests/rules.test.ts`) : Martin doit les déployer avec
`npx firebase deploy --only firestore:rules --project billy-suivi-chien`, sinon le partage est refusé en production.

## 8. Lot 3 : découvrir

### 8.1 Spots façon Highlight (T-088)
Fiche d'un spot de la meute dans cet ordre : photo, surtitre catégorie, nom, Stats (calme et moment · chiens cette
semaine · distance), conseils de la meute (texte court + auteur + date), pastilles d'infos (eau, ombre, laisse),
« Y aller · 8 min à pied » (orange). Créer un spot : seulement à moins de 60 m d'un trajet déjà fait ; les spots à
moins de 100 m sont proposés d'abord (« C'est l'un de ceux-là ? ») pour éviter les doublons.

### 8.2 Boucles pour Billy, version simple (T-089)
Dans Balades : « Boucles pour [prénom] », jusqu'à 3 de **ses propres balades passées** qui partent à moins de 300 m de
la position, regroupées par durée (≈ 15, 30, 45 min) et classées par cases de brouillard à moins de 100 m du tracé.
Niveau : « Facile · chiot » (< 1 km, ou chien de moins de 6 mois), « Moyen » (1–3 km), « Long » (> 3 km). Toucher →
la carte de la boucle + « Partir en balade » (le tracé passé reste affiché en pointillés pendant la balade).
Plus tard (hors lot) : boucles calculées avec openrouteservice.

### 8.3 Recadrer le début et la fin (T-090)
« Ajuster le début et la fin » : la courbe d'allure avec deux poignées ; enregistre `trimmed`, recalcule distance,
durée, arrêts, allure. Le tracé d'origine est gardé (on peut revenir en arrière). Le brouillard déjà levé ne redescend
jamais.

### 8.4 Carte postale de balade (T-091)
Bouton « Partager » de la fiche : image 1080 × 1350 (canvas) avec le tracé sur fond de carte, la photo du chien, le
nom, « 2,1 km · 3 rues découvertes », la date. **Les 200 premiers et derniers mètres du tracé sont retirés** (domicile).
Feuille de partage d'iOS ; sur le web, l'image s'ouvre pour l'enregistrer.

### 8.5 Ses balades : le bilan (T-092)
Billy › Ses balades : Stats (balades · km · % découvert · heures ensemble), toutes les photos de balade (grille),
bilan du mois (récap du dimanche en plus grand : balades, km, rues découvertes, arrêts racontés, le moment le plus
noté). Seulement ce qui monte ; jamais « moins que le mois dernier ».

## 9. Ce qui ne change pas

- Aucune saisie ni modification de tracé à la main (seulement le recadrage du § 8.3).
- Aucun enregistrement GPS sans action de l'utilisateur ; Mouvements et forme ne donne aucune position.
- Carte, trajets, cœur : privés. La meute ne voit rien de tout ça.
- 0 € : Firebase Spark, OpenFreeMap, Nominatim, Open-Meteo, pas de Cloud Functions.

## 10. Critères d'acceptation

- Une balade Watch de 30 min arrive avec `track`, `stops`, `pace`, `hr`, `steps`, `weather` ; document < 900 Ko.
- Un GPX Strava garde son `hr` (une valeur par minute) et sa météo.
- Les tests de `walkStory.ts` couvrent : arrêt de 30 s détecté, arrêt de 25 s ignoré, deux arrêts fusionnés, arrêt au
  départ ignoré, moment rapide, pic de cœur sans accélération, recadrage.
- La fiche d'une balade ancienne (sans `track`) s'affiche sans bloc vide.
- À 390 × 844 et 320 × 568 : un seul bouton orange par écran, Stats lisibles en texte agrandi (2 colonnes si besoin).
- Le lien de partage en direct ne montre rien d'autre que le § 7 ; il s'éteint à la fin de la balade.
- `npm test`, la vérification TypeScript et les tests Playwright passent.
