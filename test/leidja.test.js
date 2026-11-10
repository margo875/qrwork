// Leidja voog (üle võetud leiamind'ist 02.11.2026): skännitoken, skännimisteade, automaatne asukoht 1 tokeni kohta,
// sendBeacon ilma X-QW päiseta, tekstipiirid, foto ainult Telegrami, IP-koht ilma kaardilingita, Helista, halduse testteade.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, admin } from './abi.js';
import { looToken, kehtivToken } from '../src/register.js';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let saadetud = [], tgVastus = null, algFetch;
beforeEach(() => {
  saadetud = []; tgVastus = null; algFetch = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    const u = String(url);
    let keha = o.body;
    if (typeof keha === 'string') { try { keha = JSON.parse(keha); } catch { /* tekst */ } }
    saadetud.push({ url: u, meetod: u.split('/').pop(), keha });
    if (tgVastus && u.includes('api.telegram.org')) return new Response(JSON.stringify(tgVastus), { status: 400 });
    return new Response('{"ok":true}', { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = algFetch; });
const tg = (m) => saadetud.filter((x) => x.meetod === m);
const oota = () => new Promise((r) => setTimeout(r, 5));

function paring(env, tee, { keha, pais = {}, ip = '1.2.3.4', ua = ANDROID, cf = { city: 'Tõrva', region: 'Valgamaa', country: 'EE', asOrganization: 'Telia Eesti' }, toor } = {}) {
  const h = { 'User-Agent': ua, 'CF-Connecting-IP': ip, ...pais };
  if (keha !== undefined && !('Content-Type' in h)) { h['Content-Type'] = 'application/json'; h['X-QW'] = '1'; }
  const req = new Request('https://t.ee' + tee, { method: 'POST', headers: h, body: toor !== undefined ? toor : JSON.stringify(keha || {}) });
  Object.defineProperty(req, 'cf', { value: cf });
  return worker.fetch(req, env, {}).then(async (r) => ({ status: r.status, j: await r.json().catch(() => null) }));
}
async function alus(lisa = {}) {
  const k = keskkond({ TG_BOT_TOKEN: '123456:ABCDEFGHIJKLMNOP', TG_CHAT_ID: '987654', ...lisa });
  const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu' })).j.koht;
  const s = (await A('seade', { nimi: 'Nivelliir', invnr: 'INV-1', asukoht: koht.kood })).j.seade;
  saadetud = [];
  return { ...k, A, s };
}

test('token: olekuta, 1 h, võltsimine ja vale kood ei kehti', async () => {
  const env = { TOKEN_SECRET: 's'.repeat(20) };
  const t = await looToken(env, 'ABCDEFGHJK01', 1e12);
  assert.equal(await kehtivToken(env, t, 1e12 + 3599e3), 'ABCDEFGHJK01');
  assert.equal(await kehtivToken(env, t, 1e12 + 3601e3), null, 'aegunud');
  assert.equal(await kehtivToken(env, t.replace('ABCDEFGHJK01', 'ABCDEFGHJK02'), 1e12), null, 'teine kood');
  assert.equal(await kehtivToken({ TOKEN_SECRET: 'x'.repeat(20) }, t, 1e12), null, 'teine saladus');
  await assert.rejects(looToken({}, 'ABCDEFGHJK01'), /TOKEN_SECRET/);
});

test('skännimine: teade kohe (aeg, IP-koht, seade), kaardilingita; korduv ja bot ei teavita; IP-d ei salvestata', async () => {
  const { env, s, storage } = await alus();
  const r = await paring(env, '/api/avalik', { keha: { kood: s.kood }, pais: { 'X-IP-Koht': 'Võlts', 'Sec-CH-UA-Platform': '"Android"' } });
  assert.equal(r.status, 200); assert.ok(r.j.token);
  await oota();
  const m = tg('sendMessage');
  assert.equal(m.length, 1);
  const t = m[0].keha.text;
  assert.match(t, /Silti skänniti: Nivelliir \(INV-1\)/);
  assert.match(t, /IP järgi, umbkaudne\): Tõrva, Valgamaa, EE \(Telia Eesti\)/);
  assert.doesNotMatch(t, /Võlts/, 'kliendi X-IP-Koht kirjutatakse üle');
  assert.match(t, /Seade: Android, Chrome/);
  assert.doesNotMatch(t, /maps\.google/);
  assert.equal(tg('sendLocation').length, 0);
  await paring(env, '/api/avalik', { keha: { kood: s.kood } });
  await paring(env, '/api/avalik', { keha: { kood: s.kood }, ip: '9.9.9.9', ua: 'WhatsApp/2.23' });
  await oota();
  assert.equal(tg('sendMessage').length, 1, 'sama IP minuti jooksul ja bot: teadet pole');
  const logi = [...storage.m.values()].filter((x) => x && x.tyyp === 'skann');
  assert.equal(logi.length, 1);
  assert.ok(!JSON.stringify([...storage.m.entries()]).includes('1.2.3.4'), 'IP-d ei salvestata');
});

test('automaatne asukoht: 1 kord tokeni kohta, sendBeacon (text/plain, ilma X-QW) töötab, teade ±N m + kaart + sendLocation', async () => {
  const { env, s } = await alus();
  const { token } = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  saadetud = [];
  const b = JSON.stringify({ token, lat: 58.0123456, lon: 25.9, tapsus: 12.4, pos_vanus: 3 });
  const r = await paring(env, '/api/asukoht', { toor: b, pais: { 'Content-Type': 'text/plain' } });
  assert.equal(r.status, 200); assert.equal(r.j.teavitatud, true);
  await oota();
  assert.match(tg('sendMessage')[0].keha.text, /📍 ±12 m: Nivelliir/);
  assert.match(tg('sendMessage')[0].keha.text, /maps\.google\.com\/\?q=58\.012346,25\.9/);
  assert.equal(tg('sendLocation').length, 1);
  assert.equal((await paring(env, '/api/asukoht', { toor: b, pais: { 'Content-Type': 'text/plain' } })).status, 409, 'teist korda sama tokeniga ei saa');
  assert.equal((await paring(env, '/api/asukoht', { toor: JSON.stringify({ token: token + 'x', lat: 1, lon: 1 }), pais: { 'Content-Type': 'text/plain' } })).status, 403);
  const t2 = (await paring(env, '/api/avalik', { keha: { kood: s.kood }, ip: '5.5.5.5' })).j.token;
  assert.equal((await paring(env, '/api/asukoht', { toor: JSON.stringify({ token: t2, lat: 91, lon: 1 }), pais: { 'Content-Type': 'text/plain' }, ip: '5.5.5.5' })).status, 400, 'vigane koordinaat');
  assert.equal((await paring(env, '/api/asukoht', { toor: b, pais: { 'Content-Type': 'text/plain' }, ua: 'curl/8.0' })).status, 403, 'bot');
});

test('vorm: tekst ≤ 400 ja kontakt ≤ 100 (pikem tagasi), IP-koht ilma kaardilingita kui asukohta pole', async () => {
  const { env, s } = await alus();
  const { token } = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  assert.equal((await paring(env, '/api/leid', { keha: { token, tekst: 'x'.repeat(401) } })).status, 400);
  assert.equal((await paring(env, '/api/leid', { keha: { token, tekst: 'ok', kontakt: 'y'.repeat(101) } })).status, 400);
  assert.equal((await paring(env, '/api/leid', { keha: { token } })).status, 400, 'tühi');
  assert.equal((await paring(env, '/api/leid', { toor: JSON.stringify({ token, tekst: 'a' }), pais: { 'Content-Type': 'application/json' } })).status, 403, 'X-QW puudub');
  saadetud = [];
  const r = await paring(env, '/api/leid', { keha: { token, tekst: 'x'.repeat(400), kontakt: 'Mari 5555', puudub: 'luba' } });
  assert.equal(r.status, 200); assert.equal(r.j.teavitatud, true);
  await oota();
  const t = tg('sendMessage')[0].keha.text;
  assert.match(t, /Leiuteade: Nivelliir/); assert.match(t, /Kontakt: Mari 5555/);
  assert.match(t, /Täpset asukohta ei saadetud \(luba keelatud\); umbkaudu IP järgi: Tõrva/);
  assert.doesNotMatch(t, /maps\.google/); assert.equal(tg('sendLocation').length, 0);
});

test('vorm asukohaga: pärast automaatset asukohta teist kaardipunkti ei saadeta', async () => {
  const { env, s } = await alus();
  const { token } = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  saadetud = [];
  await paring(env, '/api/leid', { keha: { token, tekst: 'pingil', lat: 58.1, lon: 26.1, tapsus: 8, auto_saadetud: 1 } });
  await oota();
  assert.match(tg('sendMessage')[0].keha.text, /📍 ±8 m: https:\/\/maps/);
  assert.equal(tg('sendLocation').length, 0);
});

test('foto: multipart, läheb Telegrami sendPhoto, serverisse ei salvestata; vale tüüp 415; suur 413', async () => {
  const { env, s, storage } = await alus();
  const { token } = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  saadetud = [];
  const jpg = new Uint8Array(500); jpg.set([0xff, 0xd8, 0xff, 0xe0]);
  const fd = new FormData(); fd.append('tekst', 'kapis'); fd.append('foto_lat', '58.2'); fd.append('foto_lon', '26.2'); fd.append('foto', new Blob([jpg], { type: 'image/jpeg' }), 'f.jpg');
  const req = new Request('https://t.ee/api/leid', { method: 'POST', headers: { 'X-QW': '1', 'X-Leid-Token': token, 'User-Agent': ANDROID, 'CF-Connecting-IP': '1.2.3.4' }, body: fd });
  const r = await worker.fetch(req, env, {});
  const j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.foto, true);
  assert.equal(tg('sendPhoto').length, 1);
  assert.equal(tg('sendLocation')[0].keha.latitude, 58.2, 'kaardipunkt = foto asukoht');
  const kirje = [...storage.m.values()].find((x) => x && x.tyyp === 'leiuteade');
  assert.equal(kirje.leidja_foto, 500); assert.ok(!JSON.stringify(kirje).includes('255,216'));
  const fd2 = new FormData(); fd2.append('foto', new Blob([new Uint8Array(500)]), 'f.jpg');
  const r2 = await worker.fetch(new Request('https://t.ee/api/leid', { method: 'POST', headers: { 'X-QW': '1', 'X-Leid-Token': token, 'CF-Connecting-IP': '7.7.7.7', 'User-Agent': ANDROID }, body: fd2 }), env, {});
  assert.equal(r2.status, 415);
  const r3 = await worker.fetch(new Request('https://t.ee/api/leid', { method: 'POST', headers: { 'X-QW': '1', 'X-Leid-Token': token, 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(3 * 1024 * 1024), 'CF-Connecting-IP': '8.8.8.8', 'User-Agent': ANDROID }, body: 'x' }), env, {});
  assert.equal(r3.status, 413);
});

