# Spec V4 — Billy simplifié : une chose à la fois (17 octobre)

Origine : audit UX du 17 octobre (`docs/recherche/audit-ux-v3.md`). L'app empile environ 30 notions, 10 blocs sur
l'accueil et 4 boutons concurrents. La V4 garde les fonctions utiles et retire tout le reste.

**Principe : l'app propose, l'utilisateur confirme.** Chaque écran dit en une phrase ce qu'on fait maintenant, avec un
seul bouton principal en bas.

Maquettes : canvas, section « V4 — Billy simplifié » : `V4-Aujourdhui`, `V4-Mission`, `V4-MissionFin`,
`V4-Balades`, `V4-BaladesPleinEcran`, `V4-Sante`, `V4-Billy`, `V4-Noter`. Copies dans `docs/maquettes/` (Balades dans
`docs/maquettes/prive/`).

## 1. Décisions (17 octobre)
1. **3 onglets** : Balades · Aujourd'hui (gros bouton rond au centre) · Santé. Plus d'onglets Carnet, Billy ni Meute.
2. **Billy s'ouvre en touchant sa photo** en haut d'Aujourd'hui.
3. **Un seul système de récompense : les os** (et la boutique). On retire le niveau, le titre (« Explorateur »), les
   badges, les étages affichés partout et le défi de la meute. Le défi de la semaine devient une mission parmi
   d'autres (il peut être proposé dans « À faire maintenant »).
4. **Les balades n'arrivent que par fichier** (Strava, GPX) : voir `prompt-v3-17` et `carte-a-decouvrir.md`.
5. **Les sorties du jour se cochent toutes seules** quand une balade importée tombe dans un créneau (matin, midi,
   soir) ; plus de coche à la main.
6. **La meute passe dans Balades** : les spots sont un calque de la carte ; les amis sont dans Billy › Ses amis.
7. **On garde « placer une peur ou une réussite sur un trajet »** après l'import.
8. **Les noms de compétences deviennent des phrases** (« Rester détendu quand il entend un chien » au lieu de
   « Les Congénères »). Les noms courts restent dans l'arbre complet seulement.

Données : rien n'est supprimé. Niveaux, badges et étapes restent calculés si besoin, simplement plus affichés.

## 2. Aujourd'hui (`V4-Aujourdhui`)
- En-tête : photo ronde de Billy (→ Billy), date, « Bonjour Martin », pastille os (→ boutique).
- **Phrase de contexte** (17 px) qui dépend de l'heure et de ce qui reste : « Il est 17 h 40. Prochaine sortie à 19 h :
  d'ici là, 3 minutes de mission. »
- **Carte « À faire maintenant »**, une seule, choisie par une règle simple dans cet ordre :
  1. un soin dû aujourd'hui (antiparasitaire, vermifuge, médicament) ;
  2. un repas dans les 30 minutes ;
  3. la mission du jour si elle n'est pas faite ;
  4. la prochaine sortie si elle est dans moins d'une heure ;
  5. sinon : « Tout est fait pour aujourd'hui » + la dernière balade (jamais d'écran vide).
  La carte a une illustration, un titre en phrase simple, 2 lignes d'explication, **un bouton** (« Commencer ») et un
  lien discret « Une autre idée ».
- **Ensuite** : 2 lignes au plus (prochaine sortie, prochain soin), chacune touchable.
- Lien « + Noter un souvenir » (→ `V4-Noter`).
- Disparaissent de l'accueil : niveau, badges, aperçu de l'arbre, Occupation du jour, Faire un exercice, Noter (gros
  bouton), défi de la semaine en carte, sorties à cocher. Le bandeau d'installation reste tant que l'app n'est pas
  installée.

## 3. Mission pas à pas (`V4-Mission`, `V4-MissionFin`)
- Plein écran, sans barre d'onglets. En haut : bouton fermer (×, 44 px), barre de progression en segments, « 1 sur 3 ».
- Une étape par écran : petit rappel du titre de la compétence, **une consigne en gros** (30 px), 2 lignes d'aide,
  l'illustration, « Il vous faut : … » en pastille, bouton « Suivant ». Le minuteur se lance tout seul sur l'étape qui
  a une durée, et passe à l'étape suivante à la fin.
