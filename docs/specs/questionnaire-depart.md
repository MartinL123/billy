# Questionnaire de départ — contenu détaillé

Validé avec Martin le 13 octobre 2026 (document de travail : https://claude.ai/code/artifact/c40380ab-f124-4df1-805f-b07e289bce53).
Fait partie de la spec V3 (§ 4). Les parties 4 et 5 restent à faire valider par l'éducateur.

## Principes

- **Le but** : savoir tout ce qui est utile sur le chien, où il en est, et à quel niveau il démarre. Un chien plus âgé et
  bien éduqué démarre plus haut et peut déjà avoir toutes les étapes d'une compétence. Mais un chien apprend par la
  **répétition** : l'app ne s'arrête jamais à « acquis », elle propose chaque jour quoi faire (§ « Programme du jour » de la spec).
- Chaque question remplit une partie précise de l'app (profil, rappel, carte Repas, contact, point de départ d'une compétence).
  Une question qui ne sert à rien dans l'app n'existe pas.
- 5 parties, environ 30 questions, 5 à 7 minutes. Une question par écran, gros boutons, barre de progression par partie.
- Ordre : identité → santé → quotidien → réactions → ce qu'il sait faire.
- Tout est facultatif (« Je ne sais pas », « Passer ») et modifiable ensuite dans le profil.
- **Pré-rempli** avec ce que l'app sait déjà : on confirme au lieu de retaper.
- Des faits observables, jamais des étiquettes.
- Une réponse ne compte qu'après « Suivant » (jamais à la simple ouverture d'un écran pré-rempli).

## Partie 1 · Sa fiche d'identité

| Question | Réponses | Sert à |
| --- | --- | --- |
| Comment s'appelle-t-il ? | Texte | Partout |
| Une photo de lui ? | Photothèque | Ouverture, accueil, profil |
| Sa date de naissance ? | Date, ou « âge approximatif » | Âge, étapes 6 mois / 1 an, chiot ou senior déduits |
| Mâle ou femelle ? | Mâle · Femelle | Accords du texte |
| Est-il stérilisé ? | Oui · Non · C'est prévu | Rappel « stérilisation » si prévu |
| Sa race ou son croisement ? | Texte avec suggestions | Profil |
| Son poids actuel ? | kg, clavier numérique | Première pesée |
| Quand l'avez-vous adopté ? | Date | Anniversaire d'adoption, « depuis X jours » |
| D'où vient-il ? | Élevage · Refuge ou association · Particulier · Autre | Profil |
| Son numéro de puce ou de tatouage ? | Texte (facultatif) | Profil |

## Partie 2 · Sa santé

Chaque date crée le prochain rappel dans le calendrier.

| Question | Réponses | Sert à |
| --- | --- | --- |
| Son vétérinaire ? | Nom + téléphone | Contact « Appeler » |
| Son dernier vaccin ? | Date + lequel (CHPPiL, rage, toux du chenil…) | Rappel annuel |
| Est-il vacciné contre la rage ? | Oui (date) · Non | Rappel ; mention « obligatoire pour voyager à l'étranger » |
| Son dernier vermifuge ? | Date (ou « je ne sais pas ») | Rappel tous les 3 mois |
| Son dernier traitement puces et tiques ? | Date + type (pipette, comprimé, collier) | Rappel au bon rythme |
| Un traitement ou un souci de santé à surveiller ? | Texte libre | Encart « À savoir » dans Santé |
| Une allergie (aliment, médicament) ? | Texte libre | « À savoir » + filtre des idées à mâcher |

L'assurance santé n'est **pas** dans le questionnaire : uniquement dans le profil.

## Partie 3 · Son quotidien

| Question | Réponses | Sert à |
| --- | --- | --- |
| Que mange-t-il ? | Croquettes · Pâtée · Mélange · Maison + marque | Profil |
| Combien par jour, en combien de repas ? | Grammes + nombre de repas + horaires | Carte Repas |
| Ses friandises préférées ? | 1 à 3 réponses (texte) | Récompense rappelée dans les exercices |
| Ses jeux préférés ? | **Choix multiple** : Balle · Corde · Peluche · Os ou jouet à mâcher · Jouet qui couine · Course et poursuite · Autre | Occupation du jour, récompenses |
| Où vivez-vous ? | Appartement · Maison | Exercices adaptés |
| Avez-vous un jardin ou une cour ? | Oui · Non · Parfois | Si non : « jardin » remplacé par « couloir, palier, parc vide » |
| Combien de temps reste-t-il seul par jour ? | Jamais · Moins de 2 h · 2 à 4 h · Plus de 4 h | Le Calme mis en avant |
| Combien de sorties par jour ? | 1 · 2 · 3 · 4 ou plus | Rythme du programme du jour |
| Avez-vous un éducateur canin ? | Non · Oui : nom + téléphone + prochaine séance | Contact + rendez-vous |
| Qui s'occupe de lui au quotidien ? | Seul · En couple · En famille avec enfants | Conseils adaptés (règles enfants) |

## Partie 4 · Comment il réagit (phrases à trous)

