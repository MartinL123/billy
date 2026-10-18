# L'app iOS (Capacitor)

L'app (provisoirement « Flair », voir `src/appName.ts`) existe en deux versions qui partagent le même code, le même compte et la même base Firebase :

- **le site web** (PWA, GitHub Pages) : https://martinl123.github.io/billy/ ; il reste en ligne et sert de secours ;
- **l'app iOS** : la même app empaquetée avec Capacitor, installée seulement sur ton iPhone depuis Xcode,
  avec ton compte Apple gratuit (« Personal Team »).

Le code natif (iOS) est toujours protégé par `isNative()` (`src/native.ts`) : sur le web, rien ne change.

## Toujours la même app que le navigateur

L'app iOS charge le site en ligne (https://martinl123.github.io/billy/) : chaque déploiement sur GitHub Pages la met
à jour en même temps que la version navigateur. C'est exactement la même app, avec le même compte et les mêmes données.
Elle reste consultable hors ligne grâce au service worker du site (domaine déclaré dans `WKAppBoundDomains`).

Il ne faut repasser par Xcode que pour :
- la relance hebdomadaire (limite du compte gratuit, voir plus bas) ;
- un changement de code natif (phase 2 : HealthKit, GPS), de l'icône ou du nom.

## Ce qu'il faut sur le Mac

1. **Xcode** depuis l'App Store. Sur macOS 14 (Sonoma), c'est Xcode 16. Il faut environ 40 Go libres pour
   l'installer (le Mac en avait 17 Go le 18 octobre 2026 : fais de la place avant).
2. Ouvre Xcode une première fois et accepte l'installation des composants iOS.
3. Dans un terminal : `sudo xcode-select -s /Applications/Xcode.app` (pour que les commandes utilisent Xcode).
4. Dans Xcode › Réglages › Comptes, ajoute ton identifiant Apple : il crée ta « Personal Team ».

## Construire l'app

```bash
npm run build:ios
```

Ce script construit l'app avec des chemins relatifs (`VITE_TARGET=ios`) puis la copie dans `ios/` (`npx cap sync ios`).
`npm run build` reste le build du site web, inchangé.

Puis ouvre le projet :

```bash
npx cap open ios
```

## L'installer sur l'iPhone

1. Branche l'iPhone au Mac avec un câble, déverrouille-le, et réponds « Se fier à cet ordinateur ».
2. Sur l'iPhone : Réglages › Confidentialité et sécurité › **Mode développeur** › activé (l'iPhone redémarre).
3. Dans Xcode, à gauche, clique sur **App**, puis l'onglet **Signing & Capabilities** :
   - coche **Automatically manage signing** ;
   - **Team** : ta Personal Team (ton nom) ;
   - si Xcode dit que l'identifiant `fr.lanrezac.billy` est déjà pris, remplace-le par un autre
     (par exemple `fr.lanrezac.billy.martin`), ici et dans `capacitor.config.ts`.
4. En haut de la fenêtre, choisis ton iPhone comme destination, puis le bouton ▶ (Run).
5. Première fois seulement, sur l'iPhone : Réglages › Général › VPN et gestion de l'appareil › ton identifiant
   Apple › **Faire confiance**. Relance l'app.
6. Connecte-toi avec ton compte habituel : ce sont les mêmes données que sur le web.

## Chaque semaine : relancer l'app

Avec un compte gratuit, l'app **expire au bout de 7 jours** : elle refuse alors de s'ouvrir (tes données ne
risquent rien, elles sont dans Firebase). Pour la prolonger d'une semaine :

1. branche l'iPhone, `npm run build:ios` si le code a changé ;
2. `npx cap open ios`, puis ▶ (Run) avec l'iPhone comme destination.

En attendant, le site web marche toujours : https://martinl123.github.io/billy/

## Limites du compte gratuit

