// QR-töökoht: Cloudflare Worker. Lehed ja staatika serveerib Worker, kõik andmed ja reeglid on Durable Objectis
// Register (src/register.js). Sõltuvusi pole.
import { Register } from './register.js';
import { appLeht, adminLeht, devLeht } from './lehed.js';
import { JSQR_JS } from './jsqr.js';
import { IKOON_192, IKOON_512, IKOON_180 } from './ikoonid.js';
import { VERSIOON } from './versioon.js';
import { FONDID } from './fondid.js';

export { Register };

// Botifilter (leiamind'ist): „bot“ ainult eraldiseisva sõnana (telefonibränd CUBOT ei sobi), lisaks eelvaated ja skriptid
export const BOT_UA = new RegExp([
  'crawler|spider|scraper|slurp|(?<![a-z])bot(?![a-z])',
  '(googlebot|bingbot|applebot|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|yandexbot|baiduspider|petalbot|semrushbot|ahrefsbot|duckduckbot|facebot|mj12bot)',
  'facebookexternalhit|whatsapp|slack-imgproxy|skypeuripreview|bingpreview|linkpreview|embedly|google-inspectiontool|google-read-aloud',
  '(^|[^a-z])(curl|wget)/|python-requests|go-http-client|headlesschrome',
].join('|'), 'i');
const LEIDJA_POST = new Set(['/api/leid', '/api/asukoht', '/api/helista']);
// IP-põhine koht ainult serveri request.cf-ist: „linn, regioon, riik (teenusepakkuja)“
const cfTekst = (x) => (typeof x === 'string' || typeof x === 'number' ? String(x).replace(/\s+/g, ' ').trim() : '');
export function ipKohtTekst(cf = {}) {
  const osad = [cf.city, cf.region, cf.country].map(cfTekst).filter(Boolean);
  const org = cfTekst(cf.asOrganization);
  const koht = osad.length ? osad.join(', ') : 'teadmata';
  return (org ? `${koht} (${org})` : koht).slice(0, 160);
}

// Versioon: VERSIOON (käsitsi, src/versioon.js) + deploy'i id (CF_VERSION, wrangler.toml [version_metadata]; muutub iga deploy'ga)
export const versioon = (env) => ({ v: VERSIOON, id: String(env.CF_VERSION?.id || '').slice(0, 8) });
const MANIFEST = JSON.stringify({
  name: 'K | Krativara', short_name: 'K | Krativara', lang: 'et', start_url: '/', scope: '/', display: 'standalone',
  background_color: '#FAF9F6', theme_color: '#FAF9F6',
  icons: ['any', 'maskable'].flatMap((purpose) => [{ src: '/ikoon-192.png', sizes: '192x192', type: 'image/png', purpose }, { src: '/ikoon-512.png', sizes: '512x512', type: 'image/png', purpose }]),
});
const IKOONID = { '/ikoon-192.png': IKOON_192, '/ikoon-512.png': IKOON_512, '/apple-touch-icon.png': IKOON_180 };
const png = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const tee = url.pathname;
    const m = /^\/([SKIski])\/([0-9A-Za-z]{12})\/?$/.exec(tee);
    if (request.method === 'GET' || request.method === 'HEAD') {
      const ver = versioon(env);
      if (tee === '/' || tee === '/index.html') return html(appLeht, { ver });
      if (m) return html(appLeht, { ver, [{ S: 'seade', K: 'koht', I: 'info' }[m[1].toUpperCase()]]: m[2].toUpperCase() });
      if (tee === '/admin') return html(adminLeht, { ver });
      if (tee === '/dev') return html(devLeht, { ver });
      if (tee === '/api/versioon') return new Response(JSON.stringify(ver), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
      if (tee === '/manifest.webmanifest') return new Response(MANIFEST, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
      const fm = /^\/fondid\/([a-z0-9-]+\.woff2)$/.exec(tee);
      if (fm && FONDID[fm[1]]) return new Response(png(FONDID[fm[1]]), { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' } });
      if (IKOONID[tee]) return new Response(png(IKOONID[tee]), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
      if (tee === '/jsqr.js') return new Response(JSQR_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
      if (tee === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    }
    if (tee.startsWith('/api/')) {
      const bot = BOT_UA.test(request.headers.get('User-Agent') || '');
      if (bot && LEIDJA_POST.has(tee)) return new Response('{"ok":false}', { status: 403 });
      if (!env.REGISTER) return new Response('REGISTER binding puudub', { status: 500 });
      // Kliendi IP-d ei salvestata: DO saab ainult soolatud räsi (piirangute jaoks). Kliendi enda saadetud päis kirjutatakse üle.
      const h = new Headers(request.headers);
      h.set('X-IP-Rasi', await ipRasi(env, request.headers.get('CF-Connecting-IP') || ''));
      h.set('X-Bot', bot ? '1' : '0');
      h.set('X-IP-Koht', encodeURIComponent(ipKohtTekst(request.cf || {})));
      const req = new Request(request, { headers: h });
      const stub = env.REGISTER.get(env.REGISTER.idFromName('firma'));
      return stub.fetch(req);
    }
    return new Response('Ei leitud', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

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
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; font-src 'self'; connect-src 'self'; manifest-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
    },
  });
}
