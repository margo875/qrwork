import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keskkond, klient, admin } from './abi.js';
import { normTel, normKood, votmiseKontroll, VAIKESEADED } from '../src/register.js';
import { koodTekstist, kasitsiKood } from '../src/lehed.js';

async function alus() {
  const k = keskkond(); const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu', registreerimine: 'vaba' })).j.koht;
  const s1 = (await A('seade', { nimi: 'Nivelliir', invnr: 'INV-1', asukoht: koht.kood })).j.seade;
  const s2 = (await A('seade', { nimi: 'Laser', asukoht: koht.kood })).j.seade;
  const s3 = (await A('seade', { nimi: 'Puur', asukoht: koht.kood })).j.seade;
  const mari = klient(k.env), jaan = klient(k.env);
  assert.equal((await mari('/api/registreeru', { nimi: 'Mari Maasikas', tel: '5123 4567', parool: 'salasõna', koht: koht.kood })).status, 200);
  assert.equal((await jaan('/api/registreeru', { nimi: 'Jaan Tamm', tel: '+37255555555', parool: 'salasõna2', koht: koht.kood })).status, 200);
  return { ...k, A, koht, s1, s2, s3, mari, jaan };
}

test('abifunktsioonid', () => {
  assert.equal(normTel('5123 4567'), '+37251234567');
  assert.equal(normTel('00372 5123-4567'), '+37251234567');
  assert.equal(normTel('abc'), null);
  assert.equal(normKood('abcd-efgh-jk01'), 'ABCDEFGHJK01');
  assert.equal(normKood('ABCDEFGHJKOI'), 'ABCDEFGHJK01');
  assert.deepEqual(koodTekstist('HTTPS://T.EE/S/ABCDEFGHJK01', 't.ee'), { liik: 'S', kood: 'ABCDEFGHJK01' });
  assert.equal(koodTekstist('https://muu.ee/S/ABCDEFGHJK01', 't.ee'), null);
  assert.equal(koodTekstist('https://t.ee/x/ABCDEFGHJK01', 't.ee'), null);
  assert.equal(koodTekstist('WIFI:S:abc;;', 't.ee'), null);
  assert.equal(kasitsiKood(' abcd efgh jk0l '), 'ABCDEFGHJK01');
  const k = { id: 'A', olek: 'aktiivne' };
  assert.equal(votmiseKontroll({ kasutaja: k, seade: { olek: 'aktiivne', taatlus_kuni: '2000-01-01' }, seaded: VAIKESEADED }).lubatud, false);
  assert.equal(votmiseKontroll({ kasutaja: k, seade: { olek: 'aktiivne', taatlus_kuni: '2000-01-01' }, seaded: { ...VAIKESEADED, taatlus_blokeerib: false } }).lubatud, true);
});

test('registreerimine ja sisselogimine', async () => {
  const { env, koht } = await alus();
  const c = klient(env);
  assert.equal((await c('/api/registreeru', { nimi: 'X Y', tel: '51234567', parool: 'qwerty', koht: koht.kood })).status, 409);
  assert.equal((await c('/api/registreeru', { nimi: 'X Y', tel: '51111111', parool: 'qwerty' })).status, 400, 'töökoha koodita ei saa');
  assert.equal((await c('/api/logi-sisse', { tel: '51234567', parool: 'vale' })).status, 401);
  const r = await c('/api/logi-sisse', { tel: '+372 5123 4567', parool: 'salasõna' });
  assert.equal(r.status, 200); assert.equal(r.j.mina.kasutaja.nimi, 'Mari Maasikas');
  assert.equal((await c('/api/mina')).status, 200);
  assert.equal((await klient(env)('/api/mina')).status, 401);
  // CSRF päiseta
  assert.equal((await c('/api/mina', {}, 'POST', { 'X-QW': '0' })).status, 403);
});

