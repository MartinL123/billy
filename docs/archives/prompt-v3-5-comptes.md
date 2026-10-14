# Prompt Claude Code — comptes pour les amis testeurs (mis à jour le 14 octobre, 14 h 30)

Décision : pas d'inscription dans l'app. Martin crée les comptes (10 maximum) dans la console Firebase.

```
Je fais tester l'app à quelques amis (10 comptes maximum). C'est moi qui crée leurs comptes dans la console
Firebase (e-mail + mot de passe) ; il n'y a PAS d'écran « Créer un compte ». Lis docs/specs/communaute.md § 2
et les maquettes V3-Connexion, V3-Installer et V3-Compte. Ne modifie aucun fichier de docs/ sans me le demander.
Avant de coder, liste ce qui change et attends ma validation.

1. Connexion : e-mail, mot de passe (œil pour l'afficher), « Mot de passe oublié », et un lien « Comment installer
   l'app sur mon téléphone ? ». Messages d'erreur en français. Aucun bouton d'inscription.
2. Nouveau compte = espace vide : n'applique PAS le seed de Billy. Le seed ne doit plus jamais s'appliquer
   automatiquement ; mon compte garde ses données telles quelles.
3. Premier lancement : questionnaire de départ (nom, photo, naissance, santé), puis proposition de changer son mot
   de passe (Profil → Compte → « Changer mon mot de passe », ancien + nouveau, 8 caractères minimum).
   Remplace « Billy » écrit en dur par le nom du chien. Le titre de l'app sur l'écran d'accueil reste « Billy ».
4. Écran « Mettre Billy sur votre téléphone » (maquette V3-Installer) : étapes iPhone (Safari → Partager → Sur
   l'écran d'accueil → Ajouter) et Android (Chrome → ⋮ → Ajouter à l'écran d'accueil / Installer l'application).
   Accessible depuis la connexion et Profil → Compte. Dans le navigateur (pas en mode standalone), petit bandeau
   fermable en bas de l'accueil « Ajoutez Billy à votre écran d'accueil · Comment ? », revient au plus tous les 7 jours.
5. Espace par compte : 80 Mo (Firestore gratuit = 1 Go pour 10 comptes). Tiens users/{uid}/usage.bytes à jour
   à chaque ajout ou suppression de photo/document. Profil → Compte : « Espace utilisé : 34 Mo sur 80 Mo » + barre.
   À 90 % : message doux. À 100 % : plus d'ajout de photo ni de document (le texte reste possible), message clair.
   Documents PDF limités à 5 Mo. Passe la compression des photos à 1280 px max, JPEG 0,75 (au lieu de 1600 px) :
   les nouvelles photos seulement, on ne recompresse pas les anciennes.
6. Profil → Compte : « Supprimer mon compte et mes données » (panneau de confirmation dans l'app, pas de confirm()
   système ; retaper son mot de passe). Supprime tout users/{uid}/… puis le compte.
7. firestore.rules : chaque compte ne lit et n'écrit que users/{son uid}/… ; test avec deux comptes dans les
   émulateurs.
8. Explique-moi en 5 lignes comment créer un compte dans la console Firebase pour un ami.

Montre-moi la connexion, le premier lancement et l'écran d'installation sur l'iPhone avant de committer.
```
