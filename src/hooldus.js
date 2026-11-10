// Hooldus väljaspool firmat (Margo 10.11.2026): hooldajate register, töökäsk, hooldaja ligipääs lingiga (A) või seadme QR + PIN (C).
// Hooldaja näeb ainult oma töökäsu seadet (nimi, tootja, mudel, seerianr, inventarinr) ja rikke kirjeldust; kasutajaid, hindu ega
// ajalugu ei näe. Hooldaja saab töökäsu ajal sissekandeid ja faile lisada, muuta ja eemaldada (vanad versioonid jäävad tõendiks),
// haldur kinnitab ja sulgeb. Puhtad funktsioonid, testitavad ilma Workerita.

export const TOO_PAEVI = 30;          // töökäsu vaikimisi kehtivus
export const TOO_PAEVI_MAX = 180;
export const PIN_VEAD_MAX = 10;       // iga 10 vale PIN-i järel töökäsu PIN 1 tunniks lukus (võõras ei saa jäädavalt lukustada)
export const HSESS_MS = 12 * 3600 * 1000; // hooldaja sessioon telefonis (kuni töökäsu lõpuni, mitte kauem)
export const HFAIL_MAX = 10 * 1024 * 1024;
export const HFAIL_ARV = 40;
export const HKIRJE_ARV = 60;
export const HKIRJE_LIIGID = { vastuvott: 'vastuvõtt', too: 'tehtud töö', osad: 'osad / materjal', akt: 'akt / tunnistus', kooskolastus: 'kooskõlastus', muu: 'muu' };
export const HFAIL_LIIGID = { foto: 'foto', akt: 'akt', arve: 'arve', tunnistus: 'tunnistus', muu: 'muu' };
export const ETTEPANEKUD = { valmis: 'valmis, võib tagastada', ei_parandatav: 'ei ole parandatav', kooskolastus: 'vajab kooskõlastust (hind/osad)' };
export const HFAIL_RE = /^h\/\d{6}\/\d{13}-[0-9A-Z]{6}\.(jpg|png|webp|pdf)$/;

// PIN: 8 numbrit, HMAC(TOKEN_SECRET; töökäsu id, hooldusesse märkimise kuupäev, inventarinumber, hooldaja id, töökäsu juhuslik sool).
// Seotud nende andmetega: kui mõni muutub (nt uus töökäsk või uus sool „Uus PIN“), kehtib uus PIN. PIN-i ennast ei salvestata.
export async function looPin(secret, { id, kuupaev, invnr, hooldaja, nonce }) {
  if (typeof secret !== 'string' || secret.length < 16) throw new Error('TOKEN_SECRET puudub või on lühem kui 16 märki');
  const voti = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', voti, new TextEncoder().encode(['pin', id, kuupaev, invnr, hooldaja, nonce].join('|'))));
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(sig[i]);
  return String(n % 100000000n).padStart(8, '0');
}
export const pinNorm = (v) => String(v ?? '').replace(/[\s-]/g, '');
export const pinVorm = (p) => `${p.slice(0, 4)} ${p.slice(4)}`;

const puh = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const puh1 = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

/** Hooldaja (ettevõte) kirje haldurilt → puhastatud väljad või veateade (string). */
export function hooldajaValjad(b) {
  const nimi = puh1(b.nimi, 100);
  if (nimi.length < 2) return 'Sisesta hooldaja (ettevõtte) nimi.';
  const epost = puh1(b.epost, 120), arve = puh1(b.arve_epost, 120);
  for (const e of [epost, arve]) if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return `Vigane e-post: ${e}`;
  const regkood = puh1(b.regkood, 20);
  if (regkood && !/^[0-9A-Za-z-]{4,20}$/.test(regkood)) return 'Vigane registrikood.';
  return { nimi, regkood, kmkr: puh1(b.kmkr, 20).toUpperCase(), aadress: puh1(b.aadress, 160), kontakt: puh1(b.kontakt, 80), tel: puh1(b.tel, 40),
    epost, arve_epost: arve, markus: puh(b.markus, 500) };
}

/** Hooldaja sissekanne → puhastatud väljad või veateade. kulu: number ≥ 0 või null. */
export function kirjeValjad(b, hind) {
  const liik = typeof b.liik === 'string' && Object.hasOwn(HKIRJE_LIIGID, b.liik) ? b.liik : null;
  if (!liik) return 'Vali sissekande liik.';
  const tekst = puh(b.tekst, 2000);
  if (tekst.length < 2) return 'Kirjuta sissekande tekst.';
  let kulu = null;
  if (b.kulu !== undefined && b.kulu !== null && b.kulu !== '') { kulu = hind(String(b.kulu)); if (kulu === null) return 'Vigane summa.'; }
  return { liik, tekst, kulu };
}
