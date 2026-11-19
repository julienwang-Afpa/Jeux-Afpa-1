// Données partagées par le navigateur et le serveur (Netlify Functions).
export const colors = ['#e8455f','#e8b45a','#7fc4a8','#a98be0','#f08a4b','#5fb4e8','#f28dc0','#8fc45a','#3fc9c9','#e8e05a','#ff7b6b','#fbf1e4'];
export const colorNames = ['Gamay','Or','Menthe','Lavande','Orange','Ciel','Rose','Vigne','Turquoise','Citron','Corail','Crème'];

// Variantes : [nom, explication, exemple]. Manche 1 : classique ; ensuite une variante du jeu est tirée au sort.
// Aucune variante n'impose un geste physique (accessibilité).
export const rules = {
  classic: ['Classique', 'La règle de base.', ''],
  double: ['Points ×2', 'Les points de classement de cette manche comptent double.', '1er sur 8 joueurs : 16 points au lieu de 8.'],
  sprint: ['Sprint', 'Le temps de jeu est divisé par deux.', 'Même jeu, deux fois moins de temps : vas-y franco !'],
  lights: ['Feu rouge', 'Tape seulement au vert : chaque tape au rouge retire 1 point.', 'Vert : tape ! Rouge : stop, sinon −1.'],
  turbo: ['Turbo final', 'Les tapes des 3 dernières secondes comptent double.', 'À 3 s de la fin, 10 tapes = 20 points.'],
  orange: ['Faux signal', 'Un signal orange peut apparaître : n’appuie qu’au vert.', 'Orange : surtout pas ! Vert : maintenant !'],
  grid44: ['Grille 4 × 4', 'Toujours 16 cases, dès le début.', '15 cases bleues et une un peu plus claire.'],
  shuffle: ['Grille qui se mélange', 'L’intrus change de place toutes les 2 secondes.', 'Tu l’as repéré ? Vite, avant qu’il ne bouge !'],
  lookalike: ['Intrus ressemblant', 'L’intrus est à peine plus clair que les autres.', 'Regarde bien : la différence est très légère.'],
  reverse: ['À l’envers', 'Reproduis la séquence du dernier fruit au premier.', '🍇 🍒 🍋 → réponds 🍋 🍒 🍇.'],
  multiply: ['Tables de multiplication', 'Uniquement des multiplications.', '7 × 8 = ? → 56'],
  chain: ['Calcul en chaîne', 'Le résultat devient le début du calcul suivant.', '12 + 7 = 19, puis 19 − 4 = 15, puis 15 + 9…'],
  streak: ['Série bonus', '5 bonnes réponses d’affilée = +1 point.', '5 bonnes réponses de suite = 6 points.'],
  long: ['Mots longs', 'Uniquement des mots de 8 lettres ou plus.', 'E G N A D E N V → VENDANGE'],
  holes: ['Lettres manquantes', 'Le mot s’affiche dans l’ordre, avec des lettres en moins.', 'T _ N N E _ U → TONNEAU'],
  sudden: ['Mort subite', 'Une erreur et ta manche s’arrête : tu gardes tes points.', '3 bonnes réponses puis une erreur : 3 points, fin.'],
  shield: ['Bouclier', 'Chaque joueur résiste à sa première touche.', 'Touché une fois : ton bouclier saute, tu restes en jeu.'],
  shrink: ['Zone express', 'La zone rétrécit dès le premier tour, plus vite et plus fort.', 'Le terrain fond à vue d’œil : pas de cachette !'],
  rotate: ['Plateau tournant', 'À la fin de chaque mélange, tous les gobelets tournent d’un cran.', 'Le gobelet de droite revient à gauche, les autres glissent d’une place.'],
  quick: ['Choix éclair', 'Seulement 1,5 s pour toucher le bon gobelet.', 'Décide vite : passé 1,5 s, la série est perdue.'],
};
// Textes propres à un jeu quand la même variante change de sens.
const ruleOverride = {
  'truefalse/sprint': ['5 secondes par question au lieu de 8.', 'Lis vite, réponds vite !'],
  'truefalse/sudden': ['Une mauvaise réponse et tu ne marques plus rien jusqu’à la fin de la manche.', '4 bonnes réponses puis une erreur : 4 points, fin.'],
  'cups/sudden': ['Une erreur et ta partie s’arrête : tu gardes tes points.', 'Séries 1 à 3 réussies puis une erreur : 60 points, fin.'],
  'barrels/sprint': ['10 secondes au lieu de 20.', '10 secondes pour taper le plus possible !'],
  'odd/sprint': ['15 secondes au lieu de 30.', '15 secondes pour trouver le plus d’intrus !'],
  'maths/sprint': ['23 secondes au lieu de 45.', '23 secondes de calcul mental !'],
  'words/sprint': ['23 secondes au lieu de 45.', '23 secondes pour trouver le plus de mots !'],
};

