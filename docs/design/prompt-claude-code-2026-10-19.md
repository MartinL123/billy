# Prompt Claude Code — 19 octobre 2026 : contexte Flair, bugs R-050 à R-055, notifications locales

Lis d'abord `docs/design/contexte-flair.md` (nouveau document de référence), puis le Kanban Notion
(Projet = Billy) : les tickets R-050 à R-055 et T-041 à T-047 viennent d'y être créés.
Travaille dans l'ordre ci-dessous, **une étape = un commit clair**, et arrête-toi à la fin de chaque partie pour que
Martin valide. Mets les tickets à jour au fil de l'eau (commit poussé → « Révision du code », avec une ligne datée
dans « Historique »). Ne passe rien en « Done » qui doit être vérifié sur l'iPhone.

## Partie 1 — Documentation (sans code)

1. `CLAUDE.md` :
   - remplace « Utilisateur unique (moi) » par : produit conçu pour des inconnus (personas Martin, Josiane, Léo, les
     Moreau ; voir `docs/design/contexte-flair.md`), comptes encore limités et créés par Martin ;
   - ajoute `docs/design/contexte-flair.md` en tête de la liste « Lire avant toute nouvelle fonctionnalité » ;
   - dans « Principes UX », ajoute : heures au format « 19 h » (jamais 12 h AM/PM) et espace insécable avant « ? ! : ; ».
2. `docs/README.md` : ajoute `docs/design/` (captures, guide Claude Design, contexte Flair).
3. Commite les documents non suivis : `docs/design/`, `docs/audits/audit-04-*`, `audit-05-*`, `prompt-audit-04.md`,
   `prompt-audit-05.md`, `prompt-hotfix-r042.md`, `docs/recherche/etude-ux-business-plan.*`. Ne commite pas
   `SUIVI.html` ni `.claude/launch.json` sans demander.

## Partie 2 — Bugs relevés sur les captures du 19/10 (un commit par ticket, avec test quand c'est de la logique)

- **R-050** Profil › Sorties : les heures s'affichent « 07:00 PM ». Afficher « 19 h » (ou « 19 h 30 »), à la française,
  y compris dans les champs d'heure (forcer la locale `fr-FR` ou un sélecteur maison si `<input type="time">` suit la
  langue de l'appareil).
- **R-051** Nouvel événement : la date s'affiche « 10/19/2026 ». Afficher « 19 octobre 2026 » (même remarque pour
  `<input type="date">`).
- **R-052** Profil › Son identité : la ligne affiche « Femelle — ». Le libellé doit être « Sexe » et la valeur
  « Femelle » ; vérifier les autres lignes de la carte.
- **R-053** Mission : la pastille « Il vous faut : friandises (test) » affiche un texte de test. Corriger la donnée
  (`src/content/`) et chercher d'autres « (test) » visibles.
- **R-054** Billy : le bouton « Voir tout son chemin » passe sous le rond Accueil de la barre d'onglets. Ajouter en bas
  des écrans à barre d'onglets une marge égale à la hauteur de la barre + le dépassement du rond + `env(safe-area-inset-bottom)`.
- **R-055** Partout : espace insécable (U+00A0) avant « ? ! : ; » dans les textes de l'interface, pour qu'un « ? » ne
  passe jamais seul à la ligne. Le faire dans les chaînes (pas par une transformation à l'affichage) ; ajouter un test
  qui parcourt les textes de `src/` et signale « [mot] ? » sans espace insécable.

Arrête-toi ici : build, tests, déploiement, puis demande à Martin de recetter sur l'iPhone.

## Partie 3 — T-042 Notifications locales (app iOS seulement)

Référence visuelle : toile « Flair — propositions », page « 4 · iPhone natif », artboard « Notifications utiles ».

- Ajouter `@capacitor/local-notifications` ; tout le code derrière `isNative()` (`src/native.ts`). Rien ne change sur le web.
- Trois types, tous désactivables dans Profil › Réglages (un interrupteur par type, activés par défaut sauf « sortie prévue ») :
  1. **Soin à venir** : la veille à 18 h, pour chaque soin ou RDV du calendrier (« Vermifuge demain »).
  2. **Sortie prévue** : 15 min avant chaque sortie du profil, seulement si elle n'est pas déjà notée.
  3. **Récap du dimanche** : dimanche 18 h, « La semaine d'Oslo » (le récap lui-même est un autre ticket).
- Replanifier à chaque ouverture de l'app et après chaque modification du calendrier ou des horaires (limite iOS :
  64 notifications en attente : planifier les 14 prochains jours au plus).
- Demander l'autorisation au bon moment (après le premier soin ajouté ou dans les réglages), jamais au lancement.
- Textes : courts, vouvoiement, jamais culpabilisants (pas de « Vous n'avez pas… »), prénom du chien.
- Logique de planification dans `src/lib/` avec des tests ; un commit.

Arrête-toi ici et demande à Martin de tester sur l'iPhone (il faudra relancer depuis Xcode).

## Ce qui ne se fait pas maintenant

T-043 (balade sur l'écran verrouillé), T-044 (widgets) et T-045 (app Apple Watch) restent en Backlog : ne pas coder.
Pour T-044, le premier pas sera un test de 30 minutes dans Xcode : vérifier qu'un groupe d'apps se signe avec le compte
gratuit.
