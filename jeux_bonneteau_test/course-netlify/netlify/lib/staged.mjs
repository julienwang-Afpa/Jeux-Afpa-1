// Jeux pilotés par le serveur, tour par tour : Vrai ou faux, Le bon tonneau, Bataille royale.
// Chaque jeu expose begin(round, st, now) et advance(round, picks, now) ; advance renvoie false quand la manche est finie.
// picks : Map pid → choix du joueur pour l'étape en cours (lu dans room/<code>/p/<pid>).
import { randomInt } from 'node:crypto';
import { luckyOrder } from '../../public/games.mjs';
import { beaujolais, general, generalThemes } from './questions.mjs';

const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const add = (round, pid, n) => { round.tally[pid] = (round.tally[pid] || 0) + n; };

// ---------- Vrai ou faux ----------
const TF = { ask: 8000, stats: 3000, answer: 7000, count: 10 };
const bank = [...beaujolais.map((q, i) => ['b' + i, ...q]), ...general.map((q, i) => ['g' + i, ...q])];

const truefalse = {
  begin(round, st, now) {
    st.usedQuestions ||= [];
    const theme = round.rule === 'beaujolais' ? 'beaujolais' : (round.quizTheme || 'mix');
    const pool = bank.filter(q => theme === 'mix' || (theme === 'beaujolais' ? q[0][0] === 'b' : theme === 'general' ? q[0][0] === 'g' : q[0][0] === 'g' && generalThemes[Number(q[0].slice(1))] === theme));
    let fresh = pool.filter(q => !st.usedQuestions.includes(q[0]));
    if (fresh.length < TF.count) { st.usedQuestions = st.usedQuestions.filter(id => !pool.some(q => q[0] === id)); fresh = pool; }
    const picked = shuffle(fresh).slice(0, TF.count);
    st.usedQuestions.push(...picked.map(q => q[0]));
    round.questions = picked.map(([id, text, answer, why]) => ({ id, text, answer, why }));
    round.stage = { step: 0, phase: 'choose', until: round.startAt + TF.ask, total: picked.length };
  },
  advance(round, picks, now) {
    const s = round.stage, q = round.questions[s.step];
    if (s.phase === 'choose') {
      let yes = 0, no = 0;
      for (const [pid, value] of picks) {
        if (value !== true && value !== false) continue;
        value ? yes++ : no++;
        round.played[pid] = true;
        if (value === q.answer) add(round, pid, 1);
      }
      round.stage = { ...s, phase: 'stats', until: now + TF.stats, yes, no };
    } else if (s.phase === 'stats') round.stage = { ...s, phase: 'answer', until: now + TF.answer };
    else {
      if (s.step + 1 >= round.questions.length) return false;
      round.stage = { step: s.step + 1, phase: 'choose', until: now + TF.ask, total: s.total };
    }
    return true;
  },
  // Ce que voit un joueur : jamais la réponse avant la phase « answer ».
  publicStage(round) {
    const s = round.stage, q = round.questions?.[s.step];
    return { ...s, text: q?.text, answer: s.phase === 'answer' ? q.answer : undefined, why: s.phase === 'answer' ? q.why : undefined };
  },
  needsPicks: s => s.phase === 'choose',
};

// ---------- Le bon tonneau ----------
const LK = { pick: 8000, reveal: 5000, finalTurns: 8, lives: 3 };

