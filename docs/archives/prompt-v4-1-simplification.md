# Prompt Claude Code — V4, Billy simplifié (17 octobre)

À faire **après** `prompt-v3-17-retirer-saisie-balades.md` et `prompt-v3-16-carte-a-decouvrir.md`.

Lis `CLAUDE.md`, puis `docs/specs/spec-v4-simplification.md` en entier, puis l'audit `docs/recherche/audit-ux-v3.md`.
Les maquettes sont sur le canvas, section « V4 — Billy simplifié » (copies dans `docs/maquettes/V4-*.dc.html`).

But : une app où l'on comprend en 10 secondes quoi faire. L'app propose une seule chose, l'utilisateur confirme.
**Ne supprime aucune donnée** : on cache, on ne détruit pas.

Un commit clair par point, dans cet ordre :

1. **Barre à 3 onglets** : Balades · Aujourd'hui (rond au centre) · Santé. Les anciennes routes (Carnet, Billy, Meute)
   restent accessibles par les nouveaux écrans, pas par la barre.
2. **Aujourd'hui** (spec § 2) : en-tête avec la photo (→ Billy) et les os, phrase de contexte, une seule carte
   « À faire maintenant » choisie par la règle de la spec (logique dans `src/lib/`, avec tests), « Ensuite » sur
   2 lignes, « + Noter un souvenir ». Retire de l'accueil tout ce que la spec liste.
3. **Sorties automatiques** : une balade importée dont l'heure de départ tombe dans un créneau coche la sortie de ce
   créneau (et donne ses os une fois). Retire la coche à la main ; les sorties déjà cochées restent.
4. **Mission pas à pas** (spec § 3) : un écran par étape, minuteur automatique, puis « Ça s'est bien passé ? ».
   Réutilise les textes d'exercices existants (découpe « Comment faire » en étapes).
5. **Santé** (spec § 5) : calendrier visible en haut, carte « Prochaine chose à faire », 5 lignes vers les détails.
6. **Billy** (spec § 6) : écran profil ouvert depuis la photo ; « Ce qu'il apprend en ce moment » en phrases simples ;
   lien vers l'arbre actuel.
7. **Noter un souvenir** (spec § 7) : 3 champs.
8. **Une seule récompense** : retire de l'affichage niveau, titre, badges et défi de la meute ; garde les os et la
   boutique. Remplace les noms de compétences par leurs phrases sur les écrans principaux (garde-les dans l'arbre).
9. **Meute dans Balades** : calque « Spots de la meute » sur la carte, « Ses amis » dans Billy.

Vérifie chaque écran à 390 px : un seul bouton plein visible sans défiler. À la fin, dis-moi en 5 lignes ce qui est
fait, ce qui reste, et ce que je dois tester en premier sur mon iPhone.
