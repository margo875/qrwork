# QR-digivõti: tehniline lahendus ja seadmete loetelu (teoreetiline)

**Versioon:** v0.1, 01.11.2026, Ehitusinsener (pilves). **Alus:** `docs/KONTSEPTSIOON_QR_digivoti.md`. **Õiguslik pool** (kohustuslikkus, load, tuleohutuse sätted, isikuandmed): Nõuniku `docs/OIGUSLIK_RAAMISTIK_digivoti.md` ja `advisor/teadmised/tuleohutuse_kontroll.md`; siin märgitud „→ Nõunik“.

**Märgid:** [evs 01.11.2026] = standardi olek kontrollitud evs.ee-st (`advisor/tooriistad/evs_staatus.py`) 01.11.2026; standardite **teksti ei ole loetud** (litsents, Margo ketas), seega standardi sisu kohta käiv väide on [KONTROLLIMATA], kui pole märgitud teisiti. [HINNANG] = inseneri hinnang või turuhinna suurusjärk (kuulutused 11.2026, käibemaksuga, mitte pakkumine). Tootjanimed on näited, mitte soovitused.

**Kasutatud standardid ja olek [evs 01.11.2026]:**

| Tähis | Teema | Olek |
|---|---|---|
| EVS-EN 13637:2015 | elektriliselt juhitavad väljapääsusüsteemid evakuatsiooniteel | kehtiv |
| EVS-EN 179:2008 | avariiväljapääsu sulused (käepide/surunupp), inimesed tunnevad väljapääsu | kehtiv |
| EVS-EN 1125:2008 | paanikasulused (põikpuu), avalik kasutus | kehtiv |
| EVS-EN 14846:2008 | elektromehaanilised lukud ja vastuplaadid | kehtiv |
| EVS-EN 12209:2025 | mehaanilised lukud ja vastuplaadid (2016 kehtetu 03.02.2025) | kehtiv |
| EVS-EN 16034:2014 | tuletõkke- ja suitsutõkkeuste tootestandard | kehtiv |
| EVS-EN 13501-2:2023 | tulepüsivuse klassifikatsioon (EI, S_a, S_200, C) | kehtiv |
| EVS-EN 1154:1999, EVS-EN 1155:1999 | uksesulgurid; elektrilised kinnihoidjad | kehtivad |
| EVS-EN 14600 | tuletõkke-/suitsuuste ja avatavate akende nõuded (hooldus, lisa C) | evs.ee-st ei leitud aastaga 2005/2006 [KONTROLLIMATA] |
| EVS 871:2017 | tuletõkke- ja evakuatsiooniuste ning suluste kasutamine | kehtiv; kavand prEVS 871 |
| EVS 812-7:2018 | tuleohutuse tüüplahendused | kehtiv; kavand |
| EVS-EN 54-2:1999, EVS-EN 54-4:1999 | TSS keskseade; TSS toiteseadmed | kehtivad |
| EVS-EN 60839-11-1:2013, -11-2:2015 | läbipääsusüsteemid: nõuded; rakendusjuhend | kehtivad |
| EVS-EN IEC 60839-11-5:2020 | läbipääsusüsteemid: OSDP | kehtiv |
| EVS-EN 50131-2-6:2008 | avamisandurid (magnetkontaktid) | kehtiv |
| EVS-EN 50131-6:2017+A1:2021 | valvesüsteemide toiteallikad | kehtiv |
| EVS-EN 60529:2001+A2:2014 | IP-kaitseastmed | kehtiv |
| EN 62262 (IK) | mehaanilise löögi kaitseaste | evs.ee-st ei leitud [KONTROLLIMATA] |
| EVS-HD 60364-5-52:2011+A11+A12+A1:2025 | juhistike valik ja paigaldus (pingelang lisa G) | kehtiv |
| EVS-HD 60364-4-41:2017+A12:2019 | kaitse elektrilöögi eest (SELV/PELV) | kehtiv |
| EVS-HD 60364-7-704:2018 | ehitusplatsi elektripaigaldis | kehtiv |
| EVS-EN 50173-1:2018 | struktuurkaabeldus | kehtiv |
| EVS-EN 12453:2017+A1:2021 | jõuajamiga väravate kasutusohutus | kehtiv (2017 põhitekst asendatud) |
| EVS-EN IEC 62368-1:2024+A11:2024 | IKT-seadmete ohutus (releed, ruuterid, toiteplokid) | kehtiv |
| MDB/ICP 4.2 (NAMA/EVA, 02.2011), 4.3 | automaadi ja maksemooduli siin | tööstusstandard, mitte EVS; 4.3 muutis ainult ptk 7 (cashless) (NAMA teade „NAMA Releases MDB Version 4.3“) |

---

## 1. Süsteemi arhitektuur

### 1.1 Plokkskeem
```
 [Telefon, PWA]                                    [Haldur, brauser]
   | HTTPS (TLS 1.2+), sessioon/WebAuthn              | HTTPS
   v                                                   v
 [Pilveserver: Cloudflare Worker + D1/Durable Object (qrwork laiendus)]
   - õigused, ajaaknad, logi, kuuaruanne
   - käsu allkiri (HMAC/Ed25519) + aegumine (nt 10 s) + nonce
   |  (1) MQTT üle TLS (8883) või WebSocket — kontroller hoiab ühendust ise (väljaminev)
   |  (2) varuna HTTPS-pollimine iga 2–5 s
   v
 [Kohalik võrk: kaabel-Ethernet/PoE eelistatult; Wi-Fi siseustel; 4G objektil]
   |   eraldi VLAN „läbipääs“, väljaminevad ühendused ainult serverisse
   v
 [Ukse kontroller / relee]  <-- Wiegand (≤ ~100 m) või OSDP RS-485 (≤ ~1000 m) --  [QR-lugeja, variant B]
   |  - offline-nimekiri (räsi + kehtivus), sündmuste puhver
   |  - sisendid: uksekontakt (reed), väljumisnupp, TSS-relee olek
   |  potentsiaalivaba kontakt (NO/NC), 12/24 V DC
   v
 [Lukk: vastuplaat / magnetlukk / mootorlukk]      [Automaat: MDB cashless / relee]
   ^
   |  TOITE KATKESTUS RIISTVARAS (ei sõltu tarkvarast):
   |  TSS keskseadme väljund (NC) --- roheline avariinupp (2-pooluseline) --- lukk
```
Põhimõte: **ohutusfunktsioon (vabastamine evakuatsiooniks) on juhtmega ja riistvaras**, pilv ja kontroller annavad ainult **lukustamise õiguse** [HINNANG; EVS-EN 13637:2015 süsteemi põhimõte, sisu KONTROLLIMATA].

### 1.2 Sideprotokollid
| Lõik | Protokoll | Miks / märkus |
|---|---|---|
| Telefon → server | HTTPS (TLS), PWA | paigaldust pole; telefon ei räägi kunagi otse releega (variant A) |
| Server → kontroller | MQTT üle TLS (port 8883), püsiühendus kontrollerist väljapoole | NAT/tulemüür ei vaja sissetulevat porti; latentsus < 1 s [HINNANG]. Cloudflare Workeril ei ole MQTT brokerit sisseehitatult → kas WebSocket Durable Objectisse või väline EL-i MQTT broker [KONTROLLIMATA, arendaja] |
| Varuna | HTTPS-pollimine 2–5 s (Shelly: RPC üle HTTP/WebSocket, „Outbound WebSocket“) | lihtsam, aga 2–5 s viivitus ja rohkem päringuid; Shelly Gen2+ RPC (tootja dokumendid shelly-api-docs) [KONTROLLIMATA versioon] |
| Lugeja → kontroller | Wiegand 26/34 bit | krüpteerimata, ühesuunaline, tüüpiline kaablipikkus kuni ~150 m [KONTROLLIMATA, tootja]; lugeja võib olla turvalisest poolest väljas → pealtkuulatav |
| Lugeja → kontroller | OSDP v2 üle RS-485 (EVS-EN IEC 60839-11-5:2020) | kahesuunaline, Secure Channel (AES-128), järelevalve (lugeja eemaldamine annab häire), RS-485 kuni ~1200 m [KONTROLLIMATA] — **välisuksel eelistada OSDP-d** |
| Kontroller → lukk | potentsiaalivaba relee kontakt | lukk oma toiteplokist; relee ei toida lukku läbi oma elektroonika |
| Automaat | MDB/ICP 4.2–4.3, 9-bitine jada, cashless-seade aadressil 10h (teine 60h) | MDB 3.0 muudatuste ajalugu: kaks cashless-aadressi 10h ja 60h [teisene allikas, KONTROLLIMATA 4.2 tekstist] |

