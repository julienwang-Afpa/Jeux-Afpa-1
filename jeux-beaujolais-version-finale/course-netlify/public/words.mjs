// Mot mélangé : deux niveaux. Facile = mots courts de la vie courante et de la fête ;
// difficile = mots plus longs, vocabulaire du vin, de la vigne et de la fête. Pas de doublon entre les listes.
export const easyWords = `
raisin vigne verre table chaise lampe livre crayon cahier école maison jardin cheval lapin canard poisson
orange banane citron cerise pomme poire fraise carotte tomate salade gâteau bougie cadeau voiture train avion
bateau plage nuage étoile hiver automne chanson danse couteau famille village moulin panier cave bouchon grappe
tonneau fromage soleil musique colline forêt rivière fourchette cuillère assiette nappe tarte crêpe pain beurre
sucre farine poivre olive melon prune noix café thé lait miel confiture fenêtre porte jardin tulipe rose
oiseau chien chat souris renard hibou ballon vélo guitare piano tambour fanfare fête cadeau ruban
`.trim().split(/\s+/).filter((w, i, a) => a.indexOf(w) === i);

export const hardWords = `
vendange vigneron sommelier barrique pressoir terroir cépage millésime dégustation carafe magnum
bouteille tonnelier vinification fermentation macération cuverie viticulture
beaujolais primeur gamay grappillon sarment échalas coteau vignoble appellation étiquette
charcuterie saucisson rillettes quenelle cervelas andouillette fromagerie boulangerie pâtisserie
guinguette lampion confettis serpentin farandole accordéon orchestre ritournelle chanteur trinquer
convivial célébration festivité réjouissance anniversaire invitation banquet ripaille
automnal novembre récolte vendangeur hotte sécateur cuvée assemblage décantation arôme bouquet
framboise groseille myrtille châtaigne champignon citrouille potiron clémentine mandarine
`.trim().split(/\s+/).filter((w, i, a) => a.indexOf(w) === i && !easyWords.includes(w));
