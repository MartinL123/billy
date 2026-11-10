# Spec V6.1 — Retours de Martin sur la V6 (22 octobre 2026, 16 h)

Complète `spec-v6-balades-komoot.md` (qui reste valable) ; **en cas de divergence, cette spec fait foi**.
Retours faits sur l'app en ligne après la V6 (tickets T-077 à T-093). Tickets : T-094 à T-104, recette T-105.
**Maquettes validées par Martin le 22 octobre (17 h 25) : `docs/maquettes/V6-Billy-et-journal.html`** (artifact
https://claude.ai/code/artifact/c37234cd-51cd-42f3-b477-708a95ee2181). Elles font foi pour la page Billy (§ 10) et le
panneau de la carte (§ 1 à § 4) ; en cas d'écart avec le texte, la maquette gagne.

## Décisions (22 octobre, 16 h)

- **Plus de pourcentage « découvert »** nulle part : il ne veut rien dire. On montre des Stats façon Komoot.
- **« 9 h ensemble » ne se comprend pas** : on écrit « de balade » (« 9 h de balade »).
- **Brouillard en option** dans « Affichage », **désactivé par défaut**.
- **Exercice au parc : seulement pendant une balade lancée** (aucune nouvelle autorisation de position).
- **Page Billy : maquettes d'abord** (T-104, pas de code avant le choix de Martin).
- Toucher une balade, où qu'elle soit, **ouvre sa fiche directement**.
- Automatiser les souvenirs au maximum, en gardant la fiche pour approfondir.

## 1. T-094 — Stats au lieu du pourcentage

- Panneau de la carte : à la place de « <1 % découvert » et de sa barre, **une seule ligne de résumé** sous le titre
  (pas de bloc Stats, jugé trop lourd) : « **12** balades · **18,4 km** · **9 h 40** de balade », chiffres en gras,
  les trois valeurs réparties sur toute la largeur (`justify-content: space-between`). Les trois valeurs suivent le
  filtre choisi.
- Partout ailleurs : retirer « % découvert » / « % de Saint-Ouen » (accueil « Sa vie avec vous », tuiles de Billy,
  bilan de Ses balades, récap « Belle balade ! », fiche, carte postale, pastille « + 1 % »). Remplacer par ce qui est
  concret : « 3 nouvelles rues » quand on le sait (§ 7), sinon rien.
- « ensemble » → « de balade » partout où il suit une durée (« 1 h 10 de balade »).
- Le calcul du brouillard reste (données, option d'affichage), il n'est simplement plus affiché en pourcentage.

## 2. T-095 — Le brouillard devient une option

- « Affichage » : Plan / Satellite, 2D / 3D, et un interrupteur **« Brouillard »** (sous-titre : « Les zones où vous
  n'êtes jamais allés restent dans la brume »). **Éteint par défaut**, choix gardé sur l'appareil.
- Brouillard éteint : carte nette, toutes les balades filtrées en vert carte (`--route`), la balade touchée en plus
  épais, les autres à 40 %. Les « ? » des lieux à découvrir ne s'affichent qu'avec le brouillard.
- Balade en cours : même réglage.

## 3. T-096 — Filtres

Rangée de pastilles du panneau, un seul choix : **Toutes · 24 h · Cette semaine · Ce mois** (« Mes balades » devient
« Toutes » ; « 24 h » = les dernières 24 heures ; « Cette semaine » = depuis lundi). Le résumé (§ 1) suit le filtre ;
la pastille ne porte pas de nombre. **« Spots de la meute » passe dans « Affichage »** (avec Plan / Satellite, 2D / 3D,
Brouillard), plus dans le panneau.

## 4. T-097 — Le panneau de la carte = le journal des balades

**Un seul panneau, trois hauteurs ; le contenu est le même, on en voit seulement plus ou moins** (maquette, 3 écrans) :
- **Tout en bas** : la carte en plein écran. Il ne reste que le haut du panneau, collé à la barre d'onglets (un seul bloc
  blanc, sans trait de séparation) : poignée, surtitre « LE QUARTIER » et le haut du titre, coupé à mi-hauteur. Pas
  de bouton.
- **À mi-hauteur** : titre, résumé, filtres, début des « Idées de balade ».
- **En grand** : le panneau s'arrête juste sous les boutons « Affichage » et « Me situer », qui restent visibles.
- Poignée : 36 × 5 px, 14 px d'espace au-dessus et en dessous (marge **intérieure** du panneau : attention à la fusion
  des marges CSS qui la collait au bord).
- « Partir en balade » (orange) est **fixé en bas**, au-dessus des onglets, à mi-hauteur et en grand (fondu derrière) ;
  caché tout en bas.

Contenu, de haut en bas :
1. Surtitre « LE QUARTIER », titre « Les balades de [prénom] », résumé (§ 1), filtres (§ 3).
2. **Idées de balade** (ex-« Boucles pour [prénom] », T-089) : 3 petites cartes horizontales (mini-carte, nom, durée ·
   niveau), lien « Masquer » (réaffichable dans « Affichage »). Pas de phrase d'explication. Toucher une idée : le
   panneau descend, la boucle s'affiche sur la carte avec sa durée et sa distance, le bouton orange devient
   « Partir sur cette boucle » ; pendant la balade, la boucle reste en pointillés.
3. **Le journal**, groupé par jour (« Aujourd'hui », « Hier », « Mardi 20 octobre »). Chaque balade, en carte :
   - mini-carte sur vrai fond (130 px de haut), trajet vert, arrêts en points, **les photos posées là où elles ont été
     prises** (ronds de 30 px bordés de blanc ; position de la photo, sinon son heure recoupée avec le tracé) ;
     pastille dorée « N à raconter » en haut à droite s'il reste des arrêts sans repère ;
   - nom avec le lieu marquant (« Balade du matin au square Ampère ») ;
   - **durée · distance · arrêts** (pas d'heures de départ ni d'arrivée : elles sont dans la fiche) ;
   - pastilles des repères et « 3 nouvelles rues » **sur une seule ligne**, la dernière coupée en fondu au bord.
   - Un souvenir sans trajet du même jour : petite ligne (vignette, texte, « Souvenir · 14 h »).
4. Rien d'autre en bas (plus de « Ajouter mes balades Strava » ; l'import reste dans « Affichage » et dans l'état vide).
État vide (filtre sans balade) : « Aucune balade cette semaine. » + « Partir en balade » (iOS) / « Ajouter mes
balades » (web).

## 5. T-098 — Toucher une balade ouvre sa fiche

- Dans le carrousel, le journal, la liste « Ses balades », la carte (toucher un tracé), l'accueil et le récap :
  **ouvre directement la fiche de la balade** (T-081). Plus d'étape intermédiaire « La revoir et y placer des
  repères » dans le panneau.
- Sur la carte, un premier toucher sur un tracé le met en avant **et** affiche sous le panneau une ligne
  « [Nom] · 22 oct. · 2,1 km › » : la toucher ouvre la fiche. (Un toucher sur une carte du panneau ouvre la fiche
  tout de suite.)
- Retour de la fiche : on revient là où on était (panneau à la même hauteur, même filtre).

## 6. T-099 et T-100 — Navigation

- **T-099** : « Ne pas la garder » (balade en cours) ramène à l'**onglet Balades**, panneau à mi-hauteur, au lieu de
  l'accueil. Même chose pour une balade trop courte non gardée.
- **T-100** : Accueil, « Ses sorties du jour » : toucher une sortie faite **qui a une balade rattachée** ouvre la fiche
  de cette balade ; une sortie notée sans trajet ouvre le panneau existant (modifier la durée) ; une sortie à faire
  garde « + Noter ».

## 7. T-102 — La fiche montre tout ce qu'on sait

Tout ce qui est collecté est affiché, dans des blocs **visibles** (plus de « Tous les chiffres » replié ; une liste
longue montre ses 5 premières lignes + « Voir tout »). Chaque bloc n'apparaît que s'il a des données. Ordre :

1. Carte (allure, arrêts numérotés, départ, sens de marche), « Revoir la balade ».
2. Titre, date, heures, quartier ; âge de [prénom] ce jour-là (« Billy avait 5 mois et 9 jours »).
3. Stats principales : durée · distance · en marche · arrêts.
4. **Allure** : courbe par minute (glissable), vitesse moyenne en marche, vitesse max, km par km (temps de chaque km).
5. **Ce qui s'est passé** : la frise (T-082).
6. **Le parcours** : rues traversées dans l'ordre (nouvelles rues en gras avec « nouvelle »), parcs et lieux traversés
   (OpenStreetMap), spots de la meute croisés, « Vous êtes déjà passés ici 4 fois » pour un trajet presque identique
   (sans comparaison de performance).
7. **Le relief** : montée, descente, profil d'altitude (si altitude).
8. **Votre corps** : cœur moyen et maximum + courbe par minute, pas, cadence (pas par minute en marche), énergie.
9. **La météo** : température, ressenti, vent, humidité, pluie, et le moment (« au coucher du soleil », « de nuit »)
   d'après les heures de lever et coucher du soleil (Open-Meteo, une requête, gardée).
10. **Photos** (T-103).
11. Sources et appareil (« Enregistré par l'Apple Watch de Martin · Météo Open-Meteo · Lieux © OpenStreetMap ») ;
    actions en texte : Partager, Ajuster le début et la fin, Modifier, Supprimer.
- Données nouvelles à calculer et garder à l'import (champs optionnels) : `streets[]` (nom, nouvelle ?), `places[]`,
  `kmSplits[]`, `maxSpeed`, `cadence`, `weather.feelsC|windKmh|rainMm|daylight`. Rues : Nominatim sur un point toutes
  les 100 m (file d'une requête par seconde, en arrière-plan ; la fiche se complète quand c'est prêt) ; « nouvelle » =
  jamais vue dans une balade précédente.
- Jamais de record, de classement ni de « moins bien que ».

## 8. T-101 — Un exercice au parc, pendant la balade

- Pendant une balade lancée (GPS de Flair, iOS) : au départ, Flair charge les parcs et squares à moins de 2 km
  (OpenStreetMap `leisure=park|dog_park|garden`, et les spots « Parc » de la meute), gardés 7 jours.
- Quand la position entre dans l'un d'eux et y reste 30 s, **si la mission du jour n'est pas faite** : bandeau en haut
  de « Balade en cours » « Vous êtes au square Ampère. 3 min de « [titre de la mission] » ici ? » + « Commencer »
  (ouvre la mission par-dessus, la balade continue) et « Plus tard » (texte). Écran verrouillé : la même chose en
  notification locale. **Une seule fois par balade.**
- Si la mission du jour est faite : rien. Jamais de reproche.
- Réglage : Profil › Notifications › « Me proposer un exercice au parc pendant une balade » (activé par défaut).

## 9. T-103 — Souvenirs automatiques

Chaque balade crée déjà son souvenir. En plus, sans action :
- **Nom** : moment + lieu marquant traversé (« Balade du matin au square Ampère ») ; un nom choisi par Martin reste.
- **Photos de la balade** : avec l'accord de Martin (une fois, depuis le récap ou le réglage « Retrouver les photos de
  mes balades », accès Photos limité ou complet d'iOS ; jamais l'appareil photo), Flair cherche dans la photothèque
  les photos prises entre le départ et l'arrivée, les ajoute au souvenir (compression habituelle) et le récap dit
  « 3 photos de la balade ajoutées · Annuler ». Vidéos ignorées.
- **Météo, rues, parcs** : ajoutés seuls (T-102).
- **Repères proposés** : un arrêt dans un parc de plus de 3 min est pré-rempli « Jeu ? » (à confirmer d'un toucher
  dans la frise, jamais compté sans confirmation) ; un arrêt près d'un spot de la meute : « Pipi » (règle existante).
- **Sortie du jour** cochée seule (existant).
- Le récap « Belle balade ! » et la fiche restent pour approfondir.

## 10. T-104 — La page Billy, d'abord ses entraînements (maquette validée)

Piste A (chemin) + les badges de la piste B + « Ses progrès » de la piste C. De haut en bas :
1. « ‹ Accueil » (chevron).
2. **En-tête** : une carte. À gauche, photo ronde 60 px, nom (Bricolage 600), « 5 mois » seulement (pas de prochaine
   étape de vie). À droite, pilule vert clair (`primary-soft`) « Son profil › » → profil (puce, véto, **ce qui
   l'inquiète**, réglages). Plus de tuile « Ce qui l'inquiète », plus de statistiques, pas de rang.
3. **Sa semaine** : 7 ronds (L à D) : coche = jour d'entraînement, lune = repos, contour orange = aujourd'hui,
   pointillés = à venir ; à droite « 4 séances · 14 min ». Jamais de rouge. **Toucher un jour coché ouvre le souvenir de
   ce jour-là** (exercice, ressenti, note ; plusieurs séances : la liste du jour).
4. **Ce qu'il apprend** : une carte par compétence en cours : titre en phrase, pastille du territoire (« Le Rappel »),
   puis un **chemin de 5 points reliés** : doré coché = acquise, contour orange avec halo = en cours, gris = à venir,
   **étoile** sur le dernier (remplace la coupe). Sous chaque point, **le nom court de l'étape, 1 ou 2 mots, toujours
   sur une ligne** (« Au salon », « Au jardin », « Au parc », « Un chien », « Partout » ; Soins : « Pattes »,
   « Brosse », « Un proche », « Véto », « Partout »). Nouveau champ `short` pour chacune des 50 étapes dans
   `src/content/` (texte coupé par « … » au pire). Une carte ouverte à la fois (bord vert) : « PROCHAINE ÉTAPE » + la
   phrase complète. **Pas d'indication des 3 jours de réussite.** Sous les cartes, bouton contour pleine largeur
   « ⇄ Changer ce qu'il apprend » (le seul contour de la page).
5. **Ses badges** : les 10 compétences en anneaux de 5 segments (couleur du territoire, doré si maîtrisée, pâle sinon,
   jamais cadenassé), 4 par ligne, nom dessous, « En cours » ou « Maîtrisé » sous les concernés. Rien à côté du titre,
   pas de légende. Toucher un badge → la page de la compétence (son chemin complet).
6. **Ses progrès** : fil daté (étapes acquises en doré, séances « Super », « Super rappel » placés en balade) ; les 4
   derniers + « Voir tous ses progrès ». Rien à côté du titre.
7. Fixé en bas : « S'entraîner · 3 min » (orange) au-dessus des onglets.
Boutique et meute : restent gelées (T-072). Les badges reviennent à l'écran (retirés en V4) ; les rangs, non.

## 11. Critères

- Le mot « découvert » suivi d'un pourcentage n'apparaît plus nulle part ; « ensemble » ne suit plus aucune durée.
- Brouillard éteint au premier lancement ; le choix survit à une relance.
- Depuis le panneau, le journal, la carte et l'accueil : 1 toucher → la fiche.
- Page Billy et panneau conformes à la maquette `V6-Billy-et-journal.html` à 390 et 320 px ; aucun nom d'étape sur
  deux lignes ; un seul bouton orange et un seul bouton contour sur la page Billy.
- « Ne pas la garder » → onglet Balades.
- Tests : filtres (24 h, semaine depuis lundi, mois), groupes du journal par jour, entrée dans un parc (30 s, une fois
  par balade), nom automatique, recherche des photos par heure.
