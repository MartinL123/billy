> Archive au 18/10. Depuis, la recette de chaque livraison est notée dans son ticket du Kanban Notion (Projet = Billy) et résumée dans la colonne « Recette des livraisons » du journal.

# Cahier de recette

Liste permanente : chaque livraison garde son statut, mis à jour à chaque audit jusqu'à « Fonctionnel et terminé ».
Statuts possibles : Fonctionnel et terminé · Partiel · KO · À vérifier sur iPhone · En attente de validation.

## Recette du 18 octobre 2026 (audit n°2, commits 7c57f5b à aa9e6a2)

Bilan du 18/10 : 13 livraisons fonctionnelles et terminées, 3 partielles, 1 KO, 1 en attente de ta validation.

| Livraison | Remarque | Ce qui devait marcher | Recette du 18/10 | Statut |
| --- | --- | --- | --- | --- |
| 7c57f5b | R-001 | Valider un soin en retard | 1 toucher suffit ; prochain le 18 nov. ; historique daté du jour | Fonctionnel et terminé |
| 63c6dc3 | R-002 | « En retard de X jours » partout | Accueil, Ensuite, lignes de Santé | Fonctionnel et terminé |
| d86900b | R-004 | Nom du chien au lieu de « Billy » | « Oslo a un nouveau bout de territoire » | Fonctionnel et terminé |
| 87acf3c, d6a9371 | R-006 | Accord au féminin | Profil, Billy, mission OK ; questionnaire incomplet et une régression (R-026, R-027) | Partiel |
| 39be7dd | R-007 | Élision « d’Oslo » | Arbre, anniversaire OK ; reste « Une photo de Oslo ? » (R-028) | Partiel |
| 91ab0cf | R-011 | Pas de repos les 3 premiers jours | Compte neuf un dimanche : vraie mission ; carte repos vue dans le code (« Garder le repos ») | Fonctionnel et terminé |
| 0b8a110 | R-012 | « Tout est fait » seulement si tout est fait | Après la mission, l'accueil propose la sortie de 13 h | Fonctionnel et terminé |
| 94c17d5 | R-014 | Boutique sans « Stickers du Carnet » | Catégorie absente | Fonctionnel et terminé |
| 5197ca8 | R-015 | Indicateur de chargement de la carte | « Chargement de la carte… » visible en prod ; lenteur restante en R-032 | Fonctionnel et terminé |
| 956b6c7 | R-016 | Brouillard sans bord visible | Prod, mode Satellite : pas de brouillard hors du rectangle ; mode Plan : fine ligne de couture | KO |
| 20bc4e4 | R-017, R-018, R-022 | Pluriels, km et %, apostrophes | « voir la balade », « 3 % découvert », apostrophes ’ | Fonctionnel et terminé |
| 9b40f69 | R-019 | Retour toujours en haut | Les 40 questions | Fonctionnel et terminé |
| 768a3c5 | R-020 | Contraste du orange | axe : 0 erreur sur l'accueil et la mission ; hors-mois du calendrier à 3,2:1 comme demandé | Fonctionnel et terminé |
| 78bf040 | R-021 | Le chien n'est pas l'app | « la prochaine mission s’adapte » ; une phrase reste (R-031) | Partiel |
| 326cdeb | R-025 | Nom du créneau de sortie | Prod : « La sortie de 14 h 30 » | Fonctionnel et terminé |
| a3bf6dd | Nouveauté | Vaccin dû → véto ; « Plus de produit ? Appeler le véto » | Carte vaccin, lien vers le numéro du véto, RDV ; remarque R-029 | Fonctionnel et terminé |
| a3bf6dd | Nouveauté | Santé › Repas affiche son titre si vide | Titre présent | Fonctionnel et terminé |
| aa9e6a2 | R-003, 005, 008, 009, 010, 013, 023, 024 | Maquettes de la phase 2 | À valider par Martin avant le code | En attente de validation |

## Recette du 18 octobre 2026, 15 h (audit n°3, commits 83962d3 à 3950c2e)

Bilan : 28 livraisons fonctionnelles et terminées, 4 à vérifier sur l'iPhone, 2 partielles. Détail par ticket dans le Kanban Notion.

| Livraison | Remarque | Ce qui devait marcher | Recette du 18/10, 15 h | Statut |
| --- | --- | --- | --- | --- |
| 83962d3 → 3950c2e | R-003, 005, 008, 009, 010, 013, 023, 024 · T-009, T-010 | Phase 2 de l'audit n°1 | Accueil, Santé, balades vides, pattes, Flair, un seul encadré | Fonctionnel et terminé |
| 9494348 → 4ae9a11, 67356aa | R-027, 028, 029, 030, 031 | Corrections de l'audit n°2 | Masculin assumé, « d’Oslo », « C’est déjà fait », sortie sans doublon | Fonctionnel et terminé |
| e676530, 9ffbcf8, 3950c2e | R-032 · T-007, T-018, T-029 | Carte rapide, couleurs, « À découvrir » | Prod : carte en ~4 s, 3 lieux listés, + et − | Fonctionnel et terminé |
| 1424925, eead624, 36861f4 | T-011, T-012, T-022 | Bienvenue, questionnaire en deux temps | 9 questions, « Bienvenue, Oslo ! », +15 os par partie | Fonctionnel et terminé |
| 0dda6f0 | T-019 | Règle des 5 min par mois d'âge | 15 min à 3 mois, 5 min après une grosse balade | Fonctionnel et terminé |
| cc97e83, 2ba5d80, c3967f1, cbcd847, e7fb7b4, 025b8bb | T-014, T-017, T-024, T-026, T-027, T-028 | Brouillard, ouverture, retour, pesée, ménage, phrase | Vérifiés ; 317 tests passent | Fonctionnel et terminé |
| 72c4571 | T-013 | Pesée du mois | Tests OK ; visible pour Billy après le 21/10 | À vérifier sur iPhone |
| 4256941, e088c39, bccd21f | T-020, T-023, T-025 | Lieu, ouverture après mise à jour, cache | Demandent la vraie position ou un vrai déploiement | À vérifier sur iPhone |
| a159a60, 159647f | T-021 | Cadrage sur petit écran | Panneau qui cache tout sur iPhone SE (R-033) | Partiel |
| 956b6c7 | R-016 | Brouillard sans bord | Couvre toute la carte ; fine ligne de couture (fermé par Martin) | Partiel |
