# Documentation de l'app Billy

**Commencer ici.** La spec en cours est `specs/spec-v3-simplification.md` : elle fait foi en cas de divergence.

## Organisation

```
docs/
  README.md                       ← ce fichier
  style-guide.html                ← STYLE GUIDE : couleurs, typo, composants, éléments de jeu, écriture
  specs/
    spec-v3-simplification.md     ← EN COURS · refonte « Billy, le jeu »
    questionnaire-depart.md       ← EN COURS · questionnaire de départ, question par question
    arbre-competences.md          ← EN COURS · l'arbre complet : 3 étages, 10 compétences, 50 étapes
    trajets.md                    ← À VENIR · trajets de balade tracés après coup, moments sur le trajet
    communaute.md                 ← À VENIR · la meute (10 comptes créés par Martin), carte des spots, « Marquer », installation
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
    prompt-v3-5-comptes.md        ← prompt comptes des amis (créés par Martin, 10 max, installation, 80 Mo chacun)
    prompt-v3-6-rappel-21h.md     ← prompt notification du soir à 21 h
    prompt-v3-7-niveau-sans-xp.md ← prompt le niveau sans XP (13 oct., 23 h 05)
    prompt-v3-8-finitions.md      ← prompt finitions après revue de l'app (13 oct., 23 h 45)
    prompt-v3-9-retouches.md      ← prompt retouches après revue du 14 oct.
    prompt-v3-10-os-boutique.md   ← prompt missions, os, boutique, barres de défilement
    prompt-v3-11-defis-amis.md    ← le défi de la meute, version simple (après v3-14)
    prompt-v3-12-retouches-maquettes.md ← retouches des maquettes (inclus dans v3-13)
    prompt-v3-13-tout-ce-qui-reste.md ← PROMPT UNIQUE : tout ce qui reste, lot par lot — LE PLUS RÉCENT
    prompt-v3-14-communaute.md    ← la meute : carte des spots, « Marquer » (appelé par v3-13, lot 5)
    prompt-v3-15-trajets.md       ← trajets de balade (appelé par v3-13, lot 4)
```

## Quelle spec pour quoi

| Sujet | Spec |
|---|---|
| Écran d'ouverture, questionnaire de départ | V3 § 4 et § 5.1 + `questionnaire-depart.md` |
| Quête du jour, défi de la semaine | V3 § 5.3 et § 5.9 |
| L'arbre de Billy (étages, badges, chemin) | V3 § 5.4 et § 5.5 + `arbre-competences.md` |
| Accueil, navigation à 4 onglets | V3 § 5.2 et § 5.3 |
| Os, boutique, défis entre amis | V3 § 2 bis |
| Noter un moment, niveau (sans XP) | V3 § 2 et § 3 |
| Ce qu'il sait faire (onglet Billy), compétences | V3 § 5.4 et § 5.5, catalogue V2 |
| Compétences en cours, programme de la semaine | V3 § 5.4 + `arbre-competences.md` |
| Profil de Billy (toucher sa photo) | V3 § 5.4 point 5 |
| Santé, calendrier, poids, documents | V1 (+ filtre « À venir » : V3 § 5.10) |
| Comptes des amis, installation sur le téléphone, espace par compte | `communaute.md` § 2 |
| La meute, carte des spots, « Marquer » | `communaute.md` |
| Trajets de balade, moments sur le trajet | `trajets.md` |
| Règles d'interface (boutons, vocabulaire) | `style-guide.html` + V3 § 1 et § 6 |

Maquettes en ligne : https://claude.ai/artifact/GogZ3ooQc324nEY46DsGZw
