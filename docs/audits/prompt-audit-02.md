# Prompt Claude Code — corrections de l'audit n°2 (18 octobre, 11 h)

Lis `CLAUDE.md`, puis `docs/audits/audit-02-2026-10-18.md` et `docs/audits/recette.md`.
Un commit clair par point, avec le numéro R-xxx dans le message. **Ne supprime aucune donnée.**

1. **R-027 Régression du féminin** : dans le questionnaire, « Elle sera noté comme pesée du jour » parle du poids,
   pas du chien. Remets « Il sera noté comme pesée du jour » (ou « Ce poids sera noté… ») quel que soit le sexe.
   Vérifie qu'aucune autre phrase où « il » désigne une chose (poids, rappel, repas…) n'a été passée au féminin.
2. **R-026 Féminin dans le questionnaire** : accorde aussi, pour une chienne :
   « Qui s’occupe d’elle au quotidien ? », les titres de partie « Comment elle réagit » et « Ce qu’elle sait déjà faire »,
   les pastilles « elle croise… », « quand quelqu’un passe près d’elle », les réponses « Joueuse » et « Très excitée ».
   Ajoute un test qui parcourt toutes les questions avec un chien mâle puis femelle.
3. **R-028 Élision** : « Une photo de Oslo ? » → « Une photo d’Oslo ? » (même helper que R-007).
4. **R-031** : « La prochaine fois, Oslo reprend un cran plus facile » → « La prochaine fois, la mission sera un cran
   plus facile ».
5. **R-030 Carte sortie** : l'étiquette et le titre répètent « Sortie de 14 h 30 ». Garde l'étiquette « Sortie de
   14 h 30 » et un titre qui dit quoi faire (ex. « Une vraie sortie, même 15 minutes »), ou l'inverse.
6. **R-029 Vaccin dû** : sur la carte de l'accueil, ajoute « C’est fait » en action secondaire (le vaccin vient d'être
   fait). « J’ai pris rendez-vous » demande la date du RDV au lieu de le créer daté d'aujourd'hui.
7. **R-016 Brouillard en mode Satellite** : en prod, mode Satellite, la carte n'est pas couverte de brouillard hors du
   rectangle de l'image (mode Plan : couverte, mais une fine ligne de couture reste visible). Piste : la couche
   satellite passe peut-être au-dessus de l'aplat « brouillard » quand on bascule en Satellite (ordre des couches).
   Vérifie dans les deux modes, en fenêtre large, dézoom maximal, et après bascule Plan ↔ Satellite.
8. **R-032 Temps de chargement de la carte** : environ 20 s en prod avant l'affichage complet (tuiles satellite par
   morceaux). Mesure, puis propose 1 ou 2 pistes (ex. démarrer en Plan et charger le satellite ensuite, réduire le
   niveau de zoom initial) et dis-moi laquelle tu recommandes avant de changer le comportement.

La phase 2 de l'audit n°1 (maquettes `V4-*-audit01`) attend ma validation : ne la code pas tant que je ne te l'ai
pas dit.

À la fin, dis-moi en 5 lignes ce qui est fait et ce que je dois tester en premier sur mon iPhone.
