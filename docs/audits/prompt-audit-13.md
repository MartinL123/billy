# Prompt Claude Code : audit n°13 (10 novembre, 14 h)

Lis CLAUDE.md, puis les tickets R-107, R-108 et R-109 du kanban (Projet = Billy).
Un commit par ticket. Après chaque push : ticket en « Révision du code » avec une ligne datée dans Historique.

## R-107 · Nom des sorties notées ou repérées : suivre l'heure (comme R-025)
- `src/lib/notedOutings.ts` : SLOT_NAMES donne « Sortie de midi » à une sortie partie à 16 h 25.
- Nommer selon l'heure de départ (`done[slot]`), avec la même règle que `walks.ts` (matin < 12 h, midi < 14 h, après-midi < 18 h, soir) :
  « Sortie de l'après-midi · 20 min ». Sans heure connue : nom de l'heure réglée du créneau, comme l'accueil.
- Une seule fonction pour l'accueil, le journal et la fiche de sortie. Tests : 10 h 45 matin, 13 h 35 midi, 16 h 25 après-midi, 21 h 30 soir.

## R-108 · Idées de balade : des noms qui se distinguent
- Dans « Idées pour maintenant » (accueil) et « Idées de balade » (panneau), deux idées n'ont jamais le même titre.
- Titre = nom donné par Martin s'il existe, sinon le lieu marquant du tracé (parc, rue ou quartier le plus parcouru, déjà connu par les rues de la balade),
  sinon « Balade du 27 oct. ». Fonction pure testée (ideaTitle dans src/lib/walkRecos.ts).

## R-109 · Compteurs de balades et sorties repérées
Appliquer la décision de Martin notée dans le ticket (voir « Décision »). Ne pas coder avant qu'elle y soit.

## Vérifier avant de pousser
- `npm test`, `npm run build`, `npm run test:e2e`, skill `apple-design` sur l'accueil et le journal.
- Web seulement : pas besoin de Xcode.
