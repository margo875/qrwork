// QR-töökoht: Cloudflare Worker. Lehed ja staatika serveerib Worker, kõik andmed ja reeglid on Durable Objectis
// Register (src/register.js). Sõltuvusi pole.
import { Register } from './register.js';
import { appLeht, adminLeht } from './lehed.js';
import { JSQR_JS } from './jsqr.js';
import { privaatsusLeht, tingimusedLeht, andmedEL } from './oigus.js';

export { Register };

// Vana aadress suunab uuele (advisor teadmised/krativara/03 „Avatud küsimused“ p 6.6; KAVA „Nimi“): kratt.kindavel.ee → krativara.kindavel.ee
export const VANAD_HOSTID = { 'kratt.kindavel.ee': 'krativara.kindavel.ee' };
const BOT_UA = /\b(bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|skype|linkedin|bingpreview|google-?inspectiontool)\b/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const uusHost = VANAD_HOSTID[url.hostname];
    if (uusHost) { url.hostname = uusHost; return Response.redirect(url.toString(), 308); }
    const tee = url.pathname;
    const m = /^\/([SKIski])\/([0-9A-Za-z]{12})\/?$/.exec(tee);
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (tee === '/' || tee === '/index.html') return html(appLeht);
      if (m) return html(appLeht, { [{ S: 'seade', K: 'koht', I: 'info' }[m[1].toUpperCase()]]: m[2].toUpperCase() });
      if (tee === '/admin') return html(adminLeht);
      if ((tee === '/privaatsus' || tee === '/tingimused') && env.REGISTER) {
        const r = await registerStub(env).fetch(new Request(new URL('/api/oigus', url), { method: 'GET' }));
        const info = await r.json();
        return html(tee === '/privaatsus' ? privaatsusLeht(info) : tingimusedLeht(info));
      }
      if (tee === '/jsqr.js') return new Response(JSQR_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
      if (tee === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    }
    if (tee.startsWith('/api/')) {
      if (tee === '/api/leid' && BOT_UA.test(request.headers.get('User-Agent') || '')) return new Response('{"ok":false}', { status: 403 });
      if (!env.REGISTER) return new Response('REGISTER binding puudub', { status: 500 });
      // Kliendi IP-d ei salvestata: DO saab ainult soolatud räsi (piirangute jaoks). Kliendi enda saadetud päis kirjutatakse üle.
      const h = new Headers(request.headers);
      h.set('X-IP-Rasi', await ipRasi(env, request.headers.get('CF-Connecting-IP') || ''));
      const req = new Request(request, { headers: h });
      return registerStub(env).fetch(req);
    }
    return new Response('Ei leitud', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

// Andmete asukoht: ANDMETE_ASUKOHT = "eu" (wrangler.toml [vars]) → Durable Object EL-i jurisdiktsioonis
// (advisor teadmised/krativara/03 „Avatud küsimused“ p 1 ja p 6.5). NB: jurisdiktsiooni muutmine annab uue, tühja
// andmebaasi; vana jääb alles ja on tagasi kasutusel, kui seade eemaldada.
function registerStub(env) {
  if (andmedEL(env) && !env.REGISTER.jurisdiction) throw new Error('ANDMETE_ASUKOHT=eu, kuid Durable Objecti jurisdiktsioon ei ole saadaval');
  const ns = andmedEL(env) ? env.REGISTER.jurisdiction('eu') : env.REGISTER;
  return ns.get(ns.idFromName('firma'));
}

// IPv6: /64 prefiks pärast „::“ lahtikirjutamist (L3: kokkusurutud kuju andis muidu erineva võtme)
export function ipPrefiks(ip) {
  if (!ip.includes(':')) return ip;
  const [a, b = ''] = ip.toLowerCase().split('::');
  const vasak = a ? a.split(':') : [], parem = ip.includes('::') && b ? b.split(':') : [];
  const taidis = ip.includes('::') ? Array(Math.max(0, 8 - vasak.length - parem.length)).fill('0') : [];
  const osad = [...vasak, ...taidis, ...parem].map((x) => (parseInt(x, 16) || 0).toString(16));
  return osad.slice(0, 4).join(':') + '::/64';
}
async function ipRasi(env, ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.TOKEN_SECRET || 'qrwork'}|${ipPrefiks(ip)}`));
  return [...new Uint8Array(d).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function html(leht, andmed = {}) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const sisu = leht(nonce, andmed);
  return new Response(sisu, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
    },
  });
}
