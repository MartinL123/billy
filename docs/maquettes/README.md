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

## Refonte V5 (20 octobre, fait foi pour ces écrans)

Décisions de Martin du 20 octobre : Santé B (semaine repliée), Balades A (un seul bouton « Affichage », plan par défaut,
brouillard sombre), compétences en pattes + prochaine étape (jamais « 3 sur 5 »), carte du moment qui suit la journée,
+3 os par balade finie, ouverture qui entre seule après 1 s. Prompt : `docs/design/prompt-claude-code-2026-10-20.md`.

| Fichier | Écran | Code |
| --- | --- | --- |
| `V5-Accueil.dc.html` | Accueil : en-tête, carte du moment, « Ses sorties du jour » en 3 pastilles, « Sa vie avec vous » en 4 lignes | T-050 |
| `V5-AccueilMoment.dc.html` | Les variantes de la carte du moment (soin, repas, sortie, mission, soirée, tout est fait) | T-050 |
| `V5-Etat-PremierJour.dc.html` | Accueil du premier jour : « Faisons connaissance · 2 min » | T-050 |
| `V5-BaladeEnCours.dc.html` | Balade en cours : durée, distance, « Ne pas garder », fin « Belle balade ! » (+3 os) | T-051 |
| `V5-Etat-GPS.dc.html` | GPS faible : « Le GPS cherche le ciel », distance « ≈ », portion en pointillés | T-051 |
| `V5-Billy.dc.html` | Billy : photo, âge et prochaine étape de vie, une carte par compétence en pattes, 4 tuiles, « S’entraîner » | T-052 |
| `V5-Sante.dc.html` | Santé : phrase d’état, semaine dépliable en mois, prochaine chose, à venir, lignes de suivi, « + Ajouter » | T-053 |
| `V5-Etat-SoinEnRetard.dc.html` | Santé avec un soin en retard en tête (seul rouge de l’écran) et pastille sur l’onglet | T-053 |
| `V5-Balades.dc.html` | Balades : pilules « Affichage » et « Me situer », « 4 % découvert », balades en cartes horizontales | T-054 |
| `V5-Etat-320.dc.html` | Petit écran et texte agrandi : l’illustration disparaît d’abord, puis la ligne d’aide | T-050 |
| `V5-Etat-HorsLigne.dc.html` | Hors ligne : bandeau calme, mentions « en attente » | — |

## Refonte V3 (à jour, fait foi)

| Fichier | Écran |
| --- | --- |
| `V3-Ouverture.dc.html` | Ouverture : toucher le logo, accès au questionnaire |
| `V3-Questionnaire.dc.html` | Questionnaire de départ (une question par écran) |
| `V3-QuestionnaireResultat.dc.html` | Fin du questionnaire : ce qu'il sait déjà faire, modifiable (décocher / cocher), souvenir noté |
| `V3-Accueil.dc.html` | Accueil : la partie |
| `V3-Raconter.dc.html` | Raconter un moment (sans contexte : grille des compétences) |
| `V3-RaconterQuete.dc.html` | Raconter depuis la quête (compétence connue : pas de grille) |
| `V3-QueteExercice.dc.html` | Quête du jour : l'écran de l'exercice (comment faire, minuteur, « C'est fait ! ») |
| `V3-Reussite.dc.html` | « C'est réussi ! » (nouvelle étape) |
| `V3-Billy.dc.html` | Onglet Billy = l'arbre de compétences (3 étages reliés, badges, liens entre catégories) |
| `V3-Chemin.dc.html` | Le chemin d'une compétence (étapes, Billy posé dessus, trophée) |
| `V3-CheminEtape.dc.html` | Chemin : panneau après avoir touché une étape (décocher / cocher) |
| `V3-Profil.dc.html` | Profil de Billy (s'ouvre en touchant sa photo dans l'onglet Billy) |
| `V3-EnCours.dc.html` | Choisir ses 3 compétences en cours (depuis « Son programme » dans l'onglet Billy) |
| `V3-SanteAVenir.dc.html` | Santé, page entière comme l'app en ligne : suivis, calendrier, « À venir » filtré, exemple de rendez-vous véto, faits, poids, repas, documents |
| `V3-Carnet.dc.html` | Carnet : filtres (compétences puis étiquettes), cartes avec ressenti et compétences, marge sous le bouton + |
| `V3-Installer.dc.html` | Mettre l'app sur son téléphone (iPhone Safari, Android Chrome) + compte donné par Martin |
| `V3-Meute.dc.html` | Onglet Meute (5e onglet) : carte des spots, Marquer, aujourd'hui dans la meute, chiens, défi |
| `V3-Spot.dc.html` | Détail d'un spot : niveau de calme, infos, qui est passé, avis, Y aller / Marquer |
| `V3-Marquer.dc.html` | Marquer : choisir un spot à moins de 300 m ou en créer un |
| `V3-Marque.dc.html` | Fête après une marque : +os, territoire |
| `V3-ParcoursMeute.dc.html` | Les 7 parcours de la communauté (planche large, cliquable) |
| `V3-Connexion.dc.html` | Connexion : compte donné par Martin, pas d'inscription, lien vers l'installation |
| `V3-MeuteBienvenue.dc.html` | Première visite de l'onglet Meute + autorisation de position |
| `V3-NouveauSpot.dc.html` | Créer un spot : point, nom, catégorie, calme, infos |
| `V3-ChienProfil.dc.html` | Profil d'un chien de la meute (badges, territoire, moments partagés ; rien de privé) |
| `V3-Territoire.dc.html` | Territoire de Billy : carte, spots marqués, en commun avec un ami |
| `V3-RaconterPartage.dc.html` | Noter : interrupteur « Partager avec la meute » + aperçu |
| `V3-Compte.dc.html` | Mon compte : espace utilisé (80 Mo), mot de passe, installation |
| `V3-RaconterTrajet.dc.html` | Noter : carte « Le trajet » (trajets habituels, tracer un nouveau) |
| `V3-TracerTrajet.dc.html` | Tracer le trajet après coup : points sur la carte, distance, durée, trajet habituel |
| `V3-TrajetMoment.dc.html` | Placer un moment sur le trajet (peur, grogné, rappel, détendu) |
| `V3-CarnetTrajet.dc.html` | Détail d'un moment avec trajet : carte, moments, distance, durée |
| `V3-Boutique.dc.html` | La boutique : os, aperçu de Billy, accessoires à acheter / porter, comment gagner des os |

Les versions abandonnées 
## Territoires (V3)

| Territoire | Couleur | Fond | Compétences |
| --- | --- | --- | --- |
| La Maison | `#1E5A50` | `#DCEBE6` | Le Lien, Le Calme, Les Soins |
| Le Quartier | `#2559A8` | `#E3EAF8` | La Laisse, Le Rappel, Les Bonnes manières, La Nouveauté |
| Le Grand Monde | `#C2571A` | `#FBE6D4` | La Ville, Les Rencontres, Les Congénères |
| Maîtrisé / niveau | `#F2B544` | `#FCEFD3` | Badges complets, niveau |
| Os (monnaie) | contour `#8A6514` | `#F6E7C8` (icône) · `#FFF8E6` (cartes) | Solde, gains, prix |

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