test('mitu seadet korraga ja juurde võtmine', async () => {
  const { mari, s1, s2, s3 } = await alus();
  let r = await mari('/api/vota', { koodid: [s1.kood, s2.kood] });
  assert.deepEqual(r.j.tulemused.map((x) => x.ok), [true, true]);
  r = await mari('/api/vota', { koodid: [s3.kood] });
  assert.equal(r.j.tulemused[0].ok, true, 'juurde võtmine, kui eelmised on veel kasutuses');
  assert.equal(r.j.mina.seadmed.length, 3);
  r = await mari('/api/vota', { koodid: [s1.kood] });
  assert.equal(r.j.tulemused[0].juba, true);
  r = await mari('/api/tagasta', { koodid: [s1.kood, s2.kood] });
  assert.deepEqual(r.j.tulemused.map((x) => x.ok), [true, true]);
  assert.equal(r.j.mina.seadmed.length, 1);
});

test('ülevõtt: eelmine kasutaja ei saa uut võtta enne kinnitust', async () => {
  const { mari, jaan, s1, s2, A } = await alus();
  await mari('/api/vota', { koodid: [s1.kood] });
  // Jaan ilma kinnituseta: vaja_ule
  let r = await jaan('/api/vota', { koodid: [s1.kood] });
  assert.equal(r.j.tulemused[0].vaja_ule, true);
  assert.equal(r.j.tulemused[0].kellel.nimi, 'Mari Maasikas');
  r = await jaan('/api/vota', { koodid: [s1.kood], ule: [s1.kood] });
  assert.equal(r.j.tulemused[0].ok, true);
  // Mari: kinnitamata ülevõtt, uut võtta ei saa
  let m = await mari('/api/mina');
  assert.equal(m.j.kinnitamata.length, 1); assert.equal(m.j.seadmed.length, 0);
  r = await mari('/api/vota', { koodid: [s2.kood] });
  assert.equal(r.j.tulemused[0].ok, false);
  // Mari ei saa ka Jaani käest tagastada
  r = await mari('/api/tagasta', { koodid: [s1.kood] });
  assert.equal(r.j.tulemused[0].ok, false);
  // kinnitus
  r = await mari('/api/kinnita', { id: m.j.kinnitamata[0].id, vastus: 'jah' });
  assert.equal(r.j.mina.kinnitamata.length, 0);
  r = await mari('/api/vota', { koodid: [s2.kood] });
  assert.equal(r.j.tulemused[0].ok, true);
  const u = (await A('ulevaade')).j;
  assert.equal(u.kasutajad.find((k) => k.nimi === 'Mari Maasikas').hilinenud, 1);
});

test('vaidlus läheb haldurile ja vabastab keelu', async () => {
  const { mari, jaan, s1, A } = await alus();
  await mari('/api/vota', { koodid: [s1.kood] });
  await jaan('/api/vota', { koodid: [s1.kood], ule: [s1.kood] });
  const m = await mari('/api/mina');
  assert.equal((await mari('/api/kinnita', { id: m.j.kinnitamata[0].id, vastus: 'vaidlus' })).status, 400, 'põhjenduseta ei saa');
  const r = await mari('/api/kinnita', { id: m.j.kinnitamata[0].id, vastus: 'vaidlus', tekst: 'Seade oli minu autos' });
  assert.equal(r.j.mina.kinnitamata.length, 0);
  const u = (await A('ulevaade')).j;
  assert.equal(u.vaidlused.length, 1);
  assert.equal((await A('vaidlus-lahenda', { voti: u.vaidlused[0].voti, otsus: 'ok' })).j.ok, true);
  assert.equal((await A('ulevaade')).j.vaidlused.length, 0);
});

test('tagastus teise eest ja halduri keelu eemaldamine', async () => {
  const { mari, jaan, s1, s2, A } = await alus();
  await mari('/api/vota', { koodid: [s1.kood] });
  let r = await jaan('/api/tagasta', { koodid: [s1.kood] });
  assert.equal(r.j.tulemused[0].teise_nimel, true);
  r = await jaan('/api/tagasta', { koodid: [s1.kood], teise_eest: [s1.kood] });
  assert.equal(r.j.tulemused[0].ok, true);
  assert.equal((await mari('/api/vota', { koodid: [s2.kood] })).j.tulemused[0].ok, false);
  const mid = (await mari('/api/mina')).j.kasutaja.id;
  assert.equal((await A('kinnitused-eemalda', { id: mid })).j.eemaldatud, 1);
  assert.equal((await mari('/api/vota', { koodid: [s2.kood] })).j.tulemused[0].ok, true);
});