- L'app expire tous les 7 jours (voir plus haut).
- 3 apps installées au plus par compte gratuit, et 10 identifiants d'app créés par semaine.
- Pas de **notifications push** dans l'app iOS : Apple les réserve aux comptes payants. Les rappels (sorties, soir)
  restent sur le web : garde le site installé sur l'écran d'accueil si tu veux les recevoir.
- **HealthKit** (séances de l'Apple Watch) et le **GPS en arrière-plan** (Background Modes › Location updates)
  sont disponibles avec un compte gratuit : ils sont déclarés dans le projet (`Info.plist`, `App.entitlements`).
  Ils servent depuis la phase 2 (voir plus bas).
- Pas de TestFlight ni d'App Store : l'app ne s'installe que sur tes appareils, depuis ton Mac.

## Phase 2 : Apple Watch et GPS de l'iPhone

Code natif : un plugin local, `ios/App/App/FlairNativePlugin.swift` (enregistré par `MainViewController.swift`),
appelé depuis `src/native/flair.ts`, toujours derrière `isNative()`. Le site web ne change pas.

- **Marches de l'Apple Watch (T-001)** : à chaque ouverture de l'app (et au retour au premier plan, 5 min au plus),
  Flair lit dans Santé les séances « Marche » et « Randonnée » avec leur tracé, depuis la dernière lecture (30 jours
  la première fois). Elles passent par le même circuit que l'import GPX (brouillard, os, coche de la sortie).
  Une séance sans tracé (en intérieur) n'est pas importée. Une marche déjà importée de Strava (départ à moins de
  5 min) est ignorée.
- **Balade enregistrée par l'iPhone (T-036)** : « Partir en balade » (« Ses sorties du jour » sur l'accueil, ou la
  carte des balades) ouvre l'écran « Balade en cours » ; « Terminer » la garde. Le GPS ne démarre et ne s'arrête
  que par ces boutons. Les points sont écrits au fur et à mesure dans un fichier de l'app : si l'app est tuée, l'accueil
  propose « Reprendre / Terminer ». Moins de 100 m ou 2 min : pas gardée. Une séance Watch qui recouvre à plus de la
  moitié une balade de l'iPhone est ignorée.

Limites :
- iOS ne dit jamais à une app que la lecture de Santé est refusée : si la première lecture ne trouve aucune séance,
  la tuile « Ses balades » propose d'autoriser Flair (Réglages › Santé › Accès aux données › Flair).
- La position est autorisée « Pendant l'utilisation » seulement : la pastille bleue en haut de l'écran garde le GPS
  actif écran verrouillé. Arrêt automatique après 3 h. Le GPS consomme de la batterie pendant la balade.
- Le code natif ne se met à jour qu'en réinstallant l'app depuis Xcode ; le reste (écrans, textes) arrive avec le
  déploiement du site.

## Changer le nom

Le nom vient de `src/appName.ts` (`APP_NAME`). Pour l'app iOS, il faut aussi le reporter dans
`ios/App/App/Info.plist` (`CFBundleDisplayName` et les deux textes d'autorisation), puis `npm run build:ios`.
L'identifiant `fr.lanrezac.billy` ne change jamais.

## Ce qui diffère du web dans l'app iOS

- Le service worker du site est gardé (hors ligne) ; les notifications push web, elles, ne marchent pas dans l'app.
- Firebase Auth utilise `initializeAuth` avec la persistance IndexedDB (le web garde `getAuth`).
- Pas de bouton « Mettre l'app sur mon téléphone » ni de bandeau d'installation.
- Écran de lancement et icône vert Billy (#1E5A50), orientation portrait, iPhone seulement.

## Phase 2 (pas commencée)

HealthKit (lire les séances de l'Apple Watch) et l'enregistrement du tracé GPS, même écran verrouillé.
Les textes d'autorisation sont prêts :

- HealthKit : « Flair lit vos séances de l’Apple Watch pour afficher vos balades et leur tracé. »
- Position : « Flair enregistre le tracé de la balade, même écran verrouillé. »
