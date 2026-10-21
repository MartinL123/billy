# Contenu chien : chaque règle de l'app et sa source

Billy, croisé épagneul × labrador, né le 13 mai 2026 (6 mois le 13 novembre 2026).
Verdicts : **Sourcé** · **À nuancer** (la source dit autre chose) · **Non sourcé** (règle populaire ou choix de
l'app) · **À valider** par la vétérinaire ou l'éducateur. **Seuls eux peuvent valider : rien n'est coché ici.**

## Santé (vétérinaire)

| # | Ce que fait l'app | Source primaire | Verdict |
| --- | --- | --- | --- |
| 1 | Tout vaccin noté reçoit un rappel **annuel** (`lib/events.ts`) | WSAVA 2024 (Squires et al., *J Small Anim Pract*) : chiot, dernière injection à 16 semaines ou plus, **rappel à 26 semaines ou plus** ; adulte, valences essentielles (C, H, P) au plus tous les 3 ans ; leptospirose annuelle là où elle est endémique. [PDF](https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf) | **À nuancer** : l'annuel convient au « L » ; le rappel chiot à 6 mois manque (concerne Billy en novembre) |
| 2 | Rage : « obligatoire pour voyager à l'étranger » (`lib/questionnaire.ts`) | Règlement UE des voyages d'animaux (dès 12 semaines, valable 21 jours après) ; en France aussi pour les catégories 1 et 2 | **Sourcé**, incomplet |
| 3 | Vermifuge **tous les 3 mois**, à tout âge (`lib/events.ts`) | ESCCAP GL1 v8 : chiot jusqu'au sevrage toutes les 2 semaines, puis **mensuel jusqu'à 6 mois** si risque ; adulte de 1–2 à 12 fois par an selon le groupe de risque, 4 fois si inconnu. [PDF](https://www.esccap.org/uploads/docs/k37pvjys_0778_ESCCAP_GL1__Worm_Management_Scheme_Fact_Sheet__Dogs_v8.pdf) | **À nuancer · à valider** |
| 4 | Antiparasitaire puces/tiques **tous les mois**, quel que soit le produit | ESCCAP GL3 (2022) : l'intervalle dépend du produit (4 à 12 semaines, plus pour un collier). [PDF](https://www.esccap.org/uploads/docs/cgqtqpf1_0720_ESCCAP_GL3__English_v19_1p.pdf) | **À nuancer** |
| 5 | Stérilisation « prévue » → rappel « prendre rendez-vous » **à 6 mois** (`lib/events.ts`) | Hart et al. 2020, *Front Vet Sci* 7:388 (Labrador mâle : après 6 mois) et 7:472 (croisés de plus de 20 kg adulte : **attendre au moins 1 an**). [7:388](https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2020.00388/full) · [7:472](https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2020.00472/full) | **À nuancer · à valider** : Billy dépassera probablement 20 kg |
| 6 | Pesée **une fois par mois** jusqu'à environ 15 mois (`lib/weighing.ts`) | Courbes de croissance (Salt et al. 2017, *PLOS ONE*) ; aucune fréquence publiée trouvée (WSAVA, AAHA) | **Non sourcé · à valider** |
| 7 | « Chiot » avant 6 mois, « senior » dès 8 ans | AAHA 2019 : chiot jusqu'à la fin de la croissance rapide (6–9 mois selon la taille) ; senior = dernier quart de l'espérance de vie | **À nuancer** |
| 8 | « Un repas calme, sans le déranger » | Prévention des morsures (AAP, HealthyChildren.org) | **Sourcé** |
| 9 | Puce : 15 chiffres | ISO 11784 ; identification obligatoire en France (I-CAD) | **Sourcé** |

## Exercice et balades (vétérinaire et éducateur)

| # | Ce que fait l'app | Source | Verdict |
| --- | --- | --- | --- |
| 10 | **5 min par mois d'âge, par sortie, 3 sorties par jour**, jusqu'à 12 mois (`lib/walkBudget.ts`) | Règle attribuée au Kennel Club, texte original non trouvé ; citée comme « 2 fois par jour, jusqu'à la fin de la croissance ». **Sans base scientifique.** Krontveit et al. 2012 (*AJVR* 73:838) : le jeu libre au parc avant 3 mois est associé à moins de dysplasie. Revue Menzies 2025 (*Veterinary Ireland Journal*) : 45–60 min à 4–6 mois, à son rythme, sans intensité | **Non sourcé** ; l'app la triple et l'arrête à 12 mois |
| 11 | Sorties raccourcies « pour ses articulations » après une grosse balade | Aucune étude ne lie la durée de marche aux articulations ; les données portent sur l'intensité et les escaliers | **Non sourcé** |
| 12 | « Laissez-le renifler, ça le fatigue autant qu'une longue marche » | Duranton & Horowitz 2019 (*Appl Anim Behav Sci* 211:61) : le flair rend plus « optimiste » ; rien sur la fatigue | **À nuancer** |
| 13 | 3 sorties fixes (8 h, 13 h, 19 h) | Choix de l'app | **Non sourcé** |

## Dressage et socialisation (éducateur)

| # | Ce que fait l'app | Source | Verdict |
| --- | --- | --- | --- |
| 14 | Séance de 3 min avant 6 mois, 5 min après | Séances de 2 à 5 min, 2 à 3 fois par jour (Today's Veterinary Practice) | **Sourcé** (le seuil de 6 mois non) |
| 15 | Objectif 4 séances par semaine, repos le dimanche | Meyer & Ladewig 2008 ; Demant et al. 2011 (*Appl Anim Behav Sci* 133) : l'espacement aide (chiens de laboratoire) | **À nuancer** |
| 16 | Repos le lendemain d'un moment « difficile » | Accumulation des déclencheurs (pratique) ; durée non sourcée | **À nuancer** |
| 17 | « S'il ne mange plus, il est trop stressé : arrêtez et revenez plus facile » | Critère classique de désensibilisation (East Bay SPCA, Battersea) | **Sourcé** |
| 18 | Étape acquise après 3 réussites sur 3 jours différents | Aucune ; la seule règle publiée proche : signal verbal vers 8 réussites sur 10 | **Non sourcé · à valider** |
| 19 | 5 étapes : maison calme → maison animée → dehors calme → dehors animé → 3 lieux | Principe des « 3 D » (distance, durée, distraction), un seul à la fois ; « 3 lieux » non sourcé | **À nuancer** |
| 20 | 3 compétences au plus en même temps ; bloqué 2 semaines → revenir en arrière | Aucune | **Non sourcé · à valider** |
| 21 | Aucune méthode aversive | AVSAB 2021 ; Ziv 2017 ; Vieira de Castro 2020 ([PMC7743949](https://pmc.ncbi.nlm.nih.gov/articles/PMC7743949)) | **Sourcé** |
| 22 | Peurs : distance, sous le seuil, déclencheur puis friandise | Désensibilisation et contre-conditionnement (sources de praticiens) | **Sourcé** (pas d'études contrôlées) |
| 23 | 13 exercices marqués vérifiés (prénom, touche-main, tapis, relaxation Overall, 1-2-3, *engage-disengage*, rappel ping-pong…) | AKC, McDevitt, Overall, Guide Dogs, Blue Cross, SF SPCA, UC Davis (liens dans `src/content/training.ts`) | **Sourcé** |
| 24 | 8 exercices écrits de mémoire (Cherche !, Petites absences, Visite de courtoisie, Assis-couché au leurre, Attendre à la porte, Quatre pattes au sol, Parcours d'objets, Friandise au loin) | — | **À valider** |
| 25 | « Cherche ! fait baisser le stress » | Duranton & Horowitz 2019 (optimisme, pas stress) | **À nuancer** |
| 26 | Garde-fous : chiot « beaucoup de repos », adopté adulte « 2-3 semaines de décompression » | Règle populaire (« 3-3-3 ») | **Non sourcé · à valider** |
| 27 | Socialisation (dans la recherche du projet) : 3 premiers mois principaux, continuer après | AVSAB 2008 ; Appleby et al. 2002 ; Howell, King & Bennett 2015 ([PMC6067676](https://pmc.ncbi.nlm.nih.gov/articles/PMC6067676)) | **Sourcé** ; « 4–6 mois, la fenêtre qui compte le plus » est surinterprété |
| 28 | Durées par étape, « 8 à 12 mois pour tout l'arbre » | Estimations | **Non sourcé** |

Non lus directement : la page du Kennel Club, les pages de Battersea et de l'Anti-Cruelty Society, le texte intégral
de Krontveit 2012 (le résultat sur les escaliers vient de résumés). Aucune citation n'est inventée.

**À décider avec la vétérinaire en priorité** : castration à 6 mois (la source plaide pour 12 mois ou plus à plus
de 20 kg) ; vermifuge mensuel jusqu'à 6 mois ; rappel vaccinal chiot à 26 semaines ; règle des 5 minutes.

---

## Fiche de validation (à imprimer, 10 minutes)

**Billy (croisé épagneul × labrador, né le 13 mai 2026) — ce que l'app conseille.** Merci de cocher chaque ligne.

### Santé — pour la vétérinaire

| # | Règle de l'app | OK | À changer | Commentaire |
| --- | --- | --- | --- | --- |
| 1 | Après un vaccin noté, rappel **1 an plus tard** (pas de rappel chiot à 6 mois). | ☐ | ☐ | |
| 2 | Rage : « obligatoire seulement pour voyager à l'étranger ». | ☐ | ☐ | |
| 3 | Vermifuge **tous les 3 mois**, à tout âge (y compris avant 6 mois). | ☐ | ☐ | |
| 4 | Antiparasitaire puces/tiques **tous les mois**, quel que soit le produit. | ☐ | ☐ | |
| 5 | Castration prévue : rappel « prendre rendez-vous » **à 6 mois**. | ☐ | ☐ | |
| 6 | Pesée **une fois par mois** jusqu'à environ 15 mois. | ☐ | ☐ | |
| 7 | « Chiot » jusqu'à 6 mois, « âgé » dès 8 ans. | ☐ | ☐ | |
| 8 | Balades : **5 min par mois d'âge, par sortie, 3 sorties par jour**, jusqu'à 1 an. | ☐ | ☐ | |
| 9 | Après une grosse balade, sorties suivantes raccourcies « pour ses articulations ». | ☐ | ☐ | |
| 10 | « Laissez-le renifler : ça le fatigue autant qu'une longue marche. » | ☐ | ☐ | |
| 11 | « Un repas calme, sans le déranger. » | ☐ | ☐ | |

Questions :

1. Pour Billy : dernier rappel chiot (à 6 mois ?), puis quel rythme pour CHP, leptospirose et toux du chenil ?
2. Vermifuge et antiparasitaire : quel rythme pour lui (ville, parcs, mange de l'herbe) et quels produits ?
3. Castration : à quel âge, vu son poids adulte probable ? Quelle limite d'exercice jusqu'à la fin de sa croissance
   (escaliers, course, vélo) ?

### Dressage et socialisation — pour l'éducateur

| # | Règle de l'app | OK | À changer | Commentaire |
| --- | --- | --- | --- | --- |
| 12 | Séance de **3 min** avant 6 mois, **5 min** après ; un seul exercice par séance. | ☐ | ☐ | |
| 13 | Une mission par jour, objectif **4 séances par semaine**, repos le dimanche. | ☐ | ☐ | |
| 14 | Repos le lendemain d'un moment « difficile » (peur, réaction). | ☐ | ☐ | |
| 15 | S'il refuse les friandises, il est trop stressé : on arrête et on reprend plus facile. | ☐ | ☐ | |
| 16 | 5 étapes par compétence : maison calme → maison animée → dehors calme → dehors animé → 3 lieux. | ☐ | ☐ | |
| 17 | Étape acquise après **3 réussites sur 3 jours différents**, Billy détendu. | ☐ | ☐ | |
| 18 | **3 compétences au maximum** en même temps. | ☐ | ☐ | |
| 19 | Bloqué 2 semaines : on revient au réglage précédent quelques jours. | ☐ | ☐ | |
| 20 | Peurs : distance où il mange encore ; jamais s'approcher pour réussir ; jamais de contact forcé. | ☐ | ☐ | |
| 21 | Rappel : mot réservé, voix joyeuse, jamais pour gronder ou finir la balade ; longe de 10 m dehors. | ☐ | ☐ | |
| 22 | Chien craintif : pas d'étape « dehors animé » tant que ses dernières réactions ne sont pas calmes. | ☐ | ☐ | |
| 23 | Exercices écrits par l'app, à relire : Cherche !, Petites absences, Visite de courtoisie, Assis/couché au leurre, Attendre à la porte, Quatre pattes au sol, Parcours d'objets, Friandise au loin. | ☐ | ☐ | |
| 24 | Relaxation de K. Overall (environ 8 min par jour) seulement après 6 mois. | ☐ | ☐ | |
| 25 | Garde-fous : chiot « beaucoup de repos » ; énergique « dépense mentale avant les séances calmes » ; adopté adulte « 2-3 semaines de décompression ». | ☐ | ☐ | |

Questions :

1. Pour Billy (peur des enfants, des rues étroites, des bruits) : par quelle compétence commencer, à quelle distance ?
2. « 3 réussites sur 3 jours » : trop facile, trop dur, autre critère (8 sur 10) ?
3. Quels exercices de la ligne 23 retireriez-vous ou remplaceriez-vous par les vôtres ?
