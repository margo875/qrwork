// Väline hooldus: hooldajad, töökäsk, link (A), seadme QR + PIN (C), hooldaja sissekanded (Margo 10.11.2026)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin } from './abi.js';
import { looPin, hooldajaValjad, PIN_VEAD_MAX } from '../src/hooldus.js';

class R2 { constructor() { this.m = new Map(); } async put(k, v, o) { this.m.set(k, { b: v, o }); } async delete(k) { this.m.delete(k); }
  async get(k) { const x = this.m.get(k); return x ? { body: x.b, httpMetadata: x.o.httpMetadata } : null; } }
const JPEG = new Uint8Array(300); JPEG.set([0xff, 0xd8, 0xff, 0xe0]);
// hooldaja „telefon“: küpsis qw_hool (ja IP), päringud nagu brauser
function telefon(env, ip = '1.2.3.4') {
  let kyps = '';
  const f = async (tee, keha, meth = 'POST', lisa = {}) => {
    const h = { 'X-QW': '1', 'CF-Connecting-IP': ip, ...lisa }; if (kyps) h.Cookie = kyps;
    if (meth === 'POST' && !(keha instanceof Uint8Array)) h['Content-Type'] = 'application/json';
    const r = await worker.fetch(new Request('https://t.ee' + tee, { method: meth, headers: h, body: meth === 'POST' ? (keha instanceof Uint8Array ? keha : JSON.stringify(keha || {})) : undefined }), env, {});
    const sc = r.headers.get('Set-Cookie'); if (sc) kyps = sc.split(';')[0];
    return { status: r.status, j: (r.headers.get('Content-Type') || '').includes('json') ? await r.json() : null, r };
  };
  f.kyps = () => kyps;
  return f;
}
async function alus() {
  const k = keskkond({ FOTOD: new R2() }); const A = admin(k.env);
  await A('seaded', { firma: 'P.P Ehitusjärelevalve OÜ' });
  const koht = (await A('koht', { nimi: 'Ladu', registreerimine: 'vaba' })).j.koht;
  const s = (await A('seade', { nimi: 'Nivelliir', tootja: 'Leica', mudel: 'NA730', seerianr: 'SN1', asukoht: koht.kood, ost_hind: '410', ost_muuja: 'Geotrade', hooldused: [{ nimi: 'Kalibreerimine', intervall: 12, viimati: '2025-11-01' }] })).j.seade;
  const h = (await A('hooldaja', { nimi: 'Geo Labor OÜ', regkood: '12345678', kontakt: 'Jüri', tel: '+3725555', epost: 'labor@geo.ee', arve_epost: 'arve@geo.ee' })).j.hooldaja;
  return { ...k, A, koht, s, h };
}

test('hooldaja andmed ja PIN: 8 numbrit, seotud kuupäeva, inventarinumbri, hooldaja ja soolaga', async () => {
  assert.match(hooldajaValjad({ nimi: 'X' }), /nimi/); assert.match(hooldajaValjad({ nimi: 'Labor', epost: 'vale' }), /e-post/);
  const a = { id: 'A1', kuupaev: '2026-11-10', invnr: 'L1-2611001', hooldaja: 'H1', nonce: 'N1' };
  const p = await looPin('s'.repeat(20), a);
  assert.match(p, /^\d{8}$/);
  assert.equal(await looPin('s'.repeat(20), a), p, 'sama sisend → sama PIN (kontrollitav ilma salvestamata)');
  for (const k of ['kuupaev', 'invnr', 'hooldaja', 'nonce']) assert.notEqual(await looPin('s'.repeat(20), { ...a, [k]: a[k] + 'x' }), p, `muutub koos: ${k}`);
});

