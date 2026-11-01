# QR-digivõti (investorinäidis)

Töötav näidis kontseptsioonist `../docs/KONTSEPTSIOON_QR_digivoti.md` (p 1–3): üks kasutajate andmebaas ja üks telefoni
veebileht, millega töötaja avab uksi, ostab automaadist (summa peetakse palgast kinni), kasutab seadmeid ja tööautot.
Haldur näeb logi reaalajas, lõpetab töösuhte ühe nupuga ja laeb kuu lõpus aruanded raamatupidamisse.

**Eraldi projekt.** Ei impordi repo juurkausta tööriistade registrist (`../src`) midagi. QR-generaator ja jsQR on
kopeeritud kausta `src/` (päises päritolu ja litsents: MIT ja Apache-2.0). Sõltuvusi (npm) pole.

## Mis on sees

| Osa | Fail | Sisu |
|---|---|---|
| Worker | `src/worker.js` | lehed, CSP nonce'iga, IP ainult soolatud räsina, `/api/*` → Durable Object |
| Durable Object `Digivoti` | `src/voti.js` | kasutajad, kutsed, sessioonid, objektid, õigusreegel, muutuv QR, releekäsud, ostud, kasutused, aruanded |
| Lehed | `src/lehed.js` | kasutaja rakendus `/`, `/O/<kood>`, `/kutse`; haldus `/admin`; ukse ekraan `/ekraan/<kood>`; demolukk `/demo/uks/<kood>`; demoautomaat `/demo/automaat/<kood>` |
| Riistvara | `riistvara/shelly_skript.js` | Shelly Gen2+ skript, mis pollib releekäsku (**päris seadmel proovimata**) |
| Testid | `test/*.test.js` | 22 testi (õigused, ajaaken, muutuv QR, relee, töösuhte lõpp, ost ja kuuaruanne, CSRF, haldus; `kontroll.test.js`: ründekatsed) |
| Kohalik server | `test/kohalik_server.mjs` | sama `worker.fetch`, mälus andmed, ilma wranglerita |
| Brauseritest | `test/brauser_demo.mjs` | Playwright: kogu demo stsenaarium läbi (ei ole `npm test`-i osa) |

### Funktsioonid
1. **Kasutajad ja rühmad:** haldur loob kasutaja (nimi, telefon, rühmad) → kutselink/QR (7 päeva, ühekordne; token on
   URL-i `#`-osas, seega ei jõua serveri logidesse). Kasutaja valib PIN-i/parooli (≥ 6 märki), telefon jääb sisse logituks
   (HttpOnly küpsis 180 päeva). Uus kutse (kadunud telefon) muudab vanad sessioonid kohe kehtetuks.
2. **Objektid:** uks, automaat, seade (arvuti/printer), auto. 12-märgine kood, QR `/O/<kood>`, lubatud rühmad
   (`*` = kõik), valikuline ajaaken (nt E–R 07:00–19:00, Eesti aja järgi).
3. **Uks:** skänn → õigus → logi → releele ühekordne käsk „ava N s“. Relee (Shelly/ESP32) **küsib** ise
   `POST /api/relee/<kood>` seadmetokeniga (`Authorization: Bearer …`); võetud käsk kustutatakse, 20 s vanust ei täideta.
4. **Muutuv QR:** uksel valikuline režiim; `/ekraan/<kood>` näitab iga 30 s uut koodi (HMAC-SHA256 objekti saladusest ja
   ajaaknast, nagu TOTP). Kehtib praegune ja eelmine aken (≤ 60 s); staatilise koodiga sellist ust ei ava.
5. **Automaat:** tootevalik → kinnitus → ost (hind sentides, täisarv; ostu hind fikseeritakse ostuhetkel) → releele „väljasta“.
   Kui automaat käsku 20 s jooksul ei võta (võrgust väljas) või töösuhe lõpetatakse enne väljastamist, ost tühistatakse
   (logis `ost_tuhistatud`) ja palgast ei peeta kinni. Kui käskude järjekord on täis (10), uut ostu ei tehta (503).
6. **Seade/auto:** „Alusta kasutust“ / „Lõpeta“; autol odomeetri näit alguses ja lõpus (ei saa olla väiksem eelmisest) ja eesmärk.
7. **Töösuhte lõpp:** üks nupp → kasutaja peatatud, kõik sessioonid ja kutsed kehtetud, ootel releekäsud tühistatud,
   pooleli kasutused lõpetatud märkusega. Ükski objekt enam ei avane (testitud).
8. **Kuuaruanne:** kinnipidamised töötaja kaupa, ostud ridadena, sõidupäevik, läbipääsulogi, seadmete kasutus —
   CSV (semikoolon, UTF-8 BOM, CRLF, koma kümnendmärgina; valemi süstimise kaitse).
