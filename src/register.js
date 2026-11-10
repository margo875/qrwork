// Register: üks Durable Object kogu firma jaoks. Kõik andmed ja reeglid on siin, et seadme võtmine ja tagastamine
// oleks järjepidev (üks eksemplar, päringud järjest; kahe inimese samaaegne võtmine ei saa mõlemale õnnestuda).
//
// Võtmed (DO storage):
//   seade:<kood>                 registrikirje (muudab ainult haldur); ostuandmed ja dokumendid (seade.dokumendid) näeb ainult haldur
//   dok:<R2 võti>                üles laaditud, seadmega veel sidumata dokument (seotakse seadme salvestamisel)
//   ai:<AAAA-KK-PP>              pildilugemiste arv sel päeval (kulude piir)
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
import { AI_MUDEL, AI_PAEVAS, AI_PILT_MAX, AI_JUHIS, DOK_MAX, DOK_ARV_MAX, DOK_LIIGID, DOK_RE, DOK_MIME, dokTyyp, aiJson, dokValjad, hindArvuks } from './dokumendid.js';
import { teavita } from './teavita.js';

export const TAHED = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32, ilma I L O U
export const KOOD_RE = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const ID_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const TS_MAX = 9999999999999;
const SESS_MS = 180 * 24 * 3600 * 1000;
const LAHTESTUS_MS = 24 * 3600 * 1000;
const PARTII_MAX = 30;
const PARTII_KOODE = 200;           // eeltrükitud koode ühes partiis              // seadmeid ühes võtmises/tagastuses
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
export const kuupaev = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v ? v : null); // olematu kuupäev (2026-02-30) ei sobi
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
const VEALOGI_MAX = 500, VEALOGI_AEG = 30 * 86400000;
// Brauseri tunnus ainult üldkujul (brauser + OS), et vealogi ei aitaks kasutajat tuvastada
export function lyhikeUa(ua) {
  ua = String(ua || '');
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'muu';
  const b = /Edg\/(\d+)/.exec(ua) || /SamsungBrowser\/(\d+)/.exec(ua) || /(?:Chrome|CriOS)\/(\d+)/.exec(ua) || /(?:Firefox|FxiOS)\/(\d+)/.exec(ua) || /Version\/(\d+).*Safari/.exec(ua);
  const nimi = !b ? 'muu' : /Edg/.test(b[0]) ? 'Edge' : /Samsung/.test(b[0]) ? 'Samsung' : /Chrome|CriOS/.test(b[0]) ? 'Chrome' : /Firefox|FxiOS/.test(b[0]) ? 'Firefox' : 'Safari';
  return `${nimi}${b ? ' ' + b[1] : ''} / ${os}`;
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
export function votmiseKontroll({ kasutaja, seade, laen, seaded, kinnitamata = 0, minuArv = 0, nyyd = Date.now(), bron = [] }) {
  if (!seade) return { lubatud: false, pohjus: 'Tundmatu seade. Pöördu administraatori poole.' };
  if (kasutaja.olek === 'ootel') return { lubatud: false, pohjus: 'Sinu konto ootab administraatori kinnitust.' };
  if (kasutaja.olek !== 'aktiivne') return { lubatud: false, pohjus: 'Sinu konto on peatatud. Pöördu administraatori poole.' };
  if (laen && laen.kasutaja === kasutaja.id) return { lubatud: false, juba: true, pohjus: 'Seade on juba sinu nimel.' };
  if (kinnitamata > 0) return { lubatud: false, pohjus: 'Enne uue seadme võtmist vasta ülevõtu teatele (keegi võttis üle või tagastas seadme, mis oli sinu nimel).' };
  if (seade.olek === 'remondis') return { lubatud: false, pohjus: 'Seade on remondis/hoolduses. Pöördu administraatori poole.' };
  if (seade.olek === 'maha') return { lubatud: false, pohjus: 'Seade on maha kantud.' };
  if (seade.olek === 'taatlusel') return { lubatud: false, pohjus: 'Seade on taatlusel/kalibreerimisel.' };
  if (seade.taatlus_kuni && seaded.taatlus_blokeerib && seade.taatlus_kuni < tana(nyyd))
    return { lubatud: false, pohjus: `Taatlus/kalibreerimine aegus ${seade.taatlus_kuni}. Pöördu administraatori poole.` };
  if (minuArv >= seaded.max_seadmeid) return { lubatud: false, pohjus: `Sinu nimel võib korraga olla kuni ${seaded.max_seadmeid} seadet.` };
  // Broneering: täna teise inimese broneeritud seadet võtta ei saa (helista broneerijale, tema saab broneeringu tühistada)
  const t = tana(nyyd);
  const teise = bron.find((b) => b.kasutaja !== kasutaja.id && b.algus <= t && b.lopp >= t);
  if (teise) return { lubatud: false, bron: teise, pohjus: `Seade on broneeritud: ${teise.nimi || '?'} ${teise.algus} – ${teise.lopp}${teise.tel ? ` (${teise.tel})` : ''}.` };
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
  // Seadme kehtivad broneeringud (lõpp ≥ täna), nimede ja telefonidega
  async broneeringud(kood, nyyd = Date.now()) {
    const t = tana(nyyd);
    const l = [];
    for (const [v, b] of await this.loend(`bron:${kood}:`)) {
      if (b.lopp < t) continue;
      const k = await this.elus(`kasutaja:${b.kasutaja}`);
      if (!k) continue; // kustutatud kasutaja broneering ei kehti
      l.push({ ...b, voti: v, nimi: k.nimi, tel: k.tel });
    }
    return l.sort((a, b) => (a.algus < b.algus ? -1 : 1));
  }
  async minuLaenud(id) {
    return (await this.loend('laen:')).map(([, l]) => l).filter((l) => l.kasutaja === id);
  }
  iter() { const n = Number(this.env.PBKDF2_ITER); return Number.isInteger(n) && n >= 10000 && n <= 100000 ? n : 100000; }
  teavitaTaustal(tekst, gps, foto) {
    const p = teavita(this.env, tekst, gps, foto).catch(() => {});
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
      if (tee.startsWith('/api/dev/')) return await this.dev(request, tee.slice(9));
      const ics = /^\/api\/kalender\/([0-9A-Z]{32})\.ics$/.exec(tee);
      if (ics && request.method === 'GET') return await this.kalender(ics[1]);
      if (request.method !== 'POST') return viga('meetod', 405);
      // Leidja sendBeacon-päringud (asukoht lehelt lahkumisel, „Helista“): sendBeacon ei saa päist lisada. Kaitse on skännitoken
      // kehas (HMAC, 1 h), küpsist ei kasutata, seega CSRF-i ohtu pole.
      if (tee === '/api/asukoht' || tee === '/api/helista') {
        const k = await loeJson(request);
        if (k === null) return viga('vigane päring', 413);
        return tee === '/api/asukoht' ? await this.asukoht(request, k) : await this.helista(request, k);
      }
      // CSRF: ainult JSON ja oma päis (teine sait ei saa neid ilma CORS-eelkontrollita saata)
      if (request.headers.get('X-QW') !== '1') return viga('päis puudub', 403);
      if (tee === '/api/foto') return await this.fotoUles(request);
      if (tee === '/api/leid' && /^multipart\/form-data/i.test(request.headers.get('Content-Type') || '')) return await this.leid(request, null);
      const keha = await loeJson(request);
      if (keha === null) return viga('vigane päring', 413);
      const ip = request.headers.get('X-IP-Rasi') || '';
      switch (tee) {
        case '/api/alusta': return await this.alusta(request, keha);
        case '/api/registreeru': return await this.registreeru(keha, ip);
        case '/api/logi-sisse': return await this.logiSisse(keha, ip);
        case '/api/parool': return await this.parooliTaastus(keha, ip);
        case '/api/avalik': return await this.avalik(request, keha);
        case '/api/leid': return await this.leid(request, keha);
        case '/api/viga': return await this.kliendiViga(keha, ip);
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
        case '/api/broneeri': return await this.broneeri(k, keha);
        case '/api/bron-tyhista': return await this.bronTyhista(k, keha);
      }
      return viga('tundmatu tee', 404);
    } catch (e) {
      console.error('qrwork viga', e && e.stack || e);
      try { if (!this.piiratud('vigaserver', 100, 3600000)) { this.viga('vigaserver'); await this.veaLogi({ liik: 'server', teade: String(e && e.message || e), stack: String(e && e.stack || ''), leht: tee.replace(/^\/api\/kalender\/.*/, '/api/kalender/…') }); } } catch (e2) { /* logi ei tohi päringut murda */ }
      return viga('serveri viga', 500);
    }
  }

  // ---------- tehniline vealogi (ainult arendajale) ----------
  // viga:<inv(aeg)>:<r>  {aeg, liik, teade, stack, leht, fail, rida, veerg, v, id, ua}; säilib 30 päeva, kuni 500 kirjet.
  // Kasutaja id-d, nime, telefoni ega IP-d ei salvestata.
  async veaLogi(o, nyyd = Date.now()) {
    const t = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, n);
    const k = {
      aeg: nyyd, liik: o.liik === 'server' ? 'server' : 'klient', teade: t(o.teade, 500), stack: t(o.stack, 2000),
      leht: t(String(o.leht || '').split(/[?#]/)[0], 100), fail: t(String(o.fail || '').split(/[?#]/)[0], 200),
      rida: Number(o.rida) | 0, veerg: Number(o.veerg) | 0, v: t(o.v, 20), id: t(o.id, 20), ua: lyhikeUa(o.ua),
    };
    await this.s.put(`viga:${inv(nyyd)}:${juhuslik(4)}`, k);
    // Koristus iga 20. kirje järel (mitte igal kirjutamisel)
    this.vigaKirjeid = (this.vigaKirjeid || 0) + 1;
    if (this.vigaKirjeid % 20 !== 1) return;
    const vead = await this.loend('viga:');
    for (const [i, [voti, x]] of vead.entries()) if (i >= VEALOGI_MAX || nyyd - (x?.aeg || 0) > VEALOGI_AEG) await this.s.delete(voti);
  }
  async kliendiViga(keha, ip) {
    // Piir: 20 kirjet tunnis IP kohta, 200 tunnis kokku (logi ei saa üle ujutada)
    if (this.piiratud(`vigaip:${ip}`, 20, 3600000) || this.piiratud('vigakokku', 200, 3600000)) return json({ ok: true });
    this.viga(`vigaip:${ip}`); this.viga('vigakokku');
    if (!keha.teade) return json({ ok: true });
    await this.veaLogi({ ...keha, liik: 'klient' });
    return json({ ok: true });
  }
  async dev(request, tee) {
    const ip = request.headers.get('X-IP-Rasi') || '';
    if (this.piiratud(`dev:${ip}`, 10)) return viga('Liiga palju vigaseid katseid.', 429);
    const tok = this.env.DEV_TOKEN;
    const auth = request.headers.get('Authorization') || '';
    if (!tok || tok.length < 16 || tok === this.env.ADMIN_TOKEN || !vordle(auth, `Bearer ${tok}`)) { this.viga(`dev:${ip}`); return viga('Vale arendaja võti.', 401); }
    if (request.method === 'GET' && tee === 'vead') {
      const nyyd = Date.now();
      const vead = (await this.loend('viga:')).map(([, x]) => x).filter((x) => nyyd - x.aeg <= VEALOGI_AEG).map((x) => ({ ...x, aeg_tekst: eestiAeg(x.aeg) }));
      return json({ ok: true, vead });
    }
    if (request.method === 'POST' && tee === 'tyhjenda') {
      for (const [voti] of await this.loend('viga:')) await this.s.delete(voti);
      return json({ ok: true });
    }
    return viga('tundmatu', 404);
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
    for (const h of seade.hooldused || []) {
      const t = tana(nyyd);
      if (h.jargmine < t) hoiatused.push(`Hooldus üle tähtaja: ${h.nimi} (${h.jargmine})`);
      else if (Date.parse(h.jargmine) - Date.parse(t) <= h.hoiatus_paevi * 86400000) hoiatused.push(`Hooldus tulekul: ${h.nimi} (${h.jargmine})`);
    }
    for (const m of margmed) if (m.tyyp !== 'muu') hoiatused.push(`${MARKE_TYYBID[m.tyyp]} (${m.nimi}, ${eestiAeg(m.aeg)})`);
    const bron = await this.broneeringud(seade.kood, nyyd);
    const taatlusViimane = (await this.loend(`taatlus:${seade.kood}:`, 1)).map(([, x]) => x)[0] || null;
    const taatlus = { kuni: seade.taatlus_kuni || null, intervall: seade.taatlus_intervall || null, tegija: taatlusViimane?.tegija || seade.taatlus_tegija || '', tunnistus: taatlusViimane?.tunnistus || '', viimati: taatlusViimane?.kuupaev || null };
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
        margmed: [], hoiatused: hoiatused.filter((h) => h.startsWith('Taatlus')), taatlus, bron: bron.map((b) => ({ algus: b.algus, lopp: b.lopp, nimi: 'broneeritud' })) };
    }
    const ajalugu = (await this.loend(`ajalugu:${seade.kood}:`, 100)).map(([, x]) => x).filter((x) => AJALUGU_TYYBID.has(x.tyyp)).slice(0, 15)
      .map((x) => ({ aeg: x.aeg, tyyp: x.tyyp, nimi: x.nimi, eelmise_nimi: x.eelmise_nimi || x.uus || '', marge: x.marge || '', foto: !!x.foto }));
    return {
      ajalugu,
      kood: seade.kood, nimi: seade.nimi, tyyp: seade.tyyp || '', invnr: seade.invnr || '', seerianr: seade.seerianr || '', tootja: seade.tootja || '', mudel: seade.mudel || '',
      hooldused: (seade.hooldused || []).map((h) => ({ nimi: h.nimi, jargmine: h.jargmine, viimati: h.viimati })),
      taatlus_kuni: seade.taatlus_kuni || null, olek: seade.olek, lisainfo: seade.lisainfo || '', asukoht, kellel, margmed, hoiatused, taatlus,
      bron: bron.map((b) => ({ id: b.id, algus: b.algus, lopp: b.lopp, nimi: b.nimi, tel: b.tel, kasutaja: b.kasutaja, markus: b.markus || '' })),
    };
  }

  async mina(k) {
    const laenud = await this.minuLaenud(k.id);
    const seaded = await this.seaded();
    const seadmed = [];
    for (const l of laenud.sort((a, b) => a.alates - b.alates)) {
      const s = await this.elus(`seade:${l.kood}`);
      // Kui keegi teine on selle seadme lähiajaks (≤ 3 päeva) broneerinud, näeb hoidja hoiatust
      const t3 = tana(Date.now() + 3 * 86400000);
      const b = (await this.broneeringud(l.kood)).find((x) => x.kasutaja !== k.id && x.algus <= t3);
      seadmed.push({ kood: l.kood, nimi: s?.nimi || '?', invnr: s?.invnr || '', alates: l.alates, bron: b ? { nimi: b.nimi, tel: b.tel, algus: b.algus, lopp: b.lopp } : null });
    }
    const t0 = tana(Date.now());
    const minuBron = [];
    for (const [v, b] of await this.loend('bron:')) {
      if (b.kasutaja !== k.id || b.lopp < t0) continue;
      const s = await this.elus(`seade:${b.kood}`);
      if (s) minuBron.push({ id: b.id, kood: b.kood, nimi: s.nimi, invnr: s.invnr || '', algus: b.algus, lopp: b.lopp });
    }
    minuBron.sort((a, b) => (a.algus < b.algus ? -1 : 1));
    const kinnitamata = (await this.kinnitamata(k.id)).map(([v, x]) => ({ ...x, id: v.split(':').slice(2).join(':') }));
    return { kasutaja: { id: k.id, nimi: k.nimi, tel: k.tel, olek: k.olek, super: !!k.super }, seadmed, kinnitamata, broneeringud: minuBron, max_seadmeid: seaded.max_seadmeid, firma: seaded.firma, foto: this.fotoReziim(seaded) };
  }

  async seadmeInfo(k, { kood }) {
    const kk = normKood(kood);
    const seade = kk ? await this.elus(`seade:${kk}`) : null;
    if (!seade) return viga('Tundmatu QR-kood. Pöördu administraatori poole.', 404, { tundmatu: true });
    const laen = await this.s.get(`laen:${kk}`);
    const seaded = await this.seaded();
    const kontroll = votmiseKontroll({ kasutaja: k, seade, laen, seaded, kinnitamata: (await this.kinnitamata(k.id)).length, minuArv: (await this.minuLaenud(k.id)).length, bron: await this.broneeringud(kk) });
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
      const r = votmiseKontroll({ kasutaja: k, seade, laen, seaded, kinnitamata, minuArv, nyyd, bron: seade ? await this.broneeringud(kood, nyyd) : [] });
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

  // ---------- kalender (Outlook / Google tellib lingi): taatluse tähtajad ja broneeringud ----------
  async kalender(token) {
    const seaded = await this.seaded();
    if (!seaded.kalender_token || !vordle(token, seaded.kalender_token)) return new Response('Ei leitud', { status: 404 });
    const e = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => '\\' + m).replace(/\r?\n/g, '\\n');
    const pv = (d) => d.replace(/-/g, '');
    const jargmine = (d) => new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const tl = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Krativara//ET', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${e(seaded.firma)} – Krativara`, 'X-WR-TIMEZONE:Europe/Tallinn'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    for (const [, s] of await this.elusLoend('seade:')) {
      if (s.olek === 'maha' || !s.taatlus_kuni) continue;
      // UID-id jäävad „@kratt“ (püsivad, et tellitud kalendrites ei tekiks topeltsündmusi)
      tl.push('BEGIN:VEVENT', `UID:taatlus-${s.kood}-${pv(s.taatlus_kuni)}@kratt`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${pv(s.taatlus_kuni)}`, `DTEND;VALUE=DATE:${jargmine(s.taatlus_kuni)}`,
        `SUMMARY:${e(`Taatlus: ${s.nimi}${s.invnr ? ` (${s.invnr})` : ''}`)}`, `DESCRIPTION:${e(`Taatlus/kalibreerimine kehtib kuni ${s.taatlus_kuni}.`)}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(`Taatlus aegub: ${s.nimi}`)}`, `TRIGGER:-P${seaded.taatlus_hoiatus_paevi || 30}D`, 'END:VALARM', 'END:VEVENT');
    }
    for (const [, s] of await this.elusLoend('seade:')) {
      if (s.olek === 'maha') continue;
      for (const h of s.hooldused || []) {
        tl.push('BEGIN:VEVENT', `UID:hooldus-${s.kood}-${h.id}-${pv(h.jargmine)}@kratt`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${pv(h.jargmine)}`, `DTEND;VALUE=DATE:${jargmine(h.jargmine)}`,
          `SUMMARY:${e(`Hooldus: ${h.nimi} – ${s.nimi}${s.invnr ? ` (${s.invnr})` : ''}`)}`, `DESCRIPTION:${e(`Kordub iga ${h.intervall} kuu järel.${h.viimati ? ` Viimati ${h.viimati}.` : ''}`)}`,
          'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(`Hooldus: ${h.nimi} – ${s.nimi}`)}`, `TRIGGER:-P${h.hoiatus_paevi}D`, 'END:VALARM', 'END:VEVENT');
      }
    }
    const t = tana(Date.now());
    for (const [, b] of await this.loend('bron:')) {
      if (b.lopp < t) continue;
      const s = await this.elus(`seade:${b.kood}`); if (!s) continue;
      const k = await this.s.get(`kasutaja:${b.kasutaja}`);
      tl.push('BEGIN:VEVENT', `UID:bron-${b.id}@kratt`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${pv(b.algus)}`, `DTEND;VALUE=DATE:${jargmine(b.lopp)}`,
        `SUMMARY:${e(`Broneering: ${s.nimi} – ${k?.nimi || '?'}`)}`, `DESCRIPTION:${e(b.markus || '')}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    tl.push('END:VCALENDAR');
    return new Response(tl.map((r) => (r.length > 60 ? r.match(/.{1,60}/gu).join('\r\n ') : r)).join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  // ---------- broneerimine ----------
  // Kuupäevad AAAA-KK-PP (kaasa arvatud). Algus täna…+180 p, kestus ≤ 60 p, ei kattu teiste broneeringutega.
  async broneeri(k, { kood, algus, lopp, markus }) {
    const kk = normKood(kood);
    const seade = kk ? await this.elus(`seade:${kk}`) : null;
    if (!seade) return viga('Tundmatu seade.', 404);
    if (seade.olek === 'maha') return viga('Seade on maha kantud.');
    const a = kuupaev(algus), l = kuupaev(lopp);
    if (!a || !l) return viga('Vali algus- ja lõppkuupäev.');
    const t = tana(Date.now());
    if (a < t) return viga('Algus ei saa olla minevikus.');
    if (l < a) return viga('Lõpp peab olema alguse järel.');
    if ((Date.parse(l) - Date.parse(a)) / 86400000 > 60) return viga('Broneering võib olla kuni 60 päeva.');
    if ((Date.parse(a) - Date.parse(t)) / 86400000 > 180) return viga('Broneerida saab kuni 180 päeva ette.');
    const olemas = await this.broneeringud(kk);
    const kattub = olemas.find((b) => b.algus <= l && b.lopp >= a);
    if (kattub) return viga(`Kattub broneeringuga: ${kattub.nimi} ${kattub.algus} – ${kattub.lopp}.`, 409);
    const minu = (await this.loend('bron:')).filter(([, b]) => b.kasutaja === k.id && b.lopp >= t).length;
    if (minu >= 20) return viga('Sul on juba 20 kehtivat broneeringut.');
    const id = juhuslik(8);
    const b = { id, kood: kk, kasutaja: k.id, algus: a, lopp: l, markus: puhasta(markus, 200), loodud: Date.now() };
    await this.s.put(`bron:${kk}:${a}:${id}`, b);
    await this.logi({ tyyp: 'broneering', kood: kk, kasutaja: k.id, nimi: k.nimi, tekst: `${a} – ${l}${b.markus ? ` (${b.markus})` : ''}` });
    return json({ ok: true, broneering: b, mina: await this.mina(k) });
  }
  async bronTyhista(k, { kood, id }, haldur = false) {
    const kk = normKood(kood);
    if (!kk || typeof id !== 'string' || !/^[0-9A-Z]{8}$/.test(id)) return viga('vigane broneering');
    const leitud = (await this.loend(`bron:${kk}:`)).find(([, b]) => b.id === id);
    if (!leitud) return viga('Broneeringut ei leitud.', 404);
    const [v, b] = leitud;
    if (!haldur && b.kasutaja !== k.id && !k.super) return viga('Saad tühistada ainult oma broneeringu.', 403);
    await this.s.delete(v);
    await this.logi({ tyyp: 'broneering_tyhistatud', kood: kk, kasutaja: haldur ? b.kasutaja : k.id, nimi: haldur ? 'haldur' : k.nimi, tekst: `${b.algus} – ${b.lopp}` });
    return haldur ? json({ ok: true }) : json({ ok: true, mina: await this.mina(k) });
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
      else if (s.olek === 'remondis' || s.olek === 'taatlusel') g.remondis.push({ ...rida, olek: s.olek });
      else g.vabad.push(rida);
    }
    const laod = kohad.map((x) => ({ kood: x.kood, nimi: x.nimi, lyhend: x.lyhend || '', ...seis.get(x.kood) }));
    if (maaramata.vabad.length + maaramata.valjas.length + maaramata.remondis.length) laod.push({ kood: '', nimi: 'Ladu määramata', lyhend: '', ...maaramata });
    return json({ ok: true, laod });
  }

  // ---------- avalik osa: leidja ----------
  // Voog (üle võetud leiamind'ist, Margo 02.11.2026): /api/avalik annab olekuta skännitokeni (1 h) ja saadab kohe teate „Silti skänniti“
  // (aeg, IP järgi umbkaudne koht, seade; botid välja, IP-d ei salvestata). Leht saadab parima GPS-lugemi automaatselt ühe korra
  // (/api/asukoht, 1 tokeni kohta), vormi /api/leid (tekst ≤ 400, kontakt ≤ 100, foto ainult Telegrami) ja „Helista“ vajutuse /api/helista.
  async leidSeade(kood) {
    const kk = normKood(kood);
    const s = kk ? await this.elus(`seade:${kk}`) : null;
    return s ? { kk, s } : null;
  }
  async avalik(request, { kood }) {
    const l = await this.leidSeade(kood);
    if (!l) {
      // Eeltrükitud (partii) kood, mis pole veel seadmega seotud: ei tokenit ega teadet
      const kk = normKood(kood);
      const pk = kk ? await this.s.get(`pkood:${kk}`) : null;
      if (pk && !pk.kasutatud && !(await this.s.get(`seade:${kk}`))) return viga('See kood ei ole veel kasutusel.', 404, { sidumata: true });
      return viga('Tundmatu kood.', 404);
    }
    const { kk, s } = l;
    const seaded = await this.seaded();
    const token = await looToken(this.env, kk);
    const ip = request.headers.get('X-IP-Rasi') || '';
    // Skännimisteade: 1 minutis IP + silt, 5 minutis IP, 3 minutis silt, 10 tunnis silt. Piiratud või bot: ei logi ega teavita.
    if (request.headers.get('X-Bot') !== '1' && !this.piiratud(`sk:${ip}:${kk}`, 1, 60000) && !this.piiratud(`skip:${ip}`, 5, 60000)
      && !this.piiratud(`sks:${kk}`, 3, 60000) && !this.piiratud(`skt:${kk}`, 10, 3600000)) {
      for (const v of [`sk:${ip}:${kk}`, `skip:${ip}`, `sks:${kk}`, `skt:${kk}`]) this.viga(v);
      const nyyd = Date.now(), koht = ipKoht(request), sd = seadmeTyyp(request);
      await this.logi({ tyyp: 'skann', leidkood: kk, ip_koht: koht, seade_ua: sd, aeg: nyyd });
      this.teavitaTaustal([`🔔 Silti skänniti: ${s.nimi} (${s.invnr || kk})`, `Aeg: ${eestiAeg(nyyd)}`, `Asukoht (IP järgi, umbkaudne): ${koht}`, `Seade: ${sd}`].join('\n'));
    }
    return json({ ok: true, firma: seaded.firma, nimi: s.nimi, invnr: s.invnr || '', telefon: leidjaTelefon(this.env, seaded), token });
  }
  // Ühine kontroll: kehtiv token → seade. Tagastab {kk, s} või veavastuse.
  async leidToken(token) {
    const kk = await kehtivToken(this.env, token);
    const l = kk ? await this.leidSeade(kk) : null;
    return l || { vastus: viga('aegunud', 403) };
  }
  // Leidja päringu väravad: 1) IP (IP + silt 3/min, IP 5/min) → 429 „oota minut“; 2) logi (50 ööpäevas sildi kohta) → 503 „täis“;
  // 3) teade (silt 3/min ja 10/h). Teate piiri ületanud sõnum jääb logisse ja leidjale öeldakse „salvestatud“.
  leidVaravad(ip, kk, eesliide = 'l') {
    if (this.piiratud(`${eesliide}ip:${ip}:${kk}`, eesliide === 'h' ? 1 : 3, 60000) || this.piiratud(`lip:${ip}`, 5, 60000)) return { ip: false };
    this.viga(`${eesliide}ip:${ip}:${kk}`); this.viga(`lip:${ip}`);
    const logi = !this.piiratud(`lp:${kk}`, PAEVA_MAX, 86400000);
    if (logi) this.viga(`lp:${kk}`);
    const teade = !this.piiratud(`${eesliide}m:${kk}`, 3, 60000) && !this.piiratud(`${eesliide}t:${kk}`, 10, 3600000);
    if (teade) { this.viga(`${eesliide}m:${kk}`); this.viga(`${eesliide}t:${kk}`); }
    return { ip: true, logi, teade };
  }
  async kellelRida(kk) {
    const laen = await this.s.get(`laen:${kk}`);
    const kellel = laen ? await this.s.get(`kasutaja:${laen.kasutaja}`) : null;
    return kellel ? `Registreeritud: ${kellel.nimi}, ${kellel.tel}` : 'Seade ei ole kellegi nimel.';
  }
  // Automaatne asukoht (leht saadab parima lugemi ühe korra, ka sendBeaconiga lahkumisel): 1 tokeni kohta.
  async asukoht(request, k) {
    const t = await this.leidToken(k.token);
    if (t.vastus) return t.vastus;
    const { kk, s } = t;
    if (!asukohtKehtib(k)) return viga('vigane asukoht');
    const av = `auto:${String(k.token).split('.')[2]}`;
    if (await this.s.get(av)) return viga('juba saadetud', 409);
    const v = this.leidVaravad(request.headers.get('X-IP-Rasi') || '', kk);
    if (!v.ip) return viga('oota minut', 429);
    if (!v.logi && !v.teade) return viga('tais', 503);
    const nyyd = Date.now();
    await this.s.put(av, { aegub: nyyd + SKANN_TTL * 1000 });
    await this.autoKoristus(nyyd);
    const tapsus = tapsusM(k.tapsus), pv = posVanus(k.pos_vanus), vt = vanusTekst(pv, nyyd);
    const gps = { lat: ymarda6(k.lat), lon: ymarda6(k.lon), tapsus };
    if (v.logi) await this.logi({ tyyp: 'leid_asukoht', leidkood: kk, gps, ...(vt ? { pos_vanus: pv } : {}), aeg: nyyd });
    if (v.teade) this.teavitaTaustal([`📍 ${tapsus ? `±${tapsus} m` : 'Asukoht'}: ${s.nimi} (${s.invnr || kk})`, `Aeg: ${eestiAeg(nyyd)}`, vt && `Asukoht ${vt}`,
      await this.kellelRida(kk), `Kaart: ${kaart(gps.lat, gps.lon)}`].filter(Boolean).join('\n'), gps);
    return json({ ok: true, salvestatud: v.logi, teavitatud: v.teade });
  }
  async autoKoristus(nyyd) {
    this.autoN = (this.autoN || 0) + 1;
    if (this.autoN % 20 !== 1) return;
    for (const [v, x] of await this.loend('auto:')) if (!x || x.aegub < nyyd) await this.s.delete(v);
  }
  // Vorm „Saada omanikule“: JSON või multipart (foto). Foto läheb ainult Telegrami (sendPhoto), serverisse seda ei salvestata.
  async leid(request, keha) {
    let k = keha, foto = null, eelIp = null;
    if (!k) {
      // multipart: Content-Length (kui on) ≤ piir, token päises ja IP värav ENNE keha lugemist; keha loetakse voona piiriga
      const clh = request.headers.get('Content-Length');
      if (clh !== null && !/^\d{1,12}$/.test(clh)) return viga('vigane päring');
      if (clh !== null && Number(clh) > LEID_KEHA_MAX) return viga('foto liiga suur', 413);
      const t0 = await this.leidToken(request.headers.get('X-Leid-Token'));
      if (t0.vastus) return t0.vastus;
      eelIp = this.leidVaravad(request.headers.get('X-IP-Rasi') || '', t0.kk);
      if (!eelIp.ip) return viga('oota minut', 429);
      const toor = await loeKeha(request, LEID_KEHA_MAX);
      if (!toor) return viga('foto liiga suur', 413);
      let fd;
      try { fd = await new Response(toor, { headers: { 'Content-Type': request.headers.get('Content-Type') } }).formData(); } catch { return viga('vigane päring'); }
      const tx = (n) => { const x = fd.get(n); return typeof x === 'string' ? x : undefined; };
      const arv = (n) => (tx(n) === undefined || tx(n).trim() === '' ? undefined : Number(tx(n)));
      k = { token: request.headers.get('X-Leid-Token'), lat: arv('lat'), lon: arv('lon'), tapsus: arv('tapsus'), pos_vanus: arv('pos_vanus'), tekst: tx('tekst'), kontakt: tx('kontakt'),
        puudub: tx('puudub'), auto_saadetud: tx('auto_saadetud'), foto_lat: arv('foto_lat'), foto_lon: arv('foto_lon'), foto_aeg: tx('foto_aeg') };
      const f = fd.get('foto');
      if (f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0) {
        if (f.size > LEID_FOTO_MAX) return viga('foto liiga suur', 413);
        const bytes = new Uint8Array(await f.arrayBuffer());
        const ty = fotoTyyp(bytes);
        if (!ty) return viga('foto tüüp', 415);
        foto = { bytes, laiend: ty, mime: ty === 'jpg' ? 'image/jpeg' : `image/${ty}` };
      }
    }
    const t = await this.leidToken(k.token);
    if (t.vastus) return t.vastus;
    const { kk, s } = t;
    const gps = (k.lat !== undefined && k.lat !== null) || (k.lon !== undefined && k.lon !== null);
    if (gps && !asukohtKehtib(k)) return viga('vigane asukoht');
    const fgAnti = (k.foto_lat !== undefined && k.foto_lat !== null) || (k.foto_lon !== undefined && k.foto_lon !== null);
    if (fgAnti && !asukohtKehtib({ lat: k.foto_lat, lon: k.foto_lon })) return viga('vigane asukoht');
    const fg = foto && fgAnti ? { lat: ymarda6(k.foto_lat), lon: ymarda6(k.foto_lon), aeg: FOTO_AEG_RE.test(k.foto_aeg || '') ? k.foto_aeg : null } : null;
    const tekst = leidjaTekst(k.tekst), kontakt = leidjaTekst(k.kontakt);
    if (tekst.length > TEKST_MAX) return viga(`Kirjeldus on liiga pikk: kuni ${TEKST_MAX} märki.`);
    if (kontakt.length > KONTAKT_MAX) return viga(`Kontakt on liiga pikk: kuni ${KONTAKT_MAX} märki.`);
    if (!gps && !tekst && !kontakt && !foto) return viga('tühi');
    const v = eelIp || this.leidVaravad(request.headers.get('X-IP-Rasi') || '', kk);
    if (!v.ip) return viga('oota minut', 429);
    if (!v.logi && !v.teade) return viga('tais', 503);
    const nyyd = Date.now();
    const tapsus = gps ? tapsusM(k.tapsus) : null, pv = gps ? posVanus(k.pos_vanus) : 0, vt = vanusTekst(pv, nyyd);
    const g = gps ? { lat: ymarda6(k.lat), lon: ymarda6(k.lon), tapsus } : null;
    const ipk = !gps && !fg ? ipKoht(request) : null; // IP-koht ainult täpse asukoha puudumisel, kaardilinki ega kaardipunkti sellest ei tehta
    if (v.logi) await this.logi({ tyyp: 'leiuteade', leidkood: kk, tekst, kontakt, ...(g ? { gps: g } : {}), ...(vt ? { pos_vanus: pv } : {}), ...(fg ? { foto_gps: fg } : {}),
      ...(ipk ? { ip_koht: ipk } : {}), ...(foto ? { leidja_foto: foto.bytes.length } : {}), aeg: nyyd }); // leidkood: ei lähe seadme ajalukku (L1)
    let fotoOk = false;
    if (v.teade) {
      const pohjus = Object.hasOwn(PUUDUB, k.puudub || '') ? ` (${PUUDUB[k.puudub]})` : '';
      const tekstiRead = [
        `📦 Leiuteade: ${s.nimi} (${s.invnr || kk})`, `Aeg: ${eestiAeg(nyyd)}`, await this.kellelRida(kk),
        tekst && `Leidja: „${tekst}“`, kontakt && `Kontakt: ${kontakt}`, foto && '📷 Foto lisatud',
        fg && `📷 Foto asukoht (foto andmetest): ${kaart(fg.lat, fg.lon)}${fg.aeg ? ` (pildistatud ${fg.aeg})` : ''}`,
        g && `📍 ${tapsus ? `±${tapsus} m` : 'Leidja asukoht'}${vt ? ` (${vt})` : ''}: ${kaart(g.lat, g.lon)}`,
        ipk && `Täpset asukohta ei saadetud${pohjus}; umbkaudu IP järgi: ${ipk}`,
      ].filter(Boolean).join('\n');
      // kaardipunkt: foto asukoht, muidu leidja oma; kui sama lugem läks juba automaatteatena, teist punkti ei saadeta
      const punkt = fg ? { lat: fg.lat, lon: fg.lon } : g && !k.auto_saadetud ? { lat: g.lat, lon: g.lon } : undefined;
      if (foto) fotoOk = Boolean((await this.teavitaTaustal(tekstiRead, punkt, foto))?.fotoOk); // fotoga oodatakse, et leidjale ausalt vastata
      else this.teavitaTaustal(tekstiRead, punkt);
    }
    return json({ ok: true, salvestatud: v.logi, teavitatud: v.teade, ...(foto ? { foto: fotoOk } : {}) });
  }
  // „📞 Helista omanikule“ vajutus (sendBeacon): teade omanikule; tel: link avaneb leidja telefonis igal juhul.
  async helista(request, k) {
    const t = await this.leidToken(k.token);
    if (t.vastus) return t.vastus;
    const { kk, s } = t;
    if (!leidjaTelefon(this.env, await this.seaded())) return viga('telefon puudub');
    const v = this.leidVaravad(request.headers.get('X-IP-Rasi') || '', kk, 'h');
    if (!v.ip) return viga('oota minut', 429);
    if (!v.logi && !v.teade) return viga('tais', 503);
    const nyyd = Date.now(), ipk = ipKoht(request);
    if (v.logi) await this.logi({ tyyp: 'helista', leidkood: kk, ip_koht: ipk, aeg: nyyd });
    if (v.teade) this.teavitaTaustal(`📞 Leidja vajutas „Helista“: ${s.nimi} (${s.invnr || kk})\nAeg: ${eestiAeg(nyyd)}\nUmbkaudu IP järgi: ${ipk}`);
    return json({ ok: true, salvestatud: v.logi, teavitatud: v.teade });
  }

  // ---------- eeltrükitud koodid (partiid) ----------
  // Haldur valib iga seadme puhul: uus kood ja oma silt (vana viis) või varem trükitud kleebise kood (seadme lisamisel „Olemasolev kood“).
  // partii:<inv(aeg)> = {aeg, nimi, koodid[]} (üks kirje partii kohta), pkood:<kood> = {partii} (sidumata koodi äratundmiseks skännimisel).
  async uusPartii(b) {
    const n = Number(b.kogus);
    if (!Number.isInteger(n) || n < 1 || n > PARTII_KOODE) return viga(`Kogus 1–${PARTII_KOODE}.`);
    const nyyd = Date.now(), koodid = [];
    while (koodid.length < n) {
      const k = juhuslik(12);
      if (koodid.includes(k) || await this.s.get(`seade:${k}`) || await this.s.get(`koht:${k}`) || await this.s.get(`pkood:${k}`)) continue;
      koodid.push(k);
    }
    const id = `partii:${inv(nyyd)}`;
    const p = { aeg: nyyd, nimi: puhasta(b.nimi, 60), koodid };
    await this.s.put(id, p);
    for (const k of koodid) await this.s.put(`pkood:${k}`, { partii: id });
    await this.logi({ tyyp: 'partii_loodud', nimi: 'haldur', marge: `${n} koodi${p.nimi ? `: ${p.nimi}` : ''}` });
    return json({ ok: true, partii: { id, ...p } });
  }
  async partiid() {
    const l = [];
    for (const [id, p] of await this.loend('partii:')) {
      const koodid = [];
      for (const k of p.koodid) {
        const sd = await this.s.get(`seade:${k}`);
        const pk = sd ? null : await this.s.get(`pkood:${k}`);
        koodid.push(sd ? { kood: k, nimi: sd.nimi, invnr: sd.invnr || '', kustutatud: !!sd.kustutatud }
          : pk?.kasutatud ? { kood: k, nimi: pk.seade || '?', invnr: '', kustutatud: true } : { kood: k });
      }
      l.push({ id, aeg: p.aeg, nimi: p.nimi || '', koodid });
    }
    return l;
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
      if (tee === 'partiid') return json({ ok: true, partiid: await this.partiid() });
      if (tee === 'taatlused') { const kk = normKood(url.searchParams.get('kood') || ''); return json({ ok: true, taatlused: kk ? (await this.loend(`taatlus:${kk}:`, 50)).map(([, x]) => x) : [] }); }
      if (tee === 'hooldused') { const kk = normKood(url.searchParams.get('kood') || ''); return json({ ok: true, hooldused: kk ? (await this.loend(`hooldus:${kk}:`, 50)).map(([, x]) => x) : [] }); }
      if (tee === 'dokument') {
        const v = url.searchParams.get('k') || '';
        if (!DOK_RE.test(v) || !this.env.FOTOD) return viga('ei leitud', 404);
        const o = await this.env.FOTOD.get(v);
        if (!o) return viga('ei leitud', 404);
        return new Response(o.body, { headers: { 'Content-Type': DOK_MIME[v.split('.').pop()], 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox", 'Content-Disposition': 'inline' } });
      }
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
    if (tee === 'dokument') return this.dokumentUles(request, url);
    if (tee === 'loe') return this.pildiltLoe(request, url);
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
      case 'partii': return this.uusPartii(b);
      case 'testteade': { // testteade Telegrami/ntfy-sse; vea põhjus tagasi halduse lehele (tokenit ei näidata)
        const t = await teavita(this.env, `✅ Krativara testteade (${eestiAeg(Date.now())})`);
        return json({ ok: t.saadetud > 0, saadetud: t.saadetud, tg: t.tg, ntfy: t.ntfy });
      }
      case 'kustuta': return this.adminKustuta(b);
      case 'taasta': return this.adminTaasta(b);
      case 'taatlus': return this.adminTaatlus(b);
      case 'bron-tyhista': return this.bronTyhista(null, b, true);
      case 'kalender': return this.adminKalender(b);
      case 'ai-litsents': return this.aiLitsents();
      case 'hooldus-tehtud': return this.hooldusTehtud(b);
    }
    return viga('tundmatu', 404);
  }

  async logiLoe(kood, max) {
    const kk = kood ? normKood(kood) : null;
    return (await this.loend(kk ? `ajalugu:${kk}:` : 'logi:', max)).map(([, x]) => x);
  }

  async ulevaade() {
    await this.lopetaKustutamine(); await this.koristaAjutised();
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
    const t = tana(Date.now());
    const broneeringud = [];
    for (const [, b] of await this.loend('bron:')) if (b.lopp >= t) broneeringud.push({ ...b, nimi: kasutajad.get(b.kasutaja)?.nimi || '?', tel: kasutajad.get(b.kasutaja)?.tel || '', seade: seadmed.find((x) => x.kood === b.kood)?.nimi || '?' });
    broneeringud.sort((a, b) => (a.algus < b.algus ? -1 : 1));
    const viimane = (await this.loend('logi:', 1)).map(([, x]) => x.aeg)[0] || 0;
    return { ok: true, seaded, foto_olemas: !!this.env.FOTOD, ai_olemas: !!this.env.AI, ai_paevas: AI_PAEVAS, kohad, seadmed, kasutajad: kas, kinnitused, vaidlused, margmed, broneeringud, logi_viimane: viimane };
  }

  async adminSeade(b) {
    const uus = !b.kood;
    const kood = uus ? normKood(b.uus_kood || '') || null : normKood(b.kood);
    if (!uus && !kood) return viga('vigane kood');
    let s = kood ? await this.s.get(`seade:${kood}`) : null;
    if (!uus && !s) return viga('Seadet ei leitud', 404);
    if (uus && s) return viga('Selle koodiga seade on juba olemas.', 409);
    if (uus && kood && await this.s.get(`koht:${kood}`)) return viga('See kood on töökoha kood.', 409);
    if (uus && kood && (await this.s.get(`pkood:${kood}`))?.kasutatud) return viga('See kleebis oli kustutatud seadmel. Kasuta uut koodi.', 409);
    if (uus && b.uus_kood && !kood) return viga('Vigane kood (12 märki, 0-9 A-Z ilma I L O U).');
    const nimi = puhasta(b.nimi, 80);
    if (nimi.length < 2) return viga('Sisesta seadme nimi.');
    const olek = ['aktiivne', 'remondis', 'taatlusel', 'maha'].includes(b.olek) ? b.olek : 'aktiivne';
    const intervall = b.taatlus_intervall === '' || b.taatlus_intervall == null ? null : Number(b.taatlus_intervall);
    if (intervall !== null && (!Number.isInteger(intervall) || intervall < 1 || intervall > 120)) return viga('Taatluse intervall 1–120 kuud.');
    const taatlus = b.taatlus_kuni ? kuupaev(b.taatlus_kuni) : null;
    if (b.taatlus_kuni && !taatlus) return viga('Vigane taatluse kuupäev (AAAA-KK-PP).');
    const koduladu = normKood(b.asukoht || '');
    const ladu = koduladu ? await this.elus(`koht:${koduladu}`) : null;
    // Ostuandmed, tootja/mudel ja hooldus (Margo 10.11.2026): muudetakse ainult siis, kui väli on päringus (osalised salvestused,
    // nt „Saada taatlusele“, ei kustuta neid). Hinda ja dokumente näeb ainult haldur.
    const lisa = {};
    for (const [v, max] of [['tootja', 60], ['mudel', 60], ['ost_muuja', 80]]) if (b[v] !== undefined) lisa[v] = puhasta(b[v], max);
    for (const v of ['ost_kuupaev', 'garantii_kuni']) if (b[v] !== undefined) { if (b[v] === '' || b[v] === null) lisa[v] = null; else { lisa[v] = kuupaev(b[v]); if (!lisa[v]) return viga('Vigane kuupäev (AAAA-KK-PP).'); } }
    if (b.ost_hind !== undefined) { if (b.ost_hind === '' || b.ost_hind === null) lisa.ost_hind = null; else { lisa.ost_hind = hindArvuks(String(b.ost_hind)); if (lisa.ost_hind === null) return viga('Vigane hind.'); } }
    if (b.hooldused !== undefined) { const h = hooldusPlaanid(b.hooldused, s?.hooldused || [], tana(Date.now())); if (typeof h === 'string') return viga(h); lisa.hooldused = h; }
    let dok = (s?.dokumendid || []).slice();
    if (Array.isArray(b.dokumendid_eemalda)) for (const v of b.dokumendid_eemalda) { const d = dok.find((x) => x.voti === v && !x.kustutatud); if (d) d.kustutatud = Date.now(); }
    const uuedDok = [];
    if (Array.isArray(b.dokumendid_lisa)) for (const v of b.dokumendid_lisa.slice(0, DOK_ARV_MAX)) {
      if (typeof v !== 'string' || !DOK_RE.test(v) || dok.some((x) => x.voti === v)) continue;
      const d = await this.s.get(`dok:${v}`); if (!d) return viga('Dokumenti ei leitud (lae uuesti üles).');
      dok.push(d); uuedDok.push(v);
    }
    if (dok.filter((x) => !x.kustutatud).length > DOK_ARV_MAX) return viga(`Seadmel saab olla kuni ${DOK_ARV_MAX} dokumenti.`);
    if (b.dokumendid_lisa !== undefined || b.dokumendid_eemalda !== undefined) lisa.dokumendid = dok;
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
      taatlus_kuni: taatlus, taatlus_intervall: intervall, olek, lisainfo: puhastaMitmerealine(b.lisainfo, 500), koduladu: ladu ? koduladu : null, muudetud: Date.now(),
      ...lisa,
    };
    if (uus) kirje.reg_ladu = ladu ? koduladu : null;
    await this.s.put(`seade:${k}`, kirje);
    for (const v of uuedDok) await this.s.delete(`dok:${v}`); // seotud: sama faili ei saa teisele seadmele siduda
    await this.logi({ tyyp: uus ? 'seade_lisatud' : 'seade_muudetud', kood: k, nimi: 'haldur', seade: nimi, ...(uuedDok.length ? { tekst: `dokumente lisatud: ${uuedDok.length}` } : {}) });
    return json({ ok: true, seade: kirje });
  }

  // ---------- taatlus / kalibreerimine ----------
  // Registreeri tehtud taatlus: kuupäev, tunnistus, tegija, tulemus. Järgmine tähtaeg = sisestatud või kuupäev + intervall (kuud).
  async adminTaatlus({ kood, kuupaev: kp, tunnistus, tegija, tulemus, jargmine, markus }) {
    const kk = normKood(kood);
    const s = kk ? await this.s.get(`seade:${kk}`) : null;
    if (!s) return viga('Seadet ei leitud', 404);
    const d = kuupaev(kp);
    if (!d) return viga('Sisesta taatluse kuupäev.');
    if (!['sobib', 'ei_sobi'].includes(tulemus)) return viga('Vali tulemus.');
    let j = jargmine ? kuupaev(jargmine) : null;
    if (jargmine && !j) return viga('Vigane järgmise taatluse kuupäev.');
    if (!j && s.taatlus_intervall) {
      const x = new Date(d + 'T12:00:00Z'); x.setUTCMonth(x.getUTCMonth() + s.taatlus_intervall); j = x.toISOString().slice(0, 10);
    }
    const kirje = { kood: kk, kuupaev: d, tunnistus: puhasta(tunnistus, 80), tegija: puhasta(tegija, 80) || s.taatlus_tegija || '', tulemus, jargmine: j, markus: puhastaMitmerealine(markus, 300), aeg: Date.now() };
    await this.s.put(`taatlus:${kk}:${String(TS_MAX - Date.parse(d)).padStart(13, '0')}:${juhuslik(4)}`, kirje);
    if (tulemus === 'sobib') { if (j) s.taatlus_kuni = j; if (s.olek === 'taatlusel') s.olek = 'aktiivne'; }
    else s.olek = 'remondis';
    if (kirje.tegija) s.taatlus_tegija = kirje.tegija;
    await this.s.put(`seade:${kk}`, s);
    for (const [v, m] of await this.loend(`marge:${kk}:`)) if (m.tyyp === 'taatlus' && !m.lahendatud) await this.s.put(v, { ...m, lahendatud: true, lahendatud_aeg: Date.now(), otsus: `taatlus ${d}` });
    await this.logi({ tyyp: 'taatlus_tehtud', kood: kk, nimi: 'haldur', tekst: `${d}, ${tulemus === 'sobib' ? 'sobib' : 'EI SOBI'}${kirje.tunnistus ? `, tunnistus ${kirje.tunnistus}` : ''}${j ? `, järgmine ${j}` : ''}` });
    return json({ ok: true, seade: s, taatlus: kirje });
  }
  async adminKalender({ uus }) {
    const s = await this.seaded();
    if (uus || !s.kalender_token) { s.kalender_token = juhuslik(32); await this.s.put('seaded', s); }
    return json({ ok: true, token: s.kalender_token });
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
        if (liik === 'seade') {
          for (const p of [`marge:${x.kood}:`, `ajalugu:${x.kood}:`, `bron:${x.kood}:`, `taatlus:${x.kood}:`, `hooldus:${x.kood}:`]) for (const [k2] of await this.loend(p)) await this.s.delete(k2);
          if (this.env.FOTOD) for (const d of x.dokumendid || []) await this.env.FOTOD.delete(d.voti).catch(() => {}); // arved, andmesildid
        }
        if (liik === 'seade') { const pk = await this.s.get(`pkood:${x.kood}`); if (pk) await this.s.put(`pkood:${x.kood}`, { ...pk, kasutatud: true, seade: x.nimi }); } // partii kleebis on kasutatud: ei muutu uuesti vabaks
        if (liik === 'kasutaja') {
          if (x.tel && (await this.s.get(`tel:${x.tel}`)) === x.id) await this.s.delete(`tel:${x.tel}`);
          for (const [k2] of await this.kinnitamata(x.id)) await this.s.delete(k2);
          for (const [k2, b] of await this.loend('bron:')) if (b.kasutaja === x.id) await this.s.delete(k2);
        }
        await this.logi({ tyyp: 'lopp_kustutatud', liik, objekt: v.slice(prefix.length), nimi: 'süsteem', tekst: x.nimi });
      }
    }
    if (jargmine) await this.seaAlarm(jargmine);
  }
  async alarm() { await this.lopetaKustutamine(); await this.koristaAjutised(); }
  // Sidumata dokumendid (> 2 päeva: üles laaditud, aga seadet ei salvestatud) ja vanad pildilugemise loendurid (> 7 päeva)
  async koristaAjutised(nyyd = Date.now()) {
    for (const [v, d] of await this.loend('dok:')) if (nyyd - (d.aeg || 0) > 2 * 86400000) { if (this.env.FOTOD) await this.env.FOTOD.delete(d.voti).catch(() => {}); await this.s.delete(v); }
    const piir = tana(nyyd - 7 * 86400000);
    for (const [v] of await this.loend('ai:')) if (v.slice(3) < piir) await this.s.delete(v);
  }

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

  // Hooldus tehtud: viimati = kuupäev, järgmine = kuupäev + kordus (või sisestatud). Ajalugu: hooldus:<kood>:<inv>.
  async hooldusTehtud({ kood, id, kuupaev: kp, jargmine, tegija, markus, kulu }) {
    const kk = normKood(kood || '');
    const s = kk ? await this.elus(`seade:${kk}`) : null;
    if (!s) return viga('Seadet ei leitud', 404);
    const h = (s.hooldused || []).find((x) => x.id === id);
    if (!h) return viga('Hooldusplaani ei leitud', 404);
    const d = kuupaev(kp); if (!d) return viga('Sisesta hoolduse kuupäev.');
    if (d > tana(Date.now())) return viga('Hoolduse kuupäev ei saa olla tulevikus.');
    const j = jargmine ? kuupaev(jargmine) : kuudLisa(d, h.intervall);
    if (!j) return viga('Vigane järgmine kuupäev.');
    let kuluN = null; if (kulu !== undefined && kulu !== '' && kulu !== null) { kuluN = hindArvuks(String(kulu)); if (kuluN === null) return viga('Vigane kulu.'); }
    h.viimati = d; h.jargmine = j; if (tegija !== undefined) h.tegija = puhasta(tegija, 80);
    s.muudetud = Date.now();
    await this.s.put(`seade:${kk}`, s);
    const kirje = { kood: kk, plaan: h.id, nimi: h.nimi, kuupaev: d, jargmine: j, tegija: h.tegija || '', markus: puhasta(markus, 300), kulu: kuluN, aeg: Date.now() };
    await this.s.put(`hooldus:${kk}:${String(1e15 - Date.now()).padStart(16, '0')}:${juhuslik(4)}`, kirje);
    await this.logi({ tyyp: 'hooldus', kood: kk, nimi: 'haldur', seade: s.nimi, tekst: `${h.nimi} ${d}${kirje.markus ? ': ' + kirje.markus : ''}` });
    return json({ ok: true, hooldus: kirje, seade: s });
  }

  // ---------- dokumendid ja pildilt lugemine (Margo 10.11.2026) ----------
  // Originaalfail (foto või PDF, ≤ 10 MB) läheb R2-sse muutmata kujul; seadmega seotakse see seadme salvestamisel (dokumendid_lisa).
  async dokumentUles(request, url) {
    if (!this.env.FOTOD) return viga('Failide hoidla (R2, FOTOD) ei ole seadistatud.', 501);
    if (Number(request.headers.get('Content-Length') || 0) > DOK_MAX) return viga('Fail on liiga suur (kuni 10 MB).', 413);
    const b = await loeKeha(request, DOK_MAX);
    if (!b || b.length < 100) return viga('Fail on liiga suur või tühi.', 413);
    const t = dokTyyp(b);
    if (!t) return viga('Lubatud on foto (JPEG, PNG, WebP) või PDF.', 415);
    const lk = url.searchParams.get('liik'), liik = lk && Object.hasOwn(DOK_LIIGID, lk) ? lk : 'muu';
    const nimi = puhasta(url.searchParams.get('nimi') || '', 80).replace(/[\\/<>:"|?*]/g, '_');
    const nyyd = Date.now();
    const voti = `d/${tana(nyyd).slice(0, 7).replace('-', '')}/${String(nyyd).padStart(13, '0')}-${juhuslik(6)}.${t}`;
    await this.env.FOTOD.put(voti, b, { httpMetadata: { contentType: DOK_MIME[t] } });
    const kirje = { voti, liik, nimi, mime: DOK_MIME[t], suurus: b.length, aeg: nyyd };
    await this.s.put(`dok:${voti}`, kirje);
    return json({ ok: true, dokument: kirje });
  }
  async aiLubatud() {
    const v = `ai:${tana(Date.now())}`, n = (await this.s.get(v)) || 0;
    if (n >= AI_PAEVAS) return false;
    await this.s.put(v, n + 1);
    return true;
  }
  // Pildilt lugemine: brauser saadab vähendatud JPEG-i (≤ 1600 px); mudel annab ettepaneku, mida haldur kontrollib. Pilti ei salvestata.
  async pildiltLoe(request, url) {
    if (!this.env.AI || typeof this.env.AI.run !== 'function') return viga('Pildilt lugemine ei ole seadistatud (Workers AI, sidumine AI). Täida väljad käsitsi.', 501);
    const liik = url.searchParams.get('liik') === 'andmesilt' ? 'andmesilt' : 'arve';
    if (Number(request.headers.get('Content-Length') || 0) > AI_PILT_MAX) return viga('Pilt on liiga suur.', 413);
    const b = await loeKeha(request, AI_PILT_MAX);
    if (!b || b.length < 100) return viga('Pilt on liiga suur või tühi.', 413);
    const t = dokTyyp(b);
    if (!t || t === 'pdf') return viga('Lugeda saab ainult fotot (JPEG, PNG, WebP).', 415);
    if (!(await this.aiLubatud())) return viga(`Pildilt lugemise päevane piir (${AI_PAEVAS}) on täis. Täida väljad käsitsi või proovi homme.`, 429);
    let vastus;
    try {
      // [KONTROLLIMATA päris Workers AI-s] sisend nagu K | KODU-s: messages + image (baitide massiiv)
      vastus = await this.env.AI.run(AI_MUDEL, {
        messages: [{ role: 'user', content: AI_JUHIS[liik] + '\n\nRead this photo and return the JSON object.' }],
        image: [...b], max_tokens: 300, temperature: 0,
      });
    } catch (e) {
      console.error('pildilt lugemine', e);
      if (/agree|licen[cs]e/i.test(String(e?.message || e))) return viga('Pildimudeli litsents on kinnitamata. Haldus → Seaded → „Nõustun pildimudeli litsentsiga“.', 503);
      return viga('Pildilt lugemine ebaõnnestus. Proovi uuesti või täida käsitsi.', 502);
    }
    return json({ ok: true, liik, ettepanek: dokValjad(aiJson(vastus), liik, tana(Date.now())), mudel: AI_MUDEL });
  }
  // Meta Llama 3.2 Vision nõuab Cloudflare'is ühekordset nõustumist (päring tekstiga „agree“). Haldur teeb seda nupuga.
  async aiLitsents() {
    if (!this.env.AI || typeof this.env.AI.run !== 'function') return viga('Workers AI sidumine nimega AI puudub.', 501);
    try { await this.env.AI.run(AI_MUDEL, { prompt: 'agree' }); } catch (e) { console.error(e); return viga('Cloudflare ei võtnud nõusolekut vastu. Proovi hiljem uuesti.', 502); }
    const s = await this.seaded(); s.ai_litsents = { mudel: AI_MUDEL, aeg: Date.now() }; await this.s.put('seaded', s);
    await this.logi({ tyyp: 'ai_litsents', nimi: 'haldur', tekst: AI_MUDEL });
    return json({ ok: true, ai_litsents: s.ai_litsents });
  }

  async seadmedCsv() {
    const u = await this.ulevaade();
    const read = [['kood', 'nimi', 'tüüp', 'tootja', 'mudel', 'inventarinr', 'seerianr', 'taatlus_kuni', 'olek', 'asukoht', 'kellel', 'telefon', 'alates', 'ostukuupäev', 'hind_km_ta', 'müüja', 'garantii_kuni', 'dokumente'].join(';')];
    for (const s of u.seadmed) read.push([s.kood, s.nimi, s.tyyp, s.tootja, s.mudel, s.invnr, s.seerianr, s.taatlus_kuni, s.olek, s.asukoht_nimi, s.kellel?.nimi, s.kellel?.tel, s.kellel ? eestiAeg(s.kellel.alates) : '',
      s.ost_kuupaev, s.ost_hind == null ? '' : String(s.ost_hind).replace('.', ','), s.ost_muuja, s.garantii_kuni, (s.dokumendid || []).filter((d) => !d.kustutatud).length].map(csvLahter).join(';'));
    return new Response('﻿' + read.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="seadmed.csv"', 'Cache-Control': 'no-store' } });
  }
  async logiCsv() {
    const l = await this.logiLoe(null, 5000);
    const read = [['aeg', 'sündmus', 'kood', 'kes', 'eelmine', 'märkus'].join(';')];
    for (const x of l) read.push([eestiAeg(x.aeg), x.tyyp, x.kood, x.nimi, x.eelmise_nimi || x.uus, x.tekst || x.marge].map(csvLahter).join(';'));
    return new Response('﻿' + read.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="logi.csv"', 'Cache-Control': 'no-store' } });
  }
}

// ---------- leidja abi (üle võetud leiamind'ist, 02.11.2026) ----------
const SKANN_TTL = 3600;                 // skännitoken kehtib 1 h
const PAEVA_MAX = 50;                   // leidja kirjeid ööpäevas sildi kohta
const TEKST_MAX = 400, KONTAKT_MAX = 100;
const LEID_FOTO_MAX = 2 * 1024 * 1024;  // leidja foto (brauser vähendab ≤ 1600 px); serverisse ei salvestata
const LEID_KEHA_MAX = 2.5 * 1024 * 1024; // fotoga päringu kogu keha (loetakse voona, päist ei usaldata)
const TOKEN_RE = /^([0-9A-HJKMNP-TV-Z]{12})\.(\d{9,12})\.([0-9a-f]{64})$/;
const FOTO_AEG_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const PUUDUB = { luba: 'luba keelatud', tugi: 'brauser ei toeta asukohta' };
async function hmacHex(saladus, sisu) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(saladus), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sisu)))].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function tokeniSaladus(env) {
  if (!env.TOKEN_SECRET || String(env.TOKEN_SECRET).length < 16) throw new Error('TOKEN_SECRET puudub või on lühem kui 16 märki');
  return `skann|${env.TOKEN_SECRET}`;
}
// Olekuta skännitoken: kood.aegumine.HMAC-SHA256(TOKEN_SECRET, "kood.aegumine"); serverisse ei salvestata
export async function looToken(env, kood, nyyd = Date.now()) {
  const exp = Math.floor(nyyd / 1000) + SKANN_TTL;
  return `${kood}.${exp}.${await hmacHex(tokeniSaladus(env), `${kood}.${exp}`)}`;
}
export async function kehtivToken(env, token, nyyd = Date.now()) {
  const m = typeof token === 'string' ? TOKEN_RE.exec(token) : null;
  if (!m) return null;
  const s = Math.floor(nyyd / 1000);
  if (Number(m[2]) < s || Number(m[2]) > s + SKANN_TTL) return null;
  return vordle(await hmacHex(tokeniSaladus(env), `${m[1]}.${m[2]}`), m[3]) ? m[1] : null;
}
// IP-põhine koht arvutatakse Workeris request.cf-ist (linn, regioon, riik (teenusepakkuja)) ja tuleb päises X-IP-Koht (kliendi oma kirjutatakse üle)
const ipKoht = (request) => { try { return decodeURIComponent(request.headers.get('X-IP-Koht') || '').slice(0, 160) || 'teadmata'; } catch { return 'teadmata'; } };
// Seade: sec-ch-ua-platform (Chromium) või UA järgi OS + brauser, üldkujul
export function seadmeTyyp(request) {
  const ua = request.headers.get('User-Agent') || '';
  const hint = (request.headers.get('Sec-CH-UA-Platform') || '').replace(/"/g, '').trim();
  const mobiil = (request.headers.get('Sec-CH-UA-Mobile') || '').trim() === '?1' || /Mobile/.test(ua);
  const HINT = { Android: 'Android', iOS: 'iOS', Windows: 'Windows', macOS: 'macOS', Linux: 'Linux', 'Chrome OS': 'ChromeOS', ChromeOS: 'ChromeOS' };
  const uaOs = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null;
  let os = HINT[hint] || uaOs || (mobiil ? 'mobiil' : 'muu');
  if (os === 'Linux' && /Android/.test(ua)) os = 'Android';
  const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'muu';
  return `${os}, ${br}`;
}
// „Helista omanikule“ number: halduse seade „Kontakttelefon leidjale“, selle puudumisel saladus OMANIKU_TELEFON
export const leidjaTelefon = (env, seaded) => normTel(seaded.telefon || '') || normTel(String(env.OMANIKU_TELEFON || '')) || '';
const asukohtKehtib = (k) => typeof k?.lat === 'number' && typeof k.lon === 'number' && Number.isFinite(k.lat) && Number.isFinite(k.lon) && Math.abs(k.lat) <= 90 && Math.abs(k.lon) <= 180;
const ymarda6 = (x) => Math.round(x * 1e6) / 1e6;
function tapsusM(x) {
  const t = Number(x);
  return (typeof x === 'number' || (typeof x === 'string' && x.trim() !== '')) && Number.isFinite(t) && t > 0 && t <= 100000 ? Math.max(1, Math.round(t)) : null;
}
const POS_VANA_S = 120;
const posVanus = (x) => (Number.isInteger(x) && x >= 0 && x <= 86400 ? x : 0);
function vanusTekst(vanus, nyyd) {
  if (!(vanus > POS_VANA_S)) return '';
  const hhmm = new Date(nyyd - vanus * 1000).toLocaleTimeString('et-EE', { timeZone: 'Europe/Tallinn', hour: '2-digit', minute: '2-digit' });
  return `määratud ${hhmm}, ${Math.round(vanus / 60)} min tagasi`;
}
const kaart = (lat, lon) => `https://maps.google.com/?q=${lat},${lon}`;
// Leidja tekst: reavahetus normaliseeritud, juhtmärgid tühikuks; pikem kui piir lükatakse tagasi (vaikselt ei lõigata)
const leidjaTekst = (v) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim() : '');
// Keha lugemine piiriga: voog katkestatakse piiri ületamisel (Content-Length'i ei usaldata)
async function loeKeha(request, max) {
  if (!request.body) return new Uint8Array(0);
  const lugeja = request.body.getReader();
  const osad = [];
  let kokku = 0;
  for (;;) {
    const { done, value } = await lugeja.read();
    if (done) break;
    kokku += value.length;
    if (kokku > max) { await lugeja.cancel().catch(() => {}); return null; }
    osad.push(value);
  }
  const out = new Uint8Array(kokku);
  let o = 0;
  for (const x of osad) { out.set(x, o); o += x.length; }
  return out;
}

