# Prompt Claude Code — la meute : carte des spots et « Marquer » (après v3-5)

```
Lis docs/specs/communaute.md en entier et la planche docs/maquettes/V3-ParcoursMeute.dc.html (7 parcours).
Maquettes : V3-MeuteBienvenue, V3-Meute, V3-Spot, V3-Marquer, V3-NouveauSpot, V3-Marque, V3-ChienProfil,
V3-Territoire, V3-RaconterPartage.
Ne modifie aucun fichier de docs/ sans me le demander. À faire après prompt-v3-5-comptes.
Avant de coder, propose-moi le modèle de données et les règles Firestore et attends ma validation.
Une seule nouvelle dépendance autorisée : leaflet (carte OpenStreetMap, attribution visible). Pas de Google Maps.

1. 5e onglet « Meute » (icône repère), à droite de Billy : Carnet · Santé · ACCUEIL · Billy · Meute ; Billy reprend
   une seule colonne. La meute = tous les comptes de l'app (10 max) ; pas d'invitation, pas de
   demande à accepter.
2. Carte (≈ 55 % de l'écran) avec les spots par catégorie (Balade, Parc, Point d'eau, Café/resto, Jeux, Zone à
   éviter), les gouttes des chiens passés aujourd'hui, « Ma position » (centre la carte sans rien partager) et le
   bouton orange « Marquer » en bas à droite. Filtres en pastilles, dont « Calme » et « Territoire de [chien] ».
3. Détail d'un spot (feuille en bas) : nom, catégorie, distance, niveau de calme (avis des membres + créneau :
   « Plutôt calme le matin avant 9 h »), infos, « Passés ici cette semaine », avis rapide Calme/Moyen/Animé,
   « Y aller » (ouvre Plans) et « Marquer ce spot ». Ajouter un spot : appui long sur la carte ou « Nouveau spot ici ».
4. Marquer : propose seulement les spots à moins de 300 m (ou en créer un) ; jamais un point GPS libre. Écran de fête
   (maquette V3-Marque) : « [Chien] a marqué [spot] ! », +5 os (+10 si nouveau spot pour ce chien), une marque par
   spot et par jour. Les marques disparaissent de la carte après 7 jours ; le territoire reste dans le profil.
5. Sous la carte : « Aujourd'hui dans la meute » (sans heure), les chiens de la meute (profil public : photo, âge,
   race, niveau, badges — ni santé ni Carnet), et les défis (prompt v3-11).
6. Partager un moment du Carnet avec la meute : interrupteur dans « Noter », désactivé par défaut.
7. Vie privée : jamais d'heure affichée, jamais de position en direct, pas de spot « maison ». Tests des règles.
```
