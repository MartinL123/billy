# App Billy — propositions

13 octobre 2026 · Martin

Version de travail en ligne : https://claude.ai/code/artifact/48aa5792-e296-4cde-9b1b-289aae6bbddf

## Inspirations

Les apps du marché couvrent chacune un seul usage ; l'app de Billy peut réunir les quatre.

| Type d'app | Exemples | Ce qu'on peut leur emprunter |
| --- | --- | --- |
| Dressage | Dogo, Puppr, Pupford | Exercices courts guidés, progression par niveaux, clicker intégré, séries quotidiennes |
| Carnet de santé | 11pets, Pawtrack | Vaccins, vermifuges, poids, rappels automatiques |
| Activité | Tractive, Woofz | Suivi des balades, durée et fréquence |
| Journal | Day One | Timeline photos, souvenirs « il y a 1 mois » |

## Fonctionnalités proposées

Barre d'onglets en bas : Aujourd'hui · Calendrier · Journal (+ Dressage en V2). Le profil de Billy s'ouvre via son avatar en haut.

### 1. Aujourd'hui (accueil)

- Âge de Billy en langage naturel
- Prochains événements, retards en premier
- Dernier souvenir du journal
- Bouton « + » : Photos (photothèque), Note, Événement, Document

### 2. Calendrier & santé

- Vaccins (CHPPiL fait, rappel annuel), vermifuge et antiparasitaire avec rappels récurrents
- Dates clés pré-remplies : 6 mois (13/11/2026), 1 an (13/05/2027), anniversaire d'adoption (19/09)
- Rendez-vous véto, séances avec l'éducateur, séjours en Bretagne
- Suivi du poids
- À prévoir : la rage n'est pas incluse dans CHPPiL ; elle est obligatoire pour voyager à l'étranger

### 3. Programme d'entraînement (V2)

- Programme par semaines : bases (assis, rappel, marche en laisse), propreté, socialisation
- Module « peurs » : chaque exposition notée (la ruelle, les enfants, le reflet la nuit) avec un niveau de peur sur 1-5 et la distance tolérée, pour suivre la progression et la montrer à l'éducateur
- Notes des séances avec l'éducateur
- Série de jours consécutifs d'entraînement

### 4. Journal

- Timeline photos + commentaires, filtrable par tag (balade, Bretagne, progrès, bêtise…)
- « Ce jour-là » : souvenirs des semaines passées (V3)
- Plus tard : un mur des « premières fois »

### 5. Documents

- Import d'un PDF (app Fichiers) ou de photos de pages : carnet de santé, comptes rendus véto, ordonnances, certificat d'identification. Le scan se fait avec Notes ou Fichiers sur l'iPhone.
- Lien optionnel vers un RDV du calendrier

## Côté technique

| Brique | Choix |
| --- | --- |
| Format | PWA installée sur l'iPhone depuis Safari, hors ligne, plein écran |
| Stack | Vite + React + TypeScript + Tailwind + vite-plugin-pwa |
| Données | Firebase plan Spark (gratuit) : connexion e-mail, Firestore avec cache hors ligne, photos et documents stockés dans Firestore |
| Hébergement | GitHub Pages, déploiement automatique à chaque push |

- **Données** : tout est rangé dans le compte Firebase, consultable hors ligne et synchronisé automatiquement ; aucune sauvegarde manuelle.
- **Coût** : 0 €. Pas de Cloud Storage (qui exigerait le plan payant Blaze) ; 1 Gio gratuit ≈ 4 000 photos compressées.
- **Rappels** : bouton « Ajouter au calendrier de l'iPhone » (export .ics) plutôt que des notifications push (V3).

## Découpage en versions

1. **V1** : connexion Firebase, profil de Billy, calendrier santé, journal photos, documents scannés
2. **V2** : programme d'entraînement + module peurs
3. **V3** : courbes de progression, souvenirs, export .ics
