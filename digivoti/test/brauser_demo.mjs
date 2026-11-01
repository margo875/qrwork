// Brauseritest (Playwright, chromium): demoandmed → kutse → ukse avamine → automaadi ost → töösuhte lõpp → uks ei avane.
// Eeldab, et kohalik server töötab: ADMIN_TOKEN=... node test/kohalik_server.mjs
// Käivitus: ADMIN_TOKEN=... VALJUND=/kaust node test/brauser_demo.mjs   (ei ole osa npm test'ist)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BAAS = process.env.BAAS || 'http://localhost:8787';
const TOK = process.env.ADMIN_TOKEN;
const OUT = process.env.VALJUND || '.';
const pilt = (p, nimi) => p.screenshot({ path: `${OUT}/digivoti_${nimi}.png`, fullPage: true });
const kontroll = (tingimus, tekst) => { if (!tingimus) throw new Error('EBAÕNNESTUS: ' + tekst); console.log('OK  ' + tekst); };

const b = await chromium.launch();
const adminCtx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const telCtx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const ekraanCtx = await b.newContext({ viewport: { width: 900, height: 700 } });
const vead = [];
// 401/403 vastused on oodatud (keelatud sisselogimine), need ei ole lehe vead
for (const c of [adminCtx, telCtx, ekraanCtx]) c.on('page', (p) => { p.on('pageerror', (e) => vead.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/status of 40[13]/.test(m.text())) vead.push(m.text()); }); });

// 1. Haldus: demoandmed
const ad = await adminCtx.newPage();
ad.on('dialog', (d) => d.accept());
await ad.goto(BAAS + '/admin');
await ad.fill('#tok', TOK); await ad.click('#sisse');
await ad.click('[data-t="demo"]');
await ad.click('#loo');
await ad.waitForSelector('a.kutselink');
await pilt(ad, '01_admin_demo');
const kutse = await ad.getAttribute('a.kutselink[data-nimi="Mari Maasikas"]', 'href');
const lukk = await ad.locator('li', { hasText: 'Kontori välisuks' }).locator('a[href^="/demo/uks/"]').getAttribute('href');
const automaadid = [await ad.locator('li', { hasText: 'Kohviautomaat' }).locator('a[href^="/demo/automaat/"]').getAttribute('href'), await ad.locator('li', { hasText: 'Snäkiautomaat' }).locator('a[href^="/demo/automaat/"]').getAttribute('href')];
const ekraan = await ad.getAttribute('a[href^="/ekraan/"]', 'href');
const kontoriKood = lukk.split('/')[3].split('#')[0];
const kohviKood = automaadid[0].split('/')[3].split('#')[0];
kontroll(kutse && lukk && automaadid.length === 2 && ekraan, 'demoandmed loodud, kutse- ja seadmelingid olemas');

// 2. Simuleeritud lukk ja automaat (suur ekraan)
const lk = await ekraanCtx.newPage(); await lk.goto(BAAS + lukk);
const au = await ekraanCtx.newPage(); await au.goto(BAAS + automaadid[0]);
const ek = await ekraanCtx.newPage(); await ek.goto(BAAS + ekraan);
await lk.waitForFunction(() => document.querySelector('#olek').textContent.includes('Ühendatud'));
kontroll((await lk.textContent('#silt')) === 'LUKUS', 'demolukk on lukus ja ühendatud');
await ek.waitForSelector('#qr svg');
await pilt(ek, '02_ekraan_muutuv_qr');

// 3. Telefon: kutse → PIN
const tel = await telCtx.newPage();
await tel.goto(kutse);
await tel.waitForSelector('#p1');
await tel.fill('#p1', '123456'); await tel.fill('#p2', '123456');
await pilt(tel, '03_tel_kutse');
await tel.click('#ok');
await tel.waitForSelector('#skan');
await pilt(tel, '04_tel_avaleht');
kontroll((await tel.textContent('.pais')).includes('Mari Maasikas'), 'kutse kasutatud, telefon sisse logitud');

// 4. Ukse avamine (QR-koodi URL nagu telefoni kaamerast)
await tel.goto(BAAS + '/O/' + kontoriKood);
await tel.waitForSelector('#tul');
await pilt(tel, '05_tel_uks_avatud');
kontroll((await tel.textContent('#tul')).includes('Uks on avatud'), 'telefonis: uks avatud');
await lk.waitForFunction(() => document.querySelector('#silt').textContent === 'AVATUD', null, { timeout: 5000 });
await pilt(lk, '06_demolukk_avatud');
kontroll((await lk.textContent('#kes')).includes('Mari'), 'demolukk sai releekäsu ja näitab AVATUD');

