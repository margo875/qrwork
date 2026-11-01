# QR-digivõti: kontseptsioon (mustand 01.11.2026)

Hinnangud on suurusjärgud; hinnad on turu kuulutuste ja tavapraktika põhjal, mitte pakkumised. Õigusviited on märgitud **[KONTROLLIMATA]**, kuni Nõunik need Riigi Teatajast üle kontrollib.

## 1. Põhiidee
Üks kasutajate andmebaas ja üks rakendus (telefoni veebileht, paigaldust pole vaja). Iga „objekt“ (uks, arvuti, printer, kohviautomaat, snäkiautomaat, auto, tööriist) on kirje andmebaasis ja kannab QR-koodi. Kasutaja tuvastab end telefoniga, server otsustab õiguse, logib sündmuse ja vajadusel annab käsu seadmele.

**Kaks QR-suunda (valik objekti järgi):**

| Variant | Kuidas | Riistvara objekti juures | Sobib |
|---|---|---|---|
| **A. Telefon skannib objekti QR-i** | QR on objekti peal (kleebis või väike ekraan). Sisse logitud telefon saadab serverile päringu, server lülitab võrgureleed (lukk, automaat). | võrgurelee (Shelly/ESP32) 20–60 € | sisemised uksed, automaadid, autod, tööriistad, arvutid |
| **B. Objekt skannib telefoni QR-i** | Telefon näitab iga 30 s muutuvat QR-i (TOTP). Ukse juures on QR-lugeja + kontroller. | QR-lugeja 25–500 € + kontroller | välisuksed, kus telefonil ei pruugi olla internetti |

Variant A on odav ja kiire juurutada (kleebis + relee), variant B on turvalisem välisuksel. Mõlemad kasutavad sama andmebaasi.

**A-variandi põhirisk:** staatilisest kleebisest saab teha foto ja ust kaugelt avada. Leevendus (kombineeritav): 1) QR väikesel e-paber/LCD-ekraanil, mis vahetub iga 30 s (ESP32 + ekraan ~40 €); 2) kontoris Wi-Fi/IP kontroll; 3) Bluetoothi lähedusmärk; 4) ainult sisemistel ja madala riskiga ustel.

Olemasolevat ehitusplokki on: `qrwork` (kasutajad, QR-id, võtmine/tagastamine, logi, haldus, Cloudflare Worker + Durable Object). Digivõti on selle laiendus: objekti tüübid + releekäsk + ostud + kuuaruanne.

## 2. Moodulid

1. **Kasutajad ja rollid:** töötaja, haldur, külaline/alltöövõtja (ajaliselt piiratud link), raamatupidaja (ainult aruanded). Õigused rühmade kaupa (nt „Ladu“, „Kontor“, „Tõstukijuhid“).
2. **Uksed:** õigus + ajaaken (nt E–R 7–19). Logi: kes, mis uks, millal. Tuletõrjesignaal avab evakuatsiooniteed (vt p 6).
3. **Seadmed (arvuti, printer):** arvutile sisselogimine QR-iga (nagu WhatsApp Web: arvuti ekraanil QR, telefon kinnitab) või lihtsam: logitakse ainult kasutusaeg. Printeril prinditöö vabastamine QR-iga (turvaprintimine), loendus osakonna/projekti kaupa.
4. **Automaadid:** kasutaja skannib automaadi QR-i → telefonis tootevalik → kinnitus → automaat väljastab (snäkiautomaadis MDB-liidese kaudu, kohvimasinas relee või ainult logi „ausa kasutaja“ põhimõttel). Kuu lõpus summa töötaja kaupa.
5. **Tööautod:** auto/võtmekapi QR → broneering, võtmine, odomeetri näit ja foto → automaatne sõidupäevik. Võtmekapp elektrilukkudega või võtmekast objektil.
6. **Tööriistad ja inventar:** olemas (`qrwork`).
7. **Aruanded ja liidesed:** kuuaruanne CSV/XLSX raamatupidamisprogrammi (Merit, Directo, SmartAccounts formaadis), kinnipidamised töötaja kaupa, logid, kulud objekti/projekti kaupa.

