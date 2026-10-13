# Spec V2 — Dressage façon jeu vidéo

**Principe** : les **objectifs (boss) sont les mêmes pour tous les chiens**. Ce qui change d'un chien à l'autre,
c'est le **chemin** : les exercices proposés, le palier de départ et les précautions, selon son profil.
On ne finit jamais le jeu : on gagne des niveaux, des paliers, puis des étoiles de maîtrise, sans plafond.

Ce document est **autonome** : tout ce qu'il faut pour coder la partie dressage est ici.
`docs/recherche/recherche-dressage.md` sert seulement de contexte (sources, détail des exercices) ; en cas de contradiction,
**ce document fait foi**. Les boss Ruelle, Enfants et Reflet du rapport sont remplacés par les boss communs (§ 5).

**Règles de sécurité non négociables** (chien craintif) :
- l'app ne récompense **jamais** le fait de se rapprocher d'un déclencheur ; elle récompense l'enregistrement, l'observation et le recul ;
- rien ne baisse jamais (XP, niveau, paliers, rang), sauf la météo de confiance ;
- aucune série quotidienne, aucune notification culpabilisante, aucun compteur d'échecs ;
- la suggestion monter/rester/baisser n'est jamais appliquée automatiquement.

---

## 1. Les 10 boss communs

Inspirés des 10 épreuves du Canine Good Citizen de l'AKC, le standard le plus répandu de ce qu'on attend
d'un chien de famille. Chaque boss nourrit une ou deux stats du radar.

| # | Boss | Ce qu'on attend au final | Stats |
|---|---|---|---|
| 1 | **Le Lien** | Répond à son nom et me regarde, même dehors | Focus |
| 2 | **La Laisse** | Marche laisse détendue, suit mes changements de direction | Focus, Calme |
| 3 | **Le Rappel** | Revient quand je l'appelle | Rappel |
| 4 | **Les Bonnes manières** | Assis, couché, reste, attend à la porte, ne saute pas | Calme |
| 5 | **Le Calme** | Se pose sur son tapis, reste serein seul quelques minutes | Calme |
| 6 | **Les Rencontres** | Reste à l'aise quand un inconnu, adulte ou enfant, me parle ou passe | Sociabilité, Courage |
| 7 | **Les Congénères** | Croise un autre chien sans plus qu'un intérêt poli | Sociabilité |
| 8 | **La Ville** | Se promène en ville : bruits, passants, rues étroites, foule | Courage |
| 9 | **La Nouveauté** | Explore un objet, un sol, un son ou un reflet inconnu sans paniquer | Courage |
| 10 | **Les Soins** | Accepte brossage, oreilles, pattes, examen chez le véto | Calme, Sociabilité |

### Arbre de compétences : 3 étages, des liens conseillés, aucun verrou

Les boss sont rangés sur 3 étages. Les liens montrent ce qui **facilite** un palier ; ils ne **bloquent jamais** rien :
tout boss peut être travaillé à tout moment (Billy vit en ville, il doit pouvoir travailler La Ville tout de suite).

```
MONDE        La Ville · Les Rencontres · Les Congénères
QUOTIDIEN    La Laisse · Le Rappel · Les Bonnes manières · La Nouveauté
FONDATIONS   Le Lien · Le Calme · Les Soins
```

| Palier visé | Plus facile si… |
|---|---|
| La Laisse P3 | Le Lien P2 |
| Le Rappel P3 | Le Lien P2 |
| Les Bonnes manières P3 | Le Calme P2 |
| La Nouveauté P3 | Le Calme P1 |
| La Ville P3 | Le Lien P2 et La Nouveauté P2 |
| La Ville P4 | La Laisse P3 |
| Les Rencontres P3 | Le Calme P2 et Le Lien P2 |
| Les Congénères P3 | Le Lien P2 et La Laisse P2 |
| Les Soins P4 (chez le véto) | Le Calme P2 |

- Quand un lien conseillé n'est pas atteint, la fiche du boss affiche un conseil doux :
  « Ce palier sera plus facile si Le Lien atteint P2. Travailler les deux en parallèle ? » — jamais un cadenas.
- Un boss s'**allume** progressivement à chaque palier acquis (5 niveaux d'intensité). Un lien s'allume quand
  son prérequis conseillé est atteint.
- Comme dans Skyrim, les compétences montent quand on les pratique : **aucun point à dépenser**, aucun choix à regretter.
- Ces liens sont des hypothèses de conception, à valider avec l'éducateur (§ 9).

