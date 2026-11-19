// Composants d'interface partagés : chips, carte de règle, chrono, podium, classement animé, confettis.
import { esc, now, plural } from './core.mjs';
import { games, ruleNames, ruleText, standings } from './games.mjs';

export const chip = (p, extra = '') => `<span class="chip ${extra}" style="--c:${esc(p.color)}"><i></i>${esc(p.name)}</span>`;

const examples = {
  barrels:'Tape le plus vite possible ! 10 tapes = 10 points en classique.', reaction:'Attends le signal vert, puis appuie le plus vite possible.', odd:'Touche la case dont la couleur est différente.', memory:'🍇 🍋 🍒 → reproduis 🍇 🍋 🍒.', maths:'7 + 5 = 12.', lucky:'Choisis un tonneau selon la règle affichée.', words:'N I S I R A → RAISIN.', truefalse:'Le Beaujolais nouveau est fait avec du gamay : vrai.', arena:'Place-toi, puis touche une direction pour tirer.'
};
export function ruleCard(gameId, rule, roundId, { big = false, practice = false } = {}) {
  const g = games[gameId];
  const variant = rule && rule !== 'classic'
    ? `<div class="variant"><b>Variante · ${esc(ruleNames(rule))}</b><span>${esc(ruleText(gameId, rule, roundId))}</span></div>` : '';
  return `<article class="rule-card ${big ? 'big' : ''}">
    <div class="rule-head"><span class="icon" aria-hidden="true">${g.icon}</span><h2>${esc(g.name)}</h2>${practice ? '<span class="badge">Manche d’essai · non comptée</span>' : ''}</div>
    <div class="rule-line"><span class="tag">Règle</span><p>${esc(g.how)}</p></div>
    <div class="rule-line"><span class="tag gold">Pour gagner</span><p>${esc(g.goal)}</p></div>
    ${examples[gameId] ? `<div class="rule-line"><span class="tag">Exemple</span><p>${esc(examples[gameId])}</p></div>` : ''}
    ${variant}
  </article>`;
}

// Chrono en barre : la barre se vide, le chiffre est facultatif (jeux « sans chrono »).
export const timer = (id, withNumber = true) => `<div class="timer" id="${id}"><div class="timer-track"><div class="timer-fill"></div></div>${withNumber ? '<span class="timer-num"></span>' : ''}</div>`;
export function setTimer(id, from, until) {
  const el = document.getElementById(id);
  if (!el) return;
  const left = Math.max(0, until - now()), ratio = Math.min(1, left / Math.max(1, until - from));
  el.querySelector('.timer-fill').style.transform = `scaleX(${ratio})`;
  el.classList.toggle('hurry', left < 5000 && left > 0);
  const num = el.querySelector('.timer-num');
  if (num) num.textContent = `${Math.ceil(left / 1000)} s`;
}

// Performance lisible d'une ligne de résultat.
export function perf(round, row) {
  if (!row.played) return 'Absent';
  if (round.game === 'reaction') return row.raw ? `${row.raw} ms` : 'Aucun temps';
  if (round.game === 'arena') return round.stage?.survivors?.includes(row.pid) ? 'Survivant' : `Éliminé au tour ${row.raw}`;
  if (round.game === 'lucky') return plural(row.raw, 'point') + (round.finalWinners?.includes(row.pid) ? ' · finale gagnée' : '');
  if (round.game === 'memory') return plural(row.raw, 'fruit') + (row.memoryBonus ? ' · 🌟 +1 pt bonus sans-faute le plus rapide' : '');
  if (round.game === 'odd' && round.rule === 'race30' && row.raw >= 30 && row.tb != null) return `30 intrus en ${(row.tb / 1000).toFixed(1)} s`;
  const g = games[round.game];
  return `${row.raw} ${g.unit}`;
}

