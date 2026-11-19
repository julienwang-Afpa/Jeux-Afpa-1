import { bonnetFrame, bonnetHTML } from './bonneteau.mjs';
// Écran animateur : mode salon (admin) entre les manches, mode spectacle pendant les manches.
import { S, api, $, esc, show, status, now, storage, resetScreen, plural } from './core.mjs';
import { games, programme, rules, quizThemes, ruleNames, ruleText, standings, memoryStageAt, memorySequence, memoryPlan, reactionPlan, REACTION_TRY, isRed } from './games.mjs';
import { chip, ruleCard, timer, setTimer, podium, standingsHTML, animateStandings, confetti } from './ui.mjs';
import { arenaSVG, arenaSummary, barrelsHTML, luckyTitle, livesHTML } from './boards.mjs';

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
let ui = storage.load('beaujolais.host.ui.v3') || {};
const saveUi = () => storage.save('beaujolais.host.ui.v3', ui);
let resultSlide = 'podium', resultTimer = null;

export const joinUrl = () => { const u = new URL(location.pathname, location.origin); u.searchParams.set('r', S.session.room); return u.href; };
function qr(el, size = 6) {
  if (!el || !window.qrcode) return;
  const q = qrcode(0, 'M');
  q.addData(joinUrl());
  q.make();
  el.innerHTML = q.createSvgTag({ cellSize: size, margin: 2, scalable: true });
}

async function command(action, args = {}) {
  if (S.busy) return;
  S.busy = true;
  try {
    S.state = await api('host', { action, revision: S.state.revision, ...args });
    resetScreen();
    renderHost();
  } catch (e) {
    status(e.status === 409 && /changé/.test(e.message) ? 'L’écran se met à jour, refais ton choix.' : e.message, 'error');
  } finally { S.busy = false; }
}

// ---------- Aiguillage ----------
export function renderHost() {
  const st = S.state;
  if (!st) return;
  if (ui.room !== S.session.room) { ui = { room: S.session.room, done: [], total: 1 }; saveUi(); }
  const round = st.round;
  document.body.classList.toggle('spectacle', Boolean(round && (!round.results || ui.dismissed !== round.id)));
  if (round?.results && !round.practice && !ui.done.includes(round.game)) { ui.done.push(round.game); saveUi(); }
  if (round && !round.results) return spectacle(st, round);
  if (round?.results && ui.dismissed !== round.id) return results(st, round);
  admin(st);
}

// ---------- Mode spectacle ----------
function hostPhase(round) {
  const t = now();
  if (t < round.startAt) return 'count';
  if (round.stage) return `s${round.stage.step}-${round.stage.phase}`;
  if (t >= round.endAt) return 'grace';
  if (round.game === 'memory') { const m = memoryStageAt(t - round.startAt); return m ? `m${m.index}-${m.phase}` : 'grace'; }
  return 'play';
}

function topBar(round) {
  const g = games[round.game];
  return `<header class="stage-top">
    <span class="icon" aria-hidden="true">${g.icon}</span><h1>${esc(g.name)}</h1>
    ${round.rule !== 'classic' ? `<span class="badge gold">${esc(ruleNames(round.rule))}</span>` : ''}
    <span class="round-no">${round.practice ? 'Manche d’essai' : `Manche ${round.index} / ${round.total}`}</span>
  </header>`;
}

function hostBar(round, { canEnd = true, extra = '' } = {}) {
  return `<footer class="host-bar">
    ${canEnd ? '<button class="ghost" id="end">■ Terminer la manche</button>' : ''}${extra}
    <button class="ghost" id="fs">⛶ Plein écran</button>
    <span class="join-mini"><span>Rejoindre</span><b class="code">${esc(S.session.room)}</b><span class="qr-mini" id="qr-mini"></span></span>
  </footer>`;
}

function bindBar(round) {
  qr($('qr-mini'), 3);
  if ($('fs')) $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {});
  if ($('end')) $('end').onclick = () => {
    const msg = games[round.game].staged
      ? 'Terminer la manche maintenant ? Les points déjà gagnés sont gardés.'
      : 'Terminer la manche maintenant ? Les scores envoyés jusqu’ici sont gardés.';
    if (confirm(msg)) command('end');
  };
}

