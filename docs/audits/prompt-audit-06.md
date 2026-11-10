# Prompt Claude Code — corrections de l'audit n°6 (20 octobre, 17 h)

Lis `CLAUDE.md` et `docs/audits/audit-06-2026-10-20.md`. Tickets dans le Kanban Notion (Projet = Billy).
Un commit par point, numéro R-xxx dans le message. **Ne supprime aucune donnée.** Commence par 1 et 2 (vie privée).

1. **R-069 Mode visiteur : les fichiers des documents sont lisibles** (bloquant) : `firestore.rules` cache
   `users/{uid}/documents` au spectateur, mais les images et PDF des documents sont dans `users/{uid}/files` (et
   `files/{id}/chunks`), qu'un spectateur lit et liste (vérifié : le proche lit les 2 fichiers d'une ordonnance).
   `push` aussi est lisible. Correction : chaque fichier porte qui l'utilise (`kind: 'document' | 'photo'`, migration
   des fichiers existants depuis `documents.fileIds` et `photoThumbFileId`) ; la règle refuse au spectateur les
   fichiers `kind == 'document'` (les `chunks` vérifient le fichier parent avec `get()`) et toute la collection `push`.
   Les listes côté visiteur ne demandent que les photos (`where('kind', '==', 'photo')`). Corrige `tests/rules.test.ts`
   (aujourd'hui il affirme qu'un visiteur lit `files/f1`) et ajoute : visiteur refusé sur un fichier de document, sur
   ses chunks, sur `push` ; autorisé sur une photo de souvenir.
2. **R-070 Invitations** (majeur) : une invitation est supprimée quand elle est acceptée (usage unique) et expire
   au bout de 7 jours (`expiresAt`, vérifié dans la règle de création d'un spectateur) ; « Retirer » supprime aussi
   les invitations en cours de ce compte. Le message « Il faudra une nouvelle invitation pour le revoir » devient vrai.
   Tests de règles.
3. **R-073 Visiteur** : en lecture seule, aucune action d'ajout (« Noter le premier », « + Noter », « Ajouter… ») ;
   passe en revue les écrans avec `useReadOnly()`.
4. **R-071 Santé, une seule action principale** : quand un soin est à faire (« C'est fait » plein), « + Ajouter un
   soin ou un RDV » passe en contour vert ; sinon il reste plein.
5. **R-072 Balades à 320 × 568** : « Ajouter mes balades » (et tout bouton collé en bas) reste entièrement au-dessus
   de la barre d'onglets et de son rond Accueil. Vérifie à 320 × 568, 375 × 667, 390 × 844.
6. **R-074 Santé « À venir »** : un seul événement le jour du premier anniversaire (pas « Oslo a 1 an » et
   « Anniversaire d'Oslo ») ; l'année en entier (« 2027 ») quand ce n'est pas l'année en cours.
7. **R-075** : « … puis importez le PDF ici » (vouvoiement) ; cherche les autres mélanges tu/vous dans `src/`.
8. **R-076** : la carte du moment de l'accueil ne coupe jamais son texte (pas de points de suspension), à 320 px et
   en texte agrandi.

À la fin, dis-moi en 5 lignes ce qui est fait et ce que je dois tester sur mon iPhone.