- Dernier écran : « Ça s'est bien passé ? » avec 3 grosses tuiles (Difficile · Bien · Super), puis l'écran « C'est
  réussi ! » existant (+ os). « Difficile » : la prochaine fois reprend un cran plus facile, sans rien retirer.
- La source et « Bon à savoir » passent sous un lien « En savoir plus » sur la dernière étape. « Mode précis » retiré.

## 4. Balades (`V4-Balades`, `V4-BaladesPleinEcran`)
- C'est l'écran de `carte-a-decouvrir.md` (carte qui se découvre, import Strava, idées, liste des balades), avec :
  - satellite par défaut, interrupteurs Plan / Satellite et 2D / 3D, brouillard en nuages blancs (§ 2 bis) ;
  - filtres en haut : « Mes balades · 12 », « Spots de la meute », « Ce mois » ;
  - panneau du bas : phrase « Chaque balade lève le brouillard. 2 % de Saint-Briac découvert », barre, dernière
    balade (→ liste `V3-Balades`), bouton « Ajouter mes balades Strava » ; on le glisse vers le bas pour la carte en
    plein écran (barre de 72 px restante).
- Les souvenirs sans trajet (une photo, une note) apparaissent dans la liste des balades, à leur date.

## 5. Santé (`V4-Sante`)
- Titre + phrase d'état (« Tout est à jour. Une seule chose à prévoir. »).
- **Le calendrier du mois, visible tout de suite** (demande de Martin), avec un point de couleur les jours où il se
  passe quelque chose ; toucher un jour affiche ses événements sous le calendrier.
- Carte « Prochaine chose à faire » : titre, date en clair (« Dimanche 25 octobre · dans 8 jours »), bouton
  « C'est fait ».
- 5 lignes touchables : Vaccins, Vermifuge (pastille « À jour » si c'est le cas), Poids, Repas, Documents. Chaque
  ligne ouvre l'écran détaillé existant.
- Lien « Voir tous les événements » (la liste « À venir » et « Faits » actuelle).

## 6. Billy (`V4-Billy`)
- Ouvert depuis la photo d'Aujourd'hui ; retour « ‹ Aujourd'hui ». Pas d'onglet actif dans la barre.
- Grande photo, nom, « 5 mois · croisé épagneul × labrador ».
- **Ce qu'il apprend en ce moment** : les 3 compétences en cours en phrases simples, chacune avec « 3 sur 5 » et une
  barre ; toucher → son chemin.
- Bouton contour « Voir tout son chemin » (l'arbre actuel, inchangé pour l'instant).
- 4 lignes : Ce qui l'inquiète (résumé en une ligne des réactions « a peur » / « un peu inquiet ») · 42 os · la
  boutique · Ses amis de la meute · Son identité, vos réglages (profil, véto, notifications, compte).

## 7. Noter un souvenir (`V4-Noter`)
- 3 champs : photo (grande zone), « Un mot ? », « Comment c'était ? » (3 tuiles). Bouton « Enregistrer ».
- La date est aujourd'hui ; modifiable ensuite dans le détail.

## 8. Mots
- Tutoiement non ; vouvoiement comme aujourd'hui. Phrases courtes, verbes d'action sur les boutons.
- Jamais un nom de catégorie seul sur un écran principal.
- Les nombres affichés à l'utilisateur : os, kilomètres, pourcentage découvert, « 3 sur 5 ». Rien d'autre.

## 9. Critères d'acceptation
- Sur Aujourd'hui, à 390 px, un seul bouton plein est visible sans défiler.
- Un nouvel utilisateur comprend en 10 secondes quoi faire (à tester avec le testeur : « Que feriez-vous
  maintenant ? »).
- La mission se fait à une main, sans lire plus de 3 lignes par écran.
- Aucune donnée perdue : les anciens moments, os, étapes et trajets sont toujours là.
