# Audit UX de l'app Billy

13 octobre 2026 · version en ligne du 13 octobre (18 h 16), parcourue sur iPhone (390 px) avec le compte de Martin.

**Verdict** : l'app est propre, fiable et fidèle aux specs, mais elle parle le langage de ceux qui l'ont conçue.
Pour jouer, il faut d'abord comprendre **14 notions** (boss, palier, niveau d'exercice, XP, rang, niveau, stats,
météo, quêtes, premières fois, séance, exposition, retraite stratégique, traits). Un jeu réussi n'en demande que
**trois** au départ. Et surtout : **un mois de vie avec Billy n'apparaît nulle part**, parce que l'app ne sait
enregistrer que des séances formatées, faites à partir d'aujourd'hui.

---

## 1. Ce qui marche

- **Visuel cohérent et chaleureux** : vert profond, typographie, cartes, photo de Billy. On a envie de l'ouvrir.
- **Accueil utile** : âge de Billy, prochaine étape, repas avec horaires, prochains soins. C'est l'écran du quotidien.
- **Santé bien couverte** : vaccins, vermifuge, antiparasitaire avec « Prochain », poids, documents, véto.
- **Écran de séance** : deux gros boutons Réussi / Raté en bas, compteur au centre. Excellent pour le pouce.
- **Ton bienveillant** : « Rien n'est perdu si une quête n'est pas faite », « Rester loin est très bien ».

## 2. Les 6 problèmes qui bloquent

| # | Problème | Où | Gravité |
|---|---|---|---|
| 1 | **Le passé n'existe pas.** Un mois de balades, de progrès et de peurs surmontées ne peut pas être saisi : tout démarre à « Niveau 0 », « 0 palier », radar vide. Le joueur commence le jeu en ayant l'impression de n'avoir rien fait. | Dressage | Bloquant |
| 2 | **Saisie trop rigide.** Pour noter « on a croisé des enfants au parc et il est resté calme », il faut choisir entre Séance, Exposition, Note ; puis un « boss » parmi 10 puces ; puis une réaction 0–4 ; puis une distance. On ne raconte pas, on remplit un formulaire. Et une Note du Journal ne fait pas progresser Billy. | « + », Exposition | Bloquant |
| 3 | **Trop de notions, trop de jargon.** Boss, palier P1–P5 *et* niveau N1–N5, rang *et* niveau, XP, stats, météo, exposition, déclencheur, retraite stratégique. Deux échelles de 1 à 5 qui veulent dire deux choses différentes. | Dressage, Séance | Majeur |
| 4 | **La progression ne se voit pas.** Le radar, l'arbre et les 7 premières fois vides donnent une page « à remplir », pas une partie en cours. Aucun écran ne dit « voilà le chemin parcouru depuis l'adoption ». | Dressage | Majeur |
| 5 | **On ne sait pas ce qui est cliquable.** Liens texte verts (« Tout voir », « Changer », « Voir le geste », « Calendrier », « Ajouter »), pastilles de l'arbre qui ressemblent à des illustrations, cartes sans chevron, bouton « + » qui cache du contenu. | Partout | Majeur |
| 6 | **Le « + » fait tout.** 6 choix au même niveau (Séance, Exposition, Photos, Note, Événement, Document), sans hiérarchie. Les deux premiers sont incompréhensibles sans formation. | Feuille d'ajout | Moyen |

### Détail par écran

**Aujourd'hui**
- Bon : Billy, étape à venir, « Séance du jour », repas, à venir.
- La « Séance du jour » est une simple ligne grise : rien ne dit que c'est l'action principale de la journée.
- « Occupation du jour » arrive tout en bas, après le dernier souvenir : on ne la voit pas.
- Aucune trace du niveau de Billy : l'écran qu'on ouvre tous les jours ne montre pas la partie.

**Dressage**
- Première impression : une carte « Chiot curieux · Niveau 0 · 0/50 XP · 0 palier acquis ». Trois chiffres à zéro.
- L'arbre est joli mais les pointillés se croisent ; on ne sait pas qu'on peut toucher une pastille.
- 6 sections empilées (rang, arbre, semaine, quêtes, forces, premières fois) : pas de point d'entrée.

**Fiche d'un boss**
- Les critères des paliers sont clairs et concrets : c'est la meilleure partie du système.
- « À valider 3 fois, sur 3 jours différents, détendu ou attentif » : juste, mais la règle reste abstraite tant qu'aucun compteur ne la montre.
- « Billy maîtrise déjà un palier ? » : bonne idée, mais cachée en bas en lien texte. C'est pourtant la réponse au problème n°1.

**Séance**
- « N1 » avec – / + en haut : on ne sait pas que c'est un niveau de difficulté, ni pourquoi le changer.
- Puces « Le Lien / Le Rappel » : on croit devoir choisir.

**Exposition**
- Le mot ne parle à personne. « Quel boss ? » non plus.
- La réaction 0–4 est bien faite (gros boutons, libellés). Mais 10 puces de boss avant, c'est trop.

**Journal**
- Simple et lisible. Mais il est **séparé** du dressage : raconter un progrès dans le Journal ne rapporte rien à Billy.
- Les « premières fois » y arrivent bien, c'est un bon pont.

**Calendrier, Profil**
- Clairs. Le profil est long (identité, santé, alimentation, traits, contacts, documents, compte) mais c'est un écran de consultation, c'est acceptable.
- Les traits, avec leurs règles (« P4 conseillé seulement si la météo… »), exposent la mécanique interne au joueur.

