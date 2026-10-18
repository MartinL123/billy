# Prompt Claude Code — corrections de l'audit n°3 (18 octobre, 15 h)

Lis `CLAUDE.md`, puis `docs/audits/audit-03-2026-10-18.md`. Tickets dans le Kanban Notion (Projet = Billy), un par remarque.
Un commit clair par point, avec le numéro R-xxx dans le message. **Ne supprime aucune donnée.**

1. **R-033 Carte sur petit écran** (majeur) : sur un iPhone SE (320 × 568), le panneau du bas s'ouvre en grand et cache
   toute la carte, les boutons Plan/Satellite et 2D/3D, « Autour de moi », + et −. Sur un écran de moins de 700 px de
   haut, le panneau s'ouvre réduit (titre + une ligne) ; les boutons de la carte restent toujours au-dessus du panneau.
   Vérifie à 320 × 568, 375 × 667 et 390 × 844.
2. **R-034 Ensuite** : un titre long passe à la ligne (2 lignes max) au lieu d'être coupé (« Antiparasitaire puces et tiq… »).
3. **R-035 Os de bienvenue** : +10 os à la fin des 9 premières questions, annoncés sur l'écran « Bienvenue » (« +10 os pour
   bien commencer »). Les +50 os restent pour le profil complet. Identifiant fixe pour ne jamais les donner deux fois.
4. **R-036 Ses balades vide** : sans aucune balade, ne pas afficher « 0 balade · 0,0 km » au-dessus de l'état vide.
5. **R-037 RDV véto** : « J'ai pris rendez-vous » (vaccin dû) préremplit le titre « Rendez-vous véto : [nom du vaccin] » ;
   seule la date reste à choisir.

À la fin, dis-moi en 5 lignes ce qui est fait et ce que je dois tester en premier sur mon iPhone.
