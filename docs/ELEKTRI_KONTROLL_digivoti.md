# QR-digivõti: elektri sõltumatu kontroll

**Kontrollitud:** `docs/ELEKTRI_ULEVAATUS_digivoti.md` v0.1 (Elektriinsener) ja selle leiud faili `docs/TEHNILINE_LAHENDUS_digivoti.md` v0.1 kohta. Lisaks vaadati `digivoti/riistvara/shelly_skript.js` (rida 42–48: `Switch.Set on:true, toggle_after`, `Timer.set` pollib). **Kontrollija:** elektri-kontrollija (sõltumatu, faile ei kirjutanud), 01.11.2026. Teisi faile ei muudetud.
**Piirangud:** standardite tekste ega tootjate andmelehti ei loetud. Arvutused tehti käsitsi samade valemitega (`pingelang.py` käivitamiseks polnud selles keskkonnas käsurida). Kus väide põhineb ainult minu hinnangul, on märge [HINNANG], ja kus allikat ei saanud kontrollida, on märge [KONTROLLIMATA].

## Üldhinnang

Ülevaatus on hoolikas. Kõik arvutused, mida kordasin (pingelangu tabeli 8 rida, E1–E5, varuaeg a–d, vajalik mahtuvus), on aritmeetiliselt õiged. Peamised vead Ehitusinseneri failis on leitud õigesti: Shelly NO-kontakt ja magnetluku loogika (#12), 13,8 V ja luku 13 V ülapiiri vastuolu (#2), 17 Ah ei anna 24 h (#6) ning demolaua 3 A toiteplokk (#15). Probleem on aga ülevaatuse enda parandusettepanekutes. TSS vaherelee parandus (#7) ja soovitus panna mähis keskseadme järelevalvega väljundile (p 2.9, vastus 3) on omavahel vastuolus: kui mõlemat järgida sõna-sõnalt, on lukk tavaolekus pingevaba. Teiseks tõstab soovitatud temperatuurikompensatsioon (BOM #10) külmas siini pinge ~14,5 V-ni. See on üle luku ülapiiri, mille ülevaatus ise seab punktis #2. Kindlusaste on üldiselt õige (märgendid [KONTROLLIMATA] ja [HINNANG] on järjekindlad).

**Hinne: 7/10**

## Leiud

| Nr | Hinnang | Koht | Leid | Põhjendus | Parandusettepanek |
|---|---|---|---|---|---|
| 1 | **ERROR** | Ülevaatus #7, p 2.9, p 7 vastus 3, BOM #13 | Kontakti tüübi (NO/NC) parandus sõltub TSS väljundi tüübist, kuid ülevaatus annab ühe lahenduse. Selle kõrval soovitab ta mähise panna järelevalvega väljundile, mis tavaolekus on pingevaba. | #7 kehtib ainult siis, kui K1 on tavaolekus pinge all (TSS potentsiaalivaba NC kontakt või „fail-safe“ programmeeritud väljund toidab mähist). Siis peab luku ahelas olema K1 NO kontakt. EN 54-2 keskseadme järelevalvega juhtväljund on tavaolekus tavaliselt passiivne: seiret tehakse vastupolaarsuse ja EOL-takistiga ning väljund pingestub häire korral [HINNANG; keskseadme tootja KONTROLLIMATA]. Sellisel väljundil on õige K1 **NC** kontakt (Ehitusinseneri skeem). Kaabli katkemine ei vabasta siis lukku, aga keskseade näitab riket. Kui järgida korraga #7 (NO) ja p 2.9 (järelevalvega väljund), on K1 tavaolekus pingevaba, NO kontakt on lahti ja lukk on pidevalt vaba, ehk süsteem ei tööta. | Kirjuta #7 ja p 2.9 tingimuslikuks, kahe variandiga: **(a)** mähis on tavaolekus pinge all (potentsiaalivaba NC või fail-safe väljund). Siis luku ahelas K1 NO. Katkemine vabastab lukku, aga lühist see ei avasta. **(b)** järelevalvega väljund, mis pingestub häire korral. Siis luku ahelas K1 NC. Keskseade avastab lõhe ja lühise, ning EOL-takisti ja diood paigaldatakse relee juurde keskseadme juhendi järgi. Variandi valib ATS-ettevõtja (#17). Variant tuleb skeemile märkida ja kasutuselevõtul katsetada (p 4.2: lõhe, lühis, häire). |
| 2 | **ERROR** | Ülevaatus BOM #10, #14, #2, #11 | Soovitatud temperatuurikompensatsioon tõstab külmas siini pinge ~14,5 V-ni, kuid luku ja elektroonika pingevahemikku selle jaoks ei kontrollita. | Kontrollarvutus: 6 elementi × 3 mV/°C × (20 − (−20)) °C = 0,72 V, seega 13,8 + 0,72 ≈ **14,5 V**. Punktis #14 on toodud ~14,6 V. Tavalises akutoiteplokis on koormus ja aku samal siinil [HINNANG]. Siis on lukul ~14,5 V. See ületab #2 enda nõuet (vahemik 10,5…13,8 V) ja effeff 118S 13 V piiri. Shelly toite mõju on #11-s DC/DC-ga kaetud, aga luku oma mitte. | 6.c jaoks nõua lukku, mille vahemik on **10,5…14,6 V**. Teine võimalus on 24 V lukk laia vahemikuga või toiteplokk, mille kompensatsioon toimib ainult akuharus (eraldi laadimisväljund). Kolmas võimalus on luku toide DC/DC kaudu. Lisa p 4.2 mõõtmisse rida „pinge lukul külmas (kompensatsiooniga)“. |
| 3 | MINOR | Ülevaatus #6 ja BOM #5 | Variant „1 × 26–33 Ah“ ei täida arvutatud vajadust ja suurem aku ületab toiteploki laadimisvoolu. | Ülevaatuse järgi on vaja 28,5 Ah, seega **26 Ah < 28,5 Ah**. 33 Ah aku korral, kui laadimiskriteerium (80 % 24 h jooksul, kasutegur 1,2) jääb samaks: 0,8 · 33 / 24 · 1,2 = 1,32 A. Siis I = 0,95 + 1,78 + 1,32 = 4,05 A ja 25 % varuga **5,06 A > 5 A**. Punkt #6 ütleb küll „laadimisvõime kontrolli“, kuid BOM #5 jätab 5 A toiteploki alles. Pliiakude rööbitine ühendamine nõuab sama tüüpi ja vanusega akusid ning kummalegi oma kaitset [HINNANG]. | Kirjuta „1 × 33 Ah (≥ 28,5 Ah)“. BOM #5 juurde lisa kas toiteplokk ≥ 6 A või laadimisaeg, mille plokk tegelikult võimaldab (laadimisvool on tootja seadistus, [KONTROLLIMATA]). Rööbitiühenduse tingimused kirjuta lahti. |
| 4 | MINOR | Ülevaatus #8 vs p 2.9 | Avariinupu teise pooluse kasutus on kahes kohas erinev. | #8 soovitab 2. poolusega katkestada ka teise toitejuhtme. p 2.9 kinnitab, et 2. poolus annab kontrollerile häiresisendi. Kaks poolust ei saa teha mõlemat. | Ühtlusta. Kui on vaja katkestada mõlemad toitejuhtmed ja anda ka häire, on vaja 3 kontakti (2 katkestavad toidet, 1 abikontakt häireks) või häiresignaal võtta vaherelee olekust. EN 13637 nõue jääb [KONTROLLIMATA]. |
| 5 | MINOR | Ülevaatus #1 | Väide „ρ = 0,0225 on 1,25 × ρ₂₀“ ei klapi samas lauses toodud väärtusega ρ₂₀ = 0,0175. | 1,25 × 0,0175 = 0,0219. Väärtus 0,0225 tuleb valemist 1,25 × 0,018 (HD 60364-5-52 lisa G, sisu [KONTROLLIMATA]). Tulemust see ei muuda, sest 0,0225 on konservatiivne. | Kirjuta „ρ₁ = 1,25 · ρ₀, ρ₀ = 0,018 (lisa G)“. |
| 6 | MINOR | Ülevaatus #14 | Kompensatsiooni suurusjärk on veidi ülehinnatud. | Arvutus on leius 2: 0,72 V (14,5 V), mitte ~0,8 V (14,6 V). 0,8 V saadakse alles −3,3 mV/°C/element korral. Erinevus on väike. | Kirjuta „≈ +0,7…0,8 V (tootja tegur)“. |
| 7 | MINOR | Tehniline p 1.4 arvutus 1 (ülevaatus #5 ei märganud) | Arvutuses on aku 7,2 Ah, kuid BOM 6.a #8 nimetab Yuasa NP7-12, mis on 7 Ah. | Tulemus muutub vähe: 7 · 0,8 / 0,85 = 6,6 h, mitte 6,8 h. Peukerti märkus #5-s (C/8,5 juures ~10 % vähem) on suurusjärgult õige. | Ühtlusta aku mahtuvus BOM-iga või märgi, et arvutus on tehtud CSB GP1272 järgi. |
| 8 | MINOR | Ülevaatus #19, BOM #8 | Haru kaitse nõue on õige, kuid pika peenikese haru lühise korral ei pruugi kaitse rakenduda. | 50 m 0,22 mm² silmuse takistus on 2 · 50 · 0,0225 / 0,22 ≈ 10 Ω. Lühisvool 13,8 V juures on siis ≈ 1,4 A ja T1A kaitse rakendub aeglaselt või ei rakendu üldse. Juhet see vool siiski ei ohusta, kui Iz ≥ ~1,4 A [KONTROLLIMATA, kaabli tootja]. | Lisa lause: kaitse valitakse nii, et see rakendub haru kaugema otsa lühisvoolu juures, või tõenda, et juht talub piiratud lühisvoolu pidevalt. Toiteploki elektrooniline voolupiir on lisakaitse. |
| 9 | MINOR | Ülevaatus p 1 tabel (SPD), p 2.3 | SPD paigaldusstandardi asendaja on jäetud otsimata ja SELV-liini SPD seos maandamise keeluga on käsitlemata. | IEC 60364-5-53:2019 hõlmab varasemat 534 jaotist. Tõenäoline asendaja on EVS-HD 60364-5-53 uus väljaanne [KONTROLLIMATA]. p 2.3 nõuab SELV-i mitte maandada (HD 60364-4-41 p 414.4, [KONTROLLIMATA]) ja samal ajal ühendada andmeliini SPD-d korpusega. SPD ei ole tavaolekus juhtiv ühendus maaga, aga see tuleks lahti kirjutada. | Kontrolli evs.ee-st EVS-HD 60364-5-53 olek ja kas see asendab 5-534. p 2.3 juurde lisa lause: SPD ei ole SELV-i maandus, eelistada SPD-d, mille liinipool on maast isoleeritud (GDT) [HINNANG]. |
| 10 | MINOR | Ülevaatus p 2.2, E4 | Sõnastus „kuldkontaktid ei sobi > 0,1 A“ on eksitav. | Kullakiht põleb suurema voolu juures ära ja edasi töötab kontakt nagu tavaline AgNi kontakt. Probleemi see ei tekita, kullakihist lihtsalt pole kasu [HINNANG]. | Kirjuta „kuldkattega kontakti pole vaja (kullakiht kulub üle ~0,1 A)“. |
| 11 | OK | Tehniline p 2.5 tabel (8 rida), ülevaatus #1 | Pingelang ΔU = 2·L·I·ρ/A | Kordasin kõik read: 1,15 / 0,34 / 2,05 / 0,60 / 0,30 / 1,56 / 0,78 / 0,47 V. Protsendid ning veergude 12,0 V ja 13,8 V väärtused klapivad. | — |
| 12 | OK | Ülevaatus #2, #3, #4, E1 | Luku ülapiir 13,8 V juures; halvim juhtum 10,5 V; 24 V mõju | 13,8 − 0,34 = 13,46 V > 13 V. 1,3 A, 1,5 mm², 20 m juures ΔU = 0,78 V ehk 7,43 % ja lukule jääb 9,72 V. 24 V juures 0,39 V ehk 1,62 %. 30 m juures 0,90 V ja lukule jääb 9,60 V. Absoluutne pingelang väheneb poole võrra, suhteline neljandikuni, nagu ülevaatus parandab. | — |
| 13 | OK | Tehniline arvutus 1, ülevaatus #5, #6, E3 | Aku varuaeg ja mahtuvus | 6,8 / 16,5 / 16,0 / 19,2 h; 25,5 Ah; 97,5 Ah; 14,3 h; 28,5 Ah. Kõik on õiged. | — |
| 14 | OK | Ülevaatus #15, #16, E2, E3 | Toiteploki võimsus | E2: 3,18 A ja varuga 3,98 A, seega 3 A toiteplokk ei piisa. E3: 3,41 A ja varuga 4,26 A; ruuteriga 4,70 A. Kõik on õiged. | — |
| 15 | OK | Ülevaatus E4 | Relee tsüklid | 200 × 365 = 73 000 tsüklit aastas; 100 000 / 73 000 ≈ 1,4 a. Eeldus (100 000 tsüklit) on märgitud [KONTROLLIMATA]. | — |
| 16 | OK | Ülevaatus #12, p 2.5, `shelly_skript.js` r 43 | Shelly NO kontakt, fail-secure ja magnetlukk | Skript tõesti sulgeb kontakti s sekundiks (`on:true, toggle_after`). Magnetlukul tähendab see lukustamist. Vaherelee NC kontaktiga lahendus on õige ja algolek „Off“ annab luku. Ümberpööratud loogika ohu hinnang on õige. | — |
| 17 | OK | Ülevaatus #9, p 2.2 | Vabajooksudiood | Diood käib mähise klemmidele, katood plussi poole. Diood pikendab magnetluku vabanemisaega, seega diood + Zener või TVS. Füüsikaliselt õige. | — |
| 18 | OK | Ülevaatus E5, p 4.2 | Zs ja mõõtmised | 0,35 + 2 · 0,0225 · 25 / 1,5 = 1,10 Ω ≤ 4,60 Ω (B10, 5·In). Isolatsioonitakistus: 500 V juures ≥ 1 MΩ, SELV 250 V juures ≥ 0,5 MΩ. RCD rakendumisaeg ≤ 300 ms. Väärtused vastavad HD 60364-6 tavapärastele piiridele [tekst KONTROLLIMATA]. | — |
| 19 | OK | Ülevaatus #14, p 2.8 | Akukeemia külmas | LiFePO4 laadimine alla 0 °C on keelatud ja tühjenenud pliiaku külmub umbes −5…−10 °C juures. Mõlemad on suurusjärgult õiged ja märgitud [KONTROLLIMATA, tootja]. | — |
| 20 | OK | Ülevaatus #10 | Lugeja toite pingelang | 2 · 50 · 0,25 · 0,0225 / 0,22 = 2,56 V, õige. | — |

## Mis on hästi (järgmises versioonis mitte lõhkuda)
- Leiud on esitatud tabelina ja iga väite juures on kindlusmärge ([evs], [KONTROLLIMATA], [HINNANG]).
- Arvutused on näidatud valemiga ja korratavad (E1–E5).
- Ohutusfunktsioon on riistvaras ja „väljapääsuahelas ei ole tarkvara“. Rikete tabel (p 7 vastus 2) on hea ja seda tuleb hoida.
- Shelly loogika viga (#12) on tuvastatud koodi realt, mitte oletuse järgi.
- Õiguslikud küsimused on suunatud Nõunikule ja ülevaatus ei tõlgenda õigust ise.

## Kokkuvõte

- **ERROR: 2.** (1) TSS vaherelee NO/NC parandus on vastuolus soovitusega kasutada järelevalvega väljundit. Lahendus: kaks varianti ja kumbki tingimuslikult. (2) Temperatuurikompensatsioon tõstab külmas siini pinge ~14,5 V-ni ja see ületab luku pingevahemikku.
- **MINOR: 8** (nr 3–10).
- **OK: 10** (nr 11–20). Kõik ülevaatuse arvutused pidasid kontrollarvutusel vastu.
- **Otsus: VAJAB VERSIOONI.** Enne paigaldusjuhendit tuleb parandada leiud 1 ja 2. Leiud 3 ja 4 tuleb parandada samas versioonis.

---

## v2 kontroll (01.11.2026)

Kontrollitud: `docs/ELEKTRI_ULEVAATUS_digivoti.md` v2 (kogu fail ja muudatuste logi). Vaatasin ainult seda, kas v0.1 kontrolli leiud on lahendatud ja kas parandused tõid uusi vigu.

| Leid | Lahendatud? | Märkus |
|---|---|---|
| 1 ERROR, TSS vaherelee NO/NC | **jah** | #7, p 2.9, p 7 vastus 3 ja BOM #13 kirjeldavad nüüd variante (a) ja (b). Variant (a): mähis on tavaolekus pinge all ja luku ahelas on K1 NO. Variant (b): järelevalvega väljund pingestub häirel ja luku ahelas on K1 NC. Mõlema juures on õigesti kirjas, mida katkemine ja lühis põhjustavad. Hoiatus, et (b) väljundit ei tohi kombineerida NO kontaktiga, on lisatud. p 4.2 sai juurde rea „TSS variant“. Loogika on õige. |
| 2 ERROR, temperatuurikompensatsioon | **jah** | 0,72 V → ~14,5 V. #2 vahemik on nüüd 10,5…14,6 V. p 2.1 annab neli lahendust ja BOM #10 ning p 4.2 rida on uuendatud. Lahenduse (4) „ülapiir nt 14,1 V“ korral tuleb samuti kontrollida, kas lukk talub 14,1 V, sest see on üle 13,8 V. Väike asi, eraldi leiuks ei loe. |
| 3 MINOR, 26/33 Ah ja 5 A plokk | jah | Paranduse arvud (33 Ah, 1,32 A, 4,05 A, 5,06 A, ≥ 6 A) on õiged. Rööbitiühenduse tingimused on lisatud ja BOM #5 hinnamõju on uuendatud. |
| 4 MINOR, avariinupu poolused | jah | #8 on ühtlustatud p 2.9-ga: kui on vaja nii toitejuhtmete katkestust kui ka häiret, on vaja 3 kontakti. |
| 5 MINOR, ρ₁ = 1,25 · ρ₀ | jah | — |
| 6 MINOR, kompensatsiooni tegur | jah | +0,7…0,8 V. |
| 7 MINOR, aku 7 / 7,2 Ah | jah | 7 · 0,8 / 0,85 = 6,6 h, õige. Viide on parandatud (#14). |
| 8 MINOR, haru lühisekaitse | jah | Arvutus 10 Ω / 1,4 A on õige. Väike märkus: „T500 mA, kui koormus lubab“ ei sobi 0,5 A magnetlukule, sest kaitsme nimivool ei tohi olla võrdne püsikoormusega [HINNANG]. Eraldi leiuks ei loe. |
| 9 MINOR, SPD standard ja SELV | jah | EVS-HD 60364-5-53:2022 on lisatud, olek on märgitud [evs 01.11.2026] ja asendussuhe [KONTROLLIMATA]. Mina olekut üle ei kontrollinud. GDT lause on lisatud. |
| 10 MINOR, kuldkontaktid | jah | — |
| **Uus 11** | MINOR | **p 4.2 rida „Lõhe ja lühis TSS-liinil“** ootab tulemust „lukk vaba lõhel“. Variandis (b) lõhe lukku ei vabasta (seda ütlevad #7 ja p 2.9 ise). Seega annaks õigesti paigaldatud variant (b) kasutuselevõtu katsel ekslikult „mittevastav“. Parandus: „keskseade näitab riket; lõhel lukk vaba ainult variandis (a)“. |

Uusi ERROR-eid parandused ei toonud. Leitud on 1 uus MINOR (nr 11).

**Uus hinne: 9/10.** **Otsus: RAHUL.** Kriitilisi ja olulisi leide ei ole. Leid 11 on soovitatav parandada järgmisel muutmisel, enne kui p 4.2 kasutatakse kasutuselevõtu protokollina.
