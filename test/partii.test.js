// Eeltrükitud koodid (partiid): haldur valib seadme kaupa uue koodi või varem trükitud kleebise koodi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keskkond, klient, admin } from './abi.js';
import { QR_JS } from '../src/qrgen.js';
import { KLEEBIS_JS } from '../src/kleebis.js';

async function alus() {
  const k = keskkond({ TG_BOT_TOKEN: '1:abcdefghijkl', TG_CHAT_ID: '1' });
  const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu' })).j.koht;
  return { ...k, A, koht, c: klient(k.env) };
}

test('partii: 1–200 koodi, unikaalsed, üks partii kirje + indeks', async () => {
  const { A, storage } = await alus();
  assert.equal((await A('partii', { kogus: 0 })).status, 400);
  assert.equal((await A('partii', { kogus: 201 })).status, 400);
  const r = await A('partii', { kogus: 50, nimi: 'trükikoda' });
  assert.equal(r.j.ok, true);
  const k = r.j.partii.koodid;
  assert.equal(new Set(k).size, 50);
  assert.ok(k.every((x) => /^[0-9A-HJKMNP-TV-Z]{12}$/.test(x)));
  assert.equal([...storage.m.keys()].filter((x) => x.startsWith('partii:')).length, 1);
  const l = (await A('partiid')).j.partiid;
  assert.equal(l[0].nimi, 'trükikoda'); assert.equal(l[0].koodid.filter((x) => !x.nimi).length, 50);
});

test('sidumata kood: leidja näeb „ei ole veel kasutusel“, teadet ega tokenit pole; pärast sidumist töötab', async () => {
  const { A, koht, c, env } = await alus();
  const kood = (await A('partii', { kogus: 3 })).j.partii.koodid[0];
  const algFetch = globalThis.fetch; let teateid = 0;
  globalThis.fetch = async () => { teateid++; return new Response('{"ok":true}'); };
  try {
    const r = await c('/api/avalik', { kood });
    assert.equal(r.status, 404); assert.equal(r.j.sidumata, true); assert.equal(r.j.token, undefined);
    assert.equal((await c('/api/avalik', { kood: 'ABCDEFGHJK01' })).j.sidumata, undefined, 'võõras kood on lihtsalt tundmatu');
    await new Promise((x) => setTimeout(x, 5));
    assert.equal(teateid, 0);
    const s = await A('seade', { nimi: 'Laser', uus_kood: kood, asukoht: koht.kood });
    assert.equal(s.j.seade.kood, kood);
    assert.equal((await A('seade', { nimi: 'Teine', uus_kood: kood, asukoht: koht.kood })).status, 409, 'sama koodi ei saa kaks korda siduda');
    const r2 = await c('/api/avalik', { kood });
    assert.equal(r2.j.ok, true); assert.equal(r2.j.nimi, 'Laser'); assert.ok(r2.j.token);
    const l = (await A('partiid')).j.partiid[0].koodid;
    assert.equal(l.find((x) => x.kood === kood).nimi, 'Laser'); assert.equal(l.filter((x) => !x.nimi).length, 2);
  } finally { globalThis.fetch = algFetch; }
  assert.ok(env);
});

test('vana viis jääb: tühi kood = uus kood, mis ei kattu partiiga', async () => {
  const { A, koht } = await alus();
  const p = (await A('partii', { kogus: 5 })).j.partii.koodid;
  const s = (await A('seade', { nimi: 'Puur', asukoht: koht.kood })).j.seade;
  assert.ok(/^[0-9A-HJKMNP-TV-Z]{12}$/.test(s.kood)); assert.ok(!p.includes(s.kood));
});

test('QR: Krativara URL suurtähtedega mahub versiooni 3 (29 moodulit), kleebise SVG tekib', () => {
  const w = globalThis.window; globalThis.window = globalThis;
  try {
    new Function(QR_JS)();
    const m = globalThis.qrMatrix('HTTPS://QRP.KRATIVARA.EE/S/ABCDEFGHJK01');
    assert.equal(m.length, 29);
    const f = new Function(`${KLEEBIS_JS}; return {kleebisSvg, kleebisReg, kleebisMoot};`)();
    let p = ''; for (let r = 0; r < 29; r++) for (let c = 0; c < 29; c++) if (m[r][c]) p += `M${c} ${r}h1v1h-1z`;
    const q = { n: 29, p };
    assert.equal(f.kleebisMoot(q, 'a'), 30);
    assert.equal(f.kleebisSvg(q, 'ABCDEFGHJK01', 'a').split('TEATA LEIUST').length - 1, 4);
    assert.match(f.kleebisReg(q, 'ABCDEFGHJK01', 'a', ''), /HJK01|JK01/);
  } finally { globalThis.window = w; }
});