9. **Haldus `/admin`:** reaalajas logi (pollib 2 s), kasutajad, objektid (QR-sildi print, seadmetoken), tooted, aruanded,
   „Loo demoandmed“ ja „Kustuta kõik andmed“.
10. **Kasutaja avaleht:** minu ostud sel kuul (summa), pooleli kasutused, minu ligipääsud, QR-skanner (BarcodeDetector,
    varuks jsQR), käsitsi koodi sisestus.

### Turvapõhimõtted (sama muster nagu juurprojektis)
CSP nonce'iga (välist koodi ei laeta), HttpOnly + Secure + SameSite=Lax küpsis, iga kasutaja-API nõuab päist `X-QW: 1`
(CSRF), haldus ainult `Authorization: Bearer ADMIN_TOKEN` (≥ 16 märki), paroolid PBKDF2-SHA256, sessiooni-, kutse- ja
seadmetokenid hoitakse ainult räsina, IP ainult soolatud räsina (piirangute jaoks), vigaste katsete piirangud.
Muutuva QR-i saladus ja seadmetokeni räsi ei lähe halduse vaatesse.

## Käivitamine

Testid (Node 22+): `cd digivoti && npm test`

Kohalik proov ilma wranglerita (andmed mälus):
```
cd digivoti
ADMIN_TOKEN=vali-pikk-voti-123456 node test/kohalik_server.mjs
# ava http://localhost:8787/admin
```

Cloudflare'i kohalik arendus: loo `digivoti/.dev.vars` (gitignore'is) ridadega `ADMIN_TOKEN=…` ja `TOKEN_SECRET=…`, siis
`cd digivoti && npx wrangler dev`. Avaldamine (`npx wrangler deploy`) ainult Margo otsusel; domeen on Margo otsus,
seni `workers_dev = true`. Saladused: `npx wrangler secret put ADMIN_TOKEN` ja `TOKEN_SECRET`.

Brauseritest (kohalik server peab töötama): `ADMIN_TOKEN=… VALJUND=/kaust node test/brauser_demo.mjs`

## Demo stsenaarium (5 min)
1. Suur ekraan: `/admin` → **Demo** → „Loo demoandmed“. Ava „Demolukk“ (Kontori välisuks), „Demoautomaat“ (Kohviautomaat)
   ja „Ekraan“ (Lao uks) eraldi akendes.
2. Telefon: skänni Mari Maasika kutse-QR → vali PIN → avaleht.
3. Skänni Kontori ukse QR (sildi print: Objektid → QR-silt) → telefonis „Uks on avatud“, demolukk näitab **AVATUD**.
4. Skänni kohviautomaadi QR → Latte → Kinnita → demoautomaat väljastab, telefonis kuu summa.
5. Jüri Juurikas skännib lao ukse ekraanilt muutuva QR-i → avaneb (E–R 07–19); foto koodist 2 minutit hiljem ei ava.
6. Haldur: Reaalajas logi → Kuuaruanne (CSV raamatupidamisse) → Kasutajad → Mari „Töösuhe lõppes“.
7. Mari skännib ukse QR uuesti → telefon on välja logitud, sisse ei saa, lukk jääb kinni.

NB: demos on lao uksel ajaaken E–R 07:00–19:00 (näitab ajaakna reeglit). Õhtul või nädalavahetusel keelab see ukse —
demo jaoks muuda ajaaken halduses (Objektid → Muuda) või võta linnuke ära.

## Mis on kontrollimata / tegemata
- **Riistvara:** Shelly skript ja päris relee/lukk on proovimata; demolukk ja -automaat on veebilehed, mis kasutavad sama
  releeliidest. Kui demoleht ja päris seade küsivad sama objekti käske, saab käsu see, kes küsib esimesena.
- **Pollimine 1 s** tähendab iga relee kohta ~86 400 päringut ööpäevas: Cloudflare'i tasuta plaani piir (100 000/päev) ei
  kanna rohkem kui ühte seadet. Tootmises: WebSocket (DO hibernation) või MQTT. Hind ja piirangud **[KONTROLLIMATA]**.