function luckyOutcome(rule, picks) {
  // Renvoie { values: valeur affichée par tonneau, gains: Map pid → points }.
  const gains = new Map();
  if (rule === 'max') {
    const values = shuffle([0, 1, 2, 3, 5]);
    for (const [pid, i] of picks) gains.set(pid, values[i]);
    return { values, gains };
  }
  if (rule === 'trap' || rule === 'gold') {
    const special = randomInt(5);
    const values = [0,1,2,3,4].map(i => i === special ? (rule === 'trap' ? -2 : 5) : 1);
    for (const [pid, i] of picks) gains.set(pid, values[i]);
    return { values, gains };
  }
  const counts = [0,0,0,0,0,0];
  for (const [, i] of picks) counts[i]++;
  if (rule === 'least') {
    const min = Math.min(...counts.slice(0, 5).filter(c => c > 0));
    const values = counts.slice(0, 5).map(c => c > 0 && c === min ? 3 : 0);
    for (const [pid, i] of picks) gains.set(pid, values[i]);
    return { values, gains, counts: counts.slice(0, 5) };
  }
  if (rule === 'shared') {
    const values = counts.slice(0, 5).map(c => c ? Math.max(1, Math.round(6 / c)) : 6);
    for (const [pid, i] of picks) gains.set(pid, values[i]);
    return { values, gains, counts: counts.slice(0, 5) };
  }
  // Quitte ou double : le tonneau 5 = « je sécurise ».
  const winners = shuffle([0,1,2,3,4]).slice(0, 2);
  const values = [0,1,2,3,4].map(i => winners.includes(i) ? 4 : 0).concat(1);
  for (const [pid, i] of picks) gains.set(pid, values[i]);
  return { values, gains };
}

const lucky = {
  begin(round, st, now) {
    round.stage = { step: 0, phase: 'choose', until: round.startAt + LK.pick, rule: luckyOrder[0], total: luckyOrder.length };
  },
  advance(round, picks, now) {
    const s = round.stage;
    if (s.phase === 'reveal') {
      const next = s.step + 1;
      if (s.rule === 'final') {
        const alive = Object.keys(s.lives).filter(pid => s.lives[pid] > 0);
        if (alive.length <= 1 || s.finalTurn >= LK.finalTurns) return finishFinal(round, s, alive), false;
        round.stage = { ...s, step: next, phase: 'choose', until: now + LK.pick, finalTurn: s.finalTurn + 1, reveal: null };
      } else if (next < luckyOrder.length) {
        round.stage = { step: next, phase: 'choose', until: now + LK.pick, rule: luckyOrder[next], total: s.total };
      } else {
        const lives = Object.fromEntries(round.ids.map(pid => [pid, LK.lives]));
        round.stage = { step: next, phase: 'choose', until: now + LK.pick, rule: 'final', lives, finalTurn: 1, total: s.total };
      }
      return true;
    }
    if (s.rule === 'final') {
      const alive = Object.keys(s.lives).filter(pid => s.lives[pid] > 0);
      const boom = shuffle([0,1,2,3,4,5,6,7,8]).slice(0, 3);
      const lives = { ...s.lives }, chosen = {};
      for (const pid of alive) {
        const value = picks.get(pid);
        const pick = Number.isInteger(value) && value >= 0 && value < 9 ? value : randomInt(9);
        if (Number.isInteger(value)) round.played[pid] = true;
        chosen[pid] = pick;
        if (boom.includes(pick)) lives[pid]--;
      }
      round.stage = { ...s, phase: 'reveal', until: now + LK.reveal, lives, reveal: { boom, chosen, before: alive } };
      return true;
    }
    const valid = new Map([...picks].filter(([, v]) => Number.isInteger(v) && v >= 0 && v < (s.rule === 'gamble' ? 6 : 5)));
    const { values, gains, counts } = luckyOutcome(s.rule, valid);
    for (const [pid, n] of gains) { add(round, pid, n); round.played[pid] = true; }
    round.stage = { ...s, phase: 'reveal', until: now + LK.reveal, reveal: { values, counts, chosen: Object.fromEntries(valid), gains: Object.fromEntries(gains) } };
    return true;
  },
  publicStage: round => round.stage,
  needsPicks: s => s.phase === 'choose',
};

function finishFinal(round, s, alive) {
  // Survivant unique, ou survivants à la limite de tours ; si tous tombent ensemble, ils gagnent ensemble.
  const winners = alive.length ? alive : s.reveal.before;
  for (const pid of winners) add(round, pid, 5);
  round.finalWinners = winners;
}

// ---------- Bataille royale ----------
// Terrain : disque de rayon `zone` (1 au départ) ; coordonnées entre −1 et 1.
const AR = { plan: 6000, reveal: 8000, hit: 0.08 };