### 1.3 Võrguühenduse kadumine (offline-režiim)
| Olukord | Variant A (telefon skannib) | Variant B (lugeja skannib telefoni TOTP-QR) |
|---|---|---|
| Kontrolleri internet kadus | **ei tööta** (käsk tuleb serverist); varuks: mehaaniline võti / PIN-klaviatuur / NFC-kaart halduritele | töötab: kontroller kontrollib TOTP-d **kohalikult** offline-nimekirja järgi (kasutaja ID + TOTP-saladus krüpteeritult või allkirjastatud luba) |
| Telefoni internet puudub | ei tööta | töötab (TOTP arvutatakse telefonis ilma võrguta) |
| Õiguse äravõtt (töösuhe lõppes) offline ajal | — | jõuab kontrollerisse alles ühenduse taastudes → offline-nimekirjal **lühike kehtivus** (nt 24 h); allkirjastatud loa aegumine [HINNANG] |
| Sündmuste logi | — | kontroller puhverdab (≥ 1000 sündmust) ja saadab hiljem; kellaaeg NTP + RTC (TOTP vajab kella täpsust ± 30 s) |
| Voolukatkestus | sõltub lukutüübist, p 2.1 | sama |
Soovitus: välisuksel ja ehitusobjektil **variant B** (offline-võimeline), siseustel variant A koos dünaamilise QR-iga (p 5) [HINNANG].

### 1.4 Toide
- **Pinge:** 12 V DC väikestel ustel ja demol; **24 V DC** pikkadel kaablitel ja mootorlukkudel (sama võimsuse korral pool voolu → pingelang neljandik). Ohutu väikepinge SELV/PELV (EVS-HD 60364-4-41:2017+A12:2019, sisu [KONTROLLIMATA]).
- **Toiteplokk akuga:** laadimispinge 13,8 V (12 V plii-AGM ootelaadimine) või 27,6 V; aku sügavtühjenemise kaitse, aku ja võrgu rikke väljund kontrollerisse. Valvesüsteemi toiteplokkide standard EVS-EN 50131-6:2017+A1:2021 (analoogiana; TSS-ile EVS-EN 54-4:1999).
- **UPS** ka ruuterile ja kommutaatorile — muidu kontroller on toitega, aga ilma võrguta (variant A ei tööta).

**Arvutus 1: aku varuaeg**
Valem: t = C · k / I, kus C = aku nimimahtuvus (Ah, 20 h tühjenemisel), k = kasutatav osa (vananemine ja sügavtühjenemise piir; 0,8 [HINNANG]; külmas −20…−25 °C lisaks ≈ 0,6 → k ≈ 0,48 [HINNANG, plii-aku tootjate temperatuurikõverad, KONTROLLIMATA]), I = keskmine ootevool (A).

| Juhtum | Koormus | I (A) | Aku | t (h) |
|---|---|---|---|---|
| a) Uks magnetlukuga (fail-safe, voolu all kogu aeg) | magnetlukk 0,50 A (12 V, tootja andmed nt Genway ZE-280: 500 mA/12 V) + QR-lugeja 0,25 A [HINNANG] + relee/kontroller 0,10 A (Shelly 1 Gen4 < 1,2 W) | 0,85 | 7,2 Ah | 7,2·0,8/0,85 = **6,8 h** |
| b) Uks vastuplaadiga (fail-secure, vool ainult avamisel) | lugeja 0,25 + kontroller 0,10; avamisi 100/päev × 5 s × 0,28 A = 0,04 Ah/päev (tühine) | 0,35 | 7,2 Ah | 7,2·0,8/0,35 = **16,5 h** |
| c) Sama kui a), aku 17 Ah | | 0,85 | 17 Ah | 17·0,8/0,85 = **16,0 h** |
| d) Ehituskonteiner −25 °C: kontroller 0,10 + lugeja 0,20 + 4G ruuter 0,35 (≈ 4 W) [HINNANG] | | 0,65 | 26 Ah | 26·0,48/0,65 = **19,2 h** |
Vajalik mahtuvus eesmärgist: C = I · t / k. Magnetlukuga uks 24 h: 0,85·24/0,8 = **25,5 Ah** → 26 Ah aku. Konteiner 72 h külmas: 0,65·72/0,48 = **97,5 Ah** → 100 Ah aku või päikesepaneel [HINNANG].
**Järeldus:** fail-safe lukk „sööb“ akut ja aku tühjenedes **avaneb** uks (turvarisk); fail-secure lukk jääb lukku (väljapääs peab olema mehaaniline). Kontrolleri kütteelement (konteineris) toidetakse 230 V-st, mitte akust.

---

## 2. Uks

### 2.1 Lukutüübid ja valik
| Lukk | Toimimine | Toite kadumisel | Sobib | Ei sobi / märkus |
|---|---|---|---|---|
| Elektriline vastuplaat **fail-secure** (pingevaba = lukus) | vastuplaadi riiv vabaneb pinge all | lukus; seest avatakse **mehaaniliselt** linkiga | sise- ja välisuksed, kus seestpoolt avamine on alati mehaaniline (link, EN 179 käepide) | — |
| Elektriline vastuplaat **fail-safe** (pingevaba = lahti) | vabastatud pingeta | lahti | evakuatsiooniteel, kui seest pole mehaanilist avamist | toite kadumine = uks lahti |
| Magnetlukk (alati fail-safe) | elektromagnet 280–500 kg hoidejõudu, voolu all kogu aeg | lahti | siseuksed, klaasuksed, kus muu lukk ei sobi | voolutarve pidev (p 1.4); hoidejõud ei ole sissemurdmiskindlus; tuletõkkeuksele ainult ukse tootja loal [KONTROLLIMATA] |
| Mootorlukk (elektromehaaniline kõrgturvalukk) | lukustab ise riivi, käepide seest alati avab | tavaliselt lukus, seest avatav (tootja seadistus) | välisuks, kõrgem turvaklass, ka evakuatsiooniteel koos EN 179/1125 | kallim; vajab ukse profiiliga sobivust; voolutipp 1–2 A lühiajaliselt [HINNANG, tootja] |
| Paanikasulus (EN 1125) / avariiväljapääsu sulus (EN 179) elektrilise juhtimisega | väljastpoolt elektriline, seest põikpuu/käepide mehaaniliselt | seest alati avatav | evakuatsiooniteel | valik EN 179 vs EN 1125 sõltub ruumi kasutajatest → **Nõunik** |
Viited: EVS-EN 14846:2008 (elektromehaanilised lukud ja vastuplaadid), EVS-EN 179:2008, EVS-EN 1125:2008, EVS-EN 13637:2015 (elektriliselt juhitav väljapääsusüsteem: lukk + juhtseade + avariinupp) [sisu KONTROLLIMATA]. Effeff kasutab tootjana mõistet „fail-locked“ (= fail-secure) (ASSA ABLOY effeff tootekataloog, 118S-seeria, 11.2026).

