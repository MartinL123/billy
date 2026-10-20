# Flair — contexte du projet (mis à jour le 20 octobre 2026)

Document de référence pour Claude (chat, Claude Code, Claude Design). À lire avant toute proposition ou tout code.
En cas de divergence : la spec en cours (`docs/specs/spec-v4-simplification.md`, puis `spec-v3-simplification.md`) fait foi,
puis ce document, puis le reste.

## 1. Le produit

- **Flair** est le nom de l'app ; **Billy** est le chien de Martin (croisé épagneul breton × labrador, né le 13 mai 2026).
  Le compte de test s'appelle « Oslo » (chiot de 3 mois).
- Promesse : « Toute la vie de votre chien au même endroit, et chaque jour un petit pas pensé pour lui. »
- Ce que fait l'app : mission d'éducation de 3 minutes par jour, balades qui lèvent un brouillard sur la carte, santé
  (vaccins, soins, pesées, documents), souvenirs, et un petit jeu (os à gagner et dépenser, boutique, meute d'amis).
- **Décision du 19 octobre : on conçoit Flair comme un produit pour des inconnus** (futur freemium, voir
  `docs/recherche/etude-ux-business-plan.md`), plus seulement pour Martin et ses amis. Aujourd'hui l'app reste limitée à
  quelques comptes créés par Martin.
- Deux cibles, un seul code : la PWA (GitHub Pages) et l'app iOS (Capacitor, compte Apple gratuit, installée via Xcode).
- Ouvert aux fonctions iPhone natives (Live Activity, widgets, Apple Watch, notifications) si elles valent leur coût.

## 2. Pour qui (testez chaque écran avec eux)

| Persona | Qui | Le test |
| --- | --- | --- |
| Martin | UX designer, maître impliqué, Apple Watch | Tout noter sans effort |
| Josiane | 64 ans, peu à l'aise, texte agrandi | Comprend l'écran en 5 secondes |
| Léo | 24 ans, joueur | Sent la progression et la récompense |
| Les Moreau | Enfants de 9 et 12 ans | Lancent une mission en 30 secondes |

## 3. Règles non négociables

- 390 × 844 d'abord, lisible à 320 × 568 et en texte agrandi.
- **Une seule action principale par écran**, visible sans défiler, dans la moitié basse ; un seul bouton plein orange `#BF5519`.
- Tout ajout en 2 touchers depuis l'accueil ; zones tactiles ≥ 44 px ; contrastes WCAG AA ; champs en 16 px minimum.
- Français simple, vouvoiement ; dates « 13 mai 2026 » ; heures « 19 h » (jamais « 07:00 PM ») ;
  **espace insécable avant « ? ! : ; »** et dans « 25 min ».
- Rien ne baisse après un mauvais jour ; jamais de rouge pour un jour sans balade ; le rouge est réservé à un vrai retard
  ou à une suppression.
- Jamais d'écran vide : une phrase et le bouton qui remplit.
- Mouvement : 150 ms au toucher, 250 ms transition, 400 ms apparition ; `cubic-bezier(.2,.8,.3,1)` et ressort
  `cubic-bezier(.3,1.3,.5,1)` ; seulement `transform` et `opacity` ; tout coupé avec « Réduire les animations ».
- Notifications : jamais culpabilisantes (pas de « Vous n'avez pas… »).

## 4. Où vivent les choses

| Quoi | Où |
| --- | --- |
| Code, specs, style guide, maquettes, audits | Dépôt GitHub `martinl123/billy` = dossier `~/Desktop/Billy` du Mac |
| Captures de l'app et guide Claude Design | `docs/design/` (captures du 19/10, `guide-claude-design.md`, ce document) |
| App en ligne | https://martinl123.github.io/billy/ |
| Tickets | Kanban Notion « My professional life », filtre Projet = Billy (https://app.notion.com/p/Kanban-3a5fb2fe22de80148c4fc02c248000af) |
| Journal des audits | Notion « Billy — Journal des audits UX » (https://app.notion.com/p/Billy-Journal-des-audits-UX-3fdfb2fe22de8020beb5e944b63ef8fd) |
| Design system « Flair » | Artifact Claude (type Design System) : couleurs, typos, formes, mouvement, 10 composants |
| Toile « Flair — propositions » | Artifact Claude (type Design) : https://claude.ai/code/artifact/c16b477b-e33a-44de-87dc-1c7349ba5f5d |

## 5. La toile « Flair — propositions » (19 octobre)

5 pages. Chaque proposition est un écran cliquable avec une note « ce qui change ».

1. **Propositions** : diagnostic des 22 écrans (note grise à gauche) ; Accueil, Carte (A et B), Balade en cours,
   Santé (A et B), Billy, et la piste « l'accueil suit la journée ».
2. **Parcours complet** : bienvenue, « Votre chien » en 4 étapes, mission pas à pas, noter un souvenir, boutique.
3. **États** : premier jour, hors ligne, 320 px texte agrandi, GPS faible, soin en retard.
4. **iPhone natif** : balade sur l'écran verrouillé (Live Activity), widgets, notifications, Apple Watch.
5. **Jeu et rétention** : récap du dimanche, « Il y a un mois », carte postale de balade.

Retours de Martin déjà intégrés :
- Piste « accueil selon le moment » : gardée, mais **avec le design de l'Accueil · Proposition** (seule la carte du haut change).
- Carte : les pattes de progression ne se comprenaient pas → **« 4 % découvert » en grand + barre**.
- Noter un souvenir : « ? » qui passait à la ligne et pastilles de date sur deux lignes → corrigé (espace insécable, grille de 3).

## 6. Décisions et points ouverts

Décisions (les plus récentes en haut) :
- 20/10 (refonte V5, tickets T-049 à T-054, prompt `docs/design/prompt-claude-code-2026-10-20.md`) : Santé version B (calendrier replié sur la semaine) ; Balades version A (un bouton « Affichage », plan par défaut, brouillard sombre, « 4 % découvert ») ; compétences en pattes + prochaine étape, **jamais « 3 sur 5 »** ; carte de l'accueil qui suit le moment de la journée ; Boutique, Meute, profil, souvenir et carte déplacés hors de l'accueil ; +3 os par balade terminée (comme un moment) ; ouverture seule après 1 s. Les 5 écrans en un seul lot. Maquettes : `docs/maquettes/V5-*.dc.html`.
- 19/10 : produit pour des inconnus (personas), fonctions natives si elles valent leur coût.
- 19/10 : progression de la carte affichée en pourcentage, pas en pattes.
- 19/10 : « J'ai fait cette sortie » (sortie sans tracé) pour ceux sans Watch ni Strava.
- 18/10 : nom « Flair » ; app iOS Capacitor + compte Apple gratuit ; Watch lue via HealthKit ; GPS écran verrouillé.
- 17/10 (V4) : 3 onglets (Balades · Aujourd'hui · Santé), Billy s'ouvre par sa photo, un seul système de récompense (os).

À trancher par Martin :
- Rien pour l'instant (tranché le 20/10).

## 7. Bugs relevés le 19 octobre (captures)

- Heures au format 12 h américain dans le profil (« 07:00 PM »).
- Date au format américain dans « Nouvel événement » (« 10/19/2026 »).
- Profil : « Femelle — » (le libellé affiche la valeur, il faut « Sexe : Femelle »).
- Mission : « Il vous faut : friandises (test) » visible.
- Billy : « Voir tout son chemin » caché sous le rond Accueil de la barre d'onglets.
- Espaces insécables manquantes avant « ? » (le « ? » peut passer seul à la ligne).

## 8. iPhone natif : plan proposé

Ordre conseillé (du plus rentable au plus cher) :

1. **Notifications locales** (`@capacitor/local-notifications`) : planifiées par l'app à chaque ouverture, sans serveur,
   donc compatibles avec le compte gratuit. 3 types : soin à venir (veille, 18 h), sortie prévue (15 min avant,
   désactivable), récap du dimanche (18 h). Limite iOS : 64 notifications en attente, on replanifie à chaque ouverture.
2. **Balade en direct sur l'écran verrouillé (Live Activity)** : extension Widget en Swift (ActivityKit). L'app la
   démarre au « Partir en balade » et la met à jour depuis le suivi GPS déjà en place (`FlairNativePlugin.swift`,
   mode arrière-plan « location ») : pas de serveur ni de push. Bouton « Terminer » via App Intents (iOS 17).
3. **Widgets** (WidgetKit) : l'app écrit un petit résumé (prochaine sortie, journée, santé) dans un espace partagé
   (groupe d'apps) et demande au widget de se rafraîchir. **À vérifier d'abord** : le groupe d'apps avec le compte gratuit
   (test de 30 minutes dans Xcode avant de coder).
4. **App Apple Watch** (watchOS, SwiftUI) : un écran « Partir avec Oslo », chrono + km, fin de balade. Elle enregistre
   une séance « marche » avec son tracé dans Santé (HealthKit) : l'iPhone la récupère déjà via `WatchSync`, donc pas de
   synchronisation à écrire. La plus chère : après la bêta.

Contraintes du compte gratuit : l'app (et ses extensions) expire au bout de 7 jours et se relance depuis Xcode ;
pas de notifications push distantes.

## 9. Texte proposé pour les instructions du projet Claude « Billy »

> Flair est l'app iPhone (et web) que Martin, UX designer, conçoit pour la vie de son chien Billy (croisé épagneul breton ×
> labrador, né le 13 mai 2026). Depuis le 19 octobre 2026, on la conçoit comme un produit pour des inconnus (personas
> Martin, Josiane, Léo, les Moreau ; futur freemium). Avant toute proposition, lire `claude/contexte-flair.md` (règles,
> personas, décisions, où vivent les choses). Code et docs : dépôt `martinl123/billy` = `~/Desktop/Billy`. Tickets :
> kanban Notion « My professional life », Projet = Billy, à tenir à jour. Design : design system « Flair » et toile
> « Flair — propositions ». Prendre le plus de décisions possible, poser les vraies questions en QCM, montrer les
> maquettes avant de coder.
