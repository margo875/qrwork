import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { VERSIOON } from '../src/versioon.js';
import { keskkond } from './abi.js';

const get = (env, tee, h = {}) => worker.fetch(new Request('https://t.ee' + tee, { headers: h }), env, {});
const post = (env, tee, keha, h = {}) => worker.fetch(new Request('https://t.ee' + tee, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-QW': '1', ...h }, body: JSON.stringify(keha) }), env, {});

test('versioon: API ja lehed näitavad sama versiooni, deploy id kaasa', async () => {
  const { env } = keskkond({ CF_VERSION: { id: 'abcdef1234567890' } });
  const j = await (await get(env, '/api/versioon')).json();
  assert.deepEqual(j, { v: VERSIOON, id: 'abcdef12' });
  const h = await (await get(env, '/')).text();
  assert.ok(h.includes(JSON.stringify(j)), 'leht teab oma versiooni');
  assert.ok(h.includes('<title>Krativara</title>'));
  assert.ok((await (await get(env, '/admin')).text()).includes('Krativara haldus'));
});

test('PWA: manifest, ikoonid, CSP lubab manifesti', async () => {
  const { env } = keskkond();
  const m = await get(env, '/manifest.webmanifest');
  const mj = JSON.parse(await m.text());
  assert.equal(mj.name, 'Krativara'); assert.equal(mj.display, 'standalone');
  for (const i of mj.icons) {
    const r = await get(env, i.src);
    assert.equal(r.headers.get('Content-Type'), 'image/png');
    const b = new Uint8Array(await r.arrayBuffer());
    assert.deepEqual([...b.slice(1, 4)], [80, 78, 71], 'PNG');
  }
  assert.equal((await get(env, '/apple-touch-icon.png')).status, 200);
  const leht = await get(env, '/');
  assert.match(leht.headers.get('Content-Security-Policy'), /manifest-src 'self'/);
  assert.ok((await leht.text()).includes('rel="manifest"'));
});

test('vealogi: klient saab kirjutada, ainult DEV_TOKEN loeb; haldur ei loe', async () => {
  const { env } = keskkond({ DEV_TOKEN: 'd'.repeat(20) });
  assert.equal((await (await post(env, '/api/viga', { teade: 'TypeError x', leht: '/S/ABC?tel=5', stack: 's', rida: 3 })).json()).ok, true);
  assert.equal((await get(env, '/api/dev/vead')).status, 401);
  assert.equal((await get(env, '/api/dev/vead', { Authorization: 'Bearer ' + env.ADMIN_TOKEN })).status, 401, 'halduri võti ei sobi');
  const j = await (await get(env, '/api/dev/vead', { Authorization: 'Bearer ' + env.DEV_TOKEN })).json();
  assert.equal(j.vead.length, 1);
  assert.equal(j.vead[0].teade, 'TypeError x');
  assert.equal(j.vead[0].leht, '/S/ABC', 'päringuosa ei salvestu');
  assert.equal(j.vead[0].liik, 'klient');
  assert.equal(j.vead[0].ua, 'muu / muu');
  const { lyhikeUa } = await import('../src/register.js');
  assert.equal(lyhikeUa('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'), 'Chrome 131 / Android');
  assert.equal(lyhikeUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'Safari 17 / iOS');
  // ilma X-QW päiseta ei võeta vastu
  const r = await worker.fetch(new Request('https://t.ee/api/viga', { method: 'POST', body: '{"teade":"x"}' }), env, {});
  assert.equal(r.status, 403);
  // tühjendamine
  await worker.fetch(new Request('https://t.ee/api/dev/tyhjenda', { method: 'POST', headers: { Authorization: 'Bearer ' + env.DEV_TOKEN } }), env, {});
  assert.equal((await (await get(env, '/api/dev/vead', { Authorization: 'Bearer ' + env.DEV_TOKEN })).json()).vead.length, 0);
});

test('vealogi: ilma DEV_TOKEN-ita suletud; üleujutuse piir 20/h IP kohta', async () => {
  const { env, storage } = keskkond();
  assert.equal((await get(env, '/api/dev/vead', { Authorization: 'Bearer ' })).status, 401);
  for (let i = 0; i < 30; i++) await post(env, '/api/viga', { teade: 'v' + i });
  assert.equal([...storage.m.keys()].filter((k) => k.startsWith('viga:')).length, 20);
});

test('vealogi: serveri erind logitakse, vanemad kui 30 p kustuvad', async () => {
  const { env, reg, storage } = keskkond();
  await reg.veaLogi({ liik: 'server', teade: 'vana' }, Date.now() - 31 * 86400000);
  reg.vigaKirjeid = 0; // järgmine kirjutamine koristab
  reg.kasutaja = async () => { throw new Error('katki'); };
  const r = await post(env, '/api/mina', {});
  reg.kalender = async () => { throw new Error('kal'); };
  await worker.fetch(new Request('https://t.ee/api/kalender/' + 'A'.repeat(32) + '.ics'), env, {});
  assert.ok(![...storage.m.values()].some((v) => v && String(v.leht || '').includes('AAAA')), 'kalendri võti ei jõua logisse');
  assert.equal(r.status, 500);
  const vead = [...storage.m.entries()].filter(([k]) => k.startsWith('viga:')).map(([, v]) => [v.liik, v.teade, v.leht]);
  assert.deepEqual(vead.map((v) => v[2]).sort(), ['/api/kalender/…', '/api/mina']);
});

test('kujundus (Kindaveli B nagu K | KODU): fondid serveeritakse, CSP lubab ainult oma fondid, päis ja menüü', async () => {
  const { env } = keskkond();
  for (const f of ['instrument-sans-latin', 'instrument-sans-latin-ext', 'newsreader-500-latin', 'newsreader-500-latin-ext']) {
    const r = await get(env, `/fondid/${f}.woff2`);
    assert.equal(r.status, 200, f); assert.equal(r.headers.get('Content-Type'), 'font/woff2');
    const b = new Uint8Array(await r.arrayBuffer());
    assert.equal(String.fromCharCode(...b.slice(0, 4)), 'wOF2', f);
  }
  assert.equal((await get(env, '/fondid/../worker.js')).status, 404);
  assert.equal((await get(env, '/fondid/puudub.woff2')).status, 404);
  const leht = await get(env, '/');
  assert.match(leht.headers.get('Content-Security-Policy'), /font-src 'self'/);
  const h = await leht.text();
  assert.ok(h.includes('class="riba"') && h.includes('krativara</span>'), 'päis K Kindavel | krativara');
  assert.ok(h.includes('id="menyy"'), 'alumine menüü');
  assert.ok(h.includes('--aktsent:#A33B20') && h.includes('prefers-color-scheme:dark'), 'palett ja tume teema');
  const mj = JSON.parse(await (await get(env, '/manifest.webmanifest')).text());
  assert.equal(mj.theme_color, '#FAF9F6');
});
