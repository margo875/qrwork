// Register: üks Durable Object kogu firma jaoks. Kõik andmed ja reeglid on siin, et seadme võtmine ja tagastamine
// oleks järjepidev (üks eksemplar, päringud järjest; kahe inimese samaaegne võtmine ei saa mõlemale õnnestuda).
//
// Võtmed (DO storage):
//   seade:<kood>                 registrikirje (muudab ainult haldur)
//   laen:<kood>                  kehtiv kasutus {kood, kasutaja, alates, koht}; puudub = seade on vaba
//   kasutaja:<id>, tel:<+372…>   kasutaja ja telefoni indeks
//   sess:<sha256(token)>         sessioon (küpsis qw_sess, 180 päeva)
//   kinnita:<kasutaja>:<inv>:<r> kinnitamata ülevõtt: teine inimene võttis üle või märkis tagastatuks seadme, mis oli
//                                selle kasutaja nimel. Kuni neid on, ei saa kasutaja UUSI seadmeid võtta.
//   vaidlus:<inv>:<r>            kasutaja vaidlustas ülevõtu, lahendab haldur
//   marge:<kood>:<inv>:<r>       kasutaja märkus (ei tööta, vajab taatlemist jms)
//   logi:<inv>:<r>, ajalugu:<kood>:<inv>:<r>   sündmused (inv = TS_MAX − aeg, uusimad ees)
//   koht:<kood>                  töökoht (töökoha QR)
//   seaded                       firma seaded
import { teavita } from './teavita.js';

