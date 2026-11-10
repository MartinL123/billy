# Audits UX de l'app

Un audit après chaque mise à jour (au moins un par jour), lancé quand Martin dit « update ».
Notion, deux endroits seulement :
- **Journal** (un seul tableau, une ligne par audit : verdict, notes, bilan de recette, remarques, prompt) : https://app.notion.com/p/3fdfb2fe22de8020beb5e944b63ef8fd
- **Tickets** R-xxx et T-xxx (statut, recette, historique ; seule source du suivi) : Kanban Notion, Projet = Billy, affiché aussi en bas du journal — https://app.notion.com/p/3a5fb2fe22de80148c4fc02c248000af

Ce dossier garde le détail complet de chaque audit et les prompts Claude Code.

| Date | Audit | Prompt Claude Code | Verdict |
| --- | --- | --- | --- |
| 10 nov. 2026, 12 h | `audit-12-2026-11-10.md` (recette) | `prompt-audit-12.md` | Watch toujours absente (app iOS pas relancée) ; rattrapage par tranches à coder avant Xcode. |
| 23 oct. 2026, 14 h | `audit-10-2026-10-23.md` (une seule carte) | `prompt-audit-10.md` | 4 OK, Revoir à reprendre (panneau qui cache la carte), défilement sur iPhone. R-100, R-101. |
| 23 oct. 2026, 11 h 30 | `audit-09-2026-10-23.md` (V6.1 + retours de Martin) | `prompt-audit-09.md` | 14 OK, 6 partiels repris par R-094 à R-099 ; maquettes « Une seule carte » à valider. |
| 22 oct. 2026, 15 h 45 | `audit-08-2026-10-22.md` (recette V6 « balades façon Komoot ») | `prompt-audit-08.md` | 14 OK sur 18, 0 KO, 4 sur iPhone ; V6 solide, banc de test instable. R-090 à R-093. |
| 21 oct. 2026, 17 h 45 | `audit-07-2026-10-21.md` (recette + « Flair plus profond ») | `prompt-audit-07.md` | 30 OK sur 33, 0 KO, 3 sur iPhone ; visiteur privé, balade blindée. R-082 à R-085. |
| 20 oct. 2026, 17 h | `audit-06-2026-10-20.md` (ciblé + recette + vie privée) | `prompt-audit-06.md` | V5 réussie ; fuite de vie privée du mode visiteur. R-069 à R-076. |
| 19 oct. 2026, 18 h | `audit-05-2026-10-19.md` (ciblé + recette) | `prompt-audit-05.md` | Balade iPhone réparée (vérifiée en prod), 11 corrections OK. R-045 à R-049. |
| 18 oct. 2026, 20 h 40 | Correctif urgent (balade GPS perdue) | `prompt-hotfix-r042.md` (avant le 04) | R-042 confirmé par la balade de Martin : bloquant. |
| 18 oct. 2026, 20 h | `audit-04-2026-10-18.md` (ciblé + recette + revue iOS) | `prompt-audit-04.md` (remplace le 03) | Tableau de bord et ouverture OK ; balade GPS à sécuriser. R-038 à R-043. |
| 18 oct. 2026, 15 h | `audit-03-2026-10-18.md` (ciblé + recette) | `prompt-audit-03.md` (repris dans le 04) | Phase 2 réussie, 28/32 OK. R-033 à R-037. |
| 18 oct. 2026, 11 h | `audit-02-2026-10-18.md` (ciblé + recette) | `prompt-audit-02.md` | 13/18 OK. R-026 à R-032. |
| 18 oct. 2026 | `audit-01-2026-10-18.md` (complet, référence) | `prompt-audit-01.md` | Solide pour Martin, pas encore prêt pour un ami. R-001 à R-025. |
| 17 oct. 2026 | `../recherche/audit-ux-v3.md` | `../archives/prompt-v4-1-simplification.md` | Avant ce dossier. |
| 13 oct. 2026 | `../recherche/audit-ux.md` | — | Avant ce dossier. |

## Méthode

- **Ce qui a changé** : lu dans les derniers commits.
- **Tests qui écrivent des données** : dans un bac à sable (émulateurs Firebase, compte `test@billy.test`), jamais dans la vraie base.
- **Prod** : sur le compte Billy, en lecture seule.
- **Type** : ciblé à chaque mise à jour (écrans touchés + tour rapide de l'app), complet une fois par semaine.
- **Références** : `CLAUDE.md`, `docs/style-guide.html`, la spec en cours.
- **Kanban** : après la recette, déplacer les tickets du kanban Notion (Projet = Billy) : OK → Done, KO → À faire ; y créer les nouvelles R-xxx.
- **Gravité** : bloquant, majeur, mineur, idée. Chaque remarque garde son numéro R-xxx d'un audit à l'autre.

## Grille (notée sur 5)

1. Rien n'est cassé · 2. Clarté et guidage · 3. Cohérence · 4. Logique et parcours · 5. Wording ·
6. Jeu et motivation · 7. Mobile et accessibilité · 8. Performance

## Personas (fixes, testés à chaque audit)

| Persona | Profil et chien | Tâches testées |
| --- | --- | --- |
| Martin | Utilisateur réel, Billy chiot craintif, Strava | Importer une balade, mission du jour, noter un souvenir |
| Josiane | 64 ans, peu à l'aise, Cocotte bichon de 2 ans | Comprendre l'accueil, ajouter un vaccin, retrouver un document |
| Léo | 24 ans, joueur, berger australien | Gagner et dépenser des os, voir l'arbre |
| Les Moreau | Famille avec 2 enfants, labrador d'un an | Lancer une mission en 30 s |
| Karim | Sportif, malinoise adulte éduquée | Importer son archive Strava, trouver un spot, contenu adapté à un adulte |
| Nadia | Amie invitée, compte créé par Martin, Oslo golden de 3 mois | Installer, se connecter, questionnaire, meute |