**Valikureegel [HINNANG]:**
1. Evakuatsiooniteel peab uks avanema seestpoolt **ühe liigutusega, ilma võtme ja telefonita** — eelistatult **mehaaniline** avamine (link/EN 179/EN 1125) + väljast elektriline vastuplaat fail-secure; siis TSS-i ja voolukatkestuse mõju on väike. Nõue ise → Nõunik (SiM m nr 17, `tuleohutuse_kontroll.md` „Evakuatsioon § 41–49“).
2. Kui seest mehaanilist avamist pole (magnetlukk, fail-safe vastuplaat), on vaja **EN 13637 süsteemi**: väljumisnupp + roheline avariinupp + TSS-vabastus + toite kadumisel lahti [KONTROLLIMATA, standardi tekst].
3. Kõrgema turvaga välisuksel: mootorlukk + OSDP lugeja (variant B).

### 2.2 Tuletõkkeuks ja evakuatsiooniuks
- **Tuletõkkeuks on testitud süsteem:** klass (nt EI 30, EI 60, lisatähised S_a, S_200, C) kehtib ainult katsetatud konfiguratsioonis (EVS-EN 13501-2:2023; tootestandard EVS-EN 16034:2014). Uue luku, vastuplaadi või magnetluku lisamine (freesimine, puurimine lengi/lehte) võib klassi kaotada (`ehitusinsener/teemad/tuleohutus.md`, jaotis 1 „Toimiv lahendus = testitud süsteem“).
- **Mida teha:** kasutada ainult **ukse tootja poolt sellesse ukse tüüpi lubatud** (katsetatud või klassifikatsiooni laiendusega kaetud) elektrilukku/vastuplaati; nõuda tootja kirjalikku kinnitust ja säilitada see ukse dokumentidega. Sulused vahetatakse ainult analoogses konstruktsioonis katsetatud suluse vastu; lukukorpused EN 12209 järgi (`tuleohutus.md` jaotis 2b, ET 0109-0789 p 13).
- **Sulgur ja suitsutihedus:** tuletõkkeuks peab isesulguma (sulgur EVS-EN 1154:1999; kinnihoidja EVS-EN 1155:1999, mis vabastab TSS-ist); hingedel tuletõkkeuks S_a, evakuatsiooniteele/trepikotta viiv S_200 — sätted Nõuniku failis (`tuleohutuse_kontroll.md`, rida „Tuletõkkeuksed“, SiM m nr 17 § 14 lg 4–7¹). **Elektrilukk ei tohi takistada sulgumist ega riivistumist:** vastuplaat peab lubama riivil sulguda ka pingevabalt (fail-secure) või tuletõkkeuksel kasutatakse „tulekindlat“ vastuplaati, mis tulekahjus hoiab riivi [KONTROLLIMATA, tootja].
- **Magnetlukk tuletõkkeuksel:** tihti ei ole katsetatud; lisaks on see fail-safe → tulekahju korral toide katkeb ja uks jääb sulguri hoida (riivistumata) → kontrolli, kas ukse klass seda lubab [KONTROLLIMATA] → Nõunik + ukse tootja.
- **Märgistus:** tuletõkkeukse märgistusplaati ei kata ega eemaldata (`tuleohutus.md` 2b, ET 0109-0789 p 12).

### 2.3 Tulekahjusignalisatsiooni (TSS) ühendus
```
 TSS keskseade (EVS-EN 54-2) väljund "häire" (potentsiaalivaba, NC tavaolekus suletud)
    |
 [DIN-relee K1, NC kontakt] --+-- roheline avariinupp (2-pooluseline, NC) --+-- [+] lukk (fail-safe)
                              |                                               |
 toiteplokk 13,8 V ----------+                                               +-- [-]
 kontrolleri relee (luba lukustada) jadamisi samas ahelas
```
- TSS **katkestab luku toite otse** (jadamisi), mitte kontrolleri tarkvara kaudu; ka TSS-kaabli katkemine või keskseadme rike = vabastus (NC loogika) [HINNANG, fail-safe põhimõte].
- Fail-secure lukuga uksel TSS-vabastus ei aita (pingevaba = lukus) → seal peab väljapääs olema mehaaniline.
- Kontroller loeb TSS-releed **olekusisendina**, logib „TSS vabastus“ ja saadab pilve teate; pilv ei saa TSS-vabastust tühistada.
- Kes tohib TSS keskseadme väljundit programmeerida ja kas see on kohustuslik → **Nõunik** (TSS hooldaja; EVS 871:2017 kasutus [KONTROLLIMATA]).

### 2.4 Väljumisnupp, avariinupp, uksekontakt
| Osa | Tüüp | Ühendus | Märkus |
|---|---|---|---|
| Väljumisnupp | NO kontakt, valgustatud | kontrolleri sisend (tarkvaraline avamine) **ja** soovitavalt otse luku ahelasse (taimeriga relee) | kontrolleri rikke korral peab väljumine toimima [HINNANG] |
| Roheline avariinupp (klaasi või kaanega, „hädaavamine“) | 2-pooluseline: 1 poolus katkestab luku toite, 2. annab kontrollerile häire | jadamisi luku toitega, sõltumatu kontrollerist | EVS-EN 13637:2015 süsteemi osa [KONTROLLIMATA]; kõrgus ja asukoht → Nõunik / EVS 871 |
| Uksekontakt (reed) | NC, magnetiga, süvistatav lengi | kontrolleri sisend | EVS-EN 50131-2-6:2008; annab „uks avati“, „uks avati ilma loata“ (sundavamine), „uks jäi lahti“ |
| „Uks jäi lahti“ häire | tarkvara: uks lahti > 30–60 s pärast avamist → kohalik summer + teavitus haldurile | — | tuletõkkeuksel eriti oluline (kiilutud uks on tüüpviga, `tuleohutus.md` tüüpviga 3) |
| Luku olekuandur (valikuline) | magnetluku Hall-andur / vastuplaadi riivi kontakt | kontrolleri sisend | näitab, kas uks on päriselt lukus |

### 2.5 Kaabeldus ja pingelang
Tüüpkaablid [HINNANG]: luku toide **LiYY 2×1,5** või 4×1,0 (nõrkvool, ekraanita); signaalid (reed, nupud) LiYY 6×0,22 või 8×0,22; OSDP: keerdpaar CAT5e/CAT6 või ekraanitud keerdpaar 120 Ω; Wiegand: LiYCY ekraanitud 6×0,22. Juhistike valik EVS-HD 60364-5-52:2011+A1:2025.

**Arvutus 2: pingelang 12 V lukule 20 m kaabliga**
Valem: ΔU = 2 · L · I · ρ / A, kus L = kaabli pikkus (m, ühes suunas, tegur 2 = edasi-tagasi), I = voolutugevus (A), ρ = vase eritakistus 0,0225 Ω·mm²/m (töötemperatuuril, EVS-HD 60364-5-52 lisa G väärtus ρ₁ [KONTROLLIMATA]; 20 °C juures 0,0175), A = soone ristlõige (mm²).

