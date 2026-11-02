import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { koodTekstist, OMA_HOSTID, appLeht } from '../src/lehed.js';
import { keskkond } from './abi.js';

test('domeenivahetus: vana domeeni QR tuntakse ära, võõrast mitte', () => {
  const h = ['krativara.ee', ...OMA_HOSTID];
  assert.deepEqual(koodTekstist('HTTPS://KRATT.KINDAVEL.EE/S/ABCDEFGHJK01', h), { liik: 'S', kood: 'ABCDEFGHJK01' });
  assert.deepEqual(koodTekstist('https://krativara.ee/K/ABCDEFGHJK01', h), { liik: 'K', kood: 'ABCDEFGHJK01' });
  assert.equal(koodTekstist('https://kratt.kindavel.ee.kurja.ee/S/ABCDEFGHJK01', h), null);
  assert.equal(koodTekstist('https://muu.ee/S/ABCDEFGHJK01', h), null);
  assert.ok(appLeht('n').includes('<title>Krativara</title>'));
});

test('domeenivahetus: PEA_HOST suunab vana domeeni edasi, ilma selleta mitte', async () => {
  const { env } = keskkond({ PEA_HOST: 'krativara.ee' });
  const r = await worker.fetch(new Request('https://kratt.kindavel.ee/S/ABCDEFGHJK01?x=1'), env, {});
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('Location'), 'https://krativara.ee/S/ABCDEFGHJK01?x=1');
  const p = await worker.fetch(new Request('https://kratt.kindavel.ee/api/leid', { method: 'POST', body: '{}' }), env, {});
  assert.equal(p.status, 308);
  assert.equal((await worker.fetch(new Request('https://krativara.ee/'), env, {})).status, 200);
  assert.equal((await worker.fetch(new Request('https://kratt.kindavel.ee/'), keskkond().env, {})).status, 200);
});
