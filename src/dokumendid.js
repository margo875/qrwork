// Seadme dokumendid (arve, tšekk, andmesilt…) ja pildilt lugemine (Margo 10.11.2026).
// Pildilt lugemine on üle võetud K | KODU-st (margo875/qrkodu avalik/_worker.js „tšeki lugemine“, Workers AI Llama 3.2 Vision):
// mudel annab ainult ETTEPANEKU, haldur kinnitab väljad ise. Puhtad funktsioonid, testitavad ilma Workerita.

export const AI_MUDEL = '@cf/meta/llama-3.2-11b-vision-instruct';
export const AI_PAEVAS = 50;              // pildilugemisi ööpäevas kokku (kulude piir)
export const AI_PILT_MAX = 1.5 * 1024 * 1024; // brauser vähendab pildi 1600 px-ni (~0,3–0,8 MB); baitide massiiv mudelile on mälus suur
export const DOK_MAX = 10 * 1024 * 1024;  // originaalfail (foto või PDF) hoidlasse
export const DOK_ARV_MAX = 30;            // dokumente seadme kohta
export const DOK_LIIGID = { arve: 'arve', tsekk: 'tšekk', andmesilt: 'andmesilt', garantii: 'garantii', juhend: 'kasutusjuhend', muu: 'muu' };
export const DOK_RE = /^d\/\d{6}\/\d{13}-[0-9A-Z]{6}\.(jpg|png|webp|pdf)$/;

// Faili tüüp sisu järgi (laiendit ega päist ei usaldata)
export function dokTyyp(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'pdf'; // %PDF-
  return null;
}
export const DOK_MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

export const AI_JUHIS = {
  arve: `You read a photo of a purchase receipt or invoice for a tool or measuring instrument (often Estonian: "Kuupäev" = date, "Summa"/"Kokku"/"Tasuda" = total, "KM" = VAT, "km-ta" = without VAT, "Seerianumber"/"S/N" = serial number, "Garantii" = warranty).
Return ONLY one JSON object, no other text, with exactly these keys:
{"nimi": product name (the main or most expensive item, short, as printed), "tootja": manufacturer or brand, "mudel": model designation, "seerianr": serial number if printed, "ost_hind": price of that item WITHOUT VAT as a number (if only the total with VAT is printed, use null), "ost_hind_km": price of that item incl. VAT as a number, "ost_muuja": seller or shop name, "ost_kuupaev": purchase date as YYYY-MM-DD, "garantii_kuni": warranty end date as YYYY-MM-DD only if printed}.
Use null for anything you cannot read with confidence. Do not guess.`,
  andmesilt: `You read a photo of the rating plate / nameplate / type label of a tool, machine or measuring instrument (manufacturer label with model, serial number, voltage, year).
Return ONLY one JSON object, no other text, with exactly these keys:
{"nimi": short product name in Estonian if obvious (e.g. "nivelliir", "laserkaugusmõõtja", "akutrell"), else as printed, "tootja": manufacturer or brand, "mudel": model or type designation, "seerianr": serial number (S/N, Ser. No., Nr.), "aasta": year of manufacture as 4 digits}.
Use null for anything you cannot read with confidence. Do not guess.`,
};

/** Mudeli vastusest JSON-objekt (vastus võib olla tekst koos selgitusega või juba objekt). */
export function aiJson(v) {
  const r = v && typeof v === 'object' && 'response' in v ? v.response : v;
  if (r && typeof r === 'object') return r;
  const t = String(r ?? '');
  for (let a = t.indexOf('{'); a >= 0; a = t.indexOf('{', a + 1)) {
    let sygavus = 0, jutus = false, kaldk = false;
    for (let i = a; i < t.length; i++) {
      const c = t[i];
      if (jutus) { if (kaldk) kaldk = false; else if (c === '\\') kaldk = true; else if (c === '"') jutus = false; continue; }
      if (c === '"') jutus = true;
      else if (c === '{') sygavus++;
      else if (c === '}' && --sygavus === 0) {
        try { const o = JSON.parse(t.slice(a, i + 1)); if (o && typeof o === 'object' && !Array.isArray(o)) return o; } catch { /* järgmine plokk */ }
        break;
      }
    }
  }
  return {};
}

/** Hind tekstist või arvust: „1 299,90 €” → 1299.9; vigane, null või negatiivne → null. */
export function hindArvuks(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 && v < 1e7 ? Math.round(v * 100) / 100 : null;
  if (typeof v !== 'string') return null;
  if (!/^[\s\d.,€-]*(eur|eurot)?\s*$/i.test(v)) return null; // tähed (nt „1e3“) → vigane
  let s = v.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s) || s.startsWith('-')) return null;
  const viimane = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (s.includes(',') && s.includes('.')) s = s.slice(0, viimane).replace(/[.,]/g, '') + '.' + s.slice(viimane + 1);
  // üks eraldaja: punkt + 3 numbrit = tuhanded („1.299“), koma = alati kümnendkoht (Eesti kirjaviis: „12,345“ → 12,35 €);
  // mitu sama eraldajat („1.299.000“) = tuhanded
  else if (viimane >= 0) {
    const ks = s.split(/[.,]/).length - 1, kum = s[viimane] === ',';
    s = ks > 1 || (!kum && /^\d{3}$/.test(s.slice(viimane + 1))) ? s.replace(/[.,]/g, '') : s.slice(0, viimane).replace(/[.,]/g, '') + '.' + s.slice(viimane + 1);
  }
  const n = Number(s);
  return hindArvuks(Number.isFinite(n) ? n : NaN);
}

const tekst = (v, max) => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const x = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return x && !/^(null|none|n\/a|unknown|-+|\?+|teadmata)$/i.test(x) ? x : null;
};
const kp = (v, tana) => {
  const x = tekst(v, 10);
  return x && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && x >= '1980-01-01' && x <= tana ? x : null;
};

/** Mudeli ettepanek → kontrollitud väljad (vigane või puuduv = null). tana = AAAA-KK-PP; garantii võib olla tulevikus. */
export function dokValjad(o, liik, tana) {
  o = o && typeof o === 'object' ? o : {};
  const v = { nimi: tekst(o.nimi, 80), tootja: tekst(o.tootja, 60), mudel: tekst(o.mudel, 60), seerianr: tekst(o.seerianr, 60) };
  if (liik === 'andmesilt') {
    const a = tekst(o.aasta, 4);
    v.aasta = a && /^\d{4}$/.test(a) && +a >= 1950 && +a <= +tana.slice(0, 4) ? a : null;
    return v;
  }
  v.ost_hind = hindArvuks(o.ost_hind);
  const km = hindArvuks(o.ost_hind_km);
  v.ost_hind_km = km;
  v.ost_muuja = tekst(o.ost_muuja, 80);
  v.ost_kuupaev = kp(o.ost_kuupaev, tana);
  const g = tekst(o.garantii_kuni, 10);
  v.garantii_kuni = g && /^\d{4}-\d{2}-\d{2}$/.test(g) && !Number.isNaN(Date.parse(g)) && g >= '1980-01-01' && g <= '2100-12-31' ? g : null;
  return v;
}
