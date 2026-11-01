# QR-digivõti: elektritehniline ülevaatus ja töökindlus

**Versioon:** v0.1, 01.11.2026, Elektriinsener (pilves). **Üle vaadatud:** `docs/TEHNILINE_LAHENDUS_digivoti.md` v0.1 (Ehitusinsener), `docs/KONTSEPTSIOON_QR_digivoti.md` p 1–5, `digivoti/riistvara/shelly_skript.js`, `digivoti/README.md`. Neid faile ei muudetud. Õiguslik pool: `docs/OIGUSLIK_RAAMISTIK_digivoti.md` (Nõunik), siin „→ Nõunik“.

**Märgid:** [evs 01.11.2026] = olek kontrollitud evs.ee-st (`elektriinsener/tooriistad/evs_staatus.py`). Standardite **teksti ei ole loetud** (pilves pole Margo standardite kausta), seega standardi sisu kohta käiv väide on [KONTROLLIMATA], kui pole märgitud teisiti. Tootjaandmed on mälust või Ehitusinseneri failist, mitte andmelehelt loetud → [KONTROLLIMATA, tootja]. [HINNANG] = inseneri hinnang. Arvutused: `elektriinsener/arvutused/pingelang.py` (test `test_pingelang.py` läbis 01.11.2026). Pilves ei ole: E: ketas, standardite tekstid, tootjate andmelehtede koopiad, mõõteriistad.

**Lisaks kontrollitud standardid [evs 01.11.2026]:**

| Tähis | Teema | Olek |
|---|---|---|
| EVS-HD 60364-5-52:2011+A11+A12+A1:2025 | juhistike valik, koormatavus, pingelang (lisa G) | kehtiv |
| EVS-HD 60364-4-41:2017+A12:2019 | elektrilöögikaitse, SELV/PELV | kehtiv |
| EVS-HD 60364-4-43:2023 | liigvoolukaitse (2010 kehtetu 15.09.2023) | kehtiv |
| EVS-HD 60364-4-443:2016 | atmosfääri- ja lülitusliigpinge kaitse | kehtiv |
| EVS-HD 60364-5-534:2016 | liigpingekaitseseadmed (SPD) | **kehtetu alates 03.10.2022**, asendaja evs.ee-st ei leitud [KONTROLLIMATA] |
| EVS-HD 60364-6:2016+A11+A12 | kontrollimine (kasutuselevõtt, perioodiline) | kehtiv |
| EVS-EN IEC 61643-11:2025+A11:2025 | madalpinge SPD tooted (2012 kehtetu 01.12.2025) | kehtiv |
| EVS-EN IEC 62305-4:2025 | piksekaitse, elektri- ja elektroonikasüsteemid (2011 kehtetu 01.10.2025) | kehtiv |
| EVS-EN 50131-6:2017+A1:2021 | valvesüsteemide toiteallikad | kehtiv |
| EVS-EN 50131-1:2006+A1+A2+A3:2020 | valvesüsteemid, üldnõuded (turvaastmed, keskkonnaklassid) | kehtiv |
| EVS-EN 60839-11-1:2013 | läbipääsusüsteemid, nõuded | kehtiv |
| EVS-EN IEC 61000-6-2:2019 | EMÜ häirekindlus tööstuskeskkonnas | kehtiv |
| EVS-EN 61000-4-5:2014+A1:2017 | impulsspinge (surge) katse | kehtiv |
| EVS-EN 61810-1:2015 | elektromehaanilised releed, üldnõuded | kehtiv |
| EVS-EN IEC 62485-2:2018 | statsionaarsed akud, ohutus (ventilatsioon, paigaldus) | kehtiv |
| EVS-EN IEC 61558-2-16:2025 | lülitustoiteplokid (2010 kehtetu 01.04.2025) | kehtiv |
| EN 62262 (IK) | mehaanilise löögi kaitseaste | evs.ee-st ei leitud (proovitud 2002, 2003, 2004, IEC 2024) [KONTROLLIMATA] — sama mis Ehitusinseneril |

---

## 1. Leiud Ehitusinseneri failis

Hinnang: **ÕIGE** = kinnitan; **VIGA** = sisuline viga, tuleb parandada; **TÄPSUSTA** = põhimõtteliselt õige, aga puudulik või võib eksitada.