test('piirangud: IP kohta „oota minut“ (429), teised leidjad saavad saata', async () => {
  const { env, s } = await alus();
  const { token } = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  for (let i = 0; i < 3; i++) assert.equal((await paring(env, '/api/leid', { keha: { token, tekst: 'a' + i } })).status, 200);
  assert.equal((await paring(env, '/api/leid', { keha: { token, tekst: 'neljas' } })).status, 429);
  assert.equal((await paring(env, '/api/leid', { keha: { token, tekst: 'teine inimene' }, ip: '4.4.4.4' })).status, 200);
});

test('Helista: number seadetest või OMANIKU_TELEFON, teade omanikule, ilma numbrita 400', async () => {
  const { env, s, A } = await alus({ OMANIKU_TELEFON: '+37255512345' });
  const av = (await paring(env, '/api/avalik', { keha: { kood: s.kood } })).j;
  assert.equal(av.telefon, '+37255512345');
  saadetud = [];
  const r = await paring(env, '/api/helista', { toor: JSON.stringify({ token: av.token }), pais: { 'Content-Type': 'text/plain' } });
  assert.equal(r.status, 200);
  await oota();
  assert.match(tg('sendMessage')[0].keha.text, /Leidja vajutas „Helista“: Nivelliir/);
  await A('seaded', { firma: 'F', telefon: '5123 4567' });
  assert.equal((await paring(env, '/api/avalik', { keha: { kood: s.kood }, ip: '2.2.2.2' })).j.telefon, '+37251234567');
  const k2 = await alus();
  const av2 = (await paring(k2.env, '/api/avalik', { keha: { kood: k2.s.kood } })).j;
  assert.equal(av2.telefon, '');
  assert.equal((await paring(k2.env, '/api/helista', { toor: JSON.stringify({ token: av2.token }), pais: { 'Content-Type': 'text/plain' } })).status, 400);
});

