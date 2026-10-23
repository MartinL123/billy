# Tests de bout en bout : la balade (T-063)

Playwright, navigateur WebKit, écran d'iPhone 390 × 844, fuseau Europe/Paris. La page croit tourner dans l'app iOS :
un **faux pont iOS** (`fakeIphone.ts`) remplace le plugin `FlairNative` (et `LocalNotifications`). L'état de la balade
(départ, points, arrêt, copie gardée jusqu'à l'envoi) vit côté Node, comme le fichier natif `balade-en-cours/` :
il survit au rechargement et à la fermeture de la page. Les données vont dans les **émulateurs Firebase**, jamais
dans le vrai projet ; chaque test crée son propre compte (`e2e-…@billy.test`).
Son profil (et les marques des rattrapages faits une seule fois) est posé au serveur avant la connexion
(`seedProfile`, R-093) : les tests partent d'un compte prêt. Le vrai premier lancement d'un compte neuf, coupure du
réseau comprise, est le test T-074.

## Lancer

```bash
npm run emulators       # dans un autre terminal (Java 21+), à laisser tourner
npm run test:e2e        # construit le site pour les émulateurs (.e2e-dist/), le sert sur le port 4179, lance les tests
npx playwright show-report   # le détail, avec la trace des tests en échec
```

Première fois : `npx playwright install webkit`. Un serveur déjà ouvert sur le port 4179 est réutilisé tel quel :
l'arrêter après un changement du code de l'app pour que les tests voient la nouvelle version.

## Ce qui est couvert (protocole de casse, `docs/profondeur/03-protocole-casse.md`)

| Cas | Ce que fait le test | Vérifié |
| --- | --- | --- |
| 3 · App tuée | Départ, 20 points, page fermée (le GPS s'arrête, le fichier reste), réouverture de l'accueil | « Balade en cours · … », « L'enregistrement s'est arrêté… », Reprendre / Terminer ; la reprise garde les 20 points, en ajoute 10 ; une seule balade au serveur |
| 4 · Hors ligne toute la balade | Réseau coupé avant le départ, Terminer, puis réseau rétabli | « Belle balade ! » hors ligne, copie gardée (`markSaved`), « En attente d'envoi » sur le souvenir, rien au serveur ; au retour du réseau : au serveur, copie effacée (`clearSent`) |
| 5 · Réseau qui revient pendant l'enregistrement | Terminer hors ligne, réseau rétabli tout de suite | Une seule balade au serveur, copie effacée |
| 9 · Rechargement du site | Pendant la balade ; après « Belle balade ! » ; juste après une fin hors ligne | Pendant : l'écran revient avec le tracé, pas de nouveau départ. Après : plus de `?depart=1`, retour à l'accueil, aucun second `startWalk` |
| 11 · Position refusée | `startWalk` rejeté avec le code `denied` | « La position n'est pas autorisée », le chemin Réglages › Flair › Position, retour à l'accueil |
| T-087 · Partage en direct | Pendant la balade : « Partager en direct », un proche ajouté, « Partager » (feuille de partage simulée) ; le lien ouvert dans un autre navigateur, sans compte | `live/{jeton}` au serveur (seulement les champs prévus), « … est en balade depuis … · 100 m », « Mis à jour … » ; Terminer → `terminée`, position effacée, « Balade terminée à … » ; lien coupé → message calme |
| 13 · Deux balades le même jour | A (partie il y a 60 min), puis B (il y a 15 min) | Deux balades au serveur, clés d'import différentes, pas d'os en double |
| T-074 · Compte neuf hors ligne | Connexion d'un compte neuf (vrai premier lancement), réseau coupé 1,5 s puis rétabli | L'app reste stable (pas de remontage en boucle) ; le profil et les marques des trois rattrapages arrivent au serveur (R-093 : le profil n'est plus récrit en boucle) |
| R-099 · Panneau de la carte (`panneau.spec.ts`) | Touchers synthétiques sur le panneau des Balades : milieu → haut puis la liste, haut avec liste défilée, haut en haut de liste, réduit, un toucher ; glissé à la souris | Qui prend chaque mouvement (panneau déplacé, défilement empêché ou non), cran au lâcher. Le défilement natif d'iOS et son élan : sur l'iPhone |
| R-102 · Le même panneau partout (`panneau.spec.ts`) | Fiche d'une balade puis sa relecture : glissé du milieu vers le bas, du bas jusqu'en haut, poignée | Fiche ouverte au milieu, relecture au cran réduit (vitesses entières) ; le cran réduit au moins 120 px sous le milieu ; haut ; poignée haut → milieu → haut |

## Ce qui reste manuel (sur l'iPhone de Martin)

- Cas 2 (autre app GPS en même temps), 6 (économie d'énergie, extinction), 10 (réglages de position, position exacte
  coupée), 12 (GPS faible en vrai), 15 (relance depuis Xcode), 16 (stockage presque plein).
- Le vrai GPS de tous les cas : ici les points sont inventés (20 m plus au nord toutes les 15 s).
- Le code Swift lui-même (`FlairNativePlugin.swift`) : le faux pont reproduit son comportement, il ne le teste pas.
