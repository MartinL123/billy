# Prompts Claude Code — une étape à la fois

Mode d'emploi : ouvre le dossier Billy dans Claude Code, colle le prompt de l'étape, laisse travailler,
puis vérifie toi-même la case « Je valide quand… » avant de passer à la suivante.
Si quelque chose ne te plaît pas, dis-le avant de continuer : c'est moins cher à corriger tout de suite.

Avant l'étape 2 : faire `docs/setup-firebase.md`.

---

## Étape 1 — Initialisation et mise en ligne

```
Lis CLAUDE.md, docs/spec-v1.md et docs/maquettes/README.md.
Fais l'étape 1 : initialise le projet (Vite, React, TypeScript strict, Tailwind avec les tokens
du README des maquettes, vite-plugin-pwa configuré pour iPhone), avec une seule page
« Bonjour Billy » aux couleurs de l'app. Ajoute le workflow GitHub Actions de déploiement
sur GitHub Pages. Initialise git, fais un premier commit, puis dis-moi exactement quoi faire
pour créer le repo GitHub, pousser et activer Pages. Arrête-toi là.
```

Je valide quand : la page s'ouvre sur l'iPhone via l'URL github.io et s'installe sur l'écran d'accueil
(Safari › Partager › Sur l'écran d'accueil) avec le bon nom et une icône provisoire.

---

## Étape 2 — Firebase et connexion

```
Fais l'étape 2 de la spec. Le projet Firebase existe déjà (plan Spark, e-mail/mot de passe activé,
Firestore créé) et .env.local est rempli. Branche Firebase Auth et Firestore avec
persistentLocalCache (cache illimité), utilise le fichier firestore.rules déjà présent,
configure firebase.json et les émulateurs. Construis l'écran de connexion d'après
docs/maquettes/Connexion.dc.html. Après connexion, affiche une page vide « Connecté ».
Déploie les règles avec firebase deploy --only firestore:rules. N'utilise aucun service payant.
Arrête-toi quand je peux me connecter sur l'iPhone.
```

Je valide quand : je me connecte sur l'iPhone, je ferme l'app, je la rouvre, et je suis toujours connecté ;
un mauvais mot de passe affiche le message sous le champ.

---

## Étape 3 — Modèle, profil de départ et âge

```
Fais l'étape 3 : types TypeScript du modèle de données de la spec, couche d'accès Firestore,
création automatique du profil de Billy et des dates clés au premier lancement, et l'utilitaire
d'âge en langage naturel avec ses tests (fins de mois, années bissextiles, jour d'anniversaire).
Pas encore d'interface. Lance les tests et montre-moi le résultat.
```

Je valide quand : tous les tests passent et, dans la console Firestore, je vois `users/<mon uid>/dog/billy`
et les 5 événements de départ.

---

## Étape 4 — Navigation et profil

```
Fais l'étape 4 : barre d'onglets (Aujourd'hui, Calendrier, Journal, avec des écrans provisoires
pour les deux derniers) et l'écran Profil d'après docs/maquettes/Profil.dc.html, sans la section
Documents. Infos modifiables, appel en un tap des contacts, état de synchronisation, déconnexion
avec confirmation. Respecte les zones sûres de l'iPhone.
```

Je valide quand : je modifie le numéro de puce et le nom du véto sur l'iPhone, et je les retrouve
après avoir fermé l'app ; le tap sur un contact lance l'appel.

---

## Étape 5 — Calendrier

```
Fais l'étape 5 : écran Calendrier (Calendrier.dc.html), formulaire d'événement (Evenement.dc.html),
récurrences avec création de l'occurrence suivante quand je marque « fait », et la feuille de pesée
(Pesee.dc.html). Teste la logique de récurrence.
```

Je valide quand : je crée un vermifuge trimestriel, je le marque fait, et le suivant apparaît 3 mois plus tard ;
une pesée s'ajoute en moins de 10 secondes.

---

## Étape 6 — Stockage des fichiers

```
Fais l'étape 6 : compression des images côté client, stockage en Bytes dans users/{uid}/files,
découpage des PDF en morceaux de 750 Ko et reconstruction, affichage via object URL.
Respecte les limites de CLAUDE.md. Écris les tests du découpage et de la compression.
Ajoute une page de test temporaire pour importer une image et un PDF depuis l'iPhone.
```

Je valide quand : depuis l'iPhone, j'importe une photo et un PDF de plusieurs pages, je les rouvre,
et ça fonctionne aussi après être passé en mode avion.

---

## Étape 7 — Journal

```
Fais l'étape 7 : Journal (Journal.dc.html), nouvelle entrée (Entree.dc.html) avec import multiple
depuis la photothèque sans appareil photo, tags, filtre, photo en plein écran avec balayage,
et l'état vide (JournalVide.dc.html). Retire la page de test de l'étape 6.
```

Je valide quand : j'importe 5 photos d'un coup, l'entrée apparaît avec ses tags, le filtre fonctionne,
et un journal vide affiche bien l'écran d'accueil du journal.

---

## Étape 8 — Aujourd'hui

```
Fais l'étape 8 : écran Aujourd'hui (Main.dc.html) et la feuille d'ajout rapide (Ajout.dc.html).
« Photos » ouvre directement la photothèque puis le formulaire d'entrée.
```

Je valide quand : depuis l'accueil, j'ajoute des photos en 2 taps et je marque un événement fait sans changer d'écran.

---

## Étape 9 — Documents

```
Fais l'étape 9 : section Documents du profil et formulaire d'import (Document.dc.html) : un PDF
depuis Fichiers ou plusieurs photos de pages, catégorie, date, lien vers un événement,
aperçu plein écran et partage via le menu natif. Affiche le trombone sur les événements liés.
```

Je valide quand : j'importe le carnet de santé en PDF, je le lie à un RDV véto, et je l'ouvre depuis le calendrier.

---

## Étape 10 — Finitions

```
Fais l'étape 10 : indicateurs « en attente d'envoi » hors ligne, alerte d'espace au-delà de 70 %,
icône définitive, puis relis toute la spec et liste les critères d'acceptation non remplis.
```

Je valide quand : la liste des critères non remplis est vide (ou je décide de les laisser pour la V2).
