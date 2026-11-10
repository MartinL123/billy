# Flair · maquettes validées du 22 octobre 2026

Toutes les pages actives de Flair, validées par Martin le 22/10/2026. **Elles font foi pour le développement.**
Canevas Claude Design d'origine : https://claude.ai/artifact/CkPRvwqYPPGvaZyzxAefWn (privé).

- `index.html` : ouvre-le dans un navigateur pour voir toutes les pages côte à côte, avec leur statut.
- `sources/` : **un fichier par écran** (`.dc.html`). C'est ici qu'on modifie une maquette.
- `apercu/` : copies autonomes pour l'aperçu hors ligne (générées, ne pas modifier à la main).
- `assets/` : cartes et illustrations utilisées par les maquettes.

## Statuts

- **Prod** (vert) : comme l'app actuelle, rendu V6.
- **Validé · à construire** (bleu) : maquette validée qui diffère de la prod. Claude Code doit l'implémenter.
- **Proposition** (jaune) : écran qui n'existe pas encore dans l'app (balade en cours, idée de balade).

## Écran → fichier

| Écran | Fichier | Statut |
|---|---|---|
| Connexion | `sources/Connexion.dc.html` | Prod |
| Ouverture | `sources/Ouverture.dc.html` | Prod |
| Questionnaire | `sources/Questionnaire.dc.html` | Prod |
| Bienvenue | `sources/Bienvenue.dc.html` | Prod |
| Accueil | `sources/Main.dc.html` | Prod |
| Mission du jour | `sources/Mission.dc.html` | Prod |
| Exercice | `sources/Exercice.dc.html` | Prod (+ bouton « Voir la compétence ») |
| Noter un souvenir | `sources/Noter.dc.html` | Prod |
| Carte plein écran | `sources/CartePleinEcran.dc.html` | Validé · à construire |
| Carte à mi-hauteur | `sources/CarteMoitie.dc.html` | Validé · à construire |
| Journal des balades | `sources/Journal.dc.html` | Validé · à construire |
| Fiche d'une balade | `sources/Fiche.dc.html` | Validé · à construire |
| Fiche · carte en grand | `sources/FicheCarte.dc.html` | Validé · à construire |
| Photo en grand | `sources/Photo.dc.html` | Validé · à construire |
| Revoir la balade | `sources/Revoir.dc.html` | Validé · à construire |
| Raconter la balade | `sources/Raconter.dc.html` | Prod (+ état déjà rempli) |
| Ajuster le début et la fin | `sources/Recadrer.dc.html` | Prod |
| Belle balade | `sources/BelleBalade.dc.html` | Validé · à construire |
| Balade en cours | `sources/BaladeEnCours.dc.html` | Proposition |
| Idée de balade | `sources/Boucle.dc.html` | Proposition |
| Importer (Strava) | `sources/Importer.dc.html` | Prod |
| Balades importées | `sources/ImportResultat.dc.html` | Validé · à construire |
| Modifier la balade | `sources/ModifierSouvenir.dc.html` | Validé · à construire |
| Santé | `sources/Sante.dc.html` | Prod |
| Tous les événements | `sources/Evenements.dc.html` | Prod |
| Poids | `sources/Poids.dc.html` | Prod |
| Repas | `sources/Repas.dc.html` | Prod |
| Documents | `sources/Documents.dc.html` | Prod |
| Nouvel événement | `sources/NouvelEvenement.dc.html` | Prod |
| Nouveau document | `sources/NouveauDocument.dc.html` | Prod |
| Page Billy | `sources/Billy.dc.html` | Validé · à construire |
| Compétence | `sources/Competence.dc.html` | Prod |
| Ce qu'il apprend | `sources/EnCours.dc.html` | Prod |
| Son profil | `sources/Profil.dc.html` | Validé · à construire |
| Modifier le profil | `sources/ProfilModifier.dc.html` | Prod |
| Installer | `sources/Installer.dc.html` | Prod |

## Règles de design validées

- Boutons : **action** = orange plein (un seul par écran) ; **primary** = vert plein ; **secondary** = fond vert clair ; **tertiary** = bordure.
- Tout bouton **Supprimer** / **Annuler la balade** = tertiary rouge (bordure rouge, fond blanc) + icône.
- Un bouton, un libellé, une pastille, un chiffre et son libellé tiennent **sur une ligne**.
- Rangées de chiffres : `space-between`, texte centré.
- Arrondis et ombres du design system : cartes 20 px, champs 14 px, panneaux 26 px, pastilles/boutons ronds.
- Boutons de carte « Affichage » (calques) et « Me situer » (cible) toujours avec leur icône.
