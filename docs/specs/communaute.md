# Spec — La meute : communauté, carte des spots et « Marquer » (14 octobre)

Idée de Martin : partager l'app avec quelques amis (les maîtres du frère de Billy, des maîtres croisés en balade)
et en faire une petite communauté. On ajoute, sans alourdir le suivi de Billy :
1. **La meute** : un cercle d'amis qui se voient entre eux ;
2. **La carte** : les spots utiles aux chiens, avec leur niveau de calme ;
3. **Marquer** : la version jeu du pipi qui marque le territoire.

À faire **après** les comptes (prompt v3-5) ; les défis entre amis (v3-11) se rangent dans la meute.
Parcours : `V3-ParcoursMeute` (7 parcours, à lire en premier). Maquettes : `V3-Connexion`, `V3-Installer`,
`V3-MeuteBienvenue`, `V3-Meute`, `V3-Spot`, `V3-Marquer`, `V3-NouveauSpot`, `V3-Marque`, `V3-ChienProfil`,
`V3-Territoire`, `V3-RaconterPartage`, `V3-Compte`.

## 1. Principes

- **Le suivi de Billy reste prioritaire** : l'accueil ne change pas. La communauté vit dans un 5e onglet « Meute ».
- **Petit et privé** : l'app reste un projet GitHub, sans store. **10 comptes maximum**, tous créés par Martin.
  La meute = tous les comptes de l'app ; rien n'est visible hors de l'app.
- **On compare l'effort, jamais le chien** : pas de classement de territoire, pas de « qui a le plus de marques ».
- **Pas d'inscription, pas de QR code** : Martin montre l'app, et crée le compte de ceux qui veulent (§ 2).
- **Gratuit** : Firebase Spark + OpenStreetMap (Leaflet). Pas de Google Maps.
- **Pas de position en direct**, jamais. → **Remplacé par la V6 (22 octobre, `spec-v6-balades-komoot.md` § 7)** : jamais de
  position en direct sans un choix explicite, seulement avec des proches choisis, bandeau visible et arrêt en un toucher ;
  jamais vers la meute.

## 2. Comptes et installation (décision du 14 octobre)

- L'app reste sur GitHub Pages ; pas d'app à télécharger dans un store. On l'ouvre par son lien
  (martinl123.github.io/billy) et on l'**ajoute à l'écran d'accueil** (écran `V3-Installer`, § 2.1).
- **Pas d'écran « Créer un compte »** : Martin crée chaque compte dans la console Firebase (e-mail + mot de passe)
  et le donne à la personne de vive voix. Écran de connexion : e-mail, mot de passe, « Mot de passe oublié ».
- **10 comptes maximum.** Au-delà, rien n'est prévu : c'est un test entre amis.
- Premier lancement d'un compte : questionnaire de départ du chien (nom, photo, date de naissance, santé), puis
  invitation à changer son mot de passe (Profil → Compte).
- Tous les comptes forment **une seule meute** : pas de demande à accepter, pas de nom de meute.
- **De la place pour chacun** : Firestore gratuit = 1 Go en tout. Avec 10 comptes, chacun a **80 Mo** (marge
  gardée). Profil → Compte affiche « Espace utilisé : 34 Mo sur 80 Mo » avec une barre ; à 90 %, message doux
  (« Pensez à supprimer d'anciennes photos ») ; à 100 %, plus d'ajout de photo, le texte reste possible.
  Photos compressées à **1280 px, JPEG 0,75** (≈ 150 à 200 Ko avec la miniature 400 px) : environ 400 à 500 photos
  par personne. Documents PDF limités à 5 Mo.

### 2.1 Écran « Mettre Billy sur votre téléphone »
Accessible depuis l'écran de connexion (« Comment l'installer ? ») et Profil → Compte. Deux cartes :
- **iPhone (Safari)** : 1. ouvrir le lien dans Safari ; 2. toucher Partager (carré avec flèche) ; 3. « Sur l'écran
  d'accueil » ; 4. « Ajouter ». Note : le rappel du soir ne marche que depuis l'icône (iOS 16.4+).
- **Android (Chrome)** : 1. ouvrir le lien dans Chrome ; 2. toucher ⋮ ; 3. « Ajouter à l'écran d'accueil » ou
  « Installer l'application » ; 4. confirmer.
- Si l'app est déjà ouverte depuis l'icône (mode standalone), l'écran n'est jamais proposé.
- Dans le navigateur, un petit bandeau discret en bas de l'accueil : « Ajoutez Billy à votre écran d'accueil »
  + « Comment ? » ; fermable, ne revient pas avant 7 jours.

## 3. L'onglet Meute

Première visite (`V3-MeuteBienvenue`) : 3 points (les bons spots, Marquer, rien de public), « Autoriser ma
position » (explique pourquoi) et « Plus tard ». Sans position : carte centrée sur la ville, Marquer fait choisir le spot.

De haut en bas :
1. **La carte** (environ 55 % de l'écran) : spots de la meute + marques du jour. Bouton « Marquer » (orange, en bas
   à droite de la carte, zone du pouce) et bouton « Ma position » (centre la carte, sans rien partager).
2. **Filtres en pastilles** : Tout · Balades · Parcs · Eau · Cafés & restos · Jeux · Calme.
3. **Aujourd'hui dans la meute** : « Oslo a marqué le Grand Parc des Docks », « Billy et Oslo sont passés au
   même spot aujourd'hui », moments partagés. Sans heure précise.