| Lukk | I | A (mm²) | ΔU (V) | ΔU % (12 V) | Pinge lukul, toide 12,0 V | Toide 13,8 V |
|---|---|---|---|---|---|---|
| Vastuplaat (effeff 118S, 280 mA/12 V) | 0,28 | 0,22 | 1,15 | 9,5 % | 10,85 | 12,65 |
| sama | 0,28 | 0,75 | 0,34 | 2,8 % | 11,66 | 13,46 |
| Magnetlukk (500 mA) | 0,50 | 0,22 | 2,05 | 17,0 % | **9,95** | 11,75 |
| sama | 0,50 | 0,75 | 0,60 | 5,0 % | 11,40 | 13,20 |
| sama | 0,50 | 1,5 | 0,30 | 2,5 % | 11,70 | 13,50 |
| Vastuplaat (effeff 118 D11, 1300 mA/12 V) | 1,30 | 0,75 | 1,56 | 13,0 % | **10,44** | 12,24 |
| sama | 1,30 | 1,5 | 0,78 | 6,5 % | 11,22 | 13,02 |
| sama | 1,30 | 2,5 | 0,47 | 3,9 % | 11,53 | 13,33 |
Näide: 2 · 20 m · 0,5 A · 0,0225 / 0,75 mm² = **0,60 V (5,0 %)**. Voolud: effeff 118S 280 mA ja 118 D11 1300 mA (ASSA ABLOY effeff tootelehed, 11.2026); magnetlukk 500 mA (Genway ZE-280 müüjaleht, 11.2026).
**Järeldused:** (1) **häirekaabli 0,22 mm² soont ei kasutata luku toiteks** — 500 mA lukul langeb pinge alla 10 V; (2) kriteerium: pinge lukul peab jääma tootja lubatud vahemikku (effeff 118S: 11–13 V püsikoormusel) → 20 m ja kuni 0,5 A korral piisab 0,75 mm², 1,3 A korral vähemalt 1,5 mm²; (3) üle 30 m või > 1 A → 24 V lukk või toiteplokk ukse lähedale [HINNANG]; (4) aku tühjenemisel langeb toitepinge ~ 11 V-ni [HINNANG], seega arvuta halvima juhtumi jaoks (12,0 V veerg).

### 2.6 Paigaldusdetail (tüüpne siseuks, vastuplaat + reed + nupp)
1. Lengi freesitakse vastuplaadi süvend tootja šablooni järgi; tuletõkkeuksel ainult ukse tootja lubatud mõõtudega (p 2.2).
2. Kaabel lengist seina: painduv üleminekukaabel/kaablikanal hinge pool lehes oleva seadme jaoks (mootorlukk: uksekaabli üleminek „door loop“); lae- või seinakarp ukse kohal kontrolleri ja toiteplokiga **kaitstud poolel** (ruumi sees, mitte väljas).
3. Reed lengi ülaossa hingede vastaskülge; magnet lehte; vahe tootja järgi (tavaliselt ≤ 10–15 mm [KONTROLLIMATA]).
4. Väljumisnupp seest 0,9–1,2 m kõrgusel ukse käepideme pool [HINNANG; mõõt → Nõunik/EVS 871].
5. Läbiviik tuletõkkeseinast: tuletõkketihend sama tulepüsivusega (`ehitusinsener/teemad/elekter.md` 2a.2, ET-2 0109-0712 p 4.1.2).
6. Vastuplaadi juurde vabaratasdiood (DC) — induktiivkoormuse väljalülituse ülepinge kaitseks relee kontaktile [HINNANG, tavapraktika]; mõned lukud sisaldavad seda (tootja andmeleht).
7. Kasutuselevõtt: avamine/lukustus, TSS-vabastus (test TSS hooldajaga), avariinupp, voolukatkestus (toiteplokk välja), võrgukatkestus (offline), uks jäi lahti, sundavamine; protokoll.

---

## 3. Automaadid

### 3.1 Snäkiautomaat: MDB cashless device
- MDB (Multi-Drop Bus / Internal Communication Protocol, NAMA ja EVA, v4.2 02.2011; v4.3 muutis ainult ptk 7 „Cashless Devices“, sh ostukorvi/osaline tagastus) on automaadi kontrolleri (VMC) ja makseseadmete (müntide, rahatähtede, kaardi) siin (NAMA teade „NAMA Releases MDB Version 4.3“; vending-europe.eu „New MDB version 4.3 published“).
- Digivõti esineb automaadile **cashless-seadmena** (aadress 10h või teine 60h): kasutaja valib telefonis toote → server kinnitab → liides annab VMC-le „krediidi“ (BEGIN SESSION) → automaat küsib VEND REQUEST → liides vastab VEND APPROVED → VEND SUCCESS logitakse arveldusse [protokolli voog üldtuntud; käskude nimed KONTROLLIMATA 4.2 tekstist].
- Riistvara: MDB-liides (nt Qibixx MDB Pi HAT — töötab MDB master, peripheral või sniffer režiimis, saab MDB toitest kuni 15 W Raspberry Pi'le (pinout.xyz „MDB Pi HAT“, 11.2026)) + Raspberry Pi + Ethernet/4G. Olemasolev kaardimakse moodul võib jääda paralleelselt (kaks cashless-aadressi).
- **Eeldus:** automaadil on MDB VMC (enamus professionaalseid automaate [HINNANG]); kontrolli automaadi tootjalt, kas MDB on lubatud ja milline tase (level 1/2/3).
- Maksete ja kinnipidamise õiguslik pool (sh kas tegemist on makseteenusega) → **Nõunik**.

### 3.2 Kohvimasin: relee vs telemeetria
| Viis | Kuidas | Plussid | Miinused |
|---|---|---|---|
| a) MDB / maksesüsteemi liides | professionaalsel masinal sama kui 3.1; või tootja „Executive“/impulsi liides [KONTROLLIMATA] | täpne: mis jook, hind | masin peab liidest toetama |
| b) Relee „kasutusluba“ | relee masina **maksesisendil** (münditeeseadme/kaardi luba-kontakt) | lihtne, odav | ei tea, mis jooki valiti (üks hind); **mitte** relee masina toitel — kuumutus, loputus ja mälu katkevad, garantii risk [HINNANG] |
| c) Telemeetria | masina loendurite lugemine (tootja pilv/ liides) + töötaja kinnitab telefonis | masinasse ei sekkuta | „ausa kasutaja“ põhimõte; tootja liides tasuline |
| d) Ainult logi | QR → telefonis „võtsin kohvi“ | 0 € riistvara | ainult usaldus |
Soovitus demo ja väikekontor: d) või b); suurem kontor: a) [HINNANG].

### 3.3 Nutikülmik elektrilukuga
- Klaasuksega jahutuskapp + 12 V solenoid-riiv (fail-secure) või magnetlukk + reed + (valikuliselt) kaalu- või kaameraandurid riiulitel.
- Voog: QR → server avab luku 10–20 s → uks suletakse (reed) → võetud tooted kas kaaluvahest, kaamerast või kasutaja märgib telefonis [HINNANG].
- Temperatuuri logimine (andur 0,5 °C täpsusega) ja häire > +6 °C [HINNANG]; toiduohutuse nõuded → Nõunik.
- Elektriohutus: külmik on 230 V seade; lukk ja kontroller eraldi SELV toiteplokist (EVS-HD 60364-4-41) [sisu KONTROLLIMATA].

---

## 4. Arvutid, printerid, tööautod, ehitusobjekt
| Objekt | Tehniline lahendus | Märkus |
|---|---|---|
| Arvuti | Windowsi paroolivaba sisselogimine (Entra ID / FIDO2 / Windows Hello) või credential provider, mis näitab ekraanil QR-i ja telefon kinnitab | M365 lahendus võib juba olemas olla; tarkvara, riistvara pole |
| Printer | turvaprintimine: töö ootab serveris, printeri QR → telefon → vabastus; printeri tootja lahendus või PaperCut-tüüpi tarkvara | arveldus projekti kaupa; printeri ühilduvus kontrolli |
| Tööautod: võtmekapp | metallkapp, igal lahtril 12 V solenoidlukk (fail-secure) + reed (võti sees/väljas) või RFID võtmehoidja; kontroller ESP32 + 8–16 releed; UPS | valmistoode (nt Traka, deister) 1500–5000 € [HINNANG], isetehtud 450–600 € materjal [HINNANG]; kapp seina külge ankrutega |
| Tööautod: odomeeter | kasutaja sisestab näidu + foto; või OBD-II/telemaatika seade (CAN) | sõidupäeviku nõuded → Nõunik |
| Ehitusobjekti konteiner | välisukse elektromehaaniline riiv (fail-secure) + mehaaniline tabalukk avariiks; kontroller ja toiteplokk **konteineri sees** kütetud IP66 karbis; QR-lugeja väljas IP65; 4G ruuter + välisantenn (metallkonteiner varjestab) | p 4.1 |
| Värav | olemasoleva ajami potentsiaalivaba „ava“ sisend → relee; ajami ohutusseadmed (fotosilmad, servaandur) jäävad ajami tootja vastutusse | EVS-EN 12453:2017+A1:2021; kaugavamisel ei tohi ohutusfunktsioonidest mööda minna [HINNANG] |