test('töökäsk: link (A) ja PIN (C) avavad ainult selle töö; hooldaja ei näe hinda ega kasutajaid; lisab ja parandab', async () => {
  const { env, A, s, h } = await alus();
  // seade kellegi nimel → ei saa hooldusesse
  const c = klient(env); await c('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: (await A('ulevaade')).j.kohad[0].kood });
  await c('/api/vota', { koodid: [s.kood] });
  assert.equal((await A('hooldusse', { kood: s.kood, hooldaja: h.id })).status, 409);
  await c('/api/tagasta', { koodid: [s.kood] });
  assert.equal((await A('hooldusse', { kood: s.kood, hooldaja: 'POLE' })).j.ok, false);
  const t = (await A('hooldusse', { kood: s.kood, hooldaja: h.id, rike: 'Kalibreerimine', paevi: 30 })).j;
  assert.equal(t.ok, true); assert.match(t.pin, /^\d{8}$/); assert.match(t.link, /^[0-9A-Z]{32}$/);
  assert.equal(JSON.stringify(t.too).includes(t.link) || 'token_rasi' in t.too || 'nonce' in t.too, false, 'töö kirjes pole lingi räsi ega soola');
  assert.equal((await A('hooldusse', { kood: s.kood, hooldaja: h.id })).status, 409, 'teist avatud töökäsku ei saa');
  // seade on remondis: töötaja ei saa võtta
  assert.equal((await c('/api/vota', { koodid: [s.kood] })).j.tulemused[0].ok, false);
  // /H/ leht avaneb
  assert.equal((await worker.fetch(new Request('https://t.ee/H/' + t.link), env, {})).status, 200);
  // võõras: leidja vaade näitab PIN-i välja, mitte hoolduse andmeid
  const voor = telefon(env, '9.9.9.9');
  const av = (await voor('/api/avalik', { kood: s.kood })).j;
  assert.equal(av.hooldus, true); assert.equal(av.hooldus_sees, false);
  assert.equal((await voor('/api/hooldus/too', {})).status, 401, 'ilma sessioonita ei näe');
  // vale PIN, vale seade
  assert.equal((await voor('/api/hooldus/pin', { kood: s.kood, pin: '00000000' })).status, 401);
  const teine = (await A('seade', { nimi: 'Laser', asukoht: (await A('ulevaade')).j.kohad[0].kood })).j.seade;
  assert.equal((await voor('/api/hooldus/pin', { kood: teine.kood, pin: t.pin })).status, 404, 'PIN ei sobi teise seadmega');
  // C: õige PIN
  const hp = telefon(env, '5.5.5.5');
  assert.equal((await hp('/api/hooldus/pin', { kood: s.kood, pin: t.pin_vorm })).j.ok, true);
  const v = (await hp('/api/hooldus/too', {})).j;
  assert.equal(v.too.seade.mudel, 'NA730'); assert.equal(v.too.rike, 'Kalibreerimine');
  const tekst = JSON.stringify(v);
  for (const keel of ['410', 'Geotrade', 'Mari', '51234567', 'hooldused', 'ajalugu', 'Kalibreerimine","intervall']) assert.ok(!tekst.includes(keel), `hooldajale ei lähe: ${keel}`);
  // A: link teisest telefonist
  const ha = telefon(env, '6.6.6.6');
  assert.equal((await ha('/api/hooldus/link', { token: t.link })).j.ok, true);
  assert.equal((await ha('/api/hooldus/link', { token: 'A'.repeat(32) })).status, 404);
  // sissekanded: lisa, muuda (vana versioon jääb), eemalda
  const k1 = (await hp('/api/hooldus/kirje', { liik: 'vastuvott', tekst: 'Vastu võetud, kohver ja statiiv' })).j.too.kirjed[0];
  const k2 = (await hp('/api/hooldus/kirje', { id: k1.id, liik: 'vastuvott', tekst: 'Vastu võetud, kohver (statiivi polnud)' })).j.too.kirjed[0];
  assert.equal(k2.muudetud_kordi, 1); assert.ok(!('ajalugu' in k2), 'hooldaja ei näe versioone (ainult haldur)');
  await hp('/api/hooldus/kirje', { liik: 'too', tekst: 'Kalibreeritud, tunnistus 2026-77', kulu: '85,00' });
  assert.equal((await hp('/api/hooldus/kirje', { liik: 'muu', tekst: 'x', kulu: 'abc' })).j.ok, false);
  const yl = await hp('/api/hooldus/fail?liik=akt&nimi=akt.jpg', JPEG, 'POST', { 'Content-Type': 'image/jpeg' });
  assert.equal(yl.j.ok, true); const voti = yl.j.too.failid[0].voti;
  assert.equal((await hp('/api/hooldus/fail?k=' + encodeURIComponent(voti), null, 'GET')).status, 200);
  assert.equal((await voor('/api/hooldus/fail?k=' + encodeURIComponent(voti), null, 'GET')).status, 401);
  await hp('/api/hooldus/fail-eemalda', { voti });
  assert.equal((await hp('/api/hooldus/too', {})).j.too.failid.length, 0);
  await hp('/api/hooldus/kirje-eemalda', { id: k1.id });
  assert.equal((await hp('/api/hooldus/valmis', { ettepanek: 'valmis', tekst: 'Korras' })).j.too.olek, 'tehtud');
  assert.equal((await hp('/api/hooldus/kirje', { liik: 'muu', tekst: 'Parandus pärast valmis' })).j.ok, true, 'tehtud olekus saab veel parandada');
  // haldur näeb kõike, ka eemaldatut ja versioone
  const ht = (await A('too?id=' + t.too.id)).j.too;
  assert.equal(ht.kirjed.length, 3); assert.ok(ht.kirjed.find((k) => k.id === k1.id).kustutatud); assert.equal(ht.kirjed.find((k) => k.id === k1.id).ajalugu.length, 1);
  assert.ok(ht.failid[0].kustutatud); assert.ok(!('nonce' in ht) && !('token_rasi' in ht));
  // uus PIN: vana PIN, link ja sessioonid lakkavad
  const u = (await A('too-uus-pin', { id: t.too.id })).j;
  assert.notEqual(u.pin, t.pin);
  assert.equal((await hp('/api/hooldus/too', {})).status, 401); assert.equal((await ha('/api/hooldus/too', {})).status, 401);
  assert.equal((await telefon(env, '7.7.7.7')('/api/hooldus/pin', { kood: s.kood, pin: t.pin })).status, 401);
  assert.equal((await telefon(env, '7.7.7.8')('/api/hooldus/link', { token: t.link })).status, 404);
  const hp2 = telefon(env, '8.8.8.8'); assert.equal((await hp2('/api/hooldus/link', { token: u.link })).j.ok, true);
  // sulge: sissekanded hooldusajalukku, plaan tehtud, olek kasutusel, ligipääs lõpeb
  const plaan = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s.kood).hooldused[0].id;
  assert.equal((await A('too-sulge', { id: t.too.id, olek: 'aktiivne', plaan })).j.ok, true);
  assert.equal((await hp2('/api/hooldus/too', {})).status, 401);
  const sd = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s.kood);
  assert.equal(sd.olek, 'aktiivne'); assert.equal(sd.too, null); assert.equal(sd.hooldused[0].tegija, 'Geo Labor OÜ');
  const aj = (await A('hooldused?kood=' + s.kood)).j.hooldused[0];
  assert.equal(aj.kulu, 85); assert.equal(aj.nimi, 'Kalibreerimine'); assert.match(aj.markus, /Kalibreeritud/);
  assert.equal((await voor('/api/avalik', { kood: s.kood })).j.hooldus, undefined, 'pärast sulgemist PIN-i välja pole');
});

