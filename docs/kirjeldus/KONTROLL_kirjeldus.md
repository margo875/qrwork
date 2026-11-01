# Kirjeldusdokumendi sõltumatu kontroll (kriitik, 01.11.2026)
Dokument: QR-digivoti_susteemi_kirjeldus.pdf v1.0 mustand (39 lk). Võrreldud: TEHNILINE_LAHENDUS, ELEKTRI_ULEVAATUS v2, ELEKTRI_KONTROLL, OIGUSLIK_RAAMISTIK, MUUGIPAKETT, KONTSEPTSIOON, digivoti/README.md.
Tulemus: 12 ERROR, 14 MINOR. Arvud (BOM summad, aku, pingelang, õigusviited TLS § 78, TMS § 132, TuMS § 48, TurvaTS § 7/11) vastavad allikatele.

## ERROR
| # | Lk / ptk | Leid | Parandus |
|---|---|---|---|
| E1 | 8.1 tabel | Veerg „Mida toode teeb“ – allikas „peab tegema“; näidis ei tee kuu lõpu nõusolekut, limiiti, arestimisvaba osa, kohest makset, „Minu andmed“, automaatset kustutamist, erisoodustuse veergu. | Veerg „Mida toode peab tegema“ + veerg „Näidises“ (tehtud/puudub). |
| E2 | 8.2 „Säilitustähtajad (vaikimisi seaded)“ | Automaatne kustutamine puudub (README). | „Sihtseaded; näidises automaatset kustutamist veel pole“. |
| E3 | 11.1; eelis 5 | „Õiguslik pakett: nõusoleku vorm, DPIA põhi, teavitus…“ – osa puudub. | „Õigusanalüüs ja näidistekstid (nõusolek lisas B, säilitusajad); DPIA põhi, töötaja teavitus ja erisoodustuse veerg tootmisetapis.“ |
| E4 | joonis „5-min stsenaarium“ samm 6; 4.4 | Kuu lõpu kinnitus esitatud näidise osana; näidis peab kinni ilma nõusolekuta. | Joonis = „sihtteekond“; 5.1: nõusoleku küsimist veel pole, demoandmetega kinnipidamist päriselt ei tehta. |
| E5 | kaas, lk 4, 6.8, 11.1–11.2 | „Ehitusinsener/Elektriinsener/Nõunik“, „sõltumatu kontroll 9/10“ jätavad mulje pädevatest inimestest/kolmandast osapoolest. | Kaanele avaldus: analüüsid koostatud tehisintellekti abil Margo Pädami juhtimisel, pole allkirjastanud pädev elektriinsener ega advokaat; „sõltumatu kontroll“ = eraldi AI-ülevaatus. „Sisemine turvaülevaatus; kolmanda osapoole läbistustest tegemata“. |
| E6 | 4.3 vs 8.3 | Sõidupäevik kui „alus 100 % mahaarvamiseks“ – liiga kindel. | Alus on kasutus eranditult ettevõtluseks (KMS § 30 lg 4 p 5); päevik on üks tõend; MTA praktika [KONTROLLIMATA]; täielik ainult võtmekapiga. |
| E7 | 3.2, 6.6, 7.1 | Režiim B offline-kontroll tõendamata (tavakontroller ei kontrolli TOTP-d; Wiegand 26 ei mahuta). | „Kavandatud, teostatavus tõendamata [HINNANG]“; BOM-i arendusrida või varuvariant kaart/PIN. |
| E8 | 6.3 | DC-UPS koos ruuteri/kommutaatoriga; aku 28,5 Ah arvutatud ilma nendeta. | Eraldi DC-UPS või aku ≈ 54–69 Ah 24 h jaoks [HINNANG]. |
| E9 | lk 4 kasu | Siseuks 20–60 € (tegelikult ≈ 550–700 € koos lukk/toide/töö); „võtmeid ei pea tagasi nõudma“; „kaarte pole“ vs 9.1. | Täpsem sõnastus (vt raport). |
| E10 | lk 4, lk 29 | „Evakuatsiooniuks avaneb alati“ – absoluutne lubadus (VÕS § 1063/1067). | „Kavandatud nii, et väljapääs ei sõltu telefonist, tarkvarast ega võrgust; nõuetekohase paigalduse tagavad paigaldaja ja valdaja.“ |
| E11 | 12.2 | Piloodi kalender ja eeldused ei pea (30 päeva logi, deploy, nõusolek, evakuatsiooniuksed vajavad projekti). | Piloot nädalad 4–10, ainult siseuksed/tööriistad/automaat ilma kinnipidamiseta; eeltingimused; ressursirida; varuplaan. |
| E12 | lk 4, 7.2 | Tasuvusarvutus puudub; hinnatud sääst < halduskulu. | Ptk 7.3 „Tasuvus“ või aus lause: tasuvust pilootandmeteta ei väideta. |

## MINOR
M1 etapp 1 „elektri kontroll“ juba tehtud · M2 6.8 leid 11 on lisas C arvestatud · M3 allkirjastatud käsud/eraldi tokenid on tootmise eesmärk · M4 Shelly juhib vahereleed, otse ainult demolaual · M5 ptk 4 tabel: tulekahjusignaal ja lugeja tegemata · M6 TLS § 78 lg 2 limiidi kasutus snäkkidele on tõlgendus; sätte sõnastus „enne tasaarvestamise õiguse tekkimist“ · M7 alammäär „2026: 946 €“ · M8 7 170 € eeldused · M9 printeri litsents ja Workers tasuline plaan ülalpidamisse · M10 kaardisüsteemi hinnaväide ilma andmeteta · M11 uus uks vajab paigaldust ≈ 7 h · M12 20–49 töötajaga ettevõtete arv ja turu suurus · M13 skaleeruvus testimata · M14 backtick'id nähtavad; dokument segab auditooriume (ettepanek jagada: 2-lk kliendi kokkuvõte, investori memo, tehniline/õiguslik lisa); sisefailide viited lk 4.
