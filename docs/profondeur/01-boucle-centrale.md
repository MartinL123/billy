# La boucle centrale de Flair

Flair fait trois métiers, et rien d'autre tant qu'ils ne sont pas fiables et prouvés :

1. **Balade** : chaque balade est enregistrée.
2. **Santé** : je sais ce qui est dû.
3. **Entraînement** : je fais l'entraînement du jour en 3 minutes.

## La journée

1. **J'ouvre Flair** (Accueil). Une seule carte me dit quoi faire maintenant : un soin dû, la sortie de l'heure,
   l'entraînement du jour, ou une balade à terminer. Rien d'autre ne réclame mon attention.
2. **Je sors Billy.** « Partir en balade » sur l'iPhone, ou la Watch qui enregistre seule, ou « + Noter » au retour
   si je n'ai rien lancé. La balade apparaît une fois, avec sa durée et sa distance. Les trois pastilles du jour
   (matin, midi, soir) se cochent.
3. **Je fais l'entraînement du jour.** Un bouton, une mission de 3 minutes, « C'est fait ». Le progrès se voit en
   pattes sur l'écran Billy.
4. **La santé me prévient.** La veille d'un soin, une notification ; le jour J, la carte de l'accueil ; un retard,
   un badge rouge sur l'onglet Santé. Je coche « C'est fait ».
5. **Le soir**, l'accueil me montre ce qui reste ; je peux revoir mes balades sur la carte.

## Chaque écran et chaque fonction, jugés sur les trois métiers

Inventaire complet (34 écrans réels, 105 composants, ≈ 20 700 lignes hors tests, 25 collections Firestore) :
voir le tableau détaillé plus bas. Verdicts : **Garder** · **Simplifier** · **Geler** (le code reste, les entrées
disparaissent, plus aucun travail) · **Retirer** (de l'interface puis du code ; aucune donnée n'est supprimée).

| Écran ou fonction | Métier | Verdict | Pourquoi |
| --- | --- | --- | --- |
| Accueil (carte du moment, sorties du jour, « Sa vie avec vous ») | 1 · 2 · 3 | **Garder** | C'est la boucle. Retirer la pastille d'os vers la boutique. |
| Balade en cours (GPS natif) | 1 | **Garder**, durcir | Le métier n° 1. Risques ouverts : voir `03-protocole-casse.md` § Risques. |
| Synchro Apple Watch (marches HealthKit) | 1 | **Garder** | Deuxième source de balades, sans geste. |
| « + Noter » une sortie sans GPS | 1 | **Garder** | Filet de sécurité quand rien n'a été lancé. |
| Import GPX / Strava | 1 | **Garder**, simplifier le résultat | Dire « N balades ajoutées », pas « Le brouillard s'est levé ». |
| Liste des balades, détail d'une balade, repères, photos | 1 | **Garder** | Retrouver une balade. Retirer « Partager avec la meute ». |
| Carte des balades (Explorer) | 1 | **Simplifier** | Garder la carte des tracés et le panneau. **Geler** brouillard, « % découvert », communes, idées, spots. |
| Idées « À découvrir » (OpenStreetMap) | aucun | **Retirer** | Aucun usage réel, appelle une API externe. |
| Santé (semaine, retards, prochaine chose, ajout) | 2 | **Garder** | Le métier n° 2. |
| Événements, poids, documents, formulaire de soin | 2 | **Garder** | Retirer l'export .ics des repas. |
| Notifications locales (soin la veille, sortie) | 2 · 1 | **Garder** | Retirer le récap du dimanche (aucun écran derrière). |
| Mission du jour | 3 | **Garder** | Le métier n° 3. |
| Exercice d'une compétence (`/exercice`) | 3 | **Simplifier** | Fusionner avec la mission : un seul lanceur de séance. |
| Billy (pattes, prochaine étape, « S'entraîner ») | 3 | **Garder** | Retirer les tuiles Boutique et Meute. |
| Chemin d'une compétence | 3 | **Garder** | |
| Choisir les compétences en cours (`/en-cours`) | 3 | **Garder, rebrancher** | **Inaccessible aujourd'hui** : son seul lien est sur l'arbre, que plus rien n'ouvre. La mission du jour en dépend. |
| Arbre des compétences (`/billy/arbre`) | 3 | **Retirer** | Orphelin : aucun lien n'y mène. |
| Noter une séance ou un souvenir (`/noter`) | 3 · 1 | **Simplifier** | Retour sobre à la place des confettis. |
| Questionnaire de départ | 2 · 3 | **Simplifier** | Ne garder que ce qui nourrit la santé et les compétences. |
| Ouverture animée à chaque lancement | aucun | **Simplifier** | Seulement au premier lancement : elle coûte 1 s à chaque ouverture. |
| « Bienvenue » | aucun | **Retirer** | |
| Profil, réglages des sorties, compte | support | **Garder** | |
| Boutique, cosmétiques, thèmes | aucun | **Retirer** | Aucun usage réel ; les os restent en base. |
| Os gagnés en silence (défi de la semaine, semaine régulière) | aucun | **Retirer** | Le défi n'est plus affiché depuis la V4 mais rapporte encore +30 os. |
| Confettis, pluie d'os, compteur animé | aucun | **Retirer** | |
| Meute (amis, fil, spots, « Marquer »), publication du profil | aucun | **Geler**, puis retirer | Elle lit toute la meute à chaque ouverture de la carte. |
| Rappel du soir en web push (tâche GitHub toutes les 15 min) | aucun sur iPhone | **Geler** | L'iPhone a ses notifications locales ; c'est le plus gros poste de lectures hors de l'app. |
| Mode visiteur (Famille) | aucun | **Geler** | Trop imbriqué (75 branches dans 17 fichiers) pour le retirer maintenant. |
| Rattrapages ponctuels (os, brouillard, genres de fichiers, anniversaire) | aucun | **Retirer** dans une version | Après vérification que les comptes sont passés. |
| Écouteurs `quests`, `places`, `sessions` | aucun | **Retirer** | Jamais utilisés ou jamais écrits : lectures inutiles à chaque ouverture. |

## Ce qu'on retire (proposition, par ordre)

| # | Quoi | Lignes en moins | Risque |
| --- | --- | --- | --- |
| 1 | Code mort et 3 écouteurs inutiles | ≈ 290 | très faible |
| 2 | Arbre orphelin (et rebrancher « compétences en cours » depuis Billy) | ≈ 230 | faible |
| 3 | Os silencieux (`DressageAwards`), boutique, thèmes, confettis | ≈ 770 | faible |
| 4 | Idées « À découvrir » | ≈ 500 | faible à moyen |
| 5 | Meute (geler d'abord) | ≈ 1 000 | moyen |
| 6 | Brouillard et « % découvert » (geler d'abord : il touche l'import et la balade GPS) | ≈ 460 | moyen à élevé |
| 7 | Fusion `/exercice` dans `/mission` | ≈ 200 | moyen |

Total : ≈ 4 500 lignes, environ 22 % du code. **Décision de Martin** : rien n'est retiré avant son accord.
