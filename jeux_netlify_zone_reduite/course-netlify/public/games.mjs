// Données partagées par le navigateur et le serveur (Netlify Functions).
export const colors = ['#e8455f','#e8b45a','#7fc4a8','#a98be0','#f08a4b','#5fb4e8','#f28dc0','#8fc45a','#3fc9c9','#e8e05a','#ff7b6b','#fbf1e4'];
export const colorNames = ['Gamay','Or','Menthe','Lavande','Orange','Ciel','Rose','Vigne','Turquoise','Citron','Corail','Crème'];

// Variantes : [nom, explication courte]. L'admin choisit la variante avant chaque manche.
export const rules = {
  classic: ['Classique', 'La règle de base.'],
  double: ['Points ×2', 'Les points de classement de cette manche comptent double.'],
  lights: ['Feu rouge', '30 s. Tape seulement au vert : chaque tape au rouge retire 1 point.'],
  turbo: ['Turbo final', 'Les tapes des 5 dernières secondes valent 2 points.'],
  onefinger: ['Un seul doigt', 'Tape avec un seul doigt, toujours le même.'],
  hand: ['Main imposée', 'Tape uniquement avec la main indiquée.'],
  grid: ['Grille surprise', 'La grille change de taille : 9, 16 ou 25 cases.'],
  race30: ['Course aux trente', 'Le premier à trouver 30 intrus gagne, puis on départage au temps.'],
  reverse: ['À l’envers', 'Reproduis la séquence du dernier fruit au premier.'],
  orange: ['Faux signal', 'Un signal orange peut apparaître : n’appuie qu’au vert.'],
  multiply: ['Tables de multiplication', 'Uniquement des multiplications.'],
  streak: ['Série bonus', '5 bonnes réponses d’affilée = +1 point.'],
  shield: ['Bouclier', 'Chaque joueur résiste à sa première touche.'],
  shrink: ['Zone réduite', 'La zone rétrécit à chaque tour.'],
  beaujolais: ['Spécial Beaujolais', 'Toutes les affirmations portent sur le Beaujolais.'],
};

// Fût de vin dessiné (l'émoji 🛢️ affiche un bidon bleu sur la plupart des téléphones).
export const BARREL = '<svg class="barrel-svg" viewBox="0 0 64 72" width="1em" height="1.12em" aria-hidden="true"><path d="M14 4h36c6 9 9 20 9 32s-3 23-9 32H14C8 59 5 48 5 36S8 13 14 4z" fill="#9a5f30" stroke="#3a1d0e" stroke-width="2"/><path d="M20 6c-3 9-4 19-4 30s1 21 4 30" fill="none" stroke="#d29a5e" stroke-opacity=".55" stroke-width="5"/><path d="M24 4c-2 10-3 21-3 32s1 22 3 32M40 4c2 10 3 21 3 32s-1 22-3 32" fill="none" stroke="#3a1d0e" stroke-opacity=".45" stroke-width="1.6"/><path d="M9 17h46M9 55h46" stroke="#2b2b2e" stroke-width="5"/><path d="M9 15.5h46M9 53.5h46" stroke="#8d8d93" stroke-width="1.4"/><ellipse cx="32" cy="36" rx="5" ry="4" fill="#3a1d0e"/><ellipse cx="32" cy="35" rx="3" ry="2.2" fill="#7a2232"/></svg>';

// Ordre conseillé pour la soirée (programme).
export const programme = ['truefalse','barrels','odd','reaction','memory','maths','words','arena','lucky'];

