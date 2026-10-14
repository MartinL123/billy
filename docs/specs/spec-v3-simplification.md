# Spec V3 — Billy, le jeu (simplification)

**Objectif** : qu'une personne peu à l'aise avec un téléphone comprenne l'app en 30 secondes, ait l'impression de jouer,
et voie **concrètement** ce que son chien a appris, y compris avant l'app.

Ce document **fait foi** et remplace `docs/specs/spec-v2-dressage.md` là où ils divergent. La logique déjà codée
(boss, paliers, XP, validations, Firestore) est **réutilisée** : on change surtout ce que l'on montre et la façon de saisir.
Contexte et constats : `docs/recherche/audit-ux.md`. Maquettes : `docs/maquettes/V3-*.dc.html`.

**L'app n'utilise aucune IA** : aucune analyse de texte, aucune suggestion automatique. Tout choix est fait par l'utilisateur.

---

## 0. Règles qui ne bougent pas

- Rien ne baisse à cause d'un mauvais jour : une étape acquise le reste. Seule une **correction volontaire** (décocher
  une étape) change ce qui est acquis, et donc le niveau.
- **Pas de points à comparer** : aucun total d'XP n'est affiché ; le niveau dépend de ce que le chien sait faire.
- Aucune compétence verrouillée ; aucune série quotidienne ; aucune notification culpabilisante.
- L'app ne récompense jamais le fait de rapprocher le chien de ce qui lui fait peur.
- Les données existantes (séances, expositions, journal, validations) restent valides et comptent.

## 1. Quatre notions, pas une de plus

| Notion | Ce que voit le joueur | Remplace (V2) |
|---|---|---|
| **Le niveau de Billy** | « Niveau 8 · Explorateur », calculé à partir des étapes acquises ; barre vers le niveau suivant | Rang + niveau global + XP affichée |
| **Ce qu'il sait faire** | Pour chacune des 10 compétences, des **étapes** en phrases concrètes : « Revient quand on l'appelle à la maison ✓ », « Prochaine étape : revient dans un parc calme » | Boss + paliers + arbre + radar + étoiles |
| **Le Carnet** | Tout ce qu'on vit avec Billy, noté librement, avec photos | Journal + séances + expositions |
| **Les os** (ajout du 14/10) | La monnaie de l'effort : gagnée en faisant ses missions, dépensée dans la boutique (§ 2 bis) | — |

On ne **compte** pas les étapes et on n'affiche **aucune note** (ni étoiles, ni « 3/5 », ni pourcentage).
On montre **ce que le chien sait faire**, en mots. C'est ce qui intéresse vraiment un propriétaire.
La progression se **voit** comme dans un jeu (badges colorés par territoire avec un anneau qui se remplit, chemin
de niveaux avec Billy posé dessus, trophée « Maîtrisé ») mais **ne se compte pas** : aucun chiffre d'étapes à l'écran.

Vocabulaire **banni de l'interface** : boss, palier, P1–P5, N1–N5, étoile, exposition, déclencheur, retraite stratégique,
seuil, stats, rang, **XP** (le mot et les chiffres d'XP disparaissent de l'interface). Correspondances :

| Interne (code, Firestore) | Affiché |
|---|---|
| boss | compétence (« Le Rappel ») |
| palier P1…P5 | étape, toujours désignée par sa phrase (« Revient dans un parc calme ») |
| validation d'un palier | « C'est réussi ! » (le compteur 3 fois / 3 jours reste interne, affiché en petits points) |
| exposition | « Une situation qui lui fait peur » |
| retraite stratégique | « On s'est éloignés » (et c'est bien) |
| réaction 0–4 | 3 visages : Difficile / Bien / Super (0–4 seulement en mode précis) |
| quête (V2) / quête du jour (V3) | « Mission du jour » (une par jour) ; « Défi de la semaine » (un par semaine) |
| météo de confiance | voir « Avant / maintenant » (§ 5.4) |

## 2. Le niveau de Billy (la partie) — décision du 13/10 : plus d'XP affichée

Deux choses séparées :
- **Ce que Billy sait faire → le niveau.** Calculé, jamais stocké : **niveau = 1 + (étapes acquises ÷ 2, arrondi en
  dessous)**, de 1 (aucune étape) à 26 (les 50 étapes). Une étape acquise avant l'app compte comme les autres.
  Décocher une étape (correction) recalcule le niveau ; un mauvais jour ne retire jamais rien.
- **L'effort du maître → visible, jamais transformé en score.** Noter, faire la quête, réussir une fois une étape :
  ça se voit dans le jeu (les 3 petits points de l'étape en cours, l'anneau du badge, la semaine en pastilles de
  « Son programme »), sans points ni total.

