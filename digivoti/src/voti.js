// Digivõti: üks Durable Object kogu firma jaoks. Kõik andmed ja õigusreeglid on siin (üks eksemplar, päringud järjest).
//
// Võtmed (DO storage):
//   seaded                         firma nimi
//   kasutaja:<id>, tel:<+372…>     kasutaja {id, nimi, tel, ryhmad, olek: kutsutud|aktiivne|peatatud, rasi} ja telefoni indeks
//   kutse:<sha256(token)>          ühekordne kutse {kasutaja, aegub} (7 päeva)
//   sess:<sha256(token)>           sessioon (küpsis dv_sess, 180 päeva)
//   objekt:<kood>                  uks | automaat | seade | auto (saladus = muutuva QR-i HMAC-võti, seadme_rasi = seadmetokeni räsi)
//   relee:<kood>                   seadme käskude järjekord [{id, liik, sekundit, toode, kasutaja, aegub}]; seade võtab ühe korraga
//   kasutus:<kood>                 käimasolev seadme/auto kasutus {kasutaja, alates, odo_algus, eesmark}
//   logi:<inv>:<r>                 kõik sündmused (inv = TS_MAX − aeg, uusimad ees)
//   labi:<kuu>:<ts>:<r>            läbipääsud (lubatud ja keeldutud), kuu = AAAA-KK Eesti aja järgi
//   ost:<kuu>:<ts>:<r>             ostud (hind sentides, täisarv)
//   kasut:<kuu>:<ts>:<r>           lõpetatud seadme ja auto kasutused (auto puhul sõidupäeviku rida)

export const TAHED = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32, ilma I L O U
export const KOOD_RE = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const TS_MAX = 9999999999999;
const SESS_MS = 180 * 24 * 3600 * 1000;
const KUTSE_MS = 7 * 24 * 3600 * 1000;
export const AKEN_MS = 30 * 1000;        // muutuva QR-i aken (nagu TOTP)
const KASK_MS = 20 * 1000;               // releekäsk aegub, kui seade seda 20 s jooksul ei võta
const ODO_MAX = 9999999;
const HIND_MAX = 100000;                 // 1000 € ühe toote hind
export const TYYBID = { uks: 'Uks', automaat: 'Automaat', seade: 'Seade', auto: 'Auto' };
const PAEVAD = ['E', 'T', 'K', 'N', 'R', 'L', 'P'];

// ---------- abifunktsioonid (eksporditud testide jaoks) ----------
export function juhuslik(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  let s = '';
  for (const x of b) s += TAHED[x & 31];
  return s;
}
export function normKood(v) {
  if (typeof v !== 'string') return null;
  const k = v.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[\s-]/g, '');
  return KOOD_RE.test(k) ? k : null;
}
export function normTel(v) {
  if (typeof v !== 'string') return null;
  let t = v.trim().replace(/[\s\-.()]/g, '');
  if (/^00\d+$/.test(t)) t = '+' + t.slice(2);
  if (/^[5-9]\d{6,7}$/.test(t)) t = '+372' + t;
  return /^\+\d{7,15}$/.test(t) ? t : null;
}
export function normRyhmad(v) {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(list.map((x) => puhasta(x, 30)).filter(Boolean))].slice(0, 20);
}
const inv = (ts) => String(TS_MAX - ts).padStart(13, '0');
const ts13 = (ts) => String(ts).padStart(13, '0');
const puhasta = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

