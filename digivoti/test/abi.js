// Testi abi: mälus DO storage ja Worker + DO ühendus (sama muster nagu repo juurkausta test/abi.js, aga oma koopia)
import worker, { Digivoti } from '../src/worker.js';
export class Mal {
  constructor() { this.m = new Map(); }
  async get(k) { return structuredClone(this.m.get(k)); }
  async put(k, v) { this.m.set(k, structuredClone(v)); }
  async delete(k) { return this.m.delete(k); }
  async list({ prefix = '', limit } = {}) {
    const v = [...this.m.keys()].filter((k) => k.startsWith(prefix)).sort();
    return new Map((limit ? v.slice(0, limit) : v).map((k) => [k, structuredClone(this.m.get(k))]));
  }
}
// kell: testis juhitav aeg (env.__kell)
export function keskkond(lisa = {}) {
  const storage = new Mal();
  const kell = { t: Date.parse('2026-11-04T10:00:00+02:00') }; // kolmapäev 10:00 Eesti aja järgi
  const env = { ADMIN_TOKEN: 'a'.repeat(20), TOKEN_SECRET: 's'.repeat(20), PBKDF2_ITER: '10000', __kell: () => kell.t, ...lisa };
  const dv = new Digivoti({ storage }, env);
  env.DIGIVOTI = { idFromName: () => 'x', get: () => ({ fetch: (r) => dv.fetch(r) }) };
  return { env, dv, storage, kell };
}
export function klient(env, ip = '1.2.3.4') {
  let kyps = '';
  const f = async (tee, keha, lisaPais = {}) => {
    const h = { 'Content-Type': 'application/json', 'X-QW': '1', 'CF-Connecting-IP': ip, ...lisaPais };
    if (kyps) h.Cookie = kyps;
    const r = await worker.fetch(new Request('https://t.ee' + tee, { method: 'POST', headers: h, body: JSON.stringify(keha || {}) }), env, {});
    const sc = r.headers.get('Set-Cookie'); if (sc) kyps = sc.split(';')[0];
    return { status: r.status, j: (r.headers.get('Content-Type') || '').includes('json') ? await r.json() : null, r };
  };
  f.kypsis = () => kyps;
  f.seaKypsis = (k) => { kyps = k; };
  return f;
}
export const admin = (env, tok = env.ADMIN_TOKEN) => async (tee, keha) => {
  const r = await worker.fetch(new Request('https://t.ee/api/admin/' + tee, keha ? { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(keha) } : { headers: { Authorization: 'Bearer ' + tok } }), env, {});
  const tekst = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer()); // BOM jääb alles (CSV kontroll)
  return { status: r.status, j: (r.headers.get('Content-Type') || '').includes('json') ? JSON.parse(tekst) : tekst, r };
};
export const seade = (env) => async (liik, kood, token) => {
  const r = await worker.fetch(new Request(`https://t.ee/api/${liik}/${kood}`, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {} }), env, {});
  return { status: r.status, j: await r.json() };
};
// Demo: demoandmed + kasutaja aktiveerimine kutsega
export async function demo(env) {
  const A = admin(env);
  const d = (await A('demo', {})).j;
  const obj = (nimi) => d.seadmed.find((s) => s.nimi.startsWith(nimi));
  const kasutaja = async (nimi, ip) => {
    const ku = d.kutsed.find((k) => k.nimi.startsWith(nimi));
    const c = klient(env, ip);
    const r = await c('/api/kutse', { token: ku.kutse, parool: '123456' });
    if (!r.j.ok) throw new Error(r.j.viga);
    return c;
  };
  return { d, obj, kasutaja, A };
}
