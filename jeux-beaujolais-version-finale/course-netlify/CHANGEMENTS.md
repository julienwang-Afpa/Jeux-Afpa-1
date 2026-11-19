# Changements du 19 novembre 2026

Base : la version modulaire fournie (app.mjs, host.mjs, phone.mjs, games.mjs, staged.mjs, style.css). Interface conservée : même thème lie-de-vin, or et crème, mêmes écrans.

## Ce qui a été modifié

### Écrans et manches
- **Salon :** QR code et liste des joueurs passés à gauche, préparation du jeu à droite. Choix de **1 à 5 manches**.
- **Compte à rebours :** **6 s** au lieu de 8, avec la règle rappelée sur le grand écran et les téléphones.
- **Règles spéciales :** manche 1 toujours classique ; ensuite, règle spéciale **tirée au sort** et affichée avant le lancement, avec « 🎲 Autre règle » et « Sans règle ».
- **Carte de règle :** ajout d'une ligne **Exemple**, pour le jeu et pour la variante. Le thème (Vrai ou faux) ou le niveau (Mot mélangé) y sont aussi affichés.
- **Annuler et rejouer :** nouveau bouton pendant la manche. Aucun point n'est compté et la même règle est reproposée. La version fournie n'avait pas de résultats « provisoires » à valider : l'annulation se fait donc pendant la manche.
- **Effacer tous les scores :** il faut désormais taper le code de la partie.

### Classements et points
- **Barème initial :** N points au 1er, N − 1 au 2e… **Le bonus podium +2 / +1 est supprimé.**
- **Score nul ou absent :** 0 point.
- **Égalité :** même rang et mêmes points.
- **Règle ×2 :** elle double les points de classement de la manche.
- **Classement par jeu** (pour remettre un lot), cumulé sur toute la soirée, en plus du classement général. Les résultats s'enchaînent : podium, classement du jeu, classement général. Le salon a un onglet par jeu.
- **Performance réelle** affichée dans les résultats (par exemple « 46 tapes », « 7 / 10 séries · 280 pts »).
- **Scores qui baissent :** le serveur garde la dernière valeur envoyée, avec un numéro de séquence (déjà en place, vérifié).

### Joueurs et robots
- **Plus de limite de 40 joueurs.** Retirer un joueur efface aussi ses points.
- **Robots :** nombre au choix, bouton pour les retirer. Ils apparaissent dans les classements et jouent à tous les jeux, Bataille royale comprise. Ils fonctionnent aussi en ligne, marqués 🤖.

### Jeux
- **Course des tonneaux :**
  - variantes « Main imposée » et « Un seul doigt » supprimées ;
  - ajout du **Sprint** (10 s) ;
  - **Turbo** sur les 3 dernières secondes au lieu de 5 ;
  - **Feu rouge** : −1 par tape au rouge (le score peut baisser).
- **Top départ :**
  - essais de 8 s au lieu de 6,5 s ;
  - signal entre **1,5 et 5 s** au lieu de 1,6 et 4 s, donc moins prévisible ;
  - « Trop tôt ! » affiché en clair.
