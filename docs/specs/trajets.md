# Spec — Les trajets de balade (14 octobre, mise à jour le 17 octobre)

Martin veut voir les trajets des balades et les garder dans le Carnet.
**Décision du 17 octobre : les balades n'entrent dans Billy que par un fichier** (export Strava, GPX ; voir
`carte-a-decouvrir.md`). Plus aucune saisie de trajet à la main : le traceur, « Vos trajets habituels » et
« Modifier le trajet » sont retirés (`prompt-v3-17`). Jamais d'enregistrement GPS en direct.
Les trajets tracés à la main avant le 17 octobre restent dans le Carnet et sur la carte : aucune donnée effacée.

Maquettes : `V3-CarnetTrajet` (le détail). `V3-RaconterTrajet`, `V3-TracerTrajet` et `V3-TrajetMoment` décrivent
l'ancienne saisie à la main, retirée.

## 1. Où ça vit
- Une balade arrive par « Importer mes balades Strava » (Carnet, Exploration, « Ses balades » dans l'onglet Billy).
  Elle devient un moment du Carnet avec son trajet.
- Dans le **Carnet** : la carte d'un moment avec trajet affiche une mini-carte du trajet (à la place de la photo s'il
  n'y en a pas, sinon une petite vignette ronde à côté de la date) et « 1,8 km ».
- Le détail du moment (`V3-CarnetTrajet`) : grande carte du trajet (MapLibre, bouton 2D/3D, « Revoir la balade »),
  ses repères et les photos prises pendant la balade, puis distance · durée · nombre de repères, la liste des
  repères, le texte, « Modifier » (texte, date, photos).

## 2. Placer un repère sur le trajet
- Toucher le trajet (ou à moins de 40 m) ouvre « Qu'est-ce qui s'est passé ici ? » + nom de la rue si connu.
- Repères en tuiles avec icône : **Moment de stress** (#C4423A) · **A grogné** (#9A4413) · **Rencontre chien** ·
  **Jeu** · **Pipi** · **Super rappel** (#1E5A50) · **Bien détendu** (#2559A8) · **Note libre** (avec un mot).
  « Pipi » (ex-« A marqué ») est aussi ajouté automatiquement quand on marque un spot de la meute sur le trajet.
- « Un mot » facultatif (obligatoire pour une note libre). Chaque repère peut être retiré.
- « Moment de stress » / « A grogné » alimentent le profil (« Comment il réagit ») seulement si Martin le
  choisit ; jamais automatiquement.
- Ce n'est pas une saisie de balade : le trajet lui-même ne se modifie pas.

## 3. Utilité pour Billy
- Voir **où** il a peur ou grogne, balade après balade : repérer les rues à éviter et les endroits calmes.
- Carte « Ses balades » dans l'onglet Billy : les trajets du mois superposés, peurs en rouge, réussites en vert.
  Pas de chiffre à battre, pas d'objectif de kilomètres.
- Le brouillard de la carte qui se découvre se lève avec les balades importées et, une seule fois, avec les anciens
  trajets tracés à la main (`carte-a-decouvrir.md` § 3).

## 4. Vie privée
- Un trajet est **privé** (Carnet). Il n'est jamais partagé avec la meute (le partage d'un moment n'envoie ni trajet,
  ni lieu, ni heure).

## 5. Données
- `users/{uid}/entries/{id}.route` (optionnel) : { points: [{ lat, lng }, …] (simplifiés, 5 décimales), distanceM,
  durationMin?, source?: 'gpx' | 'strava', startTime?, endTime?, savedRouteId? (ancien), moments: [{ lat, lng,
  type: 'peur'|'grogne'|'rencontre'|'jeu'|'marque'|'rappel'|'detendu'|'note', note?, street? }] }
- `users/{uid}/entries/{id}.photos[]` : + `lat?`, `lng?` quand la photo a été placée sur le trajet.
- `users/{uid}/routes/{id}` (anciens trajets habituels) : n'est plus écrit ; les documents existants restent.
- Distance = somme des distances entre points (haversine), affichée « 1,8 km » ou « 650 m ».

## 6. Critères d'acceptation
- Aucun bouton ne permet de tracer ou de modifier un trajet à la main.
- Un repère placé apparaît sur la carte du détail et dans la liste, avec son icône.
- Aucune position n'est enregistrée sans action de l'utilisateur.