// Eesti aeg: kuu (AAAA-KK), nädalapäev (E=1 … P=7), kellaaeg HH:MM
export function tallinn(nyyd) {
  const o = {};
  for (const p of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(nyyd))) o[p.type] = p.value;
  return { kuu: `${o.year}-${o.month}`, kuupaev: `${o.year}-${o.month}-${o.day}`, paev: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(o.weekday) + 1, hhmm: `${o.hour}:${o.minute}` };
}
export const eestiAeg = (ts) => (ts ? new Date(ts).toLocaleString('et-EE', { timeZone: 'Europe/Tallinn', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
// CSV jaoks ilma komata (Excel tunneb kuupäeva ja kellaaega)
export const csvAeg = (ts) => eestiAeg(ts).replace(', ', ' ');
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// Ajaaken: {paevad: [1..7], algus: 'HH:MM', lopp: 'HH:MM'} või null (alati lubatud)
export function normAjaaken(v) {
  if (!v || typeof v !== 'object') return null;
  const paevad = [...new Set((Array.isArray(v.paevad) ? v.paevad : []).map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x <= 7))].sort();
  if (!paevad.length || !HHMM.test(v.algus || '') || !(HHMM.test(v.lopp || '') || v.lopp === '24:00') || v.algus >= v.lopp) return undefined; // undefined = vigane
  return { paevad, algus: v.algus, lopp: v.lopp };
}
export function ajaakenTekst(a) {
  if (!a) return 'alati';
  const p = a.paevad;
  const jada = p.length > 1 && p.every((x, i) => i === 0 || x === p[i - 1] + 1);
  return `${jada ? PAEVAD[p[0] - 1] + '–' + PAEVAD[p[p.length - 1] - 1] : p.map((x) => PAEVAD[x - 1]).join(',')} ${a.algus}–${a.lopp}`;
}
export function ajaakenLubab(a, nyyd) {
  if (!a) return true;
  const t = tallinn(nyyd);
  return a.paevad.includes(t.paev) && t.hhmm >= a.algus && t.hhmm < a.lopp;
}
export const ryhmLubab = (kasutaja, objekt) => (objekt.ryhmad || []).includes('*') || (objekt.ryhmad || []).some((r) => (kasutaja.ryhmad || []).includes(r));

// Õiguse reegel (puhas funktsioon): kas kasutaja tohib objekti kasutada praegu
export function oiguseKontroll({ kasutaja, objekt, nyyd = Date.now() }) {
  if (!objekt) return { lubatud: false, pohjus: 'Tundmatu QR-kood.' };
  if (!kasutaja || kasutaja.olek !== 'aktiivne') return { lubatud: false, pohjus: 'Konto on peatatud.' };
  if (!ryhmLubab(kasutaja, objekt)) return { lubatud: false, pohjus: 'Sul ei ole sellele ligipääsu.' };
  if (!ajaakenLubab(objekt.ajaaken, nyyd)) return { lubatud: false, pohjus: `Ligipääs ainult ${ajaakenTekst(objekt.ajaaken)}.` };
  return { lubatud: true };
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
// Muutuva QR-i kood: HMAC-SHA256(objekti saladus, akna number) → 8 märki Base32
export async function dynKood(saladus, aken) {
  const v = await crypto.subtle.importKey('raw', unb64(saladus), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', v, new TextEncoder().encode(`dv1|${aken}`)));
  let s = '';
  for (let i = 0; i < 8; i++) s += TAHED[h[i] & 31];
  return s;
}
// Kehtib praegune ja eelmine aken (kuni 60 s); vanem kood lükatakse tagasi
export async function dynKontroll(saladus, d, nyyd) {
  if (typeof d !== 'string' || !/^[0-9A-Z]{8}$/.test(d)) return false;
  const w = Math.floor(nyyd / AKEN_MS);
  let ok = false;
  for (const a of [w, w - 1]) if (vordle(await dynKood(saladus, a), d)) ok = true;
  return ok;
}
export async function parooliRasi(parool, iter, sool = crypto.getRandomValues(new Uint8Array(16))) {
  const voti = await crypto.subtle.importKey('raw', new TextEncoder().encode(parool), 'PBKDF2', false, ['deriveBits']);
  const bitid = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sool, iterations: iter }, voti, 256);
  return `pbkdf2$${iter}$${b64(sool)}$${b64(new Uint8Array(bitid))}`;
}
export function vordle(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
async function parooliKontroll(parool, rasi) {
  const [liik, iter, sool] = String(rasi || '').split('$');
  if (liik !== 'pbkdf2') return false;
  return vordle(await parooliRasi(parool, Number(iter), unb64(sool)), rasi);
}
function kypsis(request, nimi) {
  for (const osa of (request.headers.get('Cookie') || '').split(';')) {
    const [k, ...v] = osa.trim().split('=');
    if (k === nimi) return v.join('=');
  }
  return null;
}
const json = (obj, status = 200, lisa = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...lisa },
});
const viga = (tekst, status = 400, lisa = {}) => json({ ok: false, viga: tekst, ...lisa }, status);
export const euro = (s) => (Number(s || 0) / 100).toFixed(2).replace('.', ',');
const csvLahter = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // valemi süstimise vastu
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Excel (Eesti): semikoolon, UTF-8 BOM, CRLF
export function csv(read) { return '﻿' + read.map((r) => r.map(csvLahter).join(';')).join('\r\n') + '\r\n'; }
function csvVastus(nimi, read) {
  return new Response(csv(read), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nimi}"`, 'Cache-Control': 'no-store' } });
}
async function loeJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 32 * 1024) return null;
  try {
    const t = await request.text();
    if (t.length > 32 * 1024) return null;
    const o = JSON.parse(t || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}
const SESS_KYPSIS = (token, maxAge) => `dv_sess=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export class Digivoti {
  constructor(state, env) {
    this.state = state;
    this.s = state.storage;
    this.env = env || {};
    this.vead = new Map();       // ebaõnnestumiste loendur (mälus)
    this.nahtud = new Map();     // seadme viimane pöördumine (mälus, ainult halduri vaate jaoks)
    // Testid saavad kella asendada (env.__kell); päris keskkonnas on see alati Date.now
    this.kell = typeof this.env.__kell === 'function' ? this.env.__kell : () => Date.now();
  }

  // ---------- andmekiht ----------
  async seaded() { return { firma: 'Firma', ...((await this.s.get('seaded')) || {}) }; }
  async loend(prefix, limit) { return [...(await this.s.list(limit ? { prefix, limit } : { prefix })).entries()]; }
  async logi(kirje) {
    const aeg = kirje.aeg || this.kell();
    await this.s.put(`logi:${inv(aeg)}:${juhuslik(4)}`, { ...kirje, aeg });
  }
  iter() { const n = Number(this.env.PBKDF2_ITER); return Number.isInteger(n) && n >= 10000 && n <= 100000 ? n : 100000; }
  piiratud(voti, max, aken = 15 * 60 * 1000) {
    const nyyd = Date.now();
    const v = (this.vead.get(voti) || []).filter((t) => nyyd - t < aken);
    this.vead.set(voti, v);
    return v.length >= max;
  }
  viga(voti) { const v = this.vead.get(voti) || []; v.push(Date.now()); this.vead.set(voti, v); }

  // ---------- sessioon ----------
  async uusSessioon(id) {
    const nyyd = this.kell();
    for (const [v, x] of await this.loend('sess:')) if (x.aegub < nyyd) await this.s.delete(v);
    const token = juhuslik(40);
    await this.s.put(`sess:${await sha256hex(token)}`, { kasutaja: id, aegub: nyyd + SESS_MS });
    return SESS_KYPSIS(token, SESS_MS / 1000);
  }
  async kustutaSessioonid(id) {
    let n = 0;
    for (const [v, s] of await this.loend('sess:')) if (s.kasutaja === id) { await this.s.delete(v); n++; }
    return n;
  }
  // Kehtiv sessioon + aktiivne kasutaja. Peatatud kasutaja sessioon kustutatakse kohe.
  async kasutaja(request) {
    const token = kypsis(request, 'dv_sess');
    if (!token || !/^[0-9A-Z]{40}$/.test(token)) return null;
    const sv = `sess:${await sha256hex(token)}`;
    const sess = await this.s.get(sv);
    if (!sess) return null;
    const k = await this.s.get(`kasutaja:${sess.kasutaja}`);
    if (sess.aegub < this.kell() || !k || k.olek !== 'aktiivne') { await this.s.delete(sv); return null; }
    k._sess = sv;
    return k;
  }

  // ---------- päringud ----------
  async fetch(request) {
    const url = new URL(request.url);
    const tee = url.pathname;
    try {
      if (tee.startsWith('/api/admin/')) return await this.admin(request, tee.slice(11), url);
      const mS = /^\/api\/(relee|ekraan)\/([0-9A-Z]{12})$/.exec(tee);
      if (mS) return await this.seadmeParing(request, mS[1], mS[2], url);
      if (request.method !== 'POST') return viga('meetod', 405);
      // CSRF: ainult oma päisega JSON (teine sait ei saa seda ilma CORS-eelkontrollita saata)
      if (request.headers.get('X-QW') !== '1') return viga('päis puudub', 403);
      const keha = await loeJson(request);
      if (keha === null) return viga('vigane päring');
      const ip = request.headers.get('X-IP-Rasi') || '';
      switch (tee) {
        case '/api/alusta': { const k = await this.kasutaja(request); return json({ ok: true, firma: (await this.seaded()).firma, mina: k ? await this.mina(k) : null }); }
        case '/api/logi-sisse': return await this.logiSisse(keha, ip);
        case '/api/kutse-info': return await this.kutseInfo(keha, ip);
        case '/api/kutse': return await this.kutseKasuta(keha, ip);
      }
      const k = await this.kasutaja(request);
      if (!k) return viga('Logi sisse', 401);
      switch (tee) {
        case '/api/logi-valja': await this.s.delete(k._sess); return json({ ok: true }, 200, { 'Set-Cookie': SESS_KYPSIS('', 0) });
        case '/api/mina': return json(await this.mina(k));
        case '/api/objekt': return await this.objektInfo(k, keha);
        case '/api/ava': return await this.ava(k, keha);
        case '/api/ost': return await this.ost(k, keha);
        case '/api/kasutus-alusta': return await this.kasutusAlusta(k, keha);
        case '/api/kasutus-lopeta': return await this.kasutusLopeta(k, keha);
      }
      return viga('tundmatu tee', 404);
    } catch (e) {
      console.error('digivoti viga', (e && e.stack) || e);
      return viga('serveri viga', 500);
    }
  }

  // ---------- sisselogimine ja kutse ----------
  async logiSisse({ tel, parool }, ip) {
    const t = normTel(tel);
    if (!t || typeof parool !== 'string') return viga('Sisesta telefon ja PIN/parool.');
    if (this.piiratud(`tel:${t}`, 8) || this.piiratud(`ip:${ip}`, 30)) return viga('Liiga palju vigaseid katseid. Proovi 15 minuti pärast.', 429);
    const id = await this.s.get(`tel:${t}`);
    const k = id ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k || !k.rasi || !(await parooliKontroll(parool, k.rasi))) {
      this.viga(`tel:${t}`); this.viga(`ip:${ip}`);
      return viga('Vale telefon või PIN/parool.', 401);
    }
    if (k.olek !== 'aktiivne') return viga('Konto on peatatud. Pöördu halduri poole.', 403);
    return json({ ok: true, mina: await this.mina(k) }, 200, { 'Set-Cookie': await this.uusSessioon(k.id) });
  }
  async kutseLeia(token) {
    if (typeof token !== 'string' || !/^[0-9A-Z]{32}$/.test(token)) return null;
    const kv = `kutse:${await sha256hex(token)}`;
    const ku = await this.s.get(kv);
    if (!ku || ku.aegub < this.kell()) return null;
    const k = await this.s.get(`kasutaja:${ku.kasutaja}`);
    if (!k || k.olek === 'peatatud') return null;
    return { kv, k };
  }
  async kutseInfo({ token }, ip) {
    if (this.piiratud(`kutse:${ip}`, 20)) return viga('Liiga palju katseid, proovi hiljem.', 429);
    const r = await this.kutseLeia(token);
    if (!r) { this.viga(`kutse:${ip}`); return viga('Kutse on kehtetu või aegunud. Küsi haldurilt uus.', 404); }
    return json({ ok: true, nimi: r.k.nimi, tel: r.k.tel, firma: (await this.seaded()).firma });
  }
  // Kutse kasutamine: PIN/parool, telefon jääb sisse logituks. Kutse on ühekordne; varasemad sessioonid kehtetuks.
  async kutseKasuta({ token, parool }, ip) {
    if (this.piiratud(`kutse:${ip}`, 20)) return viga('Liiga palju katseid, proovi hiljem.', 429);
    if (typeof parool !== 'string' || parool.length < 6 || parool.length > 128) return viga('PIN/parool peab olema vähemalt 6 märki.');
    const r = await this.kutseLeia(token);
    if (!r) { this.viga(`kutse:${ip}`); return viga('Kutse on kehtetu või aegunud. Küsi haldurilt uus.', 404); }
    const { kv, k } = r;
    k.rasi = await parooliRasi(parool, this.iter());
    k.olek = 'aktiivne';
    await this.s.delete(kv);
    await this.s.put(`kasutaja:${k.id}`, k);
    await this.kustutaSessioonid(k.id);
    await this.logi({ tyyp: 'kutse_kasutatud', kasutaja: k.id, nimi: k.nimi });
    return json({ ok: true, mina: await this.mina(k) }, 200, { 'Set-Cookie': await this.uusSessioon(k.id) });
  }

  // ---------- kasutaja vaated ----------
  async mina(k) {
    const nyyd = this.kell();
    const kuu = tallinn(nyyd).kuu;
    const ostud = (await this.loend(`ost:${kuu}:`)).map(([, o]) => o).filter((o) => o.kasutaja === k.id).sort((a, b) => b.aeg - a.aeg);
    const objektid = (await this.loend('objekt:')).map(([, o]) => o);
    const ligipaasud = objektid.filter((o) => ryhmLubab(k, o)).map((o) => ({ kood: o.kood, nimi: o.nimi, tyyp: o.tyyp, ajaaken: ajaakenTekst(o.ajaaken), praegu: ajaakenLubab(o.ajaaken, nyyd), dyn: !!o.dyn }));
    const kasutused = [];
    for (const [v, x] of await this.loend('kasutus:')) if (x.kasutaja === k.id) { const o = objektid.find((y) => y.kood === v.slice(8)); kasutused.push({ kood: v.slice(8), nimi: o?.nimi || '?', tyyp: o?.tyyp, alates: x.alates, odo_algus: x.odo_algus ?? null }); }
    return {
      ok: true, firma: (await this.seaded()).firma, kuu,
      kasutaja: { id: k.id, nimi: k.nimi, tel: k.tel, ryhmad: k.ryhmad || [] },
      ostud: ostud.map((o) => ({ aeg: o.aeg, automaat: o.automaat, toode: o.toode, hind_s: o.hind_s })),
      ostud_summa_s: ostud.reduce((s, o) => s + o.hind_s, 0),
      ligipaasud, kasutused,
    };
  }
  avalikObjekt(o) {
    return { kood: o.kood, nimi: o.nimi, tyyp: o.tyyp, ajaaken: ajaakenTekst(o.ajaaken), dyn: !!o.dyn, avamisaeg_s: o.avamisaeg_s,
      tooted: o.tyyp === 'automaat' ? (o.tooted || []).map((t) => ({ id: t.id, nimi: t.nimi, hind_s: t.hind_s })) : undefined, odo_viimane: o.tyyp === 'auto' ? o.odo_viimane ?? null : undefined };
  }
  async objektInfo(k, { kood }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o) return viga('Tundmatu QR-kood.', 404);
    const kontroll = oiguseKontroll({ kasutaja: k, objekt: o, nyyd: this.kell() });
    let kasutus = null;
    if (o.tyyp === 'seade' || o.tyyp === 'auto') {
      const x = await this.s.get(`kasutus:${kk}`);
      if (x) { const kes = x.kasutaja === k.id ? null : await this.s.get(`kasutaja:${x.kasutaja}`); kasutus = { minu: x.kasutaja === k.id, nimi: kes ? kes.nimi : k.nimi, alates: x.alates, odo_algus: x.odo_algus ?? null }; }
    }
    return json({ ok: true, objekt: this.avalikObjekt(o), kontroll, kasutus });
  }
  async lisaKask(kood, kask) {
    const nyyd = this.kell();
    const q = ((await this.s.get(`relee:${kood}`)) || []).filter((x) => x.aegub > nyyd).slice(-9);
    q.push({ id: juhuslik(8), aeg: nyyd, aegub: nyyd + KASK_MS, ...kask });
    await this.s.put(`relee:${kood}`, q);
  }
  async labiLogi(k, o, tulemus, pohjus = '') {
    const aeg = this.kell();
    const kirje = { tyyp: tulemus ? 'uks_avatud' : 'uks_keeldutud', kasutaja: k.id, nimi: k.nimi, kood: o.kood, objekt: o.nimi, pohjus, aeg };
    await this.s.put(`labi:${tallinn(aeg).kuu}:${ts13(aeg)}:${juhuslik(4)}`, kirje);
    await this.logi(kirje);
  }
  // Uks: õigus → (muutuv QR) → logi → releele ühekordne käsk „ava N s“
  async ava(k, { kood, d }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o || o.tyyp !== 'uks') return viga('Tundmatu uks.', 404);
    if (this.piiratud(`ava:${k.id}`, 20, 60 * 1000)) return viga('Liiga palju katseid, oota minut.', 429);
    const kontroll = oiguseKontroll({ kasutaja: k, objekt: o, nyyd: this.kell() });
    let pohjus = kontroll.pohjus;
    if (kontroll.lubatud && o.dyn) {
      if (!d) pohjus = 'Sellel uksel on muutuv QR. Skänni ukse juures ekraanil olevat koodi.';
      else if (!(await dynKontroll(o.saladus, String(d).toUpperCase(), this.kell()))) pohjus = 'QR-kood on aegunud. Skänni ekraanilt uuesti.';
    }
    if (pohjus) { this.viga(`ava:${k.id}`); await this.labiLogi(k, o, false, pohjus); return viga(pohjus, 403); }
    await this.lisaKask(o.kood, { liik: 'ava', sekundit: o.avamisaeg_s || 5, kasutaja: k.id, kellele: k.nimi });
    await this.labiLogi(k, o, true);
    return json({ ok: true, avatud: true, sekundit: o.avamisaeg_s || 5, nimi: o.nimi });
  }
  // Automaat: ost logisse (hind sentides), releele „väljasta“
  async ost(k, { kood, toode }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o || o.tyyp !== 'automaat') return viga('Tundmatu automaat.', 404);
    const kontroll = oiguseKontroll({ kasutaja: k, objekt: o, nyyd: this.kell() });
    if (!kontroll.lubatud) return viga(kontroll.pohjus, 403);
    const t = (o.tooted || []).find((x) => x.id === toode);
    if (!t) return viga('Toodet ei ole (enam) saadaval.', 404);
    if (this.piiratud(`ost:${k.id}`, 10, 60 * 1000)) return viga('Liiga palju oste minutis.', 429);
    this.viga(`ost:${k.id}`);
    const aeg = this.kell();
    const kirje = { tyyp: 'ost', kasutaja: k.id, nimi: k.nimi, tel: k.tel, kood: o.kood, automaat: o.nimi, toode: t.nimi, hind_s: t.hind_s, aeg };
    await this.s.put(`ost:${tallinn(aeg).kuu}:${ts13(aeg)}:${juhuslik(4)}`, kirje);
    await this.logi(kirje);
    await this.lisaKask(o.kood, { liik: 'valjasta', sekundit: 1, toode: t.nimi, kasutaja: k.id, kellele: k.nimi });
    const m = await this.mina(k);
    return json({ ok: true, toode: t.nimi, hind_s: t.hind_s, kuu_summa_s: m.ostud_summa_s });
  }
  async kasutusAlusta(k, { kood, odo, eesmark }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o || !['seade', 'auto'].includes(o.tyyp)) return viga('Tundmatu seade.', 404);
    const kontroll = oiguseKontroll({ kasutaja: k, objekt: o, nyyd: this.kell() });
    if (!kontroll.lubatud) return viga(kontroll.pohjus, 403);
    const x = await this.s.get(`kasutus:${kk}`);
    if (x) {
      if (x.kasutaja === k.id) return viga('Kasutus on juba alustatud.', 409);
      const kes = await this.s.get(`kasutaja:${x.kasutaja}`);
      return viga(`Kasutusel: ${kes?.nimi || '?'} alates ${eestiAeg(x.alates)}.`, 409);
    }
    const rida = { kasutaja: k.id, alates: this.kell() };
    if (o.tyyp === 'auto') {
      const n = Number(odo);
      if (!Number.isInteger(n) || n < 0 || n > ODO_MAX) return viga('Sisesta odomeetri näit (km, täisarv).');
      if (o.odo_viimane != null && n < o.odo_viimane) return viga(`Näit on väiksem kui eelmise sõidu lõpunäit (${o.odo_viimane} km).`);
      rida.odo_algus = n;
      rida.eesmark = puhasta(eesmark, 120);
    }
    await this.s.put(`kasutus:${kk}`, rida);
    await this.logi({ tyyp: 'kasutus_algus', kasutaja: k.id, nimi: k.nimi, kood: kk, objekt: o.nimi, odo: rida.odo_algus });
    return json({ ok: true });
  }
  async kasutusLopp(o, x, kes, odoLopp, markus = '') {
    const aeg = this.kell();
    const kirje = { tyyp: 'kasutus', objekti_tyyp: o.tyyp, kood: o.kood, objekt: o.nimi, kasutaja: x.kasutaja, nimi: kes?.nimi || '?', alates: x.alates, kuni: aeg,
      odo_algus: x.odo_algus ?? null, odo_lopp: odoLopp ?? null, km: odoLopp != null && x.odo_algus != null ? odoLopp - x.odo_algus : null, eesmark: x.eesmark || '', markus };
    await this.s.put(`kasut:${tallinn(x.alates).kuu}:${ts13(x.alates)}:${juhuslik(4)}`, kirje);
    await this.s.delete(`kasutus:${o.kood}`);
    if (odoLopp != null) { o.odo_viimane = odoLopp; await this.s.put(`objekt:${o.kood}`, o); }
    await this.logi({ ...kirje, tyyp: 'kasutus_lopp', aeg });
    return kirje;
  }
  async kasutusLopeta(k, { kood, odo }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o) return viga('Tundmatu seade.', 404);
    const x = await this.s.get(`kasutus:${kk}`);
    if (!x || x.kasutaja !== k.id) return viga('Sul ei ole selle kasutust pooleli.', 409);
    let n = null;
    if (o.tyyp === 'auto') {
      n = Number(odo);
      if (!Number.isInteger(n) || n > ODO_MAX) return viga('Sisesta odomeetri lõpunäit (km, täisarv).');
      if (n < x.odo_algus) return viga(`Lõpunäit ei saa olla väiksem kui alguse näit (${x.odo_algus} km).`);
    }
    const kirje = await this.kasutusLopp(o, x, k, n);
    return json({ ok: true, km: kirje.km, minutit: Math.round((kirje.kuni - kirje.alates) / 60000) });
  }

  // ---------- seadmed (relee, ekraan): autentimine seadmetokeniga, küpsist ei kasutata ----------
  async seadmeParing(request, liik, kood, url) {
    if (request.method !== 'POST') return viga('meetod', 405);
    const ip = request.headers.get('X-IP-Rasi') || '';
    if (this.piiratud(`seade:${ip}`, 20)) return viga('Liiga palju vigaseid katseid.', 429);
    const o = await this.s.get(`objekt:${kood}`);
    const tok = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!o || !o.seadme_rasi || !/^[0-9A-Z]{32}$/.test(tok) || !vordle(await sha256hex(tok), o.seadme_rasi)) {
      this.viga(`seade:${ip}`);
      return viga('Vale seadmetoken.', 401);
    }
    const nyyd = this.kell();
    this.nahtud.set(kood, nyyd);
    if (liik === 'ekraan') {
      if (!o.dyn) return viga('Sellel objektil ei ole muutuva QR-i režiimi.', 400);
      const w = Math.floor(nyyd / AKEN_MS);
      return json({ ok: true, nimi: o.nimi, url: `${url.origin}/O/${o.kood}?d=${await dynKood(o.saladus, w)}`, kehtib_ms: (w + 1) * AKEN_MS - nyyd });
    }
    // relee: ühekordne käsk. Võetud käsk kustutatakse kohe; aegunud käske ei täideta.
    const q = ((await this.s.get(`relee:${kood}`)) || []).filter((x) => x.aegub > nyyd);
    const kask = q.shift() || null;
    if (q.length) await this.s.put(`relee:${kood}`, q); else await this.s.delete(`relee:${kood}`);
    return json({ ok: true, nimi: o.nimi, tyyp: o.tyyp, kask: kask ? { id: kask.id, liik: kask.liik, sekundit: kask.sekundit, toode: kask.toode || null, kellele: kask.kellele || '' } : null });
  }

  // ---------- haldus (Bearer ADMIN_TOKEN) ----------
  async admin(request, tee, url) {
    const ip = request.headers.get('X-IP-Rasi') || '';
    if (this.piiratud(`admin:${ip}`, 10)) return viga('Liiga palju vigaseid katseid.', 429);
    const tok = this.env.ADMIN_TOKEN;
    if (!tok || tok.length < 16 || !vordle(request.headers.get('Authorization') || '', `Bearer ${tok}`)) { this.viga(`admin:${ip}`); return viga('Vale halduse võti.', 401); }
    if (request.method === 'GET') {
      if (tee === 'ulevaade') return json(await this.ulevaade());
      if (tee === 'logi') return json({ ok: true, logi: (await this.loend('logi:', 200)).map(([, x]) => x) });
      if (tee === 'kuu') return json(await this.kuuKokkuvote(url.searchParams.get('kuu')));
      if (tee === 'aruanne.csv') return this.aruanne(url.searchParams.get('kuu'), url.searchParams.get('liik'));
      return viga('tundmatu', 404);
    }
    if (request.method !== 'POST') return viga('meetod', 405);
    const b = await loeJson(request);
    if (b === null) return viga('vigane päring');
    switch (tee) {
      case 'kasutaja': return this.adminKasutaja(b);
      case 'kutse': return this.adminKutse(b);
      case 'peata': return this.adminPeata(b);
      case 'taasta': return this.adminTaasta(b);
      case 'objekt': return this.adminObjekt(b);
      case 'seadmetoken': return this.adminSeadmetoken(b);
      case 'tooted': return this.adminTooted(b);
      case 'seaded': { const firma = puhasta(b.firma, 60); if (firma.length < 2) return viga('Sisesta firma nimi.'); await this.s.put('seaded', { firma }); return json({ ok: true }); }
      case 'demo': return this.adminDemo(url);
      case 'lahtesta': return this.adminLahtesta(b);
    }
    return viga('tundmatu', 404);
  }
  async ulevaade() {
    const kasutajad = (await this.loend('kasutaja:')).map(([, k]) => ({ id: k.id, nimi: k.nimi, tel: k.tel, ryhmad: k.ryhmad || [], olek: k.olek, loodud: k.loodud, peatatud: k.peatatud || null }));
    const kasutused = {};
    for (const [v, x] of await this.loend('kasutus:')) kasutused[v.slice(8)] = { ...x, nimi: kasutajad.find((k) => k.id === x.kasutaja)?.nimi || '?' };
    const objektid = (await this.loend('objekt:')).map(([, o]) => ({ ...this.avalikObjekt(o), ryhmad: o.ryhmad, ajaaken_obj: o.ajaaken || null, seadmetoken: !!o.seadme_rasi, nahtud: this.nahtud.get(o.kood) || null, kasutus: kasutused[o.kood] || null }));
    const ryhmad = [...new Set([...kasutajad.flatMap((k) => k.ryhmad), ...objektid.flatMap((o) => o.ryhmad || []).filter((r) => r !== '*')])].sort();
    return { ok: true, firma: (await this.seaded()).firma, kuu: tallinn(this.kell()).kuu, kasutajad, objektid, ryhmad };
  }
  async adminKasutaja(b) {
    const uus = !b.id;
    let k = uus ? null : await this.s.get(`kasutaja:${b.id}`);
    if (!uus && (!ID_RE.test(String(b.id)) || !k)) return viga('Kasutajat ei leitud', 404);
    const nimi = puhasta(b.nimi, 60);
    if (nimi.length < 3) return viga('Sisesta ees- ja perekonnanimi.');
    const t = normTel(b.tel);
    if (!t) return viga('Vigane telefoninumber (nt 5123 4567).');
    const olemas = await this.s.get(`tel:${t}`);
    if (olemas && olemas !== b.id) return viga('See telefon on juba teisel kasutajal.', 409);
    const ryhmad = normRyhmad(b.ryhmad);
    if (uus) {
      let id;
      do id = juhuslik(10); while (await this.s.get(`kasutaja:${id}`));
      k = { id, nimi, tel: t, ryhmad, olek: 'kutsutud', loodud: this.kell() };
    } else {
      if (k.tel !== t) await this.s.delete(`tel:${k.tel}`);
      Object.assign(k, { nimi, tel: t, ryhmad });
    }
    await this.s.put(`kasutaja:${k.id}`, k);
    await this.s.put(`tel:${t}`, k.id);
    await this.logi({ tyyp: uus ? 'kasutaja_loodud' : 'kasutaja_muudetud', kasutaja: k.id, nimi: k.nimi, ryhmad: ryhmad.join(', ') });
    return json({ ok: true, id: k.id, kutse: uus ? await this.uusKutse(k) : null });
  }
  async uusKutse(k) {
    for (const [v, x] of await this.loend('kutse:')) if (x.kasutaja === k.id) await this.s.delete(v);
    const token = juhuslik(32);
    await this.s.put(`kutse:${await sha256hex(token)}`, { kasutaja: k.id, aegub: this.kell() + KUTSE_MS });
    return token; // link: /kutse#<token> (fragment ei jõua serveri logidesse)
  }
  async adminKutse({ id }) {
    const k = ID_RE.test(String(id)) ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k) return viga('Kasutajat ei leitud', 404);
    if (k.olek === 'peatatud') return viga('Kasutaja on peatatud. Taasta enne uut kutset.', 409);
    const kutse = await this.uusKutse(k);
    await this.logi({ tyyp: 'kutse_loodud', kasutaja: k.id, nimi: k.nimi });
    return json({ ok: true, kutse });
  }
  // Töösuhte lõpp: peatatud, kõik sessioonid ja kutsed kehtetud, ootel releekäsud tühistatud, pooleli kasutused lõpetatud
  async adminPeata({ id }) {
    const k = ID_RE.test(String(id)) ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k) return viga('Kasutajat ei leitud', 404);
    k.olek = 'peatatud';
    k.peatatud = this.kell();
    await this.s.put(`kasutaja:${k.id}`, k);
    const sessioone = await this.kustutaSessioonid(k.id);
    for (const [v, x] of await this.loend('kutse:')) if (x.kasutaja === k.id) await this.s.delete(v);
    let kaske = 0;
    for (const [v, q] of await this.loend('relee:')) {
      const jaab = q.filter((x) => x.kasutaja !== k.id);
      kaske += q.length - jaab.length;
      if (jaab.length) await this.s.put(v, jaab); else await this.s.delete(v);
    }
    let kasutusi = 0;
    for (const [v, x] of await this.loend('kasutus:')) {
      if (x.kasutaja !== k.id) continue;
      const o = await this.s.get(`objekt:${v.slice(8)}`);
      if (o) { await this.kasutusLopp(o, x, k, null, 'töösuhe lõppes, lõpunäit puudub'); kasutusi++; }
    }
    await this.logi({ tyyp: 'toosuhe_lopp', kasutaja: k.id, nimi: k.nimi, sessioone, kaske, kasutusi });
    return json({ ok: true, sessioone, kaske, kasutusi });
  }
  async adminTaasta({ id }) {
    const k = ID_RE.test(String(id)) ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k) return viga('Kasutajat ei leitud', 404);
    k.olek = k.rasi ? 'aktiivne' : 'kutsutud';
    delete k.peatatud;
    await this.s.put(`kasutaja:${k.id}`, k);
    await this.logi({ tyyp: 'kasutaja_taastatud', kasutaja: k.id, nimi: k.nimi });
    return json({ ok: true, olek: k.olek });
  }
  async adminObjekt(b) {
    const uus = !b.kood;
    const kood = uus ? null : normKood(b.kood);
    let o = kood ? await this.s.get(`objekt:${kood}`) : null;
    if (!uus && !o) return viga('Objekti ei leitud', 404);
    const tyyp = uus ? b.tyyp : o.tyyp;
    if (!TYYBID[tyyp]) return viga('Vali tüüp: uks, automaat, seade või auto.');
    const nimi = puhasta(b.nimi, 60);
    if (nimi.length < 2) return viga('Sisesta objekti nimi.');
    const ajaaken = b.ajaaken ? normAjaaken(b.ajaaken) : null;
    if (ajaaken === undefined) return viga('Vigane ajaaken (päevad ja kellaaeg HH:MM, algus < lõpp).');
    const ryhmad = normRyhmad(b.ryhmad);
    const avamisaeg = Number.isInteger(Number(b.avamisaeg_s)) ? Math.min(30, Math.max(1, Number(b.avamisaeg_s))) : 5;
    let token = null;
    if (uus) {
      let k;
      do k = juhuslik(12); while (await this.s.get(`objekt:${k}`));
      token = juhuslik(32);
      o = { kood: k, tyyp, loodud: this.kell(), tooted: [], saladus: b64(crypto.getRandomValues(new Uint8Array(32))), seadme_rasi: await sha256hex(token) };
    }
    Object.assign(o, { nimi, ryhmad, ajaaken, dyn: tyyp === 'uks' && !!b.dyn, avamisaeg_s: avamisaeg });
    await this.s.put(`objekt:${o.kood}`, o);
    await this.logi({ tyyp: uus ? 'objekt_loodud' : 'objekt_muudetud', kood: o.kood, objekt: o.nimi });
    return json({ ok: true, kood: o.kood, seadmetoken: token });
  }
  async adminSeadmetoken({ kood }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o) return viga('Objekti ei leitud', 404);
    const token = juhuslik(32);
    o.seadme_rasi = await sha256hex(token);
    await this.s.put(`objekt:${kk}`, o);
    await this.logi({ tyyp: 'seadmetoken_uus', kood: kk, objekt: o.nimi });
    return json({ ok: true, seadmetoken: token });
  }
  async adminTooted({ kood, tooted }) {
    const kk = normKood(kood || '');
    const o = kk ? await this.s.get(`objekt:${kk}`) : null;
    if (!o || o.tyyp !== 'automaat') return viga('Automaati ei leitud', 404);
    if (!Array.isArray(tooted) || tooted.length > 40) return viga('Tooteid on 0–40.');
    const uued = [];
    for (const t of tooted) {
      const nimi = puhasta(t && t.nimi, 40);
      const h = Number(t && t.hind_s);
      if (nimi.length < 2) return viga('Toote nimi puudub.');
      if (!Number.isInteger(h) || h < 0 || h > HIND_MAX) return viga(`Vigane hind: ${nimi} (sentides täisarv).`);
      const id = typeof t.id === 'string' && /^[0-9A-Z]{6}$/.test(t.id) ? t.id : juhuslik(6);
      uued.push({ id, nimi, hind_s: h });
    }
    o.tooted = uued;
    await this.s.put(`objekt:${kk}`, o);
    await this.logi({ tyyp: 'tooted_muudetud', kood: kk, objekt: o.nimi });
    return json({ ok: true, tooted: uued });
  }
  kuu(v) { return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : tallinn(this.kell()).kuu; }
  async kinnipidamised(kuu) {
    const r = new Map();
    for (const [, o] of await this.loend(`ost:${kuu}:`)) {
      const x = r.get(o.kasutaja) || { kasutaja: o.kasutaja, nimi: o.nimi, tel: o.tel || '', arv: 0, summa_s: 0 };
      x.arv++; x.summa_s += o.hind_s; r.set(o.kasutaja, x);
    }
    for (const x of r.values()) { const k = await this.s.get(`kasutaja:${x.kasutaja}`); if (k) { x.nimi = k.nimi; x.tel = k.tel; } }
    return [...r.values()].sort((a, b) => a.nimi.localeCompare(b.nimi, 'et'));
  }
  async kuuKokkuvote(kuuSisse) {
    const kuu = this.kuu(kuuSisse);
    const kinni = await this.kinnipidamised(kuu);
    const kasut = (await this.loend(`kasut:${kuu}:`)).map(([, x]) => x);
    return { ok: true, kuu, kinnipidamised: kinni, kokku_s: kinni.reduce((s, x) => s + x.summa_s, 0),
      ostude_arv: kinni.reduce((s, x) => s + x.arv, 0), labipaase: (await this.loend(`labi:${kuu}:`)).length,
      soite: kasut.filter((x) => x.objekti_tyyp === 'auto').length, km: kasut.reduce((s, x) => s + (x.km || 0), 0) };
  }
  async aruanne(kuuSisse, liik) {
    const kuu = this.kuu(kuuSisse);
    if (liik === 'kinnipidamised') {
      const kinni = await this.kinnipidamised(kuu);
      const read = [['Kuu', 'Töötaja', 'Telefon', 'Ostude arv', 'Kinnipidamine (EUR)', 'Kinnipidamine (senti)']];
      for (const x of kinni) read.push([kuu, x.nimi, x.tel, x.arv, euro(x.summa_s), x.summa_s]);
      const kokku = kinni.reduce((s, x) => s + x.summa_s, 0);
      read.push([kuu, 'KOKKU', '', kinni.reduce((s, x) => s + x.arv, 0), euro(kokku), kokku]);
      return csvVastus(`kinnipidamised_${kuu}.csv`, read);
    }
    if (liik === 'ostud') {
      const read = [['Aeg', 'Töötaja', 'Automaat', 'Toode', 'Hind (EUR)']];
      for (const [, o] of await this.loend(`ost:${kuu}:`)) read.push([csvAeg(o.aeg), o.nimi, o.automaat, o.toode, euro(o.hind_s)]);
      return csvVastus(`ostud_${kuu}.csv`, read);
    }
    if (liik === 'soidupaevik') {
      const read = [['Auto', 'Juht', 'Algus', 'Lõpp', 'Odomeeter algus (km)', 'Odomeeter lõpp (km)', 'Läbisõit (km)', 'Eesmärk', 'Märkus']];
      for (const [, x] of await this.loend(`kasut:${kuu}:`)) if (x.objekti_tyyp === 'auto') read.push([x.objekt, x.nimi, csvAeg(x.alates), csvAeg(x.kuni), x.odo_algus, x.odo_lopp ?? '', x.km ?? '', x.eesmark, x.markus]);
      return csvVastus(`soidupaevik_${kuu}.csv`, read);
    }
    if (liik === 'labipaas') {
      const read = [['Aeg', 'Töötaja', 'Uks', 'Tulemus', 'Põhjus']];
      for (const [, x] of await this.loend(`labi:${kuu}:`)) read.push([csvAeg(x.aeg), x.nimi, x.objekt, x.tyyp === 'uks_avatud' ? 'avatud' : 'keeldutud', x.pohjus || '']);
      return csvVastus(`labipaasud_${kuu}.csv`, read);
    }
    if (liik === 'seadmed') {
      const read = [['Seade', 'Töötaja', 'Algus', 'Lõpp', 'Kestus (min)', 'Märkus']];
      for (const [, x] of await this.loend(`kasut:${kuu}:`)) if (x.objekti_tyyp === 'seade') read.push([x.objekt, x.nimi, csvAeg(x.alates), csvAeg(x.kuni), Math.round((x.kuni - x.alates) / 60000), x.markus]);
      return csvVastus(`seadmed_${kuu}.csv`, read);
    }
    return viga('Tundmatu aruanne', 404);
  }
  // Demoandmed: 3 kasutajat, 2 ust (üks muutuva QR-iga), kohvi- ja snäkiautomaat, printer, auto
  async adminDemo() {
    if ((await this.loend('objekt:', 1)).length || (await this.loend('kasutaja:', 1)).length) return viga('Andmed on juba olemas. Demoandmed saab luua tühja andmebaasi.', 409);
    await this.s.put('seaded', { firma: 'Demo OÜ' });
    const kutsed = [];
    for (const [nimi, tel, ryhmad] of [['Mari Maasikas', '+37250000001', ['Kontor', 'Autojuhid']], ['Jüri Juurikas', '+37250000002', ['Ladu']], ['Kati Kask', '+37250000003', ['Kontor']]]) {
      const r = await (await this.adminKasutaja({ nimi, tel, ryhmad })).json();
      kutsed.push({ id: r.id, nimi, tel, kutse: r.kutse });
    }
    const seadmed = [];
    const loo = async (o, tooted) => {
      const r = await (await this.adminObjekt(o)).json();
      if (tooted) await this.adminTooted({ kood: r.kood, tooted });
      seadmed.push({ kood: r.kood, nimi: o.nimi, tyyp: o.tyyp, dyn: !!o.dyn, seadmetoken: r.seadmetoken });
    };
    await loo({ tyyp: 'uks', nimi: 'Kontori välisuks', ryhmad: ['Kontor', 'Ladu'], avamisaeg_s: 5 });
    await loo({ tyyp: 'uks', nimi: 'Lao uks (muutuv QR)', ryhmad: ['Ladu'], dyn: true, avamisaeg_s: 5, ajaaken: { paevad: [1, 2, 3, 4, 5], algus: '07:00', lopp: '19:00' } });
    await loo({ tyyp: 'automaat', nimi: 'Kohviautomaat', ryhmad: ['*'] }, [{ nimi: 'Espresso', hind_s: 120 }, { nimi: 'Cappuccino', hind_s: 180 }, { nimi: 'Latte', hind_s: 200 }, { nimi: 'Kakao', hind_s: 150 }]);
    await loo({ tyyp: 'automaat', nimi: 'Snäkiautomaat', ryhmad: ['*'] }, [{ nimi: 'Šokolaad', hind_s: 150 }, { nimi: 'Krõpsud', hind_s: 190 }, { nimi: 'Mineraalvesi', hind_s: 100 }, { nimi: 'Müslibatoon', hind_s: 130 }]);
    await loo({ tyyp: 'seade', nimi: 'Printer 2. korrus', ryhmad: ['Kontor'] });
    await loo({ tyyp: 'auto', nimi: 'Tööauto 123 ABC', ryhmad: ['Autojuhid'] });
    const autod = seadmed.find((x) => x.tyyp === 'auto');
    const a = await this.s.get(`objekt:${autod.kood}`); a.odo_viimane = 48210; await this.s.put(`objekt:${a.kood}`, a);
    await this.logi({ tyyp: 'demo_loodud' });
    return json({ ok: true, kutsed, seadmed });
  }
  async adminLahtesta({ kinnitus }) {
    if (kinnitus !== 'KUSTUTA') return viga('Kinnita tekstiga KUSTUTA.');
    const koik = await this.loend('');
    for (const [v] of koik) await this.s.delete(v);
    this.nahtud.clear();
    return json({ ok: true, kustutatud: koik.length });
  }
}
