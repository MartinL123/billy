# Spec V1 — App Billy

**Objectif de la V1** : remplacer le carnet papier. Avoir toutes les dates importantes de Billy
au même endroit, garder ses souvenirs en photos et ses documents (carnet de santé, comptes rendus véto),
consultables même hors ligne, sans jamais rien perdre.

**Appareil** : iPhone, app installée sur l'écran d'accueil depuis Safari.

**Stockage** : Firebase, plan Spark gratuit. Les données sont dans Firestore, liées à mon compte,
consultables hors ligne et synchronisées automatiquement. Aucune sauvegarde manuelle, aucun coût.

**Hors périmètre V1** (prévu plus tard) : programme d'entraînement et module peurs (V2),
courbes de progression, « Ce jour-là », export .ics (V3).

Les maquettes de référence sont dans `docs/maquettes/` (voir le README pour la liste des écrans).

---

## Premier lancement

1. Écran de connexion : logo, e-mail, mot de passe, « Se connecter ». Pas d'inscription dans l'app :
   le compte est créé une fois dans la console Firebase. La session reste ouverte ensuite.
2. Si aucun profil n'existe : création automatique du profil de Billy pré-rempli
   (Billy, 13/05/2026, croisé épagneul × labrador, adoption le 19/09/2026), modifiable.
3. Les dates clés sont créées automatiquement (tableau du calendrier).

Maquette : `Connexion.dc.html`.

**Critères d'acceptation**
- [ ] Mauvais mot de passe : message clair sous le champ, sans effacer l'e-mail.
- [ ] Après connexion, fermer et rouvrir l'app ne redemande pas de se connecter.

---

## Navigation

Barre d'onglets en bas, 3 onglets : **Aujourd'hui · Calendrier · Journal**.
Avatar de Billy en haut à droite → **Profil**.
L'onglet Dressage sera ajouté en V2 (pas d'onglet vide en attendant).

---

## Écran 1 — Aujourd'hui (accueil)

Contenu, de haut en bas :

1. **Carte Billy** : photo, nom, âge en langage naturel (« 5 mois et 3 jours »).
   Les jours d'étape (6 mois, 1 an, anniversaire d'adoption), un message de célébration.
2. **Prochains événements** : les 3 prochains, avec date relative (« dans 4 jours »).
   Les événements en retard non faits apparaissent en premier, signalés visuellement.
3. **Dernier souvenir** : la dernière entrée du journal en miniature.
4. **Bouton « + »** flottant → feuille d'actions : *Photos*, *Note*, *Événement*, *Document*.
   - *Photos* ouvre directement la photothèque, puis le formulaire d'entrée avec les photos choisies.
   - *Note* ouvre le formulaire d'entrée sans photo.

Maquettes : `Main.dc.html`, `Ajout.dc.html`.

**Critères d'acceptation**
- [ ] L'âge est juste au jour près (tests sur les fins de mois et années bissextiles).
- [ ] Ajouter des photos depuis l'accueil = 2 taps (« + » puis « Photos ») avant la photothèque.
- [ ] Marquer un événement comme fait directement depuis la liste.

---

## Écran 2 — Calendrier & santé

- **Vue mois** avec pastilles colorées par type d'événement + **liste chronologique** en dessous.
- **Types** : Vaccin · Vermifuge · Antiparasitaire · Véto · Éducateur · Séjour · Étape · Autre.
- **Récurrence** : aucune, mensuelle, trimestrielle, annuelle. Marquer « fait » une occurrence
  récurrente crée automatiquement la suivante.
- **Poids** : section dédiée, ajout rapide dans une feuille (date + kg, clavier numérique),
  liste des dernières pesées (la courbe arrive en V3).
- **Formulaire d'événement** (plein écran) : type (puces), titre (pré-rempli selon le type), date,
  heure (optionnelle), récurrence, note, documents joints. Seuls type, titre et date sont obligatoires.
- Un événement avec document joint affiche une icône trombone ; un tap ouvre le document.

Maquettes : `Calendrier.dc.html`, `Evenement.dc.html`, `Pesee.dc.html`.

**Données pré-remplies au premier lancement**

| Événement | Date | Type | Récurrence |
| --- | --- | --- | --- |
| Anniversaire de Billy | 13/05 | Étape | Annuelle |
| Billy a 6 mois | 13/11/2026 | Étape | Aucune |
| Billy a 1 an | 13/05/2027 | Étape | Aucune |
| Anniversaire d'adoption | 19/09 | Étape | Annuelle |
| Rappel vaccin CHPPiL | à compléter | Vaccin | Annuelle |

