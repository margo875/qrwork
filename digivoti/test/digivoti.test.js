// QR-digivõti: reeglite testid (node --test). Mälus storage, juhitav kell.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin, seade, demo } from './abi.js';
import { oiguseKontroll, ajaakenLubab, dynKood, AKEN_MS, csv, normKood } from '../src/voti.js';
import { koodTekstist, sendidEurost } from '../src/lehed.js';

test('õigus: rühmaga avab, ilma rühmata keelatud, keeld logitakse', async () => {
  const { env } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');   // Kontor, Autojuhid
  const kati = await kasutaja('Kati');   // Kontor
  const kontor = obj('Kontori');
  const r = await mari('/api/ava', { kood: kontor.kood });
  assert.equal(r.status, 200); assert.equal(r.j.avatud, true);
  const auto = obj('Tööauto');
  const r2 = await kati('/api/kasutus-alusta', { kood: auto.kood, odo: 48300 });
  assert.equal(r2.status, 403); assert.match(r2.j.viga, /ligipääsu/);
  const ladu = obj('Lao');
  const r3 = await mari('/api/ava', { kood: ladu.kood, d: 'AAAAAAAA' });
  assert.equal(r3.status, 403); assert.match(r3.j.viga, /ligipääsu/);
  const logi = (await A('logi')).j.logi;
  assert.ok(logi.some((x) => x.tyyp === 'uks_keeldutud' && x.nimi === 'Mari Maasikas'));
  assert.ok(logi.some((x) => x.tyyp === 'uks_avatud' && x.nimi === 'Mari Maasikas'));
});

test('ajaaken: E–R 07–19 Eesti aja järgi (suve- ja talveaeg)', () => {
  const a = { paevad: [1, 2, 3, 4, 5], algus: '07:00', lopp: '19:00' };
  assert.equal(ajaakenLubab(a, Date.parse('2026-11-04T10:00:00+02:00')), true);   // kolmapäev
  assert.equal(ajaakenLubab(a, Date.parse('2026-11-04T06:59:00+02:00')), false);
  assert.equal(ajaakenLubab(a, Date.parse('2026-11-04T19:00:00+02:00')), false);
  assert.equal(ajaakenLubab(a, Date.parse('2026-11-07T10:00:00+02:00')), false);  // laupäev
  assert.equal(ajaakenLubab(a, Date.parse('2026-07-01T04:30:00Z')), true);        // suveaeg: 07:30 Tallinnas
  assert.equal(ajaakenLubab(null, 0), true);
  const k = { olek: 'aktiivne', ryhmad: ['Ladu'] };
  assert.equal(oiguseKontroll({ kasutaja: k, objekt: { ryhmad: ['Ladu'], ajaaken: a }, nyyd: Date.parse('2026-11-08T12:00:00+02:00') }).lubatud, false);
});

test('ajaaken integratsioonis: laupäeval lao uks ei avane', async () => {
  const { env, kell } = keskkond();
  const { obj, kasutaja } = await demo(env);
  const jyri = await kasutaja('Jüri');
  const ladu = obj('Lao');
  const rasi = (await env.DIGIVOTI.get().fetch(new Request('https://t.ee/api/ekraan/' + ladu.kood, { method: 'POST', headers: { Authorization: 'Bearer ' + ladu.seadmetoken } }))).json();
  const d = new URL((await rasi).url).searchParams.get('d');
  assert.equal((await jyri('/api/ava', { kood: ladu.kood, d })).status, 200);
  kell.t = Date.parse('2026-11-07T10:00:00+02:00');
  const r = await jyri('/api/ava', { kood: ladu.kood, d });
  assert.equal(r.status, 403); assert.match(r.j.viga, /E–R 07:00–19:00/);
});