### 4.1 Ehitusobjekti tingimused
- **IP-klass:** lugeja väljas vähemalt **IP65** (tolmukindel, veejoa kaitse); karp IP66; konteineri sees IP54 (EVS-EN 60529:2001+A2:2014). Tolm, betoonipritsmed, survepesu.
- **Temperatuur −25 °C:** kontrolli iga seadme töövahemikku: Teltonika RUT241 −40…+75 °C, IP30 (Mouser/ControlTech tootelehed, 11.2026) → sobib, kuid ainult karbis; **Shelly 1 Gen4 −20…+40 °C** (müüjate lehed, 11.2026, tootja kinnitus [KONTROLLIMATA]) → **ei sobi** kütmata konteinerisse, vaja küttega karpi või tööstusrelee; e-paberekraan tavaliselt 0…+50 °C [KONTROLLIMATA] → väljas ei kasutata; plii-AGM aku mahtuvus külmas ~50–60 % [HINNANG]; **LiFePO4 ei tohi laadida alla 0 °C** ilma küttega [tootja andmelehed, KONTROLLIMATA].
- **Niiskus:** kondensaat karbis temperatuurikõikumisel → küttekeha 10–20 W termostaadiga (+5 °C), ventiil (membraanventiil), kaabelsisendid altpoolt tihenditega [HINNANG].
- **Toide:** ehitusplatsi kilbist (EVS-HD 60364-7-704:2018), rikkevoolukaitse; kaabel H07RN-F mehaaniliselt kaitstud; aku p 1.4 d).
- **Mobiilne kasutus:** komplekt kolib objektilt objektile → kõik ühes kastis, pistikliides, eelseadistatud [HINNANG].

---

## 5. Dünaamilise QR-i ekraan ja releede valik

### 5.1 ESP32 + e-paber
- Näide: LilyGO T5 2,13" (ESP32, 4 MB flash, ~16–20 €; lilygo.cc, elecena.pl 11.2026) või Waveshare ESP32 e-Paper; paneeli mudel (DEPG0213BN vs GDEM0213B74) mõjutab draiverit.
- Toimimine: ESP32 arvutab TOTP-tüüpi koodi (RFC 6238 põhimõte, ühine saladus serveriga, samm 30 s) ja kuvab QR-i `https://.../d/<uks>?t=<kood>`; server kontrollib koodi (± 1 samm). Ekraan võib olla ka **võrguta** (ainult kell: RTC + NTP aeg-ajalt) [HINNANG].
- Toide: e-paber kulutab ainult värskendamisel; värskendus iga 30 s → ESP32 ärkab; keskmine vool ~ 5–15 mA [HINNANG] → toide 5 V USB/PoE, mitte patarei (patarei ainult, kui samm ≥ 5 min).
- Piirang: e-paberi osaline värskendus kulutab paneeli; täisvärskendus 1–2 s vilkumine [KONTROLLIMATA, tootja]. Alternatiiv: väike LCD/OLED (paremini loetav, rohkem voolu).
- Ründe sulgemine: foto vananeb 30–60 s → kaugavamine fotoga ei tööta; jääb „reaalajas edastus“ (keegi saadab pildi kohe edasi) → lisaks Wi-Fi/IP-kontroll või Bluetoothi lähedus (kontseptsioon p 1).

### 5.2 Relee valik
| Valik | Plussid | Miinused | Kus |
|---|---|---|---|
| Shelly 1 Gen4 (Wi-Fi, Zigbee, Matter, BLE; potentsiaalivaba kontakt 16 A/240 V AC, 10 A/30 V DC; toide 110–240 V AC, 24–48 V DC või 12 V DC stabiliseeritud; < 1,2 W) (tootja kasutusjuhend manuals.plus kaudu, 11.2026) | odav, valmis, HTTP/WebSocket RPC, MQTT, skriptid | Wi-Fi (raadio), −20…+40 °C, kontaktisisendeid 1 | siseuksed, kohv, demo |
| Shelly Plus/Pro (DIN, Ethernet) | kaabelvõrk, DIN-liistule | kallim | tehnilised kapid |
| ESP32 + releemoodul (nt Olimex ESP32-POE) | oma püsivara: offline-nimekiri, Wiegand/OSDP, PoE | arendustöö, sertifitseerimata | variant B kontroller, võtmekapp |
| Tööstuslik läbipääsukontroller (1–4 ust) | OSDP, offline, sertifitseeritud (EVS-EN 60839-11-1) | integratsioon pilvega vajab API-t | välisuksed, kliendi nõue |
Turvalisus [HINNANG]: püsivara uuendused, kohalik HTTP-liides parooliga või välja lülitatud, eraldi VLAN, käsud allkirjastatud ja aeguvad (et Wi-Fi-võrgu kaudu ei saaks releed otse lülitada).

### 5.3 IP- ja IK-klassid
| Asukoht | IP (EVS-EN 60529:2001+A2:2014) | IK (EN 62262 [KONTROLLIMATA]) |
|---|---|---|
| Siseruum, kuiv | IP20 (karbis) | — |
| Välisuks varikatuse all | IP54…IP65 lugeja | IK08 |
| Välisuks, avatud, ehitusplats | IP65/IP66 lugeja ja karp | IK10 + teraskate |
| Konteineri sees | IP54 karp | — |

---

## 6. Seadmete loetelu (BOM)
Hinnad [HINNANG] käibemaksuga, 11.2026 kuulutuste ja müüjalehtede suurusjärk (nt magnetlukk 280 kg 20–180 €, QR-lugeja IP65 105–430 €, LilyGO T5 16–26 €, Teltonika RUT241 145–195 €). Paigaldustöö tunnihind **45 €/h** [HINNANG]. Näidetes on kaks tootjat näitena, mitte soovitusena.

### 6.a Investorinäidis (demolaud)

