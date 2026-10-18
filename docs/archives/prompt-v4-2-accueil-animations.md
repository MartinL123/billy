# Prompt Claude Code — Accueil tableau de bord, ouverture animée, animations (18 octobre)

Lis `CLAUDE.md` et `docs/style-guide.html`. Maquette validée par Martin : canvas « Flair — Accueil et ouverture »
(https://claude.ai/artifact/8EHfNAHWsHyGxCGe5PeKBf), artboards `Main` (ouverture, interactive) et `Accueil` (arrivée animée).
Tickets Notion : T-031, T-032, T-033. Un commit par ticket, numéro dans le message. **Ne supprime aucune donnée.**

## Règles de mouvement (à poser une fois, dans `src/index.css` et le style guide)

- Durées : 150 ms (toucher), 250 ms (transition), 400 ms (apparition), 600 ms (arrivée), jamais plus d'1 s au total avant
  de pouvoir agir.
- Courbes : sortie douce `cubic-bezier(.2,.8,.3,1)` ; ressort léger `cubic-bezier(.3,1.3,.5,1)` pour ce qui « pop ».
- On n'anime que `transform` et `opacity` (fluide sur iPhone). Rien ne clignote, rien ne bloque un toucher.
- `prefers-reduced-motion: reduce` : toutes les animations coupées, l'état final s'affiche directement.
- Utilitaires réutilisables (classes ou petit composant) : `anim-in` (fondu + montée 18 px), `anim-stagger` (délai par
  enfant, 80 ms), `anim-pop`, `tap` (échelle 0,96 au toucher).

## 1. T-031 Accueil en tableau de bord

- L'onglet du milieu devient « Accueil » (libellé et titre de page).
- De haut en bas : en-tête (photo + « Bonjour, [chien] » + os) ; carte « À faire maintenant » (règle actuelle de nowCard,
  seul bouton plein orange) ; ligne de la prochaine sortie (règle des 5 min) ; titre « Sa vie avec vous » ; 4 tuiles
  vivantes en grille 2 × 2 : **Ses progrès** (compétences en cours + pattes), **Ses balades** (nombre, km, % découvert
  de la commune), **Sa santé** (« Tout est à jour » ou le soin en retard, + le prochain soin), **Ses souvenirs** (nombre +
  date du dernier) ; puis 2 liens compacts **La boutique** (os à dépenser) et **La meute** ; « + Noter un souvenir » en
  bouton contour. Les cartes « Compléter son profil », pesée et installation gardent leur règle, sous les tuiles.
- Chaque tuile est un lien vers son écran ; les infos viennent des données existantes (logique dans `src/lib/`, testée).

## 2. T-032 Écran d'ouverture animé

Comme l'artboard `Main` : halo qui respire (3,2 s), deux ondes qui s'éloignent de la photo en boucle, 3 empreintes de
pattes qui flottent en transparence, nom puis bouton qui montent à l'arrivée, bouton qui pulse doucement.
Au toucher : la photo s'enfonce puis grandit, une onde claire envahit l'écran, l'accueil monte ; l'accueil est
utilisable en moins d'1 s.

## 3. T-033 Animations dans toute l'app

1. **Arrivée en cascade sur l'accueil** : les blocs apparaissent un par un (80 ms d'écart), à la première ouverture de
   la journée seulement ; les autres fois, affichage direct.
2. **Retour au toucher** : boutons, tuiles et lignes de liste s'enfoncent légèrement (0,96) puis reviennent.
3. **Compteurs qui défilent** : os, km, % découvert montent jusqu'à leur valeur (900 ms) quand ils changent.
4. **Pattes de progression** : elles se remplissent une par une avec un petit rebond.
5. **Gain d'os** : le bandeau glisse depuis le haut, un petit os vole vers le compteur d'os, qui rebondit.
6. **Fin de mission et nouvelle étape** : une gerbe d'une douzaine d'os (1 s) ; « C'est fait » dessine sa coche,
   la carte se replie et la suivante monte à sa place.
7. **Transitions d'écran** : un écran ouvert glisse depuis la droite (250 ms), le retour le fait repartir ; les onglets
   passent en fondu. Pas de transition sur l'écran d'ouverture.
8. **Panneaux du bas** : montée avec un léger ressort, fond assombri en fondu.
9. **Chargements** : des blocs gris qui scintillent doucement (squelettes) à la place des écrans vides (carte, listes).
10. **Carte** : à l'ouverture d'une balade, son tracé se dessine (1 s) ; après un import, le brouillard se lève en fondu
    sur les nouvelles zones.
11. **Questionnaire** : la barre de progression glisse, les questions glissent de côté.

Vérifie chaque animation à 390 px et à 320 × 568, avec et sans « Réduire les animations ». À la fin, dis-moi en 5 lignes
ce qui est fait et ce que je dois regarder en premier sur mon iPhone.
