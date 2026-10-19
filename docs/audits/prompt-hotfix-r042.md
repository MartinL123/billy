# Prompt Claude Code — URGENT : la balade de l'iPhone bloque sur « Enregistrement… » et se perd (R-042, bloquant)

Lis `CLAUDE.md` et le ticket R-042 du Kanban Notion. **À faire avant tout le reste.** Ne supprime aucune donnée.
Un commit par étape, « R-042 » dans le message.

## Les faits

- 18 oct., ~20 h : Martin, app iOS installée depuis Xcode après 0bb2997, « Partir en balade », 15 min de marche avec
  l'iPhone seul, écran verrouillé une partie du temps. Le chrono et la distance avançaient.
- « Terminer » → écran bloqué sur « Enregistrement… » (boutons grisés). Martin a fermé l'app : la balade n'est nulle
  part dans Firestore, et le fichier natif a été effacé par `stopWalk()`.
- Ce que l'audit a déjà vérifié (19 oct., bac à sable, faux pont Capacitor iOS dans Chromium) : le circuit JS
  `LiveWalk.finish()` → `stopWalk()` → `importActivities()` → `/importer/resultat` fonctionne (1,6 s pour 181 points ;
  une rafale de 400 points `walkPoint` au déverrouillage passe sans souci). **La panne est donc côté iPhone** : plugin
  natif, pont Capacitor, WebKit, ou cycle de vie (WebView suspendue pendant le verrouillage).

## 1. Ne plus jamais perdre une balade (à faire même sans connaître la cause)

1. `stopWalk()` n'efface plus rien : il arrête le GPS et renvoie les points. Nouvelle méthode native `clearWalk()`,
   appelée par le JS **seulement après** `saveImportedWalk()` (écriture mise en file d'attente).
2. `finish()` entièrement dans un `try/catch`, chaque étape avec un délai maximum (`stopWalk` 10 s, enregistrement
   15 s). En cas d'échec ou de délai : écran « La balade n'a pas pu être enregistrée », boutons **« Réessayer »** (plein)
   et **« Copier le détail »** (contour : copie l'étape qui a échoué, le message d'erreur, le nombre de points, l'heure),
   pour que Martin puisse le coller à Claude.
3. Si l'app est fermée avant la fin, la balade reste dans le fichier : l'accueil affiche « Balade à enregistrer ·
   Terminer » ; le nouvel essai relit le fichier et enregistre.
4. Journal natif : `FlairNativePlugin` écrit chaque étape (startWalk, nombre de points reçus, passage arrière-plan /
   premier plan, stopWalk, clearWalk, erreurs) dans `balade-en-cours/journal.txt`, renvoyé par `currentWalk()` et inclus
   dans « Copier le détail ».
5. Même `try/catch` + délai pour les marches de la Watch (`WatchSync.tsx`) : une erreur ne doit rien bloquer.

## 2. Trouver la cause exacte, au Simulateur sur le Mac

1. `npm run build:ios`, puis lance l'app sur un simulateur iPhone (`xcodebuild … -destination 'platform=iOS Simulator,name=iPhone 16'`
   puis `xcrun simctl install/launch`, ou Xcode). Si la connexion est nécessaire, demande à Martin de se connecter
   (ne tape jamais son mot de passe).
2. Journal : `xcrun simctl spawn booted log stream --level debug --predicate 'process == "App"'`. En debug, Capacitor y
   écrit chaque appel natif (« To Native -> FlairNative stopWalk ») et chaque réponse, ainsi que la console JS
   (`⚡️ [log]`, `[error]`).
3. Simule une marche : `xcrun simctl location booted start --speed=1.4 <5 points sur ~500 m>` (ou Features › Location ›
   City Walk). « Partir en balade », verrouille (`xcrun simctl` ou ⌘L) **5 min**, déverrouille, « Terminer ».
4. Cherche dans le journal : la réponse de `stopWalk` arrive-t-elle au JS ? Une erreur JS (WebKit seulement) ? La
   WebView a-t-elle été rechargée pendant le verrouillage ?
5. Écris la cause trouvée dans le ticket R-042, corrige-la, ajoute un test (JS) ou une vérification au Simulateur.

## 3. Avant de pousser

Au Simulateur : balade de 3 min avec 2 min écran verrouillé → « Le brouillard s'est levé ! » et la balade dans « Ses
balades » (badge iPhone). Recommence sans réseau (mode Avion du Mac) : enregistrée hors ligne ou « Réessayer »,
jamais d'écran bloqué ni de perte. Puis `npm test`, `npm run build:ios`.

Dis ensuite à Martin : relancer l'app depuis Xcode (code natif modifié), puis faire une courte balade (5 min,
300 m, écran verrouillé 2 min). Si un écran d'erreur apparaît : « Copier le détail » et le coller à Claude.

À la fin, résume en 5 lignes : la cause trouvée, ce qui est corrigé, ce que Martin doit tester.