| # | Seade | Tüüp/näide | Kogus | Ühikuhind € [HINNANG] | Kokku € | Standard/nõue | Märkus |
|---|---|---|---|---|---|---|---|
| 1 | Demoraam ratastel + uks lengiga (siseuks, puit) | isetehtud raam; tavaline siseuks 80×210 | 1 | 180 | 180 | — | ainult demo, mitte evakuatsiooniuks |
| 2 | Elektriline vastuplaat 12 V, fail-secure | effeff 118-seeria / Dorcas 99-seeria | 1 | 90 | 90 | EVS-EN 14846:2008 (elektromehaanilised lukud) | näitab tavapärast siseust |
| 3 | Magnetlukk 280 kg, olekuväljundiga, fail-safe | Genway ZE-280 / SCOT EL-600 | 1 | 70 | 70 | tootja DoP/andmeleht | näitab evakuatsioonitee loogikat |
| 4 | Võrgurelee | Shelly 1 Gen4 / Olimex ESP32-POE + relee | 2 | 25 | 50 | EVS-EN IEC 62368-1:2024 (toote ohutus, tootja) | 1 uks + 1 automaat |
| 5 | QR-lugeja Wiegand/RS-485 (variant B) | ZKTeco QR600 / UMA RPRO-QR | 1 | 130 | 130 | EVS-EN IEC 60839-11-5:2020 (OSDP), kui OSDP | variant B näitamiseks |
| 6 | 1-ukse kontroller (offline-nimekiri) | ESP32 + Wiegand/RS-485 liides / tööstuslik 1-ukse kontroller | 1 | 80 | 80 | EVS-EN 60839-11-1:2013 | võtab vastu ka pilve käsu |
| 7 | Toiteplokk 13,8 V 3 A akulaadimisega, karbis | Pulsar PSBEN / Mean Well AD-55 | 1 | 60 | 60 | EVS-EN 50131-6:2017+A1:2021 (analoogia) | näitab toitekatkestust |
| 8 | Aku 12 V 7 Ah AGM | Yuasa NP7-12 / CSB GP1272 | 1 | 25 | 25 | tootja andmeleht |  |
| 9 | Väljumisnupp (NO/NC) | tavaline väljumisnupp | 1 | 15 | 15 | — |  |
| 10 | Roheline avariinupp klaasi/kaanega, 2-pooluseline | Dorcas / effeff 1050-seeria | 1 | 40 | 40 | EVS-EN 13637:2015 (süsteemi osa) | katkestab luku toite otse |
| 11 | Uksekontakt (reed) | pinnapealne / süvistatav | 1 | 8 | 8 | EVS-EN 50131-2-6:2008 |  |
| 12 | Dünaamilise QR-i e-paber ekraan ESP32-ga | LilyGO T5 2,13" / Waveshare ESP32 e-Paper | 2 | 25 | 50 | — | foto-rünnaku sulgemise demo |
| 13 | Kohviautomaadi imitatsioon | ESP32 + relee + LED + nupp, karbis | 1 | 35 | 35 | — |  |
| 14 | MDB cashless liides + Raspberry Pi | Qibixx MDB Pi HAT / MDB-USB + Raspberry Pi 5 | 1 | 250 | 250 | NAMA/EVA MDB/ICP 4.2 (2011), 4.3 | vajab MDB automaati või simulaatorit |
| 15 | MDB demoautomaat või -simulaator | kasutatud lauaautomaat / MDB VMC simulaator | 1 | 300 | 300 | MDB/ICP 4.2 | valikuline; ilma selleta demo ekraanil |
| 16 | Külmiku solenoidlukk 12 V + reed | 12 V solenoid-riiv | 1 | 25 | 25 | — | nutikülmiku demo |
| 17 | PoE-kommutaator + Wi-Fi ruuter | MikroTik / TP-Link | 1 | 90 | 90 | EVS-EN 50173-1:2018 (kaabeldus) | demolaud ei sõltu ruumi Wi-Fist |
| 18 | Haldusvaate ekraan | olemasolev sülearvuti/teler | 1 | 0 | 0 | — | olemas |
| 19 | Kaabeldus, klemmid, kaitsmed, DIN-liist, karp | LiYY 4×0,75, CAT6, sulavkaitsmed | 1 | 120 | 120 | EVS-HD 60364-5-52:2011+A1:2025 (valik) |  |
| 20 | QR-kleebised tööriistadele | qrwork kleebised | 1 | 10 | 10 | — | olemas qrwork-is |
| | **Seadmed kokku** | | | | **1628** | | |

Paigaldustöö (a): raami ja ukse ehitus 6 h, lukud ja kaabeldus 5 h, releed, kontroller ja lugeja seadistus 4 h, MDB ja kohvidemo 3 h, test ja demostsenaarium 2 h = **20 h × 45 € = 900 €**. **Kokku (a) ≈ 1 628 + 900 = 2 528 €** (MDB demoautomaadita 2 228 €). Kontseptsiooni p 3 hinnang 400–800 € kehtib ilma MDB-osa, raami ja tööta.

### 6.b Kontor + ladu, 50 töötajat (4 ust, kohv, snäkk, 3 printerit, 5 autot)
Eeldus [HINNANG]: välisuks (variant B, mootorlukk), laouks evakuatsiooniteel (variant B, EN 179 + vastuplaat fail-secure; ühe ukse võimalik EI-klass), 2 siseust (variant A, dünaamiline QR, vastuplaat). Uksed ja sulgurid on olemas.

| # | Seade | Tüüp/näide | Kogus | Ühikuhind € [HINNANG] | Kokku € | Standard/nõue | Märkus |
|---|---|---|---|---|---|---|---|
| 1 | 2-ukse kontroller OSDP, offline-nimekirjaga (välisuks, laouks) | ZKTeco C3-200 / Hikvision DS-K2602 | 1 | 300 | 300 | EVS-EN 60839-11-1:2013 |  |
| 2 | QR-lugeja välitingimustes IP65 | ZKTeco QR600-V / Hikvision DS-K1109 | 2 | 190 | 380 | EVS-EN 60529:2001+A2:2014 (IP65), EN 62262 IK [KONTROLLIMATA] | välisuks + laouks |
| 3 | Mootorlukk välisuksele (fail-secure, käepide väljub alati) | Abloy EL-seeria / effeff mediator | 1 | 450 | 450 | EVS-EN 14846:2008; EVS-EN 179:2008 kui evakuatsioon | olemasoleva profiiluksega sobivus kontrollida |
| 4 | Elektriline vastuplaat, tuletõkkeuksele katsetatud (kui uks on EI) | effeff 331/143-seeria / Dorcas 99N tule-versioon | 1 | 180 | 180 | EVS-EN 14846:2008; tootja tõend EVS-EN 16034:2014 uksele | mudel [KONTROLLIMATA] |
| 5 | Elektriline vastuplaat siseuksele | effeff 118 / Dorcas 99 | 2 | 110 | 220 | EVS-EN 14846:2008 |  |
| 6 | Evakuatsioonisulus (käepide) laouksele | EN 179 käepide (Abloy / dormakaba) | 1 | 220 | 220 | EVS-EN 179:2008 (EN 1125:2008, kui avalik) | → Nõunik: kas EN 179 või 1125 |
| 7 | Võrgurelee siseustele (variant A) | Shelly 1 Gen4 / Olimex ESP32-POE | 2 | 30 | 60 | tootja andmeleht |  |
| 8 | Dünaamilise QR-i e-paber ekraan | LilyGO T5 2,13" / Waveshare | 2 | 35 | 70 | — | siseuksed |
| 9 | Toiteplokk 13,8 V 5 A akulaadimisega | Pulsar PSBEN 5 A / Mean Well PSC-100 | 2 | 120 | 240 | EVS-EN 50131-6:2017+A1:2021 (analoogia) | 1 tk 2 ukse kohta |
| 10 | Aku 12 V 17 Ah AGM | Yuasa NP17-12 / CSB GP12170 | 2 | 55 | 110 | tootja andmeleht | varuaeg p 1.5 |
| 11 | Väljumisnupp | — | 4 | 20 | 80 | EVS-EN 13637:2015 (süsteemi osa) |  |
| 12 | Roheline avariinupp, 2-pooluseline | Dorcas / effeff | 2 | 45 | 90 | EVS-EN 13637:2015 | evakuatsiooniteel |
| 13 | Uksekontakt (reed) | süvistatav | 4 | 12 | 48 | EVS-EN 50131-2-6:2008 | „uks jäi lahti“ |
| 14 | TSS liidesrelee (NC ahel, toite katkestus) | DIN-relee 24 V mähisega + kaitsme | 2 | 40 | 80 | EVS-EN 54-2:1999 (keskseadme väljund) |  |
| 15 | TSS keskseadme väljundi programmeerimine + test | TSS hooldaja töö | 1 | 200 | 200 | EVS 871:2017; EVS-EN 54-2:1999 | → Nõunik: kes tohib |
| 16 | PoE-kommutaator + UPS võrguseadmetele | MikroTik / Ubiquiti; APC / Eaton 650 VA | 1 | 280 | 280 | — | võrk peab püsima ka katkestuse ajal |
| 17 | Kaabel ja paigaldusmaterjal (4 ust × ~25 m) | LiYY 6×0,75 / 2×1,5 + CAT6, kanal, karbid | 1 | 350 | 350 | EVS-HD 60364-5-52:2011+A1:2025 |  |
| 18 | Snäkiautomaadi MDB cashless liides | Qibixx MDB-USB / Nayax-tüüpi liides | 1 | 300 | 300 | MDB/ICP 4.2 | automaat peab MDB-d toetama |
| 19 | Kohvimasina liides (MDB / tootja telemeetria / relee) | masina tootja liides / relee | 1 | 200 | 200 | tootja liidese dokument | p 3.2 |
| 20 | Printerite QR-vabastus | printeri sisseehitatud või PaperCut-tüüpi tarkvara | 3 | 150 | 450 | tootja dokument | litsents võib olla aastatasu |
| 21 | Võtmekapp 5 autole, elektrilukuga lahtrid | valmistoode (Traka / deister) või isetehtud 8 lahtrit | 1 | 1500 | 1500 | EVS-EN 14846:2008 (lukud) | isetehtud ≈ 450–600 € |
| 22 | Kleebised, plakatid | — | 1 | 100 | 100 | — |  |
| | **Seadmed kokku** | | | | **5908** | | |

