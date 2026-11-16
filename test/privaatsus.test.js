// Privaatsusteabe nõuded: advisor teadmised/krativara/03 „Avatud küsimused“ p 6.1–6.8
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin } from './abi.js';
import { appLeht, koodTekstist } from '../src/lehed.js';
import { teavita } from '../src/teavita.js';

const PAEV = 86400000;
class R2 {
  constructor() { this.m = new Map(); }
  async put(k, v, o) { this.m.set(k, { b: v, o }); }
  async get(k) { const x = this.m.get(k); return x ? { body: x.b, httpMetadata: x.o?.httpMetadata } : null; }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = '' } = {}) { return { objects: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false }; }
}

function pyuaFetch() {
  const saadetud = [];
  const vana = globalThis.fetch;
  globalThis.fetch = async (url, o) => { saadetud.push({ url: String(url), body: String(o?.body || ''), headers: o?.headers || {} }); return new Response('{}', { status: 200 }); };
  return { saadetud, taasta: () => { globalThis.fetch = vana; } };
}

async function alus(lisa = {}) {
  const k = keskkond(lisa); const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu', registreerimine: 'vaba' })).j.koht;
  const ootel = (await A('koht', { nimi: 'Objekt', registreerimine: 'kinnitamisega' })).j.koht;
  const s1 = (await A('seade', { nimi: 'Nivelliir', asukoht: koht.kood })).j.seade;
  const mari = klient(k.env), jaan = klient(k.env);
  await mari('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: koht.kood, noustun: true });
  await jaan('/api/registreeru', { nimi: 'Jaan Tamm', tel: '55555555', parool: 'salasõna2', koht: koht.kood, noustun: true });
  return { ...k, A, koht, ootel, s1, mari, jaan };
}

test('6.1 leidja: asukoha linnuke vaikimisi väljas, selgitav lause ja privaatsusteave', async () => {
  const h = appLeht('n', { seade: 'ABCDEFGHJK01' });
  assert.ok(h.includes('<input type="checkbox" id="gps">'), 'linnuke ei ole vaikimisi märgitud');
  assert.ok(!/id="gps" checked/.test(h));
  assert.match(h, /Asukoht saadetakse ainult siis, kui märgid selle kasti/);
  assert.match(h, /\/privaatsus#leidja/);
  const { env, s1 } = await alus({ TG_BOT_TOKEN: 'x', TG_CHAT_ID: '1' });
  const r = await klient(env)('/api/avalik', { kood: s1.kood });
  assert.equal(r.j.leid_paevi, 90);
  assert.deepEqual(r.j.kanalid, ['Telegram']);
  assert.match(r.j.privaatsus, /nõusolek/);
});

test('6.2 teavitustes pole telefoninumbrit ega Telegrami asukohasõnumit', async () => {
  const f = pyuaFetch();
  try {
    const { env, A, ootel, s1, mari, jaan } = await alus({ TG_BOT_TOKEN: 'x', TG_CHAT_ID: '1' });
    await klient(env)('/api/registreeru', { nimi: 'Uus Tegija', tel: '56666666', parool: 'salasõna3', koht: ootel.kood, noustun: true });
    await mari('/api/vota', { koodid: [s1.kood] });
    await jaan('/api/vota', { koodid: [s1.kood], ule: [s1.kood] });
    const m = await mari('/api/mina');
    await mari('/api/kinnita', { id: m.j.kinnitamata[0].id, vastus: 'vaidlus', tekst: 'Ei andnud üle' });
    await jaan('/api/marge', { kood: s1.kood, tyyp: 'kahjustus', tekst: 'Mõra' });
    await klient(env)('/api/leid', { kood: s1.kood, tekst: 'Leidsin', lat: 59.43, lon: 24.75, tapsus: 10 });
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(f.saadetud.length >= 5, `teavitusi ${f.saadetud.length}`);
    for (const x of f.saadetud) {
      assert.ok(!x.url.includes('sendLocation'), 'Telegrami asukohasõnum');
      assert.ok(!/\+372|5123 ?4567|55555555|56666666/.test(x.body), `telefon teavituses: ${x.body}`);
    }
    assert.ok(f.saadetud.some((x) => x.body.includes('maps.google.com')), 'leidja asukoht on tekstis lingina');
    assert.ok(f.saadetud.some((x) => x.body.includes('Jaan Tamm')), 'nimi jääb');
    void A;
  } finally { f.taasta(); }
});

test('6.5 ntfy ainult ligipääsuvõtmega', async () => {
  const f = pyuaFetch();
  try {
    assert.equal(await teavita({ NTFY_TOPIC: 't' }, 'x'), 0);
    assert.equal(f.saadetud.length, 0);
    await teavita({ NTFY_TOPIC: 't', NTFY_TOKEN: 'tk', NTFY_URL: 'https://ntfy.example.eu' }, 'x');
    assert.equal(f.saadetud.length, 1);
    assert.equal(f.saadetud[0].headers.Authorization, 'Bearer tk');
    assert.ok(f.saadetud[0].url.startsWith('https://ntfy.example.eu/'));
  } finally { f.taasta(); }
});

test('6.3 säilitus: logi anonüümimine, hoia, lahendamata vaidlus, leiuteade, broneering, lahkunud töötaja', async () => {
  const { env, reg, storage, A, s1, mari, jaan, koht } = await alus();
  const s2 = (await A('seade', { nimi: 'Laser', asukoht: koht.kood })).j.seade;
  await mari('/api/vota', { koodid: [s1.kood, s2.kood] });
  await mari('/api/tagasta', { koodid: [s1.kood] });
  await jaan('/api/vota', { koodid: [s2.kood], ule: [s2.kood] });   // s2: Mari peab vastama → vaidlus
  const m = await mari('/api/mina');
  await mari('/api/kinnita', { id: m.j.kinnitamata[0].id, vastus: 'vaidlus', tekst: 'Ei' });
  const t = new Date(Date.now() + 2 * PAEV).toISOString().slice(0, 10);
  await jaan('/api/broneeri', { kood: s1.kood, algus: t, lopp: t });
  await klient(env)('/api/leid', { kood: s1.kood, tekst: 'Leidsin', kontakt: 'leidja@x.ee' });
  let logi = (await A('logi')).j.logi;
  const hoitav = logi.find((x) => x.tyyp === 'tagastus');
  assert.equal((await A('hoia', { voti: hoitav.voti, hoia: true })).j.ok, true);

  // 100 päeva hiljem: leiuteade kustub, logi veel mitte
  let r = await reg.sailitus(Date.now() + 100 * PAEV);
  assert.equal(r.leid_kustutatud, 1); assert.equal(r.logi_anon, 0);
  assert.equal(r.bron_kustutatud, 1, 'broneering 30 päeva pärast lõppu');
  // 25 kuu pärast: nimi anonüümseks, v.a hoia ja lahendamata vaidlusega seade (s2)
  r = await reg.sailitus(Date.now() + 25 * 30.5 * PAEV);
  assert.ok(r.logi_anon > 0);
  logi = (await A('logi')).j.logi;
  const s1read = logi.filter((x) => x.kood === s1.kood && ['vott', 'tagastus', 'broneering'].includes(x.tyyp));
  for (const x of s1read) {
    if (x.voti === hoitav.voti) { assert.equal(x.nimi, 'Mari Maasikas', 'hoia'); continue; }
    assert.equal(x.nimi, 'endine kasutaja'); assert.equal(x.kasutaja, undefined);
  }
  assert.ok(logi.filter((x) => x.kood === s2.kood && x.tyyp === 'ulevott').every((x) => x.nimi === 'Jaan Tamm'), 'lahendamata vaidlus kaitseb');
  // seadme ajalugu (kolleegidele) on samuti anonüümitud
  const aj = (await A(`logi?kood=${s1.kood}`)).j.logi; // ajalugu:<kood>: koopiad (seadme kaart kolleegidele)
  assert.ok(aj.some((x) => x.nimi === 'endine kasutaja'));
  assert.ok(!aj.some((x) => x.nimi === 'Jaan Tamm'));
  // 37 kuu pärast kaob ka vaidluse kaitse (ülempiir 36 kuud)
  await reg.sailitus(Date.now() + 37 * 30.5 * PAEV);
  logi = (await A('logi')).j.logi;
  assert.ok(logi.filter((x) => x.kood === s2.kood && x.tyyp === 'ulevott').every((x) => x.nimi === 'endine kasutaja'));
  void storage;
});

test('6.3 lahkunud töötaja: parool ja sessioon kohe kustu, nimi ja telefon anonüümseks', async () => {
  const { env, reg, A, mari } = await alus();
  const u = (await A('ulevaade')).j;
  const id = u.kasutajad.find((k) => k.nimi === 'Mari Maasikas').id;
  assert.equal((await A('kasutaja', { id, lahkunud: true, korras: true })).j.ok, true);
  assert.equal((await mari('/api/mina')).status, 401, 'sessioon kustutatud');
  assert.equal((await klient(env)('/api/logi-sisse', { tel: '51234567', parool: 'salasõna' })).status, 401, 'parool kustutatud');
  await reg.sailitus(Date.now() + 10 * PAEV);
  assert.equal((await A('ulevaade')).j.kasutajad.find((k) => k.id === id).nimi, 'Mari Maasikas', '30 päeva pole veel täis');
  await reg.sailitus(Date.now() + 31 * PAEV);
  const k = (await A('ulevaade')).j.kasutajad.find((x) => x.id === id);
  assert.equal(k.nimi, 'endine kasutaja'); assert.equal(k.tel, '');
  // sama numbriga saab uuesti registreeruda
  const koht = (await A('ulevaade')).j.kohad[0].kood;
  assert.equal((await klient(env)('/api/registreeru', { nimi: 'Mari Uus', tel: '51234567', parool: 'salasõna', koht, noustun: true })).status, 200);
});

test('6.4 fotod kustuvad 6 kuu pärast, kaitstud juhtumi foto jääb', async () => {
  const FOTOD = new R2();
  const { reg, storage } = await alus({ FOTOD });
  const vana = Date.now() - 200 * PAEV;
  const k1 = `f/AAAAAAAAAA/${String(vana)}-AAAAAA.jpg`, k2 = `f/AAAAAAAAAA/${String(vana)}-BBBBBB.jpg`, k3 = `f/AAAAAAAAAA/${String(Date.now())}-CCCCCC.jpg`;
  for (const k of [k1, k2, k3]) await FOTOD.put(k, new Uint8Array(1));
  await storage.put('logi:0000000000001:ZZZZ', { tyyp: 'vott', kood: 'X', nimi: 'A', aeg: vana, foto: k2, hoia: 1 });
  const r = await reg.sailitus();
  assert.equal(r.foto_kustutatud, 1);
  assert.ok(!FOTOD.m.has(k1)); assert.ok(FOTOD.m.has(k2)); assert.ok(FOTOD.m.has(k3));
});

test('6.6 vana aadress suunab uuele, vanad kleebised skännivad', async () => {
  const { env } = keskkond();
  const r = await worker.fetch(new Request('https://kratt.kindavel.ee/S/ABCDEFGHJK01'), env, {});
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('Location'), 'https://krativara.kindavel.ee/S/ABCDEFGHJK01');
  assert.deepEqual(koodTekstist('HTTPS://KRATT.KINDAVEL.EE/S/ABCDEFGHJK01', ['krativara.kindavel.ee', 'kratt.kindavel.ee']), { liik: 'S', kood: 'ABCDEFGHJK01' });
});

test('6.7 registreerimine nõuab tingimustega tutvumist; /privaatsus ja /tingimused', async () => {
  const { env, A, koht } = await alus({ NTFY_TOPIC: 't', NTFY_TOKEN: 'x' });
  let r = await klient(env)('/api/registreeru', { nimi: 'Pille Pirn', tel: '57777777', parool: 'salasõna', koht: koht.kood });
  assert.equal(r.status, 400); assert.match(r.j.viga, /kasutustingimuste/);
  assert.match(appLeht('n', {}), /id="noustun"/);
  await A('seaded', { firma: 'Näide AS', registrikood: '10000000', andmekaitse_kontakt: 'andmed@naide.ee', sail_logi_kuud: 18 });
  const p = await worker.fetch(new Request('https://t.ee/privaatsus'), env, {});
  assert.equal(p.status, 200);
  const h = await p.text();
  assert.match(h, /Näide AS/); assert.match(h, /10000000/); assert.match(h, /18 kuud sündmusest/); assert.match(h, /ntfy/);
  assert.match(h, /täitmata: aadress/); assert.match(h, /id="leidja"/);
  assert.ok(!/<script/i.test(h));
  const t = await (await worker.fetch(new Request('https://t.ee/tingimused'), env, {})).text();
  assert.match(t, /Kasutustingimused/); assert.match(t, /kuni 20 seadet/);
});

test('6.8 täielik eksport ja ühe isiku eksport; paroolid ei lähe', async () => {
  const { env, A, mari, s1 } = await alus();
  await mari('/api/vota', { koodid: [s1.kood] });
  const r = await A('eksport.json');
  const e = typeof r.j === 'string' ? JSON.parse(r.j) : r.j;
  for (const v of ['laod', 'seadmed', 'kasutajad', 'laenud', 'logi', 'margmed', 'vaidlused', 'broneeringud', 'taatlused']) assert.ok(Array.isArray(e[v]), v);
  assert.ok(!JSON.stringify(e).includes('pbkdf2'), 'parooli räsi ei lähe');
  assert.ok(!('kalender_token' in e.seaded));
  const id = e.kasutajad.find((k) => k.nimi === 'Mari Maasikas').id;
  const r2 = await A(`eksport.json?kasutaja=${id}`);
  const e2 = typeof r2.j === 'string' ? JSON.parse(r2.j) : r2.j;
  assert.equal(e2.kasutaja.id, id);
  assert.ok(e2.logi.length >= 2 && e2.logi.every((x) => x.kasutaja === id));
  assert.equal(e2.laenud.length, 1);
  void env;
});

test('6.3 säilitusaegade seaded on piiratud', async () => {
  const { A } = await alus();
  assert.equal((await A('seaded', { sail_logi_kuud: 40 })).status, 400);
  assert.equal((await A('seaded', { sail_logi_kuud: 30, sail_max_kuud: 20 })).status, 400);
  assert.equal((await A('seaded', { sail_logi_kuud: 12 })).j.seaded.sail_logi_kuud, 12);
});

test('lehtede skriptid on süntaktiliselt korras', async () => {
  const { adminLeht } = await import('../src/lehed.js');
  for (const h of [appLeht('n', {}), adminLeht('n')]) {
    const m = /<script nonce="n">([\s\S]*?)<\/script>/.exec(h);
    assert.ok(m);
    assert.doesNotThrow(() => new Function(m[1].replace('document.currentScript.nonce', "'n'")));
  }
});
