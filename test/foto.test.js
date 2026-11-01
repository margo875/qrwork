import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { keskkond, klient, admin } from './abi.js';

class R2 { constructor() { this.m = new Map(); } async put(k, v, o) { this.m.set(k, { b: v, o }); } async head(k) { return this.m.has(k) ? {} : null; }
  async get(k) { const x = this.m.get(k); return x ? { body: x.b, httpMetadata: x.o.httpMetadata } : null; } }
const JPEG = new Uint8Array(200); JPEG.set([0xff, 0xd8, 0xff, 0xe0]);

async function alus(lisa) {
  const k = keskkond({ FOTOD: new R2(), ...lisa }); const A = admin(k.env);
  const koht = (await A('koht', { nimi: 'Ladu', registreerimine: 'vaba' })).j.koht;
  const s1 = (await A('seade', { nimi: 'Nivelliir', asukoht: koht.kood })).j.seade;
  const c = klient(k.env);
  await c('/api/registreeru', { nimi: 'Mari Maasikas', tel: '51234567', parool: 'salasõna', koht: koht.kood });
  return { ...k, A, s1, c };
}
const yles = (env, c, keha) => worker.fetch(new Request('https://t.ee/api/foto', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-QW': '1', Cookie: c.kyps }, body: keha }), env, {});

test('foto võtmisel, ajalugu kuupäevadega, kohustuslik foto', async () => {
  const { env, A, s1, c } = await alus();
  // küpsis: logi sisse uuesti ja võta küpsis vastusest
  const r0 = await worker.fetch(new Request('https://t.ee/api/logi-sisse', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-QW': '1' }, body: JSON.stringify({ tel: '51234567', parool: 'salasõna' }) }), env, {});
  c.kyps = r0.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await yles(env, c, new Uint8Array(200))).status, 415);
  const f = await (await yles(env, c, JPEG)).json();
  assert.ok(f.ok); assert.match(f.foto, /^f\//);
  assert.equal((await c('/api/vota', { koodid: [s1.kood], foto: 'f/XXXXXXXXXX/0000000000000-AAAAAA.jpg' })).status, 400, 'võõras foto');
  let r = await c('/api/vota', { koodid: [s1.kood], foto: f.foto });
  assert.equal(r.j.tulemused[0].ok, true);
  assert.equal((await c('/api/tagasta', { koodid: [s1.kood], foto: f.foto })).status, 400, 'sama fotot ei saa uuesti kasutada');
  r = await c('/api/seade', { kood: s1.kood });
  assert.equal(r.j.seade.ajalugu[0].tyyp, 'vott'); assert.equal(r.j.seade.ajalugu[0].foto, true); assert.ok(r.j.seade.ajalugu[0].aeg > 0);
  await A('seaded', { foto: 'kohustuslik' });
  r = await c('/api/tagasta', { koodid: [s1.kood] });
  assert.equal(r.status, 400); assert.match(r.j.viga, /foto/i);
  const logi = (await A('logi')).j.logi;
  const pilt = await A(`foto?k=${encodeURIComponent(logi.find((x) => x.tyyp === 'vott').foto)}`);
  assert.equal(pilt.status, 200);
});

test('ilma R2-ta foto on välja lülitatud', async () => {
  const { c } = await alus({ FOTOD: undefined });
  assert.equal((await c('/api/mina')).j.foto, 'ei');
});