test('halduse testteade: õnnestumine ja Telegrami vea põhjus (tokenit ei näidata)', async () => {
  const { env, A } = await alus();
  let r = await A('testteade', {});
  assert.equal(r.j.ok, true); assert.equal(r.j.tg.ok, true); assert.equal(r.j.ntfy.seatud, false);
  tgVastus = { ok: false, description: 'Bad Request: chat not found' };
  r = await A('testteade', {});
  assert.equal(r.j.ok, false); assert.match(r.j.tg.viga, /chat not found \(ava bot Telegramis ja vajuta Start\)/);
  tgVastus = { ok: false, description: 'Unauthorized 123456:ABCDEFGHIJKLMNOP' };
  r = await A('testteade', {});
  assert.doesNotMatch(r.j.tg.viga, /ABCDEFGHIJKLMNOP/); assert.match(r.j.tg.viga, /TG_BOT_TOKEN on vale/);
  const k2 = await alus({ TG_CHAT_ID: '123456:ABCDEFGHIJKLMNOP' });
  r = await admin(k2.env)('testteade', {});
  assert.match(r.j.tg.viga, /boti token/);
});

test('leidja leht: üks privaatsuslause, automaatne asukoht, loendurid, Helista ja CSP nonce', async () => {
  const { env, s } = await alus();
  const r = await worker.fetch(new Request(`https://t.ee/S/${s.kood}`), env, {});
  const h = await r.text();
  assert.equal(h.split('Sinu nime ega kontaktandmeid').length - 1, 1, 'üks privaatsuslause (lukuikooniga)');
  assert.match(h, /Sinu nime ega kontaktandmeid ei saadeta, kui sa neid vormi ei lisa\./);
  assert.match(h, /watchPosition/); assert.match(h, /sendBeacon/); assert.match(h, /Saadetud\. Aitäh!/);
  assert.match(h, /maxlength="400"/); assert.match(h, /maxlength="100"/); assert.match(h, /Saada omanikule/);
  assert.match(r.headers.get('Content-Security-Policy'), /script-src 'nonce-/);
});

test('kõigi lehtede skriptid on süntaktiliselt korras (haldus, rakendus, dev)', async () => {
  const { appLeht, adminLeht, devLeht } = await import('../src/lehed.js');
  for (const [nimi, h] of [['app', appLeht('n', { seade: 'ABCDEFGHJK01' })], ['admin', adminLeht('n')], ['dev', devLeht('n')]]) {
    const skriptid = [...h.matchAll(/<script nonce="n">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(skriptid.length > 0, nimi);
    for (const sk of skriptid) assert.doesNotThrow(() => new Function(sk), `${nimi}: süntaksiviga`);
  }
});
