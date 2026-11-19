import { randomBytes, timingSafeEqual } from 'node:crypto';
import { colors, duration, games, pointsFor, drawRule, themes, levels, TF_COUNT, MEMORY_MAX, seeded, cupsTimeline } from '../../public/games.mjs';
import { staged, arenaScores, bankFor } from './staged.mjs';

const COUNTDOWN = 6000;   // décompte avant chaque manche : la règle est rappelée pendant ce temps
const GRACE = 2500;       // délai pour recevoir les derniers scores
// Pas de limite fixe de joueurs : voir GUIDE.md pour les limites pratiques observées.

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const fail = (status, error) => json(status, { error });
const validToken = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const matches = (a, b) => validToken(a) && validToken(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const read = (store, key) => store.getWithMetadata(key, { type: 'json' });
const save = (store, key, entry, data) => store.setJSON(key, data, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
const identity = ({ pid, name, color, bot }) => (bot ? { pid, name, color, bot: true } : { pid, name, color });
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

const THEME_COUNTS = Object.fromEntries(Object.keys(themes).map(t => [t, bankFor(t).length]));

// ---------- Vue envoyée aux navigateurs ----------
function publicRound(round) {
  if (!round) return null;
  const { questions, ...rest } = round;
  // len : durée de la phase en cours, pour que les barres de temps soient justes sur tous les écrans.
  if (round.stage && staged[round.game]) rest.stage = { ...staged[round.game].publicStage(round), len: staged[round.game].stageLength(round.stage, round.rule) };
  // Vrai ou faux : les points ne bougent qu'au moment de la réponse, pour ne pas la trahir.
  if (round.game === 'truefalse' && !round.results && round.stage?.phase !== 'answer') rest.tally = round.shownTally || {};
  if (round.game === 'truefalse' && round.stage?.phase === 'answer') rest.tally = round.tally;
  return rest;
}

function view(st, now, pid, isHost) {
  return {
    now,
    players: Object.values(st.roster).map(identity),
    joined: Boolean(pid && st.roster[pid]),
    series: st.series, pending: st.pending, totals: st.totals, byGame: st.byGame || {},
    round: st.round && { ...publicRound(st.round), playing: Boolean(pid && st.round.ids.includes(pid)) },
    revision: isHost ? st.revision || 0 : undefined,
    themeCounts: isHost ? THEME_COUNTS : undefined,
  };
}

// ---------- Robots de test ----------
// Les robots ne simulent pas de téléphone : le serveur leur invente un résultat plausible (jeux individuels)
// ou un choix (jeux pilotés). Ils servent à remplir les classements et à tester l'enchaînement des écrans.
export function botScore(round, pid) {
  const r = seeded(round.id + pid), between = (a, b) => a + Math.floor(r() * (b - a + 1));
  const factor = round.rule === 'sprint' ? 0.5 : 1;
  switch (round.game) {
    case 'barrels': { const raw = Math.round(between(55, 125) * factor * (round.rule === 'lights' ? 1.3 : 1)); return { raw, score: round.rule === 'lights' ? raw - between(0, 12) : raw + (round.rule === 'turbo' ? between(5, 20) : 0) }; }
    case 'odd': { const raw = Math.round(between(8, 32) * factor); return { raw, score: raw + Math.floor(raw / 5) }; }
    case 'reaction': { const raw = between(230, 480); return { raw, score: 10000 - raw, tb: raw }; }
    case 'memory': { const raw = r() < 0.25 ? MEMORY_MAX : between(10, MEMORY_MAX - 1); return { raw, score: raw, tb: between(25000, 60000) }; }
    case 'maths': case 'words': { const raw = Math.round(between(6, 24) * factor); return { raw, score: raw }; }
    case 'cups': {
      let raw = 0, score = 0, tb = 0;
      for (let L = 1; L <= 10; L++) if (r() < 0.95 - L * 0.07) { raw++; score += 10 * L; tb += between(500, 2200); } else if (round.rule === 'sudden') break;
      return { raw, score, tb };
    }
    default: return { raw: 0, score: 0 };
  }
}
export function botPick(round, pid) {
  const s = round.stage, r = seeded(round.id + pid + s.step);
  if (round.game === 'truefalse') { const q = round.questions[s.step]; return r() < 0.7 ? q.answer : !q.answer; }
  if (round.game === 'lucky') return Math.floor(r() * (s.rule === 'final' ? 9 : s.rule === 'gamble' ? 6 : 5));
  return undefined;   // Bataille royale : le serveur place et vise au hasard les joueurs sans choix
}

// ---------- Classement d'une manche ----------
// N joueurs classés : N points au 1er, N − 1 au 2e… ; égalité = même rang et mêmes points ; score nul ou absent = 0 ; ×2 double.
export function rankRound(round, roster, players) {
  const subs = new Map(players.filter(p => p?.score?.round === round.id).map(p => [p.pid, p.score]));
  for (const pid of round.ids) if (roster[pid]?.bot && !staged[round.game]) subs.set(pid, { round: round.id, ...botScore(round, pid) });
  const arena = round.game === 'arena' ? arenaScores(round) : null;
  const entries = round.ids.filter(pid => roster[pid]).map(pid => {
    const base = identity(roster[pid]);
    if (arena) return { ...base, score: arena[pid], raw: arena[pid], played: true };
    if (staged[round.game]) {
      const score = round.tally[pid] || 0;
      return { ...base, score, raw: score, played: Boolean(round.played[pid]) || Boolean(roster[pid].bot) };
    }
    const sub = subs.get(pid);
    return { ...base, score: sub?.score ?? 0, raw: sub?.raw ?? 0, tb: sub?.tb, played: Boolean(sub) };
  });
  // Le temps (tb) ne départage que les jeux où il compte : Mémoire Flash et bonneteau.
  const usesTb = round.game === 'memory' || round.game === 'cups';
  const tb = e => usesTb ? (e.tb ?? Infinity) : 0;
  const ranked = entries.filter(e => e.played).sort((a, b) => b.score - a.score || tb(a) - tb(b));
  const absent = entries.filter(e => !e.played);
  const multiplier = round.rule === 'double' ? 2 : 1;
  ranked.forEach((e, i) => {
    const prev = ranked[i - 1];
    e.rank = prev && prev.score === e.score && tb(prev) === tb(e) ? prev.rank : i + 1;
    e.points = e.score > 0 ? pointsFor(e.rank, ranked.length, multiplier) : 0;
  });
  // Mémoire Flash : +1 point de classement au plus rapide parmi ceux qui ont tout réussi.
  if (round.game === 'memory') {
    const perfect = ranked.filter(e => e.raw >= MEMORY_MAX && Number.isFinite(e.tb));
    if (perfect.length) { const best = Math.min(...perfect.map(e => e.tb)); for (const e of perfect.filter(e => e.tb === best)) { e.bonus = 1; e.points += 1; } }
  }
  absent.forEach(e => { e.rank = null; e.points = 0; });
  return [...ranked, ...absent];
}

function complete(st, players) {
  const round = st.round;
  round.results = rankRound(round, st.roster, players);
  round.before = { ...st.totals };
  st.byGame ||= {};
  round.beforeGame = { ...(st.byGame[round.game] || {}) };
  if (!round.practice) {
    const board = st.byGame[round.game] ||= {};
    for (const r of round.results) {
      st.totals[r.pid] = (st.totals[r.pid] || 0) + r.points;
      board[r.pid] = (board[r.pid] || 0) + r.points;
    }
    st.series.played++;
  }
  round.endedAt = Date.now();
  // Manche suivante : la 1re est classique, les suivantes reçoivent une variante tirée au sort (modifiable).
  const next = st.series.played < st.series.total;
  st.pending = next ? { rule: st.series.played === 0 ? 'classic' : drawRule(round.game, round.rule), practice: false, theme: round.theme || 'all', level: round.level || 'easy' } : null;
}

// Les robots n'ont pas de document joueur : on ne lit que les vrais joueurs.
const readPlayersOf = (store, room, st, ids) => Promise.all(ids.filter(id => !st.roster[id]?.bot).map(id => store.get(`room/${room}/p/${id}`, { type: 'json' })));

// ---------- Point d'entrée ----------
export async function handle(req, store) {
  const path = new URL(req.url).pathname.replace(/^\/api\//, '');
  if (req.method !== 'POST') return fail(405, 'Requête POST requise.');
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return fail(413, 'Requête trop longue.');
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'Requête invalide.');
  }
  if (!body || !validToken(body.token)) return fail(400, 'Session invalide.');

  if (path === 'create') {
    for (let attempt = 0; attempt < 8; attempt++) {
      const room = randomBytes(4).toString('hex').slice(0, 5);
      const state = { host: body.token, roster: {}, series: null, round: null, pending: null, totals: {}, revision: 0 };
      if ((await save(store, `room/${room}/state`, null, state)).modified) return json(200, { room });
    }
    return fail(503, 'Réessaie de créer la partie.');
  }

  const { room, pid, token } = body;
  if (typeof room !== 'string' || !/^[a-f0-9]{5}$/.test(room)) return fail(400, 'Code de partie invalide.');
  const key = `room/${room}/state`;
  const playerKey = id => `room/${room}/p/${id}`;

  for (let attempt = 0; attempt < 25; attempt++) {
    const entry = await read(store, key);
    const st = entry?.data;
    if (!st?.roster) return fail(404, 'Partie introuvable. Vérifie le code affiché.');
    const now = Date.now();
    const isHost = path === 'host' && matches(token, st.host);
    if (path === 'host' && !isHost) return fail(403, 'Session animateur invalide.');
    if (!isHost && !validToken(pid)) return fail(400, 'Identifiant joueur invalide.');
    const player = st.roster[pid];
    if (player && !matches(token, player.token)) return fail(403, 'Session joueur invalide.');
    const round = st.round;
    const active = round && !round.results;

    if (path === 'join') {
      if (player) return json(200, view(st, now, pid, false));
      const name = String(body.name ?? '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 16);
      if (!name || !colors.includes(body.color)) return fail(400, 'Indique un prénom et une couleur.');
      if (Object.values(st.roster).some(p => p.name.toLowerCase() === name.toLowerCase())) return fail(409, 'Ce prénom est déjà pris : ajoute une initiale.');
      st.roster[pid] = { pid, name, color: body.color, token };
    } else if (path === 'player') {
      const mine = player ? (await store.get(playerKey(pid), { type: 'json' })) : null;
      return json(200, { ...view(st, now, pid, false), mine });
    } else if (path === 'score' || path === 'pick') {
      if (!player || !active || body.round !== round.id || !round.ids.includes(pid) || now < round.startAt) {
        return fail(409, 'Cette action ne correspond plus à la manche.');
      }
      const previous = await read(store, playerKey(pid));
      const own = previous?.data || { pid };
      if (path === 'score') {
        if (round.stage || now > round.endAt + GRACE) return fail(409, 'Les scores sont clos.');
        const { seq, raw, score, tb } = body;
        if (!Number.isSafeInteger(seq) || seq < 1 || !isInt(raw, 0, 100000) || !isInt(score, -1000, 100000) ||
          (tb !== undefined && tb !== null && !isInt(tb, 0, 600000))) return fail(400, 'Score invalide.');
        if (own.score?.round === round.id && own.score.seq >= seq) return json(200, { accepted: own.score.seq });
        own.score = { round: round.id, seq, raw, score, tb: tb ?? undefined };
      } else {
        const s = round.stage;
        if (!s || s.phase !== 'choose' || body.step !== s.step || now > s.until + 400) return fail(409, 'Ce choix est clos.');
        if (round.game === 'arena' && !s.survivors.includes(pid)) return fail(409, 'Tu es éliminé pour cette manche.');
        if (round.game === 'lucky' && s.rule === 'final' && !(s.lives[pid] > 0)) return fail(409, 'Tu n’as plus de vie.');
        const v = body.value;
        let value;
        if (round.game === 'truefalse') {
          if (typeof v !== 'boolean') return fail(400, 'Réponse invalide.');
          value = v;
        } else if (round.game === 'lucky') {
          if (!isInt(v, 0, s.rule === 'final' ? 8 : s.rule === 'gamble' ? 5 : 4)) return fail(400, 'Tonneau invalide.');
          value = v;
        } else {
          const keep = own.pick?.round === round.id && own.pick.step === s.step ? own.pick.value : {};
          value = { ...keep };
          if (v?.pos !== undefined) {
            if (!Array.isArray(v.pos) || v.pos.length !== 2 || !v.pos.every(n => Number.isFinite(n) && Math.abs(n) <= 1.01)) return fail(400, 'Position invalide.');
            value.pos = v.pos;
          }
          if (v?.angle !== undefined) {
            if (!Number.isFinite(v.angle) || Math.abs(v.angle) > 7) return fail(400, 'Visée invalide.');
            value.angle = v.angle;
          }
        }
        own.pick = { round: round.id, step: s.step, value };
      }
      if ((await save(store, playerKey(pid), previous, own)).modified) return json(200, { accepted: own.score?.seq ?? true });
      continue;
    } else if (isHost) {
      const series = st.series;
      const action = body.action || 'poll';
      if (action !== 'poll' && body.revision !== (st.revision || 0)) return fail(409, 'L’état de la partie a changé, réessaie.');
      if (action === 'poll') {
        const game = active && staged[round.game];
        if (game && now >= round.startAt && now >= round.stage.until) {
          let picks = new Map();
          if (game.needsPicks(round.stage)) {
            const docs = await readPlayersOf(store, room, st, round.ids);
            picks = new Map(docs.filter(d => d?.pick?.round === round.id && d.pick.step === round.stage.step).map(d => [d.pid, d.pick.value]));
            for (const pid of round.ids) if (st.roster[pid]?.bot && !picks.has(pid)) { const v = botPick(round, pid); if (v !== undefined) picks.set(pid, v); }
          }
          if (!game.advance(round, picks, now)) complete(st, []);
        } else if (active && !game && now >= round.endAt + GRACE) {
          complete(st, await readPlayersOf(store, room, st, round.ids));
        } else {
          const result = view(st, now, null, true);
          if (active && !game && now >= round.startAt) {
            // Progression en direct pour le projecteur (lecture seule, aucune écriture).
            const docs = await readPlayersOf(store, room, st, round.ids);
            result.live = Object.fromEntries(docs.filter(d => d?.score?.round === round.id).map(d => [d.pid, d.score.score]));
          }
          return json(200, result);
        }
      } else if (action === 'series') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!Object.hasOwn(games, body.game) || !isInt(body.total, 1, 5)) return fail(400, 'Série invalide.');
        st.series = { game: body.game, total: body.total, played: 0 };
        st.pending = { rule: 'classic', practice: false, theme: 'all', level: 'easy' };
      } else if (action === 'change-game') {
        if (active) return fail(409, 'Attends la fin de la manche pour changer de jeu.');
        st.series = null; st.pending = null;
      } else if (action === 'rule' || action === 'reroll') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        if (action === 'reroll') {
          if (!series.played) return fail(409, 'La première manche se joue toujours en règles classiques.');
          st.pending.rule = drawRule(series.game, st.pending.rule);
        } else {
          if (body.rule !== 'classic' && (!series.played || !games[series.game].variants.includes(body.rule))) return fail(400, 'Variante indisponible.');
          st.pending.rule = body.rule;
        }
      } else if (action === 'theme') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        if (!Object.hasOwn(themes, body.theme)) return fail(400, 'Thème inconnu.');
        st.pending.theme = body.theme;
      } else if (action === 'level') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        if (!Object.hasOwn(levels, body.level)) return fail(400, 'Niveau inconnu.');
        st.pending.level = body.level;
      } else if (action === 'cancel') {
        // Annuler et rejouer : la manche disparaît sans aucun point, la même règle est reproposée.
        if (!active) return fail(409, 'Aucune manche en cours.');
        st.pending = { rule: round.rule, practice: round.practice, theme: round.theme || 'all', level: round.level || 'easy' };
        st.round = null;
      } else if (action === 'bots') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!isInt(body.count, 1, 500)) return fail(400, 'Nombre de robots invalide.');
        let n = Object.values(st.roster).filter(p => p.bot).reduce((m, p) => Math.max(m, Number(p.name.replace(/\D/g, '')) || 0), 0);
        const used = Object.values(st.roster).map(p => p.color);
        for (let i = 0; i < body.count; i++) {
          n++;
          const free = colors.filter(c => !used.includes(c)), color = (free.length ? free : colors)[n % (free.length || colors.length)];
          used.push(color);
          const pid = randomBytes(16).toString('hex');
          st.roster[pid] = { pid, name: `🤖 Robot ${n}`, color, token: randomBytes(16).toString('hex'), bot: true };
        }
      } else if (action === 'unbots') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        for (const p of Object.values(st.roster).filter(p => p.bot)) {
          delete st.roster[p.pid]; delete st.totals[p.pid];
          for (const board of Object.values(st.byGame || {})) delete board[p.pid];
        }
      } else if (action === 'practice') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        st.pending.practice = Boolean(body.on);
      } else if (action === 'start') {
        const ids = Object.keys(st.roster);
        if (active || !st.pending || !ids.length) return fail(409, 'Il faut une manche préparée et au moins un joueur.');
        const { game } = series;
        if (ids.length < (games[game].minPlayers || 1)) return fail(409, `${games[game].name} demande au moins ${games[game].minPlayers} joueurs.`);
        if (game === 'truefalse') {
          const n = bankFor(st.pending.theme).length;
          if (n < TF_COUNT) return fail(409, `Le thème « ${themes[st.pending.theme]} » ne contient que ${n} questions (il en faut ${TF_COUNT}). Choisis un autre thème ou « Tous les thèmes ».`);
        }
        const startAt = now + COUNTDOWN;
        st.round = {
          id: randomBytes(8).toString('hex'), game, rule: st.pending.rule, practice: st.pending.practice,
          theme: game === 'truefalse' ? st.pending.theme || 'all' : undefined, level: game === 'words' ? st.pending.level || 'easy' : undefined,
          index: series.played + 1, total: series.total, ids, startAt,
          endAt: staged[game] ? null : startAt + duration(game, st.pending.rule) * 1000,
          tally: {}, played: {},
        };
        if (staged[game]) staged[game].begin(st.round, st, now);
        st.pending = null;
      } else if (action === 'end') {
        if (!active || now < round.startAt) return fail(409, 'Cette manche ne peut pas être arrêtée.');
        if (staged[round.game]) complete(st, []);
        else if (now < round.endAt) round.endAt = now;
        else return fail(409, 'La manche se termine déjà.');
      } else if (action === 'reset') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (body.code !== room) return fail(400, 'Tape le code de la partie pour confirmer.');
        st.totals = {}; st.byGame = {}; st.series = null; st.pending = null; st.round = null;
      } else if (action === 'remove') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!st.roster[body.player]) return fail(404, 'Joueur introuvable.');
        delete st.roster[body.player];
        delete st.totals[body.player];
        for (const board of Object.values(st.byGame || {})) delete board[body.player];
      } else return fail(404, 'Commande inconnue.');
      st.revision = (st.revision || 0) + 1;
    } else return fail(404, 'Commande inconnue.');

    if ((await save(store, key, entry, st)).modified) return json(200, view(st, now, pid, isHost));
  }
  return fail(503, 'Plusieurs actions simultanées. Réessaie.');
}
