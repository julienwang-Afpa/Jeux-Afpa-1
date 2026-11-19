# Les Jeux du Beaujolais : guide

## 1. Tester sur ton ordinateur (sans rien déployer)

```bash
npm install
node local-test.mjs
```

- Ouvre http://localhost:4173 : c'est l'écran de l'animateur (projecteur).
- Pour un téléphone sur le même Wi-Fi, remplace `localhost` par l'adresse de ton ordinateur. Sur le réseau Afpa, ça risque d'être bloqué : teste plutôt en ouvrant le lien « Rejoindre » dans un deuxième onglet.
- Les données sont en mémoire et disparaissent quand tu arrêtes le serveur.

## 2. Mettre en ligne en une seule fois (quand tu as validé)

1. Sur GitHub, ouvre le dépôt `Jeux-Afpa`.
2. Remplace tout le contenu du dossier `course-netlify/` par celui de ce zip, en **un seul commit**. Le plus simple est de supprimer l'ancien dossier puis de glisser le nouveau, ou de passer par GitHub Desktop.
3. Sur Netlify, vérifie dans *Site configuration › Build & deploy* :
   - Base directory : `course-netlify` ;
   - Publish directory : `public` (déjà dans `netlify.toml`) ;
   - Functions directory : `netlify/functions` (déjà dans `netlify.toml`).
4. Netlify redéploie tout seul après le commit. Un déploiement coûte 15 crédits.
5. Vérifie que https://ton-site/api/… répond : l'écran animateur doit afficher un QR code.

`local-test.mjs`, `GUIDE.md` et `CHANGEMENTS.md` ne sont jamais servis en production : ils sont hors de `public/` et de `netlify/functions/`.

## 3. Déroulé de la soirée

1. L'animateur ouvre le site sans paramètre sur l'ordinateur du projecteur, puis passe en plein écran.
2. Chaque joueur scanne le QR code, choisit un prénom et une couleur libre.
3. Dans le salon, l'animateur choisit :
   - le jeu ;
   - le nombre de manches (1 à 5) ;
   - pour Vrai ou faux, le thème ;
   - pour Mot mélangé, le niveau.
4. **Manche 1 : règles classiques.** À partir de la manche 2, une règle spéciale est tirée au sort et affichée. Boutons « 🎲 Autre règle » et « Sans règle ».
5. « Lancer la manche » : décompte de 6 s avec rappel de la règle, puis la manche.
6. Les résultats s'enchaînent : podium de la manche, classement du jeu, puis classement général.
7. « Préparer la manche suivante » ou « Retour au salon ».

**Annuler et rejouer** : pendant une manche, ce bouton l'annule sans compter aucun point et repropose la même règle.

## 4. Robots de test

- Dans le salon, sous la liste des joueurs : choisis un nombre, puis « 🤖 Ajouter ». « Retirer les robots » les supprime avec leurs points.
- **Ce que simulent les robots :** ils ne simulent **pas** de téléphone. Le serveur leur invente un résultat plausible à la fin des jeux individuels, et un choix dans les jeux pilotés (Vrai ou faux, Bon tonneau). Dans la Bataille royale, ils sont placés et visent au hasard.
- Ils remplissent les classements et testent l'enchaînement des écrans. **Ce n'est pas un test de charge.**

## 5. Limites pratiques avec beaucoup de joueurs

- Le code ne fixe aucune limite de joueurs.
- **Testé :** jusqu'à 110 inscrits sur un serveur simulé, dont 80 inscriptions simultanées sans échec, en moins de 4 s. Avec 3 vrais navigateurs (1 écran, 2 téléphones) et 8 robots, tous les jeux fonctionnent.
- **Pas testé :** de vrais téléphones, le Wi-Fi de la salle, le projecteur, et plusieurs dizaines de personnes en même temps sur Netlify.
- **Affichage :**
  - classements limités aux 15 à 20 premiers (« + N autres joueurs ») ;
  - classement en direct limité aux 14 premiers ;
  - liste des joueurs avec défilement.
- **Requêtes :** un téléphone interroge le serveur toutes les 3 s au calme et envoie son score au plus toutes les 1,2 s. Pendant une manche, le grand écran lit les scores de tous les joueurs toutes les 1,5 s. Estimation pour 30 joueurs sur 2 heures : environ 150 000 requêtes, soit 30 crédits Netlify.
- **Conseil :** garde le grand écran ouvert toute la soirée. C'est lui qui fait avancer les manches pilotées (Vrai ou faux, Bataille royale, Bon tonneau).
