# Fiabilité de la balade : protocole de casse

**Critère** : 0 balade perdue sur 30 balades réelles. Seul Martin peut le constater, sur son iPhone : rien ici n'est
coché par Claude.

## Où vivent les points d'une balade

| Moment | Où sont les points | Code |
| --- | --- | --- |
| Pendant la balade | fichier natif `balade-en-cours/points.txt` (une ligne par point, écrite à chaque point) | `FlairNativePlugin.swift` |
| Affichage | copie dans l'écran (jamais la source) ; relue en entier au retour au premier plan | `LiveWalk.tsx` |
| « Terminer » | fichier natif, GPS coupé | `stopWalk` |
| Enregistrement | cache local Firestore (IndexedDB), écriture en attente | `importActivities` |
| Vérification (R-045) | relecture du cache local, 5 s | `ensureSavedLocally` |
| Effacement du fichier | **seule copie : l'écriture en attente**, jusqu'au réseau | `clearWalk` |
| Serveur | Firestore | envoi automatique dès qu'il y a du réseau |

Reprises existantes : app tuée ou téléphone redémarré → l'accueil propose « Reprendre / Terminer » ou « Balade à
enregistrer » ; Firestore en panne (R-042) → rechargement automatique ; tout échec de fin → « Réessayer » et le
fichier est gardé.

## Les cas à dérouler sur l'iPhone

Résultat attendu commun : la balade apparaît **une seule fois** dans Balades, avec une distance proche de celle de
la Watch (85 à 115 %) et un tracé ; aucune carte « Balade à enregistrer » ne reste.
Auto : **V** Vitest · **P** Playwright avec faux pont iOS · **S** Simulateur (`simctl`) · **M** manuel seulement.

| # | Cas | Étapes | Attendu | Protégé ? | Auto |
| --- | --- | --- | --- | --- | --- |
| 1 | Écran verrouillé 30 min | Partir, verrouiller, marcher 30 min, déverrouiller, Terminer | Tracé complet, « Belle balade ! » | oui | S, P |
| 2 | Autre app GPS en même temps (Plans) | Partir, ouvrir Plans 15 min, revenir | Tracé continu | à constater | M |
| 3 | App tuée (balayage) | Partir, 5 min, tuer, 5 min, rouvrir | « Balade en cours · Reprendre / Terminer » ; trou en pointillés si on reprend | oui | S, P |
| 4 | Mode avion toute la balade | Mode avion avant de partir, 20 min, Terminer, réseau 10 min après | « Belle balade ! » hors ligne ; « en attente d'envoi » puis envoyée | oui, mais voir risque 4 | P |
| 5 | Réseau qui revient pendant l'enregistrement | Terminer hors ligne puis couper le mode avion dans la seconde | Une seule balade | oui | P |
| 6 | Batterie faible, économie d'énergie ; extinction | 20 min en économie ; variante : laisser s'éteindre | Comme 1 ; après extinction : « Reprendre / Terminer » | oui (fichier) | M |
| 7 | 3 h et plus | Partir, plus de 3 h (en marchant, puis téléphone posé) | « Arrêtée après 3 h », chrono figé, Terminer ou Ne pas garder | partiel : voir risque 5 | V, S, P |
| 8 | Téléphone redémarré | Partir, 5 min, redémarrer, rouvrir | Comme 3 | oui | S, M |
| 9 | Mise à jour du site pendant ou **après** la balade | Pousser un commit pendant la marche ; recommencer juste après « Belle balade ! » | Pendant : l'écran revient avec tout le tracé. Après : **aucune balade ne doit démarrer** | **non après la fin : risque 1** | P |
| 10 | Position : « Lors de l'utilisation », « Toujours », « Une fois », **position exacte coupée** | Une balade de 10 min par réglage | Les trois premiers identiques. Position exacte coupée : aujourd'hui, effacée en « trop courte » | **non : risque 2** | M |
| 11 | Position refusée | « Jamais », puis Partir | « La position n'est pas autorisée » et le chemin vers Réglages | oui | P |
| 12 | GPS faible (tunnel, parking) | Traverser plus de 20 s | Bandeau « Le GPS cherche le ciel », « ≈ », pointillés | oui (V déjà) | V, S |
| 13 | Deux balades le même jour | A, Terminer ; puis B | Deux balades, pas d'os en double | oui | V, P |
| 14 | Watch et iPhone en même temps | Séance Marche sur la Watch et Flair, 30 min | **Une seule** balade | oui si l'iPhone couvre plus de 50 % de la séance Watch | V, M |
| 15 | Relance hebdomadaire depuis Xcode pendant une balade | Partir, puis ▶ Run dans Xcode | Comme 3. **Ne jamais supprimer l'app** (le fichier et la base locale partiraient) | oui, sauf suppression | M |
| 16 | Stockage presque plein | Moins de 100 Mo libres, 10 min | Aujourd'hui : 0 m puis effacée sans message | **non : risque 6** | M |