test('remont, taatlus, limiit, tundmatu kood', async () => {
  const { mari, s1, s2, s3, A, koht } = await alus();
  await A('seade', { kood: s1.kood, nimi: 'Nivelliir', olek: 'remondis' });
  await A('seade', { kood: s2.kood, nimi: 'Laser', taatlus_kuni: '2020-01-01' });
  let r = await mari('/api/vota', { koodid: [s1.kood, s2.kood] });
  assert.deepEqual(r.j.tulemused.map((x) => x.ok), [false, false]);
  assert.match(r.j.tulemused[1].viga, /Taatlus/);
  assert.equal((await mari('/api/seade', { kood: 'ABCDEFGHJK01' })).status, 404);
  await A('seaded', { max_seadmeid: 1 });
  await A('seade', { nimi: 'XX', asukoht: koht.kood });
  const s4 = (await A('ulevaade')).j.seadmed.find((s) => s.nimi === 'XX');
  r = await mari('/api/vota', { koodid: [s3.kood, s4.kood] });
  assert.deepEqual(r.j.tulemused.map((x) => x.ok), [true, false]);
});

test('kasutaja ei muuda registrit, märkus läheb kirja', async () => {
  const { mari, s1, A } = await alus();
  assert.equal((await mari('/api/admin/seade', { kood: s1.kood, nimi: 'Häkk' })).status, 401);
  const r = await mari('/api/marge', { kood: s1.kood, tyyp: 'ei_toota', tekst: 'aku ei lae' });
  assert.equal(r.j.ok, true);
  const i = await mari('/api/seade', { kood: s1.kood });
  assert.equal(i.j.seade.margmed.length, 1); assert.equal(i.j.seade.nimi, 'Nivelliir');
  assert.ok(i.j.seade.hoiatused.some((h) => /Ei tööta/.test(h)));
  assert.equal((await A('ulevaade')).j.margmed.length, 1);
});

test('leidja ja lehed', async () => {
  const { env, s1 } = await alus();
  const c = klient(env);
  assert.equal((await c('/api/avalik', { kood: s1.kood })).j.nimi, 'Nivelliir');
  assert.equal((await c('/api/leid', { kood: s1.kood, tekst: 'leidsin', lat: 59.4, lon: 24.7 })).j.ok, true);
  for (const tee of ['/', `/S/${s1.kood}`, `/k/${s1.kood}`, '/admin', '/jsqr.js']) {
    const r = await c(tee, null, 'GET');
    assert.equal(r.status, 200, tee);
  }
  const r = await c(`/S/${s1.kood}`, null, 'GET');
  assert.match(r.r.headers.get('Content-Security-Policy'), /nonce-/);
  assert.equal((await A_bad(env)).status, 401);
});
async function A_bad(env) { return admin({ ...env, ADMIN_TOKEN: 'vale'.repeat(5) })('ulevaade'); }

test('vaikimisi registreerimine vajab halduri kinnitust', async () => {
  const { env, s1 } = await alus();
  const A = admin(env);
  const koht2 = (await A('koht', { nimi: 'Objekt' })).j.koht;
  const c = klient(env);
  const r = await c('/api/registreeru', { nimi: 'Uus Töötaja', tel: '53333333', parool: 'qwerty1', koht: koht2.kood });
  assert.equal(r.j.mina.kasutaja.olek, 'ootel');
  assert.equal((await c('/api/vota', { koodid: [s1.kood] })).status, 403);
  assert.equal((await A('kasutaja', { id: r.j.mina.kasutaja.id, olek: 'aktiivne' })).j.ok, true);
  assert.equal((await c('/api/vota', { koodid: [s1.kood] })).j.tulemused[0].ok, true);
});