## 2. La même échelle de 5 paliers pour tous les boss

Une seule logique à comprendre, appliquée partout. Chaque palier ajoute une difficulté (distance, durée ou distractions).

| Palier | Nom | Où | Exemple — Le Rappel | Exemple — La Ville |
|---|---|---|---|---|
| P1 | **Découverte** | À la maison, sans distraction | Revient de l'autre pièce | Écoute des sons de ville à faible volume en mangeant |
| P2 | **Maison animée** | Maison avec distractions, ou jardin | Revient en laissant un jouet | Regarde la rue depuis la fenêtre, détendu |
| P3 | **Dehors au calme** | Extérieur calme, peu de monde | Revient à 10 m sur une longe, parc vide | 10 min dans une rue calme, à une heure creuse |
| P4 | **Dehors animé** | Extérieur avec passants, bruits, chiens | Revient malgré un autre chien au loin | Rue commerçante ou ruelle étroite, réaction ≤ 1 |
| P5 | **Partout** | Réussi dans 3 lieux différents | Rappel validé dans 3 parcs | Validé dans 3 quartiers |

**Valider un palier** : réussir le critère **3 fois, sur 3 jours différents, avec une réaction ≤ 1**
(détendu ou attentif, échelle 0–4). Un palier validé est **acquis pour toujours**, même après une mauvaise passe.

**Après P5 : la Maîtrise.** Chaque nouveau lieu où le boss est validé ajoute une étoile. Pas de plafond.

## 3. Le rang du chien : jamais 100 %

Le rang dépend du nombre de paliers acquis (50 au total), puis des étoiles de maîtrise.

| Paliers acquis | Rang |
|---|---|
| 0–4 | Chiot curieux |
| 5–14 | Apprenti |
| 15–24 | Compagnon |
| 25–34 | Citadin |
| 35–44 | Complice |
| 45–50 | Légende |
| Légende + étoiles | Légende ★ 1, ★ 2, ★ 3… sans fin |

En parallèle, l'**XP** et le **niveau global** continuent de monter à chaque séance, exposition
ou jour de repos. Le rang mesure les objectifs atteints ; le niveau mesure l'effort fourni. Aucun des deux ne baisse.

### Règles d'XP

| Action | XP |
|---|---|
| Séance enregistrée, quel que soit le résultat | +10 |
| Chaque essai réussi | +1 (max +5 par séance) |
| Suggestion « Baisser » ou « Rester » acceptée (« Bonne lecture du seuil ») | +3 |
| Exposition enregistrée (voulue ou subie) | +5 |
| Exposition avec réaction ≤ 1 | +3 |
| « Retraite stratégique » (demi-tour ou distance augmentée) | +8 |
| Jour de repos ou balade reniflage déclaré | +5 (max 3 par semaine) |
| Validation d'un critère de palier | +10 |
| Palier acquis | +50 |
| Étoile de maîtrise (nouveau lieu après P5) | +30 |
| Première fois (succès daté) | +25 |
| Quête hebdomadaire terminée | +15 |
| Inactivité, échec, essai raté | 0, jamais négatif |

- L'XP d'une action va au total, au boss concerné et aux stats de ce boss.
- **Niveau global** : le niveau L demande `25 × L × (L+1)` XP cumulés (50 pour N1, 300 pour N3, 2 750 pour N10). Pas de niveau max.
- **Stats du radar** (Calme, Courage, Rappel, Focus, Sociabilité) : XP cumulée par stat, jamais en baisse.
  Le radar montre l'aire actuelle et, en pointillé, celle d'il y a 30 jours. Échelle relative à la plus forte stat, sans pourcentage.

### Météo de confiance (la seule valeur qui varie)

Calculée par boss à partir de la moyenne des 3 dernières réactions enregistrées (échelle 0–4) :
0–0,9 **Soleil** · 1–1,9 **Éclaircies** · 2–2,9 **Nuageux** · 3 et plus **Averse**. Pas de réaction enregistrée : pas de météo.
Toujours accompagnée d'une phrase qui normalise : « Les jours de pluie font partie du chemin. »

Échelle de réaction 0–4 : 0 détendu · 1 attentif, se détourne seul · 2 tendu, se fige brièvement ·
3 se bloque, grogne ou refuse la friandise · 4 panique, aboie, cherche à fuir.

### Rythme et quêtes

