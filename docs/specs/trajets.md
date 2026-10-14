# Spec — Les trajets de balade (14 octobre)

Martin veut voir les trajets des balades et les garder dans le Carnet.
**Décision : on trace le trajet après coup sur la carte.** Jamais d'enregistrement GPS en direct ni d'écran gardé
allumé (une web app sur iPhone ne peut pas suivre la position en arrière-plan). Import d'un fichier GPX : plus tard.

Maquettes : `V3-RaconterTrajet`, `V3-TracerTrajet`, `V3-TrajetMoment`, `V3-CarnetTrajet`.

## 1. Où ça vit
- Dans **Noter ce qu'on a fait**, une carte facultative « Le trajet », sous les photos :
  - « Vos trajets habituels » : vignettes (mini-carte + nom + distance) ; un toucher = trajet repris tel quel ;
  - « Tracer un nouveau trajet » (bouton contour orange foncé #9A4413).
- Dans le **Carnet** : la carte d'un moment avec trajet affiche une mini-carte du trajet (à la place de la photo s'il
  n'y en a pas, sinon une petite vignette ronde à côté de la date) et « 1,8 km ».
- Le détail du moment (`V3-CarnetTrajet`) : grande carte du trajet avec ses moments, puis distance · durée · nombre
  de moments, la liste des moments, le texte et les étiquettes, « Modifier » et « Modifier le trajet ».

## 2. Tracer (`V3-TracerTrajet`)
- Carte plein écran (Leaflet + OpenStreetMap), centrée sur la position actuelle si elle est autorisée, sinon sur le
  dernier trajet.
- **Toucher la carte ajoute un point** ; la ligne relie les points en traits droits (pas de calcul d'itinéraire, pas
  de service payant). Aide en haut : « Touchez la carte à chaque virage. Le point vert est le départ. »
- En haut : distance en direct (« 1,4 km · 10 points »). À droite, boutons ronds 52 px : « Annuler le dernier
  point », « Revenir au départ » (ferme la boucle).
- Panneau du bas :
  - interrupteur à 2 positions « Tracer le chemin » / « Placer un moment » (ce que fait le toucher sur la carte) ;
  - **Durée** facultative : 15 min · 30 min · 45 min · 1 h + ;
  - « Garder comme trajet habituel » (coché par défaut à partir de 2 points) + nom proposé (« Balade du 14 oct. »)
    modifiable ;
  - bouton plein « Terminé · 1,4 km ».
- Glisser un point le déplace ; toucher un point propose « Supprimer ce point ».

## 3. Placer un moment sur le trajet (`V3-TrajetMoment`)
- En mode « Placer un moment », toucher le trajet (ou près de lui) ouvre un panneau :
  « Qu'est-ce qui s'est passé ici ? » + nom de la rue si connu (sinon rien).
- Choix en grosses tuiles : **A eu peur** (rouge #C4423A) · **A grogné** (#9A4413) · **Super rappel** (#1E5A50) ·
  **Bien détendu** (#2559A8). « A marqué » est ajouté automatiquement quand on marque un spot (communauté).
- « Un mot » facultatif. Bouton « Placer ce moment ».
- Les moments « A eu peur » / « A grogné » alimentent le profil (« Comment il réagit ») seulement si Martin le
  choisit ; jamais automatiquement.

## 4. Utilité pour Billy
- Voir **où** il a peur ou grogne, balade après balade : repérer les rues à éviter et les endroits calmes.
- Plus tard : une carte « Ses balades » qui superpose les trajets du mois avec les moments (peurs en rouge,
  réussites en vert), dans l'onglet Billy. Pas de chiffre à battre, pas d'objectif de kilomètres.

## 5. Vie privée
- Un trajet est **privé** (Carnet). Il n'est jamais partagé automatiquement.
- Si un jour un moment avec trajet est partagé avec la meute : les 200 premiers et derniers mètres sont masqués
  (le départ et l'arrivée sont souvent le domicile) et l'heure n'apparaît pas.

## 6. Données
- `users/{uid}/entries/{id}.route` (optionnel) : { points: [[lat, lng], …] (simplifiés, 5 décimales), distanceM,
  durationMin?, savedRouteId?, moments: [{ lat, lng, type: 'peur'|'grogne'|'rappel'|'detendu'|'marque', note? }] }
- `users/{uid}/routes/{id}` : { name, points, distanceM, lastUsedAt } — trajets habituels, 20 maximum.
- Distance = somme des distances entre points (formule de haversine), affichée « 1,8 km » ou « 650 m ».
- Poids : quelques Ko par trajet, négligeable dans les 80 Mo.

## 7. Critères d'acceptation
- Tracer un trajet de 10 points en moins d'une minute à une main ; « Annuler le dernier point » toujours visible.
- Reprendre un trajet habituel en un toucher.
- Un moment placé apparaît sur la carte du détail et dans la liste, avec sa couleur.
- Aucune position n'est enregistrée sans action de l'utilisateur ; tout marche hors ligne (la carte affiche les
  tuiles déjà vues, le tracé est gardé et envoyé au retour du réseau).
