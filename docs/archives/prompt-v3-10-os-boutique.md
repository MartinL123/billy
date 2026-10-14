# Prompt Claude Code — missions, os et boutique (14 octobre)

```
Retours de testeurs : « des missions qui rapportent », « récompenser et challenger ». Lis
docs/specs/spec-v3-simplification.md § 1, § 2 bis (nouveau), § 2 bis.1 (boutique) et § 6 point 8, et
docs/style-guide.html (section « Les os »). Maquettes : V3-Boutique (nouvelle), V3-Billy, V3-Accueil,
V3-QueteExercice, V3-RaconterQuete. Ne modifie aucun fichier de docs/ sans me le demander.
Avant de coder, liste ce qui change et attends ma validation. Un commit par lot.

1. Barres de défilement : aucune rangée horizontale (badges de l'accueil, pastilles-filtres de la Santé et du Carnet,
   catégories de la boutique) n'affiche de barre (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) ;
   la rangée va jusqu'au bord de l'écran et le dernier élément est coupé à moitié. Vérifie aussi sur ordinateur.
2. Vocabulaire : « Quête du jour » devient « Mission du jour », « Quête réussie ? » devient « Mission réussie ? »
   partout dans l'interface (les identifiants de code et Firestore ne changent pas).
3. Os (§ 2 bis) : dans src/lib, un module qui calcule les gains selon le tableau (mission +10, noter +3 max 3/jour,
   réussite +5, nouvelle étape dans l'app +25, défi +30, semaine régulière ≥ 5 jours +20, repos respecté +5,
   questionnaire terminé +50 une fois). Stockage : users/{uid}/bones/{id} = { date, amount, reason, refId } avec refId
   pour ne jamais compter deux fois ; solde = somme. Aucun gain sur les photos ni sur les étapes « Il savait déjà ».
   Décocher une étape ne retire rien. Tests unitaires pour chaque règle et pour le plafond « 3 notes par jour ».
4. Affichage : carte-bouton dorée « [os dans un rond blanc] 240 os · Pour vos efforts · [pastille contour Boutique ›] » (≥ 76 px de haut, aérée, voir maquette V3-Billy) sous le niveau dans
   l'onglet Billy ; carte de mission allégée : bandeau « Mission du jour » + une seule pastille « +10 [os] »
   (plus de « ▲ Compétence » ni de nom de territoire dans le bandeau), compétence dans la ligne sous le titre
   (« Le Rappel · 3 min · en longe au parc ») ; défi : seulement « +30 [os] » ; bandeau « +10 os » après
   « C'est fait ! » / « Enregistrer » (os qui saute, coupé si prefers-reduced-motion). Icône os en SVG
   (crème #F6E7C8, contour #8A6514), jamais d'émoji.
5. Boutique (§ 2 bis.1, maquette V3-Boutique) : catalogue dans src/content/shop.ts (accessoires, cadres photo, fonds
   de l'arbre, stickers du Carnet, couleurs de l'app ; prix du § 2 bis.1). Écran avec retour, solde, aperçu de la
   photo du chien avec ce qu'il porte (toucher un objet l'essaie), catégories en pastilles, cartes en 2 colonnes avec
   un seul bouton selon l'état (Acheter · prix / Porter / Porté ✓ / Encore N os en gris), panneau du bas pour
   confirmer l'achat, bandeau « C'est à vous ! ». users/{uid}/inventory/{itemId} et dog/billy.cosmetics (champs
   optionnels). Ce qui est porté s'affiche sur toutes les photos du chien (accueil, arbre, profil, chemin).
   Les « couleurs de l'app » ne changent jamais les couleurs des territoires, de l'action principale ni les contrastes.
6. Règles Firestore : bones et inventory accessibles au seul propriétaire.
```
