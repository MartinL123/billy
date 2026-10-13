# Prompt Claude Code — résultat du questionnaire modifiable + filtre Santé + étapes du chemin + quête → exercice (13 octobre, 22 h 50)

```
Si le prompt docs/archives/prompt-v3-3.md n'est pas encore entièrement fait, termine-le d'abord.

Lis docs/specs/questionnaire-depart.md (partie 5, fin) et docs/specs/spec-v3-simplification.md § 4 :
ils ont été mis à jour. Maquette : docs/maquettes/V3-QuestionnaireResultat.dc.html.
Ne modifie aucun fichier de docs/ sans me le demander.

Écran de fin du questionnaire (« Ce qu'il sait déjà faire ») :
1. Remplace la liste à plat par 10 cartes rangées par étage (La Maison, Le Quartier, Le Grand Monde), avec l'anneau
   de la compétence. Dans chaque carte : les étapes acquises en cases à cocher (zone tactile de toute la ligne,
   ≥ 48 px) + l'étape suivante non cochée.
2. Toucher une étape la décoche ; décocher décoche aussi les étapes plus difficiles de la même compétence ; cocher
   coche aussi les plus faciles. Cela met à jour les réponses de la partie 5 et `bossProgress.preApp`.
3. Le titre « Billy commence au niveau N · Titre » se recalcule en direct. Bandeau quelques secondes :
   « [Compétence] : N étapes décochées. Niveau recalculé. » + bouton « Annuler ».
4. Sur cet écran, seules les étapes `preApp` sont modifiables (les étapes validées dans l'app se corrigent depuis le
   chemin, point 9). Aucune donnée supprimée en dehors de ces étapes.
5. En bas : « Retour » (contour) et « C'est bon, on commence » (orange). Le même écran est accessible plus tard
   depuis le profil → « Questionnaire de départ ».
6. Souvenir : après « Noter un souvenir de vos premières semaines », au retour sur cet écran, le bouton est remplacé
   par une carte « Souvenir noté dans le Carnet » (coche verte, titre du souvenir, nombre de photos) avec un petit
   bouton contour « Un autre ».
7. Ajoute des tests : décocher/cocher en cascade, recalcul du niveau.

Montre-moi l'écran sur l'iPhone avant de committer.

Ensuite, dans un second commit — Santé (§ 5.10, maquette V3-SanteAVenir) :
8. Au-dessus de « À venir », une rangée de pastilles-filtres qui défile : Tout · Soins · Vaccins · Véto · Éducateur ·
   Étapes, avec point de couleur et nombre d'événements à venir ; un seul choix, « Tout » par défaut. Elles
   remplacent la légende sous le calendrier. Le filtre s'applique à « À venir », « Faits » et aux pastilles du
   calendrier. Catégorie vide : message + bouton « Ajouter un rendez-vous véto » (ou la catégorie choisie), formulaire
   pré-réglé. Anniversaires et « Billy a 6 mois / 1 an » = Étapes. Dernier filtre retenu sur l'appareil.

Puis un troisième commit — le chemin d'une compétence (§ 5.5, maquettes V3-Chemin et V3-CheminEtape) :
9. Phrase d'aide « Touchez une étape pour la cocher ou la décocher. » Chaque cercle d'étape est un bouton qui ouvre un
   panneau en bas. Étape cochée : date d'acquisition (ou « Il savait déjà le faire »), explication, avertissement de
   cascade, « Décocher cette étape » (contour rouge) et « Garder cochée ». Étape non cochée : « Il sait déjà faire
   ça ? » + « Cocher cette étape » (coche aussi les plus faciles, marquée « Il savait déjà le faire »).
   Bandeau avec « Annuler » quelques secondes après, jamais de confirm() système. Décocher décoche les étapes plus
   difficiles ; le niveau se recalcule (voir prompt-v3-7). Tests : cascade, recalcul du niveau, Annuler.

Puis un quatrième commit — la quête du jour mène à l'exercice (§ 5.9, maquettes V3-Accueil et V3-QueteExercice) :
10. Sur l'accueil, toute la carte de quête est touchable (chevron) et son bouton devient « ▶ Commencer » ; sous le
    titre, durée et réglage du jour. Les deux ouvrent l'écran de l'exercice : en-tête couleur du territoire, nom,
    compétence et étape visée, durée + réglage, illustration, « Ce qu'il faut », « Comment faire » en 3 temps,
    « Bon à savoir », « Trop difficile aujourd'hui ? » (réglage d'avant), source ; en bas « Lancer le minuteur ·
    3 min » (orange, 5 min après 6 mois, écran gardé allumé, fin signalée à l'écran + petit son — pas de vibration, Safari iPhone ne la gère pas) et « C'est fait ! » (contour) qui
    ouvre « Quête réussie ? ». Réutilise l'écran Exercise existant si possible ; le même écran sert à
    « S'entraîner » depuis le chemin. Journée de repos : page simple sans minuteur.
11. Partout où s'affiche « Pour : [compétence] » (exercice, « Quête réussie ? », séance) : pastille-bouton avec
    chevron qui ouvre le chemin de cette compétence ; le retour revient à l'écran d'origine sans perdre la saisie
    (brouillon gardé).
```
