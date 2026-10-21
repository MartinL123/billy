# Rapport chiffré

État au 21 octobre 2026. Sources : l'export de tes données Flair (bouton « Exporter mes données », sans lieux ni
textes), l'export Santé de l'iPhone (pas et séances), les journaux de l'iPhone, tes messages et le code. Les fichiers
bruts restent sur ton Mac, hors du repo.

## 0. Les chiffres clés

| Métier | Mesure | Valeur |
| --- | --- | --- |
| 1. Balade | **Marches réelles captées par Flair avec un tracé** (14 au 20 oct.) | **7 sur 10 (70 %)** |
| 1. Balade | Même chose depuis que l'import et l'app iOS existent (17 au 20 oct.) | **6 sur 6 (100 %)** |
| 1. Balade | Balades perdues | **1** (R-042, 19 oct. : 259 positions GPS dans les journaux iOS, rien dans Flair) |
| 1. Balade | D'où viennent les 8 tracés | Strava 3 · Apple Watch 2 · iPhone 1 · tracés à la main 2 |
| 1. Balade | Sorties notées sans tracé (« + Noter ») | 4 (19, 20 et 21 oct.), dont 3 sans marche visible dans les pas |
| 2. Santé | Soins arrivés à échéance pendant la période | **0** : l'indicateur n'est pas encore mesurable. Prochains : antiparasitaire le 25 oct., vermifuge le 27 oct. |
| 2. Santé | Pesées | 1 dans la période (19 oct.) ; 5,2 → 8,7 → 12,3 kg en 11 semaines |
| 3. Entraînement | **Jours avec la mission du jour faite** (13 au 20 oct.) | **3 sur 8** (14, 18, 20 oct.) — cible 5 sur 7 |
| 3. Entraînement | Durée d'une séance | non mesurée aujourd'hui (le journal T-066 la donnera) |

Méthode : une « marche réelle » est une période d'au moins 10 minutes à plus de 60 pas par minute (iPhone ou Watch,
pauses de moins de 15 minutes fusionnées), reconnue dans l'export Santé. Une marche sans téléphone ni montre n'y
apparaît pas : le dénominateur est un minimum. Seulement **2 séances Marche** ont été lancées sur la Watch depuis le
1er septembre (les deux le 20 octobre) : la Watch seule ne suffit pas comme référence.

Les 3 marches non captées datent des 15 et 16 octobre, avant l'import et l'app iOS. Depuis, tout est capté, mais
**3 tracés sur 6 viennent de Strava** : tu enregistres avec une autre app puis tu importes. Le métier n° 1 dépend donc
encore d'un outil extérieur.

**Ce que tu utilises vraiment** (traces dans les données, 13 au 21 oct.) :

