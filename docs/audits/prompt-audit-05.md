# Prompt Claude Code — corrections de l'audit n°5 (19 octobre, 18 h)

Lis `CLAUDE.md` et `docs/audits/audit-05-2026-10-19.md`. Tickets dans le Kanban Notion (Projet = Billy).
Un commit par point, numéro R-xxx dans le message. **Ne supprime aucune donnée.**

1. **R-045 Ne pas effacer la balade avant qu'elle soit vraiment écrite** (majeur, iOS) : dans `LiveWalk.finish()`,
   `clearWalk()` est appelé dès que `saveImportedWalk()` a lancé l'écriture (`send(batch.commit())` n'est pas attendu).
   Si Firestore est déjà en panne à ce moment (R-042), l'écriture part dans le vide et la balade est effacée. Avant
   `clearWalk()`, vérifie que la balade est dans le cache local : `getDocFromCache(entries/{entryId})` avec un délai de
   5 s. Si ça échoue : garder la balade, `recoverFromFirestoreCrash()`, et l'écran « Réessayer ». Au nouvel essai, la
   clé d'import évite le doublon. Même règle pour les marches de la Watch. Test avec un Firestore simulé en panne.
2. **R-046 Présélection de la durée** : pour une sortie passée (sans durée conseillée), « Combien de temps ? »
   présélectionne la durée d'une sortie selon l'âge (`perWalk` : 15 min à 3 mois, 25 à 5 mois), pas 25 min fixes.
3. **R-047 Nom de la balade = nom de la sortie** : une balade de l'iPhone ou de la Watch rattachée à un créneau prend le
   nom de ce créneau (« Balade de l'après-midi » si elle coche la sortie de 14 h 30), pas celui de l'heure.
4. **R-048 Durée de la mission** : la carte du moment affiche « À faire maintenant · 3 min » puis « 3 min · 2 minutes »
   (Petites absences). Une seule durée, celle de l'exercice ; retire la répétition dans la ligne du dessous.
5. **R-049 « Grosse balade »** : le message du résultat d'import n'apparaît que si la prochaine sortie est vraiment
   raccourcie (prochaine < durée normale) ; sinon rien.

À la fin, dis-moi en 5 lignes ce qui est fait et ce que je dois tester sur mon iPhone.
