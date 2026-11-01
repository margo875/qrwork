// Testi abi: mälus DO storage ja Worker + DO ühendus
import worker, { Register } from '../src/worker.js';
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
export function keskkond(lisa = {}) {
  const storage = new Mal();
  const env = { ADMIN_TOKEN: 'a'.repeat(20), TOKEN_SECRET: 's'.repeat(20), PBKDF2_ITER: '10000', ...lisa };
  const reg = new Register({ storage, waitUntil() {} }, env);
  env.REGISTER = { idFromName: () => 'x', get: () => ({ fetch: (r) => reg.fetch(r) }) };
  return { env, reg, storage };
}
export function klient(env) {
  let kyps = '';
  const f = async (tee, keha, meth = 'POST', lisaPais = {}) => {
    const h = { 'Content-Type': 'application/json', 'X-QW': '1', ...lisaPais };
    if (kyps) h.Cookie = kyps;
    const r = await worker.fetch(new Request('https://t.ee' + tee, { method: meth, headers: h, body: meth === 'POST' ? JSON.stringify(keha || {}) : undefined }), env, {});
    const sc = r.headers.get('Set-Cookie'); if (sc) kyps = sc.split(';')[0];
    const ct = r.headers.get('Content-Type') || '';
    return { status: r.status, j: ct.includes('json') ? await r.json() : null, r };
  };
  return f;
}
export const admin = (env) => async (tee, keha) => {
  const r = await worker.fetch(new Request('https://t.ee/api/admin/' + tee, keha ? { method: 'POST', headers: { Authorization: 'Bearer ' + env.ADMIN_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(keha) } : { headers: { Authorization: 'Bearer ' + env.ADMIN_TOKEN } }), env, {});
  return { status: r.status, j: (r.headers.get('Content-Type') || '').includes('json') ? await r.json() : await r.text() };
};
