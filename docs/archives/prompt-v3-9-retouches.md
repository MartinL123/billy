# Prompt Claude Code — retouches après revue du 14 octobre

```
Ne modifie aucun fichier de docs/ sans me le demander. Un seul commit « Retouches », montre-moi l'accueil et le
Carnet sur l'iPhone avant de committer.

1. Accueil (§ 5.3) : « Noter ce qu'on a fait » doit être visible sans faire défiler sur un iPhone (390 × 844).
   Ordre : carte du chien → quête du jour → « Noter ce qu'on a fait » (orange) + « Faire un exercice » (contour)
   → défi de la semaine → badges → aujourd'hui. Le défi est passé au-dessus de « Noter » : remets-le en dessous.
2. Quête du Grand Monde : sa couleur (#C2571A) est la même que le bouton principal orange, on voit deux gros
   boutons orange identiques. Pour la carte de quête du Grand Monde, utilise un bouton « Commencer » plus foncé
   (#9A4413, contraste AA vérifié) pour qu'on distingue la quête de « Noter ».
3. Carnet (§ 5.8) : le bouton flottant « + » recouvre le texte et le chevron de la carte : ajoute assez de marge
   en bas de la liste (au moins la hauteur du bouton + 16 px). Sur chaque carte, affiche le visage du ressenti
   (Difficile / Bien / Super) et les compétences en petites étiquettes colorées (couleur du territoire), avant les
   étiquettes libres (« Réussite », « Bretagne »…).
4. Filtres du Carnet : garde « Tous » et les étiquettes libres, et ajoute les filtres par compétence notée
   (pastilles couleur du territoire) seulement pour les compétences qui ont au moins un moment.
```
