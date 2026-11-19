// Outils communs à l'écran animateur et au téléphone.
const roomParam = new URLSearchParams(location.search).get('r');
export const isHost = roomParam === null;
export const app = document.querySelector('#app');
export const $ = id => document.getElementById(id);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');

export const storage = {
  load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* navigation privée : pas de reprise */ } },
};

export const S = {
  key: isHost ? 'beaujolais.host.v3' : `beaujolais.player.v3.${String(roomParam).toLowerCase()}`,
  session: null, state: null, offset: 0, busy: false,
};
S.session = storage.load(S.key) || (isHost ? { token: newToken() } : { token: newToken(), pid: newToken(), room: String(roomParam).toLowerCase() });
storage.save(S.key, S.session);

export const now = () => Date.now() + S.offset;
export const secondsLeft = at => Math.max(0, Math.ceil((at - now()) / 1000));

export async function api(path, values = {}) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('/api/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...S.session, ...values }), signal: controller.signal,
    });
    const data = await response.json().catch(() => ({ error: 'Réponse illisible du serveur.' }));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Erreur'), { status: response.status });
    if (data.now) {
      // Décalage d'horloge lissé : on garde la mesure la plus fiable (aller-retour le plus court).
      const rtt = Date.now() - start, offset = data.now - Math.round((start + Date.now()) / 2);
      if (!S.rtt || rtt <= S.rtt * 1.5) { S.offset = S.rtt ? Math.round(S.offset * 0.6 + offset * 0.4) : offset; S.rtt = Math.min(S.rtt || rtt, rtt); }
    }
    return data;
  } finally { clearTimeout(timeout); }
}

// Pastille d'état en haut de l'écran.
let statusTimer;
export function status(text, kind = 'info', sticky = false) {
  const el = $('status');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = !text;
  clearTimeout(statusTimer);
  if (!sticky && text) statusTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

// Remplace le contenu seulement quand l'écran change vraiment (évite de perdre le focus ou les animations).
let screenKey = '';
export function show(key, html, root = app) {
  if (screenKey === key) return false;
  screenKey = key;
  root.innerHTML = html;
  root.scrollTop = 0;
  return true;
}
export const resetScreen = () => { screenKey = ''; };

export const vibrate = pattern => { try { navigator.vibrate?.(pattern); } catch { /* sans vibration */ } };
export const plural = (n, word, many = word + 's') => `${n} ${Math.abs(n) > 1 ? many : word}`;
