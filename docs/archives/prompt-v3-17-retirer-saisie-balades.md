# Prompt Claude Code — retirer la saisie manuelle des balades et alléger (17 octobre)

Lis `CLAUDE.md`, puis l'audit UX (`docs/recherche/audit-ux-v3.md`, section « Retirer la saisie manuelle des balades »
et « Ordre de travail », lot A).

**Décision : les balades n'entrent dans Billy que par un fichier (Strava, GPX).** Plus aucune saisie de trajet à la
main. Les trajets déjà enregistrés restent dans le Carnet et sur la carte : n'efface aucune donnée.

Un commit clair par point :

1. **Retire le traceur** : « Tracer un nouveau trajet », le composant `Tracer` et son écran plein écran, « Modifier le
   trajet » dans le détail d'un moment. Supprime le code devenu inutile (pas de code mort), garde la lecture et
   l'affichage des trajets existants.
2. **Retire « Vos trajets habituels »** de Noter (et `users/{uid}/routes` n'est plus écrit ; les documents existants
   restent lisibles).
3. **Remplace « Ajouter une balade »** (Carnet et Exploration) par « Importer mes balades Strava », qui ouvre l'import
   de fichiers (import GPX existant pour l'instant ; l'écran complet arrive avec `prompt-v3-16`).
4. **Noter un souvenir** ne garde que : texte, photos, ressenti. Retire la carte « Le trajet » et la grille des
   10 compétences à cocher. La date est aujourd'hui par défaut et reste modifiable dans le détail après coup.
5. **Retire « Mode précis »** de l'écran d'exercice.
6. **Corrige « Il adore : Treat »** (texte anglais venu du questionnaire) : affiche le libellé français de la réponse,
   et n'affiche pas « autre » seul dans « Ses jeux ».
7. **Ouverture** : après la première fois, on arrive directement sur l'accueil, sans toucher l'écran d'ouverture.
8. **Carte de l'Exploration toute grise** (aucune tuile après 6 secondes, sur Chrome Mac, 17 octobre) : trouve la cause
   et corrige ; vérifie aussi sur iPhone.
9. Mets à jour les specs touchées (`docs/specs/trajets.md`, `docs/specs/carte-a-decouvrir.md` § 3) : le brouillard
   se lève avec les balades importées et, une seule fois, avec les anciens trajets tracés à la main.

Ne touche pas encore aux sorties du jour, à la meute ni à la barre d'onglets : ces changements viendront avec la V4
(maquettes `V4-*` sur le canvas, à valider). Garde la possibilité de placer une peur ou une réussite sur un trajet
importé (ce n'est pas une saisie de balade).
Vérifie chaque écran à 390 px. À la fin, dis-moi en 5 lignes ce qui a été retiré et ce qui reste à faire.