export const TAHED = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32, ilma I L O U
export const KOOD_RE = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const TS_MAX = 9999999999999;
const SESS_MS = 180 * 24 * 3600 * 1000;
const LAHTESTUS_MS = 24 * 3600 * 1000;
const PARTII_MAX = 30;              // seadmeid ühes võtmises/tagastuses
export const MARKE_TYYBID = {
  ei_toota: 'Ei tööta',
  taatlus: 'Vajab taatlemist / kalibreerimist',
  kahjustus: 'Kahjustatud',
  tarvik: 'Tarvik puudu',
  muu: 'Muu',
};
const TEAVITA_MARGE = new Set(['ei_toota', 'taatlus', 'kahjustus']);
export const VAIKESEADED = {
  firma: 'Firma',
  max_seadmeid: 20,           // korraga ühe kasutaja nimel
  registreerimine: 'kinnitamisega', // 'vaba' | 'kinnitamisega' (Margo otsus 01.11.2026: halduri kinnitusega; töökoht võib üle kirjutada)
  taatlus_blokeerib: true,    // aegunud taatlusega seadet ei saa võtta
  hoiata_paevi: 14,           // halduse ülevaates: kasutuses kauem kui N päeva
  taatlus_hoiatus_paevi: 30,  // seadme kaardil hoiatus N päeva enne taatluse tähtaega
  foto: 'valikuline',         // 'ei' | 'valikuline' | 'kohustuslik' (foto võtmisel ja tagastamisel; vajab R2 sidet FOTOD)
};
const FOTO_MAX = 1.5 * 1024 * 1024;
export const KUSTUTUS_MS = 30 * 24 * 3600 * 1000; // kustutatud kirje on 30 päeva taastatav, siis kustutatakse lõplikult
const LIIGID = { seade: 'seade:', koht: 'koht:', kasutaja: 'kasutaja:' };
const FOTO_RE = /^f\/[0-9A-Z]{10}\/\d{13}-[0-9A-Z]{6}\.(jpg|png|webp)$/;
const AJALUGU_TYYBID = new Set(['vott', 'tagastus', 'ulevott', 'tagastus_teise_eest', 'tagastus_halduri_poolt', 'marge', 'kinnitas', 'vaidlus']);
function fotoTyyp(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}

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
// Telefon: tühikud, kriipsud, punktid, sulud eemaldatakse. 7–8 numbrit ilma suunakoodita → +372.
export function normTel(v) {
  if (typeof v !== 'string') return null;
  let t = v.trim().replace(/[\s\-.()]/g, '');
  if (/^00\d+$/.test(t)) t = '+' + t.slice(2);
  if (/^[5-9]\d{6,7}$/.test(t)) t = '+372' + t;
  return /^\+\d{7,15}$/.test(t) ? t : null;
}
const inv = (ts) => String(TS_MAX - ts).padStart(13, '0');
const puhasta = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const puhastaMitmerealine = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
export const kuupaev = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const tana = (nyyd) => new Date(nyyd).toLocaleDateString('sv-SE', { timeZone: 'Europe/Tallinn' }); // Eesti kuupäev AAAA-KK-PP (suve- ja talveaeg)

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
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
  const [liik, iter, sool] = String(rasi).split('$');
  if (liik !== 'pbkdf2') return false;
  return vordle(await parooliRasi(parool, Number(iter), unb64(sool)), rasi);
}
function kypsis(request, nimi) {
  const c = request.headers.get('Cookie') || '';
  for (const osa of c.split(';')) {
    const [k, ...v] = osa.trim().split('=');
    if (k === nimi) return v.join('=');
  }
  return null;
}
const json = (obj, status = 200, lisa = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...lisa },
});
const viga = (tekst, status = 400, lisa = {}) => json({ ok: false, viga: tekst, ...lisa }, status);
export const eestiAeg = (ts) => new Date(ts).toLocaleString('et-EE', { timeZone: 'Europe/Tallinn', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const csvLahter = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---------- võtmise reegel (puhas funktsioon) ----------
// Tagastab { lubatud, vaja_ule, juba, pohjus }. vaja_ule = seade on teise nimel; võtta saab ainult kinnitusega
// „võtan üle“, mille järel eelmine kasutaja peab ülevõtu kinnitama enne, kui ta saab ise uusi seadmeid võtta.
export function votmiseKontroll({ kasutaja, seade, laen, seaded, kinnitamata = 0, minuArv = 0, nyyd = Date.now() }) {
  if (!seade) return { lubatud: false, pohjus: 'Tundmatu seade. Pöördu administraatori poole.' };
  if (kasutaja.olek === 'ootel') return { lubatud: false, pohjus: 'Sinu konto ootab administraatori kinnitust.' };
  if (kasutaja.olek !== 'aktiivne') return { lubatud: false, pohjus: 'Sinu konto on peatatud. Pöördu administraatori poole.' };
  if (laen && laen.kasutaja === kasutaja.id) return { lubatud: false, juba: true, pohjus: 'Seade on juba sinu nimel.' };
  if (kinnitamata > 0) return { lubatud: false, pohjus: 'Enne uue seadme võtmist vasta ülevõtu teatele (keegi võttis üle või tagastas seadme, mis oli sinu nimel).' };
  if (seade.olek === 'remondis') return { lubatud: false, pohjus: 'Seade on remondis/hoolduses. Pöördu administraatori poole.' };
  if (seade.olek === 'maha') return { lubatud: false, pohjus: 'Seade on maha kantud.' };
  if (seade.taatlus_kuni && seaded.taatlus_blokeerib && seade.taatlus_kuni < tana(nyyd))
    return { lubatud: false, pohjus: `Taatlus/kalibreerimine aegus ${seade.taatlus_kuni}. Pöördu administraatori poole.` };
  if (minuArv >= seaded.max_seadmeid) return { lubatud: false, pohjus: `Sinu nimel võib korraga olla kuni ${seaded.max_seadmeid} seadet.` };
  if (laen) return { lubatud: true, vaja_ule: true, pohjus: 'Seade on teise kasutaja nimel.' };
  return { lubatud: true };
}

export class Register {
  constructor(state, env) {
    this.state = state;
    this.s = state.storage;
    this.env = env || {};
    this.vead = new Map();      // sisselogimise ja halduse ebaõnnestumised (mälus; DO on üks eksemplar)
  }

  // ---------- andmekiht ----------
  async seaded() { return { ...VAIKESEADED, ...((await this.s.get('seaded')) || {}) }; }
  // Kustutatud (taastatav) kirje on kõigile peale halduri nähtamatu
  async elus(voti) { const x = await this.s.get(voti); return x && !x.kustutatud ? x : null; }
  async elusLoend(prefix) { return (await this.loend(prefix)).filter(([, x]) => !x.kustutatud); }
  async loend(prefix, limit) {
    const m = await this.s.list(limit ? { prefix, limit } : { prefix });
    return [...m.entries()];
  }
  async logi(kirje) {
    const aeg = kirje.aeg || Date.now();
    const r = juhuslik(4);
    const k = { ...kirje, aeg };
    await this.s.put(`logi:${inv(aeg)}:${r}`, k);
    if (kirje.kood) await this.s.put(`ajalugu:${kirje.kood}:${inv(aeg)}:${r}`, k);
  }
  async kinnitamata(id) { return this.loend(`kinnita:${id}:`); }
  async minuLaenud(id) {
    return (await this.loend('laen:')).map(([, l]) => l).filter((l) => l.kasutaja === id);
  }
  iter() { const n = Number(this.env.PBKDF2_ITER); return Number.isInteger(n) && n >= 10000 && n <= 100000 ? n : 100000; }
  teavitaTaustal(tekst, gps) {
    const p = teavita(this.env, tekst, gps).catch(() => {});
    if (this.state.waitUntil) this.state.waitUntil(p);
    return p;
  }
  // Ebaõnnestumiste loendur: lukk N veast aknas
  piiratud(voti, max, aken = 15 * 60 * 1000, nyyd = Date.now()) {
    const v = (this.vead.get(voti) || []).filter((t) => nyyd - t < aken);
    this.vead.set(voti, v);
    return v.length >= max;
  }
  viga(voti) { const v = this.vead.get(voti) || []; v.push(Date.now()); this.vead.set(voti, v); }

  // ---------- sessioon ----------
  async uusSessioon(id) {
    const nyyd = Date.now();
    for (const [v, x] of await this.loend('sess:')) if (x.aegub < nyyd) await this.s.delete(v); // aegunud sessioonid ära
    const token = juhuslik(40);
    await this.s.put(`sess:${await sha256hex(token)}`, { kasutaja: id, aegub: Date.now() + SESS_MS });
    return `qw_sess=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESS_MS / 1000}`;
  }
  async kasutaja(request) {
    const token = kypsis(request, 'qw_sess');
    if (!token || !/^[0-9A-Z]{40}$/.test(token)) return null;
    const sv = `sess:${await sha256hex(token)}`;
    const sess = await this.s.get(sv);
    if (!sess) return null;
    if (sess.aegub < Date.now()) { await this.s.delete(sv); return null; }
    const k = await this.elus(`kasutaja:${sess.kasutaja}`);
    if (!k || k.olek === 'blokeeritud') return null;
    k._sess = sv;
    return k;
  }
  avalikKasutaja(k) { return k ? { id: k.id, nimi: k.nimi, tel: k.tel } : null; }

  // Foto režiim: 'ei', kui R2 side puudub
  fotoReziim(seaded) { return this.env.FOTOD ? seaded.foto : 'ei'; }
  // Kas foto võti kuulub sellele kasutajale ja on olemas. Tagastab võtme, null (puudub) või false (vigane).
  async fotoKontroll(k, foto, seaded) {
    if (!foto) return this.fotoReziim(seaded) === 'kohustuslik' ? false : null;
    if (typeof foto !== 'string' || !FOTO_RE.test(foto) || foto.split('/')[1] !== k.id || !this.env.FOTOD) return false;
    return (await this.s.get(`foto:${foto}`)) ? foto : false;
  }
  // Foto on kasutatud: kirje kustutatakse, sama võtit ei saa teise sündmuse juures uuesti kasutada
  async fotoKasutatud(foto) { if (foto) await this.s.delete(`foto:${foto}`); }
  async fotoUles(request) {
    const k = await this.kasutaja(request);
    if (!k) return viga('Logi sisse', 401);
    if (k.olek !== 'aktiivne') return viga('Konto ootab administraatori kinnitust.', 403);
    if (!this.env.FOTOD) return viga('Foto salvestamine ei ole seadistatud.', 501);
    if (Number(request.headers.get('Content-Length') || 0) > FOTO_MAX) return viga('Foto on liiga suur.', 413);
    if (this.piiratud(`foto:${k.id}`, 60, 3600 * 1000)) return viga('Liiga palju fotosid, proovi hiljem.', 429);
    const b = new Uint8Array(await request.arrayBuffer());
    if (b.length > FOTO_MAX || b.length < 100) return viga('Foto on liiga suur või tühi.', 413);
    const t = fotoTyyp(b);
    if (!t) return viga('Lubatud on JPEG, PNG või WebP.', 415);
    this.viga(`foto:${k.id}`);
    const voti = `f/${k.id}/${String(Date.now()).padStart(13, '0')}-${juhuslik(6)}.${t}`;
    await this.env.FOTOD.put(voti, b, { httpMetadata: { contentType: t === 'jpg' ? 'image/jpeg' : `image/${t}` } });
    await this.s.put(`foto:${voti}`, { kasutaja: k.id, aeg: Date.now() });
    return json({ ok: true, foto: voti });
  }

  // ---------- päringud ----------
  async fetch(request) {
    const url = new URL(request.url);
    const tee = url.pathname;
    try {
      if (tee.startsWith('/api/admin/')) return await this.admin(request, tee.slice(11), url);
      if (request.method !== 'POST') return viga('meetod', 405);
      // CSRF: ainult JSON ja oma päis (teine sait ei saa neid ilma CORS-eelkontrollita saata)
      if (request.headers.get('X-QW') !== '1') return viga('päis puudub', 403);
      if (tee === '/api/foto') return await this.fotoUles(request);
      const keha = await loeJson(request);
      if (keha === null) return viga('vigane päring');
      const ip = request.headers.get('X-IP-Rasi') || '';
      switch (tee) {
        case '/api/alusta': return await this.alusta(request, keha);
        case '/api/registreeru': return await this.registreeru(keha, ip);
        case '/api/logi-sisse': return await this.logiSisse(keha, ip);
        case '/api/parool': return await this.parooliTaastus(keha, ip);
        case '/api/avalik': return await this.avalik(keha);
        case '/api/leid': return await this.leid(request, keha);
      }
      const k = await this.kasutaja(request);
      if (!k) return viga('Logi sisse', 401);
      // Kinnitamata (ootel) kasutaja: ainult oma andmed ja isikuandmeteta seadme kaart (K1)
      if (k.olek !== 'aktiivne' && !['/api/logi-valja', '/api/mina', '/api/seade'].includes(tee)) return viga('Konto ootab administraatori kinnitust.', 403);
      switch (tee) {
        case '/api/logi-valja': await this.s.delete(k._sess); return json({ ok: true }, 200, { 'Set-Cookie': 'qw_sess=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
        case '/api/mina': return json(await this.mina(k));
        case '/api/seade': return await this.seadmeInfo(k, keha);
        case '/api/vota': return await this.vota(k, keha);
        case '/api/tagasta': return await this.tagasta(k, keha);
        case '/api/marge': return await this.marge(k, keha);
        case '/api/kinnita': return await this.kinnita(k, keha);
        case '/api/otsi': return await this.otsi(k, keha);
        case '/api/laod': return await this.laod(k);
      }
      return viga('tundmatu tee', 404);
    } catch (e) {
      console.error('qrwork viga', e && e.stack || e);
      return viga('serveri viga', 500);
    }
  }

  // Lehe avamine: töökoha nimi (kui QR-ist tuli kood) ja kasutaja (kui sessioon kehtib)
  async alusta(request, { koht }) {
    const seaded = await this.seaded();
    const kk = normKood(koht || '');
    const kohtK = kk ? await this.elus(`koht:${kk}`) : null;
    const k = await this.kasutaja(request);
    return json({ ok: true, firma: seaded.firma, koht: kohtK ? { kood: kohtK.kood, nimi: kohtK.nimi } : null, mina: k ? await this.mina(k) : null });
  }

  async registreeru({ nimi, tel, parool, koht }, ip) {
    if (this.piiratud(`reg:${ip}`, 10, 3600 * 1000)) return viga('Liiga palju katseid, proovi hiljem.', 429);
    const kk = normKood(koht || '');
    const kohtK = kk ? await this.elus(`koht:${kk}`) : null;
    if (!kohtK) return viga('Registreerumiseks skänni töökoha QR-kood.');
    nimi = puhasta(nimi, 60);
    if (nimi.length < 3) return viga('Sisesta ees- ja perekonnanimi.');
    const t = normTel(tel);
    if (!t) return viga('Vigane telefoninumber (nt 5123 4567 või +372 5123 4567).');
    if (typeof parool !== 'string' || parool.length < 6 || parool.length > 128) return viga('Parool peab olema 6–128 märki.');
    if (await this.s.get(`tel:${t}`)) return viga('See number on juba registreeritud. Logi sisse.', 409);
    this.viga(`reg:${ip}`); // iga registreerimine loeb piiri sisse
    const seaded = await this.seaded();
    const reg = kohtK.registreerimine || seaded.registreerimine;
    let id;
    do id = juhuslik(10); while (await this.s.get(`kasutaja:${id}`));
    const k = { id, nimi, tel: t, rasi: await parooliRasi(parool, this.iter()), olek: reg === 'kinnitamisega' ? 'ootel' : 'aktiivne', loodud: Date.now(), koht: kk, hilinenud: 0 };
    await this.s.put(`kasutaja:${id}`, k);
    await this.s.put(`tel:${t}`, id);
    await this.logi({ tyyp: 'registreerus', kasutaja: id, nimi, koht: kk });
    if (k.olek === 'ootel') this.teavitaTaustal(`👤 Uus kasutaja ootab kinnitust: ${nimi}, ${t} (${kohtK.nimi})`);
    return json({ ok: true, mina: await this.mina(k) }, 200, { 'Set-Cookie': await this.uusSessioon(id) });
  }

  async logiSisse({ tel, parool }, ip) {
    const t = normTel(tel);
    if (!t || typeof parool !== 'string') return viga('Sisesta telefon ja parool.');
    if (this.piiratud(`tel:${t}`, 8) || this.piiratud(`ip:${ip}`, 30)) return viga('Liiga palju vigaseid katseid. Proovi 15 minuti pärast.', 429);
    const id = await this.s.get(`tel:${t}`);
    const k = id ? await this.elus(`kasutaja:${id}`) : null;
    if (!k || !(await parooliKontroll(parool, k.rasi))) {
      this.viga(`tel:${t}`); this.viga(`ip:${ip}`);
      return viga('Vale telefon või parool.', 401);
    }
    if (k.olek === 'blokeeritud') return viga('Konto on peatatud. Pöördu administraatori poole.', 403);
    return json({ ok: true, mina: await this.mina(k) }, 200, { 'Set-Cookie': await this.uusSessioon(k.id) });
  }

  // Parooli taastus halduri antud ühekordse koodiga (kehtib 24 h)
  async parooliTaastus({ tel, kood, parool }, ip) {
    const t = normTel(tel);
    if (!t) return viga('Vigane telefoninumber.');
    if (this.piiratud(`taastus:${t}`, 5) || this.piiratud(`ip:${ip}`, 30)) return viga('Liiga palju vigaseid katseid. Proovi 15 minuti pärast.', 429);
    if (typeof parool !== 'string' || parool.length < 6 || parool.length > 128) return viga('Parool peab olema 6–128 märki.');
    const id = await this.s.get(`tel:${t}`);
    const k = id ? await this.elus(`kasutaja:${id}`) : null;
    const l = k?.lahtestus;
    const kood2 = typeof kood === 'string' ? kood.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[\s-]/g, '') : '';
    if (!l || l.aegub < Date.now() || !vordle(await sha256hex(kood2), l.rasi)) {
      this.viga(`taastus:${t}`); this.viga(`ip:${ip}`);
      return viga('Vale või aegunud taastuskood. Küsi administraatorilt uus.', 401);
    }
    if (k.olek === 'blokeeritud') return viga('Konto on peatatud.', 403);
    k.rasi = await parooliRasi(parool, this.iter());
    delete k.lahtestus;
    await this.s.put(`kasutaja:${k.id}`, k);
    // vanad sessioonid kehtetuks
    for (const [v, s] of await this.loend('sess:')) if (s.kasutaja === k.id) await this.s.delete(v);
    await this.logi({ tyyp: 'parool_taastatud', kasutaja: k.id, nimi: k.nimi });
    return json({ ok: true, mina: await this.mina(k) }, 200, { 'Set-Cookie': await this.uusSessioon(k.id) });
  }

  async seadmeKaart(seade, laen, seaded, nyyd = Date.now(), privaatne = false) {
    const margmed = (await this.loend(`marge:${seade.kood}:`, 50)).map(([v, m]) => ({ ...m, voti: v })).filter((m) => !m.lahendatud).slice(0, 10);
    const hoiatused = [];
    if (seade.taatlus_kuni) {
      const t = tana(nyyd);
      if (seade.taatlus_kuni < t) hoiatused.push(`Taatlus/kalibreerimine aegunud (${seade.taatlus_kuni})`);
      else if (Date.parse(seade.taatlus_kuni) - Date.parse(t) <= seaded.taatlus_hoiatus_paevi * 86400000) hoiatused.push(`Taatlus/kalibreerimine aegub ${seade.taatlus_kuni}`);
    }
    for (const m of margmed) if (m.tyyp !== 'muu') hoiatused.push(`${MARKE_TYYBID[m.tyyp]} (${m.nimi}, ${eestiAeg(m.aeg)})`);
    let kellel = null;
    if (laen) {
      const k = await this.s.get(`kasutaja:${laen.kasutaja}`);
      kellel = { id: laen.kasutaja, nimi: k?.nimi || '?', tel: k?.tel || '', alates: laen.alates, koht: laen.koht ? (await this.elus(`koht:${laen.koht}`))?.nimi || '' : '' };
    }
    // asukoht = viimati tagastatud töökoht, selle puudumisel halduri määratud koduladu (M2)
    const kohtK = seade.asukoht || seade.koduladu;
    const asukoht = kohtK ? (await this.elus(`koht:${kohtK}`))?.nimi || '' : '';
    if (privaatne) {
      return { ajalugu: [], kood: seade.kood, nimi: seade.nimi, tyyp: seade.tyyp || '', invnr: seade.invnr || '', seerianr: seade.seerianr || '',
        taatlus_kuni: seade.taatlus_kuni || null, olek: seade.olek, lisainfo: seade.lisainfo || '', asukoht, kellel: laen ? { nimi: 'teine kasutaja', tel: '', alates: laen.alates, koht: '' } : null,
        margmed: [], hoiatused: hoiatused.filter((h) => h.startsWith('Taatlus')) };
    }
    const ajalugu = (await this.loend(`ajalugu:${seade.kood}:`, 100)).map(([, x]) => x).filter((x) => AJALUGU_TYYBID.has(x.tyyp)).slice(0, 15)
      .map((x) => ({ aeg: x.aeg, tyyp: x.tyyp, nimi: x.nimi, eelmise_nimi: x.eelmise_nimi || x.uus || '', marge: x.marge || '', foto: !!x.foto }));
    return {
      ajalugu,
      kood: seade.kood, nimi: seade.nimi, tyyp: seade.tyyp || '', invnr: seade.invnr || '', seerianr: seade.seerianr || '',
      taatlus_kuni: seade.taatlus_kuni || null, olek: seade.olek, lisainfo: seade.lisainfo || '', asukoht, kellel, margmed, hoiatused,
    };
  }

  async mina(k) {
    const laenud = await this.minuLaenud(k.id);
    const seaded = await this.seaded();
    const seadmed = [];
    for (const l of laenud.sort((a, b) => a.alates - b.alates)) {
      const s = await this.elus(`seade:${l.kood}`);
      seadmed.push({ kood: l.kood, nimi: s?.nimi || '?', invnr: s?.invnr || '', alates: l.alates });
    }
    const kinnitamata = (await this.kinnitamata(k.id)).map(([v, x]) => ({ ...x, id: v.split(':').slice(2).join(':') }));
    return { kasutaja: { id: k.id, nimi: k.nimi, tel: k.tel, olek: k.olek, super: !!k.super }, seadmed, kinnitamata, max_seadmeid: seaded.max_seadmeid, firma: seaded.firma, foto: this.fotoReziim(seaded) };
  }

  async seadmeInfo(k, { kood }) {
    const kk = normKood(kood);
    const seade = kk ? await this.elus(`seade:${kk}`) : null;
    if (!seade) return viga('Tundmatu QR-kood. Pöördu administraatori poole.', 404, { tundmatu: true });
    const laen = await this.s.get(`laen:${kk}`);
    const seaded = await this.seaded();
    const kontroll = votmiseKontroll({ kasutaja: k, seade, laen, seaded, kinnitamata: (await this.kinnitamata(k.id)).length, minuArv: (await this.minuLaenud(k.id)).length });
    return json({ ok: true, seade: await this.seadmeKaart(seade, laen, seaded, Date.now(), k.olek !== 'aktiivne'), minu: !!laen && laen.kasutaja === k.id, vota: kontroll, marke_tyybid: MARKE_TYYBID });
  }

  // Võtmine: koodid = skännitud seadmed (1…30), ule = koodid, mille ülevõtu kasutaja kinnitas.
  // Iga seade eraldi tulemusega; ühe seadme keeld ei takista teisi.
  async vota(k, { koodid, ule, koht, foto: fotoSisse }) {
    const list = [...new Set((Array.isArray(koodid) ? koodid : []).map(normKood).filter(Boolean))].slice(0, PARTII_MAX);
    if (!list.length) return viga('Skänni vähemalt üks seade.');
    const uleSet = new Set((Array.isArray(ule) ? ule : []).map(normKood).filter(Boolean));
    const kohtK = normKood(koht || '');
    const kohtOk = kohtK && (await this.elus(`koht:${kohtK}`)) ? kohtK : null;
    const seaded = await this.seaded();
    const foto = await this.fotoKontroll(k, fotoSisse, seaded);
    if (foto === false) return viga(this.fotoReziim(seaded) === 'kohustuslik' && !fotoSisse ? 'Lisa foto seadmest.' : 'Foto ei ole kehtiv, lisa uuesti.');
    const kinnitamata = (await this.kinnitamata(k.id)).length;
    let minuArv = (await this.minuLaenud(k.id)).length;
    const nyyd = Date.now();
    const tulemused = [];
    for (const kood of list) {
      const seade = await this.elus(`seade:${kood}`);
      const laen = await this.s.get(`laen:${kood}`);
      const r = votmiseKontroll({ kasutaja: k, seade, laen, seaded, kinnitamata, minuArv, nyyd });
      if (!r.lubatud) { tulemused.push({ kood, nimi: seade?.nimi, ok: false, juba: !!r.juba, viga: r.pohjus }); continue; }
      if (r.vaja_ule) {
        const eelmine = await this.s.get(`kasutaja:${laen.kasutaja}`);
        if (!uleSet.has(kood)) {
          tulemused.push({ kood, nimi: seade.nimi, ok: false, vaja_ule: true, kellel: { nimi: eelmine?.nimi || '?', tel: eelmine?.tel || '', alates: laen.alates } });
          continue;
        }
        await this.s.put(`kinnita:${laen.kasutaja}:${inv(nyyd)}:${juhuslik(4)}`, {
          liik: 'ulevott', kood, seadme_nimi: seade.nimi, alates: laen.alates, aeg: nyyd, uus: this.avalikKasutaja(k),
        });
        await this.logi({ tyyp: 'ulevott', kood, kasutaja: k.id, nimi: k.nimi, eelmine: laen.kasutaja, eelmise_nimi: eelmine?.nimi, koht: kohtOk, aeg: nyyd });
        this.teavitaTaustal(`🔁 Ülevõtt: ${seade.nimi} (${seade.invnr || kood})\nOli: ${eelmine?.nimi} alates ${eestiAeg(laen.alates)} (tagastust ei registreeritud)\nVõttis: ${k.nimi}, ${k.tel}`);
      }
      await this.s.put(`laen:${kood}`, { kood, kasutaja: k.id, alates: nyyd, koht: kohtOk });
      await this.logi({ tyyp: 'vott', kood, kasutaja: k.id, nimi: k.nimi, koht: kohtOk, aeg: nyyd, foto });
      minuArv++;
      tulemused.push({ kood, nimi: seade.nimi, ok: true, ule: !!r.vaja_ule });
    }
    if (tulemused.some((t) => t.ok)) await this.fotoKasutatud(foto);
    return json({ ok: true, tulemused, mina: await this.mina(k) });
  }

  // Tagastamine: oma seadmed. teise_eest = koodid, mille kasutaja märgib tagastatuks teise inimese eest
  // (leidis seadme laost/kapist); see inimene saab kinnitamise kohustuse nagu ülevõtul.
  async tagasta(k, { koodid, teise_eest, koht, foto: fotoSisse }) {
    const list = [...new Set((Array.isArray(koodid) ? koodid : []).map(normKood).filter(Boolean))].slice(0, PARTII_MAX);
    if (!list.length) return viga('Skänni vähemalt üks seade.');
    const teiseSet = new Set((Array.isArray(teise_eest) ? teise_eest : []).map(normKood).filter(Boolean));
    const kohtK = normKood(koht || '');
    const kohtOk = kohtK && (await this.elus(`koht:${kohtK}`)) ? kohtK : null;
    const seaded = await this.seaded();
    const foto = await this.fotoKontroll(k, fotoSisse, seaded);
    if (foto === false) return viga(this.fotoReziim(seaded) === 'kohustuslik' && !fotoSisse ? 'Lisa foto seadmest.' : 'Foto ei ole kehtiv, lisa uuesti.');
    const nyyd = Date.now();
    const tulemused = [];
    for (const kood of list) {
      const seade = await this.elus(`seade:${kood}`);
      if (!seade) { tulemused.push({ kood, ok: false, viga: 'Tundmatu QR-kood. Pöördu administraatori poole.' }); continue; }
      const laen = await this.s.get(`laen:${kood}`);
      if (!laen) { tulemused.push({ kood, nimi: seade.nimi, ok: false, viga: 'Seade ei ole kellegi nimel (juba tagastatud).' }); continue; }
      if (laen.kasutaja !== k.id) {
        const omanik = await this.s.get(`kasutaja:${laen.kasutaja}`);
        if (!teiseSet.has(kood) || k.olek !== 'aktiivne') {
          tulemused.push({ kood, nimi: seade.nimi, ok: false, teise_nimel: true, kellel: { nimi: omanik?.nimi || '?', tel: omanik?.tel || '', alates: laen.alates } });
          continue;
        }
        await this.s.put(`kinnita:${laen.kasutaja}:${inv(nyyd)}:${juhuslik(4)}`, {
          liik: 'tagastas_teine', kood, seadme_nimi: seade.nimi, alates: laen.alates, aeg: nyyd, uus: this.avalikKasutaja(k),
        });
        await this.logi({ tyyp: 'tagastus_teise_eest', kood, kasutaja: k.id, nimi: k.nimi, eelmine: laen.kasutaja, eelmise_nimi: omanik?.nimi, koht: kohtOk, aeg: nyyd, foto });
      } else {
        await this.logi({ tyyp: 'tagastus', kood, kasutaja: k.id, nimi: k.nimi, koht: kohtOk, aeg: nyyd, kestus_ms: nyyd - laen.alates, foto });
      }
      await this.s.delete(`laen:${kood}`);
      if (kohtOk && seade.asukoht !== kohtOk) await this.s.put(`seade:${kood}`, { ...seade, asukoht: kohtOk });
      tulemused.push({ kood, nimi: seade.nimi, ok: true, teise_eest: laen.kasutaja !== k.id });
    }
    if (tulemused.some((t) => t.ok)) await this.fotoKasutatud(foto);
    return json({ ok: true, tulemused, mina: await this.mina(k) });
  }

  // Märkus: ainus asi, mida kasutaja registrisse lisada saab. Registriandmeid (nimi, nr, taatlus) ta ei muuda.
  async marge(k, { kood, tyyp, tekst, foto: fotoSisse }) {
    const kk = normKood(kood);
    const seade = kk ? await this.elus(`seade:${kk}`) : null;
    if (!seade) return viga('Tundmatu seade.', 404);
    if (!MARKE_TYYBID[tyyp]) return viga('Vali märkuse liik.');
    tekst = puhastaMitmerealine(tekst, 500);
    if (tyyp === 'muu' && !tekst) return viga('Kirjuta märkus.');
    if (this.piiratud(`marge:${k.id}`, 30, 24 * 3600 * 1000)) return viga('Liiga palju märkusi ühe päevaga.', 429);
    const foto = fotoSisse ? await this.fotoKontroll(k, fotoSisse, { foto: 'valikuline' }) : null;
    if (foto === false) return viga('Foto ei ole kehtiv, lisa uuesti.');
    this.viga(`marge:${k.id}`);
    const aeg = Date.now();
    await this.s.put(`marge:${kk}:${inv(aeg)}:${juhuslik(4)}`, { aeg, kasutaja: k.id, nimi: k.nimi, tyyp, tekst, foto, lahendatud: false });
    await this.logi({ tyyp: 'marge', kood: kk, kasutaja: k.id, nimi: k.nimi, marge: tyyp, tekst, aeg, foto });
    await this.fotoKasutatud(foto);
    if (TEAVITA_MARGE.has(tyyp)) this.teavitaTaustal(`⚠️ ${MARKE_TYYBID[tyyp]}: ${seade.nimi} (${seade.invnr || kk})\n${k.nimi}, ${k.tel}${tekst ? `\n„${tekst}“` : ''}`);
    return json({ ok: true });
  }

  // Eelmine kasutaja vastab ülevõtule: 'jah' (tagastasin / andsin üle, unustasin registreerida) või 'vaidlus'.
  // Mõlemad vabastavad võtmise keelu; vaidlus läheb administraatorile lahendamiseks.
  async kinnita(k, { id, vastus, tekst }) {
    if (typeof id !== 'string' || !/^\d{13}:[0-9A-Z]{4}$/.test(id)) return viga('vigane kinnitus');
    const v = `kinnita:${k.id}:${id}`;
    const x = await this.s.get(v);
    if (!x) return json({ ok: true, mina: await this.mina(k) }); // juba kinnitatud
    if (vastus !== 'jah' && vastus !== 'vaidlus') return viga('Vali vastus.');
    tekst = puhastaMitmerealine(tekst, 500);
    if (vastus === 'vaidlus' && !tekst) return viga('Kirjuta lühidalt, mis juhtus.');
    await this.s.delete(v);
    const aeg = Date.now();
    if (vastus === 'jah') {
      k.hilinenud = (k.hilinenud || 0) + 1;
      const { _sess, ...puhas } = k;
      await this.s.put(`kasutaja:${k.id}`, puhas);
      await this.logi({ tyyp: 'kinnitas', kood: x.kood, kasutaja: k.id, nimi: k.nimi, uus: x.uus?.nimi, aeg });
    } else {
      await this.s.put(`vaidlus:${inv(aeg)}:${juhuslik(4)}`, { ...x, eelmine: this.avalikKasutaja(k), tekst, vaidlus_aeg: aeg, lahendatud: false });
      await this.logi({ tyyp: 'vaidlus', kood: x.kood, kasutaja: k.id, nimi: k.nimi, uus: x.uus?.nimi, tekst, aeg });
      this.teavitaTaustal(`❗ Vaidlus: ${x.seadme_nimi}\n${k.nimi} (${k.tel}) ei nõustu, et ${x.uus?.nimi} ${x.liik === 'ulevott' ? 'võttis seadme üle' : 'märkis selle tagastatuks'}.\n„${tekst}“`);
    }
    return json({ ok: true, mina: await this.mina(k) });
  }

  // Kus seade on? (sisemine „leia mind“): nimi, tüüp, inventarinumber, kood.
  // Tavakasutaja näeb ainult otsingu tulemust (vähemalt 2 märki); superkasutaja näeb tühja päringuga kõiki seadmeid.
  async otsi(k, { q }) {
    const p = puhasta(q, 60).toLowerCase();
    if (!k.super && p.length < 2) return json({ ok: true, tulemused: [], vaja_paringut: true });
    const seaded = await this.seaded();
    const laenud = new Map((await this.loend('laen:')).map(([, l]) => [l.kood, l]));
    const tul = [];
    for (const [, s] of await this.elusLoend('seade:')) {
      if (s.olek === 'maha') continue;
      const tekst = `${s.nimi} ${s.tyyp || ''} ${s.invnr || ''} ${s.seerianr || ''} ${s.kood}`.toLowerCase();
      if (p && !tekst.includes(p)) continue;
      tul.push(await this.seadmeKaart(s, laenud.get(s.kood), seaded));
      if (tul.length >= (k.super ? 300 : 50)) break;
    }
    return json({ ok: true, tulemused: tul });
  }

  // Ladude seis (ainult superkasutaja): igas laos vabad seadmed, sealt välja võetud seadmed ja remondis olevad
  async laod(k) {
    if (!k.super) return viga('Ainult superkasutajale.', 403);
    const kohad = (await this.elusLoend('koht:')).map(([, x]) => x);
    const kasutajad = new Map((await this.loend('kasutaja:')).map(([, x]) => [x.id, x]));
    const laenud = new Map((await this.loend('laen:')).map(([, l]) => [l.kood, l]));
    const tyhi = () => ({ vabad: [], valjas: [], remondis: [] });
    const seis = new Map(kohad.map((x) => [x.kood, tyhi()]));
    const maaramata = tyhi();
    for (const [, s] of await this.elusLoend('seade:')) {
      if (s.olek === 'maha') continue;
      const l = laenud.get(s.kood);
      const kohtK = s.asukoht || s.koduladu;
      const g = seis.get(kohtK) || maaramata;
      const rida = { kood: s.kood, nimi: s.nimi, invnr: s.invnr || '', tyyp: s.tyyp || '' };
      if (l) { const kk = kasutajad.get(l.kasutaja); g.valjas.push({ ...rida, kellel: kk?.nimi || '?', tel: kk?.tel || '', alates: l.alates }); }
      else if (s.olek === 'remondis') g.remondis.push(rida);
      else g.vabad.push(rida);
    }
    const laod = kohad.map((x) => ({ kood: x.kood, nimi: x.nimi, lyhend: x.lyhend || '', ...seis.get(x.kood) }));
    if (maaramata.vabad.length + maaramata.valjas.length + maaramata.remondis.length) laod.push({ kood: '', nimi: 'Ladu määramata', lyhend: '', ...maaramata });
    return json({ ok: true, laod });
  }

  // ---------- avalik osa: leidja ----------
  async avalik({ kood }) {
    const kk = normKood(kood);
    const s = kk ? await this.elus(`seade:${kk}`) : null;
    const seaded = await this.seaded();
    if (!s) return viga('Tundmatu kood.', 404);
    return json({ ok: true, firma: seaded.firma, nimi: s.nimi, invnr: s.invnr || '', telefon: seaded.telefon || '' });
  }
  async leid(request, { kood, tekst, kontakt, lat, lon, tapsus }) {
    const kk = normKood(kood);
    const s = kk ? await this.elus(`seade:${kk}`) : null;
    if (!s) return viga('Tundmatu kood.', 404);
    const ip = request.headers.get('X-IP-Rasi') || '';
    if (this.piiratud(`leid:${kk}`, 3, 60 * 1000) || this.piiratud(`leidip:${ip}`, 5, 60 * 1000) || this.piiratud(`leidtund:${kk}`, 10, 3600 * 1000))
      return viga('Oota minut ja proovi uuesti.', 429);
    this.viga(`leid:${kk}`); this.viga(`leidip:${ip}`); this.viga(`leidtund:${kk}`);
    tekst = puhastaMitmerealine(tekst, 500); kontakt = puhasta(kontakt, 100);
    const gps = typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, tapsus: Number.isFinite(tapsus) ? Math.round(tapsus) : null } : null;
    const laen = await this.s.get(`laen:${kk}`);
    const kellel = laen ? await this.s.get(`kasutaja:${laen.kasutaja}`) : null;
    const linn = request.cf?.city ? `${request.cf.city}${request.cf.country ? ', ' + request.cf.country : ''}` : '';
    await this.logi({ tyyp: 'leiuteade', leidkood: kk, tekst, kontakt, gps, linn }); // leidkood: ei lähe seadme ajalukku (L1)
    await this.teavitaTaustal([
      `📦 Leiuteade: ${s.nimi} (${s.invnr || kk})`,
      kellel ? `Registreeritud: ${kellel.nimi}, ${kellel.tel}` : 'Seade ei ole kellegi nimel.',
      tekst && `Leidja: „${tekst}“`, kontakt && `Kontakt: ${kontakt}`, linn && `Umbkaudu (IP): ${linn}`,
      gps && `📍 https://maps.google.com/?q=${gps.lat},${gps.lon}${gps.tapsus ? ` (±${gps.tapsus} m)` : ''}`,
    ].filter(Boolean).join('\n'), gps);
    return json({ ok: true });
  }

  // ---------- haldus ----------
  async admin(request, tee, url) {
    const ip = request.headers.get('X-IP-Rasi') || '';
    if (this.piiratud(`admin:${ip}`, 10)) return viga('Liiga palju vigaseid katseid.', 429);
    const tok = this.env.ADMIN_TOKEN;
    const auth = request.headers.get('Authorization') || '';
    if (!tok || tok.length < 16 || !vordle(auth, `Bearer ${tok}`)) { this.viga(`admin:${ip}`); return viga('Vale halduse võti.', 401); }
    if (request.method === 'GET') {
      if (tee === 'ulevaade') return json(await this.ulevaade());
      if (tee === 'logi') return json({ ok: true, logi: await this.logiLoe(url.searchParams.get('kood'), 300) });
      if (tee === 'seadmed.csv') return this.seadmedCsv();
      if (tee === 'logi.csv') return this.logiCsv();
      if (tee === 'foto') {
        const v = url.searchParams.get('k') || '';
        if (!FOTO_RE.test(v) || !this.env.FOTOD) return viga('ei leitud', 404);
        const o = await this.env.FOTOD.get(v);
        if (!o) return viga('ei leitud', 404);
        return new Response(o.body, { headers: { 'Content-Type': o.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
      }
      return viga('tundmatu', 404);
    }
    if (request.method !== 'POST') return viga('meetod', 405);
    const b = await loeJson(request);
    if (b === null) return viga('vigane päring');
    switch (tee) {
      case 'seade': return this.adminSeade(b);
      case 'koht': return this.adminKoht(b);
      case 'kasutaja': return this.adminKasutaja(b);
      case 'lahtesta': return this.adminLahtesta(b);
      case 'kinnitused-eemalda': return this.adminKinnitusedEemalda(b);
      case 'tagasta': return this.adminTagasta(b);
      case 'marge-lahenda': return this.adminLahenda('marge:', b);
      case 'vaidlus-lahenda': return this.adminLahenda('vaidlus:', b);
      case 'seaded': return this.adminSeaded(b);
      case 'kustuta': return this.adminKustuta(b);
      case 'taasta': return this.adminTaasta(b);
    }
    return viga('tundmatu', 404);
  }

  async logiLoe(kood, max) {
    const kk = kood ? normKood(kood) : null;
    return (await this.loend(kk ? `ajalugu:${kk}:` : 'logi:', max)).map(([, x]) => x);
  }

  async ulevaade() {
    await this.lopetaKustutamine();
    const seaded = await this.seaded();
    const kasutajad = new Map((await this.loend('kasutaja:')).map(([, k]) => [k.id, k]));
    const kohad = (await this.loend('koht:')).map(([, k]) => k);
    const kohaNimi = new Map(kohad.map((k) => [k.kood, k.nimi]));
    const laenud = new Map((await this.loend('laen:')).map(([, l]) => [l.kood, l]));
    const seadmed = [];
    for (const [, s] of await this.loend('seade:')) {
      const l = laenud.get(s.kood);
      const k = l ? kasutajad.get(l.kasutaja) : null;
      seadmed.push({ ...s, asukoht_nimi: kohaNimi.get(s.asukoht || s.koduladu) || '', koduladu_nimi: kohaNimi.get(s.koduladu) || '', kellel: l ? { id: l.kasutaja, nimi: k?.nimi || '?', tel: k?.tel || '', alates: l.alates, koht: kohaNimi.get(l.koht) || '' } : null });
    }
    const kinnitused = (await this.loend('kinnita:')).filter(([v]) => !kasutajad.get(v.split(':')[1])?.kustutatud).map(([v, x]) => ({ ...x, kasutaja: kasutajad.get(v.split(':')[1])?.nimi || '?', kasutaja_id: v.split(':')[1] }));
    const vaidlused = (await this.loend('vaidlus:')).map(([v, x]) => ({ ...x, voti: v })).filter((x) => !x.lahendatud);
    const margmed = [];
    for (const [v, m] of await this.loend('marge:')) if (!m.lahendatud) margmed.push({ ...m, voti: v, kood: v.split(':')[1] });
    const kas = [...kasutajad.values()].map(({ rasi, lahtestus, ...k }) => ({ ...k, seadmeid: [...laenud.values()].filter((l) => l.kasutaja === k.id).length, kinnitamata: kinnitused.filter((x) => x.kasutaja_id === k.id).length }));
    return { ok: true, seaded, foto_olemas: !!this.env.FOTOD, kohad, seadmed, kasutajad: kas, kinnitused, vaidlused, margmed };
  }

  async adminSeade(b) {
    const uus = !b.kood;
    const kood = uus ? normKood(b.uus_kood || '') || null : normKood(b.kood);
    if (!uus && !kood) return viga('vigane kood');
    let s = kood ? await this.s.get(`seade:${kood}`) : null;
    if (!uus && !s) return viga('Seadet ei leitud', 404);
    if (uus && s) return viga('Selle koodiga seade on juba olemas.', 409);
    if (uus && kood && await this.s.get(`koht:${kood}`)) return viga('See kood on töökoha kood.', 409);
    if (uus && b.uus_kood && !kood) return viga('Vigane kood (12 märki, 0-9 A-Z ilma I L O U).');
    const nimi = puhasta(b.nimi, 80);
    if (nimi.length < 2) return viga('Sisesta seadme nimi.');
    const olek = ['aktiivne', 'remondis', 'maha'].includes(b.olek) ? b.olek : 'aktiivne';
    const taatlus = b.taatlus_kuni ? kuupaev(b.taatlus_kuni) : null;
    if (b.taatlus_kuni && !taatlus) return viga('Vigane taatluse kuupäev (AAAA-KK-PP).');
    const koduladu = normKood(b.asukoht || '');
    const ladu = koduladu ? await this.elus(`koht:${koduladu}`) : null;
    // Inventarinumber: uuel seadmel automaatne <lao lühend>-<AAKK><jrk 001…> (nt L1-2611001), kui haldur ei sisesta olemasolevat
    let invnr = puhasta(b.invnr, 40);
    if (uus && !invnr) {
      if (!ladu) return viga('Vali ladu, kus seade registreeritakse (inventarinumbri jaoks).');
      if (!ladu.lyhend) { // enne lühendite lisamist loodud ladu: anna järgmine vaba L<n>
        const teised = (await this.loend('koht:')).map(([, x]) => x.lyhend).filter(Boolean);
        let n = 1; while (teised.includes(`L${n}`)) n++;
        ladu.lyhend = `L${n}`; await this.s.put(`koht:${koduladu}`, ladu);
      }
      const lyh = ladu.lyhend;
      const aakk = tana(Date.now()).slice(2, 7).replace('-', '');
      const lv = `invnr:${lyh}:${aakk}`;
      const n = ((await this.s.get(lv)) || 0) + 1;
      await this.s.put(lv, n);
      invnr = `${lyh}-${aakk}${String(n).padStart(3, '0')}`;
    }
    let k = kood;
    if (uus && !k) do k = juhuslik(12); while (await this.s.get(`seade:${k}`) || await this.s.get(`koht:${k}`));
    const kirje = {
      ...(s || { loodud: Date.now() }), kood: k, nimi, tyyp: puhasta(b.tyyp, 60), invnr, seerianr: puhasta(b.seerianr, 60),
      taatlus_kuni: taatlus, olek, lisainfo: puhastaMitmerealine(b.lisainfo, 500), koduladu: ladu ? koduladu : null, muudetud: Date.now(),
    };
    if (uus) kirje.reg_ladu = ladu ? koduladu : null;
    await this.s.put(`seade:${k}`, kirje);
    await this.logi({ tyyp: uus ? 'seade_lisatud' : 'seade_muudetud', kood: k, nimi: 'haldur', seade: nimi });
    return json({ ok: true, seade: kirje });
  }

  // ---------- kustutamine (taastatav 30 päeva) ----------
  async adminKustuta({ liik, id }) {
    const prefix = LIIGID[liik];
    if (!prefix || typeof id !== 'string' || id.length > 20) return viga('vigane päring');
    const voti = prefix + id;
    const x = await this.s.get(voti);
    if (!x) return viga('Ei leitud', 404);
    if (x.kustutatud) return json({ ok: true });
    if (liik === 'seade' && await this.s.get(`laen:${id}`)) return viga('Seade on kasutaja nimel. Registreeri enne tagastus.', 409);
    if (liik === 'kasutaja') {
      const n = (await this.minuLaenud(id)).length;
      if (n) return viga(`Kasutaja nimel on ${n} seadet. Registreeri enne tagastus.`, 409);
    }
    if (liik === 'koht') {
      const n = (await this.elusLoend('seade:')).filter(([, s]) => s.koduladu === id).length;
      if (n) return viga(`Selles laos on ${n} seadet (koduladu). Muuda nende ladu või kustuta seadmed enne.`, 409);
    }
    const nyyd = Date.now();
    x.kustutatud = nyyd;
    await this.s.put(voti, x);
    if (liik === 'kasutaja') for (const [v, ss] of await this.loend('sess:')) if (ss.kasutaja === id) await this.s.delete(v);
    await this.logi({ tyyp: 'kustutatud', liik, objekt: id, nimi: 'haldur', tekst: x.nimi, kood: liik === 'seade' ? id : undefined });
    await this.seaAlarm(nyyd + KUSTUTUS_MS);
    return json({ ok: true, lopp: nyyd + KUSTUTUS_MS });
  }
  async adminTaasta({ liik, id }) {
    const prefix = LIIGID[liik];
    if (!prefix || typeof id !== 'string' || id.length > 20) return viga('vigane päring');
    const x = await this.s.get(prefix + id);
    if (!x) return viga('Ei leitud (juba lõplikult kustutatud).', 404);
    if (!x.kustutatud) return json({ ok: true });
    if (Date.now() - x.kustutatud >= KUSTUTUS_MS) return viga('Taastamise aeg (30 päeva) on läbi.', 410);
    delete x.kustutatud;
    await this.s.put(prefix + id, x);
    await this.logi({ tyyp: 'taastatud', liik, objekt: id, nimi: 'haldur', tekst: x.nimi, kood: liik === 'seade' ? id : undefined });
    return json({ ok: true });
  }
  async seaAlarm(aeg) {
    if (!this.s.setAlarm) return;
    const praegu = await this.s.getAlarm();
    if (!praegu || praegu > aeg) await this.s.setAlarm(aeg);
  }
  // Lõplik kustutamine: kirje ja temaga seotud andmed (seadmel märkused ja ajalugu; kasutajal telefoni indeks ja kinnitused).
  // Üldine sündmuste logi jääb alles (tõend). Käivitub Durable Objecti alarmiga ja halduse ülevaate avamisel.
  async lopetaKustutamine(nyyd = Date.now()) {
    let jargmine = null;
    for (const [liik, prefix] of Object.entries(LIIGID)) {
      for (const [v, x] of await this.loend(prefix)) {
        if (!x.kustutatud) continue;
        if (nyyd - x.kustutatud < KUSTUTUS_MS) { const t = x.kustutatud + KUSTUTUS_MS; if (!jargmine || t < jargmine) jargmine = t; continue; }
        await this.s.delete(v);
        if (liik === 'seade') for (const p of [`marge:${x.kood}:`, `ajalugu:${x.kood}:`]) for (const [k2] of await this.loend(p)) await this.s.delete(k2);
        if (liik === 'kasutaja') {
          if (x.tel && (await this.s.get(`tel:${x.tel}`)) === x.id) await this.s.delete(`tel:${x.tel}`);
          for (const [k2] of await this.kinnitamata(x.id)) await this.s.delete(k2);
        }
        await this.logi({ tyyp: 'lopp_kustutatud', liik, objekt: v.slice(prefix.length), nimi: 'süsteem', tekst: x.nimi });
      }
    }
    if (jargmine) await this.seaAlarm(jargmine);
  }
  async alarm() { await this.lopetaKustutamine(); }

  async adminKoht(b) {
    const uus = !b.kood;
    let kood = uus ? null : normKood(b.kood);
    if (!uus && !(kood && await this.s.get(`koht:${kood}`))) return viga('Töökohta ei leitud', 404);
    const nimi = puhasta(b.nimi, 80);
    if (nimi.length < 2) return viga('Sisesta töökoha nimi.');
    if (uus) do kood = juhuslik(12); while (await this.s.get(`koht:${kood}`) || await this.s.get(`seade:${kood}`));
    const reg = ['vaba', 'kinnitamisega'].includes(b.registreerimine) ? b.registreerimine : null;
    const vana = (await this.s.get(`koht:${kood}`)) || { loodud: Date.now() };
    const teised = (await this.loend('koht:')).map(([, x]) => x).filter((x) => x.kood !== kood);
    let lyhend = typeof b.lyhend === 'string' ? b.lyhend.trim().toUpperCase() : '';
    if (lyhend && !/^[A-Z0-9]{1,6}$/.test(lyhend)) return viga('Lühend: 1–6 tähte/numbrit (nt L1).');
    if (!lyhend) lyhend = vana.lyhend || '';
    if (!lyhend) { let n = teised.length + 1; while (teised.some((x) => x.lyhend === `L${n}`)) n++; lyhend = `L${n}`; }
    if (teised.some((x) => x.lyhend === lyhend)) return viga(`Lühend ${lyhend} on juba kasutusel.`, 409);
    const kirje = { ...vana, kood, nimi, registreerimine: reg, lyhend };
    await this.s.put(`koht:${kood}`, kirje);
    return json({ ok: true, koht: kirje });
  }

  async adminKasutaja({ id, olek, super: superK }) {
    const k = typeof id === 'string' && ID_RE.test(id) ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k) return viga('Kasutajat ei leitud', 404);
    if (olek === undefined && typeof superK === 'boolean') {
      k.super = superK;
      await this.s.put(`kasutaja:${id}`, k);
      await this.logi({ tyyp: superK ? 'super_antud' : 'super_eemaldatud', kasutaja: id, nimi: k.nimi });
      return json({ ok: true });
    }
    if (!['aktiivne', 'blokeeritud'].includes(olek)) return viga('vigane olek');
    k.olek = olek;
    await this.s.put(`kasutaja:${id}`, k);
    if (olek === 'blokeeritud') for (const [v, s] of await this.loend('sess:')) if (s.kasutaja === id) await this.s.delete(v);
    await this.logi({ tyyp: olek === 'aktiivne' ? 'kasutaja_kinnitatud' : 'kasutaja_peatatud', kasutaja: id, nimi: k.nimi });
    return json({ ok: true });
  }

  async adminLahtesta({ id }) {
    const k = typeof id === 'string' && ID_RE.test(id) ? await this.s.get(`kasutaja:${id}`) : null;
    if (!k) return viga('Kasutajat ei leitud', 404);
    const kood = juhuslik(8);
    k.lahtestus = { rasi: await sha256hex(kood), aegub: Date.now() + LAHTESTUS_MS };
    await this.s.put(`kasutaja:${id}`, k);
    await this.logi({ tyyp: 'taastuskood', kasutaja: id, nimi: k.nimi });
    return json({ ok: true, kood, kehtib: '24 h' });
  }

  async adminKinnitusedEemalda({ id }) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return viga('vigane id');
    const l = await this.kinnitamata(id);
    for (const [v] of l) await this.s.delete(v);
    await this.logi({ tyyp: 'keeld_eemaldatud', kasutaja: id, nimi: 'haldur', arv: l.length });
    return json({ ok: true, eemaldatud: l.length });
  }

  async adminTagasta({ kood }) {
    const kk = normKood(kood);
    const laen = kk ? await this.s.get(`laen:${kk}`) : null;
    if (!laen) return viga('Seade ei ole kellegi nimel.');
    await this.s.delete(`laen:${kk}`);
    await this.logi({ tyyp: 'tagastus_halduri_poolt', kood: kk, kasutaja: laen.kasutaja, nimi: 'haldur' });
    return json({ ok: true });
  }

  async adminLahenda(prefix, { voti, otsus }) {
    if (typeof voti !== 'string' || !voti.startsWith(prefix) || voti.length > 80) return viga('vigane võti');
    const x = await this.s.get(voti);
    if (!x) return viga('Ei leitud', 404);
    x.lahendatud = true; x.lahendatud_aeg = Date.now(); x.otsus = puhastaMitmerealine(otsus, 500);
    await this.s.put(voti, x);
    await this.logi({ tyyp: prefix === 'marge:' ? 'marge_lahendatud' : 'vaidlus_lahendatud', kood: x.kood || voti.split(':')[1], nimi: 'haldur', tekst: x.otsus });
    return json({ ok: true });
  }

  async adminSeaded(b) {
    const s = await this.seaded();
    if (b.firma !== undefined) { const f = puhasta(b.firma, 80); if (f) s.firma = f; }
    if (b.telefon !== undefined) { if (b.telefon === '') s.telefon = ''; else { const t = normTel(b.telefon); if (!t) return viga('Vigane telefon'); s.telefon = t; } }
    if (b.max_seadmeid !== undefined) { const n = Number(b.max_seadmeid); if (!Number.isInteger(n) || n < 1 || n > 200) return viga('max_seadmeid 1–200'); s.max_seadmeid = n; }
    if (b.registreerimine !== undefined) { if (!['vaba', 'kinnitamisega'].includes(b.registreerimine)) return viga('vigane registreerimine'); s.registreerimine = b.registreerimine; }
    if (b.taatlus_blokeerib !== undefined) s.taatlus_blokeerib = !!b.taatlus_blokeerib;
    if (b.foto !== undefined) { if (!['ei', 'valikuline', 'kohustuslik'].includes(b.foto)) return viga('vigane foto valik'); s.foto = b.foto; }
    for (const v of ['hoiata_paevi', 'taatlus_hoiatus_paevi']) if (b[v] !== undefined) { const n = Number(b[v]); if (!Number.isInteger(n) || n < 0 || n > 365) return viga(`${v} 0–365`); s[v] = n; }
    await this.s.put('seaded', s);
    return json({ ok: true, seaded: s });
  }

  async seadmedCsv() {
    const u = await this.ulevaade();
    const read = [['kood', 'nimi', 'tüüp', 'inventarinr', 'seerianr', 'taatlus_kuni', 'olek', 'asukoht', 'kellel', 'telefon', 'alates'].join(';')];
    for (const s of u.seadmed) read.push([s.kood, s.nimi, s.tyyp, s.invnr, s.seerianr, s.taatlus_kuni, s.olek, s.asukoht_nimi, s.kellel?.nimi, s.kellel?.tel, s.kellel ? eestiAeg(s.kellel.alates) : ''].map(csvLahter).join(';'));
    return new Response('﻿' + read.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="seadmed.csv"', 'Cache-Control': 'no-store' } });
  }
  async logiCsv() {
    const l = await this.logiLoe(null, 5000);
    const read = [['aeg', 'sündmus', 'kood', 'kes', 'eelmine', 'märkus'].join(';')];
    for (const x of l) read.push([eestiAeg(x.aeg), x.tyyp, x.kood, x.nimi, x.eelmise_nimi || x.uus, x.tekst || x.marge].map(csvLahter).join(';'));
    return new Response('﻿' + read.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="logi.csv"', 'Cache-Control': 'no-store' } });
  }
}

async function loeJson(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 32 * 1024) return null;
  try {
    const t = await request.text();
    if (t.length > 32 * 1024) return null;
    const o = JSON.parse(t || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}
