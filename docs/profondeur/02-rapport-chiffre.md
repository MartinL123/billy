# Rapport chiffré

État au 21 octobre 2026. **Les chiffres d'usage réel (balades captées, écrans ouverts) ne sont pas encore
calculés** : il manque tes données. Ce qui suit est ce qui est mesurable sans elles, puis la liste exacte de ce
qu'il faut exporter.

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

## 4. Ce qui reste à calculer, et ce qu'il me faut

| Chiffre | Calcul | Donnée nécessaire |
| --- | --- | --- |
| **% des balades réelles captées par Flair** | balades Flair ÷ marches Watch (≥ 10 min), jour par jour, depuis la première balade | Firestore (`entries` avec tracé, `walks`) + entraînements Marche de la Watch |
| Balades perdues ou effacées | balade Watch sans balade Flair alors qu'une balade iPhone a démarré | les deux, + journaux iPhone |
| Ce que tu utilises vraiment | dernière écriture par fonction (souvenirs, pesées, soins cochés, séances, achats, spots) | Firestore (horodatages) |
| Santé tenue à jour | soins faits à temps ÷ soins arrivés à échéance | Firestore (`events`) |
| Entraînement réel | jours avec séance ÷ jours ; durée des séances | Firestore (`dailyQuest`, `xpLog`, `entries` de type moment) |
| Crashs | nombre et cause des crashs de Flair | journaux iPhone : **fait** (section 3) |

### Ce qu'il faut exporter

1. **Tes données Firestore.** Je n'ai pas pu les lire : la lecture avec les identifiants du CLI Firebase a été
   refusée par les garde-fous de permissions. Deux options, à toi de choisir :
   - **(a) recommandé** : j'ajoute dans Profil › Compte un bouton « Exporter mes données » (lecture seule) qui
     enregistre un fichier JSON dans Fichiers, sans coordonnées GPS, sans photos ni textes. Tu me le déposes sur le
     Mac **hors du dossier du projet** (le repo est public) ;
   - **(b)** tu ajoutes une règle de permission qui m'autorise à lire Firestore avec le CLI Firebase.
2. **Tes marches de la Watch** : sur l'iPhone, app Santé › ta photo en haut à droite › « Exporter toutes les
   données de santé » → `export.zip`, envoyé par AirDrop sur le Mac (Bureau, hors du projet). J'en lis seulement les
   entraînements « Marche » (date, heure, durée, distance).
3. **Les crashs de l'iPhone** : fait le 21 octobre (section 3). À refaire après la campagne de 30 balades.
4. **La console pendant une balade** (facultatif) : Mac › app Console › ton iPhone, filtre « fr.lanrezac.billy »,
   pendant une balade de test ; « Enregistrer » à la fin.
