// Écran animateur : mode salon (admin) entre les manches, mode spectacle pendant les manches.
import { S, api, $, esc, show, status, now, storage, resetScreen, plural } from './core.mjs';
import { games, programme, rules, ruleNames, ruleText, ruleExample, standings, memoryStageAt, memorySequence, memoryPlan, reactionPlan, REACTION_TRY, isRed, themes, levels, cupsPlan, cupsPose, CUPS } from './games.mjs';
import { chip, ruleCard, timer, setTimer, podium, standingsHTML, animateStandings, confetti } from './ui.mjs';
import { arenaSVG, arenaSummary, barrelsHTML, luckyTitle, livesHTML } from './boards.mjs';

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
    ${round.theme ? `<span class="badge">${esc(themes[round.theme])}</span>` : ''}${round.level ? `<span class="badge">${esc(levels[round.level])}</span>` : ''}
    <span class="round-no">${round.practice ? 'Manche d’essai' : `Manche ${round.index} / ${round.total}`}</span>
  </header>`;
}

function hostBar(round, { canEnd = true, extra = '' } = {}) {
  return `<footer class="host-bar">
    ${canEnd ? '<button class="ghost" id="end">■ Terminer la manche</button>' : ''}${!round.results ? '<button class="ghost" id="cancel">↩️ Annuler et rejouer</button>' : ''}${extra}
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
  if ($('cancel')) $('cancel').onclick = () => { if (confirm('Annuler cette manche ? Aucun point ne sera compté et la même règle sera reproposée.')) command('cancel'); };
}