test('muutuv QR: kehtiv avab, eelmine aken kehtib, vanem ja staatiline keelatud', async () => {
  const { env, kell, storage } = keskkond();
  const { obj, kasutaja } = await demo(env);
  const jyri = await kasutaja('Jüri');
  const ladu = obj('Lao');
  const S = seade(env);
  const e = await S('ekraan', ladu.kood, ladu.seadmetoken);
  assert.equal(e.status, 200);
  const d = new URL(e.j.url).searchParams.get('d');
  assert.match(d, /^[0-9A-Z]{8}$/);
  // ekraan vajab seadmetokenit
  assert.equal((await S('ekraan', ladu.kood, 'X'.repeat(32))).status, 401);
  // staatiline kood (ilma d-ta) ei ava
  const st = await jyri('/api/ava', { kood: ladu.kood });
  assert.equal(st.status, 403); assert.match(st.j.viga, /muutuv QR/);
  // kehtiv
  assert.equal((await jyri('/api/ava', { kood: ladu.kood, d })).status, 200);
  // üks aken hiljem kehtib veel
  kell.t += AKEN_MS;
  assert.equal((await jyri('/api/ava', { kood: ladu.kood, d })).status, 200);
  // kaks akent hiljem aegunud
  kell.t += AKEN_MS;
  const vana = await jyri('/api/ava', { kood: ladu.kood, d });
  assert.equal(vana.status, 403); assert.match(vana.j.viga, /aegunud/);
  // tulevikuakna kood ei kehti (ei saa ette arvutada)
  const o = await storage.get('objekt:' + ladu.kood);
  const tulevik = await dynKood(o.saladus, Math.floor(kell.t / AKEN_MS) + 2);
  assert.equal((await jyri('/api/ava', { kood: ladu.kood, d: tulevik })).status, 403);
  // teise ukse saladusega tehtud kood ei sobi
  const kontor = await storage.get('objekt:' + obj('Kontori').kood);
  const vale = await dynKood(kontor.saladus, Math.floor(kell.t / AKEN_MS));
  assert.equal((await jyri('/api/ava', { kood: ladu.kood, d: vale })).status, 403);
  // staatilise ukse ekraani ei ole
  assert.equal((await S('ekraan', obj('Kontori').kood, obj('Kontori').seadmetoken)).status, 400);
});

test('relee: käsk on ühekordne, vajab seadmetokenit, aegub', async () => {
  const { env, kell } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');
  const kontor = obj('Kontori');
  const S = seade(env);
  assert.equal((await S('relee', kontor.kood, kontor.seadmetoken)).j.kask, null);
  await mari('/api/ava', { kood: kontor.kood });
  // ilma tokenita / vale tokeniga / teise seadme tokeniga: keelatud ja käsk jääb alles
  assert.equal((await S('relee', kontor.kood)).status, 401);
  assert.equal((await S('relee', kontor.kood, 'A'.repeat(32))).status, 401);
  assert.equal((await S('relee', kontor.kood, obj('Lao').seadmetoken)).status, 401);
  const k1 = await S('relee', kontor.kood, kontor.seadmetoken);
  assert.equal(k1.j.kask.liik, 'ava'); assert.equal(k1.j.kask.sekundit, 5); assert.equal(k1.j.kask.kellele, 'Mari Maasikas');
  assert.equal((await S('relee', kontor.kood, kontor.seadmetoken)).j.kask, null, 'teist korda sama käsku ei anta');
  // aegunud käsku ei täideta
  await mari('/api/ava', { kood: kontor.kood });
  kell.t += 25000;
  assert.equal((await S('relee', kontor.kood, kontor.seadmetoken)).j.kask, null);
  // uus token: vana lakkab töötamast
  const uus = (await A('seadmetoken', { kood: kontor.kood })).j.seadmetoken;
  assert.equal((await S('relee', kontor.kood, kontor.seadmetoken)).status, 401);
  assert.equal((await S('relee', kontor.kood, uus)).status, 200);
  // GET ei ole lubatud
  const g = await worker.fetch(new Request(`https://t.ee/api/relee/${kontor.kood}`, { headers: { Authorization: 'Bearer ' + uus } }), env, {});
  assert.equal(g.status, 405);
});