- **Rythme hebdomadaire** : frise de 7 points (un jour vide reste neutre, jamais barré), objectif doux de 4 séances
  par semaine qui ne passe jamais au rouge, compteur « X jours d'entraînement ensemble » qui ne revient jamais à zéro.
- **Quêtes** : 3 maximum par semaine, tirées des boss conseillés, remplaçables en un tap, sans pénalité si non faites.
  Exemples : « 3 séances du Lien », « Une balade reniflage dans un lieu calme », « Noter 2 expositions en restant loin ».
- **Premières fois** : succès datés ajoutés au Journal comme cartes souvenirs. Quelques succès cachés, en surprise.

## 4. Adapter le chemin au chien : le profil

Au premier lancement (et modifiable dans le profil), on coche les traits du chien.
Les traits **ne changent jamais les objectifs**, seulement :

- l'**ordre** dans lequel les boss sont suggérés ;
- le **palier de départ** proposé (on peut toujours valider directement un palier déjà maîtrisé) ;
- les **exercices** proposés pour avancer ;
- les **garde-fous** (règles de sécurité).

| Trait | Boss mis en avant | Exercices privilégiés | Garde-fous |
|---|---|---|---|
| **Chiot (< 6 mois)** | Le Lien, La Nouveauté, Les Soins | Jeu du prénom, touche-main, cherche, jeu du bol | Séances de 3 min max, beaucoup de repos |
| **Craintif** | La Nouveauté, La Ville, Les Rencontres | 1-2-3, Up-Down, Look At That, sniffari, demi-tour d'urgence, Treat & Retreat | Ne jamais forcer le contact ; « a-t-il mangé ? » obligatoire ; P4 proposé seulement si la météo du boss est au soleil ou aux éclaircies |
| **Énergique / excité** | Le Calme, La Laisse, Les Bonnes manières | Tapis, protocole de relaxation, arbre/stop en laisse | Dépense mentale avant les séances calmes |
| **Réactif aux chiens** | Les Congénères, La Laisse | Engage-Disengage, LAT, demi-tour | Distance de confort enregistrée ; pas de rencontre en laisse forcée |
| **Adopté adulte** | Le Lien, Le Calme | Jeu du prénom, tapis | Phase de décompression de 2–3 semaines sans objectif |
| **Senior** | Les Soins, Le Calme | Manipulation douce, sniffari | Séances courtes, pas de sauts |

Un chien peut avoir plusieurs traits : les listes s'additionnent, les garde-fous les plus prudents l'emportent.

## 5. Billy : traits Chiot + Craintif

| Ce que vit Billy | Boss commun | Palier où il en est (à confirmer) |
|---|---|---|
| Se bloque dans la petite ruelle | **La Ville** | P3 à travailler (rue calme), la ruelle sera un objectif de P4 |
| Grogne sur les enfants et certaines personnes | **Les Rencontres** | P2–P3 : passants à distance, sans interaction |
| Peur de son reflet, grogne la nuit | **La Nouveauté** | P1–P2 : miroir couvert puis découvert de loin |

Ses déclencheurs précis (la ruelle, l'aire de jeux, la baie vitrée) deviennent des **lieux** enregistrés dans le boss
correspondant : une exposition à « la ruelle » compte pour La Ville. La météo de confiance est calculée par boss.

Boss suggérés en premier pour Billy : **Le Lien** (base de tout le travail sur la peur), **La Nouveauté**, **La Ville**.

## 6. Écrans

1. **Onglet Dressage** (4ᵉ onglet) :
   - en haut : avatar, rang (« Apprenti »), niveau global et barre d'XP du niveau ;
   - le radar des 5 stats avec l'aire d'il y a un mois ;
   - l'**arbre de compétences** sur 3 étages (Fondations en bas, Monde en haut), lisible sur 375 px sans zoom :
     chaque boss = une pastille avec icône, nom court, palier actuel (5 points) et météo pour les boss liés aux peurs ;
     les liens conseillés en traits fins, allumés quand le prérequis est atteint ;
     badge « Conseillé » sur les boss mis en avant par les traits du chien.
2. **Fiche d'un boss** : objectif final, l'échelle P1–P5 avec le critère de chaque palier, validations faites
   (« 2/3, il en reste 1 »), conseil doux si un lien conseillé n'est pas atteint, exercices conseillés pour le palier
   actuel, lieux de maîtrise.
3. **Séance** (2 taps pour démarrer : « + » › Séance, dernier exercice présélectionné) :
   - plein écran : nom de l'exercice, niveau de difficulté N1–N5 en grand, compteur « 3/5 » ;
   - deux gros boutons **Réussi** / **Raté** (64 px de haut minimum) dans le bas de l'écran ;
   - après 5 essais, une feuille de fin : « A-t-il pris ses friandises ? » Oui / Non ;
   - suggestion : 5/5 → **Monter**, 3–4/5 → **Rester**, ≤ 2/5 → **Baisser** ; si « Non » aux friandises, toujours **Baisser** ;
     Martin valide la suggestion en un tap (ou en choisit une autre) ;
   - puis : « Le critère du palier est-il atteint aujourd'hui ? » Oui / Pas encore → Oui ajoute une validation au boss ;
   - message final informatif (« 14 réussites du Lien cette semaine »), XP gagnée.
   Le **niveau de difficulté N1–N5** d'un exercice peut descendre (c'est un réglage) ; le **palier P1–P5** d'un boss ne descend jamais.