## 3. Töötav näidis investoritele (MVP, 6–8 nädalat)

**Demo-komplekt (üks laud või ratastel raam):**
- 1 uks raamis elektrilise vastuplaadi või magnetlukuga + Shelly 1 relee (12 V toide) – 150–300 €;
- 1 „kohviautomaat“: tahvel või ESP32 + LED/relee, mis „väljastab“ – 50–150 €;
- 1 printer või arvuti demo (tarkvara, riistvara olemas);
- 1 tööriist kleebisega (`qrwork` juba töötab);
- 1 dünaamilise QR-iga ESP32 + ekraan (näitab, kuidas foto-rünnak on suletud) – 40–60 €;
- haldusvaade suurel ekraanil: logi reaalajas, kuuaruande eksport.

**Demo stsenaarium (5 min):** uus töötaja registreerub → haldur kinnitab → töötaja avab ukse → ostab kohvi ja snäki telefonis → võtab tööriista → haldur vajutab „Töösuhe lõppes“ → kõik õigused kaovad kohe, uks enam ei avane → kuuaruanne raamatupidamisse ühe klõpsuga.

**Kulu:** riistvara 400–800 €; tarkvara 4–8 nädalat (üks arendaja; AI-abiga Margo + Claude Code oluliselt odavam: põhiliselt Claude'i tellimus + Cloudflare'i tasuta/5 $ plaan). Pitch: 10 slaidi + 2 min video demost.

## 4. Riist- ja tarkvara

