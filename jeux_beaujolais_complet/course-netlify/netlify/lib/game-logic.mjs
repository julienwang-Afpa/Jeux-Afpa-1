import { randomBytes, timingSafeEqual } from 'node:crypto';
import { colors, duration, games, pointsFor } from '../../public/games.mjs';
import { staged, arenaScores } from './staged.mjs';

const COUNTDOWN = 8000;   // décompte avant chaque manche : le temps de relire la règle
const GRACE = 2500;       // délai pour recevoir les derniers scores
const MAX_PLAYERS = 40;

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const fail = (status, error) => json(status, { error });
const validToken = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const matches = (a, b) => validToken(a) && validToken(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const read = (store, key) => store.getWithMetadata(key, { type: 'json' });
const save = (store, key, entry, data) => store.setJSON(key, data, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
const identity = ({ pid, name, color }) => ({ pid, name, color });
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// ---------- Vue envoyée aux navigateurs ----------
function publicRound(round) {
  if (!round) return null;
  const { questions, ...rest } = round;
  if (round.stage && staged[round.game]) rest.stage = staged[round.game].publicStage(round);
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
    series: st.series, pending: st.pending, totals: st.totals,
    history: (st.history || []).map(h => isHost ? h : {...h, results: h.results.filter(r => r.pid === pid)}).filter(h => isHost || h.results.length),
    round: st.round && { ...publicRound(st.round), playing: Boolean(pid && st.round.ids.includes(pid)) },
    revision: isHost ? st.revision || 0 : undefined,
  };
}

// ---------- Classement d'une manche ----------
export function rankRound(round, roster, players) {
  const subs = new Map(players.filter(p => p?.score?.round === round.id).map(p => [p.pid, p.score]));
  const arena = round.game === 'arena' ? arenaScores(round) : null;
  const entries = round.ids.filter(pid => roster[pid]).map(pid => {
    const base = identity(roster[pid]);
    if (arena) return { ...base, score: arena[pid], raw: arena[pid], played: true };
    if (staged[round.game]) {
      const score = round.tally[pid] || 0;
      return { ...base, score, raw: score, played: Boolean(round.played[pid]) };
    }
    const sub = subs.get(pid);
    return { ...base, score: sub?.score ?? 0, raw: sub?.raw ?? 0, tb: sub?.tb, played: Boolean(sub) };
  });
  const tb = e => e.tb ?? Infinity;
  const players_ = entries.filter(e => e.played).sort((a, b) => b.score - a.score || tb(a) - tb(b));
  const absent = entries.filter(e => !e.played);
  const multiplier = round.rule === 'double' ? 2 : 1;
  players_.forEach((e, i) => {
    const prev = players_[i - 1];
    e.rank = prev && prev.score === e.score && tb(prev) === tb(e) ? prev.rank : i + 1;
    e.points = pointsFor(e.rank, players_.length, multiplier);
  });
  absent.forEach(e => { e.rank = null; e.points = 0; });
  return [...players_, ...absent];
}

function complete(st, players) {
  const round = st.round;
  round.results = rankRound(round, st.roster, players);
  round.before = { ...st.totals };
  if (!round.practice) {
    for (const r of round.results) st.totals[r.pid] = (st.totals[r.pid] || 0) + r.points;
    st.series.played++;
  }
  round.endedAt = Date.now();
  if (!round.practice) {
    const history = st.history ||= [];
    if (!history.some(h => h.id === round.id)) history.push({id:round.id, game:round.game, rule:round.rule, index:round.index, total:round.total, endedAt:round.endedAt, results:round.results.map(r=>({...r,total:st.totals[r.pid] || 0}))});
    if (history.length > 100) history.splice(0,history.length-100);
  }
  st.pending = st.series.played < st.series.total ? { rule: 'classic', practice: false } : null;
}

const readPlayers = (store, room, ids) => Promise.all(ids.map(id => store.get(`room/${room}/p/${id}`, { type: 'json' })));
// Robots générés au moment des interrogations de l’animateur ; aucun processus permanent.
function botScore(round, bot, now) {
  const t = Math.max(0, Math.min((now-round.startAt)/1000,(round.endAt-round.startAt)/1000));
  const k = bot.botSkill || 1; let raw, score, tb;
  if (round.game === 'reaction') { raw=Math.round(280+130/k); score=10000-raw; tb=raw; }
  else if (round.game === 'memory') { raw=Math.min(27,Math.floor(t/7*k)); score=raw; }
  else { let speed=round.game==='barrels'?5*k:round.game==='odd'?0.8*k:0.4*k; raw=Math.floor(t*speed); score=raw; }
  return {pid:bot.pid,score:{round:round.id,raw,score,tb}};
}
function botPick(round, bot) {
  const n = parseInt(bot.pid.slice(0,8),16), s=round.stage;
  if(round.game==='truefalse') return (n+s.step)%2===0;
  if(round.game==='lucky') return (n+s.step)%(s.rule==='final'?9:s.rule==='gamble'?6:5);
  if(round.game==='arena') {let angle=((n%6283)/1000)-3.1415, a=angle+s.step*1.7, d=s.zone*0.65; return {pos:[Math.cos(a)*d,Math.sin(a)*d],angle};}
  return null;
}
function addBotsToDocs(st,round,docs,now) {
  return docs.concat(round.ids.filter(id=>st.roster[id]?.botSkill).map(id=>botScore(round,st.roster[id],now)));
}


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
      if (Object.keys(st.roster).length >= MAX_PLAYERS) return fail(409, 'La partie est complète.');
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
            const docs = await readPlayers(store, room, round.ids);
            picks = new Map(docs.filter(d => d?.pick?.round === round.id && d.pick.step === round.stage.step).map(d => [d.pid, d.pick.value]));
            for (const id of round.ids) if (st.roster[id]?.botSkill) { const value=botPick(round,st.roster[id]); if(value!==null) picks.set(id,value); }
          }
          if (!game.advance(round, picks, now)) complete(st, []);
        } else if (active && !game && now >= round.endAt + GRACE) {
          complete(st, addBotsToDocs(st,round,await readPlayers(store, room, round.ids),now));
        } else {
          const result = view(st, now, null, true);
          if (active && !game && now >= round.startAt) {
            // Progression en direct pour le projecteur (lecture seule, aucune écriture).
            const docs = addBotsToDocs(st,round,await readPlayers(store, room, round.ids),now);
            result.live = Object.fromEntries(docs.filter(d => d?.score?.round === round.id).map(d => [d.pid, d.score.score]));
          }
          return json(200, result);
        }
      } else if (action === 'add-bots') {
        if (active) return fail(409, 'Attends la fin de la manche pour ajouter les robots.');
        const existing = Object.values(st.roster).filter(p => p.botSkill).length;
        if (existing >= 3) return fail(409, 'Les trois robots sont déjà dans la partie.');
        if (Object.keys(st.roster).length + (3-existing) > MAX_PLAYERS) return fail(409, 'Pas assez de places disponibles.');
        const labels=['Robot Raisin','Robot Gamay','Robot Tonneau'];
        for(let i=existing;i<3;i++){let pid=randomBytes(16).toString('hex');st.roster[pid]={pid,name:'🤖 '+labels[i],color:colors[(i*3+2)%colors.length],token:randomBytes(16).toString('hex'),botSkill:[1,.85,.7][i]};}
      } else if (action === 'series') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!Object.hasOwn(games, body.game) || !isInt(body.total, 1, 5)) return fail(400, 'Série invalide.');
        st.series = { game: body.game, total: body.total, played: 0 };
        st.pending = { rule: 'classic', practice: false };
      } else if (action === 'change-game') {
        if (active) return fail(409, 'Attends la fin de la manche pour changer de jeu.');
        st.series = null; st.pending = null;
      } else if (action === 'rule') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        if (body.rule !== 'classic' && !games[series.game].variants.includes(body.rule)) return fail(400, 'Variante inconnue.');
        st.pending.rule = body.rule;
      } else if (action === 'practice') {
        if (active || !st.pending) return fail(409, 'Aucune manche en préparation.');
        st.pending.practice = Boolean(body.on);
      } else if (action === 'start') {
        const ids = Object.keys(st.roster);
        if (active || !st.pending || !ids.length) return fail(409, 'Il faut une manche préparée et au moins un joueur.');
        const { game } = series;
        if (ids.length < (games[game].minPlayers || 1)) return fail(409, `${games[game].name} demande au moins ${games[game].minPlayers} joueurs.`);
        const startAt = now + COUNTDOWN;
        st.round = {
          id: randomBytes(8).toString('hex'), game, rule: st.pending.rule, practice: st.pending.practice,
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
        st.totals = {}; st.history = []; st.series = null; st.pending = null; st.round = null;
      } else if (action === 'remove') {
        if (active) return fail(409, 'Attends la fin de la manche.');
        if (!st.roster[body.player]) return fail(404, 'Joueur introuvable.');
        delete st.roster[body.player];
      } else return fail(404, 'Commande inconnue.');
      st.revision = (st.revision || 0) + 1;
    } else return fail(404, 'Commande inconnue.');

    if ((await save(store, key, entry, st)).modified) return json(200, view(st, now, pid, isHost));
  }
  return fail(503, 'Plusieurs actions simultanées. Réessaie.');
}
