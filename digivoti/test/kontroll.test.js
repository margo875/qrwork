// Sõltumatu kontrolli testid (01.11.2026): ründekatsed ja parandatud vigade regressioonitestid.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin, seade, demo } from './abi.js';
import { vordle, csv } from '../src/voti.js';
import { appLeht } from '../src/lehed.js';

const idNimi = (d, nimi) => d.kutsed.find((k) => k.nimi.startsWith(nimi)).id;

test('PARANDUS: samaaegsed vigased sisselogimised ei pääse piirangust (8) mööda; õnnestumine ei kuluta piirangut', async () => {
  const { env } = keskkond();
  const { kasutaja } = await demo(env);
  await kasutaja('Mari');
  const c = klient(env, '7.7.7.7');
  const tulemused = await Promise.all(Array.from({ length: 25 }, (_, i) => c('/api/logi-sisse', { tel: '+37250000001', parool: String(100000 + i) })));
  const vale = tulemused.filter((r) => r.status === 401).length;
  assert.ok(vale <= 8, `paralleelselt proovitud ${vale} PIN-i (lubatud 8)`);
  assert.ok(tulemused.filter((r) => r.status === 429).length >= 17);
  // õiged sisselogimised (teine telefon) ei kuluta piirangut
  const { env: env2 } = keskkond();
  const x = await demo(env2); await x.kasutaja('Kati');
  const c2 = klient(env2, '6.6.6.6');
  for (let i = 0; i < 12; i++) assert.equal((await c2('/api/logi-sisse', { tel: '+37250000003', parool: '123456' })).status, 200, `katse ${i}`);
});

test('PARANDUS: kutse on ühekordne ka samaaegsete päringute korral', async () => {
  const { env } = keskkond();
  const { d } = await demo(env);
  const token = d.kutsed.find((k) => k.nimi.startsWith('Mari')).kutse;
  const [a, b] = [klient(env, '1.1.1.1'), klient(env, '2.2.2.2')];
  const r = await Promise.all([a('/api/kutse', { token, parool: '111111' }), b('/api/kutse', { token, parool: '222222' })]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 404]);
  const voitja = r[0].status === 200 ? a : b, kaotaja = r[0].status === 200 ? b : a;
  assert.equal((await voitja('/api/mina')).status, 200);
  assert.equal((await kaotaja('/api/mina')).status, 401);
});

test('PARANDUS: uus kutse (kadunud telefon) muudab vanad sessioonid kehtetuks kohe', async () => {
  const { env } = keskkond();
  const { d, kasutaja, A, obj } = await demo(env);
  const mari = await kasutaja('Mari');
  assert.equal((await mari('/api/mina')).status, 200);
  const r = await A('kutse', { id: idNimi(d, 'Mari') });
  assert.equal(r.j.sessioone, 1);
  assert.equal((await mari('/api/ava', { kood: obj('Kontori').kood })).status, 401, 'kadunud telefon ei ava enam ust');
});

test('PARANDUS: automaat ei võtnud käsku → ost tühistatakse, palgast ei peeta kinni', async () => {
  const { env, kell } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');
  const kohv = obj('Kohvi');
  const tooted = (await mari('/api/objekt', { kood: kohv.kood })).j.objekt.tooted;
  // 1) automaat on võrgust väljas: käsk aegub
  assert.equal((await mari('/api/ost', { kood: kohv.kood, toode: tooted[0].id })).j.kuu_summa_s, 120);
  kell.t += 25000;
  assert.equal((await mari('/api/mina')).j.ostud_summa_s, 0);
  assert.equal((await A('kuu')).j.kokku_s, 0);
  assert.ok((await A('logi')).j.logi.some((x) => x.tyyp === 'ost_tuhistatud' && x.hind_s === 120));
  // 2) automaat võttis käsu: ost jääb
  await mari('/api/ost', { kood: kohv.kood, toode: tooted[1].id });
  assert.equal((await seade(env)('relee', kohv.kood, kohv.seadmetoken)).j.kask.liik, 'valjasta');
  kell.t += 25000;
  assert.equal((await A('kuu')).j.kokku_s, tooted[1].hind_s);
  // 3) järjekord täis (seade ei küsi): uut ostu ei tehta, vanu ei visata ära
  const { env: e2 } = keskkond();
  const x = await demo(e2);
  const kati = await x.kasutaja('Kati'), jyri = await x.kasutaja('Jüri'), m2 = await x.kasutaja('Mari');
  const k2 = x.obj('Kohvi');
  const t2 = (await kati('/api/objekt', { kood: k2.kood })).j.objekt.tooted[0];
  for (const c of [kati, jyri, m2]) for (let i = 0; i < 3; i++) assert.equal((await c('/api/ost', { kood: k2.kood, toode: t2.id })).status, 200);
  assert.equal((await kati('/api/ost', { kood: k2.kood, toode: t2.id })).status, 200); // 10.
  const yle = await jyri('/api/ost', { kood: k2.kood, toode: t2.id });
  assert.equal(yle.status, 503);
  assert.equal((await x.A('kuu')).j.ostude_arv, 10);
});