test('PIN-i arvamine: IP piir ja töökäsu lukk 10 vea järel; tühistamine taastab oleku', async () => {
  const { env, A, s, h } = await alus();
  const t = (await A('hooldusse', { kood: s.kood, hooldaja: h.id })).j;
  for (let i = 0; i < PIN_VEAD_MAX; i++) await telefon(env, `10.0.0.${i}`)('/api/hooldus/pin', { kood: s.kood, pin: String(i).padStart(8, '0') === t.pin ? '99999999' : String(i).padStart(8, '0') });
  assert.equal((await telefon(env, '10.0.1.1')('/api/hooldus/pin', { kood: s.kood, pin: t.pin })).status, 423, 'lukus ka õige PIN-iga');
  const ip = telefon(env, '10.0.2.1');
  const u = (await A('too-uus-pin', { id: t.too.id })).j;
  for (let i = 0; i < 5; i++) await ip('/api/hooldus/pin', { kood: s.kood, pin: '12345670' });
  assert.equal((await ip('/api/hooldus/pin', { kood: s.kood, pin: u.pin })).status, 429, 'sama IP 5 viga 15 min');
  assert.equal((await A('too-tuhista', { id: t.too.id })).j.ok, true);
  const sd = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s.kood);
  assert.equal(sd.olek, 'aktiivne'); assert.equal(sd.too, null);
  assert.equal((await telefon(env, '10.0.3.1')('/api/hooldus/pin', { kood: s.kood, pin: u.pin })).status, 404);
});

