# Prompt Claude Code — finitions après revue de l'app (13 octobre, 23 h 45)

```
À faire après docs/archives/prompt-v3-7-niveau-sans-xp.md. Ne modifie aucun fichier de docs/ sans me le demander.
Un seul commit « Finitions », montre-moi les écrans touchés sur l'iPhone avant de committer.

1. Une seule formulation par étape : partout (badges, chemin, « En ce moment », quête, résultat du questionnaire),
   utilise les phrases de src/content/phrases.ts = docs/specs/arbre-competences.md. Aujourd'hui le chemin mélange
   « Regarde quand on l'appelle malgré des passants » et « Regarde à son nom, rue calme ». Les phrases courtes des
   badges peuvent rester plus courtes, mais avec les mêmes mots (« Regarde quand on l'appelle… »).
2. Vouvoiement partout : les « steps » des exercices du catalogue sont au tutoiement (« Présente ta paume ») ;
   passe-les au vouvoiement (« Présentez votre paume »), comme le reste de l'app. Vérifie tous les textes visibles.
3. « Ce qu'il faut » de l'exercice affiche « Ses friandises préférées (Treat). » : n'ajoute le nom de la friandise
   que s'il est renseigné dans le profil et que ce n'est pas une valeur par défaut ; sinon « Ses friandises préférées. »
4. « Son programme » (onglet Billy) : le jour d'aujourd'hui a toujours son contour orange, même si c'est un jour de
   repos (lune + contour). Un jour où au moins un moment est noté est coché : vérifie lundi 12 octobre, qui a des
   moments mais n'est pas coché (fuseau Europe/Paris, dates ISO sans heure).
5. Accueil : supprime la ligne « Billy a 5 mois aujourd'hui. Prochaine étape : 6 mois, le 13 novembre. » qui répète
   le sous-titre de la carte du chien. Garde-la seulement le jour même d'une étape de vie (« Billy a 6 mois
   aujourd'hui ! »).
6. Carnet : une carte sans photo n'affiche pas de zone photo (pas de bloc gris). Une photo en cours de chargement
   affiche un fond avec une icône, et une photo introuvable n'affiche rien (pas de grand vide).
7. Ajoute des tests : formulation unique des étapes (une seule source), cochage de la semaine à la bonne date,
   jour de repos + aujourd'hui.
```