4. **Exposition** (2 taps : « + » › Exposition) : boss, lieu (liste des lieux enregistrés ou nouveau), distance approximative,
   réaction 0–4 en 5 gros boutons, case « Retraite stratégique ». Moins de 10 secondes à remplir.
5. **Célébration de palier** : plein écran court, nom du palier, XP gagnée, carte ajoutée au Journal.
6. **Profil du chien** : section « Traits » (cases à cocher du § 4).

Ce qu'on laisse dehors : vidéos, clicker sonore, série quotidienne, monnaie virtuelle, classement, notifications de rappel.

## 7. Modèle de données

Le catalogue (boss, paliers, exercices, traits) est **le même pour tous** et vit dans le code, pas dans Firestore :

```ts
// src/content/training.ts — catalogue commun
Boss      { id, name, goal, tier: 'fondations' | 'quotidien' | 'monde', stats: Stat[],
            levels: [P1..P5 { title, criterion }],
            recommends: { level, requires: { bossId, level }[] }[] }   // liens conseillés, jamais bloquants
Exercise  { id, name, steps[], bossIds[], levels[N1..N5], traits?: Trait[], source, verified: boolean }
Trait     'chiot' | 'craintif' | 'energique' | 'reactif-chiens' | 'adopte-adulte' | 'senior'
```

Données propres au chien, dans Firestore :

```ts
users/{uid}/dog/billy                { …, traits: Trait[] }
users/{uid}/bossProgress/{bossId}    { level: 0..5, validations: { level, date, placeId? }[], masteryPlaces: string[] }
users/{uid}/places/{id}              { name, bossId }            // ex. « La ruelle » → la-ville
users/{uid}/sessions/{id}            { date, exerciseId, bossId, tier, trials: boolean[], ate, suggestion, xp }
users/{uid}/exposures/{id}           { date, bossId, placeId?, trigger, distance, reaction: 0..4, retreat, xp }
users/{uid}/stats/summary            { xpTotal, xpByStat, xpByBoss, firsts: { id, date }[] }
```

Le rang, le niveau global et la météo sont **calculés**, pas stockés.

## 8. Ce que ce choix permet plus tard

Les objectifs étant communs, l'app peut accueillir un second chien, ou d'autres propriétaires, sans rien changer
au catalogue : seul le profil (traits) et la progression diffèrent.

## 9. À valider avec l'éducateur

- Les critères P1–P5 de chaque boss, surtout La Ville et Les Rencontres pour Billy.
- Les liens conseillés de l'arbre de compétences.
- La règle « 3 fois sur 3 jours, réaction ≤ 1 » pour valider un palier.
- Le palier de départ de Billy dans chaque boss.
- Les exercices proposés pour le trait Craintif.

## 10. Prompts pour Claude Code

À coller un par un. Vérifier sur l'iPhone avant de passer au suivant.

**Étape A — Catalogue et profil**
```
Lis CLAUDE.md et docs/specs/spec-v2-dressage.md (ce document fait foi pour le dressage ;
docs/recherche/recherche-dressage.md est seulement du contexte). Analyse d'abord le code existant de l'app
et dis-moi en 5 lignes comment tu vas intégrer la V2 sans casser la V1.
Puis crée le catalogue commun (src/content/training.ts) : les 10 boss avec leurs 5 paliers et critères,
les traits, et une première série d'exercices à partir de docs/recherche/recherche-dressage.md
(marque verified: false ceux notés « à vérifier »). Ajoute les traits au profil du chien
(Billy : chiot + craintif). Écris les tests de la logique pure. Arrête-toi là.
```
Je valide quand : je coche et décoche des traits dans le profil, et les tests passent.