// 5. Automaadi ost (käsitsi koodiga avalehelt)
await tel.click('#tagasi'); await tel.waitForSelector('#kas');
await tel.fill('#kas', kohviKood); await tel.click('#kasok');
await tel.waitForSelector('[data-t]');
await tel.click('text=Latte'); await tel.waitForSelector('#jah');
await pilt(tel, '07_tel_automaat_kinnitus');
await tel.click('#jah'); await tel.waitForSelector('#tul');
await pilt(tel, '08_tel_ost_tehtud');
kontroll((await tel.textContent('#tul')).includes('2,00'), 'ost tehtud (Latte 2,00 €)');
await au.waitForFunction(() => document.querySelector('#ekr').textContent.includes('Latte'), null, { timeout: 5000 });
await au.waitForTimeout(1000);
await pilt(au, '09_demoautomaat_valjastab');
kontroll(true, 'demoautomaat väljastas Latte');
await tel.click('#tagasi'); await tel.waitForSelector('#kuusumma');
kontroll((await tel.textContent('#kuusumma')).includes('2,00'), 'avalehel kuu ostude summa 2,00 €');
await pilt(tel, '10_tel_avaleht_ostuga');

// 6. Haldus: logi ja kuuaruanne
await ad.click('[data-t="logi"]'); await ad.waitForSelector('#lg tr');
await ad.waitForTimeout(500);
await pilt(ad, '11_admin_logi');
await ad.click('[data-t="aruanded"]'); await ad.waitForSelector('[data-csv]');
await pilt(ad, '12_admin_kuuaruanne');
const [dl] = await Promise.all([ad.waitForEvent('download'), ad.click('[data-csv="kinnipidamised"]')]);
const fs = await import('node:fs');
await dl.saveAs(`${OUT}/digivoti_kinnipidamised.csv`);
const sisu = fs.readFileSync(`${OUT}/digivoti_kinnipidamised.csv`);
kontroll(sisu[0] === 0xef && sisu[1] === 0xbb && sisu[2] === 0xbf && sisu.toString('utf8').includes('Mari Maasikas;') && sisu.toString('utf8').includes('2,00'), 'kinnipidamiste CSV (BOM, semikoolon, 2,00)');

// 7. Töösuhte lõpp
await ad.click('[data-t="kasutajad"]'); await ad.waitForSelector('[data-peata]');
const rida = ad.locator('tr', { hasText: 'Mari Maasikas' });
await rida.locator('[data-peata]').click();
await ad.waitForSelector('#k_tul .ok');
await pilt(ad, '13_admin_toosuhe_lopp');
kontroll((await ad.textContent('#k_tul')).includes('peatatud'), 'haldur: Mari peatatud');

// 8. Uks enam ei avane
await tel.goto(BAAS + '/O/' + kontoriKood);
await tel.waitForSelector('#sisse');
await pilt(tel, '14_tel_peale_toosuhte_loppu');
kontroll(true, 'telefon on välja logitud (sisselogimise vorm)');
await tel.fill('#tel', '5000 0001'); await tel.fill('#par', '123456'); await tel.click('#sisse');
await tel.waitForSelector('#v .viga');
kontroll((await tel.textContent('#v')).includes('peatatud'), 'uuesti sisse ei saa: konto peatatud');
await pilt(tel, '15_tel_sisselogimine_keelatud');
await lk.waitForTimeout(2500);
kontroll((await lk.textContent('#silt')) === 'LUKUS', 'demolukk jäi lukku');

// 9. Muutuv QR: Jüri (Ladu) skännib ekraanilt. Ajaaken E–R 07–19: väljaspool seda on oodatud keeld.
const kutseJyri = await ad.evaluate(() => JSON.parse(sessionStorage.getItem('dv_kutsed')).find((k) => k.nimi.startsWith('Jüri')).kutse);
const tel2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 })).newPage();
await tel2.goto(BAAS + '/kutse#' + kutseJyri); await tel2.waitForSelector('#p1');
await tel2.fill('#p1', '654321'); await tel2.fill('#p2', '654321'); await tel2.click('#ok'); await tel2.waitForSelector('#skan');
await tel2.goto(await ek.getAttribute('#qr', 'data-url')); await tel2.waitForSelector('#tul');
const t2 = await tel2.textContent('#tul');
await pilt(tel2, '16_tel_muutuv_qr');
kontroll(t2.includes('Uks on avatud') || t2.includes('Ligipääs ainult E–R'), 'muutuv QR ekraanilt: ' + (t2.includes('avatud') ? 'uks avatud' : 'ajaaken keelas (väljaspool E–R 07–19)'));
await tel2.goto(BAAS + '/O/' + (await ek.getAttribute('#qr', 'data-url')).split('/O/')[1].split('?')[0]); await tel2.waitForSelector('#tul');
kontroll(!(await tel2.textContent('#tul')).includes('avatud'), 'sama uks ilma muutuva koodita ei avane: ' + (await tel2.textContent('#tul')).trim());

kontroll(vead.length === 0, 'brauseri konsoolis vigu pole' + (vead.length ? ': ' + vead.join(' | ') : ''));
await b.close();
