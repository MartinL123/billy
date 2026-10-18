# Billy — audit UX de l'app

Oct 17, 2026 · @Martin

## En bref

**Billy fait trop de choses à la fois : environ 30 notions à comprendre,
10 blocs sur l'accueil et 4 boutons qui se disputent l'attention avant
même de défiler.** Chaque fonction, prise seule, est bonne ; c'est leur
empilement qui rend l'app difficile à lire.

La direction proposée : **une seule chose à faire à la fois, choisie par
l'app**. L'accueil dit « voici ce qu'on fait maintenant » avec un seul
bouton ; l'app compte 3 onglets au lieu de 5 (Balades, Aujourd'hui au
centre, Santé ; Billy s'ouvre en touchant sa photo) ; les balades
n'arrivent plus que par fichier Strava ; un seul système de récompense
(les os) au lieu de sept.

## Ce que j'ai regardé

Tour complet de l'app en ligne le 17 octobre, avec le compte de Martin :
ouverture, Accueil, Mission du jour et écran d'exercice, Noter, Carnet,
Santé, onglet Billy (l'arbre), Exploration, Meute, Profil, Boutique.
Grille de lecture : les principes UX de CLAUDE.md (une action principale
par écran, ajout en 2 taps, tout comprendre vite) et les 10 heuristiques
de Nielsen. C'est un audit d'expert, pas un test avec des utilisateurs :
l'étude utilisateur prévue confirmera ou corrigera.

## Les problèmes principaux

**Le plus grave n'est pas un écran mais l'empilement : on ne sait jamais
ce qui compte le plus.**

| \#  | Problème                                                                                                                                                                                                                                                                                        | Où                                  | Gravité | Ce que vit l'utilisateur                                                                                                             |
|-----|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|---------|--------------------------------------------------------------------------------------------------------------------------------------|
| 1   | **Accueil surchargé** : 10 blocs (Billy et son niveau, Mission du jour, Noter, Faire un exercice, Sorties du jour, Défi de la semaine, Badges, Aujourd'hui, Occupation du jour, Installer) et 4 boutons visibles sans défiler : Commencer, Autre idée, Noter ce qu'on a fait, Faire un exercice | Accueil                             | Forte   | « Par quoi je commence ? » La règle « une action principale par écran » n'est pas tenue.                                             |
| 2   | **Sept systèmes de jeu empilés** : niveau + titre (« Niv. 8 · Explorateur »), étapes, os, boutique, badges, défi de la semaine, défi de la meute, zones découvertes ; 11 façons différentes de gagner des os                                                                                    | Accueil, Billy, Boutique            | Forte   | On ne sait plus ce qui fait progresser ; les chiffres se contredisent (« encore 2 étapes », « 42 os », « niveau 8 », « 114 zones »). |
| 3   | **Vocabulaire maison à apprendre** : Les Congénères, Le Lien, étages Racines / Tronc / Branches, Mode précis, Marquer, séance, exposition, boss                                                                                                                                                 | Partout                             | Forte   | Il faut un dictionnaire pour comprendre « Sons progressifs · Les Congénères · 3 min ».                                               |
| 4   | **L'onglet Billy fait trois écrans de long** : texte d'explication, os, programme de la semaine, 3 étages et 10 compétences, territoire, balades, exploration                                                                                                                                   | Billy                               | Moyenne | On fait défiler sans savoir ce qu'on cherche ; l'essentiel (ce que Billy apprend en ce moment) est noyé.                             |
| 5   | **Les balades se saisissent à la main à 4 endroits** : Carnet « Ajouter une balade », Noter › « Tracer un nouveau trajet », Exploration « Ajouter une balade », Sorties du jour à cocher                                                                                                        | Carnet, Noter, Exploration, Accueil | Forte   | Du travail en double, et des données fausses (deux sorties « Fait à 17 h 08 » cochées après coup).                                   |
| 6   | **Santé sur une seule page très longue** : 3 statuts, un calendrier du mois, 7 événements à venir avec 6 filtres, les faits, le poids, les repas, les rappels, les documents                                                                                                                    | Santé                               | Moyenne | La prochaine chose à faire (antiparasitaire le 25 octobre) est bien plus bas que le calendrier, qui sert peu.                        |
| 7   | **Formulaire Noter trop long** : texte, photos, trajet, date, ressenti, 10 compétences à cocher, partage                                                                                                                                                                                        | Noter                               | Moyenne | Noter un souvenir demande 6 décisions ; on renonce.                                                                                  |
| 8   | **Profil en vrac** : 13 lignes « Comment il réagit », des réponses brutes (« Il adore : Treat », « autre »), réglages et compte mélangés                                                                                                                                                        | Profil                              | Faible  | On ne retrouve pas un réglage ; le texte en anglais fait « pas fini ».                                                               |
| 9   | **Bugs vus** : carte de l'Exploration toute grise (aucune tuile après 6 s) ; « Treat » en anglais ; l'écran d'ouverture demande un toucher en plus à chaque lancement                                                                                                                           | Exploration, Profil, Ouverture      | Moyenne | Une carte vide ressemble à une panne.                                                                                                |
| 10  | **Personne ne guide** : aucun écran ne dit « voici ce qu'on fait maintenant et pourquoi » ; tout est à découvrir seul                                                                                                                                                                           | Partout                             | Forte   | L'utilisateur doit construire lui-même son parcours dans l'app.                                                                      |

## La direction : une chose à la fois

**L'app propose, l'utilisateur confirme.** Billy sait l'heure, l'âge du
chien, ses peurs et son calendrier : c'est à l'app de choisir quoi faire
maintenant, pas à l'utilisateur de chercher.

1.  **Un seul bouton principal par écran**, en bas, dans la zone du
    pouce. Tout le reste est secondaire et plus discret.

2.  **Trois mots à connaître, pas trente** : la mission, les balades, la
    santé. Les noms de compétences deviennent des phrases (« Rester
    calme quand un chien aboie » plutôt que « Les Congénères »).

3.  **Un seul système de récompense : les os.** On retire le niveau, le
    titre, les badges et le défi de la meute ; le défi de la semaine
    devient une mission parmi d'autres.

4.  **Rien à saisir quand l'app peut le savoir** : les balades arrivent
    par fichier Strava, la sortie du jour se coche toute seule quand une
    balade est importée.

5.  **3 onglets au lieu de 5, Aujourd'hui en gros au centre ; Billy
    s'ouvre en touchant sa photo (maquettes V4 sur le canvas)** :

| Aujourd'hui | Proposé         | Ce qui change                                                                                                                                           |
|-------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| Carnet      | **Balades**     | La carte qui se découvre, la liste des balades, les spots de la meute en calque sur la même carte. Les souvenirs (photos, notes) restent dans la liste. |
| Santé       | **Santé**       | D'abord « la prochaine chose à faire », le reste replié.                                                                                                |
| Accueil     | **Aujourd'hui** | Une carte « à faire maintenant », un bouton.                                                                                                            |
| Billy       | **Billy**       | Plus un onglet : on l'ouvre en touchant sa photo sur Aujourd'hui. Son profil et ce qu'il apprend ; l'arbre complet en option.                           |
| Meute       | (fusionnée)     | Les spots passent dans Balades ; le reste de la meute dans Billy › Ses amis.                                                                            |

## Écran par écran

| Écran                     | On garde                                                     | On retire                                                                                           | On change                                                                                                                                                                                                                                                               |
|---------------------------|--------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Ouverture**             | La photo de Billy au premier lancement                       | Le toucher obligatoire à chaque ouverture                                                           | On arrive directement sur Aujourd'hui                                                                                                                                                                                                                                   |
| **Aujourd'hui** (accueil) | La mission, la prochaine chose santé, la dernière balade     | Badges, aperçu de l'arbre, Occupation du jour, Faire un exercice, Noter, Défi de la semaine, niveau | **Une carte « À faire maintenant »** qui change selon l'heure : la mission le matin, la sortie à l'heure prévue, le repas, un soin dû. Un bouton. Dessous, deux lignes au plus : « Ensuite : antiparasitaire dans 8 jours », « Dernière balade : 1,4 km à Saint-Briac » |
| **Mission et exercice**   | L'illustration, les étapes, « Trop difficile aujourd'hui ? » | « Mode précis », le choix entre 2 boutons (minuteur ou C'est fait)                                  | **Un pas-à-pas plein écran** : étape 1 sur 3, bouton « Suivant », minuteur lancé tout seul, puis une seule question « Ça s'est bien passé ? »                                                                                                                           |
| **Balades** (ex-Carnet)   | La carte qui se découvre, la liste, les filtres              | « Ajouter une balade », Tracer, trajets habituels                                                   | Import Strava seul ; les souvenirs sans balade (une photo, une note) restent possibles en 2 taps                                                                                                                                                                        |
| **Noter un souvenir**     | Texte, photo, ressenti                                       | Trajet, compétences à cocher, choix de la date (aujourd'hui par défaut, modifiable après)           | 3 champs, un bouton                                                                                                                                                                                                                                                     |
| **Santé**                 | Statuts vaccins / vermifuge / puces, poids, repas, documents | Le calendrier du mois en tête de page, les 6 filtres                                                | En haut : **« Prochaine chose à faire »** + « Marquer fait ». Dessous, des sections repliées : Vaccins, Poids, Repas, Documents                                                                                                                                         |
| **Billy** (ex-arbre)      | Photo, âge, os et boutique                                   | Le texte d'explication, les étages, Territoire et Exploration (partis dans Balades)                 | **« Ce qu'il apprend en ce moment »** : 3 lignes en phrases simples, chacune avec sa progression. Bouton secondaire « Voir tout son chemin » pour l'arbre                                                                                                               |
| **Profil**                | Identité, contacts, compte                                   | Les 13 lignes de réactions                                                                          | « Ce qui l'inquiète : enfants, reflet, rester seul » en une ligne + Modifier ; réglages (sorties, rappels) dans un seul bloc « Notifications »                                                                                                                          |
| **Boutique**              | Tout                                                         | La liste des 11 façons de gagner des os                                                             | « Les os se gagnent en faisant la mission et en ajoutant vos balades. »                                                                                                                                                                                                 |
| **Meute**                 | Spots, Marquer                                               | L'onglet dédié                                                                                      | Calque « Spots de la meute » sur la carte des balades                                                                                                                                                                                                                   |

## Prendre l'utilisateur par la main

**Chaque écran répond en une phrase à « qu'est-ce que je fais maintenant
? », avant tout le reste.**

1.  **Une phrase de contexte en haut** : « Il est 17 h : c'est l'heure
    de la sortie de l'après-midi. » « Billy a fini sa mission, bravo.
    Prochaine étape : la sortie de 19 h. »

2.  **L'app choisit, l'utilisateur peut changer** : la mission est déjà
    choisie ; « Autre idée » est un lien discret, pas un second bouton.

3.  **Pas-à-pas pour tout ce qui a plusieurs étapes** (exercice, import
    Strava, premier lancement) : un écran par étape, « 2 sur 3 », «
    Suivant », jamais une liste à lire d'un coup.

4.  **Une aide au bon moment, une seule fois** : la première fois qu'on
    voit la carte, une bulle « Chaque balade lève le brouillard » ; puis
    plus jamais. Une bulle au plus par écran.

5.  **Des états vides qui disent quoi faire** : « Pas encore de balade.
    Importez celle d'aujourd'hui depuis Strava » + le bouton.

6.  **Des mots de tous les jours** : « Billy apprend à revenir quand on
    l'appelle », jamais un nom de catégorie seul.

7.  **Une félicitation courte après chaque action**, puis la suite
    proposée : « +10 os. Et maintenant, la sortie ? »

8.  **Moins de texte par écran** : 3 lignes au plus avant le bouton ; le
    détail (sources, conseils) replié sous « En savoir plus ».

## Retirer la saisie manuelle des balades

**Décision de Martin : les balades n'entrent dans Billy que par un
fichier (Strava, GPX).** Le prompt
prompt-v3-17-retirer-saisie-balades.md le demande à Claude Code.

| À retirer                                               | Où c'est aujourd'hui | Ce qui le remplace                                                                        |
|---------------------------------------------------------|----------------------|-------------------------------------------------------------------------------------------|
| « Tracer un nouveau trajet » et le traceur sur la carte | Noter › Le trajet    | Import Strava                                                                             |
| « Vos trajets habituels »                               | Noter › Le trajet    | Rien : chaque balade a son vrai trajet                                                    |
| « Ajouter une balade »                                  | Carnet, Exploration  | « Importer mes balades Strava »                                                           |
| « Modifier le trajet »                                  | Détail d'un moment   | Rien (on peut supprimer la balade et la réimporter)                                       |
| Placer un moment sur le trajet à la main                | Traceur              | À trancher : garder « placer une peur sur le trajet » après l'import, ou le retirer aussi |

Les trajets déjà tracés à la main restent dans le Carnet et sur la carte
: rien n'est effacé.

## Ordre de travail et questions à trancher

**On commence par retirer, avant de redessiner** : chaque retrait allège
l'app tout de suite, sans nouvelle maquette.

1.  **Lot A, retirer** : saisie manuelle des balades, « Mode précis »,
    texte « Treat », toucher de l'ouverture ; réparer la carte grise de
    l'Exploration.

2.  **Lot B, Aujourd'hui** : la carte « À faire maintenant » et un seul
    bouton (maquette d'abord).

3.  **Lot C, la carte qui se découvre** : prompt-v3-16 (déjà prêt), qui
    devient l'onglet Balades.

4.  **Lot D, mission en pas-à-pas.**

5.  **Lot E, Santé et Billy** allégés ; Profil rangé.

6.  **Lot F, 3 onglets** et un seul système de récompense, une fois les
    écrans prêts.

**Tranché le 17 octobre (Martin suit les recommandations)**

- [x] Les sorties du jour se cochent toutes seules quand une balade
  Strava arrive (décidé le 17 octobre).

- [x] On retire le niveau, le titre et les badges : on ne garde que les
  os (décidé).

- [x] La meute passe dans l'onglet Balades : spots sur la même carte,
  amis dans le profil de Billy (décidé).

- [x] On garde « placer une peur sur le trajet » après l'import : ce
  n'est pas une saisie de balade, et ça nourrit le profil (décidé).
