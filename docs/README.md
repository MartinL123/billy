# Documentation de l'app Billy

**Commencer ici.** La spec en cours est `specs/spec-v3-simplification.md` : elle fait foi en cas de divergence.

## Organisation

```
docs/
  README.md                       ← ce fichier
  specs/
    spec-v3-simplification.md     ← EN COURS · refonte « Billy, le jeu »
    questionnaire-depart.md       ← EN COURS · questionnaire de départ, question par question
    arbre-competences.md          ← EN COURS · l'arbre complet : 3 étages, 10 compétences, 50 étapes
    spec-v1.md                    ← socle : santé, calendrier, journal, documents, connexion
    spec-v2-dressage.md           ← logique interne du dressage (catalogue, paliers, XP), interface remplacée par la V3
  maquettes/
    README.md                     ← tokens visuels + liste des maquettes
    V3-*.dc.html                  ← écrans de la refonte (font foi)
    *.dc.html                     ← écrans V1 (santé, journal, documents…)
  recherche/
    audit-ux.md                   ← audit de l'app + 4 personas
    recherche-dressage.md         ← Esprit Dog, éducateurs, exercices, sources
  setup/
    setup-firebase.md             ← mise en place Firebase (plan gratuit)
  archives/
    propositions.md               ← premières idées (13 oct.)
    prompts-v1.md                 ← prompts de la V1 (terminée)
    prompt-v3.md                  ← prompt de la refonte V3
    prompt-v3-2.md                ← prompt des corrections V3 + gamification (13 oct. soir)
    prompt-v3-3.md                ← prompt arbre de compétences, profil, « Noter » (13 oct. nuit)
    prompt-v3-4.md                ← prompt questionnaire modifiable, filtre Santé, étapes du chemin, quête → exercice (13 oct., 22 h 50)
    prompt-v3-5-comptes.md        ← prompt création de comptes pour les testeurs
    prompt-v3-6-rappel-21h.md     ← prompt notification du soir à 21 h
    prompt-v3-7-niveau-sans-xp.md ← prompt le niveau sans XP (13 oct., 23 h 05)
    prompt-v3-8-finitions.md      ← prompt finitions après revue de l'app (13 oct., 23 h 45) — LE PLUS RÉCENT
```

## Quelle spec pour quoi

| Sujet | Spec |
|---|---|
| Écran d'ouverture, questionnaire de départ | V3 § 4 et § 5.1 + `questionnaire-depart.md` |
| Quête du jour, défi de la semaine | V3 § 5.3 et § 5.9 |
| L'arbre de Billy (étages, badges, chemin) | V3 § 5.4 et § 5.5 + `arbre-competences.md` |
| Accueil, navigation à 4 onglets | V3 § 5.2 et § 5.3 |
| Noter un moment, niveau (sans XP) | V3 § 2 et § 3 |
| Ce qu'il sait faire (onglet Billy), compétences | V3 § 5.4 et § 5.5, catalogue V2 |
| Compétences en cours, programme de la semaine | V3 § 5.4 + `arbre-competences.md` |
| Profil de Billy (toucher sa photo) | V3 § 5.4 point 5 |
| Santé, calendrier, poids, documents | V1 (+ filtre « À venir » : V3 § 5.10) |
| Règles d'interface (boutons, vocabulaire) | V3 § 1 et § 6 |

Maquettes en ligne : https://claude.ai/artifact/GogZ3ooQc324nEY46DsGZw