## Risques trouvés dans le code (probabilité × impact)

1. **Balade fantôme** (moyen × élevé, **confirmé**) : après « Belle balade ! », l'adresse garde `?depart=1` et
   l'écran reste allumé. Un rechargement (mise à jour du site, récupération R-042) relance une nouvelle balade ; la
   vraie suivante reprend la fantôme (heure de départ fausse, durée gonflée). Correctif : remplacer l'adresse par
   `/balade-en-cours` dès le départ, et quitter l'écran à la fin.
2. **Effacement « trop courte » quand le GPS n'a rien donné** (faible-moyen × élevé) : position exacte coupée ou GPS
   mauvais tout du long → tous les points rejetés → effacée sans question. Correctif : détecter la position
   approximative au départ ; ne jamais effacer sans confirmer une balade de plus de 2 min, proposer « Noter la sortie ».
3. **« Réessayer » qui efface sans vérifier** (faible × élevé, **confirmé**) : si la balade est déjà connue (clé
   d'import), rien n'est importé, la vérification de zéro balade réussit, et le fichier est effacé. Correctif :
   vérifier dans le cache l'entrée retrouvée par sa clé avant d'effacer.
4. **Fichier effacé avant l'arrivée au serveur** (faible × élevé) : hors ligne, la seule copie est IndexedDB
   (purge possible, réinstallation). Correctif : garder le fichier jusqu'à `waitForPendingWrites()` ou une lecture
   serveur ; `navigator.storage.persist()`.
5. **Arrêt à 3 h seulement quand un point arrive** (moyen × faible) : téléphone posé → GPS allumé indéfiniment.
   Correctif : minuteur natif à départ + 3 h.
6. **Stockage plein : échec muet** (très faible × élevé) : écritures `try?` en Swift. Correctif : rejeter au départ,
   événement d'erreur.
7. **Erreurs de démarrage mal nommées** (faible × moyen) : toute erreur devient « position non autorisée ».
8. **Balade « à enregistrer » oubliée qui bloque la synchro Watch** (faible × moyen).
9. **Doublon Watch + iPhone** si l'iPhone couvre moins de 50 % de la séance Watch (faible × faible).

## Automatisation proposée

- **Vitest** (déjà : `tooShort`, doublons Watch, GPS faible, vérification locale, récupération Firestore) ; à
  ajouter : la décision de fin extraite de `finish()` (trop courte, doublon, à vérifier), l'arrêt à 3 h.
- **Playwright, cible WebKit, faux pont iOS** : `window.webkit.messageHandlers.bridge` et `window.Capacitor`
  simulés avant le chargement ; état du faux natif gardé côté Node pour survivre aux rechargements ; « tuer » =
  fermer la page ; réseau = `context.setOffline`. Couvre les cas 3, 4, 5, 9, 11, 13 et les risques 1 et 3.
  **Nouvelle dépendance de développement : à valider par Martin** (règle de CLAUDE.md).
- **Simulateur** : `xcrun simctl location booted start --speed=1.4 …`, `simctl terminate`, `shutdown/boot`.
- **Manuel seulement** : cas 2, 6, 10, 15, 16, et la réalité du GPS dans les cas 1 et 12.

## Feuille de pointage (30 balades réelles)

Remplie le jour même. Une ligne par sortie.

| # | Date | Départ | Durée Watch | Lancée par (iPhone / Watch / les deux / rien) | Captée dans Flair (oui/non) | Distance Flair | Distance Watch | Écart | Cas testé | Incident |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | | |

Règles :

- **Perdue** : lancée avec « Partir en balade », au moins 2 min et 100 m selon la Watch, et absente de Balades
  24 h après. Une vraie balade effacée en « trop courte » compte comme perdue.
- **OK** : une seule entrée, distance entre 85 et 115 % de la Watch (sinon : incident, pas perte).
- Faire au moins une fois les cas 1, 3, 4, 7, 9 et 14 parmi les 30.
- Contre-vérifier chaque soir avec l'app Forme › Séances (la Watch voit aussi les marches recouvertes par l'iPhone,
  que Flair ignore volontairement).
- Le lendemain, ouvrir le site web sur un autre appareil : la balade doit y être (preuve qu'elle a atteint le serveur).
