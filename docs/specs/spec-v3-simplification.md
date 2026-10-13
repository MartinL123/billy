# Spec V3 — Billy, le jeu (simplification)

**Objectif** : qu'une personne peu à l'aise avec un téléphone comprenne l'app en 30 secondes, ait l'impression de jouer,
et voie **concrètement** ce que son chien a appris, y compris avant l'app.

Ce document **fait foi** et remplace `docs/specs/spec-v2-dressage.md` là où ils divergent. La logique déjà codée
(boss, paliers, XP, validations, Firestore) est **réutilisée** : on change surtout ce que l'on montre et la façon de saisir.
Contexte et constats : `docs/recherche/audit-ux.md`. Maquettes : `docs/maquettes/V3-*.dc.html`.

**L'app n'utilise aucune IA** : aucune analyse de texte, aucune suggestion automatique. Tout choix est fait par l'utilisateur.

---

## 0. Règles qui ne bougent pas

- Rien ne baisse jamais : XP, niveau, étapes acquises.
- Aucune compétence verrouillée ; aucune série quotidienne ; aucune notification culpabilisante.
- L'app ne récompense jamais le fait de rapprocher le chien de ce qui lui fait peur.
- Les données existantes (séances, expositions, journal, validations) restent valides et comptent.

## 1. Trois notions, pas une de plus

| Notion | Ce que voit le joueur | Remplace (V2) |
|---|---|---|
| **Le niveau de Billy** | « Niveau 4 · Apprenti », une barre d'XP, une animation à chaque niveau | Rang + niveau global |
| **Ce qu'il sait faire** | Pour chacune des 10 compétences, des **étapes** en phrases concrètes : « Revient quand on l'appelle à la maison ✓ », « Prochaine étape : revient dans un parc calme » | Boss + paliers + arbre + radar + étoiles |
| **Le Carnet** | Tout ce qu'on vit avec Billy, raconté librement, avec photos | Journal + séances + expositions |

On ne **compte** pas les étapes et on n'affiche **aucune note** (ni étoiles, ni « 3/5 », ni pourcentage).
On montre **ce que le chien sait faire**, en mots. C'est ce qui intéresse vraiment un propriétaire.

Vocabulaire **banni de l'interface** : boss, palier, P1–P5, N1–N5, étoile, exposition, déclencheur, retraite stratégique,
seuil, stats, rang, quête, XP en dehors de la barre de niveau. Correspondances :

| Interne (code, Firestore) | Affiché |
|---|---|
| boss | compétence (« Le Rappel ») |
| palier P1…P5 | étape, toujours désignée par sa phrase (« Revient dans un parc calme ») |
| validation d'un palier | « C'est réussi ! » (le compteur 3 fois / 3 jours reste interne, affiché en petits points) |
| exposition | « Une situation qui lui fait peur » |
| retraite stratégique | « On s'est éloignés » (et c'est bien) |
| réaction 0–4 | 3 visages : Difficile / Bien / Super (0–4 seulement en mode précis) |
| quête | défi de la semaine (1 seul) |
| météo de confiance | voir « Avant / maintenant » (§ 5.4) |

## 2. Le niveau de Billy (la partie)

- XP cumulée, jamais en baisse. Niveau 1 dès 0 XP. Le niveau L+1 demande `25 × L × (L+1)` XP cumulés
  (N2 : 50, N3 : 150, N4 : 300, N5 : 500, N10 : 2 250). Pas de niveau maximum.
- Titre selon le niveau : N1–2 **Chiot curieux** · N3–4 **Apprenti** · N5–7 **Explorateur** · N8–10 **Compagnon** ·
  N11–14 **Complice** · N15+ **Légende**.
- Passage de niveau : plein écran court (photo de Billy, « Niveau 4 ! Billy devient Apprenti »), bouton « Continuer ».
  Ajouté au Carnet.

### XP

| Action | XP |
|---|---|
| Raconter un moment | +10 |
| … ressenti « Super » | +5 |
| … situation qui lui fait peur, quel que soit le ressenti | +5 |
| … « On s'est éloignés » | +8 |
| Répondre « Oui, c'est réussi » à la prochaine étape d'une compétence | +10 |
| Nouvelle étape acquise | +50 |
| Défi de la semaine réussi | +20 |
| Jour de repos déclaré (max 3 par semaine) | +5 |
| Séance en mode précis | règles V2 inchangées |

