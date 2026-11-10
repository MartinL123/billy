# Prompt Claude Code — 22 octobre 2026 (soir) : retours de Martin sur la V6

Lis `docs/design/contexte-flair.md`, puis **`docs/specs/spec-v6-1-retours.md` (fait foi)**, puis
`docs/specs/spec-v6-balades-komoot.md` (toujours valable hors des points changés).

Tickets Notion (Projet = Billy) : **T-094 à T-104** (T-105 est la recette avec Martin). **Maquettes validées :
`docs/maquettes/V6-Billy-et-journal.html`** (page Billy et panneau de la carte) : elles font foi, ouvre-les dans un
navigateur (fichier HTML autonome). **Un ticket = un commit**, dans l'ordre ci-dessous. Après chaque commit poussé : ticket en « Révision du
code » + ligne datée dans « Historique ». Ne passe rien en « Done ». Enchaîne sans t'arrêter ; si une décision manque,
prends le plus simple, note-le dans le ticket et continue. Ne commite que tes propres fichiers.

## L'ordre

1. **T-099** « Ne pas la garder » → onglet Balades (§ 6).
2. **T-100** Accueil : sortie faite → fiche de sa balade (§ 6).
3. **T-098** Toucher une balade ouvre sa fiche, partout (§ 5).
4. **T-094** Stats au lieu du pourcentage, « de balade » au lieu de « ensemble » (§ 1).
5. **T-095** Brouillard en option, éteint par défaut (§ 2).
6. **T-096** Filtres Toutes · 24 h · Cette semaine · Ce mois + calque Spots (§ 3).
7. **T-097** Panneau déplié = journal des balades (§ 4).
8. **T-102** La fiche montre tout ce qu'on sait (§ 7) ; complète aussi les balades déjà importées en arrière-plan.
9. **T-103** Souvenirs automatiques, photos de la balade (§ 9) — iOS, `isNative()`.
10. **T-101** Exercice au parc pendant la balade (§ 8) — iOS.
11. **T-104** La page Billy, d'abord ses entraînements (§ 10) : en-tête, semaine, chemins aux étapes nommées
    (champ `short` des 50 étapes), badges, progrès.

Relis chaque écran modifié avec `.claude/skills/apple-design/` avant de pousser. Règles communes de la V6 (rappel dans
`prompt-claude-code-2026-10-22.md`).

## Critères de fin

Ceux de la spec V6.1 § 11 ; `npm test`, TypeScript, Playwright et `npm run build` passent ; déploiement fait ;
`npm run build:ios` passe. Puis arrête-toi et demande à Martin de recetter (T-105).
