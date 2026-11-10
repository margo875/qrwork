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

test('lõplikult kustutatud seadme partiikood ei muutu uuesti vabaks; partii CSV valemisüst neutraliseeritud', async () => {
  const { A, koht, c, reg, storage } = await alus();
  const kood = (await A('partii', { kogus: 2 })).j.partii.koodid[0];
  await A('seade', { nimi: '=HYPERLINK("x")', uus_kood: kood, asukoht: koht.kood });
  assert.equal((await A('kustuta', { liik: 'seade', id: kood })).j.ok, true);
  const x = await storage.get(`seade:${kood}`); x.kustutatud = Date.now() - 31 * 86400000; await storage.put(`seade:${kood}`, x);
  await reg.lopetaKustutamine(Date.now());
  const r = await c('/api/avalik', { kood });
  assert.equal(r.j.sidumata, undefined);
  assert.equal((await A('partiid')).j.partiid[0].koodid.find((k) => k.kood === kood).kustutatud, true);
  assert.equal((await A('seade', { nimi: 'Uus', uus_kood: kood, asukoht: koht.kood })).status, 409);
});

test('halduse partii CSV kliendikood neutraliseerib valemi', async () => {
  const { adminLeht } = await import('../src/lehed.js');
  assert.match(adminLeht('n'), /if\(\/\^\[=\+\\-@\\t\\r\]\/\.test\(x\)\)x="'"\+x/);
});

test('halduse seadmevormis on QR-skänner (sama lugeja mis rakenduses)', async () => {
  const { adminLeht, appLeht } = await import('../src/lehed.js');
  const h = adminLeht('n');
  assert.match(h, /id=\\"s_skann\\"|id="s_skann"/);
  assert.match(h, /function koodTekstist/); assert.match(h, /async function kaamera\(video,onTekst,teade\)/);
  assert.match(appLeht('n', {}), /async function kaamera\(video,onTekst,teade\)/);
});

test('kleebised valikutega (Margo 10.11.2026): suurus 100–60 %, QR-ide arv, leidja „TEATA LEIUST“ / oma tekst / ilma', () => {
  const f = new Function(`${KLEEBIS_JS}; return {kvValik, kvRida, KV};`)();
  const q = { n: 29, p: 'M0 0h1v1h-1z' };
  assert.deepEqual(f.kvValik({}), { mastaap: 1, qr: 3, leidja: 'teata', ylal: '', all: '' });
  for (const m of [1, 0.9, 0.8, 0.7, 0.6]) assert.equal(f.kvValik({ mastaap: m }).mastaap, m);
  for (const m of [0.5, 0.75, 1.1, 'x']) assert.throws(() => f.kvValik({ mastaap: m }), /100, 90, 80, 70 või 60/);
  assert.throws(() => f.kvValik({ qr: 7 }), /0–6/); assert.throws(() => f.kvValik({ qr: 1.5 }), /0–6/);
  assert.throws(() => f.kvValik({ leidja: 'pole', qr: 0 }), /vähemalt üks/);
  assert.throws(() => f.kvValik({ leidja: 'tekst' }), /tekst/);
  const t = f.kvValik({ leidja: 'tekst', ylal: 'P.P Ehitusjärelevalve OÜ', all: '<b>5123 4567</b>', qr: 2 });
  assert.equal(t.ylal, 'P.P EHITUSJÄRELEVALV', 'kuni 20 märki, suurtähed'); assert.equal(t.all, '<B>5123 4567</B>');
  const r = f.kvRida(q, t);
  assert.equal(r.length, 3); assert.equal(r[0][0], 26); assert.equal(r[1][0], 19.5);
  assert.ok(r[0][2].includes('P.P EHITUSJÄRELEVALV') && r[0][2].includes('&lt;B&gt;'), 'tekst on paos');
  assert.ok(!r[0][2].includes('TEATA LEIUST'));
  assert.ok(r[0][2].includes('#1C1C1A') && r[0][2].includes('#A33B20'), 'Kindaveli raam');
  const teata = f.kvRida(q, f.kvValik({ leidja: 'teata', qr: 0 }));
  assert.equal(teata.length, 1); assert.equal(teata[0][2].split('TEATA LEIUST').length - 1, 4);
  const v = f.kvRida(q, f.kvValik({ leidja: 'pole', qr: 6, mastaap: 0.6 }));
  assert.equal(v.length, 6); assert.equal(v[0][0], 11.7);
});
