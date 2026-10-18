# Prompt Claude Code — App iOS, phase 2 : balades de l'Apple Watch et GPS iPhone (18 octobre)

Lis `CLAUDE.md`, `docs/ios.md`, `docs/specs/trajets.md` et `docs/specs/carte-a-decouvrir.md`.
Tickets Notion : **T-001** (Apple Watch / HealthKit) puis **T-036** (balade enregistrée par l'iPhone).
Un commit par ticket, numéro dans le message. **Ne supprime aucune donnée.** Tout le code natif reste derrière
`isNative()` : le site web ne change pas (l'import GPX y reste, en secours).

## Décisions de Martin (18 oct.)
- Les marches de l'Apple Watch arrivent **seules, à chaque ouverture de l'app iOS** (aucun bouton à toucher).
- L'iPhone seul peut aussi enregistrer une balade, **même écran verrouillé**, mais seulement quand Martin la démarre.
- Strava : la tâche planifiée sera arrêtée quand la Watch marche (Martin s'en occupe avec Claude). L'import de fichier
  GPX reste disponible.
- Mettre `docs/specs/trajets.md` à jour : la règle « jamais d'enregistrement GPS en direct » devient « jamais sans
  action de l'utilisateur : dans l'app iOS, l'enregistrement démarre et s'arrête seulement par ses boutons ». Ajouter
  `source: 'watch' | 'gps'` (optionnels) au modèle § 5.

## Architecture native (commune aux deux tickets)
- **Pas de nouvelle dépendance npm** : un plugin Capacitor local en Swift, `FlairNativePlugin`
  (`ios/App/App/FlairNativePlugin.swift`), enregistré par une sous-classe `MainViewController: CAPBridgeViewController`
  (`capacitorDidLoad()` → `bridge?.registerPluginInstance(FlairNativePlugin())`) ; mettre cette classe dans
  `Main.storyboard`. Côté JS : `registerPlugin('FlairNative')` dans `src/native/flair.ts`, typé.
- Entitlement HealthKit, `NSHealthShareUsageDescription`, `NSLocationWhenInUseUsageDescription` et le mode
  arrière-plan `location` sont déjà dans le projet (phase 1) : vérifier, ne pas dupliquer.
- Vérifier la compilation sur le Mac : `npm run build:ios` puis
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS' -allowProvisioningUpdates build`.
- Toute la logique hors Swift va dans `src/lib/` avec des tests (conversion, doublons, nommage).

## 1. T-001 Les marches de l'Apple Watch arrivent seules
- Swift `getWalks({ since })` : demande l'autorisation de lecture (séances + `HKSeriesType.workoutRoute()`), lit les
  `HKWorkout` de type **marche** et **randonnée** depuis `since`, et pour chacune son tracé (`HKWorkoutRouteQuery` →
  lat, lng, heure). Renvoie `[{ uuid, start, end, type, points: [{ lat, lng, time }] }]`. Une séance sans tracé
  (marche en intérieur, GPS coupé) est comptée à part, pas importée.
- JS : convertit chaque séance en `Activity` (type `walking`/`hiking`, nom français comme aujourd'hui : « Balade de
  l'après-midi »…) et la fait passer par **le même circuit que l'import GPX** (`tallyActivity` →
  `saveImportedWalk` → brouillard, os, coche de la sortie du créneau). Refactorer `runImport` pour accepter des
  `Activity` déjà lues, sans changer le comportement du web. Entrée : `source: 'watch'`, `route.source: 'watch'`.
- Quand : à l'ouverture de l'app iOS (après connexion) et au retour au premier plan, au plus une fois toutes les
  5 minutes. `since` = date de la dernière lecture (dans Firestore, `users/{uid}` champ optionnel
  `watchSyncedAt`) ; la toute première fois, les 30 derniers jours. Les doublons sont déjà écartés par `importKey`.
- Retour visible : si au moins une balade arrive, un bandeau en bas de l'accueil « 🐾 2 balades de la Watch
  ajoutées · Voir » qui ouvre l'écran existant « Le brouillard s'est levé ! ». Rien si aucune. Si l'autorisation
  Santé est refusée : une ligne discrète dans « Ses balades » « Autoriser Flair à lire vos marches (Réglages ›
  Santé) », jamais de popup répétée.
- Dans l'app iOS, « Importer mes balades Strava » devient un lien secondaire « Importer un fichier GPX ».

**Arrête-toi ici** : commit T-001, puis demande à Martin de faire une marche avec la Watch (ou d'ouvrir l'app après
une marche déjà faite) avant d'attaquer T-036.

## 2. T-036 Enregistrer une balade avec l'iPhone
- Swift `startWalk()` / `stopWalk()` / `currentWalk()` : `CLLocationManager` (précision maximale,
  `distanceFilter` 5 m, `activityType = .fitness`, `allowsBackgroundLocationUpdates = true`,
  `pausesLocationUpdatesAutomatically = false`, `showsBackgroundLocationIndicator = true`). Autorisation
  « Pendant l'utilisation » seulement : la pastille bleue garde le GPS actif écran verrouillé. Les points sont écrits au
  fur et à mesure dans un fichier de l'app : si l'app est tuée, la balade n'est pas perdue. Arrêt automatique après
  3 h. Événement `walkPoint` pour mettre l'écran à jour en direct.
- Départ : dans l'app iOS, la carte du moment de l'accueil (sortie du créneau) a pour bouton principal
  **« Partir en balade »** ; il existe aussi dans « Ses balades ».
- Écran « Balade en cours » (plein écran, une seule action) : chrono, distance (« 1,2 km »), la carte avec le tracé
  qui avance et le brouillard qui se lève, grand bouton **« Terminer »** en bas (pouce), petit lien « Annuler » qui
  demande confirmation. L'écran reste allumé tant qu'il est affiché ; verrouiller l'iPhone n'arrête rien.
- Terminer : même circuit que T-001 (`source: 'gps'`) puis l'écran « Le brouillard s'est levé ! ». Moins de 100 m
  ou moins de 2 min : « Balade trop courte, elle n'a pas été gardée. »
- Reprise : à l'ouverture, si une balade est encore en cours (app tuée), la carte du moment propose « Balade en
  cours · 23 min — Reprendre / Terminer ».
- **Doublon Watch + iPhone** : si Martin enregistre aussi la marche sur sa Watch, la séance Watch qui chevauche de
  plus de la moitié une balade `gps` est ignorée (logique testée dans `src/lib/`).
- Mettre à jour `docs/ios.md` (phase 2 faite, limites) et le style guide si un nouveau composant apparaît.

Commit T-036, puis demande la recette sur l'iPhone. Ne passe aucun ticket en Done : seul Martin valide sur son iPhone.
