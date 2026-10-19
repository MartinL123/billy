# Prompt Claude Code — corrections des audits n°3 et n°4 (18 octobre, 20 h)

Lis `CLAUDE.md`, puis `docs/audits/audit-04-2026-10-18.md`. Tickets dans le Kanban Notion (Projet = Billy), un par
remarque. Un commit clair par point, avec le numéro R-xxx dans le message. **Ne supprime aucune donnée.**
Ce prompt remplace `prompt-audit-03.md` (jamais passé) : il reprend R-033 à R-037 et ajoute les points de l'audit n°4.
À passer **après** `prompt-hotfix-r042.md`.

## A. Reste de l'audit n°3 (validé par Martin)

1. **R-033 Carte sur petit écran** (majeur) : sur un iPhone SE (320 × 568), le panneau du bas s'ouvre en grand et cache
   toute la carte et ses boutons. Sous 700 px de haut, le panneau s'ouvre réduit (titre + une ligne) ; les boutons de la
   carte restent toujours au-dessus du panneau. Vérifie à 320 × 568, 375 × 667 et 390 × 844.
2. **R-034 Ensuite** : un titre de soin long passe à la ligne (2 lignes max) au lieu d'être coupé.
3. **R-035 Os de bienvenue** : +10 os à la fin des 9 premières questions, annoncés sur l'écran « Bienvenue » (« +10 os
   pour bien commencer »). Identifiant fixe pour ne jamais les donner deux fois.
4. **R-036 Ses balades vide** : sans balade, ne pas afficher « 0 balade · 0,0 km » au-dessus de l'état vide.
5. **R-037 RDV véto** : « J'ai pris rendez-vous » préremplit le titre « Rendez-vous véto : [nom du vaccin] ».

## B. Audit n°4

6. **R-038 Le conseil après import contredit l'accueil** (majeur) : à 19 h 30, après une balade de 30 min le matin (chiot
   de 3 mois, 15 min par sortie), le résultat d'import dit « La prochaine sortie : 5 min suffisent » alors que l'accueil
   dit « encore 1 sortie de 15 min ». Cause : `ImportResult.tsx` compte les sorties restantes avec
   `WALK_SLOTS.filter(non faites)`, sorties manquées comprises, alors que l'accueil utilise `upcomingSlots()`
   (`src/lib/walkDay.ts`). Utilise `upcomingSlots()` partout (import, accueil, carte du moment) et ajoute un test qui
   vérifie que les deux écrans donnent la même durée.
7. **R-042 Balade en cours : ne jamais perdre une balade** (majeur, iOS) : dans `LiveWalk.tsx`, `finish()` appelle
   `stopWalk()`, qui efface le fichier natif, puis `importActivities()` sans `try/catch`. Si l'enregistrement échoue,
   la balade est perdue et l'écran reste bloqué sur « Enregistrement… » (boutons désactivés). Correction : n'effacer le
   fichier natif qu'après l'enregistrement réussi (par exemple `stopWalk({ keep: true })` puis `clearWalk()`), et en
   cas d'erreur afficher « La balade n'a pas pu être enregistrée. Réessayer » avec le bouton actif ; elle reste
   reprenable à la prochaine ouverture.
8. **R-043 Balade arrêtée après 3 h** (iOS) : le chrono continue de tourner après l'arrêt automatique (il doit se
   figer à l'heure de l'arrêt) ; et « Reprendre » une balade arrêtée relance un enregistrement qui s'arrête aussitôt,
   puisque `startedAt` a plus de 3 h. Une balade arrêtée ne propose que « Terminer » ou « Ne pas la garder ».
9. **R-040 Accueil d'un compte neuf : actions en double** : « Importer mes balades » apparaît deux fois (Ses sorties du
   jour et la tuile Ses balades), « Noter le premier » et « + Noter un souvenir » aussi. Garder le bouton dans « Ses
   sorties du jour » et, dans la tuile Ses balades vide, seulement le texte (la tuile entière est déjà un lien) ;
   masquer « + Noter un souvenir » tant que la tuile Ses souvenirs propose « Noter le premier ».
10. **R-039 Tuile Sa santé** : la ligne du prochain soin (« Vaccin le 10 juil. 2027 ») est en orange gras, comme une
    alerte, juste sous la ligne rouge du soin en retard. La ligne de détail d'une tuile reste en gris foncé (#3F4946),
    pas en gras ; seul le soin en retard est en rouge. Même règle pour les 4 tuiles (plus de vert, bleu, orange, marron
    différents dans les détails).
11. **R-044 « J'ai fait cette sortie »** (remplace R-041, maquette validée par Martin le 19/10 : canvas « Flair —
    Accueil et ouverture », artboard « R-044 · Noter une sortie sans tracé ») : dans « Ses sorties du jour », chaque
    sortie non faite (passée ou à venir) affiche un bouton contour « + Je l'ai faite » (plus de « Pas faite »). Il ouvre
    un panneau « Combien de temps ? » : 10, 15, 25, 40 min, 1 h, Autre (saisie en minutes), la durée conseillée
    présélectionnée ; « C'est noté » (seul bouton plein) coche la sortie, donne ses os une fois et compte dans le temps
    du jour ; la ligne affiche « ✓ 25 min · notée, sans tracé ». Sans tracé, le brouillard ne bouge pas (phrase dans le
    panneau). Une balade importée ou de la Watch au même créneau remplace la sortie notée, sans os en double. Le matin
    avant midi, les sorties non faites d'hier restent notables sous un petit titre « Hier ». Web et app ; logique dans
    `src/lib/`, testée.

Vérifie chaque écran à 390 × 844 et 320 × 568. À la fin, dis-moi en 5 lignes ce qui est fait et ce que je dois tester
en premier sur mon iPhone.