test('kontrolli leid: paralleelsed vale PIN-id ei pääse lukust mööda; lukk on ajutine; kustutatud seade sulgeb töökäsu', async () => {
  const { env, A, s, h, reg } = await alus();
  const t = (await A('hooldusse', { kood: s.kood, hooldaja: h.id })).j;
  const ip = telefon(env, '11.0.0.1');
  const r = await Promise.all(Array.from({ length: 50 }, (_, i) => ip('/api/hooldus/pin', { kood: s.kood, pin: String(10000000 + i) === t.pin ? '1' : String(10000000 + i) })));
  assert.ok(r.filter((x) => x.status === 429).length >= 45, 'sama IP: üle 5 katse → 429 ka paralleelselt');
  const palju = await Promise.all(Array.from({ length: 30 }, (_, i) => telefon(env, `12.0.0.${i}`)('/api/hooldus/pin', { kood: s.kood, pin: '0000000' + (i % 10) === t.pin ? '1' : '0000000' + (i % 10) })));
  assert.ok(palju.filter((x) => x.status === 401).length <= 10, 'töökäsu kohta kuni 10 katset, siis lukus');
  assert.equal((await telefon(env, '13.0.0.1')('/api/hooldus/pin', { kood: s.kood, pin: t.pin })).status, 423);
  // lukk on ajutine: tunni pärast saab uuesti
  const tk = await reg.s.get(`too:${t.too.id}`); tk.pin_lukk_kuni = Date.now() - 1; await reg.s.put(`too:${t.too.id}`, tk);
  const hp = telefon(env, '14.0.0.1');
  assert.equal((await hp('/api/hooldus/pin', { kood: s.kood, pin: t.pin })).j.ok, true);
  // versioonide piir
  let k = (await hp('/api/hooldus/kirje', { liik: 'muu', tekst: 'v0' })).j.too.kirjed[0];
  for (let i = 1; i <= 8; i++) k = (await hp('/api/hooldus/kirje', { id: k.id, liik: 'muu', tekst: 'v' + i })).j.too.kirjed[0];
  assert.equal((await A('too?id=' + t.too.id)).j.too.kirjed[0].ajalugu.length, 5);
  // seadme kustutamine tühistab töökäsu ja sessiooni
  assert.equal((await A('kustuta', { liik: 'seade', id: s.kood })).j.ok, true);
  assert.equal((await hp('/api/hooldus/too', {})).status, 401);
  assert.equal((await A('too?id=' + t.too.id)).j.too.olek, 'tuhistatud');
});

test('ava uuesti (Margo 10.11.2026): 14 päeva, uus link ja PIN, ajaloo kanne tühistatud, plaani kuupäevad tagasi', async () => {
  const { env, A, s, h, reg } = await alus();
  const plaan = s.hooldused[0];
  const t = (await A('hooldusse', { kood: s.kood, hooldaja: h.id })).j;
  const hp = telefon(env, '20.0.0.1'); await hp('/api/hooldus/link', { token: t.link });
  await hp('/api/hooldus/kirje', { liik: 'too', tekst: 'Kalibreeritud', kulu: '50' });
  assert.equal((await A('too-ava', { id: t.too.id, pohjus: 'x x' })).status, 404, 'avatud töökäsku ei ava uuesti');
  await A('too-sulge', { id: t.too.id, olek: 'aktiivne', plaan: plaan.id });
  assert.notEqual((await A('ulevaade')).j.seadmed.find((x) => x.kood === s.kood).hooldused[0].viimati, plaan.viimati);
  assert.equal((await A('too-ava', { id: t.too.id, pohjus: '' })).j.ok, false, 'põhjus kohustuslik');
  const c = klient(env); await c('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: (await A('ulevaade')).j.kohad[0].kood });
  await c('/api/vota', { koodid: [s.kood] });
  assert.equal((await A('too-ava', { id: t.too.id, pohjus: 'suleti ekslikult' })).status, 409, 'seade kellegi nimel');
  await c('/api/tagasta', { koodid: [s.kood] });
  const r = (await A('too-ava', { id: t.too.id, pohjus: 'suleti ekslikult' })).j;
  assert.equal(r.ok, true); assert.notEqual(r.link, t.link); assert.notEqual(r.pin, t.pin);
  assert.equal(r.too.olek, 'avatud'); assert.equal(r.too.kirjed.length, 1, 'sissekanded alles'); assert.equal(r.too.avamised.length, 1);
  const sd = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s.kood);
  assert.equal(sd.olek, 'remondis'); assert.equal(sd.too, t.too.id);
  assert.equal(sd.hooldused[0].viimati, plaan.viimati); assert.equal(sd.hooldused[0].jargmine, plaan.jargmine);
  const aj = (await A('hooldused?kood=' + s.kood)).j.hooldused[0];
  assert.ok(aj.tyhistatud); assert.match(aj.tyhistus, /suleti ekslikult/);
  assert.equal((await telefon(env, '20.0.0.2')('/api/hooldus/link', { token: t.link })).status, 404, 'vana link ei kehti');
  assert.equal((await telefon(env, '20.0.0.3')('/api/hooldus/link', { token: r.link })).j.ok, true);
  // 14 päeva piir
  await A('too-tuhista', { id: t.too.id });
  const tk = await reg.s.get(`too:${t.too.id}`); tk.suletud = Date.now() - 15 * 86400000; await reg.s.put(`too:${t.too.id}`, tk);
  assert.equal((await A('too-ava', { id: t.too.id, pohjus: 'garantii' })).status, 409);
});
