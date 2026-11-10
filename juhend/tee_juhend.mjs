// Kasutusjuhend PDF-iks: node juhend/tee_juhend.mjs  (vajab Playwrighti chromiumi; CHROME=/tee/chrome)
// Fondid võetakse src/fondid.js-ist (kaust juhend/fondid/ on .gitignore'is). Kuvad: juhend/kuvad/ (näidisandmed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { FONDID } from '../src/fondid.js';
import { VERSIOON } from '../src/versioon.js';
const K = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(K, 'fondid'), { recursive: true });
for (const [n, b] of Object.entries(FONDID)) fs.writeFileSync(path.join(K, 'fondid', n), Buffer.from(b, 'base64'));
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const p = await b.newPage();
await p.goto('file://' + path.join(K, 'kasutusjuhend.html'));
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
const valja = path.join(K, `Krativara_kasutusjuhend_v${VERSIOON}.pdf`);
await p.pdf({ path: valja, preferCSSPageSize: true, printBackground: true });
await b.close();
console.log(valja);
