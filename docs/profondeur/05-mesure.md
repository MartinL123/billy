# Mesure : 3 indicateurs, un journal privé

Cadre HEART (Google, Rodden et al. 2010) réduit au strict nécessaire : un indicateur par métier, rien d'autre.
Tout reste sous `users/{uid}/…`, lu seulement par le propriétaire (`firestore.rules` existantes). Aucun outil
d'analyse tiers, aucun envoi ailleurs. Budget 0 €, plan Spark.

## Les 3 indicateurs

| Métier | HEART | Indicateur | Calcul | Cible |
| --- | --- | --- | --- | --- |
| 1. Balade | Task success | **Taux de capture** | balades enregistrées dans Flair ÷ marches réelles de la semaine (référence : entraînements « Marche » ≥ 10 min de l'Apple Watch, plus les sorties notées à la main) | ≥ 95 % ; **0 balade perdue** (démarrée dans Flair et absente de la liste) |
| 2. Santé | Task success | **Soins faits à temps** | soins et RDV marqués faits au plus tard 3 jours après leur date ÷ soins arrivés à échéance sur 90 jours | ≥ 90 % ; 0 soin en retard de plus de 14 jours |
| 3. Entraînement | Engagement | **Jours entraînés** | jours avec au moins une séance terminée ÷ 7, et durée médiane d'une séance | ≥ 5 jours sur 7 ; médiane ≤ 3 min 30 s |

Pas d'indicateur « Happiness » dans l'app : il vient du test utilisateurs (UMUX-Lite, voir `06-test-utilisateurs.md`).
Pas de « Retention » ni « Adoption » : un seul utilisateur réel aujourd'hui, ces chiffres ne voudraient rien dire.

## Journal d'événements privé

Un document par jour : `users/{uid}/journal/{AAAA-MM-JJ}`, champ `events` (tableau), ajouts par `arrayUnion`.
Une écriture par événement, une lecture par jour consulté. Hors ligne : l'écriture part au retour du réseau,
comme le reste. Jamais en mode visiteur.

| Événement | Champs | Sert à |
| --- | --- | --- |
| `walk_start` | `at`, `source` (gps) | balade démarrée |
| `walk_saved` | `at`, `source` (gps, watch, gpx, sortie), `min`, `m`, `entryId` | indicateur 1 |
| `walk_recovered` | `at`, `from` (fichier natif, « Balade à enregistrer ») | balade sauvée après incident |
| `walk_error` | `at`, `step` (stop, save, verify), `code` | casse, à relier au protocole |
| `walk_discarded` | `at`, `min` | « Ne pas la garder » (volontaire) |
| `care_done` | `at`, `eventId`, `lateDays` | indicateur 2 |
| `session_start` / `session_done` | `at`, `skill`, `sec` | indicateur 3 |
| `app_open` | `at`, `native` (oui/non) | contexte (au plus 1 par heure) |
| `crash_reload` | `at`, `reason` (`firestoreCrash`) | R-042 et suivants |

Volume attendu : moins de 30 écritures par jour (quota Spark : 20 000), moins de 1 Ko par jour stocké.

## Où le lire

Un écran caché `#/journal` (propriétaire seulement), sans lien depuis l'app : les 3 indicateurs sur 7, 30 et
90 jours, et la liste brute des événements du jour. Rien n'est affiché à un visiteur ni à un testeur.

## Ce qui n'est pas mesurable par l'app seule

- **Marches réelles** (dénominateur de l'indicateur 1) : seulement si la Watch les enregistre. Une marche sans Watch
  et sans Flair est invisible : Martin la note le soir dans la fiche de pointage (`03-protocole-casse.md`).
- **Qualité du conseil santé ou dressage** : se valide avec la vétérinaire et l'éducateur (`04-fiche-contenu.md`).