**Les photos ne rapportent pas d'XP.** Les moments passés rapportent la même XP que les moments du jour.

## 3. Raconter un moment (l'action principale)

Accès : le gros bouton de l'accueil « Raconter ce qu'on a fait », et le premier choix du « + ».

Un seul écran, de haut en bas :

1. **« Qu'avez-vous fait ? »** — champ texte libre, 3 lignes, gros. Optionnel si une photo est ajoutée.
2. **Ajouter des photos** — bouton contour (photothèque). Aucune XP.
3. **Quand ?** — Aujourd'hui (défaut) · Hier · Autre date.
4. **Comment ça s'est passé ?** — 3 grands boutons visage : **Difficile** · **Bien** · **Super**.
5. **« Vous avez travaillé quoi ? »** — grille de **10 tuiles** (icône + nom), 2 colonnes, 64 px de haut.
   On en touche 0, 1 ou plusieurs ; une tuile choisie devient verte avec une coche.
   Ordre : les 3 compétences **utilisées le plus récemment** en premier, puis les autres dans l'ordre Les bases → Le monde.
   **Aucune présélection automatique.** Choisir est facultatif : un moment sans compétence reste un souvenir (+10 XP).
6. **« Il a eu peur ? »** — Oui / Non (deux boutons). Si Oui : case « On s'est éloignés pour qu'il se sente mieux ».
7. Pour chaque compétence choisie : carte « **Prochaine étape : *[phrase de l'étape]*. C'est réussi ?** » Oui / Pas encore,
   avec 3 petits points montrant où on en est (« encore 2 fois, un autre jour »).
8. Bouton plein en bas : **« Enregistrer »** avec le gain affiché (« +23 XP »), mis à jour en direct.

Après enregistrement : « +23 XP », la barre de niveau avance, puis retour à l'accueil. Le moment apparaît dans le Carnet.

## 4. Questionnaire de départ

### 4.1 Quand
- **Automatiquement à la première connexion**, après l'écran d'ouverture.
- Ensuite, **toujours accessible depuis l'écran d'ouverture** (§ 5.1) pour le revoir, le compléter ou corriger une réponse.
- Chaque réponse est enregistrée immédiatement : on peut quitter et reprendre où on s'était arrêté.

### 4.2 Contenu (une question par écran, barre de progression, gros boutons)
1. **Votre chien** : nom, photo (photothèque), date de naissance, date d'adoption, race.
2. **Son caractère** : « Comment décririez-vous Billy ? » — cases à cocher avec phrases simples :
   « Il a peur facilement » (craintif) · « Il est plein d'énergie » (énergique) · « Il réagit aux autres chiens » (réactif) ·
   « C'est un chiot » (déduit de la date de naissance, modifiable) · « Il est âgé » (senior).
3. **Ce qui lui fait peur** (si « Il a peur facilement ») : cases + champ libre — les enfants, les inconnus, les autres chiens,
   la circulation, les rues étroites, les bruits forts, son reflet, rester seul.
4. **Ce qu'il sait déjà faire** : une question par compétence (10 écrans), formulée concrètement, 3 réponses :
   **Pas encore** · **À la maison** · **Même dehors**. Plus « Je ne sais pas ».
   (Interne : À la maison → étapes 1 et 2 acquises ; Même dehors → étapes 1 à 3 acquises ; marquées « avant l'app ».
   Elles rapportent l'XP normale : Billy démarre au bon niveau.)
5. **Vos premiers souvenirs** (facultatif) : « Racontez un moment de vos premières semaines » → ouvre
   « Raconter un moment » avec « Autre date ». Bouton « Plus tard ».
6. **Fin** : « Billy est **niveau 4 · Apprenti**. Voici ce qu'il sait déjà faire : » + la liste en phrases. Bouton « Commencer ».

## 5. Écrans

### 5.1 Écran d'ouverture
À chaque ouverture de l'app :
- Fond vert, **grand logo** (patte) au centre avec le nom « Billy », la photo du chien dans le logo si elle existe.
- **On touche le logo pour entrer** (zone ≥ 200 px, texte « Touchez pour entrer » sous le logo, légère pulsation ;
  respecter `prefers-reduced-motion`).
- En bas : bouton contour clair **« Questionnaire de départ »** avec son état (« À compléter · 6 réponses sur 15 »
  ou « Complété · revoir mes réponses »). Il ouvre le questionnaire (§ 4) ; à la fin, retour à l'écran d'ouverture.
- À la toute première connexion, le questionnaire s'ouvre directement après le toucher du logo.

### 5.2 Navigation : 4 onglets avec des mots simples
**Accueil** · **Carnet** · **Santé** · **Billy**
- *Carnet* = l'ancien Journal (+ séances et situations racontées). *Santé* = Calendrier + poids + documents.
- *Billy* = ce qu'il sait faire (§ 5.4) + profil. L'onglet Dressage disparaît.

### 5.3 Accueil (de haut en bas)
1. **Carte personnage** : photo de Billy dans un anneau de progression, « Niveau 4 », titre « Apprenti »,
   « encore 200 XP avant le niveau 5 ». Toute la carte ouvre l'onglet Billy.
2. **Gros bouton orange** : **« Raconter ce qu'on a fait »**.
3. **Bouton contour** : **« Faire un exercice »** (exercice conseillé, ouvre la séance).
4. **Défi de la semaine** : un seul, concret (« Faire 3 fois le jeu du prénom dans le jardin »), 3 petits points, +20 XP.
5. **Dernière réussite** : « Il y a 3 jours : revient quand on l'appelle à la maison » (lien vers l'onglet Billy).
6. **Aujourd'hui** : repas, soins à venir. Puis occupation du jour.

### 5.4 Onglet Billy : ce qu'il sait faire (l'écran « fierté »)

Ce qui intéresse vraiment un propriétaire, dans cet ordre :

1. **En-tête** : photo, nom, niveau et titre, barre de niveau.
2. **« Ses progrès en un mois »** — le résumé le plus parlant : 2 à 3 comparaisons **avant / maintenant** en phrases,
   calculées à partir des moments racontés pour une même compétence (premiers moments vs 3 derniers) :
   - « **Dehors en ville** — fin septembre : souvent difficile → maintenant : plutôt bien »
   - « **Le rappel** — fin septembre : pas encore → maintenant : revient à la maison »
   Règle : ressenti dominant des 3 premiers moments vs des 3 derniers (Difficile / Bien / Super), ou étape la plus haute
   à la date de début vs aujourd'hui. On n'affiche une comparaison que si elle montre un progrès ou une stabilité ;
   jamais de « moins bien » mis en avant. S'il n'y a pas encore assez de moments : « Racontez quelques moments, vos progrès
   apparaîtront ici. »
3. **« On travaille en ce moment »** — 3 cartes maximum (compétences conseillées ou récemment travaillées) :
   nom de la compétence + **la prochaine étape en phrase** + 3 petits points (« encore 1 fois, un autre jour ») +
   bouton « Raconter ».
4. **« Ce qu'il sait déjà faire »** — la liste des étapes acquises, **en phrases, avec leur date** (ou « avant l'app »),
   plus récente en haut : « 10 oct. · Me regarde quand je l'appelle, même occupé », « avant l'app · Revient d'une autre pièce ».
   C'est le vrai « chemin parcouru » : on lit ce que le chien a appris.
