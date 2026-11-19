// Point d'entrée : boucle de synchronisation (polling HTTP) et rendu régulier.
import { S, isHost, api, $, show, status, storage, resetScreen, newToken, esc } from './core.mjs';
import { renderHost, hostDelay } from './host.mjs';
import { renderPhone, phoneDelay } from './phone.mjs';

document.body.classList.toggle('phone', !isHost);
document.body.classList.toggle('host', isHost);
if (!isHost) $('title')?.removeAttribute('href');

let failures = 0, fatal = null, timer = null;

function render() {
  if (fatal) return;
  try { isHost ? renderHost() : renderPhone(); }
  catch (e) { console.error(e); }
}

function fatalScreen(error) {
  fatal = error;
  const lost = error.status === 403 || error.status === 404;
  show('fatal', `<section class="card center-msg fatal">
    <div class="big-emoji" aria-hidden="true">🍷</div>
    <h2>${lost ? 'Partie introuvable' : 'Connexion impossible'}</h2>
    <p>${esc(error.message || '')}</p>
    ${isHost ? (lost ? '<button class="primary huge" id="fresh">Créer une nouvelle partie</button>' : '<button class="primary" id="retry">Réessayer</button>')
      : lost ? '<p class="muted">Demande le nouveau QR code à l’animateur.</p>' : '<button class="primary" id="retry">Réessayer</button>'}
  </section>`);
  if ($('fresh')) $('fresh').onclick = () => { S.session = { token: newToken() }; storage.save(S.key, S.session); restart(); };
  if ($('retry')) $('retry').onclick = restart;
}

function restart() { fatal = null; failures = 0; resetScreen(); clearTimeout(timer); poll(); }

async function poll() {
  clearTimeout(timer);
  let delay = 3000;
  try {
    if (isHost && !S.session.room) {
      const { room } = await api('create');
      S.session.room = room;
      storage.save(S.key, S.session);
    }
    const next = isHost ? await api('host', { action: 'poll' }) : await api('player');
    // Côté animateur, on ignore une réponse plus ancienne que celle déjà affichée (commande passée entre-temps).
    if (!isHost || !S.state || (next.revision ?? 0) >= (S.state.revision ?? 0)) S.state = next;
    if (failures >= 2) status('Connexion rétablie', 'ok');
    failures = 0;
    render();
    delay = isHost ? hostDelay(S.state) : phoneDelay(S.state);
  } catch (e) {
    failures++;
    if (e.status === 403 || e.status === 404) return fatalScreen(e);
    if (!S.state && failures >= 4) return fatalScreen(e);
    if (failures >= 2) status('Connexion instable… nouvel essai', 'warn', true);
    delay = Math.min(6000, 1000 * failures);
  }
  timer = setTimeout(poll, delay);
}

// Quand on revient sur l'onglet (téléphone mis en veille), on resynchronise tout de suite.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !fatal) poll(); });

setInterval(render, 150);
show('loading', '<p class="loading">Chargement…</p>');
poll();