| Fonction | Utilisée ? | Trace |
| --- | --- | --- |
| Balades (import Strava, Watch, iPhone, tracé à la main) | oui | 8 tracés |
| Sorties du jour notées à la main | oui, depuis le 19 | 4 |
| Mission du jour, moments d'entraînement notés | oui, 3 jours sur 8 | 3 missions, 4 moments |
| Questionnaire | une fois (13 oct.) | |
| Santé : soins | saisis au questionnaire, un vermifuge ajouté à la main (27 oct.) | aucun coché dans la période |
| Pesée | 1 fois | |
| **Boutique** | **oui, 2 achats** (14 et 20 oct.) | |
| **Marquer un spot (meute)** | **oui, 2 fois** (14 et 20 oct.) | |
| Souvenirs avec photo | 2, le 13 oct. seulement | |
| Documents | **jamais** | 0 |
| Anciennes séances, expositions, lieux | jamais (données d'avant) | 0 |

À noter pour la boucle centrale : la boutique et « Marquer » servent un peu. Les **geler** plutôt que les retirer
reste cohérent ; les retirer demande ton avis.


## 1. Ce que disent tes messages (13 au 21 octobre)

Source : les messages que tu m'as écrits dans ce projet (93 messages directs, 26 envoyés pendant que je travaillais).
43 moments de blocage, d'agacement ou de souhait.

| Métier | Moments | Dont bloquants |
| --- | --- | --- |
| 1. Balade | 15 | 7 (import impossible depuis le téléphone, balade perdue R-042, Apple Watch introuvable ×3, balades absentes de la carte) |
| 2. Santé | 5 | 2 (« je ne vois pas les soins », impossible de toucher repas et vaccins) |
| 3. Entraînement | 5 | 0 |
| Aucun (installation, carte, navigation, divers) | 18 | 3 (accès, identifiants, clés des notifications) |

Ce qui ressort :

- **La balade concentre les blocages** : 7 sur 12. Le plus grave : la balade perdue du 19 octobre (R-042).
- **L'entraînement n'apparaît plus après le 14 octobre** dans tes messages d'usage réel. Rien ne dit que tu fais
  l'entraînement du jour : à vérifier dans les données (indicateur 3).
- **Jamais mentionnés en usage réel** : documents, photos, pesées, os et boutique, badges, arbre des compétences,
  meute (défi, spots), « Revoir la balade », export .ics, rappel du soir, questionnaire.
- **Le plus commenté** : la carte des balades (9 moments), alors qu'elle ne sert qu'à consulter.

## 2. Ce que dit le code

| Mesure | Valeur |
| --- | --- |
| Écrans réels | 34 (47 routes dont 12 redirections) |
| Lignes de code (src, hors tests) | ≈ 20 700 ; dont ≈ 13 000 pour les trois métiers |
| Collections Firestore | 25, dont 10 servent les trois métiers |
| Écouteurs permanents à l'ouverture | 18 collections, dont 3 inutiles (`quests`, `places`, `sessions`) |
| Lignes proposées au retrait ou au gel | ≈ 4 500 (22 %), voir `01-boucle-centrale.md` |
| Fonction des trois métiers **inaccessible** | choisir les compétences en cours (`/en-cours`) : aucun lien n'y mène |
| Risques de perte de balade trouvés | 2 confirmés (balade fantôme, « Réessayer » qui efface sans vérifier), 4 probables : `03-protocole-casse.md` |
| Règles chien sourcées | 9 sourcées, 10 à nuancer, 9 non sourcées sur 28 : `04-fiche-contenu.md` |

## 3. Ce que disent les journaux de l'iPhone (14 au 20 octobre)

Source : les journaux de diagnostic copiés depuis l'iPhone le 21 octobre (statistiques quotidiennes d'iOS, rapports
de crash, événements mémoire). Ils couvrent le 14 au 20 octobre ; Flair y apparaît à partir du 18.

| Constat | Valeur | Ce que ça veut dire |
| --- | --- | --- |
| Crashs de Flair | **0** rapport de crash en 7 jours | La balade perdue du 19 octobre (R-042) n'était pas un crash de l'app : c'est bien la base Firestore de WebKit qui a lâché, comme l'analyse l'avait conclu |
| Sessions GPS précises (balade en cours) | **2** : une de 259 positions GPS (relevé du 19 octobre au matin, donc la veille), une de 457 (relevé du 20) ; aucune dans le relevé du 21 | En 3 jours avec l'app iOS, 2 balades lancées depuis l'iPhone. À croiser avec les marches de la Watch pour connaître le taux de capture |
| Positions approximatives (Wi-Fi, 2 à 3 points) | 4 à 5 par jour | « Me situer » et les idées autour de soi : pas des balades |
| Mode économie d'énergie | souvent actif (la moitié des relevés le 18, tous le 20) | Le cas 6 du protocole (batterie faible) est le cas **normal** chez toi : à tester en priorité |
| Lectures disque de Flair | **3 à 4,9 Go par jour** (écritures 0,3 à 0,6 Go) | Très élevé pour une app de suivi : probablement le cache Firestore relu en entier (18 écouteurs permanents) et les tuiles de carte. Coût en batterie, à mesurer avec T-071 |
| Processus réseau de WebKit tué par manque de mémoire | 1 fois (15 octobre, 20 h 11) ; non attribuable à Flair avec certitude (Safari utilise le même processus) | C'est le type de panne derrière R-042 : la protection (rechargement, copie native gardée) reste nécessaire |

## 4. Ce qui reste à mesurer

| Chiffre | Comment | Quand |
| --- | --- | --- |
| Soins faits à temps (indicateur 2) | journal T-066, ou nouvel export | après l'antiparasitaire du 25 oct. et le vermifuge du 27 |
| Durée réelle d'une séance (indicateur 3) | journal T-066 | dès qu'il est en place |
| Balades perdues sur 30 (critère) | feuille de pointage + nouvel export + journaux iPhone | à la fin de la campagne T-064 |
| Écrans ouverts sans écriture | journal T-066 (`app_open`) ; l'export ne voit que ce qui écrit | après T-066 |

Pour refaire ce rapport : Profil › Compte › « Exporter mes données », et l'export Santé de l'iPhone, déposés sur le
Bureau (hors du projet) ; plus l'iPhone branché et déverrouillé pour les journaux.
