# Prompt Claude Code — 20 octobre 2026 : refonte V5 des 5 écrans principaux

Lis d'abord `docs/design/contexte-flair.md`, puis les maquettes `docs/maquettes/V5-*.dc.html` (sources HTML de la toile
« Flair — propositions », à lire comme référence visuelle : couleurs, tailles, espacements, textes, animations ; elles ne
s'ouvrent pas telles quelles). Toile en ligne : https://claude.ai/code/artifact/c16b477b-e33a-44de-87dc-1c7349ba5f5d.

**Pour ces 5 écrans, les maquettes V5 et ce prompt font foi sur la V4 et sur les maquettes V3/V4.** Tout le reste de la
V4 et de la V3 reste valable (3 onglets, os, boutique, logique des compétences, données).

Tickets Notion (Projet = Billy) : T-049 à T-054. **Un ticket = un commit** (plusieurs si c'est plus clair), dans l'ordre
ci-dessous. Après chaque commit poussé : ticket en « Révision du code » + ligne datée dans « Historique ». Ne passe rien en
« Done ». Quand les 6 tickets sont poussés, arrête-toi et demande à Martin de recetter sur l'iPhone.

## Décisions de Martin du 20 octobre (QCM)

- Santé : **version B** (calendrier replié sur la semaine).
- Balades : **version A** (un seul bouton « Affichage », plan par défaut, brouillard sombre).
- Compétences : **pattes + prochaine étape**, jamais « 3 sur 5 ».
- Accueil : **la carte du haut suit le moment de la journée** dès ce lot.
- Accueil : Boutique, Meute, « Compléter son profil », « Noter un souvenir » et « Explorer la carte » sont **déplacés** (détail plus bas).
- Fin de balade : **+3 os, comme noter un moment** (compte dans la limite de 3 par jour).
- Ouverture : **entrée seule après 1 s**.

## Règles communes (rappel)

390 × 844 d'abord, lisible à 320 × 568 et en texte agrandi ; une seule action principale (bouton plein orange) par écran,
visible sans défiler, dans la moitié basse ; zones ≥ 44 px ; WCAG AA ; espace insécable avant « ? ! : ; » ; dates
« 13 mai 2026 », heures « 19 h ». Mouvement : 150 ms au toucher (échelle 0,96), 250 ms transition, 400 ms apparition ;
`cubic-bezier(.2,.8,.3,1)` et ressort `cubic-bezier(.3,1.3,.5,1)` (panneaux du bas `cubic-bezier(.3,1.15,.5,1)`) ;
seulement `transform` et `opacity` ; tout coupé avec « Réduire les animations ». Écrans à barre d'onglets : marge basse
= barre + dépassement du rond Accueil + zone sûre (R-054). Logique dans `src/lib/` avec tests ; composants petits.

## 1. T-049 — Ouverture (`src/features/start/Opening.tsx`)

- L'animation « qui respire » reste ; l'app entre seule après 1 s. Un toucher entre tout de suite.
- « Réduire les animations » : entrée directe, sans attendre.

## 2. T-050 — Accueil (`V5-Accueil.dc.html`, `V5-AccueilMoment.dc.html`, `V5-Etat-PremierJour.dc.html`)

De haut en bas :
1. **En-tête** : photo ronde du chien (→ Billy), date, « Bonjour, [prénom] », pastille d'os (→ boutique). Inchangé.
2. **Carte du moment** (une seule, une seule action orange). Règle, dans cet ordre (la première qui s'applique) :
   1. un soin dû aujourd'hui ou en retard ;
   2. un repas dans les 30 minutes (règle existante) ;
   3. une sortie du profil entre 30 min avant et 1 h après son heure, pas encore notée : « Sortie du soir · 19 h »,
      « C'est l'heure de sortir [prénom] », « 15 min conseillées. Le tracé lève le brouillard sur la carte. »,
      bouton orange « Partir en balade » (iOS ; sur le web : « Je l'ai faite ») + pilule « Déjà faite » ;
   4. la mission du jour si elle n'est pas faite (carte actuelle : illustration, titre, une ligne, « Commencer » + « Autre idée ») ;
   5. après 21 h, si aucun souvenir noté aujourd'hui : « Avant de dormir · 30 s », « Racontez sa journée »,
      bouton « Noter un souvenir » ;
   6. sinon « Tout est fait pour aujourd'hui » + la dernière balade (jamais de carte vide).
   Changement de carte : apparition 400 ms (translation 16 px + opacité). La règle va dans `src/lib/` (fonction pure
   de l'heure et de l'état du jour), avec des tests pour chaque cas.
3. **Ses sorties du jour** : 3 pastilles côte à côte (Matin, Midi, Soir, avec l'heure du profil).
   - Faite : fond `primary-soft`, coche, durée (« 30 min »), apparition ressort.
   - À faire : contour pointillé, « + Noter » → panneau existant « Combien de temps ? » (présélection R-046). Après
     « C'est noté » : la pastille passe en « faite » et « +3 os » saute près du compteur.
   - En attente d'envoi (hors ligne) : petite mention « en attente » sous la durée.
   - Sous les pastilles, une phrase : « Encore la sortie du soir : 15 min conseillées. » / « Encore 2 sorties, 15 min
     conseillées chacune. » / « Toutes ses sorties sont faites. Belle journée pour [prénom] ! ». **Plus de barre ni de
     « 30 min sur 45 min »**, plus d'icône sombre.
   - Bouton contour « Partir en balade » seulement si la carte du moment n'est pas déjà une sortie.
4. **Faisons connaissance** (seulement tant que le questionnaire n'est pas fini) : « Faisons connaissance · 2 min »,
   pastille « +15 os », titre de la prochaine partie, 5 petits points (sans chiffre), pilule « Répondre ». Remplace la
   carte « Compléter son profil ».
5. **Sa vie avec vous** : 4 lignes dans une seule carte (icône dans un carré de couleur, titre, détail, chevron) :
   Ses progrès (« 3 compétences en route ») · Ses balades (« 4,7 km ensemble · 4 % de Saint-Ouen découvert ») ·
   Sa santé (« Tout est à jour » ou le soin en retard) · Ses souvenirs (« Le dernier : 19 octobre 2026 »).
6. Bandeau d'installation (web) inchangé, en bas.

Éléments déplacés (rien n'est supprimé de l'app) : Boutique → pastille d'os de l'en-tête et tuile de Billy ; Meute →
filtre « Spots de la meute » de Balades et tuile de Billy ; « Noter un souvenir » → ligne Ses souvenirs (bouton dans
l'écran Souvenirs) et carte du moment après 21 h ; « Explorer la carte » → onglet Balades ; « Importer mes balades » →
panneau de Balades (sur un compte qui n'a encore aucune balade, il reste aussi dans « Ses sorties du jour »).

## 3. T-051 — Balade en cours (`V5-BaladeEnCours.dc.html`, `V5-Etat-GPS.dc.html` ; `src/features/balades/LiveWalk.tsx`)

- Panneau du bas : surtitre « BALADE EN COURS AVEC [PRÉNOM] » avec un point orange qui clignote doucement ; « Durée »
  en « 15 min 17 s » (minutes en grand, secondes plus petites ; **plus de « 15:17 »**) ; « Distance » à droite ;
  quand la durée conseillée de la sortie rattachée est atteinte : pastille « Ses 15 min du soir sont faites » ;
  « Vous pouvez verrouiller l'iPhone : le GPS continue. » ; « Terminer » orange 58 px.
- « Ne pas garder » quitte le bas : pilule blanche en haut à gauche de la carte (croix + texte). Elle ouvre le panneau
  « Ne pas garder cette balade ? » avec **« Continuer la balade » en orange** et « Ne pas la garder » en contour rouge
  (plus de « Annuler » ambigu). Garder la logique R-042 / R-043 / R-045.
- Nouveau territoire : quand le tracé lève une zone de brouillard jamais vue, une pastille dorée tombe en haut de la carte
  (« Nouveau bout de territoire ! », ressort 400 ms, disparaît après 3 s ; le nom de la rue seulement si on l'a déjà
  sans réseau ni service payant).
- Signal faible (précision > 50 m depuis plus de 20 s) : bandeau blanc « Le GPS cherche le ciel. La balade continue, le
  tracé se recolle tout seul. », distance précédée de « ≈ », tracé en pointillés sur la portion douteuse.
- Fin de balade (après « Terminer », enregistrement réussi) : panneau « Belle balade ! » (coche qui saute), « 32 min
  10 s · 2,1 km avec [prénom] », pastilles qui apparaissent l'une après l'autre (80 ms) : « +3 os » (BONES.note,
  dans la limite de 3 notes par jour : si la limite est atteinte, pas de pastille d'os), « N nouveaux bouts de
  territoire » (si N > 0), « Sortie du soir notée » (si rattachée) ; bouton orange « Voir son territoire » (→ Balades
  avec cette balade mise en avant) et contour « Ajouter un souvenir ».

## 4. T-052 — Billy (`V5-Billy.dc.html` ; `src/features/billy/Billy.tsx`)

- En-tête : pilule « ‹ Accueil » et pastille d'os (→ boutique). Photo 76 px, prénom, « 3 mois · 6 mois le 10 janvier
  2027 » (âge + prochaine étape de vie).
- « Ce qu'il apprend » : une carte par compétence en cours, titre en phrase. Sous le titre, **une rangée de pattes = les
  étapes** : dorée pleine = acquise, pointillés qui « respirent » (1,6 s, échelle 1,15) = l'étape en cours, grise =
  à venir, et un petit trophée en dernier. Aucun chiffre. Libellé accessible : « 1 étape acquise, la suivante est en
  route ».
- Toucher une carte la sélectionne (bord vert 2 px) et l'ouvre : « PROCHAINE ÉTAPE » + la phrase de l'étape +
  « Voir tout son chemin › ». Une seule carte ouverte à la fois ; la première est ouverte par défaut.
- 4 tuiles 2 × 2 : La boutique (« 23 os à dépenser ») · La meute (« Les spots et les amis ») · Ce qui l'inquiète ·
  Son profil (« Puce, véto, réglages »).
- Action principale fixe en bas, au-dessus de la barre d'onglets : « S'entraîner · 3 min » (orange) → la mission de la
  compétence sélectionnée (la mission du jour si c'est la même).

## 5. T-053 — Santé (`V5-Sante.dc.html`, `V5-Etat-SoinEnRetard.dc.html` ; `src/features/calendar/`)

- Titre « Santé » + phrase d'état (« Tout est à jour. Rien à prévoir avant le 10 janvier 2027. » / « Une chose à faire,
  le reste est à jour. »).
- Calendrier dans une carte, **replié sur la semaine en cours** (7 jours, 1 ligne) ; pilule « Voir le mois » / « Voir la
  semaine » (déplie en 250 ms). Point de couleur sous les jours qui ont un événement (couleurs de soin du design system)
  ; aujourd'hui en `primary-soft` ; le jour touché en vert plein. Sous la grille, le détail du jour touché en toutes
  lettres (pastille de type + libellé), ou « Rien ce jour-là. »
- « Prochaine chose » : titre et date en clair (« Dimanche 10 janvier 2027 · dans 83 jours »). **Le bouton « C'est
  fait » n'apparaît que le jour J ou en retard** (règle aussi pour R-050 « Oslo a 6 mois »).
- Soin en retard : la carte passe en tête, pastille « À faire » contour rouge, « Prévu le 16 octobre 2026 »,
  « C'est fait » (orange) et « Le décaler » (contour) ; pastille rouge « 1 » sur l'onglet Santé. Seul cas de rouge.
- Lignes de suivi : Vaccins, Vermifuge (pastille « À jour »), Poids, Antiparasitaire (« Le prévoir » si aucun rappel),
  Repas, Documents ; chacune ouvre l'écran existant.
- Action principale fixe en bas : « + Ajouter un soin ou un RDV » (orange) → panneau en 2 temps : « Qu'ajoutez-vous ? »
  (6 grandes tuiles : Vaccin, Vermifuge, Antiparasitaire, Rendez-vous véto, Pesée, Autre) puis « Quand ? » (Aujourd'hui,
  Demain, Autre jour en 3 colonnes égales) + « Enregistrer ». L'heure, la note et la répétition se modifient ensuite
  dans l'événement (formulaire existant). Après enregistrement, la ligne apparaît dans « À venir » avec un ressort.

## 6. T-054 — Balades (`V5-Balades.dc.html` ; `src/features/balades/Explorer.tsx`)

- **Plan par défaut**, brouillard sombre et franc (vert sapin à environ 80 % d'opacité) qui laisse voir nettement les
  zones découvertes.
- En haut de la carte, 2 pilules blanches seulement : à gauche « Affichage » (ouvre un petit panneau : Plan / Satellite,
  2D / 3D) ; à droite « Me situer ». Plus de boutons + / − ni de boussole permanents (pincer pour zoomer ; la boussole
  apparaît seulement si la carte est tournée).
- Panneau du bas : surtitre « LE QUARTIER », titre « Le territoire de [prénom] », à droite **« 4 % découvert » en grand**
  et dessous une barre dorée ; une phrase (« Chaque balade lève le brouillard. Touchez-en une pour la revoir. ») ;
  filtres compacts (Mes balades · Spots de la meute · Ce mois) ; les balades en cartes qui défilent à l'horizontale :
  toucher une balade la met en avant (trait plus épais, les autres à 25 %) et la phrase décrit la balade ; toucher à
  nouveau désélectionne.
- Action principale : « Partir en balade » (iOS) ; sur le web, « Ajouter mes balades » (import).

## Critères de fin (à vérifier avant d'arrêter)

- À 390 × 844 et à 320 × 568 : sur chaque écran, un seul bouton plein orange, visible sans défiler ; aucun texte
  coupé ni de « ? » seul à la ligne ; rien sous le rond Accueil.
- Texte agrandi (iOS) : l'illustration de la carte du moment disparaît d'abord, puis la ligne d'aide ; le bouton
  principal reste visible (voir `V5-Etat-320.dc.html`).
- Hors ligne : bandeau calme « Pas de réseau. Tout ce que vous notez est gardé. » ; mentions « en attente » (voir
  `V5-Etat-HorsLigne.dc.html`).
- « Réduire les animations » coupe tout ; aucune animation sur autre chose que `transform` et `opacity`.
- Tests unitaires pour : la règle de la carte du moment, la phrase des sorties, l'affichage de « C'est fait » en Santé,
  les os de fin de balade (limite de 3 notes par jour), le repli du calendrier sur la semaine.
- `npm test` et la vérification TypeScript passent ; déploiement fait ; ajoute la section « Refonte V5 (20 octobre) »
  à `docs/maquettes/README.md` (liste des fichiers V5 et ce qu'ils montrent).
