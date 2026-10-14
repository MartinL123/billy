# Prompt Claude Code — les trajets de balade (tracés après coup)

```
Lis docs/specs/trajets.md. Maquettes : V3-RaconterTrajet, V3-TracerTrajet, V3-TrajetMoment, V3-CarnetTrajet.
Ne modifie aucun fichier de docs/ sans me le demander. Avant de coder, liste ce qui change et attends ma validation.
Carte : leaflet + tuiles OpenStreetMap (attribution visible) ; si leaflet est déjà là (meute), réutilise-le.
Jamais de suivi GPS en direct ni d'écran gardé allumé.

1. Noter ce qu'on a fait : carte facultative « Le trajet » sous les photos : trajets habituels en vignettes
   (un toucher = repris) et « Tracer un nouveau trajet ».
2. Écran Tracer : toucher la carte ajoute un point, traits droits entre les points, distance en direct (haversine),
   « Annuler le dernier point », « Revenir au départ », glisser un point pour le déplacer, durée facultative
   (15/30/45 min/1 h +), « Garder comme trajet habituel » + nom, bouton « Terminé · X km ».
3. Mode « Placer un moment » : toucher le trajet → panneau « Qu'est-ce qui s'est passé ici ? » (A eu peur, A grogné,
   Super rappel, Bien détendu) + un mot facultatif.
4. Carnet : mini-carte + distance sur la carte du moment ; détail avec grande carte, moments colorés, distance ·
   durée · nombre de moments, liste des moments, « Modifier le trajet ».
5. Données : entries/{id}.route optionnel (points simplifiés, distanceM, durationMin, moments) et
   users/{uid}/routes (20 trajets habituels max). Champs optionnels à la lecture : rien ne casse pour les anciens
   moments. Tests : distance, simplification, ajout/suppression de point, reprise d'un trajet habituel.
6. Hors ligne : le tracé est gardé et envoyé au retour du réseau.
```