**Étape B — Séance et exposition**
```
Fais les écrans Séance et Exposition du § 6 de docs/specs/spec-v2-dressage.md, accessibles en 2 taps
depuis le bouton « + », avec l'enregistrement dans Firestore et les règles d'XP du § 3.
Logique d'XP, de suggestion et de validation dans src/lib/, avec tests.
```
Je valide quand : une séance se note en moins d'une minute et une exposition en moins de 10 secondes, sur l'iPhone.

**Étape C — Onglet Dressage**
```
Fais l'onglet Dressage et la fiche d'un boss (§ 6) : rang, niveau global, radar avec l'aire
d'il y a 30 jours, arbre de compétences sur 3 étages avec liens conseillés (jamais bloquants),
badge « Conseillé » selon les traits, météo de confiance, validation des paliers
(3 fois sur 3 jours, réaction ≤ 1), célébration de palier ajoutée au Journal.
```
Je valide quand : l'arbre se lit sans zoom sur l'iPhone, aucun boss n'est verrouillé, je vois la progression
de Billy sans aucun pourcentage, et rien ne baisse après une mauvaise séance.

**Étape D — Rythme, quêtes, premières fois**
```
Ajoute le rythme hebdomadaire, les quêtes et les premières fois (§ 3). Puis relis
docs/specs/spec-v2-dressage.md et liste ce qui n'est pas encore fait.
```

## 11. Écarts validés avec Martin le 13/10/2026

Décisions prises avant le code, qui précisent ou remplacent des points ci-dessus :

- **Journal d'XP** : `users/{uid}/xpLog/{id} { date, kind, xp, bossId?, key?, label? }`, en ajout seul, remplace
  `stats/summary`. Total, niveau, stats et radar « il y a 30 jours » en sont calculés. Les gains uniques (palier,
  étoile, première fois, quête, repos du jour) ont un identifiant fixe : ils ne peuvent pas être comptés deux fois.
- **Séance** : le champ `tier` s'appelle `difficulty` (1–5) pour ne pas le confondre avec l'étage du boss ;
  `reaction` (0–4) et `decision` sont ajoutés. La réaction est demandée en fin de séance : c'est elle qui permet
  « réaction ≤ 1 ». Une exposition seule ne valide jamais un palier.
- **Exercice qui nourrit plusieurs boss** (retour UX du 13/10) : l'écran affiche « Compte pour : Le Lien · Le Rappel »
  en texte, sans choix. La séance garde un boss principal (`bossId`) et liste tous les boss dans `bossIds` : son XP
  compte pour chacun et pour leurs stats (une seule fois par stat), et le critère du palier est demandé pour chaque boss.
- **Arbre** (retour UX) : toucher un boss fait ressortir ses liens et affiche son détail sous l'arbre ; la fiche
  s'ouvre depuis ce détail.
- **Lieu** : demandé seulement au moment de valider P5 ou une étoile de maîtrise.
- **Validation directe** d'un palier déjà maîtrisé : acquis tout de suite, sans XP, et ne compte pas pour les premières fois.
- **Paliers de départ de Billy** : tous à 0, Martin valide lui-même.
- **Niveau global** : on commence au niveau 1. Atteindre le niveau L demande `25 × (L−1) × L` XP cumulés
  (50 pour le niveau 2, 300 pour le 4, 2 750 pour le 11). Remplace la formule du § 3.
- **Météo** : affichée pour Les Rencontres, Les Congénères, La Ville, La Nouveauté et Les Soins.
- **Garde-fou « P4 par beau temps »** : un conseil affiché, P4 reste accessible.
- **Annulation** : possible juste après la saisie (bilan de séance, message d'exposition), ensuite définitive.
- **Quêtes** : calculées (les mêmes sur tous les appareils) ; seules celles remplacées sont stockées dans `quests/{lundi}`.
- **Ancien dressage** (paliers par ordre, série quotidienne, cadenas) : retiré. Ses documents dans `sessions` et
  `exposures` sont ignorés, pas supprimés. Jeux et idées à mâcher gardés en bas de l'onglet, hors XP.

---

Source des 10 épreuves de référence : [AKC Canine Good Citizen — Test Items](https://www.akc.org/products-services/training-programs/canine-good-citizen/canine-good-citizen-test-items/).