test('töösuhte lõpp: peatatud kasutaja ei ava midagi, vanad sessioonid kehtetud', async () => {
  const { env } = keskkond();
  const { d, obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari');
  const telefon2 = klient(env, '5.6.7.8');
  assert.equal((await telefon2('/api/logi-sisse', { tel: '5000 0001', parool: '123456' })).status, 200);
  const kontor = obj('Kontori'), kohv = obj('Kohvi'), auto = obj('Tööauto');
  const toode = (await mari('/api/objekt', { kood: kohv.kood })).j.objekt.tooted[0].id;
  assert.equal((await mari('/api/kasutus-alusta', { kood: auto.kood, odo: 48300, eesmark: 'objekt' })).status, 200);
  await mari('/api/ava', { kood: kontor.kood });                 // ootel käsk releele
  const vanaKypsis = mari.kypsis();
  const id = d.kutsed.find((k) => k.nimi.startsWith('Mari')).id;
  const p = await A('peata', { id });
  assert.equal(p.j.ok, true); assert.equal(p.j.sessioone, 2); assert.equal(p.j.kaske, 1); assert.equal(p.j.kasutusi, 1);
  // ootel käsk on tühistatud
  assert.equal((await seade(env)('relee', kontor.kood, kontor.seadmetoken)).j.kask, null);
  // mõlemad telefonid on välja logitud; ükski objekt ei avane
  for (const c of [mari, telefon2]) {
    assert.equal((await c('/api/ava', { kood: kontor.kood })).status, 401);
    assert.equal((await c('/api/ost', { kood: kohv.kood, toode })).status, 401);
    assert.equal((await c('/api/kasutus-alusta', { kood: auto.kood, odo: 48400 })).status, 401);
    assert.equal((await c('/api/mina')).status, 401);
  }
  // vana küpsis uuesti kasutades ei tööta; sisselogimine ja vana kutse ei tööta
  const c3 = klient(env); c3.seaKypsis(vanaKypsis);
  assert.equal((await c3('/api/ava', { kood: kontor.kood })).status, 401);
  assert.equal((await c3('/api/logi-sisse', { tel: '+37250000001', parool: '123456' })).status, 403);
  assert.equal((await c3('/api/kutse', { token: d.kutsed.find((k) => k.nimi.startsWith('Mari')).kutse, parool: '654321' })).status, 404);
  assert.equal((await A('kutse', { id })).status, 409);
  // kasutus lõpetati automaatselt, sõidupäevikus märkusega
  const sp = (await A('aruanne.csv?liik=soidupaevik')).j;
  assert.match(sp, /töösuhe lõppes/);
  // logi
  assert.ok((await A('logi')).j.logi.some((x) => x.tyyp === 'toosuhe_lopp'));
});

test('ost ja kuuaruanne: summa sentides, kinnipidamine töötaja kaupa, CSV Exceli jaoks', async () => {
  const { env, kell } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari'), jyri = await kasutaja('Jüri');
  const kohv = obj('Kohvi'), snakk = obj('Snäki');
  const tk = (await mari('/api/objekt', { kood: kohv.kood })).j.objekt.tooted;
  const ts = (await mari('/api/objekt', { kood: snakk.kood })).j.objekt.tooted;
  const latte = tk.find((t) => t.nimi === 'Latte'), espresso = tk.find((t) => t.nimi === 'Espresso'), sok = ts.find((t) => t.nimi === 'Šokolaad');
  let r = await mari('/api/ost', { kood: kohv.kood, toode: latte.id });
  assert.equal(r.j.ok, true); assert.equal(r.j.hind_s, 200); assert.equal(r.j.kuu_summa_s, 200);
  r = await mari('/api/ost', { kood: snakk.kood, toode: sok.id });
  assert.equal(r.j.kuu_summa_s, 350);
  await jyri('/api/ost', { kood: kohv.kood, toode: espresso.id });
  // relee „väljasta“ käsk
  const k = (await seade(env)('relee', kohv.kood, kohv.seadmetoken)).j.kask;
  assert.equal(k.liik, 'valjasta'); assert.equal(k.toode, 'Latte');
  // automaadid võtavad ka ülejäänud käsud (võtmata käsk aegub ja ost tühistatakse, vt kontrolli testid)
  assert.equal((await seade(env)('relee', kohv.kood, kohv.seadmetoken)).j.kask.toode, 'Espresso');
  assert.equal((await seade(env)('relee', snakk.kood, snakk.seadmetoken)).j.kask.toode, 'Šokolaad');
  // tundmatu toode
  assert.equal((await mari('/api/ost', { kood: kohv.kood, toode: 'XXXXXX' })).status, 404);
  // hind muutub: varasem ost jääb vana hinnaga
  await A('tooted', { kood: kohv.kood, tooted: tk.map((t) => (t.id === latte.id ? { ...t, hind_s: 250 } : t)) });
  // järgmise kuu ost ei lähe novembrisse
  kell.t = Date.parse('2026-12-01T09:00:00+02:00');
  await mari('/api/ost', { kood: kohv.kood, toode: latte.id });
  const kuu = (await A('kuu?kuu=2026-11')).j;
  assert.equal(kuu.kokku_s, 470); assert.equal(kuu.ostude_arv, 3);
  assert.deepEqual(kuu.kinnipidamised.map((x) => [x.nimi, x.summa_s]), [['Jüri Juurikas', 120], ['Mari Maasikas', 350]]);
  assert.equal((await A('kuu?kuu=2026-12')).j.kokku_s, 250);
  const c = await A('aruanne.csv?liik=kinnipidamised&kuu=2026-11');
  assert.match(c.r.headers.get('Content-Type'), /text\/csv/);
  assert.equal(c.j.charCodeAt(0), 0xfeff, 'UTF-8 BOM');
  const read = c.j.slice(1).trim().split('\r\n');
  assert.equal(read[0], 'Kuu;Töötaja;Telefon;Ostude arv;Kinnipidamine (EUR);Kinnipidamine (senti)');
  assert.equal(read[2], "2026-11;Mari Maasikas;'+37250000001;2;3,50;350");
  assert.equal(read[3], '2026-11;KOKKU;;3;4,70;470');
  // mina-vaade: kasutaja enda kuu summa
  assert.equal((await mari('/api/mina')).j.ostud_summa_s, 250);
});

test('seade ja auto: kasutus, odomeeter, sõidupäevik CSV', async () => {
  const { env, kell } = keskkond();
  const { obj, kasutaja, A } = await demo(env);
  const mari = await kasutaja('Mari'), kati = await kasutaja('Kati');
  const auto = obj('Tööauto'), printer = obj('Printer');
  assert.equal((await mari('/api/kasutus-alusta', { kood: auto.kood })).status, 400);
  assert.match((await mari('/api/kasutus-alusta', { kood: auto.kood, odo: 100 })).j.viga, /48210/);
  assert.equal((await mari('/api/kasutus-alusta', { kood: auto.kood, odo: 48210, eesmark: 'Tartu objekt' })).status, 200);
  kell.t += 3600 * 1000;
  assert.equal((await mari('/api/kasutus-lopeta', { kood: auto.kood, odo: 48100 })).status, 400);
  const l = await mari('/api/kasutus-lopeta', { kood: auto.kood, odo: 48395 });
  assert.equal(l.j.km, 185); assert.equal(l.j.minutit, 60);
  // printer: teine ei saa võtta, kui kasutusel
  assert.equal((await kati('/api/kasutus-alusta', { kood: printer.kood })).status, 200);
  assert.equal((await mari('/api/kasutus-alusta', { kood: printer.kood })).status, 409);
  assert.equal((await mari('/api/kasutus-lopeta', { kood: printer.kood })).status, 409);
  assert.equal((await kati('/api/kasutus-lopeta', { kood: printer.kood })).status, 200);
  const sp = (await A('aruanne.csv?liik=soidupaevik&kuu=2026-11')).j.slice(1).trim().split('\r\n');
  assert.equal(sp.length, 2);
  assert.match(sp[1], /^Tööauto 123 ABC;Mari Maasikas;04\.11\.2026[^;]*;04\.11\.2026[^;]*;48210;48395;185;Tartu objekt;$/);
  const lp = (await A('aruanne.csv?liik=seadmed&kuu=2026-11')).j;
  assert.match(lp, /Printer 2\. korrus;Kati Kask/);
});

test('CSRF: ilma X-QW päiseta keelatud; admin ilma tokenita keelatud', async () => {
  const { env } = keskkond();
  const { obj, kasutaja } = await demo(env);
  const mari = await kasutaja('Mari');
  const kontor = obj('Kontori');
  const r = await worker.fetch(new Request('https://t.ee/api/ava', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: mari.kypsis() }, body: JSON.stringify({ kood: kontor.kood }) }), env, {});
  assert.equal(r.status, 403);
  const r2 = await worker.fetch(new Request('https://t.ee/api/ava', { method: 'POST', headers: { 'Content-Type': 'text/plain', Cookie: mari.kypsis(), 'X-QW': '0' }, body: JSON.stringify({ kood: kontor.kood }) }), env, {});
  assert.equal(r2.status, 403);
  // GET muutvale API-le
  assert.equal((await worker.fetch(new Request('https://t.ee/api/ava', { headers: { Cookie: mari.kypsis(), 'X-QW': '1' } }), env, {})).status, 405);
  // admin
  assert.equal((await admin(env, '')('ulevaade')).status, 401);
  assert.equal((await admin(env, 'vale-voti-123456789')('ulevaade')).status, 401);
  assert.equal((await admin(env, 'vale-voti-123456789')('peata', { id: '0000000000' })).status, 401);
  const ilma = await worker.fetch(new Request('https://t.ee/api/admin/demo', { method: 'POST', body: '{}' }), env, {});
  assert.equal(ilma.status, 401);
  // kasutaja sessioon ei ava haldust
  const r3 = await worker.fetch(new Request('https://t.ee/api/admin/ulevaade', { headers: { Cookie: mari.kypsis() } }), env, {});
  assert.equal(r3.status, 401);
  // lühike ADMIN_TOKEN keskkonnas = haldus suletud
  const { env: env2 } = keskkond({ ADMIN_TOKEN: 'lyhike' });
  assert.equal((await admin(env2)('ulevaade')).status, 401);
});