**Critères d'acceptation**
- [ ] Créer, modifier, supprimer un événement (suppression avec confirmation).
- [ ] Une récurrence marquée faite génère bien l'occurrence suivante à la bonne date.
- [ ] La vue mois est utilisable au pouce sur 375 px de large.
- [ ] Choisir le type « Vermifuge » pré-remplit le titre et propose la récurrence trimestrielle.

---

## Écran 3 — Journal

- **Timeline** verticale, entrées les plus récentes en haut, groupées par mois.
- **Entrée** : date (par défaut aujourd'hui), texte, 0 à 10 photos importées, tags.
- **Tags** suggérés : balade, Bretagne, progrès, bêtise, éducateur, santé. Tags libres possibles.
- **Filtre** par tag en haut de la timeline.
- Tap sur une photo → plein écran avec balayage entre les photos de l'entrée.
- **État vide** : « Le premier souvenir de Billy commence ici », bouton « Importer des photos ».

Maquettes : `Journal.dc.html`, `Entree.dc.html`, `JournalVide.dc.html`.

**Critères d'acceptation**
- [ ] Importer 5 photos d'un coup depuis la photothèque iPhone.
- [ ] Les photos sont compressées avant envoi, avec une miniature.
- [ ] La timeline reste fluide avec 200 entrées (miniatures seulement dans la liste).
- [ ] Modifier et supprimer une entrée (et ses photos).

---

## Écran 4 — Profil

- Infos de Billy : nom, photo, date de naissance, race, date d'adoption, numéro de puce (Billy est pucé).
- Infos utiles : vétérinaire, éducateur (nom + téléphone, appel en un tap).
- **Documents** : carnet de santé, comptes rendus véto, ordonnances, certificat d'identification…
  - « Importer un document » : un PDF (app Fichiers) ou une ou plusieurs photos de pages (photothèque).
    Astuce affichée : « Pour scanner un papier, utilise l'app Notes ou Fichiers de ton iPhone, puis importe le PDF. »
  - Formulaire : titre, catégorie (Santé · Véto · Administratif · Autre), date, lien optionnel vers un événement.
  - Liste triée du plus récent au plus ancien, aperçu plein écran au tap, partage via le menu natif (Web Share API).
- **Compte** : e-mail connecté, état de synchronisation (« Tout est synchronisé » ou « 2 éléments en attente d'envoi »),
  « Se déconnecter » (avec confirmation).

Maquettes : `Profil.dc.html`, `Document.dc.html`.

**Critères d'acceptation**
- [ ] Importer un PDF de 3 Mo depuis l'app Fichiers et le rouvrir.
- [ ] Importer 3 photos de pages comme un seul document.
- [ ] Un document lié à un RDV véto est accessible depuis l'événement et depuis le profil.
- [ ] Se connecter sur un autre appareil affiche les mêmes données, photos et documents.
- [ ] Un ajout fait hors ligne apparaît « en attente », puis s'envoie seul au retour du réseau.

---

## Modèle de données (Firestore uniquement)

Tout est rangé sous l'utilisateur connecté : `users/{uid}/…`.

```ts
users/{uid}/dog/billy              { name, birthDate, breed, adoptionDate, photoFileId?, chip?, vet?, trainer? }
users/{uid}/events/{id}            { title, type, date, time?, recurrence, notes?, done, doneAt?, documentIds?: string[] }
users/{uid}/weights/{id}           { date, kg }
users/{uid}/entries/{id}           { date, text, tags: string[], photos: { fileId, thumbFileId }[] }
users/{uid}/documents/{id}         { title, category, date, eventId?, kind: 'pdf' | 'images', fileIds: string[], thumbFileId }
users/{uid}/files/{id}             { mimeType, size, data?: Bytes, chunkCount? }   // image : data ; PDF : chunks
users/{uid}/files/{id}/chunks/{n}  { data: Bytes }                                 // morceaux de 750 Ko
```

- Requêtes : `events` triés par `date`, `entries` par `date` (filtre `array-contains` sur `tags`), `documents` par `date`.
- Règles : lecture/écriture seulement si `request.auth.uid == uid` (fichier `firestore.rules`).
- Budget : 1 Gio gratuit ≈ 4 000 photos compressées. Afficher l'espace utilisé dans le profil au-delà de 70 %.

---

## PWA (iPhone)

- Installable depuis Safari : manifest complet, icônes 192 et 512 px, `apple-touch-icon` 180 px, `display: standalone`.
- Couleur de thème `#1E5A50`, fond `#F3F5F2`, accent étape `#D9661F` sur `#FBE6D4`.
- Polices : Bricolage Grotesque (titres), Figtree (texte), embarquées pour le hors ligne.
- Zones sûres iOS respectées (encoche, barre d'accueil).
- Icône à dessiner.

---

## Questions ouvertes

- Date de la dernière injection CHPPiL (pour caler le rappel annuel).
- Dates réelles du dernier vermifuge et du dernier antiparasitaire.

---

## Après la V1 (ajouté le 13/10/2026, d'après `docs/propositions.md`, sans maquettes)

- **V3** : courbe de poids dans le calendrier, « Ce jour-là » sur l'accueil (souvenirs d'il y a 1 semaine,
  1, 3, 6 mois, N ans), bouton « Ajouter au calendrier de l'iPhone » (fichier .ics) sur un événement.
- **V2 (remplacée)** : la partie Dressage décrite ci-dessous a été remplacée par `docs/spec-v2-dressage.md`, qui fait foi.
- **Ancienne V2** : onglet **Dressage**. Programme par thèmes (Bases · Propreté · Socialisation), une séance se note en
  un tap (Difficile · Ça vient · Réussi) ; un exercice est « Acquis » après 3 séances réussies d'affilée.
  Module peurs : exposition = déclencheur, niveau 1 à 5, distance tolérée ; tendance par rapport à la première.
  Série de jours consécutifs. Notes de l'éducateur = entrées du journal taguées « Éducateur ».

- **Dressage gamifié** (demandé le 13/10/2026) : tout est calculé à partir des séances et expositions, rien de plus n'est stocké.
  - Expérience : séance 10 / 15 / 20 XP (difficile / ça vient / réussi), jeu 15, exposition 15 (+10 si la peur baisse),
    exercice acquis +50 (une seule fois), mission +10, journée parfaite (3 missions) +20.
  - Niveaux : 100 XP pour le niveau 2, puis 50 de plus à chaque palier ; 12 titres de « Chiot curieux » à « Légende du quartier ».
  - Missions du jour : un exercice recommandé, le jeu du jour, un défi (exposition à une peur, ou 2e exercice).
  - Écran en 3 parties : **Du jour** (les 3 choses à faire, résultat noté en un tap sur la carte, « Annuler » possible),
    **Exercices** (tout le catalogue, jeux et peurs), **Progrès** (niveau, semaine, acquis, peurs, succès).
  - **Paliers** (demandé le 13/10/2026) : chaque ordre a 3 à 5 paliers de difficulté (durée, puis distance, puis distractions).
    Un palier se valide avec 3 réussites sur ses 4 dernières séances, ou d'office avec « Il sait déjà le faire » ;
    « Trop dur » fait redescendre. Après le dernier palier : entretien, jamais « fini ». +30 XP par palier validé par la pratique.
  - **Arbre** : un ordre ouvre les suivants (Assis → Pas bouger → Attends → Traverse ; Patte → L'autre patte → Tope là ;
    Couché → Au panier → Rester au panier…). Définition dans `src/lib/training.ts`.
  - Chaque ordre : un dessin, 2 ou 3 gestes, et sa **maîtrise** (note sur les 5 dernières séances, tendance en
    comparant les 3 dernières aux 3 d'avant). Un ordre en baisse devient l'ordre du jour.
  - Ordres **« plus tard »** (Traverse, Attends, Pas toucher, Au pied…) : proposés une fois leurs prérequis acquis.
  - **À mâcher** : une idée par jour (légumes congelés, Kong glacé…), +10 XP, hors missions. Liste dans `src/lib/chews.ts`.
  - Jeux : 9 jeux guidés, enregistrés comme séances `jeu-<id>`. Succès : 16 badges. Règles dans `src/lib/gamification.ts`.

```ts
users/{uid}/sessions/{id}    { date, exerciseId, result: 'difficile' | 'moyen' | 'reussi', note? }
users/{uid}/exposures/{id}   { date, trigger, fear: 1..5, distance?, note? }
```

---

## Ordre de développement

Le détail et les prompts sont dans `docs/prompts.md`.

1. Initialisation : Vite + React + TS + Tailwind + PWA iOS + déploiement GitHub Pages.
2. Firebase : connexion e-mail, Firestore hors ligne, règles, émulateurs, écran de connexion.
3. Types, seed du profil et des dates clés, utilitaire d'âge (+ tests).
4. Barre d'onglets + écran Profil (sans documents).
5. Calendrier : événements, formulaire, récurrences, poids.
6. Fichiers : compression, stockage en Bytes, découpage des PDF (+ tests).
7. Journal : entrées, import de photos, tags, état vide.
8. Écran Aujourd'hui (assemble les autres).
9. Documents : import, formulaire, lien aux événements.
10. Finitions : états hors ligne, icône, test complet sur iPhone.
