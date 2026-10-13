# Prompt Claude Code — corrections V3 + gamification (13 octobre, soir)

```
Lis CLAUDE.md, docs/README.md, puis en entier docs/specs/spec-v3-simplification.md et
docs/specs/questionnaire-depart.md : la spec V3 a été mise à jour ce soir et fait foi.
Maquettes de référence : docs/maquettes/V3-Accueil, V3-Billy, V3-Chemin (nouvelles), plus les autres V3-*.

Avant de coder : compare l'app actuelle à la spec et liste en 10 lignes maximum ce qui est déjà conforme,
ce qui manque et ce qui doit changer. Attends ma validation.

Ensuite, dans cet ordre, un commit par lot, et montre-moi chaque écran sur l'iPhone avant de passer au suivant :

1. Questionnaire de départ (spec § 4 + questionnaire-depart.md) : nouveau contenu en 5 parties
   (identité, santé, quotidien, réactions en phrases à trous, ce qu'il sait déjà faire), pré-rempli avec les
   données existantes ; il s'ouvre seul après le logo tant qu'il n'est pas fini ; une réponse ne compte
   qu'après « Suivant » ; les anciennes étiquettes de caractère disparaissent (déductions automatiques).
   Les réponses déjà données restent valides quand elles ont un équivalent.
2. Accueil (§ 5.3) : âge dans la carte personnage, carte orange « Terminez le questionnaire » tant qu'il
   n'est pas fini, quête du jour, rangée de badges, défi de la semaine toujours sûr, plus de bouton « + »
   flottant ni de carte « Voir les compétences ».
3. Quête du jour (§ 5.9) : exercice de 5 min, révision ou journée de repos (toujours le lendemain d'un
   moment « Difficile »), « C'est fait ! » ouvre Raconter pré-rempli, « Autre idée » 3 fois par jour max.
4. Le monde de Billy (§ 5.4) : 3 territoires colorés (La Maison, Le Quartier, Le Grand Monde), 10 badges en
   grille avec anneau en 5 segments, étape en cours en phrase courte, « Maîtrisé » doré, jamais de liste
   de « Pas encore commencé ».
5. Le chemin d'une compétence (§ 5.5) : sentier vertical, étapes acquises datées, photo de Billy sur
   l'étape en cours, trophée « Maîtrisé » au bout.
6. Carnet (§ 5.8) : cartes entièrement cliquables, visage du ressenti et compétences en étiquettes
   colorées, plus de bouton « Modifier » sur chaque carte, entrées automatiques reformulées.
7. Vérifie tous les critères du § 9 et liste ce qui n'est pas rempli.

Non négociable : aucune IA ni détection automatique ; photos sans XP ; aucun chiffre d'étapes ni étoile
affichés (la progression se voit, elle ne se compte pas) ; rien ne baisse jamais ; aucune donnée existante
supprimée ; aucune quête ni défi qui rapproche Billy de ce qui lui fait peur ; tout ce qui est cliquable
ressemble à un bouton.
```