Paigaldustöö (b):

| Töö | h |
|---|---|
| 4 ust × 7 h (lukk 3 h, kaabeldus 2–3 h, nupud/reed 1 h, seadistus 1 h) | 28 |
| TSS liides ja koostest (2 ust) | 6 |
| Snäkiautomaadi MDB liides | 4 |
| Kohvimasina liides | 3 |
| Printerite QR-vabastus (IT) | 4 |
| Võtmekapp (paigaldus, seadistus) | 6 |
| Võrk, VLAN, UPS | 3 |
| Kasutuselevõtt, testid (p 2.6 p 7), dokumentatsioon, koolitus | 10 |
| **Kokku** | **64 h × 45 € = 2 880 €** |
**Kokku (b) ≈ 5 908 + 2 880 = 8 788 €.** Isetehtud võtmekapiga (≈ 550 €) ≈ 7 840 €; ilma mootorluku ja EN 179 käepidemeta (olemasolevad sobivad) ≈ 7 170 €. Kontseptsiooni p 5 hinnang 3 000–8 000 € on seega **alumises osas liiga madal**, kui välisuks ja tuletõkkeuks vajavad uusi sertifitseeritud komponente [HINNANG].

### 6.c Ehitusobjekt (2 konteinerit, tööriistakapp, värav)
Eeldus [HINNANG]: konteinerid on metallist, ajutine elekter ehituskilbist olemas, värav jõuajamiga olemas; variant B (lugeja) konteineritel, värav ja tööriistakapp variant A (telefoni levi on).

| # | Seade | Tüüp/näide | Kogus | Ühikuhind € [HINNANG] | Kokku € | Standard/nõue | Märkus |
|---|---|---|---|---|---|---|---|
| 1 | 4G ruuter tööstuslik, I/O-ga | Teltonika RUT241 / RUT200; MikroTik LtAP | 1 | 180 | 180 | tootja andmeleht: −40…+75 °C, IP30 | paigaldada kütetavasse karpi |
| 2 | Välisantenn 4G (MIMO) | 2×2 MIMO paneel | 1 | 50 | 50 | — | metallkonteiner varjestab |
| 3 | Kontrollerikarp IP66, polükarbonaat, küttega + termostaat | Fibox / Spelsberg + 10–20 W küttekeha | 3 | 130 | 390 | EVS-EN 60529:2001+A2:2014 | 2 konteinerit + värav |
| 4 | Tööstuslik kontroller/relee (−25 °C) | ESP32 tööstusversioon / Teltonika I/O / Finder DIN-relee | 3 | 70 | 210 | tootja temperatuurivahemik |  |
| 5 | Elektromehaaniline riiv konteinerile, fail-secure, IP65 | solenoid-riiv / mootorriiv (konteinerilukk) | 2 | 180 | 360 | EVS-EN 14846:2008; IP EVS-EN 60529 | + mehaaniline tabalukk avariiks |
| 6 | QR-lugeja IP65, töötemperatuur ≥ −25 °C | ZKTeco QR600-V / Hikvision DS-K1109 [temperatuur KONTROLLIMATA] | 2 | 190 | 380 | EVS-EN 60529 (IP65) | variant B: telefon ei vaja levi |
| 7 | Vandalismikindel kate lugejale | teraskate, IK10 [KONTROLLIMATA] | 2 | 40 | 80 | EN 62262 [KONTROLLIMATA] |  |
| 8 | Toiteplokk 13,8 V 5 A akulaadimisega | Pulsar / Mean Well | 3 | 120 | 360 | EVS-EN 50131-6 (analoogia) |  |
| 9 | Aku 12 V 26 Ah AGM (külmakindel) | Yuasa NPL / CSB GP12260 | 3 | 85 | 255 | tootja andmeleht | LiFePO4 ei laadi < 0 °C ilma küttega |
| 10 | Uksekontakt (reed), välitingimustes | IP67 metallikontakt | 3 | 18 | 54 | EVS-EN 50131-2-6:2008 |  |
| 11 | Tööriistakapp elektrilukuga lahtritega | metallkapp + 4–6 solenoidlukku + kontroller | 1 | 700 | 700 | — | isetehtud; valmistoode 1500–3000 € |
| 12 | Värava liides (potentsiaalivaba kontakt ajamile) | Shelly 1 Gen4 / ajami 4G moodul | 1 | 40 | 40 | EVS-EN 12453:2017+A1:2021 (värava ohutus) | värav ja selle ohutusandurid olemas |
| 13 | Välikaabel ja kaitse (~60 m) | H07RN-F / LiYY-ga kaitsetoru, AMK | 1 | 250 | 250 | EVS-HD 60364-7-704:2018 (ehitusplats) |  |
| 14 | SIM-kaart (aasta) | andmeside 1–5 GB/kuu | 1 | 60 | 60 | — | püsikulu |
| 15 | Kleebised, sildid | ilmastikukindel kleebis | 1 | 40 | 40 | — |  |
| | **Seadmed kokku** | | | | **3409** | | |

Paigaldustöö (c): 2 konteinerit × 6 h = 12 h; värav 3 h; tööriistakapi ehitus 6 h; karbid, toide, ruuter, antenn 6 h; kasutuselevõtt 4 h = **31 h × 45 € = 1 395 €**. **Kokku (c) ≈ 3 409 + 1 395 = 4 804 €.** Komplekt on taaskasutatav: järgmisel objektil ümberpaigaldus ≈ 12–16 h [HINNANG]. Kui 72 h varuaeg on vajalik, asenda 26 Ah aku 100 Ah-ga (+≈ 200 €/konteiner) või lisa päikesepaneel.

**BOM kokkuvõte:**

| Konfiguratsioon | Seadmed € | Töö h | Töö € | Kokku € [HINNANG] |
|---|---|---|---|---|
| a) investorinäidis | 1 628 | 20 | 900 | **2 528** |
| b) kontor + ladu | 5 908 | 64 | 2 880 | **8 788** |
| c) ehitusobjekt | 3 409 | 31 | 1 395 | **4 804** |

---

## 7. Hooldus

