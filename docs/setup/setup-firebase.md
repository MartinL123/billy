# Mise en place de Firebase (à faire par Martin, environ 15 minutes)

Objectif : un projet Firebase **gratuit à vie** (plan Spark), avec connexion par e-mail et Firestore.
Claude Code ne peut pas faire ces étapes à ta place : elles se passent dans la console Firebase.

> Pourquoi c'est gratuit : le plan Spark n'a pas de facturation. Si un quota est dépassé, Firebase bloque
> jusqu'au lendemain, mais ne te facture jamais. Ta carte bancaire enregistrée sur ton compte n'est utilisée
> que par les projets passés en Blaze : celui-ci ne le sera jamais.

## 1. Créer le projet

1. Va sur https://console.firebase.google.com › **Ajouter un projet**.
2. Nom : `billy` (ou ce que tu veux).
3. Google Analytics : **désactivé** (inutile ici).
4. Une fois créé, vérifie en bas à gauche : la mention doit être **Spark**.
   Si c'est Blaze : roue crantée › *Utilisation et facturation* › *Détails et paramètres* › *Modifier le forfait* › Spark.
5. Ne clique jamais sur « Passer au forfait Blaze » dans ce projet, même si un écran le propose.

## 2. Activer la connexion par e-mail

1. Menu **Authentication** › *Commencer*.
2. Onglet *Mode de connexion* › **Adresse e-mail/Mot de passe** › Activer › Enregistrer.
3. Onglet *Utilisateurs* › **Ajouter un utilisateur** : ton e-mail et un mot de passe. C'est le seul compte de l'app.
4. Onglet *Paramètres* › *Domaines autorisés* › ajoute `<ton-pseudo-github>.github.io`.
5. Si l'option existe dans *Paramètres* › *Actions des utilisateurs* : décoche « Activer la création (inscription) »,
   pour que personne d'autre ne puisse créer de compte.

## 3. Créer la base Firestore

1. Menu **Firestore Database** › *Créer une base de données*.
2. Emplacement : **europe-west9 (Paris)**. Ce choix est définitif.
3. Mode : **production** (tout est fermé par défaut ; nos règles ouvriront l'accès à toi seul).

## 4. Déclarer l'app web et récupérer la configuration

1. Roue crantée › *Paramètres du projet* › *Vos applications* › icône **Web** (`</>`).
2. Surnom : `billy-web`. Ne coche pas Firebase Hosting.
3. Firebase affiche un bloc `firebaseConfig`. Garde-le : Claude Code en a besoin.
   Ces valeurs ne sont pas secrètes (elles finissent dans l'app publique) ; la sécurité vient des règles Firestore.

## 5. Donner la configuration au projet

Dans le dossier du projet, crée un fichier `.env.local` (Claude Code créera le modèle `.env.example`) :

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Puis, sur GitHub : repo › *Settings* › *Secrets and variables* › *Actions* › ajoute les mêmes six variables
(pour que le déploiement automatique les connaisse).

## 6. Installer l'outil Firebase sur ton Mac

Dans le terminal :

```bash
npm install -g firebase-tools
firebase login
```

Claude Code s'occupe ensuite de `firebase init`, des émulateurs et du déploiement des règles
(`firebase deploy --only firestore:rules`).

## 7. Vérifier que tout est en place

- [ ] Le projet affiche **Spark** en bas à gauche de la console.
- [ ] Authentication : e-mail/mot de passe activé, 1 utilisateur, domaine github.io autorisé.
- [ ] Firestore créé à Paris, en mode production.
- [ ] `.env.local` rempli sur le Mac, secrets ajoutés sur GitHub.
- [ ] `firebase login` fait.

## Garder un œil sur l'espace

Console › *Utilisation et facturation* › onglet Firestore : stockage utilisé (limite gratuite 1 Gio,
soit environ 4 000 photos compressées). L'app affichera aussi une alerte dans le profil au-delà de 70 %.
