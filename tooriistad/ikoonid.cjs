// Krativara PWA ikoonid (10.11.2026, K | KODU ikooni põhjal: margo875/qrkodu tooriistad/ikoonid.cjs): sama kujundus kui Leia mind halduse ikoonil (margo875/leiamind kujundus/ikoonid.cjs, 03.11.2026),
// siin „KRATIVARA“. Hele pind, tume Kindaveli K-märk (logokomplekt v3, kindavel-favicon.svg kuju), punane täpp, ümarad nurgad.
// Käivita: node tooriistad/ikoonid.cjs  → kirjutab src/ikoonid.js (base64). Vajab Playwrighti chromiumi.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const fondid = fs.readFileSync(path.join(R, 'src', 'fondid.js'), 'utf8');
const FONT = 'data:font/woff2;base64,' + /'instrument-sans-latin\.woff2': '([^']+)'/.exec(fondid)[1];
const PIND = '#FAF9F6', MARK = '#1C1C1A', TAPP = '#A33B20';
const TEKST = 'KRATIVARA';

const K = `<rect x="20" y="16" width="18" height="68" rx="9" fill="${MARK}"/>
<path d="M38 50 Q48 25 66 25" fill="none" stroke="${MARK}" stroke-width="18" stroke-linecap="round"/>
<path d="M38 50 Q48 75 66 75" fill="none" stroke="${MARK}" stroke-width="18" stroke-linecap="round"/>
<circle cx="80" cy="50" r="9" fill="${TAPP}"/>`;

function svg(mask) {
  const rx = mask ? 0 : 22;
  // Margo 03.11.2026: KODU 30 % K-le lähemale (vahe 16,2 → 11,3 / maskable 11,4 → 8,0), kogum keskel
  const s = mask ? 0.58 : 0.72, y = mask ? 15.7 : 6.45;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
<defs><style>@font-face{font-family:IS;src:url(${FONT});font-weight:400 700}</style>
<clipPath id="c"><rect width="100" height="100" rx="${rx}"/></clipPath></defs>
<g clip-path="url(#c)"><rect width="100" height="100" fill="${PIND}"/>
<g transform="translate(${50 - 50 * s - 2.5 * s} ${y}) scale(${s})">${K}</g>
<text x="50" y="${mask ? 78.3 : 85.6}" text-anchor="middle" font-family="IS" font-weight="600" font-size="${mask ? 7.4 : 9}" letter-spacing="${mask ? 1 : 1.2}" fill="${MARK}">${TEKST}</text></g></svg>`;
}

// Manifest kasutab sama faili nii „any“ kui ka „maskable“ jaoks, seega kõik ikoonid on maskable-kujul (märk ohutsoonis, pind servani).
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const v = {};
  for (const [s, nimi] of [[192, 'IKOON_192'], [512, 'IKOON_512'], [180, 'IKOON_180']]) {
    const p = await b.newPage({ viewport: { width: s, height: s }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><html><body style="margin:0;width:${s}px;height:${s}px;background:transparent">${svg(1)}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    v[nimi] = (await p.screenshot({ omitBackground: true })).toString('base64');
    await p.close();
  }
  await b.close();
  fs.writeFileSync(path.join(R, 'src', 'ikoonid.js'), '// Rakenduse ikoonid (PWA, avakuva): Kindaveli K-märk + KRATIVARA, hele pind (nagu K | KODU). Genereeritud: node tooriistad/ikoonid.cjs\n' +
    Object.entries(v).map(([k, x]) => `export const ${k} = '${x}';`).join('\n') + '\n');
})();
