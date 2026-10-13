# Prompt Claude Code — arbre de compétences, profil, « Noter » (13 octobre, nuit)

```
Lis CLAUDE.md, docs/README.md, puis en entier :
- docs/specs/spec-v3-simplification.md (mis à jour ce soir, fait foi) ;
- docs/specs/arbre-competences.md (NOUVEAU : les 10 compétences, leurs 5 étapes, les exercices de chaque étape,
  le rythme des séances et les durées estimées) ;
- docs/specs/questionnaire-depart.md.
Maquettes de référence : docs/maquettes/V3-Billy (l'onglet Billy = l'arbre), V3-EnCours (nouvelle),
V3-Profil (nouvelle), V3-Chemin, V3-RaconterQuete, V3-Raconter, V3-Accueil.

Important : ne modifie aucun fichier de docs/ sans me le demander, sauf pour supprimer
docs/maquettes/V3-Arbre.dc.html (obsolète).

Avant de coder : compare l'app actuelle à la spec et liste en 10 lignes maximum ce qui est déjà conforme,
ce qui manque et ce qui doit changer. Attends ma validation.

Ensuite, dans cet ordre, un commit par lot, et montre-moi chaque écran sur l'iPhone avant de passer au suivant :

1. « Noter » partout (§ 3 et § 3.1) : le mot « Raconter » disparaît de l'app (bouton d'accueil « Noter ce qu'on a
   fait »). Depuis la quête du jour : écran « Quête réussie ? », compétence FIXE (pas de bouton « Changer »), pas de
   date (c'est aujourd'hui), la carte « Ajouter des photos et/ou un commentaire » en premier, puis le ressenti, puis la
   prochaine étape. Le choix de la date ne reste que dans « Noter » ouvert depuis l'accueil.
2. Catalogue (§ 7 + arbre-competences.md) : phrases d'étapes de phrases.ts inchangées ; ajoute les 6 exercices
   marqués 🆕 (Petites absences, Visite de courtoisie, Assis et couché au leurre, Attendre à la porte, Quatre pattes
   au sol, Parcours d'objets) et la correspondance étape → exercices + réglage N1–N5. Durée de séance : 3 min avant
   6 mois (depuis la date de naissance), 5 min après. Ajoute des tests pour la correspondance et la durée.
3. Onglet Billy = l'arbre de compétences (§ 5.4, maquette V3-Billy) :
   - titre « L'arbre de Billy », photo touchable → profil ;
   - carte « Son programme » : semaine en 7 pastilles (coche = jour noté, contour = aujourd'hui, pointillé = à
     venir, lune = repos ; jamais de rouge), rappel du repos, bouton « Choisir ses compétences en cours » ;
   - 3 étages en grandes cartes (Étage 1 · les racines = La Maison, 2 · le tronc = Le Quartier, 3 · les branches =
     Le Grand Monde) reliées par un morceau de tronc ; badges en grille avec anneau 5 segments, prochaine étape en
     phrase, « En cours » + étiquette ▶ exercice du moment sur les compétences en cours, doré si maîtrisé ;
   - en bas de chaque étage, la carte-lien vers la catégorie liée (Mène au Quartier / Mène au Grand Monde /
     Vient du Quartier), qui fait défiler jusqu'à elle ;
   - plus de « Billy a évolué ! », de « Nouvelle feuille », de profil, ni de pastille « Conseillé ».
4. Choisir ses compétences en cours (V3-EnCours) : `dog/billy.activeSkills` (3 max, champ optionnel), 10 lignes
   cochables par étage, « Maîtrisé » sans case, indications « Conseillé » / « Tout doux » calculées depuis le
   questionnaire et le calendrier (sans IA), message si on en coche une 4e, bouton « Enregistrer ».
   La quête du jour pioche ses exercices dans ces 3 compétences (exercice de l'étape en cours, au bon réglage).
5. Le chemin (§ 5.5, V3-Chemin) : boutons « S'entraîner · 5 min » (orange, ouvre l'exercice de l'étape en cours,
   durée selon l'âge) et « Déjà fait aujourd'hui ? Le noter » (contour) ; une étape cochée au questionnaire affiche
   « Il savait déjà le faire » au lieu d'une date.
6. Profil (V3-Profil) : il quitte l'onglet Billy et s'ouvre en touchant la photo (pastille profil). Écran avec
   retour, grande photo + « Changer la photo », identité, quotidien, réactions, contacts, questionnaire, compte.
   Bouton « Appeler » seulement si un numéro existe ; sinon « Pas encore renseigné » + « Ajouter ».
7. Accueil : le bouton à côté de « Ses badges » devient « Son arbre ».
8. Vérifie tous les critères du § 9 et liste ce qui n'est pas rempli.

Non négociable : aucune IA ni détection automatique ; photos sans XP ; aucun chiffre d'étapes ni étoile affichés ;
rien ne baisse jamais ; aucune donnée existante supprimée (champs nouveaux optionnels) ; aucune quête ni défi qui
rapproche Billy de ce qui lui fait peur ; repos le lendemain d'un moment « Difficile » ; tout ce qui est cliquable
ressemble à un bouton ; zones tactiles ≥ 44 px.
```