| Osa | Valik | Märkus |
|---|---|---|
| Server | Cloudflare Workers + D1/Durable Objects (nagu qrwork) või EL-i pilv | andmed EL-is (GDPR); 5–50 €/kuu |
| Kasutaja rakendus | veebirakendus (PWA) | paigaldust pole; töötaja oma telefon |
| Ukse relee | Shelly 1 Gen3/Gen4, Shelly Plus Uni, ESP32 | võrgus, server saadab käsu (MQTT/HTTPS) |
| Lukk | elektriline vastuplaat / magnetlukk / mootorlukk | evakuatsiooniteedel fail-safe |
| QR-lugeja (variant B) | Wiegand/RS485 QR-lugeja + kontroller | 25–500 €/tk |
| Snäkiautomaat | MDB cashless liides (nt MDB-HAT Raspberry Pi'le) | 150–300 €/automaat |
| Kohvimasin | relee kasutusloaks või ainult logi | sõltub masina mudelist |
| Arvuti | Windowsi credential provider või Entra ID paroolivaba sisselogimine | olemasolev M365 lahendus võib juba katta |
| Printer | printeri turvaprintimine või PaperCut-tüüpi tarkvara | QR-vabastus olemas mitmel tootjal |
| Võtmekapp | elektrilukkudega lahtrid (Shelly/ESP32) | 500–1500 € isetehtult; valmistoode kallim |

## 5. Hinnanguline kulu: näidisettevõte

Eestis on ligi 160 000 majandusüksust, enamik alla 10 töötaja; 50–249 töötajaga ettevõtteid on umbes 1150 (Statistikaamet, aasta kontrollida). Sihtrühm on **20–250 töötajat**. Näidis: **50 töötajat, 1 kontor + ladu, 4 ust, 1 kohvimasin, 1 snäkiautomaat, 25 arvutit, 3 printerit, 5 tööautot, 60 tööriista.**

**Ühekordne:**

| Rida | Hinnang |
|---|---|
| 4 ust (relee + lukk + paigaldus; 1 välisuks lugejaga) | 1 500–4 000 € |
| Snäkiautomaadi MDB-liides + kohvimasina relee | 250–500 € |
| Võtmekapp 5 autole | 600–1 500 € |
| Kleebised, ekraanid, plakatid | 100–300 € |
| Seadistus, andmete import, koolitus | 500–1 500 € |
| **Kokku** | **≈ 3 000–8 000 €** |

Võrdlus: kaardisüsteem 4 uksele (kontroller, lugejad, tarkvara, paigaldus) on tavaliselt samas või kõrgemas suurusjärgus ja katab ainult uksi.

**Aastane ülalpidamine:**

| Rida | Hinnang/a |
|---|---|
| Tarkvara litsents (SaaS, nt 3 €/kasutaja/kuu + 5 €/uks/kuu) | 1 800 + 240 ≈ 2 000 € |
| Pilv, side, SMS/teavitused | 0–300 € (sees litsentsis) |
| Riistvara hooldus ja asendus (~10 % riistvarast) | 300–700 € |
| Sisemine haldus (kontorijuht 1–2 h/näd, ~25 €/h) | 1 300–2 600 € |
| **Kokku** | **≈ 3 500–5 500 €/a (70–110 €/töötaja)** |

Säästupoolelt (sama ettevõte, hinnang): kaartide ostu ja kadumise kulu ära, kohvikassa ja käsitsi nimekirjad ära (raamatupidaja 2–4 h/kuu), sõidupäevik automaatne, kadunud tööriistad vähem (ka üks kadunud mõõteseade on 500–3000 €).

## 6. Õigus ja ohutus (kontrollida enne müüki)
- **Palgast kinnipidamine:** töötaja kirjalik nõusolek (lepingu lisa või avaldus); tasaarvestuse piirang töötasu arestitava osaga — Töölepingu seadus § 78 **[KONTROLLIMATA]**.
- **Erisoodustus:** tasuta või soodushinnaga kohv/snäkk ja tööauto isiklik kasutus — Tulumaksuseadus § 48 **[KONTROLLIMATA]**. Täishinnaga kinnipidamine ja sõidupäevik vähendavad riski.
- **Töötaja jälgimine ja GDPR:** logi eesmärk (turvalisus, arveldus), andmete minimeerimine, säilitusaeg (nt 12 kuud uksed, 7 a raamatupidamise alusdokumendid), töötajate teavitamine, õigustatud huvi analüüs. AKI juhend „Isikuandmete töötlemine töösuhtes“ **[KONTROLLIMATA]**.
- **Tuleohutus:** evakuatsioonitee uks peab avanema ilma võtme ja telefonita; elektrilukk lülitub tulekahjusignaaliga vabaks (fail-safe); EVS-EN 13637 (elektriliselt juhitavad väljapääsusüsteemid), EVS-EN 179/1125 **[KONTROLLIMATA]**.
- **Paigaldus:** läbipääsusüsteemi paigaldus võib vajada Turvategevuse seaduse järgset tegevusluba **[KONTROLLIMATA]** → koostöö litsentseeritud turvafirmaga.

## 7. Kes haldab
| Tase | Kes | Mida teeb |
|---|---|---|
| Platvorm | meie (tarnija) | server, uuendused, turvalisus, varukoopiad, tugi |
| Kliendi haldur | kontorijuht / personalijuht | kasutajad, rühmad, õigused, töösuhte lõpp |
| Raamatupidaja | kliendi raamatupidaja | kuuaruande kinnitamine ja import |
| Paigaldus ja riistvara | partner: turva- või elektrifirma | lukud, releed, tuleohutuse ühendus, hooldus |
| IT | kliendi IT-partner | arvutite ja printerite liides, Wi-Fi |

## 8. 10 põhjust, miks see tasub (võrreldes kaartide, võtmete, Exceli ja kohvikassaga)
1. **Üks klõps töösuhte lõpus:** kõik uksed, autod, automaadid ja seadmed suletakse korraga; kaarte ja võtmeid ei pea tagasi nõudma.
2. **Kaarte pole:** pole ostu, kadumist ega väljastamise aega; telefon on töötajal alati kaasas.
3. **Odavam riistvara:** sisemisel uksel relee 20–60 € ilma lugejata; kleebis tööriistal ~0,1 €.
4. **Üks süsteem viie asemel:** läbipääs, tööriistad, autod, automaadid ja printerid on ühes andmebaasis ja ühes logis.
5. **Automaatne kinnipidamine:** kohvikassa ja käsitsi nimekirjad kaovad; kuu lõpus läheb fail raamatupidamisse.
6. **Automaatne sõidupäevik:** tööauto kasutus on dokumenteeritud (maksurisk väiksem).
7. **Vastutus inventari eest:** näha on, kelle käes tööriist on; kaod ja otsimise aeg vähenevad.
8. **Ajutine ligipääs:** alltöövõtjale, külalisele või kullerile link, mis kehtib kokkulepitud aja; ehitusobjektil konteinerid ja laod.
9. **Kulud õigesse kohta:** printeri, auto ja seadmete kasutus objekti/projekti/osakonna kaupa.
10. **Kiire juurutus ja laiendus:** uus objekt = kleebis ja kirje (minutid), uus asukoht ilma serverita; sobib ka ajutistele objektidele.

**Ausalt nõrgad kohad:** vajab nutitelefoni ja (A-variandis) internetti; töötaja oma telefoni kasutamine vajab kokkulepet; kõrge turvatasemega uksel jääb kaart/biomeetria; QR-ligipääs ise pole uus (külaliste süsteemid, coworking'ud, mobiilivõtmed). **Uus on kombinatsioon:** VKE-le odav ühine platvorm uksest snäkini koos palgast kinnipidamisega.

## 9. 10 kandidaati järgmiseks 2 aastaks (segmendid)
| # | Kandidaat | Kus | Põhivajadus |
|---|---|---|---|
| 1 | Ehitusettevõte 50–200 töötajat, mitu objekti | Tallinn, Tartu, Pärnu | tööriistad, objekti konteinerid, alltöövõtjate ajutine ligipääs, tööautod |
| 2 | Tootmisettevõte (puit, metall, toit) vahetustega | Pärnumaa, Võrumaa, Viljandimaa, Ida-Virumaa | uksed, tööriistakapid, söökla/automaadid kinnipidamisega |
| 3 | Logistika- ja laokeskus | Rae vald (Jüri, Lehmja), Muuga | laoväravad, tõstukite kasutusõigus (ainult koolitatud juht), skännerid |
| 4 | Ülikooli või TA-asutuse labor | TalTech, Tartu Ülikool, EMÜ | seadmete broneering, kasutusaeg ja arveldus projekti kaupa |
| 5 | Kutsekool | Tallinn, Tartu, Rakvere, Kuressaare | töökodade ja masinate kasutusõigus koolituse järgi, inventar |
| 6 | Kinnisvarahaldur / korteriühistu | Tallinna ja Tartu uusarendused | trepikoda, panipaigad, pesuruum, saun, parkla, tasu kasutuse järgi |
| 7 | Coworking / büroohoone | Ülemiste City, Tartu kesklinn | külaliste QR, koosolekuruumid, printer ja kohv arvega |
| 8 | Hotell, hostel, spa | Pärnu, Kuressaare, Otepää | töötajate ligipääs, minibaar/automaadid, ruumide võti |
| 9 | Kohalik omavalitsus ja allasutused | väikevallad | külamajad, spordisaalid, kogukonnaköök: broneering + avamine ilma võtmeta |
| 10 | Autorendi- või ühiskasutusautode ettevõte, ettevõtte autopark | üle Eesti | võtmekapp, broneering, sõidupäevik, kahjufoto |

Esimene pilootklient, kus võit on kiireim: **#1 ehitusettevõte** (`qrwork` on juba olemas) või **#3 ladu**.

## 10. Järgmised sammud (soovitus)
1. Margo otsus: alustada `qrwork` laiendusest (uks + automaat + kuuaruanne) → näidis 6–8 nädalat.
2. Nõunik: punkt 6 õigusviited üle kontrollida (TLS § 78, TuMS § 48, isikuandmed töösuhtes, turvategevuse tegevusluba).
3. Ehitusinsener: evakuatsiooniuste nõuded ja lukutüübid.
4. 2–3 pilootkliendi vestlust enne investorit (tegelik valu ja hind).