test('ülevaatuse parandused: ootel kasutaja, IPv6, koduladu', async () => {
  const { env, mari, s1, A } = await alus();
  const { ipPrefiks } = await import('../src/worker.js');
  assert.equal(ipPrefiks('2001:db8::1'), ipPrefiks('2001:0db8:0:0:5::9'));
  assert.equal(ipPrefiks('2001:db8:1:2::1'), '2001:db8:1:2::/64');
  await mari('/api/vota', { koodid: [s1.kood] });
  const koht2 = (await A('koht', { nimi: 'Objekt' })).j.koht;
  const c = klient(env);
  await c('/api/registreeru', { nimi: 'Võõras Inimene', tel: '54444444', parool: 'qwerty1', koht: koht2.kood });
  assert.equal((await c('/api/otsi', { q: '' })).status, 403);
  assert.equal((await c('/api/marge', { kood: s1.kood, tyyp: 'ei_toota' })).status, 403);
  const kaart = (await c('/api/seade', { kood: s1.kood })).j.seade;
  assert.equal(JSON.stringify(kaart).includes('Mari'), false); assert.equal(JSON.stringify(kaart).includes('+372'), false);
  // koduladu ei muutu tagastusel, tühjendamine töötab
  const ladu = (await A('koht', { nimi: 'Keskladu' })).j.koht;
  await A('seade', { kood: s1.kood, nimi: 'Nivelliir', asukoht: ladu.kood });
  await mari('/api/tagasta', { koodid: [s1.kood], koht: koht2.kood });
  let s = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s1.kood);
  assert.equal(s.koduladu, ladu.kood); assert.equal(s.asukoht, koht2.kood);
  await A('seade', { kood: s1.kood, nimi: 'Nivelliir', asukoht: '' });
  s = (await A('ulevaade')).j.seadmed.find((x) => x.kood === s1.kood);
  assert.equal(s.koduladu, null);
});

test('inventarinumber automaatselt, superkasutaja, laod, kataloogi QR', async () => {
  const { env, mari, A, koht } = await alus();
  assert.equal(koht.lyhend, 'L1');
  const k2 = (await A('koht', { nimi: 'Objekt', lyhend: 'ob' })).j.koht;
  assert.equal(k2.lyhend, 'OB');
  assert.equal((await A('koht', { nimi: 'Topelt', lyhend: 'L1' })).status, 409);
  const aakk = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Tallinn' }).slice(2, 7).replace('-', '');
  const a1 = (await A('seade', { nimi: 'Mõõtelint', asukoht: koht.kood })).j.seade;
  const a2 = (await A('seade', { nimi: 'Mõõtelint 2', asukoht: koht.kood })).j.seade;
  const b1 = (await A('seade', { nimi: 'Kiiver', asukoht: k2.kood })).j.seade;
  assert.equal(a2.invnr.slice(0, 3), 'L1-'); assert.equal(a2.invnr, `L1-${aakk}${String(Number(a1.invnr.slice(-3)) + 1).padStart(3, '0')}`);
  assert.equal(b1.invnr, `OB-${aakk}001`);
  assert.equal((await A('seade', { nimi: 'Ladu puudub' })).status, 400);
  // tavakasutaja: tühi otsing ei näita midagi, laod keelatud
  assert.equal((await mari('/api/otsi', { q: '' })).j.vaja_paringut, true);
  assert.equal((await mari('/api/otsi', { q: 'kiiver' })).j.tulemused.length, 1);
  assert.equal((await mari('/api/laod', {})).status, 403);
  const id = (await mari('/api/mina')).j.kasutaja.id;
  assert.equal((await A('kasutaja', { id, super: true })).j.ok, true);
  assert.ok((await mari('/api/otsi', { q: '' })).j.tulemused.length >= 6);
  await mari('/api/vota', { koodid: [b1.kood] });
  const l = (await mari('/api/laod', {})).j.laod;
  assert.equal(l.find((x) => x.lyhend === 'OB').valjas[0].nimi, 'Kiiver');
  // kataloogi URL avab lehe
  const c = klient(env);
  assert.equal((await c(`/I/${b1.kood}`, null, 'GET')).status, 200);
  const { koodTekstist } = await import('../src/lehed.js');
  assert.deepEqual(koodTekstist(`https://t.ee/I/${b1.kood}`, 't.ee'), { liik: 'I', kood: b1.kood });
});
