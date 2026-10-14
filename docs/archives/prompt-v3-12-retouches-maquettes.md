# Prompt Claude Code — retouches après la revue des maquettes du 14 octobre (midi)

```
Lis docs/specs/spec-v3-simplification.md (§ 5.4, § 5.7, § 2 bis) : mis à jour. Maquettes : docs/maquettes/
V3-Reussite, V3-QueteExercice, V3-Billy, V3-Boutique, V3-Questionnaire, V3-SanteAVenir.
Ne modifie aucun fichier de docs/ sans me le demander. Aucune nouvelle dépendance.

1. « C'est réussi ! » : vraie animation, en CSS seul (keyframes), environ 1,5 s :
   - le badge arrive en rebond (scale 0.6 → 1.08 → 1, ~400 ms) ;
   - le segment gagné de l'anneau se remplit (stroke-dashoffset, ~600 ms) ;
   - pluie courte de 12 à 16 confettis aux couleurs du territoire (1,2 s), qui ne gênent jamais les boutons ;
   - puis la phrase de l'étape et « Prochaine étape » apparaissent en fondu.
   Toucher l'écran passe l'animation. Pas de vibration (Safari iPhone ne la gère pas).
   Avec prefers-reduced-motion : simple fondu, sans confettis ni rebond. Même animation, plus courte, pour un
   nouveau niveau. Teste-la sur l'iPhone.
2. Écran de l'exercice, « Comment faire » : chaque numéro (rond 28 px) est centré sur la première ligne de son texte
   (texte 17 px, interligne 28 px), aussi quand le texte passe sur 2 lignes.
3. Source de l'exercice : un lien souligné avec une icône « lien externe », qui s'ouvre dans un nouvel onglet
   (target="_blank" rel="noopener noreferrer", texte caché « (nouvel onglet) » pour les lecteurs d'écran, zone
   tactile 44 px). Ajoute un champ sourceUrl à chaque exercice du catalogue ; s'il manque, la source reste du texte.
4. Questionnaire : le bouton « Je ne sais pas » tient sur une ligne (largeur de son texte, white-space: nowrap) ;
   « Suivant » prend le reste de la place.
5. Onglet Billy : supprime le petit connecteur brun entre les étages. La carte des os (prompt v3-10) est plus aérée :
   ≥ 76 px de haut, os dans un rond blanc, « 240 os » en grand, « Pour vos efforts » sur une ligne, pastille contour
   « Boutique › » à droite.
6. Boutique (prompt v3-10) : dans la grille, le bouton de chaque carte est collé en bas (margin-top: auto), pour que
   les boutons d'une même rangée soient toujours à la même hauteur.
7. Santé : vérifie que la date des événements lointains (« 19 sept. 27 ») tient sur une ligne dans la colonne date.

Un commit par point. Montre-moi l'animation sur l'iPhone avant de committer le point 1.
```
