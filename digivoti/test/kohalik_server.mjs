// Kohalik proovikeskkond ilma wranglerita: sama worker.fetch + Durable Object, mälus storage (andmed kaovad
// serveri sulgemisel). Käivitus: node test/kohalik_server.mjs  →  http://localhost:8787
// Halduse võti: keskkonnamuutuja ADMIN_TOKEN või juhuslik (trükitakse konsooli). Ainult kohalikuks proovimiseks.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import worker, { Digivoti } from '../src/worker.js';
import { Mal } from './abi.js';

const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || randomBytes(18).toString('base64url');
const env = { ADMIN_TOKEN, TOKEN_SECRET: randomBytes(18).toString('hex'), PBKDF2_ITER: '10000' };
const dv = new Digivoti({ storage: new Mal() }, env);
env.DIGIVOTI = { idFromName: () => 'firma', get: () => ({ fetch: (r) => dv.fetch(r) }) };

http.createServer(async (req, res) => {
  try {
    const kehad = [];
    for await (const c of req) kehad.push(c);
    const h = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') h.set(k, v);
    h.set('CF-Connecting-IP', req.socket.remoteAddress || '127.0.0.1');
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(kehad);
    const r = await worker.fetch(new Request(`http://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers: h, body }), env, {});
    const valja = {};
    r.headers.forEach((v, k) => { valja[k] = v; });
    res.writeHead(r.status, valja);
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('viga');
  }
}).listen(PORT, () => {
  console.log(`QR-digivõti kohalikult: http://localhost:${PORT}  (haldus: /admin)`);
  console.log(`ADMIN_TOKEN=${ADMIN_TOKEN}`);
});
