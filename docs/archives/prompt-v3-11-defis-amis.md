# Prompt Claude Code — le défi de la meute (version simple, après prompt-v3-14-communaute)

```
Lis docs/specs/spec-v3-simplification.md § 2 bis.2 (réécrit) et la maquette V3-Meute (carte « Défi de la meute »).
Ne modifie aucun fichier de docs/ sans me le demander. Avant de coder, propose-moi le modèle de données et attends
ma validation.

On compare l'effort, jamais le chien.
1. Un seul défi par semaine pour toute la meute (tous les comptes), créé automatiquement le lundi :
   « Chacun fait sa mission 5 jours cette semaine ». Pas d'invitation, pas de création de défi par les utilisateurs.
2. Carte dans l'onglet Meute : pour chaque chien, ses 7 pastilles de la semaine (mission faite ou non) et « 3/5 ».
   Jamais le niveau, les étapes, les photos ni le Carnet.
3. Récompense : +40 os pour chaque chien qui a tenu (une fois par semaine) ; sticker « Meute » dans la boutique au
   premier défi tenu. Le lundi suivant, nouveau défi, sans message de reproche.
4. Données : community/challenges/{semaine ISO} ; chacun n'écrit que sa propre ligne. Test des règles à deux comptes.
```