5. **« Toutes ses compétences »** — 10 lignes cliquables (icône, nom, **étape actuelle en phrase**, chevron), regroupées
   Les bases · Le quotidien · Le monde. Une ligne sans étape acquise affiche « Pas encore commencé ».
6. Puis le profil (identité, alimentation, contacts, caractère, compte) et « Questionnaire de départ ».

### 5.5 Fiche d'une compétence
- Titre + phrase de l'objectif final (« Revient quand on l'appelle, partout »).
- Les 5 étapes en **chemin vertical** : étapes acquises cochées avec leur date, étape en cours mise en avant avec ses
  3 petits points, étapes suivantes en gris clair. Pas de numéro.
- Gros bouton « Raconter un moment » (compétence présélectionnée) et bouton contour « Faire un exercice ».
- « Billy sait déjà faire ça » (bouton contour) sur l'étape en cours : la marque acquise « avant l'app ».

### 5.6 Le « + »
- **Raconter ce qu'on a fait** (gros, orange) · **Faire un exercice** (contour)
- *Autre* : Photos · Rendez-vous ou soin · Document
- Le mode précis (séance 5 essais, réaction 0–4) reste accessible depuis « Faire un exercice » (interrupteur « Mode précis »).

### 5.7 Moments de récompense
- **+XP** : chiffre qui monte au-dessus du bouton, barre qui avance.
- **Nouvelle étape** : plein écran, « C'est réussi ! », la phrase de l'étape en grand (« Billy revient quand on l'appelle
  à la maison »), « Prochaine étape : … », « Ajouté au Carnet ». Pas d'étoile, pas de compteur.