function spectacle(st, round) {
  const phase = hostPhase(round), g = games[round.game];
  const key = `spec/${round.id}/${phase}`;
  let body;
  if (phase === 'count') {
    body = `<div class="count-layout">${ruleCard(round.game, round.rule, round.id, { big: true, practice: round.practice })}
      <div class="countdown"><span>Départ dans</span><b id="count"></b><small>Les règles sont aussi sur vos téléphones</small></div></div>`;
  } else if (phase === 'grace') {
    body = `<div class="center-msg"><div class="spinner"></div><h2>Manche terminée !</h2><p>Réception des derniers scores…</p></div>`;
  } else if (round.stage) {
    body = stagedBody(st, round);
  } else {
    body = playBody(st, round, phase);
  }
  if (!show(key, `<div class="stage-screen">${topBar(round)}<section class="stage-body">${body}</section>${hostBar(round, { canEnd: phase !== 'count' && phase !== 'grace' })}</div>`)) return updateSpectacle(st, round, phase);
  bindBar(round);
  updateSpectacle(st, round, phase);
}

function playBody(st, round, phase) {
  const g = games[round.game];
  let side = '';
  if (round.game === 'memory') {
    const m = memoryStageAt(now() - round.startAt);
    const seq = m ? memorySequence(round.id, m) : [];
    side = !m ? '' : m.phase === 'show'
      ? `<div class="memo-show"><p>Suite ${m.index + 1} / 6 · Mémorisez !</p><div class="fruits big">${seq.map(f => `<span>${f}</span>`).join('')}</div></div>`
      : m.phase === 'answer'
        ? `<div class="memo-show"><p>Suite ${m.index + 1} / 6</p><h2>À vous ! Reproduisez la suite${round.rule === 'reverse' ? ' <u>à l’envers</u>' : ''}</h2><div class="fruits big hidden">${seq.map(() => '<span>❔</span>').join('')}</div></div>`
        : `<div class="memo-show"><h2>Suite suivante…</h2><p>${m.len} fruits</p></div>`;
  } else if (round.game === 'bonnet') {
    side = `<div class="bonnet-host"><h2 id="bonnet-title"></h2><p id="bonnet-hint"></p><div id="bonnet-field"></div></div>`;
  } else if (round.game === 'reaction') {
    side = `<div class="reaction-host"><p class="big-hint">📱 Regardez votre téléphone</p><p id="try-no"></p></div>`;
  } else if (round.game === 'barrels' && round.rule === 'lights') {
    side = `<div class="light-host" id="light"></div>`;
  } else if (round.game === 'barrels' && round.rule === 'turbo') {
    side = `<div class="turbo-host" id="turbo"></div>`;
  }
  return `<div class="play-layout">
    ${timer('play-timer', !g.hideClock)}
    ${side}
    <div class="live-wrap"><h3>En direct</h3><ol class="live" id="live"></ol></div>
  </div>`;
}