| # | Koht | Väide | Hinnang | Põhjendus + viide |
|---|---|---|---|---|
| 1 | p 2.5, arvutus 2 | ΔU = 2·L·I·ρ/A, ρ = 0,0225 Ω·mm²/m, tabeli 8 rida | **ÕIGE** | Kõik 8 rida kordasin `pingelang.py`-ga (nt 0,5 A, 0,75 mm², 20 m → 0,60 V = 5,00 %; 1,3 A, 2,5 mm² → 0,47 V = 3,90 %). ρ = 0,0225 on 1,25 × ρ₂₀ (konservatiivne; SELV-kaabel nõrga vooluga on tegelikult ümbritseva temperatuuriga, ρ ≈ 0,0175) [EVS-HD 60364-5-52 lisa G, sisu KONTROLLIMATA]. |
| 2 | p 2.5 järeldus 2 ja tabeli veerg „toide 13,8 V“ | effeff 118S lubatud 11–13 V; 13,8 V toitel lukul 12,65…13,46 V | **VIGA (vastuolu)** | Ehitusinseneri enda kriteeriumi järgi on akuga toiteploki ootelaadimispinge 13,8 V lühikesel kaablil **üle** 13 V ülapiiri (13,46 V 0,75 mm² juures). Kas 11–13 V on õige, kontrolli effeff andmelehelt [KONTROLLIMATA, tootja]; paljudel 12 V lukkudel on lubatud 12 V ± 15 % (10,2–13,8 V) [HINNANG]. Valik: lukk, mille vahemik katab **10,5…13,8 V** (aku tühjenemise lõpp kuni ootelaadimine), või 24 V lukk + 27,6 V toiteplokk, või stabiliseeritud DC/DC luku jaoks. |
| 3 | p 2.5 järeldus 4 | halvim juhtum = 12,0 V veerg; aku tühjenemisel ~11 V | **TÄPSUSTA** | Toiteploki sügavtühjenemise kaitse lülitab aku tavaliselt välja ~10,0–10,5 V juures [KONTROLLIMATA, tootja Pulsar/Mean Well]. Halvim juhtum on 10,5 V, mitte 12,0 V: 1,3 A vastuplaat, 1,5 mm², 20 m → ΔU 0,78 V (7,4 % 10,5 V-st) → lukul **9,7 V**, alla 11 V. Seega 1,3 A lukule 20 m kaugusel kas 2,5 mm² + lukk laia vahemikuga või 24 V. |
| 4 | p 1.4 | 24 V: „pool voolu → pingelang neljandik“ | **TÄPSUSTA** | Absoluutne ΔU (V) väheneb poole võrra, **suhteline** (%) neljandikuni. Näide: 0,65 A, 1,5 mm², 20 m, 24 V → 0,39 V = 1,62 % (`pingelang.py`) vs 1,3 A 12 V → 6,5 %. |
| 5 | p 1.4, arvutus 1 a–d | t = C·k/I, k = 0,8 (külmas 0,48) | **ÕIGE, TÄPSUSTA** | Aritmeetika õige (6,8 / 16,5 / 16,0 / 19,2 h). Puudu: (1) C20 mahtuvus kehtib voolul C/20 (7,2 Ah → 0,36 A); 0,85 A juures on kasutatav mahtuvus ~ 10–15 % väiksem (Peukerti efekt, tootja tühjenemistabel) [KONTROLLIMATA, tootja]; (2) toiteploki omatarve akult (10–30 mA) [HINNANG]; (3) külmas on **laadimata** pliiaku külmumisoht (vt p 2.6). Järeldus muutub vähe; varu jääb k-sse. |
| 6 | p 6.b rida 10 | „Aku 17 Ah … varuaeg p 1.5“ | **VIGA** | Faili p 1.5 ei ole (arvutus on p 1.4). Lisaks: 2 ust ühe toiteploki taga, püsikoormus 0,95 A (arvutus E3) → 17 Ah annab **14,3 h**; faili p 8 eesmärk „24 h kontor“ nõuab **28,5 Ah** → 2 × 17 Ah rööbiti või 1 × 26–33 Ah (toiteploki laadimisvõime kontrolli). |
| 7 | p 2.3 skeem | „TSS väljund (NC) — [DIN-relee K1, **NC** kontakt] — avariinupp — lukk“; „kaabli katkemine = vabastus (NC loogika)“ | **VIGA (skeem)** | Kui K1 mähist toidab TSS (tavaolekus pinge all) ja luku ahelasse pannakse K1 **NC** kontakt, on lukk tavaolekus pingevaba ja **kaabli katkemisel saab lukk toite** (jääb lukku) — vastupidi soovitule. Õige: K1 tavaolekus pinge all (TSS järelevalvega väljund või potentsiaalivaba NC kontakt, mis hoiab K1 toidet), luku ahelas K1 **NO** kontakt (suletud, kui K1 on pinge all). Siis TSS häire, kaabli katkemine, K1 mähise läbipõlemine ja toite kadu = lukk vaba (fail-safe). Sõnastus „NC tavaolekus suletud“ ja „NC kontakt“ tähendavad releel eri asju — skeemile kontaktide olekud pingestamata releel (EN 60617 tava) [HINNANG]. |
| 8 | p 2.3, p 2.4 | TSS ja avariinupp katkestavad luku toite otse, jadamisi; kontroller ainult „luba lukustada“ | **ÕIGE** | Ohutusfunktsioon riistvaras, sõltumatu tarkvarast ja serverist; vastab SiM m 17 § 48 lg 1 p 3 tulemusnõudele (Nõunik p 9.1). Lisa: avariinupu 2. poolus on parem panna **teise** juhtme (−) katkestajaks või releed ühe pooluse rikkeks (kontaktide kokkukeevitus) mõlemas juhtmes katkestama [HINNANG; EN 13637 nõue KONTROLLIMATA]. |
| 9 | p 2.6 p 6 | vastuplaadile vabajooksudiood relee kontakti kaitseks | **ÕIGE, TÄPSUSTA** | Diood **mähise klemmidel** (katood +), mitte relee juures; diood pikendab väljalülitust (magnetlukul vabanemine 50–200 ms [HINNANG]) → magnetlukul eelistada diood + Zener/TVS või varistori (kiirem vabanemine). Kontrolli, kas lukus on juba kaitse (paljudel magnetlukkudel sisseehitatud) — topelt ei kahjusta. AC-lukule (vahelduvvool) varistor/RC [HINNANG]. |
| 10 | p 1.2 ja p 1.1 | Wiegand „≤ ~100 m“ (skeem) vs „~150 m“ (tabel) | **TÄPSUSTA** | Vastuolu failis. Tüüpiline Wiegandi piir on 150 m 0,5 mm² (22 AWG) juhiga, sõltub lugeja voolust ja ristlõikest [KONTROLLIMATA, SIA AC-01 / tootja]. Lugeja **toite** pingelang on sageli piiravam kui signaal: 0,25 A, 0,22 mm², 50 m → ΔU 2,56 V. Lugeja toide eraldi 0,75 mm² soontega. |
| 11 | p 5.2 Shelly 1 Gen4 | toide „12 V DC stabiliseeritud“; kontakt 10 A/30 V DC | **TÄPSUSTA (oluline)** | „Stabiliseeritud 12 V“ tähendab, et akuga toiteploki 10,5…13,8 (laadimisel kuni 14,4) V **võib olla väljaspool lubatud vahemikku** [KONTROLLIMATA, tootja kasutusjuhend]. Lahendus: Shelly toide eraldi DC/DC-st (laia sisendiga 9–36 V → 12 V) või Shelly Plus Uni / tööstusrelee 12–24 V DC laia vahemikuga. 10 A/30 V DC on **takistuslik** nimivool; induktiivsel DC-koormusel (DC-13) on lubatud vool ja eluiga oluliselt väiksemad (EVS-EN 61810-1:2015; tootja andmed) [KONTROLLIMATA]. |
| 12 | p 5.2, p 6.a rida 3–4 | Shelly 1 relee lukule, magnetlukk demos | **VIGA (liides)** | Shelly 1 seeria väljund on **ainult NO** kontakt [KONTROLLIMATA, tootja]. `shelly_skript.js` teeb `Switch.Set on:true, toggle_after: s` = kontakt suletakse s sekundiks. See avab **fail-secure** vastuplaadi (pinge all = lahti), kuid **magnetluku** puhul (pinge all = lukus) tähendab sama käsk „lukusta s sekundiks“. Magnetlukk vajab vahereleed NC kontaktiga või ümberpööratud loogikat (relee tavaliselt sees, käsk lülitab välja) — viimane on ohtlik, sest Shelly taaskäivitus/hangumine määrab luku oleku. Soovitus: magnetluku ahelas alati vaherelee NC kontakt + TSS/avariinupp jadamisi (p 2.3). Skripti ei muudetud; ettepanek arendajale: KONF-i väli `loogika: 'NO'|'NC'` ja dokumenteeritud ühendusskeem. |
| 13 | p 5.2 | Shelly −20…+40 °C, ei sobi kütmata konteinerisse | **ÕIGE** | Lisa: ka ülemine piir +40 °C — päikese käes metallkonteineris või suletud karbis küttega võib suvel olla > 40 °C [HINNANG]. |
| 14 | p 4.1, p 8 | LiFePO4 ei tohi laadida alla 0 °C ilma küttega; külmas plii-AGM | **ÕIGE** | Tavaline tootja piir laadimisel 0…+45 °C, tühjendamisel −20…+60 °C [KONTROLLIMATA, tootja]. Lisa pliiaku kohta: temperatuurikompensatsioon (≈ −3 mV/°C/element → −20 °C juures ~ +0,8 V, ~14,6 V) [KONTROLLIMATA, tootja]; ilma selleta jääb aku külmas alalaetuks. Tühjenenud pliiaku elektrolüüt külmub juba ~ −5…−10 °C juures [KONTROLLIMATA, tootja] → konteineris sügavtühjenemise kaitse ja kiire järellaadimine kohustuslikud. |
| 15 | p 6.a, rida 7 | demolaua toiteplokk 13,8 V 3 A | **TÄPSUSTA** | Arvutus E2: püsikoormus 1,18 A + tipud 1,28 A + laadimine 0,72 A = 3,18 A; 25 % varuga **4,0 A > 3 A**. Raspberry Pi 5 (kuni ~25 W [KONTROLLIMATA, tootja]) eraldi oma toiteplokist. → 5 A toiteplokk. |
| 16 | p 6.b, rida 9 | 13,8 V 5 A, 1 tk 2 ukse kohta | **ÕIGE** | Arvutus E3: 3,41 A; 25 % varuga 4,26 A ≤ 5 A. Kui samast plokist toita ka 4G/Wi-Fi ruuter (0,35 A), 4,7 A — piiri peal → ruuter UPS-ilt või eraldi. |
| 17 | p 6.b rida 14, p 2.3 | „DIN-relee 24 V mähisega + kaitse“ | **TÄPSUSTA** | Mähise pinge peab vastama TSS väljundi tüübile (keskseadme 24 V järelevalvega väljund vs potentsiaalivaba kontakt, mille kaudu toidetakse 12 V mähis lukutoiteplokist). Ühendusviisi otsustab ATS-ettevõtja (Nõunik p 9.4). Vaherelee annab ka galvaanilise eralduse (vt vastus Nõunikule 3). |
| 18 | p 1.4 | UPS ka ruuterile ja kommutaatorile | **ÕIGE** | Lisa: UPS-i varuaeg peab olema vähemalt sama kui lukuakul, muidu variant A kaob enne lukutoidet. 650 VA UPS + 20 W võrguseadmed annab tavaliselt 40–90 min [KONTROLLIMATA, tootja] — mitte 14–24 h. → 12 V DC-toitega ruuter/kommutaator samast akutoiteplokist (DC-UPS) või PoE-kommutaator 12/24 V toitega. |
| 19 | p 2.5 tüüpkaablid, p 6 | LiYY 2×1,5 / 4×1,0 / 6×0,22; „kaitsmed“ | **TÄPSUSTA** | Puudu: (1) **iga** luku/lugeja haru eraldi kaitse toiteploki juures (T1A…T2A), sest 0,22 mm² soone koormatavus (~1 A [KONTROLLIMATA, kaabli tootja]) on väiksem kui toiteploki väljundi PTC (3–5 A); kaitse In ≤ juhi Iz (EVS-HD 60364-4-43:2023, sisu KONTROLLIMATA); (2) **aku kaitse aku klemmi juures** (7–26 Ah AGM lühisvool sadu ampreid [HINNANG]); (3) 0,75–1,5 mm² juures koormatavus ei ole piirav (lukuvoolud ≤ 1,3 A), määrab pingelang (p 1). |
| 20 | p 4.1 | ehitusplatsil rikkevoolukaitse, H07RN-F | **ÕIGE** | EVS-HD 60364-7-704:2018. Lisa SPD (p 2.4). |
| 21 | p 5.3 | IK08 / IK10, EN 62262 KONTROLLIMATA | **ÕIGE** | evs.ee ei leidnud ka minu otsinguga; märge jääb. |
| 22 | p 7 | akude vahetus 3–5 a | **TÄPSUSTA** | VRLA eluiga 20 °C juures 3–5 a (Yuasa NP „design life“) [KONTROLLIMATA, tootja]; iga +10 °C üle 20 °C ~ poolitab eluea [HINNANG]. Kütetud karbis + suvel konteineris: 2–3 a. Lisa aku sisetakistuse mõõtmine (kiire ja ei tühjenda akut). |
| 23 | p 1.3 | variant A ei tööta võrgu kadumisel | **ÕIGE** | Ka `shelly_skript.js`: pollib iga 1 s, viga = vaikne `return`; kohalikku nimekirja pole. Lisa p 2.6 heartbeat. |

