# Prompt Claude Code : les proches suivent la balade (10 novembre)

Lis CLAUDE.md, la spec V6 § 7 (partage en direct), puis les tickets T-123 et T-124 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.
Règle inchangée : jamais de position en direct sans un choix explicite de Martin.

## T-123 · Suivre : le tracé complet derrière le point, toutes les 15 s
- `live/{jeton}` (firebase/live.ts, lib/liveShare.ts) : ajouter `track?: { lat: number[]; lng: number[] }` (5 décimales,
  points simplifiés à 10 m), envoyé avec la position. Cadence : 15 s au lieu de 60 s (`pushDue`). Tracé complet depuis le départ.
- Reste < 900 Ko : au-delà de 4 000 points, simplifier plus fort.
- Follow.tsx : tracé `--color-route` sous le point ; la carte suit le point ; si le proche déplace la carte, bouton
  « Revenir sur Billy » (44 px) ; « Mis à jour il y a 10 s ».
- Balade finie : « Balade terminée à 8 h 44 », tracé visible 1 h, puis effacé.
- Règles Firestore : seul le propriétaire écrit, lecture par jeton comme aujourd'hui. Tests : simplification, taille, cadence.

## T-124 · « Vous passez près de chez… » (app iOS, sous isNative())
- Proches.tsx : champ facultatif « Son adresse » par proche, géocodé une fois (Nominatim, comme les rues), gardé dans
  les données privées (`useLivePrivate`), jamais dans `live/`.
- Pendant une balade sur l'iPhone (balade en cours), à 500 m ou moins de l'adresse : notification locale
  « Vous passez près de chez [prénom]. Le prévenir ? », une fois par balade et par proche.
- Toucher la notification : lance le partage en direct vers ce proche s'il ne l'était pas, puis ouvre Messages
  (`sms:<numéro>&body=`) avec « Billy et moi passons près de chez toi, suis-nous : <lien> ». Rien n'est envoyé sans ce toucher.
- Fonction pure testée (`nearProche` dans src/lib/liveShare.ts : distance, une seule fois par balade).

## Vérifier avant de pousser
- `npm test`, `npm run build`, skill `apple-design` sur Suivre et Partage en direct.
- `npm run build:ios` : Martin fera Run dans Xcode (T-124 touche au natif).