---

## 3. Personas et réactions

Quatre profils imaginés pour tester l'app au-delà de Martin. Leurs réactions sont des hypothèses de designer, pas des tests réels :
les valider avec 2 ou 3 vraies personnes (un proche peu technophile suffit) avant de coder la refonte.

### Martin — le propriétaire impliqué (utilisateur réel)
UX designer, 1 mois avec Billy, chiot craintif. A fait plein de choses : Bretagne, voiture, balades, éducateur.
*Objectif* : voir que Billy progresse, tout noter sans effort, se sentir dans un jeu.
- **Accueil** : « Ok, c'est mon tableau de bord. Mais où est mon chien en tant que personnage ? »
- **Dressage** : « Niveau 0 ? On a fait un mois entier ! » → frustration immédiate, le jeu démarre mal.
- **Saisie** : « Je veux écrire ce qu'on a fait, pas choisir un boss. » Abandonne l'Exposition au 2ᵉ écran.
- **Ce qui le retiendrait** : rattraper le mois passé et voir Billy monter de 3 niveaux d'un coup.

### Josiane — la retraitée peu à l'aise avec le téléphone
64 ans, Cocotte, bichon de 2 ans adopté au refuge. iPhone offert par sa fille, utilise WhatsApp et les photos.
*Objectif* : savoir quoi faire aujourd'hui, ne pas « faire de bêtise ».
- **Accueil** : rassurée par la photo et les horaires de repas. « Ça, je comprends. »
- **« + »** : « Séance ? Exposition ? Je ne sais pas ce que c'est. » Touche « Photos », le seul mot connu.
- **Dressage** : ne trouve pas comment entrer dans l'arbre ; tape sur le titre « Rang », rien ne se passe. Conclut « c'est pour les jeunes ».
- **Liens texte** : ne voit pas « Changer » ni « Tout voir » comme des boutons.
- **Ce qui la retiendrait** : un gros bouton « Raconter la journée de Cocotte », trois visages pour dire comment ça s'est passé, et des étoiles qui s'allument.

### Léo — le joueur
24 ans, étudiant, joue à Zelda et Pokémon. Chiot berger australien très énergique.
*Objectif* : un vrai jeu, monter de niveau, débloquer des choses, montrer à ses potes.
- **Dressage** : adore l'idée des boss et de l'arbre. « Mais pourquoi rang ET niveau ? Et c'est quoi la différence entre P3 et N3 ? »
- **Radar vide, premières fois grisées** : « Ça ressemble à un tableau Excel, pas à un écran de jeu. Il manque la récompense. »
- **Séance** : rapide, efficace. Veut une animation et un son quand il gagne de l'XP.
- **Ce qui le retiendrait** : un « personnage » avec niveau et titre, des étoiles par compétence, une célébration à chaque étoile, une carte de partage.

### Les Moreau — la famille
Sarah (38 ans) et ses enfants Inès (9 ans) et Tom (12 ans), labrador d'un an. Les enfants font l'éducation avec leur mère.
*Objectif* : que tout le monde participe, que les enfants restent motivés.
- **Sarah** : comprend l'accueil et le calendrier ; trouve le dressage « trop technique pour les enfants ».
- **Inès** : veut des étoiles et des badges, ne lit pas les paragraphes. Tape sur tout ce qui est coloré.
- **Tom** : aime les quêtes de la semaine, mais « 3 séances : La Nouveauté », il ne sait pas quoi faire concrètement.
- **Ce qui les retiendrait** : des défis concrets (« Apprends-lui à donner la patte »), des étoiles, plus tard plusieurs joueurs.

### Ce que les quatre ont en commun

| Besoin | Martin | Josiane | Léo | Moreau |
|---|---|---|---|---|
| Raconter librement ce qu'on a fait | ✔ | ✔ | | ✔ |
| Voir la progression en un coup d'œil | ✔ | ✔ | ✔ | ✔ |
| Comprendre en 3 notions maximum | ✔ | ✔ | ✔ | ✔ |
| Boutons évidents, gros, avec des mots | | ✔ | | ✔ |
| Récompense visible (étoile, niveau, animation) | ✔ | ✔ | ✔ | ✔ |
| Saisir le passé | ✔ | ✔ | | |

---

## 4. Recommandations

La refonte complète est décrite dans `docs/specs/spec-v3-simplification.md`. En résumé :

1. **Trois notions seulement** : le **niveau de Billy** (avec un titre), **ce qu'il sait faire** (des étapes décrites
   en phrases, sans étoiles ni notes), et le **Carnet** où tout ce qu'on fait est raconté.
2. **Raconter un moment**, l'action principale : texte libre, date (aujourd'hui ou passée), photos, trois visages pour le
   ressenti, puis on **choisit soi-même** les compétences travaillées dans une grille de 10 cases. Aucune IA.
3. **Questionnaire de départ** à la première connexion (le chien, son caractère, ses peurs, ce qu'il sait déjà faire),
   accessible ensuite depuis l'écran d'ouverture. Billy démarre avec le niveau qu'il mérite.
4. **Écran d'ouverture** : on touche le logo pour entrer ; le questionnaire est accessible juste en dessous.
5. **Un écran « fierté »** : progrès avant / maintenant en phrases, ce qu'on travaille, ce qu'il sait déjà faire avec les dates.
6. **Règle des boutons** : tout ce qui est cliquable est un bouton plein ou contour, ou une carte avec chevron.
7. **Mode précis en option** pour la séance à 5 essais et la réaction 0–4.