**Kokkuvõte:** Ehitusinseneri lahendus on põhimõttelt õige (ohutusfunktsioon riistvaras, fail-secure välisuksel, OSDP, 24 V pikkadel kaablitel). **Vead:** TSS vaherelee kontakti tüüp skeemil (#7), 13,8 V vs luku 13 V ülapiir (#2), Shelly NO-kontakt + magnetluku loogika (#12), 17 Ah ei anna 24 h (#6). Parandada enne paigaldusjuhendit.

---

## 2. Töökindlus

### 2.1 Toite arhitektuur
| Variant | Kirjeldus | Plussid | Miinused | Soovitus |
|---|---|---|---|---|
| Kohalik toiteplokk ukse juures (1–2 ust) | 13,8/27,6 V akuga plokk ukse lähedal kaitstud poolel | lühikesed kaablid, väike ΔU, rike mõjutab 1–2 ust | mitu akut hooldada; 230 V iga ukse juurde | kontor, ehitusobjekt (Ehitusinseneri valik ÕIGE) |
| Keskne toiteplokk (tehniline ruum) | üks 24 V 10–20 A akuga plokk, harud eraldi kaitsmetega | üks aku hooldada; ruuter, kommutaator ja kontrollerid samal DC-UPS-il | pikad kaablid → 24 V kohustuslik; ühe ploki rike = kõik uksed | suuremal objektil (> 6 ust), 2 plokki (N+1) |
- **Toiteallika klass:** EVS-EN 50131-6:2017+A1:2021 jagab toiteallikad tüüpideks A/B/C (A = võrk + laetav aku koos seirega) ja turvaastmeteks; nõuab muu hulgas rikkesignaale (võrgu kadu, aku madal pinge, aku rike) ja järellaadimise aega [sisu KONTROLLIMATA]. Läbipääsusüsteemile on see analoogia (EVS-EN 60839-11-1:2013 nõuab toitele omad nõuded [KONTROLLIMATA]). **Nõua toiteplokilt tüüp A analoogi:** võrgu ja aku rikke potentsiaalivabad väljundid, sügavtühjenemise kaitse, laadimisvoolu valik, temperatuurikompensatsioon (konteiner).
- **Elektroonika eraldi DC/DC kaudu:** lukk otse akusiinilt, Shelly/ESP32/lugeja 9–36 V → 12 V (või 5 V) DC/DC muundurilt. Siis luku sisselülitusvool ega aku pingekõikumine ei taaskäivita kontrollerit (brown-out) [HINNANG].
- **230 V toide:** toiteplokk eraldi grupist (B6/B10), märgistatud „Läbipääs, mitte välja lülitada“; mitte valgustuse või pistikupesagrupi taga. Aruka rikkevoolukaitse (RCD) rakendumisel: fail-safe uks vaba, fail-secure lukus (mehaaniline väljapääs) — mõlemal juhul aku katab. Zs kontroll arvutus E5.
- **Aku paigaldus:** VRLA aku eraldab laadimisel vähe gaasi; suletud karbis ventilatsiooniava (EVS-EN IEC 62485-2:2018, sisu KONTROLLIMATA). Akut ei panda kütteelemendi vastu.

### 2.2 Induktiivse koormuse kaitse ja relee kontaktid
- Lukk (vastuplaat, magnetlukk, solenoid) on induktiivne: väljalülitusel tekib mähisel tagasilöögipinge (sadu V), kontaktil kaar → kontaktide põlemine/kokkukeevitus, EMÜ häired (Shelly/ESP32 taaskäivitus) [HINNANG, üldtuntud].
- Kaitse **mähise klemmidel**: DC → diood (1N4007) või diood + Zener (kiirem vabanemine); AC → varistor või RC [HINNANG]. Magnetlukul kontrolli, et vabanemisaeg jääb väikeseks (pelk diood + jääkmagnetism) [KONTROLLIMATA, tootja].
- **Kontakti eluiga (arvutus E4):** 200 avamist/päevas = 73 000 tsüklit/a. Kui relee elektriline eluiga nimikoormusel on ~100 000 tsüklit [KONTROLLIMATA, tootja], kestab see takistusliku nimikoormuse juures ~1,4 a. Lukk 0,3–1,3 A on nimivoolust (10 A) palju väiksem → eluiga oluliselt pikem, kuid DC-induktiivkoormuse kõver on tootjal eraldi (EVS-EN 61810-1:2015 kategooria DC-13) [KONTROLLIMATA]. Soovitus: lukku lülitab **DIN-vaherelee pistikupesaga** (vahetatav, 6 A, kuldkontaktid ei sobi > 0,1 A) või MOSFET/pooljuhtrelee DC jaoks; Shelly lülitab ainult vaherelee mähist (~0,03–0,05 A) [HINNANG].

### 2.3 Maandus ja EMÜ
- SELV-ahelat ei maandata (EVS-HD 60364-4-41:2017+A12:2019 p 414, sisu KONTROLLIMATA); PELV-i korral üks maanduspunkt toiteploki juures. Ekraanid (LiYCY, RS-485) maandatakse **ühest otsast** kontrolleri poolel (maandussilmuse vältimine) [HINNANG]; RS-485 vajab ka ühist võrdluspotentsiaali (GND-soon) ja 120 Ω terminaatoreid liini otstes [KONTROLLIMATA, TIA-485].
- **Wiegand vs OSDP:** Wiegand on ühesuunaline TTL/5 V tasemega, mürakindluselt nõrk ja ilma järelevalveta; OSDP RS-485 on diferentsiaalne (mürakindel), kahesuunaline, järelevalvega ja Secure Channeliga (EVS-EN IEC 60839-11-5:2020). Elektriliselt ja turvaliselt on OSDP parem alati, kui kaabel > 10 m või väljas [HINNANG]. Ehitusinseneri soovitus ÕIGE.
- **Toite- ja signaalkaabel lahus** 230 V kaablitest (≥ 50–100 mm või vahesein), ristumine 90° all (EVS-EN 50174-2 analoogia [olek ja sisu KONTROLLIMATA]).
- **Liigpinge (SPD):** välistel kaablitel (lugeja väljas, värav, kaabel konteinerite vahel, 4G antenn mastis) on suurim oht pikse indutseeritud liigpinge. Meetmed [HINNANG; EVS-HD 60364-4-443:2016, EVS-EN IEC 62305-4:2025, sisu KONTROLLIMATA]: 230 V toite SPD tüüp 2 konteineri kilbis (ehitusplatsi kilbis on tihti olemas — kontrolli); andmeliini SPD (RS-485/Wiegand, 12–24 V) kaabli sisenemisel hoonesse/konteinerisse; antenni koaksiaal-SPD; kõik SPD-d ühise potentsiaaliühtlustusega konteineri korpusega. Toode EVS-EN IEC 61643-11:2025 (230 V) ja EN 61643-21 (andmeliin [olek KONTROLLIMATA]).
- **Häirekindlus:** tööstuslikul objektil (ehitusplats, ladu tõstukitega) eelistada seadmeid, mis on deklareeritud EVS-EN IEC 61000-6-2:2019 (tööstuskeskkond) järgi; Shelly on olme-/kontoriseade (61000-6-1 [KONTROLLIMATA, tootja DoC]).

### 2.4 Relee valik
| Valik | Kontakt | Toide | Temp. | Eluiga / märkus | Kus |
|---|---|---|---|---|---|
| Shelly 1 Gen4 | 1 × NO, 10 A/30 V DC takist. | 110–240 V AC; 24–48 V DC; 12 V DC stab. [KONTROLLIMATA] | −20…+40 °C | olmeseade; Wi-Fi; algolek seadistatav | siseuks fail-secure, demo |
| Shelly Plus Uni | 2 × pooljuhtväljund (mA-klass), 2 sisendit, pinge sisend | 12–36 V DC [KONTROLLIMATA] | [KONTROLLIMATA] | sobib akusiinile, vajab vahereleed | uks + uksekontakt + luku tagasiside |
| Shelly Pro 1 / Pro seeria (DIN, LAN) | [KONTROLLIMATA, kas NO/NC] | 110–240 V AC (osa 24 V DC) | −20…+40 °C | kaabelvõrk | tehniline kapp |
| ESP32-POE + DIN-vaherelee (Finder 38/40 seeria vms) | vahereleel NO+NC (CO) | PoE või 12–24 V | −40…+70 °C relee [KONTROLLIMATA] | pistikupesas vahetatav relee | kontrollerid, konteiner |
| Tööstuslik kontroller (OSDP) | CO 2–5 A, sertif. EVS-EN 60839-11-1 | 12 V DC laia vahemikuga | −10…+50 °C tüüp. | sees tamper, aku seire | välisuksed |
Põhireegel: **Shelly ei lülita lukuvoolu otse, kui lukk on magnetlukk või > 0,5 A, või kui uks on evakuatsiooniteel** — siis vaherelee CO-kontaktiga [HINNANG].

### 2.5 Taaskäivitus ja algolek
- Toitekatkestuse, püsivara uuenduse või hangumise järel peab relee algolek olema **„lukk kinni / turvaline“**: Shelly seadistus „Power-on default“ = **Off** (mitte „Restore last“) [KONTROLLIMATA, tootja API `Switch.SetConfig initial_state`]. Fail-secure vastuplaadil Off = lukus; magnetlukul läbi vaherelee NC: Off = magnet toitel = lukus, kuid TSS/avariinupp vabastab riistvaras.
- Skripti „Run on startup“ peab olema sees; skript kasutab `toggle_after`, seega ka ühenduse katkemisel lülitub relee ise tagasi (ÕIGE lahendus skriptis).
- Kontroller ei tohi käivitudes anda impulssi (ESP32 GPIO-d on käivitusel hõljuvas olekus) → väljundile alla tõmbav takisti ja vaherelee juhtimine transistoriga [HINNANG].

### 2.6 Watchdog ja heartbeat
- Shelly pollib iga 1 s → server **saab** pollimise ajast heartbeat'i, kuid `voti.js` ei salvesta „viimati nähtud“ aega ega häiri seadme kadumisel (kontrollitud: `relee:<kood>` hoiab ainult käske). Ettepanek arendajale: salvesta `seade_nahtud:<kood>` (aeg, püsivara, RSSI, toiteploki rikkesisend) ja **häire haldurile**, kui seade pole 60 s pollinud (uks ei avane, kasutaja ei tea miks).
- Seadme poolel: Shelly sisseehitatud riistvara-watchdog taaskäivitab hangunud püsivara [KONTROLLIMATA]; skriptile lisada vigade loendur → `Shelly.reboot()` pärast N järjestikust viga [HINNANG; ettepanek, skripti ei muudetud].
- Kasutajale: telefon näitab „Uks ei vasta (võrguühendus puudub)“, kui seade pole 5 s jooksul käsku võtnud — mitte „Uks on avatud“.

### 2.7 Võrguühendus
- **Kaabel enne Wi-Fi:** välisuksel ja tehnilises kapis Ethernet/PoE (PoE = toide + side, kesk-UPS); Wi-Fi siseustel.
- **Eraldi VLAN / SSID** IoT-seadmetele, ainult väljaminevad ühendused serverisse (443), kohalik Shelly HTTP-liides parooliga, pilv (Shelly Cloud) ja BLE välja [HINNANG]. Ehitusinseneri p 5.2 ÕIGE.
- **4G varukanal:** ruuter kahe WAN-iga (kaabel + 4G, automaatne ümberlülitus), nt Teltonika RUT-seeria [KONTROLLIMATA, tootja]; SIM eraldi operaatorilt kui põhiühendus.
- **Offline:** variant A ei tööta ilma võrguta (kõik otsused pilves) → välisuksel variant B kohaliku nimekirjaga või mehaaniline võti/PIN halduritele. Pollimise koormus (README: 86 400 päringut/ööpäev/seade) → tootmises WebSocket/MQTT; elektriliselt pole vahet.

### 2.8 Külm, kondensaat, IP ja IK
- Külm: vt leiud #13, #14. Konteineris akutoiteplokk ja aku **kütetud karbis**, kuid kütte võimsus 230 V-st; voolukatkestusel karp jahtub → kogu varuaeg arvesta k = 0,48 (Ehitusinseneri arvutus 1 d ÕIGE). LiFePO4 ainult isekütva (sisseehitatud küttega, laadimise blokeering < 0 °C) akuga [KONTROLLIMATA, tootja].
- Kondensaat: membraanventiil, kaablid altpoolt, tilgasilm, küttekeha termostaadiga (Ehitusinsener p 4.1 ÕIGE). Lisa: klemmid karbi ülaossa, aku põhja.
- IP/IK: Ehitusinseneri p 5.3 ÕIGE; lisaks kaabli kaitse lugeja ja kontrolleri vahel (lugeja taga seinast läbi, mitte pinnal).

### 2.9 Tuleohutuse liides elektriliselt
- **NC-ahel (normaalselt suletud, voolu all):** iga katkestus (TSS häire, kaabli katkemine, avariinupp, toite kadu) vabastab luku → fail-safe (vt leid #7 parandusega).
- **Järelevalvega ahel (lõhe ja lühis):** pelk NC-ahel tuvastab katkemise (vabastab), kuid **lühist ei tuvasta** — lühistatud TSS-kaabel jätab luku toitele ka häire ajal. ATS-i juhtimisväljundid on keskseadme poolt järelevalvega (EOL-takisti, lõhe/lühis = rike) [EVS-EN 54-2:1999, sisu KONTROLLIMATA]; seepärast **vaherelee mähis keskseadme järelevalvega väljundile** ja vaherelee **ukse lähedale**, mitte keskseadme juurde (lühiseoht pikal liinil jääb järelevalve alla) [HINNANG].
- **2-pooluseline avariinupp:** poolus 1 katkestab luku toite, poolus 2 annab kontrollerile häiresisendi (Ehitusinsener ÕIGE). Mitte kunagi tarkvara kaudu.
- **Kontroller** loeb TSS ja avariinupu olekut ainult logiks; pilv ei saa vabastust tühistada (Ehitusinsener ÕIGE).

---

## 3. Ideed ja komponendid töökindluse ja väärtuse lisamiseks

| # | Idee | Kasu | Hind [HINNANG] | Keerukus |
|---|---|---|---|---|
| 1 | Uksekontakt (reed) + luku tagasiside (magnetluku olekuväljund / vastuplaadi riivikontakt) Shelly sisendisse | tõend, et uks päriselt avati/lukustus; „uks jäi lahti“, sundavamine | 10–30 €/uks | väike (Shelly sisend, skripti 5 rida) |
| 2 | Voolu-/pingemõõtmine releel (Shelly Plus 1PM / Pro 1PM; DC jaoks INA219/INA226 ESP32-l) | luku mähise rike (vool 0), kaabli lühis (vool ↑), aku pinge → ennetav hooldus | 10–35 €/uks | väike–keskmine (AC-PM mõõdab AC; DC lukule eraldi andur) |
| 3 | Aku- ja toiteploki seire (rikkeväljundid + pingeandur kontrollerisse, teade pilve) | aku vahetus enne riket; võrgukatkestuse teavitus | 5–20 € + toiteplokk rikkeväljunditega | väike |
| 4 | Heartbeat + kaugtaaskäivitus (server häirib 60 s vaikuse järel; seadme toite kaugkatkestus teise relee või nutipistikuga) | rike nähtav enne kasutaja kaebust | 0 € tarkvara; 20 € relee | väike |
| 5 | Edge-koopia (Raspberry Pi / tööstusarvuti kohapeal: kohalik nimekiri, logipuhver, TOTP kontroll) | variant B ja A töötavad interneti katkestuse ajal; kiirem reaktsioon | 100–250 €/objekt | keskmine–suur (sünkroonimine, õiguste aegumine) |
| 6 | PoE-lugejad ja PoE-kontrollerid (ESP32-POE, 802.3af) + PoE-kommutaator DC-UPS-il | üks kaabel, kesk-UPS, vähem toiteplokke | +20–40 €/uks, kommutaator 150–300 € | keskmine |
| 7 | Energiamõõtmine automaatidel (Shelly Plus PM Mini / Pro 1PM kohvimasina toitel, ainult mõõtmiseks) | kasutuse tõend vs ostud (kohvimasina tsükli energia), rikke avastus | 20–40 €/masin | väike (mustrituvastus tarkvaras) |
| 8 | Toiteploki N+1 (2 plokki dioodidega rööbiti) välisuksel | ploki rike ei peata ust | 60–120 € | väike |
| 9 | Kontaktide kulumise loendur (tarkvara: tsüklid seadme kohta) + plaaniline vaherelee vahetus | ennetav hooldus | 0 € | väike |
| 10 | Temperatuuri- ja niiskusandur kontrollerikarbis (konteiner) | kütte rikke ja kondensaadi avastus | 5–15 € | väike |

---

## 4. Paigaldus ja dokumentatsioon

### 4.1 Kes võib paigaldada
- 230 V osa (toiteploki grupp kilbis, ehitusplatsi toide): elektritöö, mida teeb pädev isik/ettevõtja (EhS / seadmete ohutuse seadus, elektritöö ettevõtja teatis ja pädev isik) **→ Nõunik** (tõlgendus, kas SELV 12/24 V osa on elektritöö).
- ATS-iga ühendamine: ainult ATS-ettevõtja (Nõunik p 9.4, TuOS § 33).
- Tuletõkkeukse lukk: ukse tootja lubatud komponent, paigaldus tootja juhendi järgi (Ehitusinsener p 2.2; Nõunik p 9.3).
- Valveseadmestiku paigaldus (kui süsteem edastab häireid turvaettevõttele) **→ Nõunik** (TurvaTS, Nõunik p 9.5).

### 4.2 Mõõtmised kasutuselevõtul (EVS-HD 60364-6:2016+A11+A12, sisu KONTROLLIMATA)
| Mõõtmine | Kus | Kriteerium [HINNANG / standard KONTROLLIMATA] |
|---|---|---|
| Kaitsejuhi pidevus | toiteploki 230 V grupp (I klassi plokk) | mõõdetud, R ≤ arvutatud (E5) |
| Isolatsioonitakistus 500 V DC | 230 V grupp | ≥ 1 MΩ (SELV-ahelad lahti ühendada!) |
| Isolatsioonitakistus 250 V DC | SELV-ahel vs 230 V / maa | ≥ 0,5 MΩ; elektroonika enne lahti |
| Rikkeahela impedants Zs / RCD rakendumine | 230 V grupp | Zs ≤ Zs_max (E5); RCD ≤ 300 ms In juures |
| Pinge lukul **koormusega** (lukk avatud), võrgutoitel ja **akutoitel** | iga lukk | tootja vahemikus ka akul ~11 V juures (p 1 #3) |
| Ootelaadimispinge, laadimisvool | toiteplokk | 13,65–13,8 V (tootja) ± kompensatsioon |
| Aku varuaeg (või sisetakistus) | toiteplokk | ≥ projekteeritud (24 h / 72 h) |
| Luku vabanemisaeg TSS / avariinupuga | evakuatsiooniuksed | uks avaneb kohe; mõõda (nt < 1 s [HINNANG]) |
| Lõhe ja lühis TSS-liinil | TSS ATS-ettevõtjaga | keskseade näitab riket; lukk vaba lõhel |
| Võrgu ja serveri katkestus | kõik uksed | variant A: kasutajale teade; variant B: töötab; väljapääs alati |
| Toitekatkestus + taaskäivitus | kõik releed | algolek lukus (fail-secure) / vaba (TSS); ei avane käivitusel |

### 4.3 Kontrollnimekiri
**Kasutuselevõtt (kõik ✓, protokoll objekti dokumentidesse):**
1. Skeem (ühendus- ja kaablitabel) vastab tegelikule; kaablid märgistatud.
2. Iga haru kaitse paigas ja märgistatud; aku kaitse aku juures.
3. Lukk: diood/varistor paigas; pinge koormusega võrgul ja akul mõõdetud.
4. Relee algolek „Off“, skript käivitub automaatselt; toite katkestuse test.
5. TSS-vabastus (ATS-ettevõtjaga), lõhe/lühis test, avariinupp, väljumisnupp.
6. Uksekontakt, „uks jäi lahti“, sundavamise häire.
7. Heartbeat: seade lahti → haldur saab teate ≤ 60 s.
8. Võrgukatkestus, 4G ümberlülitus, offline (variant B).
9. Isolatsioon ja Zs (4.2), SPD olekunäidikud.
10. Haldurile mehaaniline varuvõti ja juhend; dokumentatsioon (skeem, andmelehed, tootja kinnitus tuletõkkeuksele, protokoll).

**Hooldus:**
| Mida | Sagedus [HINNANG] |
|---|---|
| Avariinupp, väljumisnupp, uks jäi lahti | kord kuus (haldur) |
| TSS-vabastus | ATS hoolduse graafikus (vähemalt kord aastas juhitavate seadmete kontroll, Nõunik p 9.4: SiM m 1 § 27 lg 2 p 4) |
| Pinge lukul koormusega, laadimispinge, rikkeväljundid | kord kvartalis (objektil kord kuus) |
| Aku sisetakistus / varuaja test | kord aastas; vahetus 3–5 a (soojas/konteineris 2–3 a) |
| Vaherelee/Shelly tsüklid loenduri järgi | vahetus enne 50 % tootja elueast |
| SPD näidikud, klemmid, kondensaat, karbi küte | kord kvartalis; pärast äikest |
| Isolatsioon ja Zs 230 V grupil | EVS-HD 60364-6 perioodiline kontroll (sagedus → Nõunik) |

---

## 5. Muudatusettepanekud BOM-ile

| # | BOM | Muudatus | Põhjus | Hinnamõju € [HINNANG] |
|---|---|---|---|---|
| 1 | 6.a #7 | **Asenda** 13,8 V 3 A → 5 A toiteplokk rikkeväljunditega | E2: 4,0 A vajadus | +30 |
| 2 | 6.a | **Lisa** Raspberry Pi 5 eraldi toiteplokk (27 W USB-C) | Pi ei koorma luku akut | +15 |
| 3 | 6.a, 6.b, 6.c | **Lisa** DIN-vaherelee pistikupesaga (CO-kontakt) + diood/varistor igale lukule | Shelly NO-kontakt, magnetluku loogika, kontaktide eluiga, vahetatavus | 6.a 2 × 15 = +30; 6.b 4 × 15 = +60; 6.c 3 × 15 = +45 |
| 4 | 6.a, 6.b, 6.c | **Lisa** DC/DC 9–36 V → 12 V elektroonikale (Shelly, ESP32, lugeja) | Shelly „stabiliseeritud 12 V“ vs aku 10,5–14,4 V; brown-out | 6.a 1 × 15; 6.b 2 × 15; 6.c 3 × 15 = +15 / +30 / +45 |
| 5 | 6.b #10 | **Asenda** 2 × 17 Ah → 2 × 33 Ah (või 4 × 17 Ah) | E3: 24 h nõuab 28,5 Ah | +2 × 50 = +100 |
| 6 | 6.b #16 | **Asenda** 650 VA UPS → 12/24 V DC-toitega ruuter/kommutaator samal akutoiteplokil (või UPS-i varuaja arvutus) | UPS kestab < 1,5 h, lukuaku 24 h | 0…+80 |
| 7 | 6.b #7, 6.c #12 | **Asenda** Shelly 1 Gen4 → Shelly Plus 1PM / Pro 1PM (või lisa voolumõõtmine) siseustel ja automaadil | luku/automaadi rikke tuvastus | 3 × 10 = +30 |
| 8 | 6.b, 6.c | **Lisa** haru-kaitsmed (sulavkaitsmega klemmid T1A–T2A) + aku kaitse aku juures | EVS-HD 60364-4-43:2023 (Iz < plokk PTC) | 6.b +40; 6.c +30 |
| 9 | 6.c | **Lisa** SPD: 230 V tüüp 2 (kui kilbis pole), andmeliini SPD lugejatele (2) ja värava kaablile, 4G antenni koaksiaal-SPD | välikaablid, pikse indutseeritud liigpinge | 120 + 3 × 40 + 30 = +270 |
| 10 | 6.c #8 | **Asenda** toiteplokk → temperatuurikompensatsiooniga (andur akul) | pliiaku alalaadimine külmas | 3 × 30 = +90 |
| 11 | 6.c | **Lisa** temperatuuri/niiskuse andur karpi + aku pingeandur kontrollerisse | kütte rike, aku seire | 3 × 15 = +45 |
| 12 | 6.b, 6.c | **Lisa** luku olekuandur (magnetluku olekuväljund / riivi kontakt), kui lukul pole | tõend „päriselt lukus“ | 6.b +60; 6.c +40 |
| 13 | 6.b #14 | **Täpsusta** vaherelee mähise pinge ATS-ettevõtjaga; relee ukse juurde | järelevalve ulatus (p 2.9) | 0 |
| 14 | töö | **Lisa** mõõtmised ja protokoll (p 4.2) | EVS-HD 60364-6 | 6.a +1 h (45); 6.b +4 h (180); 6.c +3 h (135) |

**Hinnamõju kokku [HINNANG]:** 6.a ≈ **+180 €** (2 528 → ~2 710 €); 6.b ≈ **+590…+670 €** (8 788 → ~9 400–9 460 €); 6.c ≈ **+790 €** (4 804 → ~5 590 €). Kokku kolme konfiguratsiooni peale ≈ +1 560…1 640 €. Kõige olulisemad (kui raha on vähe): #3 vaherelee, #4 DC/DC, #5 aku, #8 kaitsmed, #9 SPD konteineril.

---

## 6. Arvutused

**E1. Pingelang (ΔU = 2·L·I·ρ/A, ρ = 0,0225 Ω·mm²/m, `pingelang.py pingelang 1 L I A 1 0.0225 U`)**
| Juhtum | ΔU | % | Pinge lukul |
|---|---|---|---|
| Magnetlukk 0,5 A, 0,75 mm², 20 m, 12 V | 0,60 V | 5,00 % | 11,40 V (võrk 12 V) |
| Sama 30 m | 0,90 V | 7,50 % | 11,10 V; akul 10,5 V → **9,60 V** |
| Vastuplaat 1,3 A, 1,5 mm², 20 m, aku lõpp 10,5 V | 0,78 V | 7,43 % | **9,72 V** (< 11 V) |
| Sama 24 V lukk 0,65 A, 1,5 mm², 20 m | 0,39 V | 1,62 % | 23,6 V |
Järeldus: kriteerium on luku lubatud pingevahemik halvimas olekus (aku tühjenemise lõpp); EVS-HD 60364-5-52 lisa G 3 %/5 % piir käib 230 V paigaldise kohta ega ole SELV-lukul määrav [sisu KONTROLLIMATA]. **> 20 m või > 1 A → 24 V või toiteplokk ukse juurde.**

**E2. Toiteplokk, demolaud (13,8 V)**
I = Σ püsi + Σ tipp (samaaegne) + I_laad; valik ≥ 1,25 · I.
Püsi: magnetlukk 0,50 + 2 Shelly 0,20 + lugeja 0,25 + kontroller 0,10 + kohvidemo 0,10 + 2 e-paberit DC/DC kaudu 0,03 = 1,18 A. Tipp: vastuplaat 0,28 + külmiku solenoid käivitusel ~1,0 [HINNANG] = 1,28 A. Laadimine: 0,1 · C = 0,1 · 7,2 = 0,72 A [HINNANG, tootja soovitab ≤ 0,25 C].
I = 1,18 + 1,28 + 0,72 = 3,18 A → 1,25 · 3,18 = **3,98 A → 5 A plokk** (BOM-is 3 A).

**E3. Toiteplokk ja aku, kontor (2 ust ühe ploki taga)**
Püsi: 2-ukse kontroller 0,30 + 2 lugejat 0,50 + mootorlukk ootel 0,15 = 0,95 A [HINNANG, tootja andmed KONTROLLIMATA]. Tipp: mootorlukk 1,5 + vastuplaat 0,28 = 1,78 A. Laadimine 80 % 24 h jooksul: 0,8 · 17 / 24 · 1,2 (kasutegur) = 0,68 A.
I = 0,95 + 1,78 + 0,68 = 3,41 A → 1,25 · 3,41 = **4,26 A ≤ 5 A** (ÕIGE); ruuteriga 0,35 A → 4,70 A (piiri peal).
Aku: t = C·k/I = 17 · 0,8 / 0,95 = **14,3 h**; 24 h jaoks C = I·t/k = 0,95 · 24 / 0,8 = **28,5 Ah**.

**E4. Relee eluiga**
N = 200 avamist/päev × 365 = 73 000 tsüklit/a; eluiga 100 000 tsüklit [KONTROLLIMATA, tootja] → 100 000 / 73 000 = **1,4 a** nimikoormusel. Väike lukuvool pikendab, DC-induktiivne lühendab → vaherelee pistikupesas ja tsüklite loendur.

**E5. Toiteploki 230 V grupp, rikkeahel (TN, B10, 25 m, 1,5 mm², Ze = 0,35 Ω [HINNANG])**
Zs = Ze + ρ·L/S_L + ρ·L/S_PE = 0,35 + 0,0225·25/1,5 · 2 = **1,10 Ω**; Zs_max = U0 / (5 · In) = 230 / 50 = **4,60 Ω** → täidetud (`pingelang.py zs`, `zsmax`). Mõõtmisega kinnitada (p 4.2).

---

## 7. Vastused Nõunikule (`OIGUSLIK_RAAMISTIK_digivoti.md`, „Küsimused Ehitusinsenerile“ 1–4; tehniline pool)

**1. Lukutüüp ja standard evakuatsiooniuksele; magnetlukk ilma EN 13637 süsteemita?**
- Tehniliselt kindlaim: **mehaaniline väljapääs seest** — EN 179 käepide (töötajad) või EN 1125 põikpuu (võõrad, rahvahulk) + väljast elektriline vastuplaat **fail-secure** või mootorlukk. Väljapääs ei sõltu elektrist, võrgust ega serverist; elektroonika juhib ainult sissepääsu (EVS-EN 179:2008, EVS-EN 1125:2008, EVS-EN 14846:2008, kõik kehtivad [evs 01.11.2026]; sisu KONTROLLIMATA).
- **Magnetlukk** (ja fail-safe vastuplaat ilma mehaanilise avamiseta) evakuatsiooniteel nõuab **elektrilist vabastust**, mis on igas rikkes „vaba“: TSS-vabastus NC-ahelas, 2-pooluseline avariinupp otse luku toites, toite kadu = lahti, juhtseadme rike = lahti. Täpselt seda süsteemi kirjeldab EVS-EN 13637:2015 (kehtiv; sisu KONTROLLIMATA). Ilma standardita **tehniliselt** võimalik, aga siis tuleb samad omadused tõendada analüütiliselt (Nõuniku järeldus SiM m 17 § 3 lg 4 p 4), sh rikete analüüs (relee kontakti kokkukeevitus, lühistatud kaabel, tarkvara hangumine). Minu soovitus: magnetlukk ainult siis, kui mehaaniline lahendus ei sobi (klaasuks), ja siis EN 13637 süsteemina [HINNANG]. Shelly 1 + magnetlukk ilma vahereleeta ja ilma riistvaralise vabastuseta **ei sobi** evakuatsiooniteele (leid #12).

**2. Väljapääs toite-, võrgu- ja serveririkke korral**
| Rike | Mehaaniline väljapääs (EN 179/1125 + fail-secure väljast) | Elektriline vabastus (magnetlukk / fail-safe, EN 13637 tüüpi) |
|---|---|---|
| 230 V kadu | väljapääs alati (mehaaniline); sisse aku/varuvõtmega | aku hoiab lukus; **aku tühjenedes vaba**; TSS ja avariinupp töötavad aku ajal |
| Toiteploki/aku rike | sama | lukk vaba (pingevaba) |
| Võrgu või serveri rike | väljapääs alati | väljapääs alati: vabastus ei sõltu võrgust (väljumisnupp otse luku ahelas, avariinupp, TSS) |
| Kontrolleri/relee hangumine | väljapääs alati | avariinupp ja TSS katkestavad toite **relee ees/järel jadamisi**, sõltumata releest |
| Relee kontakt kokku keevitunud | väljapääs alati | avariinupp ja TSS jadamisi → vaba; väljumisnupp tarkvaras ei aita → seepärast avariinupp kohustuslik |
Põhimõte: **väljapääsuahelas ei ole ühtegi tarkvara, raadiot ega võrku** (Ehitusinsener p 1.1, ÕIGE; minu p 2.9).

**3. Kas Shelly relee peab olema ATS-ist eraldatud vahereleega / galvaaniliselt?**
- **Jah, vaherelee on vajalik** [HINNANG, tehniline põhjendus]: (1) ATS-i juhtimisväljund on järelevalvega (EOL-takisti) ja ette nähtud kindlale koormusele — Shelly sisend või toiteahel ei ole selle koormus ega tohi keskseadme ahelat mõjutada (Nõunik: SiM m 1 § 20 lg 5 „sõltumatu kontakt, ei tohi häirida teisi seadmeid“); (2) galvaaniline eraldus: lukutoite 12/24 V ja Shelly 230 V/12 V toite rikked ega liigpinged ei jõua ATS-i ahelasse; (3) vabastus peab toimima ka siis, kui Shelly on toiteta või hangunud — seepärast ei juhi ATS Shellyt, vaid **katkestab luku toite vaherelee kontaktiga jadamisi Shelly kontaktiga** (p 2.3 parandusega, leid #7).
- Vaherelee: mähis ATS-i väljundil (ATS-ettevõtja valib), kontakt luku toiteahelas, relee ukse juures; Shelly loeb vaherelee teist kontakti ainult **olekusisendina** logiks. Shelly ei ole ATS-i juhitav seade.

**4. Kas digivõtme relee tohib juhtida tuletõkkeukse lahtihoidmismagnetit?**
- **Ei, mitte ainsana** [HINNANG]. Lahtihoidmismagnet (elektriline kinnihoidja, EVS-EN 1155:1999, kehtiv) peab vabastama ukse sulgumiseks TSS/suitsuanduri signaali, toite kadumise ja käsivabastuse korral (fail-safe: pingevaba = uks sulgub) [sisu KONTROLLIMATA]. Ahel on sama loogikaga kui p 2.9: **TSS vaherelee + käsinupp jadamisi magneti toites**, digivõtme relee võib olla **lisaks jadamisi** (nt „öösel sulge kõik tuletõkkeuksed“), sest tema avanemine saab ust ainult **sulgeda** (ohutu suund), mitte lahti hoida TSS-i vastu.
- Digivõtme relee **ei tohi** olla ainus, mis magneti toidet hoiab või katkestab, ega olla paralleelselt TSS kontaktiga (siis hoiaks Shelly ust lahti ka tulekahju ajal). Magneti toide eraldi kaitsmega akutoiteplokist; kinnihoidja ja sulguri komplekt ukse tootja lubatud (Ehitusinsener p 2.2). Õiguslik kohustus (§ 14 lg 7¹) → Nõunik.

---

## 8. Kontrollimata ja küsimused

**Kontrollimata:** standardite tekst (kõik ülal, sh EN 13637 nõuded, EN 50131-6 toiteallika tüübid, HD 60364-5-52 lisa G, 60364-4-43, 60364-6 mõõtepiirid); EVS-HD 60364-5-534 asendaja ja EN 62262, EN 61643-21, EN 50174-2 olek; Shelly 1 Gen4 / Plus Uni / Pro 1 toitevahemik, kontaktide tüüp ja eluiga (tootja kasutusjuhend); effeff 118S pingevahemik; lukkude, lugejate ja kontrollerite voolud; AGM külmumis- ja kompensatsiooniandmed; LiFePO4 laadimise temperatuur; UPS-i varuaeg; kõik hinnad. **Sõltumatu kontroll tegemata:** alamagendi (Agent) tööriista selles keskkonnas ei olnud; leiud vajavad teise inseneri/`elektri-kontrollija` ülevaatust enne kasutamist.

**Küsimused Nõunikule:**
1. Kas SELV 12/24 V lukutoite ja juhtahelate paigaldus on elektritöö, mis vajab elektritöö ettevõtja teatist ja pädevat isikut, või ainult 230 V toitegrupp?
2. Kas läbipääsusüsteemi toiteplokk (aku, laadija) ja lahtihoidmismagnet on tuleohutuspaigaldis TuOS mõttes, kui need on ühendatud ATS-iga (hoolduskohustus, sagedus)?
3. Milline on 230 V toitegrupi perioodilise kontrolli sagedus (EVS-HD 60364-6 / õigusakt) ehitusplatsi konteineris?