Titres selon le niveau : N1–3 **Chiot curieux** · N4–7 **Apprenti** · N8–12 **Explorateur** · N13–18 **Compagnon** ·
N19–25 **Complice** · N26 **Légende** (tout l'arbre maîtrisé).

Barre de niveau : « Encore 1 étape avant le niveau 9 » (jamais de chiffre d'XP). Passage de niveau : plein écran court
(photo, « Niveau 8 ! Billy devient Explorateur »), « Continuer », ajouté au Carnet. Après une correction qui fait
baisser le niveau : simple bandeau « Niveau recalculé », sans écran ni son.

Ce qui remplace les « +XP » : la quête et le défi indiquent **ce qu'ils font avancer** (« ▲ Le Rappel ») ; le bouton
« Enregistrer » n'affiche plus de gain ; l'écran « C'est réussi ! » affiche « ▲ Le Lien avance ».
Les photos et les jours de repos ne changent rien au niveau, mais comptent dans la semaine de « Son programme ».
Le champ `xp` déjà enregistré dans les moments est conservé mais n'est plus lu ni affiché.

## 2 bis. Les os et la boutique — décision du 14/10

Retours d'un testeur : « faire des missions qui rapportent quelque chose », « récompenser et challenger ». On garde
le niveau = ce que Billy sait faire (§ 2) et on ajoute une **monnaie de l'effort du maître : les os** (icône os dessinée,
crème `#F6E7C8` contour `#8A6514`, jamais un émoji).

**Gagner des os** (jamais en perdre, ni par une correction, ni par un mauvais jour) :

| Action | Os |
|---|---|
| Mission du jour faite (« C'est fait ! ») | +10 |
| Noter un moment (3 fois par jour au maximum) | +3 |
| Une réussite sur l'étape en cours (« Oui ») | +5 |
| Nouvelle étape acquise dans l'app (pas les étapes « Il savait déjà ») | +25 |
| Défi de la semaine réussi | +30 |
| Semaine régulière : au moins 5 jours notés sur 7 (bonus du dimanche soir) | +20 |
| Jour de repos respecté (le lendemain d'un « Difficile » ou le repos de la semaine) | +5 |
| Questionnaire de départ terminé (une fois) | +50 |

Les photos ne rapportent rien. Décocher une étape ne retire aucun os. Ordre de grandeur : environ 120 à 180 os par
semaine régulière, soit un objet de la boutique par semaine.

**Où on les voit**
- Onglet Billy : sous le niveau, une carte-bouton dorée aérée (≥ 76 px de haut) : os dans un rond blanc, « 240 os » en grand,
  « Pour vos efforts » dessous (une seule ligne), et à droite une pastille contour « Boutique › ».
- Mission du jour et défi de la semaine : **une seule pastille** « +10 [os] » (« +30 » pour le défi) dans le bandeau
  de la carte, rien d'autre. La compétence travaillée est dans la ligne sous le titre (« Le Rappel · 3 min · en longe
  au parc ») ; plus de « ▲ Le Rappel » ni du nom du territoire dans le bandeau (carte allégée le 14/10).
- Après « C'est fait ! » ou « Enregistrer » : bandeau « +10 os » avec l'os qui saute (désactivé si
  `prefers-reduced-motion`).
- Jamais de total d'os comparé à quelqu'un d'autre.

### 2 bis.1 La boutique (maquette `V3-Boutique`)
- En-tête : retour « L'arbre », solde « [os] 240 » ; titre « La boutique ».
- **Aperçu** : la photo de Billy avec ce qu'il porte (« Porte : bandana rouge ») ; toucher un objet l'essaie sur
  l'aperçu avant d'acheter.
- Catégories en pastilles (défilement sans barre) : **Accessoires** (bandana, nœud papillon, casquette, lunettes,
  couronne, cape…) · **Cadres photo** · **Fonds de l'arbre** (automne, neige, bord de mer…) · **Stickers du Carnet** ·
  **Couleurs de l'app** (variantes qui gardent les contrastes AA ; les couleurs des territoires et de l'action ne
  changent jamais).
- Carte d'objet : illustration, nom, puis un seul bouton selon l'état :
  « Acheter · 120 [os] » (contour doré) · « Porter » (contour vert, déjà acheté) · « Porté ✓ » (vert plein) ·
  « Encore 60 [os] » (gris, pas assez d'os ; jamais rouge).
- Acheter ouvre un panneau du bas : aperçu, prix, « Acheter » / « Pas maintenant » ; puis bandeau « C'est à vous ! ».
- En bas : « Comment gagner des os » (le tableau ci-dessus) et la phrase « Les os récompensent vos efforts, pas ce que
  Billy sait faire : ils ne se perdent jamais. »
- Ce qu'on porte apparaît partout où il y a la photo du chien (accueil, arbre, profil, chemin).
- Prix de départ : stickers 40, accessoires 60 à 300, cadres 80 à 120, fonds de l'arbre 200 à 250, couleurs 300.
  Le catalogue vit dans le code (`src/content/shop.ts`).

### 2 bis.2 Le défi de la meute (version simple, décidée le 14 octobre)
On compare **l'effort, jamais le chien** : pas de classement des compétences, pas de « qui y arrive le plus vite »
(chaque chien a son âge et ses peurs ; la compétition pousserait vers ce qui lui fait peur).
- **Un seul défi commun par semaine** pour toute la meute, automatique (pas d'invitation, pas de création de défi) :
  « Chacun fait sa mission 5 jours cette semaine ».
- Dans l'onglet Meute : la carte du défi avec, pour chaque chien, ses 7 pastilles de la semaine (jour fait ou non) et
  « 3/5 ». Rien d'autre : ni niveau, ni étapes, ni photos.
- Récompense : +40 os pour chaque chien qui a tenu, et un sticker « Meute » dans la boutique au premier défi tenu.
- Lundi : nouveau défi, l'ancien disparaît sans message de reproche. Rien n'est perdu si on n'a pas tenu.
- Plus tard seulement : d'autres formats de défis, réductions de partenaires.

## 3. Noter ce qu'on a fait (l'action principale)

**Pourquoi cette action existe** : c'est la seule façon pour l'app de savoir ce que Billy a fait. Chaque note compte dans la
semaine de « Son programme », peut valider l'étape en cours d'une compétence, et garde un souvenir daté dans le Carnet. Vocabulaire :
**« Noter »** partout (jamais « Raconter »).

Accès : le gros bouton de l'accueil « Noter ce qu'on a fait », et le premier choix du « + ».

Un seul écran, de haut en bas :

1. **« Qu'avez-vous fait ? »** — champ texte libre, 3 lignes, gros. Optionnel si une photo est ajoutée.
2. **Ajouter des photos** — bouton contour (photothèque).
3. **Quand ?** — Aujourd'hui (défaut) · Hier · Autre date.
4. **Comment ça s'est passé ?** — 3 grands boutons visage : **Difficile** · **Bien** · **Super**.
5. **« Vous avez travaillé quoi ? »** — grille de **10 tuiles** (icône + nom), 2 colonnes, 64 px de haut.
   On en touche 0, 1 ou plusieurs ; une tuile choisie devient verte avec une coche.
   Ordre : les 3 compétences **utilisées le plus récemment** en premier, puis les autres dans l'ordre Les bases → Le monde.
   **Aucune présélection automatique.** Choisir est facultatif : un moment sans compétence reste un souvenir.
6. **Pas de question « Il a eu peur ? »** : l'app le déduit. Un moment est une **situation de peur** quand le ressenti est
   « Difficile » **et** qu'une compétence de peur est choisie (La Ville, Les Rencontres, Les Congénères, La Nouveauté).
   Dans ce cas seulement, une case apparaît sous un petit intitulé contextuel (« C'était difficile en ville : qu'avez-vous
   fait ? ») : **« On s'est éloignés pour qu'il se sente mieux »**.
7. Pour chaque compétence choisie : carte « **Prochaine étape : *[phrase de l'étape]*. C'est réussi ?** » Oui / Pas encore,
   avec 3 petits points montrant où on en est (« encore 2 fois, un autre jour »).
8. Bouton plein en bas : **« Enregistrer »** (sans gain affiché).

Après enregistrement : bandeau « Noté ! » (et les petits points de l'étape avancent si « Oui »), puis retour à l'accueil. Le moment apparaît dans le Carnet.

### 3.1 Ne jamais demander ce qui est évident

L'écran s'adapte à **d'où l'on vient** : une question dont la réponse est déjà connue n'est pas affichée.

| On arrive depuis… | La compétence est connue | Ce qui change à l'écran |
|---|---|---|
| La mission du jour (« C'est fait ! ») | Oui, et elle est fixe | Pas de grille « Vous avez travaillé quoi ? ». À la place, une pastille « Pour : Le Rappel » (couleur du territoire) suivie de « Mission du jour », **non modifiable** : le moment vient d'une quête précise. Le texte est pré-rempli avec la mission. |
| La fiche d'une compétence ou un badge (« Noter ») | Oui | Pas de grille ; ligne « Pour : [compétence] » + « Changer ». |
| La fin d'un exercice (« Faire un exercice ») | Oui | Pas de grille ; ligne « Pour : [compétence] » + « Changer ». |
| L'accueil (« Noter ce qu'on a fait ») ou le « + » | Non | Grille des 10 compétences (facultative), comme décrit ci-dessus. |

Même logique pour les autres questions :
- **Aucune question « Il a eu peur ? »** : la peur se déduit du ressenti « Difficile » + compétence de peur (§ 3, point 6) ;
  la case « On s'est éloignés » n'apparaît que dans ce cas.
- **« Quand ? »** : supprimé quand on vient de la mission du jour : c'est forcément aujourd'hui, **pas de « Changer la
  date »**. Depuis la quête, l'écran commence par une carte **« Ajouter des photos et/ou un commentaire »** (facultatif) :
  le champ texte pré-rempli avec la mission + le bouton contour « Ajouter des photos » ; puis le ressenti, puis la carte
  « Prochaine étape ». Le choix de la date reste uniquement dans « Noter ce qu'on a fait » depuis l'accueil (pour noter
  un moment passé).
- La carte « Prochaine étape : … C'est réussi ? » s'affiche directement pour la compétence connue.

## 4. Questionnaire de départ

**Contenu détaillé, question par question : `docs/specs/questionnaire-depart.md` (fait foi).**

- **Le but** : connaître le chien (identité, santé, quotidien), savoir comment il réagit et ce qu'il sait déjà faire,
  pour qu'il démarre au **bon niveau** (un chien âgé et éduqué peut démarrer avec toutes les étapes) et que l'app sache
  **quoi proposer chaque jour** (§ 5.9).
- 5 parties dans cet ordre : identité → santé → quotidien → réactions (phrases à trous) → ce qu'il sait déjà faire.
- **Quand** : il s'ouvre automatiquement après le toucher du logo **tant qu'il n'est pas terminé** (« Continuer plus tard »
  toujours possible) ; il reste accessible depuis l'écran d'ouverture et le profil (photo de Billy) pour revoir ou corriger.
- Pré-rempli avec ce que l'app sait déjà ; on confirme au lieu de retaper.
- **Une réponse ne compte qu'après « Suivant »**, jamais à la simple ouverture d'un écran pré-rempli.
- Chaque réponse est enregistrée immédiatement : on reprend où on s'était arrêté.
- **Le résultat est modifiable** (maquette `V3-QuestionnaireResultat`) : les étapes « déjà acquises » sont des cases à
  cocher rangées par compétence ; on décoche si on s'est trompé, le niveau se recalcule en direct, avec « Annuler ».
  Ce n'est pas une baisse : c'est une correction avant le départ (seules les étapes `preApp` sont concernées).
  Après « Noter un souvenir », la carte devient « Souvenir noté dans le Carnet » + « Un autre ». Détail :
  `questionnaire-depart.md`, partie 5.
- Les anciennes étiquettes de caractère (« Il a peur facilement », « plein d'énergie »…) disparaissent : l'app déduit
  le mode craintif des phrases de la partie 4, chiot / senior de la date de naissance.

## 5. Écrans

### 5.1 Écran d'ouverture
À chaque ouverture de l'app :
- Fond vert, **grand logo** (patte) au centre avec le nom « Billy », la photo du chien dans le logo si elle existe.
- **On touche le logo pour entrer** (zone ≥ 200 px, texte « Touchez pour entrer » sous le logo, légère pulsation ;
  respecter `prefers-reduced-motion`).
- En bas : bouton contour clair **« Questionnaire de départ »** avec son état (« À compléter · 6 réponses sur 15 »
  ou « Complété · revoir mes réponses »). Il ouvre le questionnaire (§ 4) ; à la fin, retour à l'écran d'ouverture.
- À la toute première connexion, le questionnaire s'ouvre directement après le toucher du logo.

### 5.2 Navigation : l'accueil au centre (décision du 14 octobre)
**Carnet** · **Santé** · **ACCUEIL** · **Billy** · **Meute**
- L'accueil est au centre, en gros : rond de 66 px couleur `primary` (#1E5A50), icône maison blanche 30 px, bord blanc
  de 5 px, ombre douce, qui dépasse de 26 px au-dessus de la barre ; libellé « Accueil » aligné avec les autres.
- Carnet et Santé à gauche, Billy et Meute à droite. Onglet actif : icône dans une pilule `primary-soft` (pour l'accueil :
  libellé en gras et ombre plus marquée). Barre de 88 px, 5 colonnes égales, libellés 13 px.
- Tant que la meute n'existe pas (prompt v3-14) : même grille de 5 colonnes, Billy occupe les 2 dernières
  (`grid-column: span 2`), pour que l'accueil reste au centre de l'écran. Jamais d'onglet « bientôt ».
- *Carnet* = l'ancien Journal (+ séances et situations notées). *Santé* = Calendrier + poids + documents.
- *Billy* = ce qu'il sait faire (§ 5.4) ; le profil s'ouvre en touchant sa photo. L'onglet Dressage disparaît.

### 5.3 Accueil (de haut en bas)
1. **Carte personnage** : photo de Billy dans un anneau de progression, « Niveau 8 · Explorateur », « Encore 1 étape avant
   le niveau 9 », et en sous-titre l'âge et la prochaine étape de vie (« 5 mois · 6 mois le 13 novembre »).
   Toute la carte ouvre l'onglet Billy.
2. **Tant que le questionnaire n'est pas terminé** : carte orange « Terminez le questionnaire : Billy gagnera ses
   premières étapes » + bouton plein. Elle disparaît une fois le questionnaire fini.
3. **Mission du jour** (§ 5.9) : grande carte de jeu, à la couleur du territoire, avec son icône, la mission en une phrase,
   la durée et ce qu'elle fait avancer (« ▲ Le Rappel ») et deux boutons : **« C'est fait ! »** (plein, à la couleur du
   territoire) et « Autre idée » (contour). C'est la seule exception à la règle « bouton principal orange » : la carte
   de quête est un objet de jeu, identifiable à sa couleur.
4. **Gros bouton orange** : « Noter ce qu'on a fait » · bouton contour « Faire un exercice ».
5. **Ses badges** : rangée horizontale défilante des 10 badges de compétences (§ 5.4), en petit : on voit d'un coup d'œil
   le monde de Billy et ce qui avance. Toucher un badge ouvre son chemin.
6. **Défi de la semaine** : un seul, concret et **toujours sûr** (jamais vers une situation de peur), tiré des étapes en
   cours de Le Lien, Le Calme, Les Bonnes manières, ou « 2 balades dans un lieu calme ». Exemple : « 3 fois le jeu du
   prénom cette semaine ». 3 petits points et ce qu'il fait avancer (« ▲ Le Lien »).
7. **Dernière réussite** (seulement s'il y en a une) : « Il y a 3 jours : revient quand on l'appelle à la maison ».
8. **Aujourd'hui** : repas, soins à venir ; puis occupation du jour.

Pas de bouton « + » flottant sur l'accueil (le gros bouton orange suffit) ; il reste dans Carnet et Santé.
Pas de carte « Ce qu'il sait faire · Voir les compétences » (doublon de la carte personnage).

### 5.4 Onglet Billy : l'arbre de compétences (l'écran « jeu »)

**Tout l'onglet est l'arbre de compétences** : un écran de jeu, pas une liste. Les 10 compétences sont des **badges**
rangés dans **3 territoires colorés**, présentés comme les 3 étages d'un arbre :

| Territoire | Couleur | Compétences |
|---|---|---|
| **La Maison** (les bases) | vert `#1E5A50` sur `#DCEBE6` | Le Lien, Le Calme, Les Soins |
| **Le Quartier** (le quotidien) | bleu `#2559A8` sur `#E3EAF8` | La Laisse, Le Rappel, Les Bonnes manières, La Nouveauté |
| **Le Grand Monde** | orange `#C2571A` sur `#FBE6D4` | La Ville, Les Rencontres, Les Congénères |

De haut en bas :
1. **En-tête** : photo (touchable → profil), titre « L'arbre de Billy », « Niveau 4 · Apprenti », barre de niveau.
2. Une phrase : « Ses compétences poussent en 3 étages, de la maison au grand monde. Touchez-en une pour voir son chemin
   et vous entraîner. » Puis la carte **« Son programme »** :
   - une ligne : « 3 compétences en cours · séances de 3 min (5 min dès ses 6 mois, le 13 nov.) ». L'arbre est le même à tout
     âge : seule la durée des séances dépend de l'âge ;
   - **la semaine en 7 pastilles** (L à D) : coche verte = jour où quelque chose a été noté, contour orange = aujourd'hui,
     pointillé = à venir, lune = jour de repos. Rien n'est « raté » : un jour sans rien reste en pointillé, sans rouge ;
   - rappel : « Un jour de repos par semaine, et toujours le lendemain d'un moment difficile. » ;
   - bouton contour **« Choisir ses compétences en cours »** : le maître choisit lui-même ses **3 compétences en cours**
     au maximum (pré-remplies par l'app à partir du questionnaire). La mission du jour tire ses exercices de ces 3-là.
     Écran **« En cours »** (maquette `V3-EnCours`) :
     - titre « Sur quoi travailler en ce moment ? » + explication : jusqu'à 3 compétences ; les autres reviennent de temps
       en temps en révision ;
     - pastille « 3 choisies sur 3 » ;
     - les 10 compétences rangées par étage, chacune en ligne de 64 px : icône, nom, prochaine étape, case à cocher
       (ligne entière cliquable ; cochée = fond et contour du territoire) ;
     - compétence maîtrisée : pastille « Maîtrisé », pas de case (révisée automatiquement) ;
     - indications calculées à partir du questionnaire, sans IA : « Conseillé : … » (ex. Les Soins avant une visite
       véto prévue dans le calendrier) et « Tout doux : … » sur les compétences liées à une peur déclarée ;
     - à 3 cochées, toucher une 4e affiche « Pour en choisir une autre, décochez-en d'abord une. Ce qu'il a déjà
       appris reste acquis. » ;
     - bouton plein orange « Enregistrer » en bas ; retour vers l'arbre.
3. **Les 3 étages**, une grande carte par territoire, dans l'ordre : *Étage 1 · les racines* (La Maison), *Étage 2 · le
   tronc* (Le Quartier), *Étage 3 · les branches* (Le Grand Monde). Pas de connecteur dessiné entre les cartes
   (l'ancien « morceau de tronc » brun est supprimé) : le lien entre étages passe par les cartes « Mène au … ». Dans chaque carte :
   - en-tête : icône du territoire, « Étage N · … », nom, phrase (« Là où tout commence ») ;
   - les badges en **grille de 2 colonnes** :
     - grand cercle coloré avec l'icône, entouré d'un **anneau en 5 segments** qui s'allument au fil des étapes (aucun
       chiffre affiché) ; nom ; **l'étape en cours en 4 à 6 mots** ou « À découvrir » ;
     - **doré « Maîtrisé · à entretenir »** quand les 5 étapes sont acquises ;
     - les **3 compétences en cours** portent une pastille « En cours » (couleur du territoire) et, sous l'étape, une
       étiquette ▶ avec **l'exercice du moment** (« Jeu du prénom ») ; elles remplacent l'ancienne pastille « Conseillé » ;
     - le texte de l'étape est la **prochaine étape à valider**, en phrase (`phrases.ts`) ; badge sans étape : couleurs
       pâles, « À découvrir », jamais grisé ni cadenassé ;
     - exercices, réglages et durées par étape : `docs/specs/arbre-competences.md` ;
     - toucher un badge ouvre son chemin (§ 5.5 : étapes datées, « S'entraîner · 5 min ») ;
   - en bas, une **carte-lien vers la catégorie liée** (contour et pastille flèche à la couleur de la catégorie cible),
     qui fait défiler jusqu'à elle. Les compétences ne sont pas reliées une à une :
     - La Maison → « Mène au Quartier · Le lien et le calme préparent les balades » ;
     - Le Quartier → « Mène au Grand Monde · Laisse et rappel ouvrent la ville et les rencontres » ;
     - Le Grand Monde → « Vient du Quartier · Un moment difficile ? On revient aux balades calmes » (flèche vers le haut).
4. *(Retiré le 13/10)* Pas de carte « Billy a évolué ! » dans l'onglet : la progression se lit directement dans l'arbre
   (anneaux, étapes). Un récap avant / maintenant pourra revenir plus tard dans le Carnet.
5. Le profil n'est **pas** dans cet écran : on l'ouvre en **touchant la photo de Billy** en haut (photo 72 px, pastille
   « profil » en bas à droite, `aria-label` « Voir le profil de Billy »). L'écran Profil (bouton retour en haut à gauche)
   regroupe : grande photo + « Changer la photo », identité, au quotidien, comment il réagit, contacts (bouton « Appeler » seulement si un numéro est enregistré ; sinon « Pas encore
   renseigné » + bouton contour « Ajouter »),
   « Questionnaire de départ » et compte. Maquette `V3-Profil`.

### 5.5 Fiche d'une compétence : le chemin
- En-tête à la couleur du territoire : grande icône, nom, objectif final (« Revient quand on l'appelle, partout »).
- **Le chemin** : un sentier vertical sinueux avec 5 étapes en cercles (style carte de niveaux de jeu mobile) :
  étapes acquises allumées avec leur date, **photo de Billy posée sur l'étape en cours** (avec ses 3 petits points
  « encore 2 fois, un autre jour »), étapes suivantes en pointillé avec leur phrase, au bout un **trophée doré « Maîtrisé »**.
- En bas : bouton plein orange **« S'entraîner · 5 min »** (ouvre l'exercice de l'étape en cours ; 3 min avant 6 mois)
  et bouton contour **« Déjà fait aujourd'hui ? Le noter »** (ouvre « Noter » avec la compétence fixée).
- **Toucher une étape pour la cocher ou la décocher** (phrase d'aide sous l'en-tête ; maquette `V3-CheminEtape`).
  Chaque cercle est un bouton de 80 px qui ouvre un panneau en bas :
  - **étape cochée** : « [Compétence] · acquise le 8 octobre » (ou « Il savait déjà le faire »), la phrase, puis
    « Il ne le fait plus vraiment, ou c'était une erreur ? Décochez l'étape : elle redevient l'étape en cours et le niveau de
    Billy se recalcule. », l'avertissement « Les étapes plus difficiles déjà cochées seront décochées aussi », un bouton
    contour rouge **« Décocher cette étape »** et un bouton plein **« Garder cochée »** ;
  - **étape pas encore cochée** : « Il sait déjà faire ça ? » + bouton plein **« Cocher cette étape »** (coche aussi les
    plus faciles, mention « Il savait déjà le faire », le niveau se recalcule) et
    « Annuler » ;
  - un bandeau « Étape décochée » / « Étape cochée » avec **« Annuler »** pendant quelques secondes ; jamais de
    fenêtre système de confirmation.
  - C'est une **correction** : l'étape en cours, l'anneau du badge et le niveau suivent ; bandeau « Niveau recalculé »
    s'il change.
- Compétence maîtrisée : le trophée brille, mention « À entretenir : elle revient de temps en temps dans la mission du jour ».

### 5.6 Le « + »
- **Noter ce qu'on a fait** (gros, orange) · **Faire un exercice** (contour)
- *Autre* : Photos · Rendez-vous ou soin · Document
- Le mode précis (séance 5 essais, réaction 0–4) reste accessible depuis « Faire un exercice » (interrupteur « Mode précis »).

### 5.7 Moments de récompense
- **Ça avance** : les petits points de l'étape se remplissent, l'anneau du badge s'allume ; aucun chiffre.
- **Nouvelle étape** : plein écran, « C'est réussi ! », la phrase de l'étape en grand (« Billy revient quand on l'appelle
  à la maison »), « Prochaine étape : … », « Ajouté au Carnet ». Pas d'étoile, pas de compteur.
- **Nouveau niveau** : voir § 2. Respecter `prefers-reduced-motion`.
- **Animation de « C'est réussi ! »** (CSS seul, sans bibliothèque, ~1,5 s au total) : le badge arrive en rebond
  (échelle 0,6 → 1,08 → 1), le segment gagné de l'anneau se remplit (stroke-dashoffset), une pluie courte de
  confettis aux couleurs du territoire (12 à 16 formes, 1,2 s), puis le texte apparaît en fondu. Petit son optionnel ;
  pas de vibration (Safari iPhone ne la gère pas). Toucher l'écran
  passe l'animation. Avec `prefers-reduced-motion` : simple fondu, pas de confettis.

### 5.8 Carnet
- Toute la carte d'un moment est cliquable (chevron) et ouvre son détail, où se trouve « Modifier ». Plus de bouton
  « Modifier » sous chaque carte.
- Chaque carte affiche le **visage du ressenti** et les **compétences travaillées** en étiquettes colorées (couleur du territoire).
- Maquette `V3-Carnet`. Filtres dans l'ordre : « Tous », compétences notées (pastilles couleur du territoire), étiquettes
  libres. Texte limité à 4 lignes sur la carte. Marge en bas ≥ hauteur du bouton « + » + 16 px.
- Les entrées automatiques sont rédigées simplement : « Jour de repos », « C'est réussi : revient à la maison »
  (plus de « Première fois : … »).

### 5.9 Mission du jour (le programme du jour)
Chaque jour, l'accueil propose **une seule chose à faire**, toujours courte, pour entretenir la répétition :
- **Un exercice court** (3 min avant 6 mois, 5 min après) tiré de l'étape en cours d'une des **3 compétences en
  cours**, en alternant (« Jeu du prénom · 3 min · dans une rue calme »).
- **Une révision** d'une compétence maîtrisée « à entretenir », de temps en temps (environ 1 jour sur 5).
- **Une journée de repos** : proposée 1 à 2 jours par semaine et **toujours le lendemain d'un moment « Difficile »** :
  balade calme ou reniflage, aucun exercice. Elle compte comme une vraie action.
- **La carte de quête mène à l'exercice** (maquette `V3-QueteExercice`) : toute la carte est touchable (chevron à
  droite) et son bouton plein s'appelle **« ▶ Commencer »** ; « Autre idée » en propose une autre (3 fois par jour
  maximum). Sous le titre : durée et réglage du jour (« 3 min · en longe, dans un parc calme »).
- **Écran de l'exercice** : en-tête à la couleur du territoire (retour « Accueil », « Mission du jour », nom de
  l'exercice, compétence et étape visée, pastilles durée + réglage) ; illustration ; **« Ce qu'il faut »** ;
  **« Comment faire »** en 3 temps numérotés (les `steps` du catalogue) ; **« Bon à savoir »** (précaution) ;
  « Trop difficile aujourd'hui ? » qui donne le réglage d'avant ; la source.
- **Partout où s'affiche « Pour : [compétence] »** (écran de l'exercice, « Mission réussie ? », séance) c'est une
  pastille-bouton avec chevron (≥ 44 px) qui ouvre **le chemin de cette compétence** (§ 5.5) pour voir où en est
  Billy ; le retour ramène à l'écran d'origine, saisie conservée. En bas : bouton orange **« Lancer le
  minuteur · 3 min »** (5 min après 6 mois ; écran qui reste allumé, fin signalée à l'écran + petit son ; pas de vibration, non gérée par Safari sur iPhone) et bouton contour
  **« C'est fait ! »** qui ouvre « Mission réussie ? » (§ 3.1). Le même écran sert à « S'entraîner » depuis le chemin.
- Journée de repos : la carte ouvre une page simple « Aujourd'hui, repos » (idées de balade calme, reniflage), sans
  minuteur, avec « C'est fait ! ».
- Jamais de quête qui rapproche le chien de ce qui lui fait peur ; pour une compétence de peur, la quête vise toujours
  l'étape en cours, au calme et à distance.

### 5.10 Santé : filtrer « À venir » par catégorie

Maquette `V3-SanteAVenir` (page entière, données réelles + un exemple de rendez-vous véto à 10 h 30 : l'heure s'affiche
sous le titre). Au-dessus de la liste « À venir », une rangée de **pastilles-filtres** qui défile
horizontalement : **Tout** · Soins · Vaccins · Véto · Éducateur · Étapes.
- Chaque pastille : 44 px de haut, point de la couleur de la catégorie (tokens de `maquettes/README.md` ; Éducateur
  `#1E5A50`, Étapes `#D9661F`), nom et nombre d'événements à venir. Un seul choix à la fois ; la pastille choisie se
  remplit de sa couleur ; « Tout » par défaut.
- Ces pastilles **remplacent la légende** sous le calendrier : une seule rangée qui explique les couleurs et filtre.
- Le filtre s'applique à « À venir », à « Faits » et aux pastilles du calendrier du mois.
- Une phrase rappelle le filtre (« 2 soins à venir ») ; pour revenir, on touche « Tout » (pas de lien texte).
- Catégorie vide : « Aucun rendez-vous véto à venir » + bouton contour « Ajouter un rendez-vous véto » (formulaire
  pré-réglé sur cette catégorie).
- Les anniversaires et « Billy a 6 mois / 1 an » sont rangés dans **Étapes**.
- Le dernier filtre choisi est retenu sur l'appareil (préférence d'affichage, pas une donnée).

## 6. Règles d'interface (pour une personne peu technophile)

1. **Tout ce qui est cliquable ressemble à un bouton** : bouton plein, bouton contour de 2 px, ou carte blanche avec
   **chevron ›**. Jamais de lien texte seul pour une action.
2. Hauteur minimale **48 px**, texte des boutons **17 px** minimum, toujours un verbe.
3. **Une seule action principale par écran**, en bouton plein **orange `#C2571A`** (texte blanc gras) ; actions secondaires
   en **contour vert `#1E5A50` 2 px** ; choix sélectionné **vert plein**. Doré `#F2B544` réservé au niveau et aux réussites.
4. Icônes **toujours accompagnées d'un mot**.
5. Phrases de 12 mots maximum dans les aides ; aucun chiffre technique hors mode précis.
6. Le bouton « + » flottant ne masque jamais de contenu : marge en bas des pages ≥ 96 px.
7. Chaque écran vide propose son bouton d'action.
8. **Rangées qui défilent horizontalement** (badges, pastilles-filtres, catégories) : **aucune barre de défilement**
   visible (`scrollbar-width: none` et `::-webkit-scrollbar { display: none }`) ; la rangée va jusqu'au bord de l'écran
   et le dernier élément est coupé à moitié pour montrer qu'il y a une suite.

## 7. Données (évolution, rien à migrer de force)

- `entries` (Journal) gagne des champs optionnels : `skills: bossId[]`, `feeling: 'difficile'|'bien'|'super'`,
  `fear: boolean`, `movedAway: boolean`, `validations: bossId[]`, `xp: number`. Un moment = une entrée : le Carnet est la seule liste.
- Séances et expositions existantes s'affichent dans le Carnet comme des moments (lecture seule, résumé généré).
- `bossProgress/{bossId}` gagne `preApp: number[]` (étapes acquises avant l'app) et garde `validations`.
- `dog/billy` gagne `questionnaire: { answers: Record<string, …>, step: number, completedAt?: Timestamp }`,
  `reactions: { situation: string, reaction: string, bossId?: string }[]` et les champs du questionnaire (sexe, stérilisation,
  provenance, jeux, lieu de vie, temps seul, sorties, foyer, « à savoir » santé).
- `dailyQuest/{date}` : `{ kind: 'exercice'|'revision'|'repos', bossId?, exerciseId?, done: boolean, skips: number }`.
- `dog/billy` gagne `activeSkills?: bossId[]` (**3 au maximum**, les compétences en cours choisies par le maître). Absent :
  l'app propose les 3 premières non maîtrisées selon le questionnaire. La mission du jour pioche dans cette liste ;
  une compétence hors liste ne revient qu'en révision.
- Catalogue (dans le code, `src/content/training.ts`) : chaque étape de chaque compétence liste ses exercices et leur
  réglage N1–N5 (`stepExercises: Record<bossId, { step: 1..5, exercises: { id, level }[] }[]>`), d'après
  `docs/specs/arbre-competences.md`. Durée de séance : 3 min avant 6 mois (calculée depuis la date de naissance), 5 min après.
- Chaque étape du catalogue a aussi une **phrase courte** (4 à 6 mots) pour les badges.
- Chaque étape du catalogue a une phrase « acquise » à la 3ᵉ personne (« Revient quand on l'appelle à la maison »)
  en plus de son critère : à ajouter dans le catalogue (`src/content/training.ts`).
- Niveau, titre, comparaisons avant / maintenant : **calculés**, jamais stockés.
- **Os** : `users/{uid}/bones/{id}` = `{ date, amount, reason, refId? }` (une ligne par gain ou achat, montant négatif
  pour un achat) ; le solde est la somme, recalculée ; `refId` évite de compter deux fois la même mission ou étape.
  `users/{uid}/inventory/{itemId}` = `{ boughtAt }` ; ce qui est porté dans `dog/billy.cosmetics?: { accessory?,
  frame?, treeBackground?, theme? }`. Catalogue de la boutique dans `src/content/shop.ts`.

## 8. À enlever ou cacher

Onglet Dressage, arbre à liens, radar, étiquettes de caractère du questionnaire, bouton « + » de l'accueil, rang séparé, 3 quêtes (→ 1 défi), liste des premières fois, toute étoile ou note
chiffrée, textes des règles des traits. Rien n'est supprimé des données.

## 9. Critères d'acceptation

- [ ] À l'ouverture, le logo s'affiche ; toucher le logo ouvre l'app ; le bouton « Questionnaire de départ » ouvre le questionnaire.
- [ ] Première connexion : le questionnaire s'enchaîne, peut être quitté et repris ; à la fin, Billy a un niveau et une liste « Ce qu'il sait déjà faire ».
- [ ] Une personne qui n'a jamais vu l'app note ce qu'il a fait en moins de 30 secondes sans aide.
- [ ] Noter un moment passé fonctionne ; aucun chiffre d'XP n'apparaît nulle part dans l'app.
- [ ] Le niveau = 1 + étapes acquises ÷ 2 ; décocher une étape le recalcule.
- [ ] Aucune compétence n'est présélectionnée automatiquement.
- [ ] L'onglet Billy se comprend sans légende : aucune étoile, aucun nombre d'étapes, que des phrases.
- [ ] Aucun lien texte seul pour une action ; tous les éléments cliquables font ≥ 48 px.
- [ ] Rien ne baisse après un moment « Difficile ».
- [ ] Le questionnaire s'ouvre seul tant qu'il n'est pas fini ; une réponse ne compte qu'après « Suivant ».
- [ ] L'accueil propose chaque jour une quête courte ; le lendemain d'un moment « Difficile », c'est une journée de repos.
- [ ] L'onglet Billy montre 3 territoires colorés et 10 badges en grille ; aucune liste de « Pas encore commencé ».
- [ ] La fiche d'une compétence montre le chemin avec Billy posé sur l'étape en cours.
- [ ] Aucun défi ni quête ne pousse vers une situation de peur.

## 10. Maquettes de référence

`docs/maquettes/V3-Ouverture`, `V3-Accueil`, `V3-Raconter`, `V3-Reussite`, `V3-Questionnaire`, `V3-Billy`, `V3-Chemin`, `V3-RaconterQuete`, `V3-Profil`, `V3-EnCours`, `V3-Boutique` (`.dc.html`).
Les chiffres et dates sont des exemples. Écrans non maquettés : mêmes règles (§ 6).

## 11. Ordre de réalisation

1. Règles d'interface (§ 6) appliquées à toute l'app.
2. Écran d'ouverture (§ 5.1) + questionnaire de départ (§ 4).
3. Noter ce qu'on a fait (§ 3) + Carnet unifié.
4. Niveau et titre (§ 2) + accueil (§ 5.3) + récompenses (§ 5.7).
5. Onglet Billy (§ 5.4) + fiche d'une compétence (§ 5.5) + navigation à 4 onglets (§ 5.2).
6. Mission du jour (§ 5.9), défi sûr, Carnet (§ 5.8).
7. Nettoyage (§ 8) et vérification des critères (§ 9).
