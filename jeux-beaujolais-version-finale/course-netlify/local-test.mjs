// Test sur ton ordinateur, sans rien déployer : node local-test.mjs, puis http://localhost:4173
// Simule Netlify Blobs en mémoire (avec les mêmes règles d'écriture conditionnelle). Les données disparaissent à l'arrêt.
// Ce fichier n'est jamais servi en production (hors de public/ et de netlify/functions/).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './netlify/lib/game-logic.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const mem = new Map();
let etag = 0;
const store = {
  async get(key) { const v = mem.get(key); return v ? JSON.parse(v.data) : null; },
  async getWithMetadata(key) { const v = mem.get(key); return v ? { data: JSON.parse(v.data), etag: v.etag } : null; },
  async setJSON(key, data, opts = {}) {
    const cur = mem.get(key);
    if (opts.onlyIfNew && cur) return { modified: false };
    if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
    mem.set(key, { data: JSON.stringify(data), etag: 'e' + (++etag) });
    return { modified: true };
  },
  async delete(key) { mem.delete(key); },
};
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      const out = await handle(request, store);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(await out.text());
      return;
    }
    const file = path.join(root, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file)) { res.writeHead(404); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Erreur serveur');
  }
}).listen(PORT, () => console.log(`Les Jeux du Beaujolais : http://localhost:${PORT} (écran animateur). Ctrl+C pour arrêter.`));
