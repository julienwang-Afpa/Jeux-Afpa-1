// Plateaux partagés par le projecteur et les téléphones : Bataille royale, Le bon tonneau.
import { esc } from './core.mjs';
import { luckyRules, BARREL } from './games.mjs';

const f = n => Math.round(n * 1000) / 1000;

// ---------- Bataille royale ----------
// Repère : x vers la droite, y vers le bas, disque de rayon 1. Le serveur utilise les mêmes axes.
export function arenaSVG(stage, players, { me, mine, labels = true } = {}) {
  const byPid = new Map(players.map(p => [p.pid, p]));
  const hit = stage.hit, parts = [];
  parts.push(`<defs><clipPath id="field"><circle r="1.08"/></clipPath></defs>`);
  parts.push(`<circle class="field" r="1"/>`);
  parts.push(`<circle class="zone" r="${stage.zone}"/>`);
  const reveal = stage.phase === 'reveal' && stage.reveal;
  if (reveal) {
    if (reveal.shrink && stage.survivors.length > 1) parts.push(`<circle class="next-zone" r="${stage.nextZone}"/>`);
    reveal.shots.forEach((s, i) => {
      const p = byPid.get(s.pid) || { color: '#999', name: '?' };
      const [x, y] = s.pos, dx = Math.cos(s.angle), dy = Math.sin(s.angle);
      const lost = reveal.lost.includes(s.pid), blocked = reveal.blocked.includes(s.pid);
      const len = Math.min(s.length, 2.6);
      parts.push(`<g class="shooter ${s.pid === me ? 'me' : ''}" style="--d:${(i * 0.06).toFixed(2)}s">
        <line class="aim" x1="${x}" y1="${y}" x2="${f(x + dx * 0.32)}" y2="${f(y + dy * 0.32)}" stroke="${esc(p.color)}"/>
        <line class="shot" clip-path="url(#field)" x1="${x}" y1="${y}" x2="${f(x + dx * len)}" y2="${f(y + dy * len)}" pathLength="1"/>
        <circle class="dot ${lost ? 'lost' : ''} ${blocked ? 'blocked' : ''}" cx="${x}" cy="${y}" r="${hit}" fill="${esc(p.color)}"/>
        ${blocked ? `<circle class="shield-burst" cx="${x}" cy="${y}" r="${f(hit + 0.04)}"/>` : ''}
        ${lost ? `<g class="cross"><line x1="${f(x - hit * .7)}" y1="${f(y - hit * .7)}" x2="${f(x + hit * .7)}" y2="${f(y + hit * .7)}"/><line x1="${f(x + hit * .7)}" y1="${f(y - hit * .7)}" x2="${f(x - hit * .7)}" y2="${f(y + hit * .7)}"/></g>` : ''}
        ${labels ? `<text x="${x}" y="${f(y + hit + 0.1)}">${esc(p.name)}${s.auto ? ' ⚙' : ''}</text>` : ''}
      </g>`);
    });
  } else if (mine?.pos) {
    // Pendant la préparation, chacun ne voit que sa propre position et sa visée.
    const p = byPid.get(me) || { color: '#fff' };
    const [x, y] = mine.pos;
    if (Number.isFinite(mine.angle)) {
      const dx = Math.cos(mine.angle), dy = Math.sin(mine.angle);
      parts.push(`<line class="my-aim" clip-path="url(#field)" x1="${x}" y1="${y}" x2="${f(x + dx * 2.4)}" y2="${f(y + dy * 2.4)}"/>`);
    }
    parts.push(`<circle class="dot mine" cx="${x}" cy="${y}" r="${hit}" fill="${esc(p.color)}"/>`);
    if (shieldOf(stage, me)) parts.push(`<circle class="shield-ring" cx="${x}" cy="${y}" r="${f(hit + 0.04)}"/>`);
  }
  return `<svg class="arena-svg ${reveal ? 'revealing' : ''}" viewBox="-1.12 -1.12 2.24 2.24" role="img" aria-label="Terrain de la bataille">${parts.join('')}</svg>`;
}
export const shieldOf = (stage, pid) => stage.shields?.includes(pid);