export const games = {
  truefalse: { name: 'Vrai ou faux', icon: '❓', staged: true, unit: 'bonnes réponses',
    how: 'Une affirmation s’affiche pour tout le monde. Vrai ou faux ? Tu as 12 secondes.',
    goal: '1 point par bonne réponse. Le plus de points gagne.', variants: ['beaujolais','double'] },
  barrels: { name: 'Course des tonneaux', icon: BARREL, seconds: 20, unit: 'tapes',
    how: 'Tape sur le tonneau le plus vite possible.',
    goal: 'Le plus de points gagne.', variants: ['lights','turbo','onefinger','hand','double'] },
  odd: { name: 'Trouve l’intrus', icon: '🔍', seconds: 30, unit: 'intrus',
    how: 'Touche la case d’une couleur légèrement différente. Une erreur bloque 0,5 s.',
    goal: '1 point par intrus, +1 tous les 5 d’affilée. Le plus de points gagne.', variants: ['grid','race30','double'] },
  reaction: { name: 'Top départ', icon: '🚦', seconds: 19.5, unit: 'ms',
    how: '3 essais. Attends « Appuie ! » puis touche le plus vite possible. Trop tôt = essai annulé.',
    goal: 'Le meilleur temps des 3 essais gagne.', variants: ['orange','double'] },
  memory: { name: 'Mémoire Flash', icon: '🧠', unit: 'fruits',
    how: 'Regarde la suite de fruits, puis reproduis-la dans le même ordre. 6 suites, de 2 à 7 fruits.',
    goal: '1 point par fruit bien placé. À égalité, le plus rapide gagne.', variants: ['reverse','double'] },
  maths: { name: 'Calcul express', icon: '➗', seconds: 30, hideClock: true, unit: 'bonnes réponses',
    how: 'Choisis le bon résultat. Pas de chrono : fais de ton mieux !',
    goal: 'Le plus de bonnes réponses gagne.', variants: ['multiply','streak','double'] },
  words: { name: 'Mot mélangé', icon: '🔤', seconds: 30, hideClock: true, unit: 'mots',
    how: 'Les lettres sont mélangées : retrouve le mot parmi les 4 propositions.',
    goal: 'Le plus de mots trouvés gagne.', variants: ['streak','double'] },
  arena: { name: 'Bataille royale', icon: '🎯', staged: true, minPlayers: 2, unit: 'tours',
    how: 'Touche le terrain pour te placer, puis touche encore pour viser. Tous les tirs partent en même temps et s’arrêtent sur le premier joueur touché.',
    goal: 'Le dernier en vie gagne. Plusieurs survivants à la fin = ex æquo.', variants: ['shield','shrink','double'] },
  lucky: { name: 'Le bon tonneau', icon: '🍀', staged: true, unit: 'points',
    how: 'Choisis un tonneau à chaque tour : la règle change tous les 2 tours. Puis finale de survie : 3 vies, 3 tonneaux sur 9 explosent.',
    goal: 'Le plus de points gagne. Le dernier survivant de la finale gagne +5.', variants: [] },
};

export const ruleNames = id => rules[id]?.[0] || id;

export function handOf(roundId) { return parseInt(roundId.slice(-2), 16) % 2 ? 'gauche' : 'droite'; }

export function ruleText(game, rule, roundId) {
  if (rule === 'hand' && roundId) return `Tape uniquement avec la main ${handOf(roundId)}.`;
  return rules[rule]?.[1] || '';
}

// Mémoire Flash : 6 suites de 2 à 7 fruits. Temps en secondes depuis le départ.
export function memoryPlan() {
  const stages = [];
  let t = 0;
  for (let i = 0; i < 6; i++) {
    const len = i + 2;
    const show = 3 + len, answer = 5 + len;
    stages.push({ index: i, len, start: t, answerAt: t + show, end: t + show + answer });
    t += show + answer + 2;
  }
  return stages;
}
export const memorySeconds = () => memoryPlan().at(-1).end;