// Thèmes de Vrai ou faux (la banque est dans netlify/lib/questions.mjs).
export const themes = {
  all: 'Tous les thèmes', general: 'Culture générale', geo: 'Géographie', history: 'Histoire', science: 'Sciences et nature',
  sport: 'Sport', fun: 'Cinéma, musique et divertissement', food: 'Gastronomie', wine: 'Beaujolais et vin',
};
export const TF_COUNT = 10;
export const levels = { easy: 'Facile', hard: 'Difficile' };

// Fût de vin dessiné (l'émoji 🛢️ affiche un bidon bleu sur la plupart des téléphones).
export const BARREL = '<svg class="barrel-svg" viewBox="0 0 64 72" width="1em" height="1.12em" aria-hidden="true"><path d="M14 4h36c6 9 9 20 9 32s-3 23-9 32H14C8 59 5 48 5 36S8 13 14 4z" fill="#9a5f30" stroke="#3a1d0e" stroke-width="2"/><path d="M20 6c-3 9-4 19-4 30s1 21 4 30" fill="none" stroke="#d29a5e" stroke-opacity=".55" stroke-width="5"/><path d="M24 4c-2 10-3 21-3 32s1 22 3 32M40 4c2 10 3 21 3 32s-1 22-3 32" fill="none" stroke="#3a1d0e" stroke-opacity=".45" stroke-width="1.6"/><path d="M9 17h46M9 55h46" stroke="#2b2b2e" stroke-width="5"/><path d="M9 15.5h46M9 53.5h46" stroke="#8d8d93" stroke-width="1.4"/><ellipse cx="32" cy="36" rx="5" ry="4" fill="#3a1d0e"/><ellipse cx="32" cy="35" rx="3" ry="2.2" fill="#7a2232"/></svg>';

// Ordre conseillé pour la soirée (programme).
export const programme = ['truefalse','barrels','odd','reaction','memory','maths','words','arena','cups','lucky'];

export const games = {
  truefalse: { name: 'Vrai ou faux', icon: '❓', staged: true, unit: 'bonnes réponses',
    how: '10 affirmations, une à la fois, pour tout le monde. Vrai ou faux ? Tu as 8 secondes à chaque fois.',
    goal: '1 point par bonne réponse. Le plus de points gagne.', example: '« Le gamay est le cépage roi du Beaujolais » → Vrai : +1 point.', variants: ['sprint','sudden','double'] },
  barrels: { name: 'Course des tonneaux', icon: BARREL, seconds: 20, unit: 'tapes',
    how: 'Tape sur le tonneau le plus vite possible.',
    goal: 'Le plus de points gagne. 1 tape = 1 point.', example: '46 tapes en 20 s = 46 points.', variants: ['sprint','lights','turbo','double'] },
  odd: { name: 'Trouve l’intrus', icon: '🔍', seconds: 30, unit: 'intrus',
    how: 'Touche la case d’une couleur légèrement différente. Une erreur bloque 0,5 s et te montre la bonne case.',
    goal: '1 point par intrus, +1 tous les 5 d’affilée. Le plus de points gagne.', example: '9 cases rouges, une un peu plus claire : touche-la.', variants: ['sprint','grid44','shuffle','lookalike','double'] },
  reaction: { name: 'Top départ', icon: '🚦', seconds: 24, unit: 'ms',
    how: '3 essais. Attends « Appuie ! » puis touche le plus vite possible. Trop tôt = essai annulé.',
    goal: 'Le meilleur temps des 3 essais gagne.', example: 'Essais : 312 ms, trop tôt, 287 ms → ton temps : 287 ms.', variants: ['orange','double'] },
  memory: { name: 'Mémoire Flash', icon: '🧠', unit: 'fruits',
    how: 'Regarde la suite de fruits, puis reproduis-la dans le même ordre. 6 suites, de 2 à 7 fruits.',
    goal: '1 point par fruit bien placé. Bonus : +1 point de classement au plus rapide parmi ceux qui réussissent tout.', example: '🍇 🍒 🍋 → reproduis 🍇 🍒 🍋 : 3 points.', variants: ['reverse','double'] },
  maths: { name: 'Calcul express', icon: '➗', seconds: 45, unit: 'bonnes réponses',
    how: 'Choisis le bon résultat parmi 4. Une erreur bloque 0,6 s.',
    goal: 'Le plus de bonnes réponses gagne.', example: '23 + 18 = ? → 41.', variants: ['sprint','multiply','chain','streak','double'] },
  words: { name: 'Mot mélangé', icon: '🔤', seconds: 45, unit: 'mots', levels: true,
    how: 'Les lettres sont mélangées : retrouve le mot parmi les 4 propositions.',
    goal: 'Le plus de mots trouvés gagne.', example: 'N I S I R A → RAISIN.', variants: ['sprint','long','holes','streak','double'] },
  arena: { name: 'Bataille royale', icon: '🎯', staged: true, minPlayers: 2, unit: 'tours',
    how: 'En 8 secondes : touche le terrain pour te placer, puis touche une direction pour viser. Tous les tirs partent en même temps et s’arrêtent sur le premier joueur touché.',
    goal: 'Le dernier en vie gagne. Derniers survivants éliminés ensemble = ex æquo.', example: 'Place-toi, vise Jad : s’il ne bouge pas, ton tir l’élimine.', variants: ['shield','shrink','double'] },
  cups: { name: 'Le bonneteau', icon: '🥤', unit: 'séries réussies',
    how: 'Un raisin se cache sous un gobelet. Suis-le pendant le mélange, puis touche le bon gobelet. 10 séries, de plus en plus rapides.',
    goal: 'La série n° 1 vaut 10 points, la n° 10 en vaut 100. À égalité, le plus rapide à répondre gagne.',
    example: 'Séries 1 à 4 réussies = 10 + 20 + 30 + 40 = 100 points.', variants: ['sudden','rotate','quick','double'] },
  lucky: { name: 'Le bon tonneau', icon: '🍀', staged: true, unit: 'points',
    how: 'Choisis un tonneau à chaque tour : la règle change tous les 2 tours. Puis finale de survie : 3 vies, 3 tonneaux sur 9 explosent.',
    goal: 'Le plus de points gagne. Le dernier survivant de la finale gagne +5.', example: 'Tonneau 3 choisi : il cachait 5 points.', variants: ['double'] },
};

