// Ostuandmed, dokumendid, pildilt lugemine ja hooldusplaanid (Margo 10.11.2026)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin } from './abi.js';
import { dokValjad, aiJson, hindArvuks, dokTyyp } from '../src/dokumendid.js';
import { hooldusPlaanid, kuudLisa } from '../src/register.js';

class R2 { constructor() { this.m = new Map(); } async put(k, v, o) { this.m.set(k, { b: v, o }); } async delete(k) { this.m.delete(k); }
  async get(k) { const x = this.m.get(k); return x ? { body: x.b, httpMetadata: x.o.httpMetadata } : null; } }
const JPEG = new Uint8Array(300); JPEG.set([0xff, 0xd8, 0xff, 0xe0]);
const PDF = new TextEncoder().encode('%PDF-1.4\n' + 'x'.repeat(200));
const T = 'Bearer ' + 'a'.repeat(20);
const bin = (env, tee, keha, h = {}) => worker.fetch(new Request('https://t.ee/api/admin/' + tee, { method: 'POST', headers: { Authorization: T, ...h }, body: keha }), env, {});
const get = (env, tee, h = { Authorization: T }) => worker.fetch(new Request('https://t.ee/api/admin/' + tee, { headers: h }), env, {});

async function alus(lisa = {}) {
  const k = keskkond({ FOTOD: new R2(), ...lisa }); const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu', registreerimine: 'vaba' })).j.koht;
  return { ...k, A, koht };
}

test('abifunktsioonid: hind, JSON, tüüp, kuud', () => {
  assert.equal(hindArvuks('1 299,90 €'), 1299.9); assert.equal(hindArvuks('-5'), null); assert.equal(hindArvuks('1.299'), 1299);
  assert.deepEqual(aiJson({ response: 'Siin: {"nimi":"Nivelliir"} ok' }), { nimi: 'Nivelliir' });
  assert.equal(dokTyyp(PDF), 'pdf'); assert.equal(dokTyyp(JPEG), 'jpg'); assert.equal(dokTyyp(new Uint8Array(10)), null);
  assert.equal(kuudLisa('2026-01-31', 1), '2026-02-28'); assert.equal(kuudLisa('2026-11-10', 24), '2028-11-10');
  const v = dokValjad({ nimi: 'Leica NA730', ost_hind: '410,00', ost_kuupaev: '2026-11-05', garantii_kuni: '2028-11-05', ost_muuja: 'null', seerianr: '  S/N 123  ' }, 'arve', '2026-11-10');
  assert.equal(v.ost_hind, 410); assert.equal(v.ost_kuupaev, '2026-11-05'); assert.equal(v.garantii_kuni, '2028-11-05'); assert.equal(v.ost_muuja, null); assert.equal(v.seerianr, 'S/N 123');
  assert.equal(dokValjad({ ost_kuupaev: '2030-01-01' }, 'arve', '2026-11-10').ost_kuupaev, null, 'tuleviku ostukuupäev');
  assert.equal(dokValjad({ aasta: '2019', tootja: 'Bosch' }, 'andmesilt', '2026-11-10').aasta, '2019');
  assert.equal(dokValjad('prügi', 'arve', '2026-11-10').nimi, null);
});

test('hooldusplaanid: kordus, järgmine kuupäev, piirid', () => {
  const h = hooldusPlaanid([{ nimi: 'Hooldus', intervall: 12, viimati: '2026-03-01' }]);
  assert.equal(h[0].jargmine, '2027-03-01'); assert.equal(h[0].hoiatus_paevi, 14); assert.match(h[0].id, /^[0-9A-Z]{6}$/);
  assert.match(hooldusPlaanid([{ nimi: 'X', intervall: 12 }]), /nimi/);
  assert.match(hooldusPlaanid([{ nimi: 'Filter', intervall: 0, viimati: '2026-01-01' }]), /1–120/);
  assert.match(hooldusPlaanid([{ nimi: 'Filter', intervall: 6 }]), /kuupäev/);
  assert.match(hooldusPlaanid(Array(11).fill({ nimi: 'Aa', intervall: 6, jargmine: '2027-01-01' })), /kuni 10/);
});

