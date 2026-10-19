# Faire travailler Claude Design sur Flair

Objectif : que Claude Design parcoure l'app écran par écran, en dise ce qui ne va pas, et propose des écrans
meilleurs, plus vivants et plus simples, sans casser ce qui marche. Ses maquettes passent ensuite à Claude Code.

## Ce qu'il faut savoir avant

- **Claude Design ne peut pas ouvrir l'app** (ni se connecter, ni toucher l'iPhone). Il voit ce que tu lui donnes :
  des **captures d'écran** et nos **règles**. La qualité des propositions dépend surtout des captures.
- Il travaille sur une **toile** (canvas) avec des écrans de 390 px, cliquables et animables. Tu commentes
  directement sur la toile, il corrige.
- **Le design system « Flair » existe** (créé le 19/10 dans Claude, type Design System) : couleurs, typos,
  formes, mouvement, écriture et 10 composants (bouton, carte-lien, tuile, sorties du jour, panneau du bas, filtres,
  compteur d'os, pattes, bandeau, barre d'onglets). Quand Claude Design te demande un design system, choisis « Flair » :
  il utilisera exactement nos composants.

## Les captures (déjà faites)

Les 30 captures de l'app (19 oct., 390 × 844) sont dans `docs/design/captures/`, avec leur liste dans
`captures/README.md` : accueil, noter une sortie, mission, carte, balades, santé, Billy, boutique, meute, profil,
questionnaire, et les écrans propres à l'app iPhone (balade en cours). Glisse-les toutes dans la conversation avec
Claude Design. Pour les refaire après une grosse mise à jour, demande-le-moi.

## Le prompt à coller (avec les captures et `docs/style-guide.html` en pièces jointes)

```
Tu es le directeur artistique de Flair, une app iPhone (React + Capacitor) pour vivre la vie de son chien :
missions d'éducation de quelques minutes, balades qui lèvent un brouillard sur la carte, santé (vaccins, soins),
souvenirs, et un petit jeu (os à gagner et dépenser, pattes de progression, boutique, meute d'amis).
Ton : chaleureux, simple, jamais infantilisant. Les captures jointes montrent l'app telle qu'elle est aujourd'hui ;
le design system « Flair » (et le style guide joint) fait foi pour les couleurs, typos (Bricolage Grotesque pour les titres, Figtree pour le texte)
et composants.

Pour qui (teste chaque écran avec eux) :
- Martin, UX designer, maître impliqué, Apple Watch : veut tout noter sans effort.
- Josiane, 64 ans, peu à l'aise, texte agrandi : doit comprendre l'écran en 5 secondes.
- Léo, 24 ans, joueur : veut sentir la progression et la récompense.
- Les Moreau (enfants de 9 et 12 ans) : lancent une mission en 30 secondes.

Règles non négociables : écran de 390 × 844 (et lisible à 320 × 568) ; une seule action principale par écran,
visible sans faire défiler, et un seul bouton plein orange (#BF5519) ; tout ajout en 2 touchers depuis l'accueil ;
zones tactiles de 44 px minimum, actions dans la moitié basse ; contrastes WCAG AA ; texte en français simple,
dates « 13 mai 2026 » ; la progression se voit sans se compter (pas de « 3/5 »), rien ne baisse après un mauvais jour.
Mouvement : 150 ms au toucher, 250 ms transition, 400 ms apparition ; courbes cubic-bezier(.2,.8,.3,1) et
ressort cubic-bezier(.3,1.3,.5,1) ; seulement transform et opacity ; tout coupé avec « Réduire les animations ».

Travail demandé, en trois temps :
1. Diagnostic : pour chaque capture, 3 lignes max : ce qui marche (à garder), ce qui gêne (et pour quel persona),
   ta proposition. Classe les problèmes du plus gênant au moins gênant.
2. Une toile « Flair — propositions » : pour les 5 écrans les plus importants (accueil, carte, balade en cours,
   santé, Billy), un artboard « Aujourd'hui » (reproduit fidèlement depuis la capture) à côté d'un artboard
   « Proposition » interactif, avec ses animations (arrivée, toucher, transition). Une note sous chaque proposition :
   ce qui change et pourquoi, en 3 puces.
3. Une idée plus audacieuse, sur un artboard à part, clairement marquée « Piste » : par exemple la carte comme
   écran principal, ou un accueil qui change selon le moment de la journée.

Ne change ni le nom, ni les couleurs principales, ni les fonctionnalités. Pose-moi tes questions avant
de dessiner si un écran n'est pas clair.
```

## Après la première toile

1. **Commente sur la toile** (« trop chargé », « garde l'ancien bouton »…) et demande une V2.
2. Quand un écran te plaît : « Valide l'accueil V2 ». Envoie-moi le lien : je le relis avec les personas et la grille
   d'audit (accessibilité, 2 touchers, cohérence avec le reste) et j'écris le prompt pour Claude Code, comme pour R-044.
3. Une proposition validée devient un ticket « T-xxx · Refonte … » dans le Kanban (Conception → À faire).

## Pour juger une proposition (grille rapide)

- Josiane comprend-elle l'écran en 5 secondes, sans icône seule ni mot technique ?
- Une seule action principale, visible sans faire défiler ?
- L'ajout le plus courant se fait-il en 2 touchers ?
- Le jeu (os, pattes) est-il visible sans être bruyant ?
- Les animations disent-elles quelque chose (d'où vient l'élément, ce qui a changé), ou sont-elles décoratives ?
- Ça tient à 320 px de large ? En texte agrandi ?