- **Trouve l'intrus :**
  - nouvelles variantes **Sprint** (15 s), **Grille 4 × 4**, **Grille qui se mélange** (l'intrus bouge toutes les 2 s) et **Intrus ressemblant** (écart de couleur réduit, jamais sous 5 %) ;
  - en cas d'erreur, la bonne case est entourée et un message s'affiche ;
  - « Grille surprise » et « Course aux trente » sont retirées : elles ne figuraient pas dans la liste demandée.
- **Mémoire Flash :**
  - **+2 s** pour répondre ;
  - clavier de fruits **mélangé** à chaque suite ;
  - **bonus +1 point de classement** au plus rapide parmi ceux qui réussissent toutes les suites, signalé au joueur et dans le tableau. Le temps n'est pas affiché.
- **Calcul express :**
  - **45 s** ;
  - nouvelle variante **Calcul en chaîne** ;
  - mauvaises réponses à ±1, ±2 ou ±10 ;
  - barre de temps ajoutée sur le téléphone.
- **Mot mélangé :**
  - **45 s** ;
  - niveaux **Facile / Difficile** choisis par l'animateur ;
  - nouvelle banque de mots ;
  - propositions de longueur proche, de préférence avec la même initiale ;
  - variantes **Mots longs** et **Lettres manquantes** ajoutées.
- **Vrai ou faux :**
  - **10 questions, 8 s** pour répondre (5 s en Sprint) ;
  - **8 thèmes + « Tous les thèmes »** au choix de l'animateur ;
  - pas de question répétée tant que le thème n'est pas épuisé ;
  - message clair si un thème a moins de 10 questions ;
  - variantes **Sprint**, **Mort subite** et ×2.
- **Bataille royale :**
  - une phase commune de **8 s** pour se placer et viser ;
  - révélation de **9 s** ;
  - joueurs plus petits (rayon 0,06 au lieu de 0,08) ;
  - **la zone rétrécit dès le tour 2**, jusqu'à 0,35 ;
  - la variante « Zone réduite » devient **« Zone express »** : dès le tour 1, plus vite et plus loin, jusqu'à 0,25. Elle change donc vraiment le jeu ;
  - aucune limite de tours ;
  - Bouclier conservé.
- **Le bonneteau** (nouveau, repris du code de référence) :
  - grille de 10 séries de référence ;
  - mêmes mélanges et mêmes phases pour tous, grand écran synchronisé ;
  - 10 × L points par série ;
  - départage au temps de réponse ;
  - variantes Mort subite, Plateau tournant, Choix éclair et ×2.
- **Le bon tonneau :** version d'origine conservée telle quelle (12 tours, 6 règles, finale de survie), remise dans la liste des jeux, variante ×2 ajoutée.
- **Barres de temps :** les phases des jeux pilotés envoient leur durée exacte, pour que la barre soit juste partout.

## Ce qui n'a pas été fait, et pourquoi
- **Variante « Pari » de Vrai ou faux :** il faudrait miser puis répondre dans les 8 mêmes secondes, ce qui n'est pas jouable. Elle n'est pas proposée.
- **Variante « Thème Beaujolais » :** elle est remplacée par le choix du thème « Beaujolais et vin ».
- **Banque de 223 questions :** elle n'était dans aucun des fichiers fournis. Une nouvelle banque de 238 affirmations a été écrite (détail ci-dessous).
- **Suite mystère et Attrape les raisins :** ces jeux n'existaient pas dans la version fournie ; il n'y avait rien à supprimer.

## Banques de données

| Thème de Vrai ou faux | Questions | dont fausses |
| --- | --- | --- |
| Culture générale | 30 | 11 |
| Géographie | 30 | 10 |
| Histoire | 29 | 11 |
| Sciences et nature | 30 | 13 |
| Sport | 28 | 9 |
| Cinéma, musique et divertissement | 27 | 11 |
| Gastronomie | 29 | 11 |
| Beaujolais et vin | 35 | 13 |
| **Tous les thèmes** | **238** | **89** |

- **Vérification :** les affirmations sur le Beaujolais ajoutées (Moulin-à-Vent « Seigneur du Beaujolais », Chénas plus petit cru, citation de Léon Daudet) ont été vérifiées en ligne (INAO, beaujolais.com). Les autres sont des faits stables de culture générale, mais **elles n'ont pas toutes été vérifiées une à une** : une relecture avant la soirée est conseillée.
- **Mot mélangé :** **93 mots faciles** et **75 difficiles**, dont 62 de 8 lettres ou plus pour la variante Mots longs.

## Tests effectués
- **Automatiques côté serveur** (23 vérifications réussies) :
  - barème N…1 ;
  - égalités ;
  - score nul = 0 ;
  - ×2 ;
  - classement par jeu cumulé ;
  - tirage de la règle, « Autre règle » et « Sans règle » ;
  - annulation sans point ;
  - message reçu en retard ignoré ;
  - score qui baisse accepté ;
  - bonus Mémoire ;
  - ajout et retrait de robots ;
  - remise à zéro avec code ;
  - thème insuffisant.
- **Bonneteau sans navigateur :** 3 000 séries contrôlées. Le raisin est toujours révélé sous le gobelet suivi, et aucun gobelet ne « saute ».
- **Navigateurs simulés** (Chromium : écran 1440 × 860, téléphones 390 × 820), avec 2 téléphones et 6 à 8 robots :
  - une manche complète de bonneteau : le joueur qui suit le bon gobelet fait 10/10 ;
  - les trois écrans de résultats ;
  - l'annulation ;
  - Vrai ou faux par thème ;
  - Calcul et Mots en 45 s, niveau Difficile ;
  - une Bataille royale complète (8 tours, 2 min 24) ;
  - chacune des 23 variantes lancée une fois ;
  - **aucune erreur JavaScript**.
- **Charge simulée :** 80 inscriptions simultanées réussies, avec une latence de stockage simulée.

## À tester avant mardi
- Une partie avec 2 ou 3 **vrais téléphones** (iPhone et Android) sur le **site Netlify**, et le grand écran sur le **projecteur**.
- Les bruitages : la version fournie n'en a pas, et il n'y en a toujours pas.
- La relecture des questions de culture générale.
