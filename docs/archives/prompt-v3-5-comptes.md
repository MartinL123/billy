# Prompt Claude Code — comptes pour les testeurs (13 octobre, 23 h)

```
Je veux que d'autres personnes puissent tester l'app avec leur propre chien et créer leur compte seules.
Ne modifie aucun fichier de docs/ sans me le demander. Avant de coder, liste ce qui change et attends ma validation.

1. Écran de connexion : ajoute « Créer un compte » (bouton contour sous « Se connecter ») : e-mail, mot de passe
   (8 caractères minimum, œil pour l'afficher), bouton « Créer mon compte ». Messages d'erreur en français
   (e-mail déjà utilisé, mot de passe trop court). Garde « Mot de passe oublié ».
2. Nouveau compte = espace vide : n'applique PAS le seed de Billy (naissance, adoption, vaccins, repas). Le seed
   actuel ne doit plus jamais s'appliquer automatiquement ; mon compte garde ses données telles quelles.
3. Le nom, la photo, la date de naissance et les dates de santé viennent du questionnaire de départ, qui s'ouvre
   au premier lancement. Remplace « Billy » écrit en dur dans l'interface par le nom du chien (écran d'ouverture,
   accueil, titres, phrases). Le titre de l'app sur l'écran d'accueil de l'iPhone reste « Billy ».
4. Profil → compte : bouton « Supprimer mon compte et mes données » (panneau de confirmation dans l'app, pas de
   confirm() système ; il faut retaper son mot de passe). Supprime tout users/{uid}/… puis le compte.
5. Vérifie firestore.rules : chaque compte ne lit et n'écrit que users/{son uid}/… ; ajoute un test avec deux
   comptes dans les émulateurs.
6. Ajoute une petite mention sous « Créer un compte » : « Vos données restent privées. Martin, qui gère l'app, peut
   techniquement y accéder. »

Montre-moi la création de compte et le premier lancement sur l'iPhone avant de committer.
```
