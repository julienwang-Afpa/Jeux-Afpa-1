# Les Jeux du Beaujolais : guide court

## 1. Tester sur ton ordinateur (sans rien déployer)

```bash
npm install
node local-test.mjs
```

- Ouvre http://localhost:4173 : c'est l'écran de l'animateur (projecteur).
- Les téléphones scannent le QR code (même Wi-Fi ; l'adresse doit être celle de ton ordinateur, pas `localhost`).
- Le bouton « Ajouter 3 robots » n'existe qu'en local (jusqu'à 12 robots).
- Les données sont en mémoire et disparaissent à l'arrêt du serveur.

## 2. Mettre en ligne (seulement quand tu as validé)

Remplace le contenu de `course-netlify/` dans le dépôt par ce dossier, puis pousse : Netlify redéploie le site.
`local-test.mjs` et `robots-test.mjs` ne sont jamais servis en production (ils sont hors de `public/` et de `netlify/functions/`).

## 3. Déroulé de la soirée

1. L'animateur ouvre le site sans paramètre sur l'ordinateur du projecteur, puis passe en plein écran.
2. Chaque joueur scanne le QR code, choisit un prénom et une couleur libre.
3. Dans le salon : choisir le jeu, la série, la variante éventuelle, puis « Lancer la manche ».
4. Compte à rebours de 8 s, la manche, les résultats, puis le classement général.
5. « Retour au salon » pour le jeu suivant. Ordre conseillé : Vrai ou faux, Course des tonneaux, Trouve l'intrus, Top départ, Mémoire Flash, Calcul, Mots, Bataille royale, Le bon tonneau.

## 4. Décisions prises

| Sujet | Décision |
|---|---|
| Compte à rebours | 8 s, pour que tout le monde lise la règle. |
| Mémoire Flash | 6 suites de 2 à 7 fruits, affichées 3 s + 1 s par fruit. |
| Points | Par manche : (nombre de joueurs − place + 1), +2 au 1er et +1 au 2e. Le dernier a toujours au moins 1 point ; les égalités partagent le même rang. |
| Classement animé | Pas de flèches ▲▼ tant que personne n'a marqué. |
| Couleurs | Une couleur par joueur ; les couleurs déjà prises sont grisées à l'inscription. |
| Course des tonneaux | Icône de fût dessinée en SVG (l'émoji 🛢️ s'affichait comme un bidon bleu). |
| Top départ | Fin de manche : « Ton meilleur temps : X ms » au lieu de « Ton score : 0 ». |
| Le bon tonneau (finale) | Liste des vies agrandie sur le projecteur, prénoms non tronqués. |
| Vrai ou faux | Pas de compteur « x/n ont répondu » sur le projecteur : il faudrait relire tous les joueurs à chaque requête, donc plus de requêtes Netlify. |
| Synchronisation | Polling HTTP uniquement, Netlify Blobs en mode strong. |

## 5. Ce qui a été testé, et comment

- **Simulé** : les 9 jeux en version classique, plus 8 variantes, avec 2 téléphones simulés dans Chromium (390×844) et 3 robots. Résultat : 0 erreur JavaScript, et les captures ont été vérifiées à l'œil.
- **Pas encore testé** : de vrais téléphones (iPhone et Android), le vrai réseau Wi-Fi de la salle, le projecteur et une dizaine de joueurs réels sur le site Netlify.
- **À faire avant mardi** : une partie rapide avec 2 ou 3 vrais téléphones, sur le site de test ou en local.

L'abus d'alcool est dangereux pour la santé, à consommer avec modération.