4. **La meute** : les chiens (photo, nom, maître, niveau). Toucher un chien : son profil public (photo, âge, race,
   niveau, badges — pas de santé ni de Carnet sauf moments partagés).
5. **Défis de la meute** (prompt v3-11).
- Meute avec un seul compte : « Vous êtes seul pour l'instant. Martin peut créer un compte pour un ami. »

## 4. Les spots

- Un spot = nom, catégorie, point sur la carte, ajouté par un membre ; il appartient à la meute.
- Catégories : Balade · Parc · Point d'eau · Café / resto qui accepte les chiens · Jeux · Zone à éviter.
- **Niveau de calme** (ce qui manque aux autres applis, utile pour un chien peureux comme Billy) : chaque membre peut
  dire « calme / moyen / animé » et à quelle heure ; le spot affiche l'avis le plus fréquent et « Plutôt calme le
  matin avant 9 h ».
- Détail d'un spot (feuille en bas) : nom, catégorie, calme, petites infos (eau, laisse obligatoire, ombre, accès
  fermé), « Qui est passé ici cette semaine » (chiens de la meute), « Marquer ce spot », « Y aller » (ouvre Plans).
- Ajouter un spot (`V3-NouveauSpot`) : appui long sur la carte ou « Nouveau spot ici » → point déplaçable, nom,
  catégorie (6 tuiles), calme maintenant, infos facultatives ; bouton « Créer et marquer ce spot ». Un spot est un
  lieu public, jamais un domicile.
- Lien avec l'arbre : un spot « calme » peut être proposé pour une mission (ex. La Ville, étape « rue calme »).

## 5. Marquer (le pipi, version jeu)

- Bouton « Marquer » sur la carte → l'app propose **les spots de la meute à moins de 300 m** ; on choisit, ou on
  crée le spot. On ne marque **jamais** un point GPS libre.
- Confirmation joyeuse : goutte qui tombe, « Billy a marqué le Grand Parc des Docks ! », « +5 os » (nouveau spot
  pour Billy : +10 os ; une marque par spot et par jour maximum).
- Chaque chien a sa couleur ; sur la carte, un spot marqué aujourd'hui porte les petites gouttes des chiens passés.
- **Le territoire** de Billy = les spots qu'il a marqués, visible dans son profil (« 12 spots marqués ») et en
  surbrillance sur la carte avec le filtre « Territoire de Billy ».
- Moments sympas, sans compétition : « Oslo est passé ici avant Billy », « Nouveau spot pour Billy ».
- Les marques s'effacent de la carte au bout de 7 jours (le territoire, lui, reste dans le profil).

## 6. Vie privée (non négociable)

- Tout est visible **uniquement par les comptes de l'app** (10 max) ; rien n'est public.
- Pas de position en direct pour la meute (le partage en direct de la V6, § 7, ne va qu'à des proches choisis) ; les marques affichent le jour (« aujourd'hui », « hier »), **jamais l'heure**.
- On ne marque que des spots publics ; pas de spot « Maison ».
- Le profil public d'un chien ne montre ni santé, ni documents, ni Carnet (sauf moments que le maître partage).
- Partager un moment avec la meute = choix explicite à chaque fois (interrupteur « Partager avec la meute » dans
  Noter, désactivé par défaut).
- Supprimer un compte retire ses marques et ses moments partagés.
- Règles Firestore : les données communes ne sont lisibles que par un compte connecté ; chacun ne modifie que
  ce qu'il a créé ; les données privées restent sous users/{uid}.

## 7. Plus tard (pas maintenant)

- Ouvrir les spots à tous les maîtres du quartier : demandera signalement, modération et avis.
- Plusieurs meutes, inscription libre, plus de 10 comptes : seulement si le test entre amis marche.
- Notifications (« Oslo est au parc ») : non, contraire au § 6.

## 8. Données (Firestore)

- `community/members/{uid}` : { dogName, dogPhotoPath, ownerFirstName, color, level, joinedAt }
- `community/spots/{spotId}` : { name, category, lat, lng, info[], createdBy, createdAt }
- `community/spots/{spotId}/calm/{uid}` : { level: 'calme'|'moyen'|'anime', slot: 'matin'|'midi'|'soir' }
- `community/marks/{markId}` : { spotId, uid, dogName, date (YYYY-MM-DD, sans heure) }
- `community/feed/{id}` : moments partagés (copie légère : texte, miniature, date, uid)
- `users/{uid}/usage` : { bytes } mis à jour à chaque ajout/suppression de photo ou document.
Carte : Leaflet + tuiles OpenStreetMap (respecter la politique d'usage, attribution visible).

## 9. Critères d'acceptation

- Aucun écran d'inscription ; un compte créé dans la console arrive sur le questionnaire de départ.
- Personne de non connecté ne voit rien (test règles Firestore) ; chacun ne modifie que ses données.
- L'espace utilisé s'affiche et bloque proprement les photos à 80 Mo.
- L'écran d'installation explique iPhone et Android et n'apparaît pas quand l'app est déjà installée.
- Marquer propose seulement des spots proches ; aucune heure n'apparaît nulle part.
- L'accueil, le Carnet, la Santé et l'onglet Billy fonctionnent comme avant pour qui n'a pas de meute.