// Hooldusplaanid (Margo 10.11.2026): korduv hooldus (nt 6 / 12 / 24 kuud), meeldetuletus X päeva enne, kalendrisse ja hoiatus.
// Üle tähtaja hooldus EI keela võtmist (ainult hoiatus). Tagastab puhastatud massiivi või veateate (string).
export const HOOLDUS_MAX = 10;
export function kuudLisa(d, kuud) { const x = new Date(d + 'T12:00:00Z'), p = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + kuud); x.setUTCDate(Math.min(p, new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate())); return x.toISOString().slice(0, 10); }
export function hooldusPlaanid(l, vanad = [], tanaK = null) {
  if (!Array.isArray(l)) return 'Vigased hooldused.';
  if (l.length > HOOLDUS_MAX) return `Seadmel saab olla kuni ${HOOLDUS_MAX} hooldusplaani.`;
  const valja = [];
  for (const h of l) {
    if (!h || typeof h !== 'object') return 'Vigane hooldus.';
    const nimi = puhasta(h.nimi, 60);
    if (nimi.length < 2) return 'Sisesta hoolduse nimi (nt „hooldus“, „filtrite vahetus“).';
    const iv = Number(h.intervall);
    if (!Number.isInteger(iv) || iv < 1 || iv > 120) return `Hoolduse „${nimi}“ kordus peab olema 1–120 kuud.`;
    const viimati = h.viimati ? kuupaev(h.viimati) : null;
    if (h.viimati && !viimati) return `Hoolduse „${nimi}“ viimane kuupäev on vigane.`;
    if (viimati && tanaK && viimati > tanaK) return `Hoolduse „${nimi}“ viimane kuupäev ei saa olla tulevikus.`;
    let jargmine = h.jargmine ? kuupaev(h.jargmine) : null;
    if (h.jargmine && !jargmine) return `Hoolduse „${nimi}“ järgmine kuupäev on vigane.`;
    if (!jargmine && viimati) jargmine = kuudLisa(viimati, iv);
    if (!jargmine) return `Hoolduse „${nimi}“ juures sisesta viimane või järgmine kuupäev.`;
    const hp = h.hoiatus_paevi === undefined || h.hoiatus_paevi === '' ? 14 : Number(h.hoiatus_paevi);
    if (!Number.isInteger(hp) || hp < 0 || hp > 180) return 'Meeldetuletus 0–180 päeva enne.';
    let id = typeof h.id === 'string' && /^[0-9A-Z]{6}$/.test(h.id) ? h.id : juhuslik(6);
    while (valja.some((x) => x.id === id)) id = juhuslik(6); // korduv id → uus (hooldusTehtud ja kalendri UID peavad olema unikaalsed)
    const vana = vanad.find((x) => x.id === id);
    const tegija = h.tegija !== undefined ? puhasta(h.tegija, 80) : (vana?.tegija || ''); // vorm tegijat ei saada: jääb „Tehtud“ juurest alles
    valja.push({ id, nimi, intervall: iv, viimati, jargmine, hoiatus_paevi: hp, tegija });
  }
  return valja;
}

async function loeJson(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 32 * 1024) return null;
  try {
    const b = await loeKeha(request, 32 * 1024); // voona piiriga: Content-Length puudub (chunked) → mälu ei täitu
    if (!b) return null;
    const t = new TextDecoder().decode(b);
    if (t.length > 32 * 1024) return null;
    const o = JSON.parse(t || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}
