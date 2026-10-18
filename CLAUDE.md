# Billy — app de suivi pour mon chien

PWA mobile-first pour suivre Billy, croisé épagneul-labrador né le 13/05/2026 :
calendrier santé, journal photos, documents, puis programme d'entraînement.
Utilisateur unique (moi), sur **iPhone**, app installée sur l'écran d'accueil.

## Deux cibles : web et iOS

- **Web** (PWA, GitHub Pages) : `npm run build`, base `/billy/`, service worker.
- **iOS** (Capacitor, `ios/`) : l'app charge le site en ligne (`server.url` dans `capacitor.config.ts`) : **elle est
  toujours exactement la même que la version navigateur**, mise à jour par le même déploiement. Xcode seulement pour la
  relance hebdomadaire (compte Apple gratuit) ou un changement natif. Voir `docs/ios.md`.
- Même code (une seule branche, `main`), même compte, même base Firebase.
- **Règle : tout code natif est protégé par `isNative()` (`src/native.ts`, `Capacitor.isNativePlatform()`).**
  En natif : pas de push web, Firebase Auth en `initializeAuth` + IndexedDB, pas d'invitation à installer l'app.
  Le service worker reste actif (hors ligne), sauf pour le paquet de secours embarqué (`capacitor://`).

Lire avant toute nouvelle fonctionnalité (l'index complet est dans `docs/README.md`) :
- **`docs/specs/spec-v3-simplification.md` : la spec en cours (refonte « Billy, le jeu »). Elle fait foi sur toutes les autres en cas de divergence.**
- `docs/specs/arbre-competences.md` : les 10 compétences, leurs 5 étapes, les exercices de chaque étape et le rythme des séances
- `docs/specs/questionnaire-depart.md` : le questionnaire de départ, question par question
- `docs/specs/communaute.md` : comptes des amis (10 max, créés par Martin), installation, la meute, carte des spots, « Marquer »
- `docs/specs/spec-v1.md` : santé, calendrier, journal, documents, connexion — toujours valable hors des points changés par la V3
- `docs/specs/spec-v2-dressage.md` : logique interne du dressage (catalogue, paliers, XP) réutilisée par la V3 ; son interface est remplacée
- `docs/style-guide.html` : style guide (couleurs et contrastes, typo, boutons, composants, éléments de jeu, écriture) — à respecter pour tout nouvel écran
- `docs/maquettes/README.md` : tokens visuels ; les maquettes `V3-*` font foi pour les écrans refondus
- Contexte seulement : `docs/recherche/` (audit UX, recherche dressage)

## Principes UX (non négociables)

- **Mobile-first** : conçu pour 375–430 px de large, testé en premier à 390 px.
- **Une action principale par écran**, visible sans scroller.
- **Ajout en 2 taps maximum** depuis l'accueil (photo, note, événement, document).
- **Zones tactiles ≥ 44 px**, actions principales dans la moitié basse de l'écran (pouce).
- **Pas d'écran vide ou d'onglet « bientôt »** : un état vide propose toujours l'action pour le remplir.
- **Français partout**, dates au format `13 mai 2026`, âges en langage naturel (« 5 mois et 3 jours »).
- **Hors ligne d'abord** : tout se consulte sans réseau, les ajouts se synchronisent au retour du réseau.
- **Aucune sauvegarde manuelle** : les données vivent dans Firestore, jamais uniquement dans le navigateur.
- **Import uniquement** : l'app n'ouvre jamais l'appareil photo. Photos et documents viennent de la photothèque ou de l'app Fichiers.
- Accessibilité : contrastes WCAG AA, labels sur tous les champs et boutons icône.

## Contraintes iPhone (PWA iOS)

- Installation : Safari › Partager › « Sur l'écran d'accueil ». Manifest + `apple-touch-icon` 180 px + `apple-mobile-web-app-capable`.
- Respecter les zones sûres : `viewport-fit=cover` et `env(safe-area-inset-*)` (encoche, barre d'accueil).
- Import de photos : `<input type="file" accept="image/*" multiple>` **sans** attribut `capture`.
  iOS convertit le HEIC en JPEG à l'import ; si un fichier HEIC passe quand même, afficher un message clair.
- Import de documents : `<input type="file" accept="application/pdf,image/*" multiple>` (ouvre Photos ou Fichiers).
- Pas de `window.open` ni de popups : ils se comportent mal en mode écran d'accueil.
- Champs de saisie en 16 px minimum (sinon Safari zoome au focus).
- Tester dans Safari iOS (ou le simulateur Xcode) avant de valider un écran ; Chrome desktop ne suffit pas.

## Stack

| Rôle | Choix |
| --- | --- |
| Build | Vite + React + TypeScript (strict) |
| Style | Tailwind CSS, tokens repris de `docs/maquettes/README.md` |
| Routing | React Router en `HashRouter` (compatible GitHub Pages) |
| Connexion | Firebase Authentication, **e-mail + mot de passe** (un seul compte, créé dans la console) |
| Données | Cloud Firestore avec `persistentLocalCache` (taille de cache illimitée) |
| Fichiers | Dans Firestore aussi (type `Bytes`), **pas de Cloud Storage** — voir Règles techniques |
| PWA | `vite-plugin-pwa` (`registerType: 'autoUpdate'`), web seulement |
| App iOS | Capacitor 8 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`), Swift Package Manager |
| Dates | `date-fns` avec la locale `fr` |
| Tests | Vitest + Testing Library, émulateurs Firebase en local |

Ne pas ajouter de dépendance sans raison claire ; préférer du code simple.

## Budget : 0 €

Le projet Firebase reste sur le **plan Spark (gratuit)**. Jamais de fonctionnalité qui exige le plan Blaze
(Cloud Storage, Cloud Functions, etc.). Quotas Spark à respecter :
1 Gio stocké, 50 000 lectures / jour, 20 000 écritures / jour, 10 Gio de transfert / mois.
Sur Spark, un dépassement bloque jusqu'au lendemain mais ne facture rien.

## Commandes

```bash
npm install
npm run dev                # serveur local
npm run build              # build de production
npm run preview            # tester le build (et la PWA)
npm test                   # tests unitaires
npm run emulators          # Auth + Firestore en local (demande Java 21+)
npm run emulators:user     # crée le compte de test de l'émulateur
npm run dev:emu            # serveur local branché sur les émulateurs
npm run build:ios          # build iOS (chemins relatifs) + copie dans ios/ ; puis npx cap open ios
```

Configuration Firebase dans `.env.local` (variables `VITE_FIREBASE_*`), jamais commitée.
Un `.env.example` liste les variables attendues.

## Structure

```
src/
  firebase/     # init, auth, accès Firestore, stockage des fichiers en Bytes, types, seed
  features/
    auth/       # écran de connexion
    today/      # écran Aujourd'hui
    calendar/   # événements, rappels, poids
    journal/    # entrées, photos, tags
    training/   # onglet Dressage : boss, séances, expositions (logique : docs/specs/spec-v2-dressage.md ; interface : docs/specs/spec-v3-simplification.md)
    profile/    # profil de Billy, contacts, documents, compte
  content/      # catalogue commun du dressage (boss, paliers, exercices, traits), le même pour tous
  components/   # composants UI partagés (Button, Sheet, TabBar, EmptyState, Field…)
  native.ts     # isNative() : seul point d'entrée du code propre à l'app iOS
  lib/          # utilitaires (âge, récurrences, compression d'image, découpage de fichiers, export .ics, XP, paliers, météo)
firestore.rules
firebase.json
capacitor.config.ts   # app iOS (appId fr.lanrezac.billy)
ios/                  # projet Xcode généré par Capacitor (ios/App/App/public n'est pas commité)
docs/
```

## Règles techniques

- **Images** (photos et pages de documents) : compressées côté client avant envoi
  (photo : 1280 px max, JPEG 0,75 ; page de document : 2000 px max, JPEG 0,8 ; miniature 400 px, JPEG 0,7).
  Chaque image va dans son propre document Firestore `files/{id}` en `Bytes`, toujours < 900 Ko.
  Si une image compressée dépasse 900 Ko, réduire encore la qualité.
- **PDF** : découpés en morceaux de 750 Ko dans `files/{id}/chunks/{n}` et recollés à l'ouverture.
  Taille max d'un PDF importé : 8 Mo (message clair au-delà).
- **Affichage** : `Bytes` → `Blob` → `URL.createObjectURL`, libérée au démontage du composant.
  Les listes chargent seulement les miniatures ; l'image pleine résolution à l'ouverture.
- **Sécurité** : tout sous `users/{uid}/…` ; `firestore.rules` n'autorise que le propriétaire. Rien n'est public.
- **Hors ligne** : les écritures faites hors ligne partent seules au retour du réseau ; afficher
  « en attente d'envoi » sur les éléments concernés (`hasPendingWrites`).
- **Dates** : stockées en ISO `YYYY-MM-DD` (sans heure) ; toute la logique d'âge et de récurrence
  dans `src/lib/`, avec des tests.
- **Évolution du modèle** : nouveaux champs toujours optionnels côté lecture ; ne jamais casser l'existant.
- Composants petits, logique métier hors des composants.

## Déploiement

App iOS : pas de déploiement automatique ; `npm run build:ios` puis Run dans Xcode (voir `docs/ios.md`).

Web :

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`) à chaque push sur `main`.
`base` de Vite = `/<nom-du-repo>/` ; manifest et service worker doivent utiliser ce chemin.
Les variables `VITE_FIREBASE_*` viennent des secrets du repo (ce ne sont pas des secrets au sens
sécurité : la protection vient de `firestore.rules`). Ajouter `<user>.github.io` aux domaines autorisés de Firebase Auth.

## Façon de travailler

- Suivre l'ordre de réalisation de la spec en cours (§ 11 de la V3) : une étape à la fois, s'arrêter au critère de fin et me demander de valider.
- Une fonctionnalité = un commit clair.
- Si une décision UX n'est pas couverte par la spec ou les maquettes, prendre l'option la plus simple et me la signaler.
