// Téléphone du joueur : inscription, attente, règles, jeux, résultats.
import { S, api, $, esc, show, status, now, storage, resetScreen, vibrate, plural, app } from './core.mjs';
import { colors, colorNames, games, ruleNames, ruleText, handOf, standings, isRed, fruits, memorySequence, memoryStageAt, memoryPlan, reactionPlan, REACTION_TRY, BARREL } from './games.mjs';
import { chip, ruleCard, timer, setTimer, standingsHTML, animateStandings, confetti, floatText, flash, perf } from './ui.mjs';
import { arenaSVG, arenaSummary, barrelsHTML, luckyTitle, livesHTML } from './boards.mjs';

const GRACE = 2500;
let colorChoice = colors[Math.floor(Math.random() * colors.length)], nickname = '';
let ctl = null;            // progression locale de la manche en cours (jeux individuels)
let game = null;           // jeu monté à l'écran : { tick() }
let pickQueue = null, pickSending = false, sending = false;
const ctlKey = () => `beaujolais.ctl.v3.${S.session.room}`;
const me = () => S.state?.players.find(p => p.pid === S.session.pid);

// ---------- Aiguillage ----------
export function renderPhone() {
  const st = S.state;
  if (!st) return;
  if (!st.joined) return registration();
  const round = st.round;
  if (round && !round.results && !round.playing) return spectator(st, round);
  if (round && !round.results) return playing(st, round);
  if (round?.results && round.playing) return results(st, round);
  lobby(st);
}

function header(st) {
  const p = me(), rows = standings(st.players, st.totals), mine = rows.find(r => r.pid === S.session.pid);
  return `<div class="phone-top">${p ? chip(p) : ''}<span class="my-total"><b>${mine?.total || 0}</b> pts · ${mine?.rank || '–'}<sup>${mine?.rank === 1 ? 'er' : 'e'}</sup></span></div>`;
}

// ---------- Inscription ----------
function registration() {
  // Couleurs déjà prises : grisées, pour que chacun se repère sur l'écran (surtout dans la Bataille royale).
  const taken = new Set((S.state?.players || []).map(p => p.color));
  if (taken.size >= colors.length) taken.clear();
  if (taken.has(colorChoice)) { const free = colors.filter(c => !taken.has(c)); colorChoice = free[Math.floor(Math.random() * free.length)]; }
  const typing = document.activeElement?.id === 'name';
  if (!show(`registration/${[...taken].join()}`, `<section class="card welcome">
      <p class="eyebrow">Bienvenue aux</p>
      <h1>Les Jeux du Beaujolais</h1>
      <form id="join" autocomplete="off">
        <label for="name">Ton prénom ou pseudo</label>
        <input id="name" required maxlength="16" autocomplete="nickname" enterkeyhint="go" placeholder="Ex. : Julie">
        <p class="label">Choisis ta couleur</p>
        <div class="swatches">${colors.map((c, i) => `<button type="button" style="--c:${c}" data-color="${c}" aria-label="${colorNames[i]}${taken.has(c) ? ' (déjà prise)' : ''}" aria-pressed="${c === colorChoice}" ${taken.has(c) ? 'disabled' : ''}></button>`).join('')}</div>
        <p class="color-name" id="color-name">${colorNames[colors.indexOf(colorChoice)]}</p>
        <button class="primary huge" id="join-btn">Entrer dans la partie</button>
        <p class="muted small center">Code de la partie : <b class="code">${esc(S.session.room)}</b></p>
      </form>
    </section>`)) return;
  $('name').value = nickname;
  $('name').oninput = e => { nickname = e.target.value; };
  if (typing) $('name').focus();
  $('join').onsubmit = join;
  document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => {
    colorChoice = b.dataset.color;
    document.querySelectorAll('[data-color]').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('color-name').textContent = colorNames[colors.indexOf(colorChoice)];
  });
}

async function join(event) {
  event.preventDefault();
  if (S.busy) return;
  S.busy = true;
  nickname = $('name').value.trim();
  $('join-btn').disabled = true;
  try {
    for (let attempt = 0; ; attempt++) {
      try { S.state = await api('join', { name: nickname, color: colorChoice }); break; }
      catch (e) {
        if (attempt === 3 || (e.status && e.status !== 503)) throw e;
        await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      }
    }
    keepAwake();
    resetScreen();
    renderPhone();
  } catch (e) {
    status(e.message, 'error');
    if ($('join-btn')) $('join-btn').disabled = false;
  } finally { S.busy = false; }
}

// L'écran reste allumé pendant la soirée (si le navigateur le permet).
let wakeLock = null;
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* facultatif */ } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.state?.joined && !wakeLock?.released === false) keepAwake(); });

// ---------- Attente entre les manches ----------
function nextCard(st) {
  if (st.pending && st.series) return `<p class="eyebrow">Prochain jeu · lis la règle</p>${ruleCard(st.series.game, st.pending.rule, null, { practice: st.pending.practice })}`;
  return `<div class="card waiting"><div class="grapes" aria-hidden="true">🍇</div><h2>L’animateur prépare le prochain jeu</h2><p class="muted">Garde cette page ouverte : tout se lance automatiquement.</p></div>`;
}
