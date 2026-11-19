# Les Jeux du Beaujolais — modifications à faire

## Contexte
- **Le projet :** 11 mini-jeux joués sur téléphone via QR code pour une soirée Beaujolais nouveau (mardi 24 novembre).
- **L'hébergement :** Netlify Functions (v2) et Netlify Blobs (consistency 'strong'), avec du polling HTTP. Le site est déployé depuis GitHub (dossier `course-netlify/`, Base directory = course-netlify).

### Fichiers
- `netlify/lib/game-logic.mjs` : moteur serveur (GAMES, RULES, POOLS, BASE_DUR, maxScore, cupsTimeline, actions animateur).
- `netlify/functions/api.mjs` : point d'entrée `/api/*`.
- `public/index.html` : écran animateur et téléphone (HTML, CSS et JS dans un seul fichier).

### Déjà fait (NE PAS refaire, NE PAS casser)
Le jeu **« Le bonneteau »** (id `bonneteau`) remplace l'ancien « Le bon tonneau » (id `chance`). Il est testé et fonctionne.
- Le minutage est calculé par le serveur dans `cupsTimeline()` et stocké dans `state.round.cups`.
- Les mélanges sont recalculés à l'identique sur chaque écran avec le tirage partagé `rnd()`.
- La position des gobelets est déduite de l'heure du serveur : fonctions `cupsPlan`, `cupsPose`, `cupsDraw`, `cupsFrame`.
- Départage au temps de réponse cumulé : champ `tb`, envoyé par le téléphone et utilisé dans l'action `end`.
- Grille validée : `CUPS_GRID` dans game-logic.mjs. **Ne pas la modifier.**

Je te demande d'appliquer les modifications 1 et 2 ci-dessous en une seule version et de me rendre les fichiers complets modifiés.

---

## MODIFICATION 1 — Règles communes (cadrage)

### 1.1 « Nouvelle partie (nouveau QR code) » : protéger contre l'effacement par erreur
- Remplacer le `confirm()` actuel par une fenêtre intégrée à la page. Elle rappelle ce qui sera perdu, par exemple « 12 joueurs et 3 classements seront effacés ».
- Pour confirmer, l'animateur doit **taper le code de la partie actuelle** (5 caractères).
- Le bouton « Créer la nouvelle partie » n'est actif que si le code tapé est exact. Un bouton « Annuler » ferme la fenêtre.

### 1.2 Inscription du joueur
- Prénom ou pseudo obligatoire, 16 caractères maximum (déjà en place, à garder).
- Choix de couleur obligatoire parmi **12 couleurs** :
  - une couleur prise par un joueur est grisée pour les autres tant qu'il reste des couleurs libres ;
  - au-delà de 12 joueurs, les couleurs peuvent être partagées.
- La couleur est stockée dans le blob du joueur (`room/<code>/p/<pid>`). Elle apparaît partout sur le grand écran : pastilles des joueurs, barres du classement en direct, podium, classements.

### 1.3 Règle et exemple TOUJOURS affichés
À chaque manche, y compris la manche 1 en règles de base, la règle et un exemple concret s'affichent :
- **sur le grand écran :** salon, compte à rebours, rappel pendant la manche ;
- **sur les téléphones :** attente, compte à rebours, rappel pendant le jeu.

Exemples des règles de base, à ajouter dans `GAMES` côté client :

| Jeu | Exemple |
| --- | --- |
| Course des tonneaux | « Tape le plus vite possible ! 10 tapes = 10 points. » |
| Top départ | « Réaction en 250 ms = 4 750 points. Trop tôt = 0. » |
| Trouve l'intrus | « 8 🍇 et 1 🫐 : touche le 🫐. » |
| Suite mystère | « 3 · 7 · 11 · ? → 15 (on ajoute 4). » |
| Séquence secrète | « 🔴 🟢 🟡 🔴 → retape 🔴 🟢 🟡 🔴 dans le même ordre. » |
| Calcul express | « 7 + 5 = ? → 12. » |
| Le bonneteau | « Suis le gobelet qui cache le 🍇. 10 séries de plus en plus rapides : la série 1 vaut 10 pts, la série 10 vaut 100 pts. » |
| Attrape les raisins | « Un 🍇 apparaît : touche-le, un autre arrive aussitôt. » |
| Mot mélangé | « N I S I R A → RAISIN. » |
| Vrai ou faux | « Le Beaujolais nouveau est fait avec le cépage gamay → Vrai. » |
| Bataille royale | « Tour 1 : touche le terrain pour te placer, puis touche une direction pour tirer. » |

Pour les règles spéciales, ajouter un champ `example` à chaque règle de `RULES` (game-logic.mjs). Sur le même modèle, une phrase courte avec des chiffres, par exemple :

