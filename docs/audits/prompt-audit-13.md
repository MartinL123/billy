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

## R-109 · Un seul compteur de sorties (décision de Martin, 10 nov.)
- Compter toutes les sorties avec Billy : balades à tracé + sorties notées (« J'ai fait cette sortie ») + sorties repérées confirmées.
  Ex. « 37 sorties · 57 km ». Une sortie sans distance compte dans le nombre, pas dans les km.
- Où : la carte « Ses balades » de l'accueil, l'en-tête de « Ses balades » (Sorties · Distance · Temps dehors), le résumé de la semaine du journal
  (« 3 sorties · 2,5 km cette semaine »).
- La carte et la liste des balades gardent seulement les balades avec tracé.
- Fonction pure testée (outingTotals dans src/lib/notedOutings.ts), réutilisée aux trois endroits.

## Vérifier avant de pousser
- `npm test`, `npm run build`, `npm run test:e2e`, skill `apple-design` sur l'accueil et le journal.
- Web seulement : pas besoin de Xcode.

---

# Suite : décisions d'organisation de Martin (10 nov., 14 h 48)

Mêmes règles : un commit par ticket, ticket en « Révision du code » avec une ligne datée.

## R-110 · Un seul journal
- `/balades` ouvre la carte, journal au cran du milieu, pastille « Balades » ; la tuile « Ses souvenirs » ouvre le journal sur « Souvenirs ».
- Les filtres de lieu de Walks.tsx (lieux, « Avec une peur », « Plus de 3 km ») passent dans le journal, sous les pastilles, avec « Balades ».
- Walks.tsx disparaît ; liens entrants mis à jour ; `/balades` reste une adresse redirigée. Test e2e : tuile → journal filtré.

## R-111 · Vocabulaire fixe
- Sortie = tout moment dehors avec le chien ; Balade = une sortie avec un tracé ; Souvenir = un mot ou une photo.
- L'ajouter au style guide (Écriture) et à docs/design/contexte-flair.md ; relire les textes de l'accueil, du journal, de Santé et des notifications.

## R-112 · Cacher les os
- `SHOW_BONES = false` (un seul interrupteur) : plus de « +3 os » ni de solde affiché nulle part. Les os restent comptés.

Non retenu : la roue « Réglages » sur l'accueil (les réglages restent dans Son profil).

## R-113 · Textes (recette web du 10 nov.)
- Billy › Ses badges : retirer « 1/5 », « 3/5 » ; des pattes (ou rien), VoiceOver : « 3 étapes acquises ».
- Son profil › Sorties : « Elles se cochent toutes seules avec vos balades et les sorties repérées par l'iPhone. »
- Son profil, bas : « Version du 10 novembre à 14 h 22 » (fonction d'heure commune).