function spectacle(st, round) {
  const phase = hostPhase(round), g = games[round.game];
  const key = `spec/${round.id}/${phase}`;
  let body;
  if (phase === 'count') {
    body = `<div class="count-layout">${ruleCard(round.game, round.rule, round.id, { big: true, practice: round.practice, theme: round.theme, level: round.level })}
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
  } else if (round.game === 'reaction') {
    side = `<div class="reaction-host"><p class="big-hint">📱 Regardez votre téléphone</p><p id="try-no"></p></div>`;
  } else if (round.game === 'cups') {
    side = `<div class="cups-host"><div class="cup-head"><div class="cup-dots" id="hdots"></div><p class="cup-info" id="hinfo"></p></div><div class="cup-stage big" id="hstage"></div><p class="cup-msg" id="hmsg"></p></div>`;
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
  if (round.stage) { setTimer('stage-timer', round.stage.until - round.stage.len, round.stage.until); return; }
  if (phase === 'grace') return;
  const elapsed = now() - round.startAt;
  if (round.game === 'memory') {
    // Mémoire Flash : la barre suit la phase en cours (mémoriser, puis répondre), comme sur les téléphones.
    const m = memoryStageAt(elapsed), at = sec => round.startAt + sec * 1000;
    if (m?.phase === 'show') setTimer('play-timer', at(m.start), at(m.answerAt));
    else if (m?.phase === 'answer') setTimer('play-timer', at(m.answerAt), at(m.end));
    else setTimer('play-timer', now(), now());
  } else setTimer('play-timer', round.startAt, round.endAt);
  if ($('light')) {
    const red = isRed(round.id, elapsed);
    $('light').className = `light-host ${red ? 'red' : 'green'}`;
    $('light').textContent = red ? 'Rouge · on ne tape pas !' : 'Vert · tapez !';
  }
  if ($('turbo')) $('turbo').textContent = round.endAt - now() <= 3000 ? '🔥 Turbo ! Chaque tape vaut 2 points' : 'Turbo dans les 3 dernières secondes';
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
// Bonneteau sur le grand écran : même mélange que les téléphones, image par image.
let hostCups = null;
function cupsHostFrame() {
  requestAnimationFrame(cupsHostFrame);
  const round = S.state?.round, st = $('hstage');
  if (!round || round.game !== 'cups' || round.results || !st) return;
  if (hostCups?.id !== round.id) hostCups = { id: round.id, plan: cupsPlan(round.id, round.rule), L: 0 };
  const el = now() - round.startAt, plan = hostCups.plan, ser = plan.find(x => el < x.t1) || plan.at(-1);
  if (el < 0) return;
  if (hostCups.L !== ser.L || !st.querySelector('.cup')) {
    st.style.setProperty('--g', ser.g);
    st.innerHTML = '<div class="cup-ball"></div>' + Array.from({ length: ser.g }, () => '<div class="cup"></div>').join('');
    hostCups.L = ser.L;
  }
  const t = Math.min(el, ser.t1 - 1), pose = cupsPose(ser, t), H = st.clientHeight * .55;
  st.querySelectorAll('.cup').forEach((c, i) => { c.style.left = ((pose.x[i] + .5) / ser.g * 100) + '%'; c.style.transform = `translate(-50%, ${Math.round(pose.y[i] * H)}px)`; });
  const ball = st.querySelector('.cup-ball');
  ball.style.left = pose.ball == null ? '-100px' : ((pose.ball + .5) / ser.g * 100) + '%'; ball.style.opacity = pose.ball == null ? 0 : 1;
  $('hdots').innerHTML = plan.map(x => `<i class="${x.L < ser.L || (x.L === ser.L && t >= ser.tReveal) ? 'done' : x.L === ser.L ? 'cur' : ''}"></i>`).join('');
  $('hinfo').textContent = `Série ${ser.L} / 10 · ${ser.g} gobelets · ${ser.s} échanges${ser.f ? ` · ${ser.f} feinte${ser.f > 1 ? 's' : ''}` : ''}`;
  const m = el >= plan.at(-1).t1 ? 'Fin du bonneteau !' : t < ser.tShow ? (ser.L === 10 ? '🔥 Dernière série : 100 points en jeu !' : `Série ${ser.L}`) : t < ser.tMoves ? 'Le raisin est ici…' : t < ser.tChoice ? 'Suivez-le !' : t < ser.tReveal ? `À vos téléphones ! (${Math.ceil((ser.tReveal - t) / 1000)} s)` : 'Le raisin était là !';
  if ($('hmsg').textContent !== m) $('hmsg').textContent = m;
}
requestAnimationFrame(cupsHostFrame);

// ---------- Résultats ----------
// Trois écrans qui s'enchaînent : podium de la manche, classement du jeu (pour le lot), classement général.
const SLIDES = ['podium', 'game', 'general'];
function results(st, round) {
  const key = `res/${round.id}/${resultSlide}`;
  const g = games[round.game];
  let body;
  if (resultSlide === 'podium') body = `<div class="results-podium"><h2>Résultats de la manche</h2>${podium(round, st.players)}${round.practice ? '<p class="note">Manche d’essai : aucun point au classement.</p>' : ''}</div>`;
  else if (resultSlide === 'game') body = `<div class="results-general"><h2>Classement ${esc(g.name)}</h2><p class="sub-note">Cumul de la soirée pour ce jeu : le 1er remporte le lot.</p>${standingsHTML(st.players.filter(p => p.pid in (st.byGame?.[round.game] || {}) || round.ids.includes(p.pid)), round.beforeGame, null, 15)}</div>`;
  else body = `<div class="results-general"><h2>Classement général</h2>${standingsHTML(st.players, round.before, null, 15)}</div>`;
  const nextSlide = SLIDES[(SLIDES.indexOf(resultSlide) + 1) % SLIDES.length];
  const label = { podium: '🥇 Podium de la manche', game: `🏅 Classement ${g.name}`, general: '🏆 Classement général' };
  const toggle = round.practice ? '' : `<button class="ghost" id="slide">${label[nextSlide]}</button>`;
  if (!show(key, `<div class="stage-screen">${topBar(round)}<section class="stage-body">${body}</section>${hostBar(round, { canEnd: false, extra: `${toggle}<button class="primary" id="back">${st.pending ? 'Préparer la manche suivante ▸' : 'Retour au salon ▸'}</button>` })}</div>`)) return;
  bindBar(round);
  if (resultSlide === 'podium') confetti();
  else if (resultSlide === 'game') animateStandings(document.querySelector('.standings'), st.players, round.beforeGame, st.byGame?.[round.game] || {}, 900);
  else animateStandings(document.querySelector('.standings'), st.players, round.before, st.totals, 900);
  if ($('slide')) $('slide').onclick = () => { clearTimeout(resultTimer); resultSlide = nextSlide; renderHost(); };
  $('back').onclick = () => { clearTimeout(resultTimer); ui.dismissed = round.id; saveUi(); resultSlide = 'podium'; resetScreen(); renderHost(); };
  clearTimeout(resultTimer);
  if (!round.practice && resultSlide !== 'general') resultTimer = setTimeout(() => { if (S.state?.round?.id === round.id && ui.dismissed !== round.id) { resultSlide = nextSlide; renderHost(); } }, 8000);
}

// ---------- Mode salon (admin) ----------
function admin(st) {
  const { series, pending, players } = st;
  const choice = ui.choice && games[ui.choice] ? ui.choice : programme.find(id => !ui.done.includes(id)) || programme[0];
  const tab = ui.tab && (ui.tab === 'general' || st.byGame?.[ui.tab]) ? ui.tab : 'general';
  const key = `admin/${JSON.stringify([series, pending, players.map(p => p.pid + p.name), st.totals, st.byGame, choice, ui.total, ui.done, st.round?.id, tab, st.themeCounts])}`;
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
        <div class="seg" role="radiogroup" aria-label="Nombre de manches">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" data-total="${n}" aria-checked="${ui.total === n}">${plural(n, 'manche')}</button>`).join('')}</div>
        <button class="primary big" id="series">Préparer ${esc(games[choice].name)} ▸</button>
      </div>`;
  if (!show(key, `<div class="admin">
    <section class="admin-main">
      <div class="panel next">${next}</div>
      <div class="panel">
        <div class="panel-head"><h2>Classements</h2>${st.round?.results ? '<button class="ghost small" id="replay">Revoir les derniers résultats</button>' : ''}</div>
        <div class="tabs" role="tablist">${['general', ...programme.filter(id => st.byGame?.[id])].map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}">${id === 'general' ? '🏆 Général' : esc(games[id].name)}</button>`).join('')}</div>
        ${hasScores ? standingsHTML(tab === 'general' ? players : players.filter(p => p.pid in st.byGame[tab]), tab === 'general' ? st.totals : st.byGame[tab], null, 20) : `<p class="muted">${players.length ? 'Aucun point pour l’instant. Les classements se remplissent après chaque manche.' : 'En attente des joueurs.'}</p>`}
        ${hasScores ? '<button class="ghost small danger" id="reset">Remettre tous les scores à zéro</button>' : ''}
      </div>
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
        <div class="bots-box">
          <p class="muted small">Robots de test : ils ne jouent pas sur un téléphone, le serveur leur invente un résultat plausible.</p>
          <div class="bots-row"><input type="number" id="bot-count" min="1" max="500" value="5" aria-label="Nombre de robots"><button class="ghost small" id="bots">🤖 Ajouter</button>${players.some(p => p.bot) ? `<button class="ghost small danger" id="unbots">Retirer les ${players.filter(p => p.bot).length} robots</button>` : ''}</div>
        </div>
      </div>
    </aside>
  </div>`)) return;
  qr($('qr'), 8);
  $('join-link').href = joinUrl();
  document.querySelectorAll('[data-game]').forEach(b => b.onclick = () => { ui.choice = b.dataset.game; saveUi(); renderHost(); });
  document.querySelectorAll('[data-total]').forEach(b => b.onclick = () => { ui.total = Number(b.dataset.total); saveUi(); renderHost(); });
  if ($('series')) $('series').onclick = () => command('series', { game: choice, total: ui.total || 1 });
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; saveUi(); renderHost(); });
  document.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { const p = players.find(x => x.pid === b.dataset.remove); if (p && confirm(`Retirer ${p.name} de la partie ? Ses points seront perdus.`)) command('remove', { player: p.pid }); });
  if ($('reset')) $('reset').onclick = () => {
    const code = prompt(`Remettre TOUS les scores à zéro (général et par jeu) ?\n${players.length} joueurs et ${Object.keys(st.byGame || {}).length} classements de jeu seront effacés.\n\nPour confirmer, tape le code de la partie : ${S.session.room.toUpperCase()}`);
    if (code === null) return;
    if (code.trim().toLowerCase() !== S.session.room) { status('Code incorrect : rien n’a été effacé.', 'error'); return; }
    ui.done = []; saveUi(); command('reset', { code: S.session.room });
  };
  if ($('replay')) $('replay').onclick = () => { ui.dismissed = null; saveUi(); resetScreen(); renderHost(); };
  if ($('bots')) $('bots').onclick = () => { const n = Math.floor(Number($('bot-count').value)); if (n >= 1) command('bots', { count: n }); else status('Indique un nombre de robots (1 ou plus).', 'error'); };
  if ($('unbots')) $('unbots').onclick = () => { if (confirm('Retirer tous les robots et leurs points ?')) command('unbots'); };
  bindPending(st);
}

function pendingPanel(st) {
  const { series, pending, players } = st, g = games[series.game];
  const enough = players.length >= (g.minPlayers || 1);
  const first = series.played === 0;
  const ruleBox = first
    ? '<p class="rule-hint">Manche 1 : toujours en règles classiques.</p>'
    : `<div class="rule-draw"><p class="rule-hint">${pending.rule === 'classic' ? 'Cette manche se jouera sans règle spéciale.' : 'Règle spéciale tirée au sort pour cette manche :'}</p>
        <div class="rule-buttons"><button class="ghost" id="reroll">🎲 ${pending.rule === 'classic' ? 'Tirer une règle' : 'Autre règle'}</button>${pending.rule !== 'classic' ? '<button class="ghost" id="norule">Sans règle</button>' : ''}</div></div>`;
  const counts = st.themeCounts || {};
  const theme = series.game === 'truefalse' ? `<h3>Thème des questions</h3><div class="variants">${Object.entries(themes).map(([id, name]) => `<button type="button" role="radio" class="variant-opt" data-theme="${id}" aria-checked="${(pending.theme || 'all') === id}"><b>${esc(name)}</b><small>${counts[id] ?? '?'} questions${counts[id] !== undefined && counts[id] < 10 ? ' · trop peu' : ''}</small></button>`).join('')}</div>` : '';
  const level = g.levels ? `<h3>Niveau</h3><div class="seg" role="radiogroup">${Object.entries(levels).map(([id, name]) => `<button type="button" role="radio" data-level="${id}" aria-checked="${(pending.level || 'easy') === id}">${name}</button>`).join('')}</div>` : '';
  return `<div class="pending">
    <div class="panel-head"><h2>Prochaine manche · ${series.played + 1} / ${series.total}</h2><button class="ghost small" id="change">← Changer de jeu</button></div>
    ${ruleBox}
    ${ruleCard(series.game, pending.rule, null, { practice: pending.practice, theme: series.game === 'truefalse' ? pending.theme || 'all' : undefined, level: g.levels ? pending.level || 'easy' : undefined })}
    ${theme}${level}
    <label class="switch"><input type="checkbox" id="practice" ${pending.practice ? 'checked' : ''}><span></span>Manche d’essai : on joue pour comprendre, les points ne comptent pas</label>
    <button class="primary huge" id="start" ${enough ? '' : 'disabled'}>▶ Lancer la manche</button>
    ${enough ? `<p class="muted small">Les joueurs voient déjà la règle sur leur téléphone. Décompte de 6 secondes au lancement.</p>` : `<p class="warn">${esc(g.name)} demande au moins ${g.minPlayers} joueurs (les robots comptent).</p>`}
  </div>`;
}

function bindPending(st) {
  if (!st.pending) return;
  if ($('change')) $('change').onclick = () => { if (!st.series.played || confirm('Changer de jeu ? Les points déjà gagnés sont gardés.')) command('change-game'); };
  if ($('reroll')) $('reroll').onclick = () => command('reroll');
  if ($('norule')) $('norule').onclick = () => command('rule', { rule: 'classic' });
  document.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => b.dataset.theme !== st.pending.theme && command('theme', { theme: b.dataset.theme }));
  document.querySelectorAll('[data-level]').forEach(b => b.onclick = () => b.dataset.level !== st.pending.level && command('level', { level: b.dataset.level }));
  if ($('practice')) $('practice').onchange = e => command('practice', { on: e.target.checked });
  if ($('start')) $('start').onclick = () => { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); command('start'); };
}

export function hostDelay(st) {
  const r = st?.round;
  if (!r || r.results) return 2500;
  if (r.stage) return Math.max(250, Math.min(1500, r.stage.until - now() + 80));
  return now() < r.startAt ? Math.min(1500, r.startAt - now() + 80) : 1500;
}
