# Prompt Claude Code — Flair plus profond (21 octobre)

Lis `CLAUDE.md` et les documents de `docs/profondeur/` (surtout `03-protocole-casse.md`). Tickets dans le Kanban
Notion (Projet = Billy). Un commit par ticket, numéro T-xxx dans le message. **N'ajoute aucune fonctionnalité**
hors de cette liste. **Ne supprime aucune donnée.** Pas de nouvelle dépendance (Playwright attend une décision, T-063).

Seulement ce que les preuves justifient : risques de perte de balade confirmés ou probables dans le code, fonction
d'entraînement devenue inaccessible, lectures Firestore inutiles, et la mesure qui permettra de prouver le reste.

## Balade (métier 1), dans cet ordre

1. **T-058 Balade fantôme** : dès que `startWalk` réussit, remplacer l'adresse par `/balade-en-cours` (sans
   `?depart=1`) ; à « Belle balade ! » et à « La balade n'a pas été gardée », plus aucun paramètre ne peut relancer
   une balade. Vérifie : rechargement pendant la balade (reprend), pendant l'enregistrement, après la fin (ne
   démarre rien).
2. **T-059 « Réessayer » sans effacement aveugle** : extrais de `finish()` (`LiveWalk.tsx`) une fonction pure dans
   `src/lib/` qui décide : trop courte / déjà enregistrée / à vérifier. Si l'import ne renvoie rien alors que la
   balade a des points, retrouve l'entrée par sa clé d'import dans le cache local et vérifie-la avant `clearWalk` ;
   sinon, « Réessayer » et le fichier natif est gardé. Tests Vitest de chaque branche.
3. **T-060 Jamais d'effacement « trop courte » sans confirmation** : en natif, détecte la position approximative
   au départ (`accuracyAuthorization`) et demande la précision temporaire (clé `NSLocationTemporaryUsageDescriptionDictionary`) ;
   côté écran, une balade de plus de 2 min avec trop peu de points propose « Noter la sortie » (durée gardée, via
   `noteWalk`) ou « Ne pas la garder », jamais d'effacement silencieux.
4. **T-061 Copie gardée jusqu'au serveur** : après l'enregistrement, le fichier natif passe en « à envoyer » et
   n'est effacé qu'après `waitForPendingWrites()` (ou une lecture serveur de l'entrée) ; au lancement, une copie
   « à envoyer » déjà présente dans le cache est effacée, sinon réimportée. Appelle `navigator.storage.persist()`.
5. **T-062 Robustesse native** : minuteur natif à départ + 3 h (et points au-delà ignorés) ; écriture de l'état
   vérifiée au départ (rejet avec un code `storage`), plus de `try?` muet sur les points ; erreurs de départ
   nommées (`denied` seulement si c'est le cas) ; `currentWalk()` rattrapé. Tests Vitest de l'arrêt à 3 h côté JS.

Après 3, 4 et 5 : `npm run build:ios` et `xcodebuild` (cible simulateur) doivent passer ; dis-moi de réinstaller
depuis Xcode.

## Entraînement (métier 3)

6. **T-067** : sur l'écran Billy, sous « Ce qu'il apprend », un lien « Changer ce qu'il apprend » vers `/en-cours`
   (zone de 44 px, visible aussi à 320 px). Ne touche pas à l'arbre.

## Socle et mesure

7. **T-071** : retire les écouteurs `quests`, `places`, `sessions` du store s'ils ne sont lus nulle part (vérifie
   d'abord), et les fichiers morts listés dans le ticket. Aucune collection supprimée en base.
8. **T-066 Journal privé** : selon `docs/profondeur/05-mesure.md`. `users/{uid}/journal/{AAAA-MM-JJ}`, `arrayUnion`,
   jamais en visiteur ; événements posés aux endroits existants (balade, soin coché, séance, ouverture au plus une
   fois par heure, rechargement R-042). Calcul des 3 indicateurs dans `src/lib/` avec tests ; écran caché
   `#/journal` sans lien depuis l'app. Les règles Firestore actuelles couvrent déjà `users/{uid}/…` : ne les modifie
   pas.

## À la fin

`npm test`, vérification TypeScript, build web et iOS. Pousse, passe les tickets en « Révision du code » avec une
ligne d'Historique. Puis dis-moi en 5 lignes ce qui est fait et quels cas du protocole de casse dérouler en premier
sur l'iPhone (au minimum 3, 4, 9 et 10). **Ne coche rien qui doit être vérifié sur l'iPhone, par la vétérinaire,
l'éducateur ou de vrais testeurs.**
