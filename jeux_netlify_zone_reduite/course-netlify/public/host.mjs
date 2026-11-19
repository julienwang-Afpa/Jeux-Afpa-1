// Écran animateur : mode salon (admin) entre les manches, mode spectacle pendant les manches.
import { S, api, $, esc, show, status, now, storage, resetScreen, plural } from './core.mjs';
import { games, programme, rules, ruleNames, ruleText, standings, memoryStageAt, memorySequence, memoryPlan, reactionPlan, REACTION_TRY, isRed } from './games.mjs';
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
