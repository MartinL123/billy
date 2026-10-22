# Prompt Claude Code — 22 octobre 2026 : les balades façon Komoot (V6)

Lis d'abord `docs/design/contexte-flair.md`, puis **`docs/specs/spec-v6-balades-komoot.md` (fait foi)**, puis l'étude
`docs/recherche/komoot-flair.html` (les écrans dessinés dans la planche « La balade en détail » servent de référence
visuelle ; artifact en ligne : https://claude.ai/code/artifact/7a267bb8-a461-4b74-8586-da489fc5d282).

Tickets Notion (Projet = Billy) : **T-077 à T-092**, plus T-093 (recette avec Martin). **Un ticket = un commit**
(plusieurs si c'est plus clair), dans l'ordre ci-dessous. Après chaque commit poussé : ticket en « Révision du code » +
ligne datée dans « Historique ». Ne passe rien en « Done ».

**Martin a validé les trois lots d'un coup : enchaîne-les sans t'arrêter entre les tickets.** Arrête-toi seulement si
une décision n'est couverte ni par la spec ni par les maquettes et qu'elle ne peut pas être prise en choisissant le plus
simple (dans ce cas, prends le plus simple, note-le dans le ticket et continue). Les tests sur iPhone se font avec
Martin à la fin (T-093) : quand tout est poussé, arrête-toi et demande-lui de lancer la recette.

## Premier commit : la documentation

Avec T-077, ajoute au dépôt : la spec (déjà dans `docs/specs/`), ce prompt, l'étude (déjà dans `docs/recherche/`) ;
mets à jour `docs/README.md` (la V6 fait foi pour les balades et le style) et `CLAUDE.md` (liste « Lire avant toute
nouvelle fonctionnalité » : ajouter la spec V6 en tête) ; note dans `docs/specs/carte-a-decouvrir.md` § 6 et
`docs/specs/communaute.md` § 1 et § 6 que la V6 remplace la règle sur le rythme cardiaque et sur la position en direct.

## L'ordre

Lot de rendu
1. **T-077 🎨 Rendu façon Komoot** (spec § 1) : style guide, `src/index.css`, composant `Stats`, retour en chevron
   (`components/BackLink.tsx`), actions secondaires en texte, graisses. Passe sur **tous** les écrans existants.
   Relis avec le skill `.claude/skills/apple-design/` avant de pousser.

Lot 1 — La balade en détail
2. **T-078 ⏱️ Trajet daté** (§ 2.1) : `route.track` pour les trois sources (GPS de Flair, Watch, GPX). Types, lecture
   tolérante des anciennes balades, tests de taille (< 900 Ko pour 3 h).
3. **T-079 🛑 Arrêts et allure** (§ 3) : `src/lib/walkStory.ts` + tests ; rue des arrêts (Nominatim, file d'attente
   d'une requête par seconde) ; calcul à l'import et pour les balades déjà là qui ont des points datés.
4. **T-080 ❤️ Cœur, pas, dénivelé, météo** (§ 2.2) : `FlairNativePlugin.swift` (nouvelles lectures et autorisations,
   textes Info.plist), GPX (`gpxtpx:hr` gardé par minute), Open-Meteo.
5. **T-081 🗺️ Fiche de balade** (§ 6.1) : remplace le détail actuel ; « Tous les chiffres » replié.
6. **T-082 📜 Frise « Ce qui s'est passé »** (§ 6.2) : tuiles « Que s'est-il passé ici ? », repère « Reniflage »,
   mode « Raconter la balade » pas à pas, +3 os une fois par balade.
7. **T-083 🎉 Récap « Belle balade ! »** (§ 6.3) pour le GPS de Flair et les balades de la Watch.

Lot 2 — Rien à ouvrir (iOS, tout protégé par `isNative()`)
8. **T-084 ⌚ Réveil par Santé + notification** (§ 4). Entitlement background delivery, `AppDelegate`, lien profond
   `#/balade/arrivee`. Le réveil réel sera testé avec Martin.
9. **T-085 🚶 Mouvements et forme** (§ 5) : carte « C'était une sortie avec [prénom] ? ».
10. **T-086 📍 Live Activity de la balade** (`contexte-flair.md` § 8 point 2) : durée, distance, rues découvertes ;
    bouton « Repère » (App Intents, iOS 17) qui pose un repère « à raconter » au point actuel ; et « Balade finie ? »
    (notification locale si immobile 10 min à moins de 50 m du départ). Si une extension Widget est impossible avec le
    compte gratuit, garde seulement la notification « Balade finie ? » et note-le dans le ticket.
11. **T-087 👀 Partage en direct** (§ 7) : `live/{jeton}`, règles Firestore + tests des règles, page `#/suivre/:jeton`,
    bandeau, « Mes proches » dans le profil.

Lot 3 — Découvrir
12. **T-088 📌 Spots façon Highlight** (§ 8.1).
13. **T-089 🔁 Boucles pour Billy** (§ 8.2, version simple).
14. **T-090 ✂️ Recadrer le début et la fin** (§ 8.3).
15. **T-091 💌 Carte postale de balade** (§ 8.4).
16. **T-092 📊 Ses balades : le bilan** (§ 8.5).

## Règles communes (rappel)

390 × 844 d'abord, lisible à 320 × 568 et en texte agrandi ; une seule action principale (bouton plein orange) par
écran, visible sans défiler, dans la moitié basse ; zones ≥ 44 px ; WCAG AA ; espace insécable avant « ? ! : ; » et
dans « 25 min » ; dates « 22 octobre 2026 », heures « 8 h 12 ». Mouvement : 150 / 250 / 400 ms,
`cubic-bezier(.2,.8,.3,1)` et ressort `cubic-bezier(.3,1.3,.5,1)` ; seulement `transform` et `opacity` ; tout coupé avec
« Réduire les animations ». Logique dans `src/lib/` avec tests ; composants petits ; tout champ nouveau optionnel en
lecture ; 0 € (Spark). Code natif protégé par `isNative()`.

## Critères de fin

Ceux de la spec V6 § 10, plus : `npm test`, la vérification TypeScript, les tests Playwright et `npm run build`
passent ; déploiement fait ; `npm run build:ios` passe ; les tickets T-077 à T-092 sont en « Révision du code » avec
leur historique. Puis arrête-toi et demande à Martin de lancer la recette sur l'iPhone (T-093).