function stagedBody(st, round) {
  const s = round.stage, players = st.players;
  if (round.game === 'truefalse') {
    const n = s.yes + s.no;
    return `<div class="tf-host">
      <p class="step">Question ${s.step + 1} / ${s.total}</p>
      <blockquote class="tf-q">${esc(s.text)}</blockquote>
      ${s.phase === 'choose' ? `${timer('stage-timer')}<p class="big-hint">Vrai ou faux ? Répondez sur votre téléphone</p>` : ''}
      ${s.phase === 'stats' ? `<div class="tf-bars">
          <div class="bar yes" style="--p:${n ? s.yes / n : 0}"><b>Vrai</b><span>${s.yes}</span></div>
          <div class="bar no" style="--p:${n ? s.no / n : 0}"><b>Faux</b><span>${s.no}</span></div></div>
          <p class="big-hint">Et la bonne réponse est…</p>` : ''}
      ${s.phase === 'answer' ? `<div class="tf-answer ${s.answer ? 'yes' : 'no'}"><b>${s.answer ? 'VRAI' : 'FAUX'}</b><p>${esc(s.why)}</p></div>` : ''}
    </div>`;
  }
  if (round.game === 'lucky') {
    const final = s.rule === 'final';
    const gains = s.phase === 'reveal' && !final ? Object.entries(s.reveal.gains || {}) : [];
    const best = gains.length ? Math.max(...gains.map(([, v]) => v)) : 0;
    return `<div class="lucky-host">
      <p class="step">${final ? `Finale · tour ${s.finalTurn}` : `Tour ${s.step + 1} / ${s.total}`}</p>
      ${luckyTitle(s)}
      ${barrelsHTML(s, players)}
      ${s.phase === 'choose' ? `${timer('stage-timer')}<p class="big-hint">Choisissez un tonneau sur votre téléphone</p>` : ''}
      ${s.phase === 'reveal' && !final && best > 0 ? `<p class="lucky-best">Meilleur gain : +${best} pour ${gains.filter(([, v]) => v === best).map(([pid]) => esc(players.find(p => p.pid === pid)?.name)).join(', ')}</p>` : ''}
      ${livesHTML(s, players)}
    </div>`;
  }
  // Bataille royale
  const alive = s.survivors.map(pid => players.find(p => p.pid === pid)).filter(Boolean);
  return `<div class="arena-host">
    <div class="arena-board">${arenaSVG(s, players)}</div>
    <div class="arena-info">
      <p class="step">Tour ${s.turn}</p>
      <h2>${plural(alive.length, 'survivant')}</h2>
      ${s.phase === 'choose' ? `${timer('stage-timer')}<p class="big-hint">Sur votre téléphone : touchez pour vous placer, puis touchez pour viser</p>` : arenaSummary(s, players)}
      <div class="chips">${alive.map(p => chip(p, s.shields?.includes(p.pid) ? 'shielded' : '')).join('')}</div>
    </div>
  </div>`;
}

let lastLive = '';
function updateSpectacle(st, round, phase) {
  if (phase === 'count') { if ($('count')) $('count').textContent = Math.max(1, Math.ceil((round.startAt - now()) / 1000)); return; }
  if (round.stage) { setTimer('stage-timer', round.stage.until - stageLength(round), round.stage.until); return; }
  if (phase === 'grace') return;
  setTimer('play-timer', round.startAt, round.endAt);
  const elapsed = now() - round.startAt;
  if ($('light')) {
    const red = isRed(round.id, elapsed);
    $('light').className = `light-host ${red ? 'red' : 'green'}`;
    $('light').textContent = red ? 'Rouge · on ne tape pas !' : 'Vert · tapez !';
  }
  if ($('turbo')) $('turbo').textContent = round.endAt - now() <= 5000 ? '🔥 Turbo ! Chaque tape vaut 2 points' : 'Turbo dans les 5 dernières secondes';
  if ($('bonnet-field')) { const f=bonnetFrame(round,(now()-round.startAt)/1000); if(f){$('bonnet-title').textContent=`Série ${f.i+1} / 10`; $('bonnet-hint').textContent=f.phase==='show'?'Le raisin est ici…':f.phase==='mix'?'Suivez le raisin !':f.phase==='choose'?'Choisissez un gobelet !':'Voici la réponse !'; $('bonnet-field').innerHTML=bonnetHTML(f,null,false); } }
  if ($('try-no')) { const i = Math.min(2, Math.floor(elapsed / REACTION_TRY)); $('try-no').textContent = `Essai ${i + 1} / 3`; }
  const live = $('live');
  if (live) {
    const scores = st.live || {};
    const rows = st.players.filter(p => round.ids.includes(p.pid)).map(p => ({ ...p, v: scores[p.pid] }));
    const key = JSON.stringify(rows.map(r => [r.pid, r.v]));
    if (key === lastLive) return;
    lastLive = key;
    const sorted = rows.sort((a, b) => (b.v ?? -1e9) - (a.v ?? -1e9));
    const max = Math.max(1, ...sorted.map(r => r.v || 0));
    const show = v => v === undefined ? '…' : round.game === 'reaction' ? (v > 0 ? `${10000 - v} ms` : '—') : v;
    live.innerHTML = sorted.slice(0, 14).map((r, i) => `<li style="--c:${esc(r.color)};--w:${round.game === 'reaction' ? (r.v > 0 ? 1 : 0) : Math.max(0, r.v || 0) / max}">
      <span class="pos">${i + 1}</span><span class="name"><i></i>${esc(r.name)}</span><span class="bar"></span><b>${show(r.v)}</b></li>`).join('')
      + (sorted.length > 14 ? `<li class="more">+ ${sorted.length - 14} autres joueurs</li>` : '');
  }
}
const stageLength = round => ({ truefalse: { choose: 8000, stats: 3000, answer: 7000 }, lucky: { choose: 8000, reveal: 5000 }, arena: { choose: 6000, reveal: 8000 } })[round.game][round.stage.phase];