test('ostuandmed ja dokumendid: ainult haldur, osaline salvestus ei kustuta, töötaja ei näe hinda', async () => {
  const { env, A, koht } = await alus();
  // dokument üles: tüüp sisu järgi, suurusepiir, ainult halduri võtmega
  assert.equal((await bin(env, 'dokument?liik=arve', JPEG, { Authorization: 'Bearer vale-vale-vale-vale' })).status, 401);
  assert.equal((await bin(env, 'dokument?liik=arve', new Uint8Array(300))).status, 415);
  const d1 = await (await bin(env, 'dokument?liik=arve&nimi=arve%20nov.pdf', PDF)).json();
  assert.equal(d1.ok, true); assert.equal(d1.dokument.mime, 'application/pdf'); assert.equal(d1.dokument.liik, 'arve');
  const d2 = await (await bin(env, 'dokument?liik=andmesilt', JPEG)).json();
  // seade koos ostuandmete ja dokumentidega
  const r = await A('seade', { nimi: 'Nivelliir', asukoht: koht.kood, tootja: 'Leica', mudel: 'NA730', ost_kuupaev: '2026-11-05', ost_hind: '410,50', ost_muuja: 'Geotrade',
    garantii_kuni: '2028-11-05', dokumendid_lisa: [d1.dokument.voti, d2.dokument.voti], hooldused: [{ nimi: 'Hooldus', intervall: 12, viimati: '2026-11-05' }] });
  assert.equal(r.j.ok, true, r.j.viga); const s = r.j.seade;
  assert.equal(s.ost_hind, 410.5); assert.equal(s.dokumendid.length, 2); assert.equal(s.hooldused[0].jargmine, '2027-11-05');
  // sama dokumenti ei saa teisele seadmele siduda
  assert.equal((await A('seade', { nimi: 'Laser', asukoht: koht.kood, dokumendid_lisa: [d1.dokument.voti] })).j.ok, false);
  assert.equal((await A('seade', { nimi: 'Laser', asukoht: koht.kood, dokumendid_lisa: ['d/202611/../../seade'] })).j.ok, true, 'vigane võti jäetakse vahele');
  // osaline salvestus (nt „Saada taatlusele“) ei kustuta ostuandmeid ega dokumente
  const r2 = await A('seade', { kood: s.kood, nimi: s.nimi, invnr: s.invnr, olek: 'taatlusel', asukoht: koht.kood });
  assert.equal(r2.j.seade.ost_hind, 410.5); assert.equal(r2.j.seade.dokumendid.length, 2); assert.equal(r2.j.seade.hooldused.length, 1);
  // dokumendi vaatamine: õige tüüp, sandbox; vale võti 404
  const dv = await get(env, 'dokument?k=' + encodeURIComponent(d1.dokument.voti));
  assert.equal(dv.status, 200); assert.equal(dv.headers.get('Content-Type'), 'application/pdf'); assert.match(dv.headers.get('Content-Security-Policy'), /sandbox/);
  assert.equal((await get(env, 'dokument?k=' + encodeURIComponent('f/../x.pdf'))).status, 404);
  assert.equal((await get(env, 'dokument?k=' + encodeURIComponent(d1.dokument.voti), {})).status, 401);
  // eemaldamine: märgitakse kustutatuks (fail jääb varunduse jaoks alles kuni seadme lõpliku kustutamiseni)
  const r3 = await A('seade', { kood: s.kood, nimi: s.nimi, invnr: s.invnr, asukoht: koht.kood, dokumendid_eemalda: [d2.dokument.voti] });
  assert.equal(r3.j.seade.dokumendid.filter((x) => !x.kustutatud).length, 1);
  // töötaja seadme kaart: tootja ja mudel jah, hind, müüja ja dokumendid ei
  await A('seade', { kood: s.kood, nimi: s.nimi, invnr: s.invnr, olek: 'aktiivne', asukoht: koht.kood });
  const c = klient(env);
  await c('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: koht.kood });
  const kaart = (await c('/api/seade', { kood: s.kood })).j;
  assert.equal(kaart.seade.tootja, 'Leica'); assert.equal(kaart.seade.mudel, 'NA730');
  const tekst = JSON.stringify(kaart);
  for (const keel of ['410', 'Geotrade', 'dokumend', 'ost_', 'garantii']) assert.ok(!tekst.includes(keel), `töötajale ei lähe: ${keel}`);
  // leidja (avalik) ei näe midagi sellest
  const av = JSON.stringify((await klient(env)('/api/avalik', { kood: s.kood })).j);
  for (const keel of ['410', 'Geotrade', 'Leica', 'hooldus']) assert.ok(!av.includes(keel), `leidjale ei lähe: ${keel}`);
  // CSV sisaldab ostuandmeid
  const csv = await (await get(env, 'seadmed.csv')).text();
  assert.match(csv, /2026-11-05;"410,5";Geotrade;2028-11-05;1/);
});

test('hooldus: hoiatus kaardil (ei keela võtmist), tehtud → järgmine, kalendris', async () => {
  const { env, A, koht } = await alus();
  const s = (await A('seade', { nimi: 'Puur', asukoht: koht.kood, hooldused: [{ nimi: 'Söeharjad', intervall: 6, jargmine: '2020-01-01' }] })).j.seade;
  const c = klient(env);
  await c('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: koht.kood });
  const k = (await c('/api/seade', { kood: s.kood })).j;
  assert.ok(k.seade.hoiatused.some((h) => /Hooldus üle tähtaja: Söeharjad/.test(h)));
  assert.equal(k.vota.lubatud, true, 'üle tähtaja hooldus ei keela');
  assert.equal((await c('/api/vota', { koodid: [s.kood] })).j.tulemused[0].ok, true);
  // tehtud
  const id = s.hooldused[0].id;
  assert.equal((await A('hooldus-tehtud', { kood: s.kood, id, kuupaev: '2099-01-01' })).j.ok, false, 'tulevikus ei saa');
  const t = await A('hooldus-tehtud', { kood: s.kood, id, kuupaev: '2026-11-01', markus: 'vahetatud', kulu: '12,50' });
  assert.equal(t.j.ok, true, t.j.viga); assert.equal(t.j.seade.hooldused[0].jargmine, '2027-05-01'); assert.equal(t.j.hooldus.kulu, 12.5);
  assert.equal((await A('hooldused?kood=' + s.kood)).j.hooldused.length, 1);
  // töötaja ei saa hooldust registreerida (halduse API)
  assert.equal((await c('/api/admin/hooldus-tehtud', { kood: s.kood, id, kuupaev: '2026-11-01' })).status, 401);
  // kalender
  const kal = (await A('kalender', { uus: true })).j;
  const ics = await (await worker.fetch(new Request(`https://t.ee/api/kalender/${kal.token}.ics`), env, {})).text();
  assert.match(ics, /SUMMARY:Hooldus: Söeharjad – Puur/); assert.match(ics, /DTSTART;VALUE=DATE:20270501/);
});

test('pildilt lugemine: ettepanek, päevane piir, ilma AI-ta 501, PDF ei', async () => {
  let saadud = null;
  const AI = { run: async (m, x) => { saadud = x; return { response: '{"nimi":"Laser","ost_hind":"99,90","ost_kuupaev":"2026-11-02","seerianr":"A1"}' }; } };
  const { env } = await alus({ AI });
  const r = await (await bin(env, 'loe?liik=arve', JPEG)).json();
  assert.equal(r.ok, true); assert.equal(r.ettepanek.nimi, 'Laser'); assert.equal(r.ettepanek.ost_hind, 99.9);
  assert.ok(Array.isArray(saadud.image) && saadud.image.length === JPEG.length); assert.match(saadud.messages[0].content, /receipt or invoice/);
  assert.equal((await bin(env, 'loe?liik=andmesilt', JPEG)).status, 200);
  assert.equal((await bin(env, 'loe?liik=arve', PDF)).status, 415);
  for (let i = 0; i < 48; i++) await bin(env, 'loe?liik=arve', JPEG);
  assert.equal((await bin(env, 'loe?liik=arve', JPEG)).status, 429, 'päevane piir 50');
  const { env: env2 } = await alus();
  assert.equal((await bin(env2, 'loe?liik=arve', JPEG)).status, 501);
  assert.equal((await bin(env2, 'loe?liik=arve', JPEG, { Authorization: '' })).status, 401);
});

test('kontrolli leiud (10.11.2026): inventarinumber ei hüppa, tegija jääb, kuupäevad, hind, liik, korduv id, koristus', async () => {
  const { env, A, koht, reg } = await alus();
  const s1 = (await A('seade', { nimi: 'Üks', asukoht: koht.kood })).j.seade;
  assert.equal((await A('seade', { nimi: 'Vigane', asukoht: koht.kood, ost_hind: 'abc' })).j.ok, false);
  const s2 = (await A('seade', { nimi: 'Kaks', asukoht: koht.kood })).j.seade;
  assert.equal(Number(s2.invnr.slice(-3)), Number(s1.invnr.slice(-3)) + 1, 'tagasi lükatud seade ei kuluta numbrit');
  // tegija jääb järgmisel salvestamisel alles
  const s = (await A('seade', { kood: s2.kood, nimi: 'Kaks', invnr: s2.invnr, asukoht: koht.kood, hooldused: [{ nimi: 'Hooldus', intervall: 12, viimati: '2026-01-10' }] })).j.seade;
  await A('hooldus-tehtud', { kood: s.kood, id: s.hooldused[0].id, kuupaev: '2026-11-01', tegija: 'Hooldus OÜ' });
  const r = (await A('seade', { kood: s.kood, nimi: 'Kaks', invnr: s.invnr, asukoht: koht.kood, hooldused: [{ id: s.hooldused[0].id, nimi: 'Hooldus', intervall: 12, viimati: '2026-11-01' }] })).j.seade;
  assert.equal(r.hooldused[0].tegija, 'Hooldus OÜ');
  // olematu kuupäev, tuleviku viimati, korduv id
  assert.equal((await A('seade', { kood: s.kood, nimi: 'Kaks', invnr: s.invnr, asukoht: koht.kood, ost_kuupaev: '2026-02-30' })).j.ok, false);
  assert.match(hooldusPlaanid([{ nimi: 'Aa', intervall: 6, viimati: '2099-01-01' }], [], '2026-11-10'), /tulevikus/);
  const kaks = hooldusPlaanid([{ id: 'AAAAAA', nimi: 'Aa', intervall: 6, jargmine: '2027-01-01' }, { id: 'AAAAAA', nimi: 'Bb', intervall: 6, jargmine: '2027-01-01' }]);
  assert.notEqual(kaks[0].id, kaks[1].id);
  // hind
  assert.equal(hindArvuks('1e3'), null); assert.equal(hindArvuks('12,345'), 12.35); assert.equal(hindArvuks('1.299.000'), 1299000); assert.equal(hindArvuks('99,90 €'), 99.9); assert.equal(hindArvuks('1 299 EUR'), 1299);
  // liik: pärilik võti ei sobi
  const d = await (await bin(env, 'dokument?liik=constructor', JPEG)).json();
  assert.equal(d.dokument.liik, 'muu');
  // koristus: sidumata dokument > 2 päeva ja vanad ai-loendurid kustuvad
  await reg.koristaAjutised(Date.now() + 3 * 86400000);
  assert.equal(env.FOTOD.m.has(d.dokument.voti), false); assert.equal((await reg.loend('dok:')).length, 0);
});
