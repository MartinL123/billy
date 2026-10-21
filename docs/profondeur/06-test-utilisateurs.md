# Test avec 5 personnes : script et grille

**Objectif** : prouver, hors de Martin, que les trois métiers marchent sans aide. Ce test ne peut être fait que par
Martin avec de vrais participants : Claude ne coche rien ici.

## Participants (5)

Proches des personas de `docs/design/contexte-flair.md`, chacun avec un chien (ou qui en garde un souvent).

| # | Profil visé | Critère de recrutement |
| --- | --- | --- |
| P1 | Josiane | 60 ans ou plus, peu à l'aise avec le téléphone, **texte agrandi activé** sur son iPhone |
| P2 | Léo | 20–35 ans, très à l'aise, marche beaucoup avec son chien |
| P3 | Les Moreau | parent d'une famille avec enfants, chien partagé |
| P4 | Martin-like | premier chiot, organisé, utilise une Apple Watch |
| P5 | au choix | quelqu'un qui n'a jamais vu Flair, idéalement utilisateur de VoiceOver (sinon : passage VoiceOver fait par Martin, voir plus bas) |

5 personnes suffisent à trouver l'essentiel des problèmes d'utilisabilité (Nielsen et Landauer, 1993), pas à
mesurer un taux précis : les chiffres servent à comparer d'une version à l'autre, pas à conclure seuls.

## Préparation (Martin)

- Un compte de test par participant (créés par Martin, comme pour la meute), chien « Oslo », 5 mois.
- Données de départ identiques : un **vermifuge dû aujourd'hui**, un vaccin dans 20 jours, deux balades passées, le
  questionnaire fait (pour que la mission du jour existe).
- iPhone du participant (de préférence) avec l'app installée depuis l'écran d'accueil, ou l'iPhone de test.
- Enregistrement de l'écran (Centre de contrôle) et de la voix, avec accord écrit (ci-dessous).
- Chronomètre ; la grille imprimée.

## Script (≈ 20 min)

**Accueil (2 min)** — à lire tel quel :

> « Merci. On teste l'app, pas vous : si quelque chose est difficile, c'est l'app qui a un problème. Pensez à voix
> haute : dites ce que vous cherchez, ce que vous pensez qu'il va se passer. Je ne pourrai pas vous aider pendant les
> tâches ; à la fin, je répondrai à toutes vos questions. On peut arrêter quand vous voulez. »

Accord : « J'accepte que l'écran et ma voix soient enregistrés pour améliorer l'app ; l'enregistrement est supprimé
après analyse et n'est montré à personne d'autre. » Signature, date.

**Tâche 1 — Balade (6 min max)** :

> « Vous partez promener Oslo maintenant. Utilisez l'app pour enregistrer la balade. Marchez une minute dans la pièce
> ou le couloir, puis rentrez et terminez la balade. Ensuite, montrez-moi où la retrouver. »

Réussite : la balade est arrêtée et gardée, et le participant la retrouve dans la liste ou sur la carte.

**Tâche 2 — Santé (4 min max)** :

> « Dites-moi ce qu'Oslo doit faire prochainement pour sa santé. Puis indiquez que vous lui avez donné son vermifuge
> aujourd'hui. »

Réussite : il nomme le vermifuge (et éventuellement le vaccin), puis le vermifuge est marqué fait.

**Tâche 3 — Entraînement (5 min max)** :

> « Vous avez trois minutes avant de partir travailler. Faites l'entraînement du jour avec Oslo (faites semblant
> avec moi). »

Réussite : la séance est lancée et terminée (« C'est fait » ou équivalent), en 3 min 30 s au plus.

**Questionnaire UMUX-Lite (1 min)** — 7 cases, de « Pas du tout d'accord » (1) à « Tout à fait d'accord » (7) :

1. « Les fonctions de cette app répondent à mes besoins. »
2. « Cette app est facile à utiliser. »

Score = ((Q1 − 1) + (Q2 − 1)) ÷ 12 × 100 (Lewis, Utesch et Maher, 2013). Repère : 68 ≈ moyenne.

**Débrief (2 min)** : « Qu'est-ce qui vous a surpris ? Qu'est-ce que vous enlèveriez ? »

## Grille de résultats

Réussite : 2 = sans aide, 1 = avec hésitation ou une erreur rattrapée seul, 0 = échec ou aide nécessaire.

| Participant | T1 réussite | T1 temps | T2 réussite | T2 temps | T3 réussite | T3 temps | UMUX Q1 | UMUX Q2 | UMUX /100 | Erreurs, citations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | | | | | | | | | | |
| P2 | | | | | | | | | | |
| P3 | | | | | | | | | | |
| P4 | | | | | | | | | | |
| P5 | | | | | | | | | | |
| **Total** | /10 | médiane | /10 | médiane | /10 | médiane | | | moyenne | |

Critère de passage proposé : chaque tâche réussie sans aide par au moins 4 personnes sur 5, T3 en 3 min 30 s au plus
(médiane), UMUX-Lite ≥ 68.

## Passages d'accessibilité (Martin, ou un participant concerné)

**VoiceOver complet** (Réglages › Accessibilité › VoiceOver), sans regarder l'écran si possible :

| Étape | Attendu | OK / KO | Note |
| --- | --- | --- | --- |
| Se connecter | champs annoncés « E-mail », « Mot de passe », erreur lue | | |
| Accueil | « Bonjour, Oslo », carte du moment, sorties lues avec leur état | | |
| Démarrer puis arrêter une balade | boutons nommés, durée lisible, fin « Belle balade ! » annoncée | | |
| Santé : trouver le vermifuge, le marquer fait | type lu en mots (pas seulement une couleur) | | |
| Ajouter un soin (feuille) | le focus entre dans la feuille, « Fermer » disponible | | |
| Mission du jour jusqu'au bout | chaque étape annoncée, rien ne passe seul sans prévenir | | |
| Billy : progrès d'une compétence | pattes lues en phrase, « Voir tout son chemin » | | |

**Plus grande taille de texte** (Réglages › Accessibilité › Affichage et taille du texte › Texte plus grand, curseur
au maximum), sur un iPhone de 320 ou 375 px de large si possible :

| Écran | Bouton principal visible sans défiler | Aucun texte coupé | Rien sous le rond Accueil | Note |
| --- | --- | --- | --- | --- |
| Accueil | | | | |
| Balade en cours | | | | |
| Santé | | | | |
| Balades (carte) | | | | |
| Billy | | | | |
| Mission | | | | |