- **Nouveau niveau** : voir § 2. Respecter `prefers-reduced-motion`.

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

## 7. Données (évolution, rien à migrer de force)

- `entries` (Journal) gagne des champs optionnels : `skills: bossId[]`, `feeling: 'difficile'|'bien'|'super'`,
  `fear: boolean`, `movedAway: boolean`, `validations: bossId[]`, `xp: number`. Un moment = une entrée : le Carnet est la seule liste.
- Séances et expositions existantes s'affichent dans le Carnet comme des moments (lecture seule, résumé généré).
- `bossProgress/{bossId}` gagne `preApp: number[]` (étapes acquises avant l'app) et garde `validations`.
- `dog/billy` gagne `questionnaire: { answers: Record<string, …>, completedAt?: Timestamp }` et `fears: string[]`.
- Chaque étape du catalogue a une phrase « acquise » à la 3ᵉ personne (« Revient quand on l'appelle à la maison »)
  en plus de son critère : à ajouter dans le catalogue (`src/content/training.ts`).
- Niveau, titre, comparaisons avant / maintenant : **calculés**, jamais stockés.

## 8. À enlever ou cacher

Onglet Dressage, arbre à liens, radar, rang séparé, 3 quêtes (→ 1 défi), liste des premières fois, toute étoile ou note
chiffrée, textes des règles des traits. Rien n'est supprimé des données.

## 9. Critères d'acceptation

- [ ] À l'ouverture, le logo s'affiche ; toucher le logo ouvre l'app ; le bouton « Questionnaire de départ » ouvre le questionnaire.
- [ ] Première connexion : le questionnaire s'enchaîne, peut être quitté et repris ; à la fin, Billy a un niveau et une liste « Ce qu'il sait déjà faire ».
- [ ] Une personne qui n'a jamais vu l'app raconte un moment en moins de 30 secondes sans aide.
- [ ] Raconter un moment passé fonctionne et rapporte de l'XP ; ajouter une photo ne change pas l'XP.
- [ ] Aucune compétence n'est présélectionnée automatiquement.
- [ ] L'onglet Billy se comprend sans légende : aucune étoile, aucun nombre d'étapes, que des phrases.
- [ ] Aucun lien texte seul pour une action ; tous les éléments cliquables font ≥ 48 px.
- [ ] Rien ne baisse après un moment « Difficile ».

## 10. Maquettes de référence

`docs/maquettes/V3-Ouverture`, `V3-Accueil`, `V3-Raconter`, `V3-Reussite`, `V3-Questionnaire`, `V3-Billy` (`.dc.html`).
Les chiffres et dates sont des exemples. Écrans non maquettés : mêmes règles (§ 6).

## 11. Ordre de réalisation

1. Règles d'interface (§ 6) appliquées à toute l'app.
2. Écran d'ouverture (§ 5.1) + questionnaire de départ (§ 4).
3. Raconter un moment (§ 3) + XP + Carnet unifié.
4. Niveau et titre (§ 2) + accueil (§ 5.3) + récompenses (§ 5.7).
5. Onglet Billy (§ 5.4) + fiche d'une compétence (§ 5.5) + navigation à 4 onglets (§ 5.2).
6. Nettoyage (§ 8) et vérification des critères (§ 9).