test('kutse: ühekordne, PIN vähemalt 6 märki, telefon jääb sisse logituks, sisselogimine', async () => {
  const { env } = keskkond();
  const A = admin(env);
  const u = (await A('kasutaja', { nimi: 'Peeter Paju', tel: '5555 1234', ryhmad: 'Kontor, Ladu' })).j;
  assert.equal(u.ok, true); assert.match(u.kutse, /^[0-9A-Z]{32}$/);
  const c = klient(env);
  assert.equal((await c('/api/kutse-info', { token: u.kutse })).j.nimi, 'Peeter Paju');
  assert.equal((await c('/api/kutse', { token: u.kutse, parool: '123' })).status, 400);
  const r = await c('/api/kutse', { token: u.kutse, parool: '246810' });
  assert.equal(r.status, 200);
  assert.match(r.r.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.deepEqual(r.j.mina.kasutaja.ryhmad, ['Kontor', 'Ladu']);
  assert.equal((await c('/api/kutse', { token: u.kutse, parool: '999999' })).status, 404, 'kutse on ühekordne');
  assert.equal((await c('/api/mina')).status, 200);
  const c2 = klient(env, '9.9.9.9');
  assert.equal((await c2('/api/logi-sisse', { tel: '+3725551234', parool: 'vale' })).status, 401);
  assert.equal((await c2('/api/logi-sisse', { tel: '5555 1234', parool: '246810' })).status, 200);
  // uus kutse (kadunud telefon): vanad sessioonid kehtetuks pärast kasutamist
  const k2 = (await A('kutse', { id: u.id })).j.kutse;
  const c3 = klient(env, '8.8.8.8');
  assert.equal((await c3('/api/kutse', { token: k2, parool: '135790' })).status, 200);
  assert.equal((await c('/api/mina')).status, 401);
  assert.equal((await c2('/api/mina')).status, 401);
  // sama telefoniga teist kasutajat ei saa luua
  assert.equal((await A('kasutaja', { nimi: 'Teine Isik', tel: '+37255551234' })).status, 409);
});

test('haldus: demo ainult tühja baasi, objekti valideerimine, tooted sentides', async () => {
  const { env } = keskkond();
  const A = admin(env);
  assert.equal((await A('demo', {})).status, 200);
  assert.equal((await A('demo', {})).status, 409);
  assert.equal((await A('objekt', { tyyp: 'kosmoselaev', nimi: 'X1' })).status, 400);
  assert.equal((await A('objekt', { tyyp: 'uks', nimi: 'Uks 3', ajaaken: { paevad: [1], algus: '19:00', lopp: '07:00' } })).status, 400);
  const u = (await A('ulevaade')).j;
  assert.equal(u.kasutajad.length, 3); assert.equal(u.objektid.length, 6);
  assert.ok(!JSON.stringify(u).includes('saladus') && !JSON.stringify(u).includes('seadme_rasi'), 'saladused ei lähe halduse vaatesse');
  const kohv = u.objektid.find((o) => o.nimi === 'Kohviautomaat');
  assert.equal((await A('tooted', { kood: kohv.kood, tooted: [{ nimi: 'Tee', hind_s: 1.5 }] })).status, 400);
  assert.equal((await A('tooted', { kood: kohv.kood, tooted: [{ nimi: 'Tee', hind_s: -1 }] })).status, 400);
  assert.equal((await A('tooted', { kood: kohv.kood, tooted: [{ nimi: 'Tee', hind_s: 90 }] })).j.tooted[0].hind_s, 90);
  assert.equal((await A('lahtesta', { kinnitus: 'jah' })).status, 400);
  assert.equal((await A('lahtesta', { kinnitus: 'KUSTUTA' })).j.ok, true);
  assert.equal((await A('ulevaade')).j.objektid.length, 0);
});

test('lehed: CSP nonce, QR-koodi tõlgendus, CSV valemikaitse', async () => {
  const { env } = keskkond();
  const r = await worker.fetch(new Request('https://t.ee/O/ABCDEFGHJKMN?d=12345678'), env, {});
  assert.equal(r.status, 200);
  const csp = r.headers.get('Content-Security-Policy');
  const nonce = /nonce-([^']+)/.exec(csp)[1];
  const h = await r.text();
  assert.ok(h.includes(`nonce="${nonce}"`)); assert.ok(h.includes('"ABCDEFGHJKMN"')); assert.ok(h.includes('"12345678"'));
  assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
  for (const t of ['/', '/admin', '/kutse', '/ekraan/ABCDEFGHJKMN', '/demo/uks/ABCDEFGHJKMN', '/demo/automaat/ABCDEFGHJKMN']) assert.equal((await worker.fetch(new Request('https://t.ee' + t), env, {})).status, 200, t);
  assert.equal((await worker.fetch(new Request('https://t.ee/O/lyhike'), env, {})).status, 404);
  assert.deepEqual(koodTekstist('https://t.ee/O/ABCDEFGHJKMN?d=12345678', 't.ee'), { kood: 'ABCDEFGHJKMN', d: '12345678' });
  assert.deepEqual(koodTekstist('HTTPS://T.EE/O/ABCDEFGHJKMN', 't.ee'), { kood: 'ABCDEFGHJKMN', d: '' });
  assert.equal(koodTekstist('https://kuri.ee/O/ABCDEFGHJKMN', 't.ee'), null);
  assert.equal(sendidEurost('1,20'), 120); assert.equal(sendidEurost('2'), 200); assert.equal(sendidEurost('1,234'), null); assert.equal(sendidEurost('-1'), null);
  assert.equal(normKood('abcd-efgh-jkmn'), 'ABCDEFGHJKMN');
  assert.equal(csv([['=SUM(A1)', 'a;b']]), '﻿\'=SUM(A1);"a;b"\r\n');
});