// ---------- Résultats ----------
function results(st, round) {
  const key = `res/${round.id}/${resultSlide}`;
  const g = games[round.game];
  const body = resultSlide === 'podium'
    ? `<div class="results-podium"><h2>Résultats de la manche</h2>${podium(round, st.players)}${round.practice ? '<p class="note">Manche d’essai : aucun point au classement général.</p>' : ''}</div>`
    : `<div class="results-general"><h2>Classement général</h2>${standingsHTML(st.players, round.before)}<h2>Classement · ${esc(g.name)}</h2>${standingsHTML(st.players,st.gameTotals?.[round.game] || {})}</div>`;
  const toggle = round.practice ? '' : `<button class="ghost" id="slide">${resultSlide === 'podium' ? '🏆 Classement général' : '🥇 Podium de la manche'}</button>`;
  if (!show(key, `<div class="stage-screen">${topBar(round)}<section class="stage-body">${body}</section>${hostBar(round, { canEnd: false, extra: `${toggle}<button class="primary" id="back">Retour au salon ▸</button>` })}</div>`)) return;
  bindBar(round);
  if (resultSlide === 'podium') confetti();
  else animateStandings(document.querySelector('.standings'), st.players, round.before, st.totals, 1000);
  if ($('slide')) $('slide').onclick = () => { clearTimeout(resultTimer); resultSlide = resultSlide === 'podium' ? 'general' : 'podium'; renderHost(); };
  $('back').onclick = () => { clearTimeout(resultTimer); ui.dismissed = round.id; saveUi(); resultSlide = 'podium'; resetScreen(); renderHost(); };
  clearTimeout(resultTimer);
  if (resultSlide === 'podium' && !round.practice) resultTimer = setTimeout(() => { if (S.state?.round?.id === round.id && ui.dismissed !== round.id) { resultSlide = 'general'; renderHost(); } }, 7000);
}