- `npx wrangler dev` ja deploy ei ole selles keskkonnas proovitud (testitud Node'i testide ja kohaliku serveriga).
- Muutuva QR-i kood kehtib kuni 60 s ja ei ole ühekordne; ekraan vajab internetti. Staatilise kleebisega ust saab avada
  kleebise fotolt (vt kontseptsioon p 1).
- Puudu: kasutaja ise parooli taastus (haldur saadab uue kutse), külalise ajutine link, raamatupidaja roll, broneeringud,
  MDB-liides, XLSX ja Meriti/Directo formaat, mitme firma tugi, tuletõrjesignaali ühendus.
- Õiguslik pool (palgast kinnipidamise nõusolek, erisoodustus, GDPR, tuleohutus) on kontseptsioonis märgitud
  **[KONTROLLIMATA]**; näidis neid ei lahenda.

## Kontrolli tähelepanekud (sõltumatu kontroll 01.11.2026)

Parandatud (ERROR, igaühel test `test/kontroll.test.js`):
1. **Sisselogimise piirang oli samaaegsete päringutega möödapääsetav** (vigane katse loeti alles pärast PBKDF2-d; 25
   paralleelset PIN-i läksid kõik läbi). Nüüd loetakse katse enne räsi arvutamist, õnnestumisel vabastatakse.
2. **Kutse ei olnud samaaegsete päringute korral ühekordne** (kaks paralleelset kasutust said mõlemad sessiooni).
   Nüüd võetakse kutse sünkroonselt ja kustutatakse enne PBKDF2-d.
3. **Uus kutse (kadunud telefon) ei sulgenud vana telefoni sessiooni** enne, kui uus kutse kasutati (kuni 7 päeva).
   Nüüd kustutatakse sessioonid kutse loomisel.
4. **Ost jäi palgast kinnipidamisse, kui automaat ei väljastanud**: käsk aegus võtmata (automaat võrgust väljas), töösuhte
   lõpp tühistas käsu või täis järjekord viskas vanema käsu ära. Nüüd ost tühistatakse; täis järjekorraga ostu ei tehta.

MINOR (parandamata, otsus või tootmisetapi töö):
- Muutuva QR-i kood ei ole ühekordne: kehtib ≤ 60 s kõigile sama ukse õigusega kasutajatele (ekraani foto saab kolleegile
  saata). Tootmises: kood ühekordseks + ekraan uueneb kohe pärast kasutust või BLE/NFC kohaloleku kontroll.
- Relee ja ukseekraan kasutavad sama seadmetokenit: ukse juures oleva tahvli token võimaldab releekäske „ära võtta“
  (uks ei avane). Soovitus: eraldi tokenid.
- Vigaste katsete loendurid on DO mälus (taaskäivitus nullib). Seadme ja halduse piirang kontrollitakse enne autentimist,
  seega sama IP taga (kontori NAT) olev ründaja saab õige relee/halduri 15 min lukustada; telefoni piirang (8/15 min)
  võimaldab lukustada konkreetse kasutaja sisselogimise.
- Sisselogimise vastuse aeg paljastab, kas telefon on registreeritud (tundmatule ei arvutata PBKDF2-d).
- `/api/objekt` näitab õiguseta kasutajale objekti nime, tooted ja seadme hetkekasutaja nime (koodid on niikuinii sildil).
- Ajaaken üle kesköö (nt 22:00–06:00) ei ole toetatud (algus < lõpp).
- Auto: töösuhte lõpul lõpetatud sõidu järel jääb `odo_viimane` vanaks; lõpunäidu hüppel pole mõistlikku ülempiiri.
- Logi, aegunud kutsed ja ostud kasvavad piiramatult; `uusSessioon` ja `kustutaSessioonid` loevad kõik sessioonid (sobib
  näidisele, mitte sadadele töötajatele).
- Ost tühistatakse ainult siis, kui käsk jäi võtmata. Kui relee võttis käsu, aga automaat ei väljastanud (MDB viga),
  kinnitust ei küsita – tootmises vaja seadme väljastuskinnitust. Kasutaja telefon näitab „Väljastan“ ka siis, kui
  automaat on võrgust väljas (ost tühistub 20 s pärast, kasutajale eraldi teadet ei tule).
- Kuuaruanne: seadme ja auto kasutus läheb alguskuu alla; kuu vahetusel pooleli sõit ilmub alles pärast lõppu.
- Halduse tooteloendis võib anda korduva toote id (ost valib esimese); peatatud kasutaja taastamisel jääb vana PIN kehtima.
- CSP lubab `style-src 'unsafe-inline'`; halduse võti on brauseri `sessionStorage`-is (XSS-i korral leketav; XSS-i ei
  leitud: kõik nimed läbivad `esc()`, URL-i parameetrid puhastatakse serveris).
- Kontrollitud ja korras: hind ja kogus ainult serverist, IDOR (mina, kasutuse lõpetamine), relee ilma õiguseta, seadmetoken
  ja ühekordne käsk, võltsitud `X-IP-Rasi` kirjutatakse üle, ajaaken Europe/Tallinn (ka suveaeg), CSV valemikaitse
  (`= + - @` tab, CR), admin-tokeni ajastuskindel võrdlus, CSRF päis `X-QW`, töösuhte lõpp tühistab kõik sessioonid.