export function arenaSummary(stage, players) {
  if (stage.phase !== 'reveal' || !stage.reveal) return '';
  const name = pid => esc(players.find(p => p.pid === pid)?.name || '?');
  const { lost, blocked, shrink } = stage.reveal;
  return `<div class="arena-summary">
    <p class="${lost.length ? 'bad' : ''}">${lost.length ? `💥 Éliminé${lost.length > 1 ? 's' : ''} : ${lost.map(name).join(', ')}` : '😮 Personne n’est touché ce tour-ci'}</p>
    ${blocked.length ? `<p>🛡️ Bouclier perdu : ${blocked.map(name).join(', ')}</p>` : ''}
    ${shrink && stage.survivors.length > 1 ? '<p>⚠️ La zone rétrécit au prochain tour</p>' : ''}
  </div>`;
}

// ---------- Le bon tonneau ----------
export function barrelCount(stage) { return stage.rule === 'final' ? 9 : 5; }

export function barrelsHTML(stage, players, { pick, interactive = false, me } = {}) {
  const n = barrelCount(stage), rv = stage.phase === 'reveal' ? stage.reveal : null;
  const final = stage.rule === 'final';
  const items = [];
  for (let i = 0; i < n; i++) {
    let label = '', cls = '';
    if (rv) {
      if (final) { const boom = rv.boom.includes(i); label = boom ? '💥' : '✓'; cls = boom ? 'bad' : 'good'; }
      else { const v = rv.values[i]; label = v > 0 ? `+${v}` : v < 0 ? `${v}` : '0'; cls = v > 0 ? (v >= 3 ? 'great' : 'good') : v < 0 ? 'bad' : 'zero'; }
    }
    const who = rv ? Object.entries(rv.chosen || {}).filter(([, v]) => v === i).map(([pid]) => players.find(p => p.pid === pid)).filter(Boolean) : [];
    items.push(`<button type="button" class="barrel ${cls} ${pick === i ? 'picked' : ''}" data-barrel="${i}" ${interactive ? '' : 'disabled'} aria-pressed="${pick === i}" aria-label="Tonneau ${i + 1}">
      <span class="barrel-art" aria-hidden="true">${BARREL}</span><span class="barrel-num">${i + 1}</span>
      ${rv ? `<span class="barrel-value">${label}</span>` : ''}
      ${who.length ? `<span class="barrel-who">${who.map(p => `<i title="${esc(p.name)}" style="--c:${esc(p.color)}" class="${p.pid === me ? 'me' : ''}"></i>`).join('')}</span>` : ''}
    </button>`);
  }
  if (stage.rule === 'gamble') {
    const v = rv?.values?.[5];
    const who = rv ? Object.entries(rv.chosen || {}).filter(([, x]) => x === 5).length : 0;
    items.push(`<button type="button" class="barrel secure ${pick === 5 ? 'picked' : ''} ${rv ? 'good' : ''}" data-barrel="5" ${interactive ? '' : 'disabled'} aria-pressed="${pick === 5}">
      <span class="barrel-art" aria-hidden="true">🔒</span><span class="barrel-num">Sécuriser</span>${rv ? `<span class="barrel-value">+${v}</span>` : ''}${who ? `<span class="barrel-who count">${who} joueur${who > 1 ? 's' : ''}</span>` : ''}
    </button>`);
  }
  return `<div class="barrels ${final ? 'final' : ''}">${items.join('')}</div>`;
}

export const luckyTitle = stage => `<div class="lucky-rule"><b>${esc(luckyRules[stage.rule][0])}</b><span>${esc(luckyRules[stage.rule][1])}</span></div>`;

export function livesHTML(stage, players, me) {
  if (stage.rule !== 'final') return '';
  const rows = players.filter(p => p.pid in stage.lives).sort((a, b) => stage.lives[b.pid] - stage.lives[a.pid]);
  return `<ul class="lives">${rows.map(p => {
    const n = stage.lives[p.pid];
    return `<li class="${n <= 0 ? 'out' : ''} ${p.pid === me ? 'me' : ''}" style="--c:${esc(p.color)}"><i></i><span>${esc(p.name)}</span><b>${n > 0 ? '❤️'.repeat(n) : '💀'}</b></li>`;
  }).join('')}</ul>`;
}
