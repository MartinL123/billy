# Prompt Claude Code — refonte V3 « Billy, le jeu »

À coller tel quel dans Claude Code, dans le dossier Billy.

```
Lis CLAUDE.md, puis docs/README.md, puis docs/spec-v3-simplification.md en entier.
La spec V3 fait foi sur toutes les autres en cas de divergence. Maquettes de référence :
docs/maquettes/V3-Ouverture, V3-Questionnaire, V3-Accueil, V3-Raconter, V3-Reussite, V3-Billy (.dc.html).

Étape 0 — Ranger le dossier docs/. CLAUDE.md et docs/README.md décrivent déjà l'organisation cible ;
déplace les fichiers pour qu'elle devienne réelle :
- docs/specs/ : spec-v3-simplification.md, spec-v1.md, spec-v2-dressage.md
- docs/recherche/ : audit-ux.md, recherche-dressage.md
- docs/setup/ : setup-firebase.md
- docs/archives/ : propositions.md, et prompts.md renommé prompts-v1.md, et ce fichier prompt-v3.md
- supprime les maquettes abandonnées docs/maquettes/V3-Etoile.dc.html, V3-Rattrapage.dc.html,
  V3-Competences.dc.html, ainsi que les .DS_Store
- utilise git mv, puis vérifie que tous les chemins cités dans CLAUDE.md, docs/README.md, les specs
  et le code pointent vers les bons fichiers. Commit : « docs: rangement du dossier ».

Ensuite, avant de coder la refonte : résume en 10 lignes ce que tu réutilises du code actuel,
ce que tu caches et ce que tu crées, et liste les points ambigus de la spec. Attends ma validation.

Puis suis l'ordre du § 11 de la spec V3, une étape à la fois. À la fin de chaque étape :
tests, commit clair, ce que je dois vérifier sur l'iPhone, puis arrête-toi jusqu'à ma validation.

Non négociable :
- aucune IA ni détection automatique : c'est l'utilisateur qui choisit les compétences ;
- les photos ne rapportent pas d'XP ;
- aucune étoile, note ou pourcentage affichés : la progression se montre en phrases ;
- rien ne baisse jamais, aucune donnée existante n'est supprimée (on cache dans l'interface) ;
- aucun mot banni du § 1 hors mode précis ;
- tout élément cliquable ressemble à un bouton (§ 6) ;
- l'app s'ouvre sur l'écran du logo ; toucher le logo fait entrer ; le bouton
  « Questionnaire de départ » de cet écran ouvre le questionnaire.
```