export function podium(round, players) {
  const rows = round.results.filter(r => r.played);
  const top = [rows.find(r => r.rank === 2) ? rows.filter(r => r.rank === 2) : [], rows.filter(r => r.rank === 1), rows.filter(r => r.rank === 3)];
  const step = (list, place) => `<div class="step step-${place}">
      <div class="who">${list.map(r => `<div class="podium-name">${chip(r)}<small>${esc(perf(round, r))}</small></div>`).join('') || '<div class="podium-name empty">—</div>'}</div>
      <div class="block"><span class="place">${place}</span>${list.length ? `<span class="pts">+${list[0].points}</span>` : ''}</div>
    </div>`;
  const rest = round.results.filter(r => !r.played || r.rank > 3);
  return `<div class="podium">${step(top[0], 2)}${step(top[1], 1)}${step(top[2], 3)}</div>
    ${rest.length ? `<ol class="result-rest">${rest.map(r => `<li><span class="rank">${r.rank ?? '–'}</span>${chip(r)}<span class="perf">${esc(perf(round, r))}</span><span class="pts">+${r.points}</span></li>`).join('')}</ol>` : ''}`;
}

// Classement général animé « façon course » : on affiche l'ordre d'avant, puis chacun glisse à sa nouvelle place.
export function standingsHTML(players, totals, me) {
  const rows = standings(players, totals);
  return `<ol class="standings">${rows.map(r => `<li data-pid="${esc(r.pid)}" class="${r.pid === me ? 'me' : ''}" style="--c:${esc(r.color)}">
    <span class="rank">${r.rank}</span><span class="name"><i></i>${esc(r.name)}</span><span class="gain"></span><span class="total">${r.total}</span></li>`).join('')}</ol>`;
}

export function animateStandings(list, players, before, after, delay = 900) {
  if (!list) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    if (!list.isConnected) return;
    const items = new Map([...list.children].map(li => [li.dataset.pid, li]));
    const first = new Map([...items].map(([pid, li]) => [pid, li.getBoundingClientRect().top]));
    const oldRank = new Map([...items].map(([pid, li]) => [pid, Number(li.querySelector('.rank').textContent)]));
    const rows = standings(players, after);
    // Pas de flèches tant que personne n'avait de points (tout le monde était ex æquo).
    const ranked = Object.values(before || {}).some(v => v > 0);
    for (const r of rows) {
      const li = items.get(r.pid);
      if (!li) continue;
      list.appendChild(li);
      li.querySelector('.rank').textContent = r.rank;
      const gain = r.total - (before?.[r.pid] || 0);
      if (gain) { li.querySelector('.gain').textContent = `+${gain}`; li.classList.add('gained'); }
      countUp(li.querySelector('.total'), before?.[r.pid] || 0, r.total, reduce ? 0 : 1100);
      const moved = oldRank.get(r.pid) - r.rank;
      li.classList.toggle('up', ranked && moved > 0);
      li.classList.toggle('down', ranked && moved < 0);
    }
    if (reduce) return;
    for (const [pid, li] of items) {
      const dy = first.get(pid) - li.getBoundingClientRect().top;
      if (!dy) continue;
      li.style.transition = 'none';
      li.style.transform = `translateY(${dy}px)`;
      li.getBoundingClientRect();
      li.style.transition = '';
      li.style.transform = '';
    }
  }, delay);
}

function countUp(el, from, to, ms) {
  if (!ms || from === to) { el.textContent = to; return; }
  const start = performance.now();
  const step = t => {
    const k = Math.min(1, (t - start) / ms), eased = 1 - (1 - k) ** 3;
    el.textContent = Math.round(from + (to - from) * eased);
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function confetti(count = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const shades = ['#f6cf7a', '#e8b45a', '#fff1c9', '#c98f2e', '#e8455f'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = shades[i % shades.length];
    s.style.animationDelay = Math.random() * 0.8 + 's';
    s.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
    s.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    s.style.setProperty('--x', (Math.random() * 30 - 15) + 'vw');
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4500);
}

// Petit retour flottant (+1, −1) au-dessus d'un élément.
export function floatText(anchor, text, kind = 'good') {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = `float ${kind}`;
  el.textContent = text;
  el.style.left = r.left + r.width / 2 + 'px';
  el.style.top = r.top + r.height * 0.35 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

export function flash(el, kind) {
  if (!el) return;
  el.classList.remove('flash-good', 'flash-bad');
  void el.offsetWidth;
  el.classList.add(kind === 'good' ? 'flash-good' : 'flash-bad');
}