| Règle | Exemple |
| --- | --- |
| ×2 | « 1er sur 8 joueurs = 16 points au lieu de 8 » |
| Sprint | « Même jeu, 2 fois moins de temps » |
| Feu rouge / feu vert | « Vert : tape ! Rouge : stop, sinon −3 » |
| Turbo final | « À 3 s de la fin, chaque tape compte double » |
| Faux signal | « Orange : n'appuie pas ! Vert : maintenant ! » |
| Couleur imposée | « Cible BLEU : appuie seulement quand le bouton est bleu » |
| Trois essais | « 310 ms, faux départ, 280 ms → 280 ms gardés » |
| Grille 4×4 | « 15 🍎 et 1 🍅 » |
| Intrus ressemblant | « 8 😀 et 1 😃 » |
| Suite à l'envers | « ? · 7 · 11 · 15 → 3 » |
| Suites difficiles | « 2 · 6 · 18 · ? → 54 » |
| Bonus de série | « 10, 10, puis 15, 15… » |
| Affichage éclair | « Regarde bien, ça va vite ! » |
| À l'envers | « 🔴 🟢 🟡 → retape 🟡 🟢 🔴 » |
| Niveaux Simon | « 3 couleurs = 10 pts, 4 = 15 pts, 5 = 20 pts » |
| Multiplications | « 6 × 7 = ? → 42 » |
| Calcul en chaîne | « 7 + 5 = 12, puis 12 − 3 = 9 » |
| Raisin pourri | « 🍇 = +1, 🟤 = −2 » |
| Raisin doré | « Raisin doré = +5 » |
| Raisins fugaces | « Il s'envole au bout d'1 seconde ! » |
| Mots longs | « E G N A D E N V → VENDANGE » |
| Lettres manquantes | « T _ N _ E _ U → TONNEAU » |
| Mort subite | « 3 bonnes réponses puis 1 erreur = 30 points, fin » |
| Pari | « Mise 50 et juste = +50, faux = −50 » |
| Thème Beaujolais | « Le Régnié est le plus jeune cru → Vrai » |
| Plateau tournant | « Les gobelets tournent tous ensemble à la fin » |
| Choix éclair | « 1,5 s pour choisir : décide vite ! » |
| Zone qui rétrécit | « Le terrain rétrécit à chaque tour » |
| Bouclier | « Touché une fois = encore en vie » |

### 1.4 Compte à rebours de 6 s avant CHAQUE manche
Dans l'action `start`, remplacer `st.startAt = now + (rule ? 6000 : 4000);` par `st.startAt = now + 6000;`. La règle et l'exemple sont maintenant toujours affichés.

### 1.5 Fin de manche automatique
- À la fin du chrono, afficher « Gong ! Calcul des scores… » sur le grand écran et les téléphones pendant le délai de grâce (2,5 s), puis les résultats provisoires.
- « Terminer la manche » reste disponible pour l'animateur.

---

## MODIFICATION 2 — Classement général + classement du jeu

### 2.1 Calcul
- Général = somme des points de classement (`st.boards[game]`, champ `points`) de chaque joueur, tous jeux confondus.
- Pas de nouveau stockage : le général se calcule à la volée à partir de `st.boards`. Remettre un jeu à zéro le retire donc aussi du général.
- Départage : points, puis victoires (`wins`), puis nom.
- Données par joueur : rang, nom, couleur, points totaux, jeux joués, victoires, détail des points par jeu.

### 2.2 Évolution des rangs
- Dans `validate()`, AVANT d'ajouter les points, mémoriser les rangs du général et du jeu : `st.prevRanks = {general:{pid:rang}, game:{pid:rang}}`.
- Afficher l'évolution à côté de chaque joueur : « ▲ 2 », « ▼ 1 », « = » ou « nouveau ».

### 2.3 Affichage sur l'écran animateur
- **Après « Valider » :** les deux classements côte à côte, jeu à gauche et général à droite, avec l'évolution. Le top 10 est visible, le reste est replié.
- **Fin de série :** podium de la série (points gagnés sur la série), puis les deux classements.
- **Salon :** onglet « Général » sélectionné par défaut, plus un onglet par jeu déjà joué.
- **Bouton « Afficher le classement général »** dans le salon : grand format lisible de loin (podium top 3 + liste), avec un bouton « Fermer ».
- **Détail par jeu :** une pastille par jeu joué avec ses points, par exemple « Course 12 · Calcul 8 · Bonneteau 15 ».

### 2.4 Remise à zéro
- « Remettre ce classement à zéro » existe déjà (par jeu, 2e clic dans les 4 s). Le jeu disparaît aussi du général.
- Nouveau bouton « Tout remettre à zéro », avec la même confirmation que « Nouvelle partie » : taper le code de la partie.

---

## NE PAS CODER (pas encore validé)
- Bouton « Je suis prêt » et compteur « 8/10 prêts ».
- Manche d'essai non comptée.
- Interdiction de tirer deux fois la même règle dans une série.
- « Dernière manche ! » pendant le dernier compte à rebours. Ne pas confondre avec la « Dernière série » du bonneteau, déjà faite.
- Progression ●●○ des manches.
- « Retirer ce joueur de la manche ».
- Bruitages et bouton son / muet.
- Améliorations par jeu marquées « à valider » :
  - piste visuelle de la Course ;
  - temps de Top départ en direct ;
  - bonus de vitesse de l'Intrus ;
  - couleurs une par une en Séquence ;
  - difficulté qui monte en Calcul ;
  - plusieurs raisins à la fois ;
  - phases de 8 s en Bataille royale.
- Bonneteau : option « mouvements réduits » et règle « Coup de chance ».
- Classement : colonne « moyenne par jeu joué ».

## CONTRAINTES
- Pas de compte pour les joueurs.
- Pas de WebSocket ni de WebRTC (bloqués sur le réseau Afpa) : uniquement du polling HTTP vers `/api/*`.
- Un seul écrivain par blob :
  - `room/<code>/state` : écran animateur ;
  - `room/<code>/p/<pid>` : téléphone du joueur ;
  - `room/<code>/b/<pid>` : bataille royale.
- Ne pas changer le système de points commun :
  - N points au 1er, N−1 au 2e… ;
  - les ex æquo marquent les mêmes points ;
  - un score de 0 rapporte 0 point ;
  - la règle ×2 double les points.
- Ne pas toucher au moteur du bonneteau, en dehors de l'exemple affiché et de la couleur des joueurs.
- Pas de geste imposé (accessibilité) : uniquement des touchers simples.
- Livrer les fichiers complets modifiés, prêts à déployer en une seule fois : chaque déploiement Netlify coûte 15 crédits.
- À la fin, lister les modifications faites, fichier par fichier.
