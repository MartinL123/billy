# Prompt Claude Code — le niveau sans XP (13 octobre, 23 h 05)

```
Décision : on n'affiche plus d'XP nulle part. Le niveau mesure ce que le chien sait faire ; l'effort se voit dans le
jeu sans devenir un score. Lis docs/specs/spec-v3-simplification.md § 0 et § 2 (réécrits) puis § 3, § 5.3, § 5.5,
§ 5.7, § 5.9 et § 9. Maquettes mises à jour : V3-Accueil, V3-Billy, V3-Profil, V3-Raconter, V3-RaconterQuete,
V3-QueteExercice, V3-Reussite, V3-CheminEtape, V3-QuestionnaireResultat.
Ne modifie aucun fichier de docs/ sans me le demander. Avant de coder, liste les écrans touchés et attends ma validation.

1. Niveau calculé (jamais stocké) dans src/lib : niveau = 1 + floor(étapes acquises / 2), de 1 à 26 ; les étapes
   « avant l'app » comptent. Titres : N1–3 Chiot curieux · N4–7 Apprenti · N8–12 Explorateur · N13–18 Compagnon ·
   N19–25 Complice · N26 Légende. Tests unitaires (0, 1, 2, 24, 50 étapes ; décocher fait baisser).
2. Barre de niveau : « Encore 1 étape avant le niveau 9 ». Plein écran de passage de niveau inchangé (seulement quand
   ça monte) ; après une correction qui fait baisser le niveau, simple bandeau « Niveau recalculé ».
3. Supprime de l'interface tout chiffre et le mot « XP » : bulles « +15 XP » de la quête et du défi → « ▲ [Compétence] »
   (ce que ça fait avancer) ; gain sur « Enregistrer » → retiré ; « +50 XP » de « C'est réussi ! » → « ▲ [Compétence]
   avance » ; après « Enregistrer », bandeau « Noté ! ».
4. Décocher une étape (questionnaire ou chemin) recalcule le niveau ; un moment « Difficile » ne retire jamais rien.
5. Données : garde le champ `xp` existant des moments (ne rien supprimer), mais ne le lis plus et n'en écris plus.
   lib/xp.ts devient inutile pour l'affichage : retire ses usages dans l'interface, garde ce qui sert au calcul du niveau.
6. Vérifie avec une recherche dans src/ qu'aucun texte visible ne contient « XP ».
```
