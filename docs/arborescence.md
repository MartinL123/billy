# Arborescence de l'app Billy

Relevée dans le code le 17 octobre 2026 (commit `d764991`, `src/App.tsx` et les liens de chaque écran).
Entre parenthèses : l'adresse de l'écran dans l'app.

## Vue d'ensemble

```
Connexion
└── Écran d'ouverture (/ouverture) — 1re ouverture sur l'appareil seulement
    └── Questionnaire de départ (/questionnaire)

Barre d'onglets : Balades · AUJOURD'HUI (rond central) · Santé
│
├── Balades — carte du territoire (/territoire)
│   ├── Carte avec brouillard : fond de carte, vue, filtres
│   ├── Importer (/importer)
│   │   └── Résultat de l'import (/importer/resultat)
│   ├── Ses balades, par mois (/balades)
│   │   └── Détail d'une balade (/souvenir/:id)
│   │       └── Modifier (/souvenir/:id/modifier)
│   └── Un lieu → À découvrir (/territoire/idees)
│
├── Aujourd'hui — accueil (/)
│   ├── En-tête
│   │   ├── Photo de Billy → Billy (/billy)
│   │   └── Solde d'os → Boutique (/boutique)
│   ├── « À faire maintenant » (une seule carte : repas, mission, sortie, soin, ou « tout est fait »)
│   │   └── Mission pas à pas (/mission)
│   │       └── « Ça s'est bien passé ? » → Noter (/noter)
│   ├── Ensuite : sorties du jour, soins à venir → Événement (/evenement/:id)
│   ├── Noter un souvenir (/noter)
│   └── Questionnaire (lien)
│
└── Santé (/sante)
    ├── Calendrier du mois + « Prochaine chose à faire »
    ├── Vaccins · Vermifuge → Événements filtrés (/sante/evenements)
    ├── Poids (/sante/poids)
    ├── Repas (/sante/repas)
    ├── Documents (/sante/documents)
    │   ├── Ajouter (/document/nouveau)
    │   └── Voir (/document/:id)
    └── Tous les événements (/sante/evenements)
        └── Créer / modifier (/evenement/nouveau, /evenement/:id)

Hors barre — ouverts depuis un écran
│
├── Billy (/billy) — via sa photo sur l'accueil
│   ├── Ce qu'il apprend → Compétence (/competence/:id)
│   │   └── Exercice (/exercice)
│   ├── L'arbre (/billy/arbre)
│   │   ├── Son programme
│   │   └── Sur quoi travailler (/en-cours)
│   ├── Os · la boutique (/boutique)
│   ├── Ses amis de la meute → Meute (/meute)
│   ├── Ce qui l'inquiète → Profil
│   └── Identité, réglages → Profil (/profil)
│
├── Meute (/meute) — via Billy
│   ├── Aujourd'hui dans la meute
│   ├── Les spots (filtres) → sur la carte du territoire
│   ├── Amis → Fiche d'un chien (/meute/chien/:id)
│   └── Marquer un spot
│
└── Profil (/profil) — via Billy
    ├── Son identité · Au quotidien · Comment il réagit · Contacts · Compte
    ├── Modifier (/profil/modifier)
    ├── Installer l'app (/installer)
    └── Revoir les réactions (/questionnaire?etape=reactions)
```

## Anciennes adresses (redirigées)

| Ancienne | Mène à |
|---|---|
| /carnet, /journal | /balades |
| /calendrier | /sante |
| /dressage, /boss/:id | /billy |
| /raconter, /exposition, /souvenir/nouveau | /noter |
| /exploration, /ajouter-balade | /territoire |
| /seance | /exercice |

## Points d'attention UX

- **La Meute est à 3 niveaux** (Aujourd'hui → photo → Billy → Meute) : loin pour la partie communautaire. Piste : un accès depuis la carte des Balades, où les spots s'affichent déjà.
- **Billy repose sur un geste caché** : la photo de l'en-tête est le seul accès aux compétences, à l'arbre, à la meute et au profil. Piste : une étiquette « Voir Billy » ou un chevron.
- **Profil a deux entrées dans le menu Billy** (« Ce qui l'inquiète » et « Identité, réglages ») : vérifier que la première ouvre la bonne section.
- **Écran d'ouverture** : affiché à la 1re ouverture seulement, et non à chaque lancement comme le prévoyait la V3.