// Top départ : 3 essais de 6,5 s ; signal entre 1,6 s et 4 s (même instant pour tous).
export const REACTION_TRY = 6500;
export function reactionPlan(roundId, rule) {
  const rnd = seeded(roundId + 'reaction');
  return [0,1,2].map(i => {
    const go = 1600 + Math.floor(rnd() * 2400);
    const fake = rule === 'orange' && rnd() < 0.67 ? go - 900 : null;
    return { start: i * REACTION_TRY, go: i * REACTION_TRY + go, fake: fake === null ? null : i * REACTION_TRY + fake };
  });
}

export function duration(game, rule) {
  if (game === 'memory') return memorySeconds();
  if (game === 'barrels' && rule === 'lights') return 30;
  return games[game].seconds;
}

// Barème : (nombre de participants − place + 1) + bonus podium (1er +2, 2e +1).
export function pointsFor(rank, participants, multiplier = 1) {
  const bonus = rank === 1 ? 2 : rank === 2 ? 1 : 0;
  return (participants - rank + 1 + bonus) * multiplier;
}

// Le bon tonneau : 6 règles jouées 2 fois, puis la finale.
export const luckyRules = {
  max: ['Le plus gros tonneau', 'Chaque tonneau cache 0, 1, 2, 3 ou 5 points.'],
  trap: ['Le tonneau piégé', 'Un tonneau retire 2 points. Les autres en donnent 1.'],
  least: ['Le moins choisi', 'Le tonneau choisi par le moins de joueurs rapporte 3 points.'],
  shared: ['Le tonneau partagé', 'Chaque tonneau contient 6 points, partagés entre ceux qui l’ont choisi.'],
  gamble: ['Quitte ou double', 'Sécurise 1 point, ou tente un tonneau : 2 sur 5 rapportent 4 points.'],
  gold: ['Le tonneau d’or', 'Un tonneau d’or caché rapporte 5 points. Les autres en donnent 1.'],
  final: ['Finale de survie', '3 tonneaux sur 9 explosent : −1 vie. 3 vies. Le dernier survivant gagne +5.'],
};
export const luckyOrder = ['max','max','trap','trap','least','least','shared','shared','gamble','gamble','gold','gold'];

// Générateur pseudo-aléatoire déterministe : même tirage pour tous à partir de l'id de la manche.
export function seeded(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

// Feu rouge : alternance vert/rouge, identique pour tous. Renvoie [{from, to, red}] en ms depuis le départ.
export function lightsPlan(roundId, total = 30000) {
  const rnd = seeded(roundId + 'lights'), plan = [];
  let t = 0, red = false;
  while (t < total) {
    const len = red ? 1500 + rnd() * 1500 : 2500 + rnd() * 2000;
    plan.push({ from: t, to: Math.min(total, t + len), red });
    t += len; red = !red;
  }
  return plan;
}
export const isRed = (roundId, elapsed) => lightsPlan(roundId).find(p => elapsed >= p.from && elapsed < p.to)?.red || false;

// Mémoire Flash : suites de fruits identiques pour tous, sans deux fruits identiques à la suite.
export const fruits = ['🍇','🍒','🍋','🍐','🍎','🍓'];
export function memorySequence(roundId, stage) {
  const rnd = seeded(roundId + 'memory' + stage.index), list = [];
  while (list.length < stage.len) {
    const f = fruits[Math.floor(rnd() * fruits.length)];
    if (f !== list.at(-1)) list.push(f);
  }
  return list;
}
export function memoryStageAt(elapsedMs) {
  const t = elapsedMs / 1000;
  for (const s of memoryPlan()) {
    if (t < s.start) return { ...s, phase: 'wait' };
    if (t < s.answerAt) return { ...s, phase: 'show' };
    if (t < s.end) return { ...s, phase: 'answer' };
  }
  return null;
}

// Classement général : rang partagé en cas d'égalité.
export function standings(players, totals) {
  const rows = players.map(p => ({ ...p, total: totals?.[p.pid] || 0 })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fr'));
  rows.forEach((r, i) => { r.rank = i && rows[i - 1].total === r.total ? rows[i - 1].rank : i + 1; });
  return rows;
}