// ---------- Mode salon (admin) ----------
function admin(st) {
  const { series, pending, players } = st;
  const choice = ui.choice && games[ui.choice] ? ui.choice : programme.find(id => !ui.done.includes(id)) || programme[0];
  const key = `admin/${JSON.stringify([series, pending, players.map(p => p.pid + p.name), st.totals, st.gameTotals, choice, ui.total, ui.done, st.round?.id, st.history?.length])}`;
  const rows = standings(players, st.totals);
  const hasScores = rows.some(r => r.total);
  const next = pending
    ? pendingPanel(st)
    : `<h2>${series && series.played >= series.total ? 'Série terminée · choisis le jeu suivant' : 'Choisis le prochain jeu'}</h2>
      <div class="game-grid">${programme.map((id, i) => {
        const g = games[id], done = ui.done.includes(id), suggested = id === programme.find(x => !ui.done.includes(x));
        return `<button type="button" class="game-card ${id === choice ? 'selected' : ''} ${done ? 'done' : ''}" data-game="${id}" aria-pressed="${id === choice}">
          <span class="num">${i + 1}</span><span class="icon" aria-hidden="true">${g.icon}</span><b>${esc(g.name)}</b>
          <small>${esc(g.goal)}</small>
          ${done ? '<span class="tag">Joué ✓</span>' : suggested ? '<span class="tag gold">Conseillé</span>' : ''}
        </button>`;
      }).join('')}</div>
      <div class="prepare">
        ${choice === 'truefalse' ? `<label for="quiz-theme">Thème du quiz</label><select id="quiz-theme">${Object.entries(quizThemes).map(([id,label]) => `<option value="${id}" ${id === (ui.quizTheme || 'mix') ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>` : ''}
        <div class="seg" role="radiogroup" aria-label="Nombre de manches">${[1, 2, 3].map(n => `<button type="button" role="radio" data-total="${n}" aria-checked="${ui.total === n}">${plural(n, 'manche')}</button>`).join('')}</div>
        <button class="primary big" id="series">Préparer ${esc(games[choice].name)} ▸</button>
      </div>`;
  if (!show(key, `<div class="admin">
    <section class="admin-main">
      <div class="panel next">${next}</div>
      <div class="panel">
        <div class="panel-head"><h2>Classement général</h2>${st.round?.results ? '<button class="ghost small" id="replay">Revoir les derniers résultats</button>' : ''}</div>
        ${hasScores ? standingsHTML(players, st.totals) : `<p class="muted">${players.length ? 'Aucun point pour l’instant. Le classement se remplit après chaque manche.' : 'En attente des joueurs.'}</p>`}
        ${hasScores ? '<button class="ghost small danger" id="reset">Remettre les scores à zéro</button>' : ''}
      </div>
      <div class="panel"><h2>🏅 Classement par jeu</h2>${Object.keys(st.gameTotals || {}).length ? `<label for="game-ranking">Choisis un jeu</label><select id="game-ranking">${Object.keys(st.gameTotals).map(id=>`<option value="${esc(id)}">${esc(games[id]?.name || id)}</option>`).join('')}</select><div id="game-ranking-list"></div><p class="muted small">Points cumulés sur toutes les manches de ce jeu, y compris si tu y reviens plus tard.</p>` : '<p class="muted">Le classement apparaîtra après la première manche.</p>'}</div>
      <div class="panel"><h2>📋 Historique des manches</h2>${(st.history || []).length ? [...st.history].reverse().map(h => `<details><summary>${esc(games[h.game]?.name || h.game)} · manche ${h.index}/${h.total} · ${esc(ruleNames(h.rule))}</summary><p class="muted small">${new Date(h.endedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>${h.results.map(r => `<p>${r.rank ? r.rank+'ᵉ' : 'Absent'} · ${chip(r)} · ${esc(r.raw)} ${esc(games[h.game]?.unit || '')} · score ${esc(r.score)} · +${r.points} pts${r.memoryBonus ? ' (dont +1 bonus sans-faute)' : ''} · total ${r.total} pts</p>`).join('')}</details>`).join('') : '<p class="muted">Les manches jouées apparaîtront ici.</p>'}</div>
    </section>
    <aside class="admin-side">
      <div class="panel join">
        <h2>Rejoindre la partie</h2>
        <div class="qr" id="qr"></div>
        <p class="code-big">${esc(S.session.room)}</p>
        <p class="muted small">Scannez le QR code ou ouvrez <a id="join-link" target="_blank" rel="noopener">${esc(joinUrl().replace(/^https?:\/\//, ''))}</a></p>
      </div>
      <div class="panel">
        <h2>Joueurs <span class="count">${players.length}</span></h2>
        ${players.length ? `<ul class="player-list">${players.map(p => `<li>${chip(p)}<button class="icon-btn" data-remove="${esc(p.pid)}" aria-label="Retirer ${esc(p.name)}" title="Retirer">✕</button></li>`).join('')}</ul>` : '<p class="muted">Personne pour l’instant.</p>'}
        <button class="ghost small" id="bots">🤖 Ajouter 3 robots de test</button>
      </div>
    </aside>
  </div>`)) return;
  if ($('game-ranking')) { $('game-ranking').value = Object.hasOwn(st.gameTotals || {}, st.round?.game) ? st.round.game : Object.keys(st.gameTotals)[0]; const drawGameRanking = () => { const id=$('game-ranking').value; $('game-ranking-list').innerHTML=standingsHTML(players,st.gameTotals[id] || {}); }; $('game-ranking').onchange=drawGameRanking; drawGameRanking(); }
  qr($('qr'), 8);
  $('join-link').href = joinUrl();
  document.querySelectorAll('[data-game]').forEach(b => b.onclick = () => { ui.choice = b.dataset.game; saveUi(); renderHost(); });
  document.querySelectorAll('[data-total]').forEach(b => b.onclick = () => { ui.total = Number(b.dataset.total); saveUi(); renderHost(); });
  if ($('quiz-theme')) $('quiz-theme').onchange = e => { ui.quizTheme = e.target.value; saveUi(); };
  if ($('series')) $('series').onclick = () => command('series', { game: choice, total: ui.total || 1, quizTheme: choice === 'truefalse' ? (ui.quizTheme || 'mix') : undefined });
  document.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { const p = players.find(x => x.pid === b.dataset.remove); if (p && confirm(`Retirer ${p.name} de la partie ? Ses points seront perdus.`)) command('remove', { player: p.pid }); });
  if ($('reset')) $('reset').onclick = () => { const code=prompt(`Tous les scores et l’historique seront effacés. Pour confirmer, saisis le code de la partie : ${S.session.room.toUpperCase()}`); if (code === null) return; if (code.trim().toLowerCase() !== S.session.room.toLowerCase()) { status('Code incorrect : aucune remise à zéro.', 'error'); return; } ui.done=[]; saveUi(); command('reset',{confirmCode:code.trim()}); };
  if ($('replay')) $('replay').onclick = () => { ui.dismissed = null; saveUi(); resetScreen(); renderHost(); };
  if ($('bots')) $('bots').onclick = () => command('add-bots');
  bindPending(st);
}

function pendingPanel(st) {
  const { series, pending, players } = st, g = games[series.game];
  const enough = players.length >= (g.minPlayers || 1);
  const options = ['classic', ...g.variants];
  return `<div class="pending">
    <div class="panel-head"><h2>Prochaine manche · ${series.played + 1} / ${series.total}</h2><button class="ghost small" id="change">← Changer de jeu</button></div>
    ${ruleCard(series.game, pending.rule, null, { practice: pending.practice })}
    ${series.game === 'truefalse' ? `<p>Thème choisi : <b>${esc(quizThemes[series.quizTheme || 'mix'])}</b>${pending.rule === 'beaujolais' ? ' · La variante Beaujolais est prioritaire.' : ''}</p>` : ''}
    ${options.length > 1 ? `<h3>Variante</h3><div class="variants" role="radiogroup">${options.map(r => `<button type="button" role="radio" class="variant-opt" data-rule="${r}" aria-checked="${pending.rule === r}">
      <b>${esc(series.game === 'words' && r === 'classic' ? 'Facile' : ruleNames(r))}</b><small>${esc(r === 'hand' ? 'Tape uniquement avec la main indiquée (tirée au sort).' : ruleText(series.game, r))}</small></button>`).join('')}</div>` : ''}
    <label class="switch"><input type="checkbox" id="practice" ${pending.practice ? 'checked' : ''}><span></span>Manche d’essai : on joue pour comprendre, les points ne comptent pas</label>
    <button class="primary huge" id="start" ${enough ? '' : 'disabled'}>▶ Lancer la manche</button>
    ${enough ? `<p class="muted small">Les joueurs voient déjà la règle sur leur téléphone. Décompte de 6 secondes au lancement.</p>` : `<p class="warn">${esc(g.name)} demande au moins ${g.minPlayers} joueurs.</p>`}
  </div>`;
}

function bindPending(st) {
  if (!st.pending) return;
  if ($('change')) $('change').onclick = () => { if (!st.series.played || confirm('Changer de jeu ? Les points déjà gagnés sont gardés.')) command('change-game'); };
  document.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => b.dataset.rule !== st.pending.rule && command('rule', { rule: b.dataset.rule }));
  if ($('practice')) $('practice').onchange = e => command('practice', { on: e.target.checked });
  if ($('start')) $('start').onclick = () => { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); command('start'); };
}

export function hostDelay(st) {
  const r = st?.round;
  if (!r || r.results) return 2500;
  if (r.stage) return Math.max(250, Math.min(1500, r.stage.until - now() + 80));
  return now() < r.startAt ? Math.min(1500, r.startAt - now() + 80) : 1000;
}
