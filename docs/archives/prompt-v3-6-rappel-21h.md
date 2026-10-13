# Prompt Claude Code — notification du soir à 21 h (13 octobre, 23 h)

```
Je veux une notification sur mon iPhone chaque soir à 21 h pour remplir le carnet, sans payer (Firebase Spark,
pas de Cloud Functions). Ne modifie aucun fichier de docs/ sans me le demander. Avant de coder, explique-moi en
10 lignes la solution et attends ma validation.

Solution attendue : Web Push (PWA installée sur l'écran d'accueil, iOS 16.4+) envoyé par une GitHub Action planifiée.
1. Profil → « Rappel du soir » : interrupteur (désactivé par défaut) + heure (21:00 par défaut). En l'activant,
   l'app demande la permission de notifications (depuis un toucher, obligatoire sur iPhone), crée l'abonnement
   push (clé VAPID publique dans les variables VITE_) et l'enregistre dans users/{uid}/push/{deviceId}
   avec l'heure choisie et le fuseau Europe/Paris. Si l'app n'est pas installée sur l'écran d'accueil, afficher
   comment l'installer au lieu de l'interrupteur.
2. Service worker (vite-plugin-pwa, injectManifest si besoin) : écoute « push », affiche la notification, et au
   toucher ouvre l'app sur « Noter ce qu'on a fait ».
3. GitHub Action `.github/workflows/rappel-soir.yml` toutes les 15 minutes (cron) : un script Node (firebase-admin +
   web-push) lit les abonnements dont l'heure locale correspond (Europe/Paris, heure d'été/hiver gérée), et
   n'envoie RIEN si un moment a déjà été noté aujourd'hui. Secrets du repo : compte de service Firebase
   (FIREBASE_SERVICE_ACCOUNT) et clé VAPID privée. Supprimer un abonnement expiré (410). Une seule notification
   par jour et par appareil (date du dernier envoi enregistrée).
4. Texte : « Comment s'est passée la journée avec Billy ? Notez-le en 30 secondes. » ; jour de repos : « Journée
   repos pour Billy : un mot sur sa balade ? ». Jamais de culpabilisation, pas de relance.
5. Règles Firestore : users/{uid}/push accessible au seul propriétaire (l'Action passe par le compte de service).
6. Explique-moi pas à pas ce que je dois faire moi-même : générer les clés VAPID, créer le compte de service dans
   la console Firebase, ajouter les secrets GitHub, activer l'interrupteur sur l'iPhone.

Préviens-moi : les tâches planifiées GitHub peuvent avoir quelques minutes de retard.
```