function randomSpot(zone) {
  const r = Math.sqrt(randomInt(1000) / 1000) * zone * 0.9, a = randomInt(3600) / 3600 * Math.PI * 2;
  return [r * Math.cos(a), r * Math.sin(a)];
}
function clampToZone([x, y], zone) {
  const d = Math.hypot(x, y);
  return d <= zone ? [x, y] : [x / d * zone, y / d * zone];
}

export function resolveShots(shots, hit) {
  // Chaque tir part du tireur et s'arrête sur la première cible dont il frôle le disque (rayon `hit`).
  const hits = new Map();
  for (const shot of shots) {
    const dx = Math.cos(shot.angle), dy = Math.sin(shot.angle);
    let best = null;
    for (const target of shots) {
      if (target.pid === shot.pid) continue;
      const tx = target.pos[0] - shot.pos[0], ty = target.pos[1] - shot.pos[1];
      const along = tx * dx + ty * dy;
      if (along <= 0) continue;
      const side = Math.abs(tx * dy - ty * dx);
      if (side <= hit && (!best || along < best.along)) best = { pid: target.pid, along };
    }
    shot.target = best?.pid || null;
    shot.length = best ? best.along : 2.4;
    if (best) hits.set(best.pid, (hits.get(best.pid) || 0) + 1);
  }
  return hits;
}

const arena = {
  begin(round, st, now) {
    round.stage = { step: 0, turn: 1, phase: 'choose', until: round.startAt + AR.plan, zone: 1, hit: AR.hit, quiet: 0,
      survivors: [...round.ids], eliminated: {}, shields: round.rule === 'shield' ? [...round.ids] : [] };
  },
  advance(round, picks, now) {
    const s = round.stage;
    if (s.phase === 'reveal') {
      if (s.survivors.length <= 1) return false;
      round.stage = { ...s, step: s.step + 1, turn: s.turn + 1, phase: 'choose', until: now + AR.plan, zone: s.nextZone, hit: s.nextHit, reveal: null };
      return true;
    }
    const shots = s.survivors.map(pid => {
      const v = picks.get(pid) || {};
      const valid = Array.isArray(v.pos) && v.pos.length === 2 && v.pos.every(Number.isFinite);
      if (valid || Number.isFinite(v.angle)) round.played[pid] = true;
      const pos = clampToZone(valid ? v.pos : randomSpot(s.zone), s.zone);
      const angle = Number.isFinite(v.angle) ? v.angle : randomInt(3600) / 3600 * Math.PI * 2;
      return { pid, pos: pos.map(n => Math.round(n * 1000) / 1000), angle: Math.round(angle * 1000) / 1000, auto: !valid };
    });
    const hits = resolveShots(shots, s.hit);
    const blocked = [...hits.keys()].filter(pid => s.shields.includes(pid));
    const lost = [...hits.keys()].filter(pid => !s.shields.includes(pid));
    const quiet = lost.length ? 0 : s.quiet + 1;
    const shrink = s.zone > 0.45;
    round.stage = {
      ...s, phase: 'reveal', until: now + AR.reveal, quiet: shrink ? 0 : quiet,
      survivors: s.survivors.filter(pid => !lost.includes(pid)),
      shields: s.shields.filter(pid => !hits.has(pid)),
      eliminated: { ...s.eliminated, ...Object.fromEntries(lost.map(pid => [pid, s.turn])) },
      nextZone: shrink ? Math.max(0.45, Math.round(s.zone * 0.8 * 100) / 100) : s.zone,
      nextHit: shrink ? Math.min(0.14, s.hit + 0.015) : s.hit,
      reveal: { shots, lost, blocked, shrink },
    };
    return true;
  },
  publicStage: round => round.stage,
  needsPicks: s => s.phase === 'choose',
};

// Score de la Bataille : tour d'élimination ; les survivants ont le tour final + 1 (ex æquo possibles).
export function arenaScores(round) {
  const s = round.stage;
  return Object.fromEntries(round.ids.map(pid => [pid, s.eliminated[pid] ?? s.turn + 1]));
}

export const staged = { truefalse, lucky, arena };
