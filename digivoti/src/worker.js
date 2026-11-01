// QR-digivõti: Cloudflare Worker. Lehed ja staatika serveerib Worker, kõik andmed ja õigusreeglid on Durable Objectis
// Digivoti (src/voti.js). Eraldi projekt: ei impordi repo juurkausta src/-st. Sõltuvusi pole.
import { Digivoti } from './voti.js';
import { appLeht, adminLeht, ekraanLeht, demoUksLeht, demoAutomaatLeht } from './lehed.js';
import { JSQR_JS } from './jsqr.js';

export { Digivoti };

const KOOD = '([0-9A-HJKMNP-TV-Z]{12})';
const RE_O = new RegExp(`^/O/${KOOD}/?$`, 'i');
const RE_EKRAAN = new RegExp(`^/ekraan/${KOOD}/?$`, 'i');
const RE_DEMO_UKS = new RegExp(`^/demo/uks/${KOOD}/?$`, 'i');
const RE_DEMO_AUT = new RegExp(`^/demo/automaat/${KOOD}/?$`, 'i');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const tee = url.pathname;
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (tee === '/' || tee === '/index.html') return html(appLeht);
      if (tee === '/kutse') return html(appLeht, { kutse: true });
      let m;
      if ((m = RE_O.exec(tee))) return html(appLeht, { kood: m[1].toUpperCase(), d: (url.searchParams.get('d') || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8) });
      if (tee === '/admin') return html(adminLeht);
      if ((m = RE_EKRAAN.exec(tee))) return html(ekraanLeht, { kood: m[1].toUpperCase() });
      if ((m = RE_DEMO_UKS.exec(tee))) return html(demoUksLeht, { kood: m[1].toUpperCase() });
      if ((m = RE_DEMO_AUT.exec(tee))) return html(demoAutomaatLeht, { kood: m[1].toUpperCase() });
      if (tee === '/jsqr.js') return new Response(JSQR_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
      if (tee === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    }
    if (tee.startsWith('/api/')) {
      if (!env.DIGIVOTI) return new Response('DIGIVOTI binding puudub', { status: 500 });
      // Kliendi IP-d ei salvestata: DO saab ainult soolatud räsi (piirangute jaoks). Kliendi saadetud päis kirjutatakse üle.
      const h = new Headers(request.headers);
      h.set('X-IP-Rasi', await ipRasi(env, request.headers.get('CF-Connecting-IP') || ''));
      const stub = env.DIGIVOTI.get(env.DIGIVOTI.idFromName('firma'));
      return stub.fetch(new Request(request, { headers: h }));
    }
    return new Response('Ei leitud', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

// IPv6: /64 prefiks
export function ipPrefiks(ip) {
  if (!ip.includes(':')) return ip;
  const [a, b = ''] = ip.toLowerCase().split('::');
  const vasak = a ? a.split(':') : [], parem = ip.includes('::') && b ? b.split(':') : [];
  const taidis = ip.includes('::') ? Array(Math.max(0, 8 - vasak.length - parem.length)).fill('0') : [];
  return [...vasak, ...taidis, ...parem].map((x) => (parseInt(x, 16) || 0).toString(16)).slice(0, 4).join(':') + '::/64';
}
async function ipRasi(env, ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.TOKEN_SECRET || 'qrdigivoti'}|${ipPrefiks(ip)}`));
  return [...new Uint8Array(d).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function html(leht, andmed = {}) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  return new Response(leht(nonce, andmed), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(self), geolocation=(), microphone=()',
    },
  });
}
