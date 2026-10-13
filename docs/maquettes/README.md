# Maquettes V1

Toile en ligne (cliquable en mode Play) : https://claude.ai/artifact/GogZ3ooQc324nEY46DsGZw

Les fichiers `.dc.html` de ce dossier sont les sources des écrans, à utiliser comme référence
visuelle (couleurs, tailles, espacements, textes) pour coder les composants React.
Ils ne s'ouvrent pas tels quels dans un navigateur.

| Fichier | Écran |
| --- | --- |
| `Connexion.dc.html` | Connexion (premier lancement, avec l'état « mot de passe incorrect ») |
| `Main.dc.html` | Aujourd'hui (accueil) |
| `Ajout.dc.html` | Feuille d'ajout rapide (bouton +) |
| `Calendrier.dc.html` | Calendrier, événements, poids |
| `Evenement.dc.html` | Formulaire d'événement |
| `Pesee.dc.html` | Feuille d'ajout de pesée (clavier numérique) |
| `Journal.dc.html` | Journal photos, filtres par tag |
| `Entree.dc.html` | Nouvelle entrée du journal (photos importées, texte, tags) |
| `JournalVide.dc.html` | État vide du journal |
| `Profil.dc.html` | Profil, contacts, documents, compte |
| `Document.dc.html` | Import d'un document (PDF ou photos de pages) |

## Refonte V3 (à jour, fait foi)

| Fichier | Écran |
| --- | --- |
| `V3-Ouverture.dc.html` | Ouverture : toucher le logo, accès au questionnaire |
| `V3-Questionnaire.dc.html` | Questionnaire de départ (une question par écran) |
| `V3-Accueil.dc.html` | Accueil : la partie |
| `V3-Raconter.dc.html` | Raconter un moment |
| `V3-Reussite.dc.html` | « C'est réussi ! » (nouvelle étape) |
| `V3-Billy.dc.html` | Onglet Billy : ce qu'il sait faire |

Les versions abandonnées `V3-Etoile`, `V3-Rattrapage` et `V3-Competences` (étoiles) ont été supprimées.

## Tokens

| Rôle | Valeur |
| --- | --- |
| Couleur principale | `#1E5A50` |
| Principale claire (onglet actif, tags actifs) | `#DCEBE6` |
| Fond | `#F3F5F2` |
| Surface (cartes, champs) | `#FFFFFF` |
| Bordure de champ | `#D3D9D6` |
| Texte | `#18201E` |
| Texte secondaire | `#5A6662` |
| Séparateurs | `#E6EAE7` |
| Étape (accent) | `#D9661F` sur `#FBE6D4` |
| Retard / erreur | `#B3261E` sur `#FDF1F0` |
| Information | `#2559A8` sur `#E3EAF8` |
| Soins (vermifuge, antiparasitaire) | `#7B4FC9` |
| Vaccin | `#2F6FD0` |
| Véto | `#C4423A` |
| Titres | Bricolage Grotesque 700 |
| Texte | Figtree 400–700, champs en 16 px minimum |
| Rayons | cartes 20–24 px, champs 14 px, boutons pilule |
| Hauteurs | champ 52 px, bouton principal 54 px, puce 40 px |
| Zones tactiles | 44 px minimum |

## Patrons récurrents

- **Formulaire plein écran** : « Annuler » en haut à gauche, titre centré, bouton « Enregistrer » fixé en bas.
- **Feuille** (ajout rapide, pesée) : glisse depuis le bas, poignée, tap sur le fond pour fermer.
- **Choix exclusif court** (récurrence, catégorie) : contrôle segmenté.
- **Choix parmi beaucoup** (type, tags) : puces qui passent à la ligne.

Les dates, poids et textes dans les maquettes sont des exemples, pas des données réelles.
