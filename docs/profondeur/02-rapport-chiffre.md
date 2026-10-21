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

## 3. Ce qui reste à calculer, et ce qu'il me faut

| Chiffre | Calcul | Donnée nécessaire |
| --- | --- | --- |
| **% des balades réelles captées par Flair** | balades Flair ÷ marches Watch (≥ 10 min), jour par jour, depuis la première balade | Firestore (`entries` avec tracé, `walks`) + entraînements Marche de la Watch |
| Balades perdues ou effacées | balade Watch sans balade Flair alors qu'une balade iPhone a démarré | les deux, + journaux iPhone |
| Ce que tu utilises vraiment | dernière écriture par fonction (souvenirs, pesées, soins cochés, séances, achats, spots) | Firestore (horodatages) |
| Santé tenue à jour | soins faits à temps ÷ soins arrivés à échéance | Firestore (`events`) |
| Entraînement réel | jours avec séance ÷ jours ; durée des séances | Firestore (`dailyQuest`, `xpLog`, `entries` de type moment) |
| Crashs | nombre et cause des crashs de Flair (Billy) | journaux iPhone |

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
3. **Les crashs de l'iPhone** : iPhone **déverrouillé** et branché au Mac, dis-le-moi, je les copie (tentative
   faite aujourd'hui : refusée, téléphone verrouillé). Sinon : Réglages › Confidentialité et sécurité › Analyse et
   améliorations › Données d'analyse, les fichiers qui commencent par « App » ou « Billy », à partager.
4. **La console pendant une balade** (facultatif) : Mac › app Console › ton iPhone, filtre « fr.lanrezac.billy »,
   pendant une balade de test ; « Enregistrer » à la fin.
