# Prompt Claude Code — corrections de l'audit n°1 (18 octobre)

Lis `CLAUDE.md`, puis l'audit `docs/audits/audit-01-2026-10-18.md` en entier (tableau des remarques R-001 à R-025).
Toutes les remarques sont validées par Martin. Le numéro R-xxx de chaque point renvoie au tableau de l'audit.

**Ne supprime aucune donnée** : on corrige l'affichage et les écritures à venir, on ne réécrit pas l'historique.
Un commit clair par point, avec le numéro de la remarque dans le message (ex. « R-001 Santé : … »).

## Phase 1 — corrections sans changement visuel (enchaîne, sans attendre)

1. **R-001 Soins en retard** : toucher « C’est fait » sur un soin récurrent en retard le marque fait **aujourd'hui** ;
   la prochaine échéance se calcule à partir d'aujourd'hui. Ne crée jamais de « Fait » sur les échéances passées.
   Le « dernier fait » affiché se base sur la date réelle de validation (`doneAt`), pas sur la date prévue.
   Logique dans `src/lib/` avec tests (cas : dernier fait le 10/07, mensuel, validé le 18/10 → prochain le 18/11).
2. **R-002 Statut en retard partout** : un soin en retard dit « En retard de X jours » sur la carte de l'accueil
   (plus de « C’est le jour » quand ce n'est pas le jour), sur les lignes de Santé (Vermifuge, Antiparasitaire…) et
   dans le bloc « Ensuite ».
3. **R-004 Nom du chien** : remplace « Billy » écrit en dur par le nom du chien du compte
   (ImportResult, walkLayer, aria-label de la carte dans ExplorerMap et Explorer).
4. **R-006 Accord au féminin** : un helper dans `src/lib/` (avec tests) accorde selon `dog.sex` :
   né/née, il/elle, stérilisé/stérilisée, « Ce qu’il/elle apprend », « il/elle a peur de… ».
   Passe sur tous les textes affichés, questionnaire compris (« Est-il/elle stérilisé(e) ? » après la réponse au sexe ;
   avant, garder une formulation neutre).
5. **R-007 Élision** : helper « de + nom » (avec tests) : « d’Oslo », « d’Hector », mais « de Billy ».
   À utiliser partout où le nom suit « de » (territoire, arbre, anniversaire, etc.).
6. **R-012 « Tout est fait »** : ne s'affiche que si la mission **et** les sorties du jour sont faites.
   Sinon, la carte propose la prochaine sortie.
7. **R-011 Jour de repos** : jamais de repos comme toute première mission d'un compte (3 premiers jours sans repos imposé).
   Une carte repos n'affiche ni « · 3 min » ni « Commencer » : elle dit le repos et propose « Une autre idée ».
8. **R-017, R-018, R-022 Wording** : pluriels corrects (« voir la balade », pas de « 0 balade déjà importée » quand il n'y
   en a aucune) ; remplace « cases » par des km ou un % découvert ; apostrophes typographiques (’) partout dans les
   textes affichés.
9. **R-021 Le chien n'est pas l'app** : « Oslo vous le rappellera » → « Rappel le jour même » (et rien si le rappel
   n'est pas disponible sur l'appareil) ; « Oslo s’adapte » → « La prochaine mission s’adapte ».
10. **R-014 Carnet** : « Stickers du Carnet » → « Stickers des souvenirs » (ou retire la catégorie si les stickers ne
    s'affichent plus nulle part : dis-moi lequel).
11. **R-019 Questionnaire** : « Retour » toujours au même endroit, sur toutes les questions.
12. **R-020 Contraste** : fonce le orange principal juste assez pour dépasser 4,5:1 sur blanc (texte blanc et texte
    orange sur blanc) ; mets à jour `docs/style-guide.html` et les tokens. Jours hors mois du calendrier ≥ 3:1.
13. **R-025 Créneaux de sortie** : le nom du créneau (matin, midi, soir) suit l'heure réglée.
14. **R-015 Chargement de la carte** : un indicateur discret tant que le style de carte n'est pas prêt.
15. **R-016 Brouillard** : vérifie que l'aplat hors image couvre bien tout le reste du monde (fenêtre large, dézoom
    maximal) et qu'aucune couture ne se voit au bord de l'image ; corrige si besoin.

## Phase 2 — changements visibles : maquettes d'abord

Fais d'abord les maquettes (`docs/maquettes/V4-*.dc.html`, à 390 px) pour ces points, montre-les-moi,
et **attends ma validation** avant de coder.

16. **R-003 Bloc « Ensuite »** : la colonne de gauche (heure ou « Aujourd’hui ») ne chevauche plus le titre.
17. **R-008 Ajouter un soin** : un bouton « Ajouter un soin ou un RDV » toujours visible sur Santé.
18. **R-009 Accès à l'écran Billy** : une entrée visible et nommée depuis l'accueil (pas seulement la photo ronde),
    sans ajouter d'onglet.
19. **R-010 Ses balades vide** : un vrai état vide avec « Importer mes balades » ; pas de bouton « Voir cette balade »
    quand la liste est vide.
20. **R-013 Progression sans chiffres** : remplace « 2 sur 5 » / « 0 sur 5 » par une progression qui se voit
    (5 pas, anneau) sans se compter, comme le dit le style guide ; à 0, une phrase d'encouragement (« On commence »).
21. **R-023 Liens texte** : « + Noter un souvenir » et « Voir tous les événements » deviennent des boutons discrets
    (règle « tout ce qui se touche est un bouton ») ; « Noter un souvenir » une seule fois sur l'accueil.
22. **R-024 Arrivée d'un compte neuf** : un seul encadré à la fois (installation d'abord, mot de passe plus tard) ;
    sous-titre de connexion qui parle aussi des balades et du jeu.
23. **R-005 Nom de l'app** : centralise le nom de l'app dans une seule constante (connexion, installation, accueil,
    meute, manifest). Propose-moi 3 noms avec une maquette de l'écran de connexion. **Ne renomme rien** tant que je
    n'ai pas choisi.

À la fin, vérifie chaque écran touché à 390 px, et dis-moi en 5 lignes ce qui est fait, ce qui attend ma validation,
et ce que je dois tester en premier sur mon iPhone.
