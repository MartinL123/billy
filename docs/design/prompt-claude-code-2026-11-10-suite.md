# Prompt Claude Code : suite du 10 novembre (R-114, T-122)

À lancer APRÈS prompt-audit-13.md et prompt-claude-code-2026-11-10-proches.md.
Lis CLAUDE.md, puis les tickets R-114 et T-122 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## R-114 · « Me situer » : position fausse ou lente, carte pas recentrée (retour de Martin, 10 nov.)
Cause probable, dans src/features/balades/Explorer.tsx (`locate`) :
- `getCurrentPosition` avec `maximumAge: 300000` et sans `enableHighAccuracy` : l'iPhone rend une position vieille de
  5 min au plus, peu précise (Wi-Fi). Passer à `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 15000`.
  Dans l'app iOS, passer par le plugin natif de géolocalisation s'il existe déjà (sinon garder navigator.geolocation).
- Toucher « Me situer » ne centre pas la carte sur moi : `myPos` ne sert qu'à choisir les balades du coin (`walksNear`),
  le cadrage reste sur ces balades. Il faut : un point bleu « vous êtes ici » (avec son cercle de précision),
  et `flyTo` sur ce point (zoom 16) à CHAQUE toucher, même si la position n'a pas changé.
- Pendant 2 min après le toucher : `watchPosition` met le point bleu à jour (puis s'arrête, batterie).
- Pendant la recherche : le bouton tourne (busy) ; échec ou refus : toast « Position introuvable. Vérifiez que la
  localisation est autorisée pour Flair. »
- Libellé VoiceOver : « Me situer » (pas « les balades du coin où je suis »).
- Tests : fonction pure de cadrage (src/lib), et e2e avec une position simulée (le bouton centre la carte).

## T-122 · Balade enregistrée seule en sortant de chez soi (validée par Martin le 10 nov., maquette telle quelle)
Maquette : docs/maquettes/V6-balade-auto.html. App iOS seulement, sous isNative().
- Réglage « Enregistrer le tracé en partant de chez moi » dans Son profil › Réglages › Balades détectées, ÉTEINT par défaut.
  Au premier allumage : une phrase d'explication, puis la demande de position « Toujours ».
- Points de départ : proposer les 2 départs les plus fréquents des balades passées (Saint-Ouen, Bretagne), modifiables,
  « + Ajouter un point de départ » ; rayon 150 m.
- Natif (FlairNativePlugin.swift) : CLLocationManager.startMonitoring(for: CLCircularRegion) sur chaque point.
  À la sortie de la zone : iOS réveille l'app, qui lance l'enregistrement GPS en arrière-plan (même code que la balade
  en cours, allowsBackgroundLocationUpdates). Arrêt au retour dans la zone, ou au bout de 3 h (comme T-062).
  Ignoré : moins de 10 min ou 300 m, ou vitesse > 15 km/h tenue 2 min (voiture).
- Le tracé est gardé en attente (comme les sorties repérées) : à l'ouverture, feuille « Balade enregistrée »
  avec la mini-carte, « Aujourd'hui · 17 h 20 → 17 h 52 », « 32 min · 1,9 km · sortie du soir »,
  primary « C'était avec Billy » (devient une vraie balade, créneau fait) / tertiary « Pas avec lui » (tracé effacé).
  Sans réponse : effacé au bout de 14 jours.
- Doublons : remplace la sortie repérée par l'iPhone au même moment ; s'efface si une séance Watch ou « Partir en balade »
  couvre déjà ce temps. Si un partage en direct est actif (T-123), le tracé part aussi vers les proches.
- Journal : la balade porte « Enregistrée seule ».
- Tests : règles pures (seuils, doublons, voiture) dans src/lib/autoWalk.ts.
- `npm run build:ios` ; Martin fera Run dans Xcode.

## Vérifier avant de pousser
- `npm test`, `npm run build`, skill `apple-design` sur la carte et la feuille « Balade enregistrée ».