Le maître décrit lui-même, avec des phrases à trous : **« Quand [situation], il est [réaction]. »**

- **Situation** : une suggestion à toucher, ou texte libre. Suggestions : il croise un adulte inconnu · il croise des enfants ·
  il croise un autre chien · il entend les bruits de la ville · il passe dans une rue étroite · il voit son reflet ·
  il découvre un objet nouveau · on lui touche les pattes ou les oreilles · il reste seul · il monte en voiture ·
  il prend les transports · il va chez le véto · il y a un orage · il monte un escalier.
- **Réaction** : À l'aise · Un peu inquiet · Il a peur ou il réagit · ou texte libre.
- **+ Ajouter une phrase** : autant qu'on veut ; modifiables ensuite dans le profil.
- Dernière phrase : **« À la maison, il est plutôt [Calme · Joueur · Très excité · texte]. »**

Pré-rempli pour Billy (à confirmer) : rue étroite → il a peur (se bloque) ; enfants → il a peur (grogne) ; reflet → il a peur (la nuit).

**Ce que l'app en tire :**
- Situation suggérée → reliée à sa compétence (adulte, enfants → Les Rencontres ; chien → Les Congénères ;
  bruits, rue étroite, transports → La Ville ; reflet, objet, voiture, orage, escalier → La Nouveauté ;
  pattes, véto → Les Soins ; seul → Le Calme). Phrase libre → « Ça concerne… » avec les 10 cases, ou laissée en note.
- Chaque « Il a peur ou il réagit » → compétence **conseillée**, démarre à sa première étape.
- 2 phrases ou plus en « peur » → mode **chien craintif** (précautions, défis toujours au calme).
- « Très excité » → Le Calme conseillé. Chiot / âgé : déduits de la date de naissance.

## Partie 5 · Ce qu'il sait déjà faire

Une question par compétence : **Pas encore** · **À la maison** · **Même dehors** (+ « Je ne sais pas »).

| Compétence | Question |
| --- | --- |
| Le Lien | Quand vous dites son nom, il vous regarde… |
| Le Calme | Il se pose tout seul sur son panier ou son tapis… |
| Les Soins | Il se laisse toucher les pattes et les oreilles… |
| La Laisse | Il marche sans tirer en laisse… |
| Le Rappel | Quand vous l'appelez, il revient… |
| Les Bonnes manières | Il s'assoit quand vous le demandez… |
| La Nouveauté | Devant un objet qu'il ne connaît pas, il va le renifler… |
| La Ville | Il marche tranquillement… (Pas encore · Rue calme · Même en rue animée) |
| Les Rencontres | Il reste détendu quand quelqu'un passe près de lui… (Pas encore · De loin · Même de près) |
| Les Congénères | Il reste détendu quand il voit un autre chien… (Pas encore · De loin · Même de près) |

- Correspondance interne : Pas encore → 0 étape ; À la maison / Rue calme / De loin → étapes 1 et 2 ;
  Même dehors / Même en rue animée / Même de près → étapes 1 à 3 ; marquées « avant l'app » ; elles comptent pour le niveau comme les autres.
- **Chien âgé ou déjà éduqué** : si « Même dehors », question complémentaire (« Même dans un lieu très animé ? »,
  « Partout où vous allez ? ») → étapes 4 et 5. Un chien peut donc démarrer avec toutes les étapes et un niveau élevé.
- Une compétence complète passe en **« à entretenir »** : elle revient dans le programme du jour, plus rarement.
- Cohérence : une situation « Il a peur » en partie 4 pré-règle la compétence correspondante sur « Pas encore » (modifiable).
- **Écran de résultat modifiable** (maquette `V3-QuestionnaireResultat`, décision du 13/10) :
  - titre « Billy commence au niveau N · Titre », puis l'encadré « Vérifiez avant de commencer » ;
  - les 10 compétences en cartes, rangées par étage (La Maison, Le Quartier, Le Grand Monde), avec leur anneau ;
    dans chaque carte, les étapes cochées **en cases à cocher** + l'étape suivante non cochée ;
  - toucher une étape la **décoche** (ou coche la suivante). Décocher une étape décoche aussi les plus difficiles de la
    même compétence ; cocher une étape coche aussi les plus faciles ;
  - le niveau du titre se **recalcule en direct** ; un bandeau « Les Soins : 2 étapes décochées. Niveau recalculé. »
    avec **« Annuler »** apparaît quelques secondes ;
  - en bas : « Retour » (contour) et **« C'est bon, on commence »** (orange).
  - Corriger plus tard : depuis le profil → « Questionnaire de départ » → cet écran. Seules les étapes « avant l'app »
    (`preApp`) sont modifiables ici ; une étape validée dans l'app ne se décoche jamais.
- **Souvenir des premières semaines** : carte-bouton « Noter un souvenir de vos premières semaines ». Après l'avoir
  noté, on revient sur le résultat et la carte devient **« Souvenir noté dans le Carnet »** (coche verte, titre du
  souvenir, nombre de photos) avec un petit bouton contour **« Un autre »**. Le bouton d'origine ne réapparaît pas.