export const ruleNames = id => rules[id]?.[0] || id;
export const ruleExample = (game, id) => ruleOverride[`${game}/${id}`]?.[1] ?? rules[id]?.[2] ?? '';
export function ruleText(game, rule) { return ruleOverride[`${game}/${rule}`]?.[0] ?? rules[rule]?.[1] ?? ''; }
// Tirage d'une variante pour la manche suivante (si possible différente de `except`).
export function drawRule(game, except, rnd = Math.random) {
  const all = games[game].variants, pool = all.filter(r => r !== except);
  const list = pool.length ? pool : all;
  return list.length ? list[Math.floor(rnd() * list.length)] : 'classic';
}

// Mémoire Flash : 6 suites de 2 à 7 fruits. Temps en secondes depuis le départ.
export function memoryPlan() {
  const stages = [];
  let t = 0;
  for (let i = 0; i < 6; i++) {
    const len = i + 2;
    const show = 3 + len, answer = 7 + len;   // +2 s pour répondre (décision du 19/11)
    stages.push({ index: i, len, start: t, answerAt: t + show, end: t + show + answer });
    t += show + answer + 2;
  }
  return stages;
}
export const memorySeconds = () => memoryPlan().at(-1).end;

// Top départ : 3 essais de 8 s ; signal entre 1,5 s et 5 s (même instant pour tous, imprévisible).
export const REACTION_TRY = 8000;
export function reactionPlan(roundId, rule) {
  const rnd = seeded(roundId + 'reaction');
  return [0,1,2].map(i => {
    const go = 1500 + Math.floor(rnd() * 3500);
    const fake = rule === 'orange' && rnd() < 0.67 ? go - 900 : null;
    return { start: i * REACTION_TRY, go: i * REACTION_TRY + go, fake: fake === null ? null : i * REACTION_TRY + fake };
  });
}

export function duration(game, rule) {
  if (game === 'memory') return memorySeconds();
  if (game === 'cups') return Math.ceil(cupsTimeline(rule).total / 1000);
  const base = games[game].seconds;
  return rule === 'sprint' ? Math.ceil(base / 2) : base;
}
// Mémoire Flash : total de fruits si toutes les suites sont réussies (2 + 3 + … + 7).
export const MEMORY_MAX = memoryPlan().reduce((s, x) => s + x.len, 0);