| Mida | Kui tihti [HINNANG] | Kuidas | Viide |
|---|---|---|---|
| TSS-vabastus (kõik evakuatsiooniteel olevad elektrilukud vabanevad) | koos TSS hooldusega (TSS hooldaja graafik), vähemalt kord kvartalis + pärast iga muudatust | TSS testhäire → kõik uksed vabad, logis „TSS vabastus“ | → Nõunik (TSS hoolduse kohustus ja sagedus) |
| Roheline avariinupp | kord kuus funktsioon, kord aastas kontaktid | vajutus → toide katkeb, häire logis | EVS-EN 13637:2015 [KONTROLLIMATA] |
| Lukud, vastuplaadid, magnetlukud | kord kvartalis | lukustus/avamine, kinnitused, magnetpinna puhastus, riivi vabakäik; hoidejõu kontroll | EVS-EN 14846:2008; tootja hooldusjuhend |
| Tuletõkkeuks (sulgur, tihendid, riivistumine, märgistus) | kord poolaastas / tootja järgi | sulgub ja riivistub igast asendist; elektrilukk ei takista | EVS-EN 14600 lisa C (`tuleohutus.md` 2b) [KONTROLLIMATA] |
| Akud (AGM) | mahutavustest kord aastas, vahetus 3–5 a (külmas sagedamini) | toiteplokk võrgust lahti, mõõda varuaeg vs arvutus (p 1.4) | aku tootja andmeleht |
| Toiteplokid ja UPS | kord aastas | rikkeväljundid, laadimispinge 13,8 V ± 0,2 V | EVS-EN 50131-6 (analoogia) |
| Lugejad, ekraanid | kord kvartalis (objektil kord kuus) | puhastus, kate, kaabel, IP-tihendid, kella täpsus (TOTP) | — |
| Püsivara, sertifikaadid, võtmed | kord kuus kontroll, kriitiline uuendus kohe | tarnija platvorm; kontrolleri võtmete roteerimine kord aastas | — |
| Offline-režiimi test | kord poolaastas | ruuter välja → variant B töötab, logi jõuab hiljem | p 1.3 |
| MDB-liides, kohvimasin | kord kvartalis | testost, arveldusrea võrdlus automaadi loenduriga | — |

**Aastane hoolduskulu [HINNANG]:**

| Konfiguratsioon | Töö | Asendused (akud, lukud, ~10 % riistvarast) | Side | Kokku/a |
|---|---|---|---|---|
| a) demolaud | 4 h × 45 = 180 € | 100 € | 0 € | **≈ 280 €** |
| b) kontor + ladu | 4 korda × 3 h + 1 aastatest 4 h = 16 h × 45 = 720 € (TSS hooldaja töö TSS lepingus) | 590 € | 0 € (kliendi võrk) | **≈ 1 300 €** |
| c) ehitusobjekt | 12 × 1 h + 4 h = 16 h × 45 = 720 € | 340 € + akud külmas sagedamini 250 € | SIM 60 € | **≈ 1 370 €** |
Kontseptsiooni p 5 hinnang „riistvara hooldus 300–700 €“ on b) jaoks sama suurusjärk, kui töö tehakse kliendi halduri poolt; partneri hooldusena lisandub töö ~700 €.

---

## 8. Tehnilised riskid ja maandus

| Risk | Mehhanism | Tagajärg | Maandus |
|---|---|---|---|
| Vandalism | lugeja lõhkumine, kaabli lõikamine väljas, magnetlukust jõuga läbi | uks ei avane või avaneb | lugeja IK10 + teraskate; **kontroller ja relee alati turvalisel poolel** (väljas ainult lugeja); OSDP järelevalve (lugeja eemaldus = häire); reed + sundavamise häire; fail-secure välisuksel |
| Kaabli lühistamine väljas (Wiegand) | lugeja kaabel ühendatakse ümber, saadetakse kood | volitamata avamine | OSDP Secure Channel; kontroller ei ole väljas; relee lugejast eraldi |
| Külm | aku mahtuvus langeb, elektroonika töövahemik, e-paber aeglustub, LCD/OLED ei tööta | süsteem seiskub öösel | seadmed −25 °C vahemikuga; kütetud IP66 karp; plii-AGM, mitte LiFePO4 ilma küttega; aku arvutus k = 0,48 (p 1.4) |
| Niiskus, kondensaat | temperatuurikõikumine konteineris, survepesu | korrosioon, lühis | IP65/66, membraanventiil, küttekeha, kaablid altpoolt, dielektriline määre klemmidel [HINNANG] |
| Kaabli vigastus | ehitustöö, uste liikumine (uksekaabel), närilised | lukk ei tööta; NC-ahelas → fail-safe vabastus | kaitsetoru, ukse üleminekukaabel, NC-järelevalve, kaabli katkemise häire |
| Toitekatkestus | võrk maas, aku tühi | fail-safe uks lahti / fail-secure lukus | akuarvutus eesmärgi järgi (24 h kontor, 72 h objekt); UPS ka võrguseadmetele; mehaaniline võti haldurile; aku madala pinge teavitus |
| Võrgu/pilve katkestus | internet või server maas | variant A ei tööta | variant B välisustel; offline-nimekiri lühikese kehtivusega; varuvõti/PIN |
| Tarkvaraviga / küberrünne | vale käsk, varastatud võti, kordusrünne | volitamata avamine | allkirjastatud + aeguv käsk + nonce; eraldi VLAN; kohalik liides kinni; logi ja anomaaliateavitus; **ohutusfunktsioon (vabastus) riistvaras**, mitte tarkvaras |
| Foto/edastus-rünne (variant A) | staatiline QR pildistatakse | kaugavamine | dünaamiline QR (p 5.1), IP/BLE lähedus |
| Tuletõkkeukse klassi kadumine | vale lukk, freesimine, magnetlukk sertifitseerimata | tuli/suits levib | ainult ukse tootja lubatud komponent, kirjalik kinnitus, kaetud tööde akt |
| Evakuatsiooni takistamine | tarkvara hoiab ust lukus, TSS liides puudub | inimeste oht | mehaaniline väljumine seest või EN 13637 süsteem; TSS katkestab toite otse; avariinupp; kasutuselevõtu test |

---

## 9. Kontrollimata ja küsimused

**Jäi kontrollimata:** standardite tekst (EN 13637, 179, 1125, 14846, 16034, 54-2, 60839-11-1/-5, HD 60364-5-52 lisa G ρ-väärtus) — ainult olek evs.ee-st; EVS-EN 14600 ja EN 62262 olek (evs.ee ei leidnud); MDB 4.2 käskude nimed ja aadressid (teisene allikas); Shelly 1 Gen4 töötemperatuur ja võimsus tootja lehelt; QR-lugejate töötemperatuur; tuletõkkeustele lubatud vastuplaatide mudelid; kõik hinnad (kuulutused, mitte pakkumised).

**Küsimused Nõunikule (→ `OIGUSLIK_RAAMISTIK_digivoti.md`):**
1. Kas magnetlukk / fail-safe elektrilukk evakuatsiooniteel on lubatud ja millistel tingimustel (EN 13637 kohustuslikkus, EVS 871 roll)?
2. Millal on vaja EN 1125 (paanika) ja millal piisab EN 179-st (kontor, ladu, ehitusobjekti olmekonteiner)?
3. Kas elektriluku lisamine olemasolevale tuletõkkeuksele on ehitise muutmine, mis vajab projekti/teatist, ja kes kinnitab, et klass säilib?
4. Kas TSS-liidese ühendamine (keskseadme väljund) on ainult TSS hooldaja töö ja kas see vajab päästeasutuse teadet?
5. Kas läbipääsusüsteemi paigaldus vajab turvategevuse seaduse järgset tegevusluba (kontseptsioon p 6)?