test('PARANDUS: töösuhte lõpp enne väljastamist tühistab ka ostu', async () => {
  const { env } = keskkond();
  const { d, obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');
  const kohv = obj('Kohvi');
  const t = (await mari('/api/objekt', { kood: kohv.kood })).j.objekt.tooted[2];
  await mari('/api/ost', { kood: kohv.kood, toode: t.id });
  assert.equal((await A('peata', { id: idNimi(d, 'Mari') })).j.kaske, 1);
  assert.equal((await seade(env)('relee', kohv.kood, kohv.seadmetoken)).j.kask, null);
  assert.equal((await A('kuu')).j.kokku_s, 0);
});

test('ründekatse: hind ja kogus tulevad serverist, teise automaadi toode ei sobi', async () => {
  const { env } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');
  const kohv = obj('Kohvi'), snakk = obj('Snäki');
  const latte = (await mari('/api/objekt', { kood: kohv.kood })).j.objekt.tooted.find((x) => x.nimi === 'Latte');
  const sok = (await mari('/api/objekt', { kood: snakk.kood })).j.objekt.tooted[0];
  const r = await mari('/api/ost', { kood: kohv.kood, toode: latte.id, hind_s: -500, kogus: -3, summa: 0 });
  assert.equal(r.j.hind_s, 200);
  assert.equal((await mari('/api/ost', { kood: kohv.kood, toode: sok.id })).status, 404);
  assert.equal((await mari('/api/ost', { kood: kohv.kood, toode: { $ne: 1 } })).status, 404);
  assert.equal((await mari('/api/ost', { kood: obj('Kontori').kood, toode: latte.id })).status, 404, 'uks ei ole automaat');
  assert.equal((await A('kuu')).j.kokku_s, 200);
});

test('ründekatse: IDOR – mina ja kasutuse lõpetamine', async () => {
  const { env } = keskkond();
  const { obj, kasutaja } = await demo(env);
  const mari = await kasutaja('Mari'), kati = await kasutaja('Kati');
  const printer = obj('Printer'), kohv = obj('Kohvi');
  assert.equal((await kati('/api/kasutus-alusta', { kood: printer.kood })).status, 200);
  assert.equal((await mari('/api/kasutus-lopeta', { kood: printer.kood })).status, 409);
  const t = (await kati('/api/objekt', { kood: kohv.kood })).j.objekt.tooted[0];
  await kati('/api/ost', { kood: kohv.kood, toode: t.id });
  const m = (await mari('/api/mina', { kasutaja: 'muu', id: 'X' })).j;
  assert.equal(m.ostud.length, 0); assert.equal(m.ostud_summa_s, 0); assert.equal(m.kasutused.length, 0);
});

test('ründekatse: relee ilma õiguseta, võltsitud X-IP-Rasi ei möödu piirangust', async () => {
  const { env } = keskkond();
  const { obj, kasutaja } = await demo(env);
  const kati = await kasutaja('Kati');
  const ladu = obj('Lao'), auto = obj('Tööauto');
  assert.equal((await kati('/api/ava', { kood: ladu.kood, d: 'AAAAAAAA' })).status, 403);
  assert.equal((await kati('/api/ava', { kood: auto.kood })).status, 404, 'auto ei ole uks');
  assert.equal((await seade(env)('relee', ladu.kood, ladu.seadmetoken)).j.kask, null);
  // seadmetokeni arvamine: 20 viga → 429 ka siis, kui klient saadab iga kord uue X-IP-Rasi päise
  let viimane;
  for (let i = 0; i < 22; i++) {
    viimane = await worker.fetch(new Request(`https://t.ee/api/relee/${ladu.kood}`, { method: 'POST', headers: { Authorization: 'Bearer ' + 'B'.repeat(32), 'X-IP-Rasi': 'v' + i, 'CF-Connecting-IP': '3.3.3.3' } }), env, {});
  }
  assert.equal(viimane.status, 429);
});

test('ründekatse: CSV valemisüst nimedes ja toodetes, vordle', async () => {
  const { env } = keskkond();
  const A = admin(env);
  const u = (await A('kasutaja', { nimi: '=HYPERLINK("http://x","y")', tel: '5111 1111', ryhmad: '*' })).j;
  const o = (await A('objekt', { tyyp: 'automaat', nimi: '@SUM(A1)', ryhmad: '*' })).j;
  await A('tooted', { kood: o.kood, tooted: [{ nimi: '-2+3', hind_s: 50 }, { nimi: '+1', hind_s: 60 }] });
  const c = klient(env);
  await c('/api/kutse', { token: u.kutse, parool: '123456' });
  const t = (await c('/api/objekt', { kood: o.kood })).j.objekt.tooted;
  for (const x of t) assert.equal((await c('/api/ost', { kood: o.kood, toode: x.id })).status, 200);
  const s = (await A('aruanne.csv?liik=ostud')).j;
  for (const rida of s.slice(1).trim().split('\r\n').slice(1)) for (const lahter of rida.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const v = lahter.replace(/^"|"$/g, '');
    assert.ok(!/^[=+\-@]/.test(v), `ohtlik lahter: ${lahter}`);
  }
  assert.equal(csv([['\t=1', '\r=1']]), "﻿'\t=1;\"'\r=1\"\r\n");
  assert.equal(vordle('Bearer abc', 'Bearer abd'), false);
  assert.equal(vordle('Bearer abc', 'Bearer abc '), false);
  assert.equal(vordle('Bearer abc', 'Bearer abc'), true);
});

test('ründekatse: XSS – lehe esc() ja URL-i parameetrid ei lähe lehte toorelt', async () => {
  const h = appLeht('N', { kood: 'ABCDEFGHJKMN', d: '12345678' });
  const escRida = /const esc=(.+?);\n/.exec(h)[1];
  const esc = new Function(`return ${escRida}`)();
  assert.equal(esc('<img src=x onerror=alert(1)>"\''), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;');
  const { env } = keskkond();
  const r = await (await worker.fetch(new Request('https://t.ee/O/ABCDEFGHJKMN?d=%3C/script%3E%3Cscript%3Ealert(1)'), env, {})).text();
  assert.ok(!r.includes('<script>alert'), 'd parameeter puhastatakse');
});