// Barème : avec N joueurs classés, N points au 1er, N − 1 au 2e… Un score nul ou absent rapporte 0. ×2 double.
export function pointsFor(rank, participants, multiplier = 1) {
  return Math.max(0, participants - rank + 1) * multiplier;
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

// ---------- Le bonneteau ----------
// Grille de référence (code fourni, validé en test) : [gobelets, échanges, durée d'un échange (s), feintes].
export const CUPS_GRID = [[3,4,.45,0],[3,5,.40,0],[3,7,.36,0],[4,8,.34,0],[4,10,.31,1],[4,11,.29,1],[5,12,.28,1],[5,13,.27,1],[5,18,.22,3],[5,20,.20,3]];
export const CUPS = { lead: 300, lastIntro: 1200, lift: 260, show: 800, feint: .7, rotate: 450, choice: 3000, quick: 1500, reveal: 1300 };
// Minutage de chaque série en ms depuis le départ (identique pour tous, ne dépend pas du hasard).
export function cupsTimeline(rule) {
  let t = 0;
  const series = CUPS_GRID.map(([g, s, d, f], i) => {
    const L = i + 1, t0 = t;
    const tShow = t0 + (L === 10 ? CUPS.lastIntro : CUPS.lead);
    const tMoves = tShow + 2 * CUPS.lift + CUPS.show;
    const ff = Math.min(f, s - 1);
    const tRot = tMoves + Math.round(((s - ff) * d + ff * 2 * CUPS.feint * d) * 1000);
    const tChoice = tRot + (rule === 'rotate' ? CUPS.rotate : 0);
    const tReveal = tChoice + (rule === 'quick' ? CUPS.quick : CUPS.choice);
    t = tReveal + CUPS.reveal;
    return { L, g, s, d, f: ff, t0, tShow, tMoves, tRot, tChoice, tReveal, t1: t };
  });
  return { series, total: t };
}
// Mélanges identiques pour tous, tirés à partir de l'id de la manche.
export function cupsPlan(roundId, rule) {
  return cupsTimeline(rule).series.map(ser => {
    const r = seeded(roundId + 'cups' + ser.L), g = ser.g, ball = Math.floor(r() * g), feints = new Set();
    while (feints.size < ser.f) feints.add(1 + Math.floor(r() * (ser.s - 1)));   // jamais sur le premier échange
    let pos = [...Array(g).keys()], t = ser.tMoves;
    const moves = [];
    for (let k = 0; k < ser.s; k++) {
      let a = Math.floor(r() * g), b;
      if (ser.L <= 3) { b = a + (r() < .5 ? -1 : 1); if (b < 0) b = 1; if (b >= g) b = g - 2; }   // séries 1 à 3 : gobelets voisins
      else { b = Math.floor(r() * (g - 1)); if (b >= a) b++; }
      const fe = feints.has(k), dur = Math.round(ser.d * 1000 * (fe ? 2 * CUPS.feint : 1));
      const ca = pos.indexOf(a), cb = pos.indexOf(b), before = pos.slice();
      if (!fe) { pos[ca] = b; pos[cb] = a; }
      moves.push({ t, dur, ca, cb, a, b, fe, before });
      t += dur;
    }
    const beforeRot = pos.slice();
    if (rule === 'rotate') pos = pos.map(x => (x + 1) % g);
    return { ...ser, ball, moves, beforeRot, final: pos };   // ball = n° du gobelet ; final[gobelet] = emplacement d'arrivée
  });
}
const ease = p => p <= 0 ? 0 : p >= 1 ? 1 : p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
// Emplacement (x, en cases) et hauteur (y, fraction ; négatif = soulevé) de chaque gobelet à l'instant el.
export function cupsPose(ser, el) {
  const g = ser.g, x = [...Array(g).keys()], y = Array(g).fill(0), L = CUPS.lift;
  const up = t0 => el < t0 ? 0 : el < t0 + L ? (el - t0) / L : 1;
  if (el < ser.tMoves) { const a = up(ser.tShow), b = up(ser.tShow + L + CUPS.show); y[ser.ball] = -(ease(a) - ease(b)); return { x, y, ball: a > 0 && b < 1 ? ser.ball : null }; }
  if (el < ser.tRot) {
    const m = ser.moves.find(m => el < m.t + m.dur) || ser.moves.at(-1);
    m.before.forEach((s, c) => { x[c] = s; });
    let p = (el - m.t) / m.dur;
    p = m.fe ? (p < .5 ? ease(p * 2) : 1 - ease((p - .5) * 2)) : ease(p);
    x[m.ca] = m.a + (m.b - m.a) * p; x[m.cb] = m.b + (m.a - m.b) * p;
    const h = Math.sin(Math.PI * p); y[m.ca] = -.27 * h; y[m.cb] = .27 * h;
    return { x, y, ball: null };
  }
  if (el < ser.tChoice) {
    const p = ease((el - ser.tRot) / (ser.tChoice - ser.tRot));
    ser.beforeRot.forEach((s, c) => { if (s === g - 1) { x[c] = p < .5 ? s + p : p - 1; y[c] = -.6 * Math.sin(Math.PI * p); } else x[c] = s + p; });
    return { x, y, ball: null };
  }
  ser.final.forEach((s, c) => { x[c] = s; });
  if (el >= ser.tReveal) y[ser.ball] = -ease(up(ser.tReveal));
  return { x, y, ball: el >= ser.tReveal ? ser.final[ser.ball] : null };
}
