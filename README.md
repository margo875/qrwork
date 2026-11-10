# Krativara (repo qrwork; varem „Kratt“)

**Krativara** (nimi Margo otsusega 02.11.2026, varem „Kratt“; kratt – Eesti muistendi abiline, kes hoiab peremehe vara, toob ja viib). Tööriistade ja mõõteseadmete register töökohale: **leia mind**, **seadmete register** ja **võtmine/tagastamine** QR-koodiga.
Cloudflare Worker + üks Durable Object (SQLite), sõltuvusi pole. Lähtekoht on leiamind'i ülesehitus (QR-generaator, teavitused, turvapõhimõtted).

## Kuidas see töötab

| QR | Kus | Mida teeb |
|---|---|---|
| **Töökoha QR** `/K/<kood>` | laos / objektil (A4 plakat) | avab registri. Esimesel korral registreerub kasutaja (nimi, telefon, enda valitud parool), edaspidi on ta telefonis sisse logitud (küpsis 180 päeva). Nimi ja telefon on brauseris eeltäidetud. |
| **Seadme QR** `/S/<kood>` | seadmel (kleebis) | sisse logitud töötaja skännib seda rakenduse skänneriga (nupud **Võta seade** / **Tagasta seade**) või telefoni kaameraga (avab seadme kaardi). Võõras inimene näeb leidja lehte („leia mind“). |

- **Muu QR** rakenduse skanneris → „Tundmatu QR-kood. Pöördu administraatori poole.“ Sama teade tuleb, kui kood on õiges vormis, aga seadet registris pole.
- **Kasutaja ei muuda registriandmeid** (nimi, inventari- ja seerianumber, taatlus, olek). Ta saab lisada ainult **märkuse**: *Ei tööta*, *Vajab taatlemist/kalibreerimist*, *Kahjustatud*, *Tarvik puudu*, *Muu* (+ valikuline foto). Kõik märkused on halduse ülevaates; *Ei tööta*, *Vajab taatlemist* ja *Kahjustatud* saadetakse haldurile ka teavitusena (Telegram/ntfy). Teised kasutajad näevad lahendamata märkust (v.a *Muu*) hoiatusena enne võtmist.
- **Kuupäevad:** iga sündmus (võtmine, tagastus, ülevõtt, tagastus teise eest, märkus, kinnitus, vaidlus) salvestatakse kuupäeva ja kellaajaga ning töökohaga. Seadme kaardil on ajalugu (15 viimast), halduses kogu logi ja CSV.

## Võtmise ja tagastamise reeglid (lahendus)

1. **Võta seade:** seade seotakse võtjaga (nimi, telefon, aeg, töökoht). Tagastada saab ainult see sama isik.
2. **Mitu seadet korraga:** skanner jääb lahti, skänni järjest mitu seadet ja kinnita korraga („Võta (3)“). Igal seadmel on oma tulemus: ühe seadme keeld ei takista teisi.
3. **Juurde võtmine töö käigus:** kasutaja nimel võib korraga olla mitu seadet (vaikimisi kuni 20, seadetes muudetav). Uue võtmine ei mõjuta juba võetud seadmeid; eelmist ei pea enne tagastama.
4. **Unustatud tagastus (ülevõtt):** kui B skännib seadme, mis on veel A nimel, näeb B: „Seade on registreeritud: A (telefon) alates …“. B saab seadme võtta ainult linnukesega **„Võtan seadme üle“**. Siis:
   - A kasutus lõpeb (logis „võttis üle“), seade on B nimel;
   - A saab avalehel teate „<seade> oli sinu nimel … B võttis selle üle …“ ja **ei saa uusi seadmeid võtta**, kuni ta vastab;
   - A vastab **„Jah, tagastasin / andsin üle“** → keeld kaob, A „hilinenud tagastuste“ arv suureneb (näha halduses);
   - või **„Ei, vaidlustan“** + põhjendus → keeld kaob kohe (Margo otsus 01.11.2026, et töö ei seiskuks), vaidlus läheb haldurile (teavitus + ülevaade).
   - Keeld puudutab ainult **uute** seadmete võtmist: A saab oma teisi seadmeid tagastada ja märkusi lisada.
5. **Seadme otse üleandmine kolleegile** käib sama mehhanismiga (B võtab üle, A kinnitab „andsin üle“). Eraldi „anna üle“ nuppu pole vaja.
6. **Tagastus teise eest:** kui seade on laos tagasi, aga A unustas registreerida, saab teine kasutaja selle skännida tagastuses ja märkida **„tagastatuks A eest“**. A saab sama kinnitamise kohustuse kui ülevõtul. Haldur võib tagastuse registreerida ka ise (ilma keeluta).
7. **Võtta ei saa**, kui seade on *remondis* või *maha kantud*, kui taatlus/kalibreerimine on aegunud (seadetes välja lülitatav), kui kasutaja konto ootab kinnitust või on peatatud, või kui kasutaja limiit on täis. Põhjus on skanneris iga seadme juures näha.
8. **Samaaegsus:** kõik muudatused käivad läbi ühe Durable Objecti, seega kaks inimest ei saa sama seadet korraga „vabana“ võtta.
9. **Kus seade on? (sisemine leia mind):** otsing nime, tüübi või inventarinumbri järgi näitab, kelle käes seade on (nimi, telefon, alates) või millises laos see viimati tagastati.
10. **Leidja (väline leia mind):** sisse logimata inimene näeb seadme QR-ist firma nime ja seadme nime, saab saata sõnumi, kontakti ja (loaga) GPS-asukoha. Haldur saab teate koos selle inimesega, kelle nimel seade on.

## Leidja voog (0.4.0, üle võetud leiamind'ist 02.11.2026)
1. Sisse logimata inimene avab seadme QR-i `/S/<kood>`. Leht küsib `/api/avalik` ja saab **olekuta skännitokeni** (`kood.aegumine.HMAC-SHA256(TOKEN_SECRET)`, 1 h). Server saadab kohe teate **„🔔 Silti skänniti“**: aeg, IP järgi umbkaudne koht `request.cf`-ist (linn, regioon, riik, teenusepakkuja) ilma kaardilingita ja seade (`sec-ch-ua-platform` + UA). Botid (eelvaated, curl jms) teadet ei käivita. Piirid: 1/min IP + silt, 5/min IP, 3/min silt, 10/h silt. IP-d ei salvestata (ainult soolatud räsi DO mälus).
2. Leht käivitab kohe `watchPosition`'i (kuni 30 s, lõpp ≤ 20 m juures), jätab kõige täpsema lugemi ja saadab selle **automaatselt üks kord** (`/api/asukoht`, 1 tokeni kohta, DO-s märge `auto:<allkiri>`). Kui leidja lehe enne sulgeb, läheb lugem `sendBeacon`'iga. Teade „📍 ±N m“ + kaardilink + Telegrami `sendLocation`. Leidjale loendurit ega ootamist ei näidata.
3. Vorm: kirjeldus (≤ 400 märki) ja kontakt (≤ 100), kõva piir ja loendur kasti nurgas, pikem tekst lükatakse serveris tagasi. Valikuline foto vähendatakse brauseris (≤ 1600 px, EXIF kaob), foto GPS loetakse originaalist eraldi. Foto läheb **ainult Telegrami** (`sendPhoto`), serverisse (R2) seda ei salvestata. Nupp „Saada omanikule“ saadab kohe; „📞 Helista omanikule“ (number: Seaded → „Kontakttelefon leidjale“, selle puudumisel saladus `OMANIKU_TELEFON`) saadab ka teate.
4. Täpse asukoha puudumisel lisatakse teatesse IP-koht ilma kaardilingita. Leidja lehel on üks privaatsuslause; pärast saatmist „Saadetud. Aitäh!“ (või „Salvestatud. Aitäh!“, kui teate piir on täis ja kirje jäi ainult logisse).
5. Leidja päringute piirid: IP + silt 3/min ja IP 5/min (→ „oota minut“), logi 50 ööpäevas sildi kohta (→ „ei saa praegu vastu võtta“), teade silt 3/min ja 10/h. `/api/asukoht` ja `/api/helista` ei nõua päist `X-QW` (sendBeacon ei saa päist lisada); kaitse on token, küpsist need ei kasuta.
6. Haldus → Seaded → **🔔 Saada testteade**: näitab Telegrami/ntfy tulemust ja vea põhjust vihjega (nt „chat not found → ava bot ja vajuta Start“), tokenit ei näidata.
- Kõik piirid on DO-s (üks eksemplar, täpsed), Cloudflare'i Rate Limiting bindingut pole vaja. Mälus olevad loendurid nullitakse DO taaskäivitusel.

## Eeltrükitud koodid ja seadme kood (0.5.0, Margo 02.11.2026)
Haldur otsustab iga seadme puhul ise:
- **Uus kood ja oma silt:** Seadmed → „Lisa seade“, väli „Kood“ tühi → kood tekib, prindi 🖨 Sildid (32 × 44 mm, nimi + inventarinr).
- **Varem trükitud kleebis:** Seadmed → 📦 **Eeltrükitud koodid** → kogus 1–200 → Genereeri. Partii on üks kirje (`partii:<aeg>`), lisaks iga koodi kohta indeks `pkood:<kood>`. Printimine (ainult vabad koodid): Krativara sildid (nimi tühi, käsitsi kirjutamiseks) või leiamindi **kleebis 30 × 30 mm „TEATA LEIUST“, komplekt 1 + 3 + 2** (registrikleebis kirjutusjoonega + 3 raamtekstiga + 2 tekstita; QR 19,9 mm). Trükikojale **SVG** (vektor) või A4 „Salvesta PDF-ina“ 100 % mõõtkavaga; CSV ainult enda arvestuseks.
- **Sidumine:** seadme lisamisel vajuta välja „Kood“ kõrval **📷 Skänni** ja skänni eeltrükitud kleebis (sama QR-lugeja mis rakenduses; vastu võetakse ainult sama aadressi seadme QR `/S/` või sildilt loetav 12-märgine kood; vorm ütleb, kas kood on vaba, juba seadmel või partiiväline), või kirjuta/vali kood (loend pakub vabu), või partii loendis „Seo seadmega“. Sidumata koodi skännimisel näeb leidja „See kood ei ole veel kasutusel“ (teadet ei saadeta) ja lingi „Haldur: seo kood seadmega“ → `/admin#seo=<kood>` avab seadme lisamise vormi selle koodiga.
- Olemasoleva seadme koodi ei vahetata (ajalugu, laenud ja broneeringud on koodi küljes); kahjustunud sildi asemele prindi sama koodiga uus silt.
- Lõplikult kustutatud seadme partiikood muutub uuesti vabaks.
- QR: `HTTPS://QRP.KRATIVARA.EE/S/<12 märki>` = 39 märki, alfanumeeriline režiim, **versioon 3-Q (29 × 29)** (testis kontrollitud). Trükiproov enne partii tellimist.

## Inventarinumber, superkasutaja ja kataloog (Margo 01.11.2026)
- **Inventarinumber** tekib uuele seadmele automaatselt: `<lao lühend>-<AAKK><järjekorranumber>`, nt `L1-2611001` = ladu L1, 2026 november, 1. seade. Järjekord algab igas laos iga kuu alguses 001-st. Lao lühend (L1, L2…) antakse automaatselt, haldur võib selle muuta (1–6 tähte/numbrit, unikaalne). Olemasoleva numbriga seadmele võib numbri käsitsi sisestada. Uue seadme lisamisel on ladu kohustuslik.
- **Tavakasutaja** ei näe seadmete loendit: „Kus on seade?“ näitab tulemusi alles vähemalt 2 märgi järel või QR-koodi skännimisel.
- **Superkasutaja** (haldus → Kasutajad → linnuke „Superkasutaja“) näeb tühja otsinguga kõiki seadmeid ja vaadet **🏬 Laod ja seis**: igas laos vabad, väljas (kellel, alates) ja remondis olevad seadmed.
- **Kataloog** (haldus → Seadmed → 📖 Kataloog): A4 nimekiri, kus igal seadmel on **eraldi kataloogi QR** (`/I/<kood>`). See avab otsingus („Kus on seade?“ → 📷 QR) seadme kaardi ainult vaatamiseks. Võtmise/tagastamise skanner keeldub sellest („See on kataloogi QR-kood…“), et laos olevast kataloogist ei saaks seadet võtta ilma seadmeta.

## Broneerimine (Margo 01.11.2026)
- Seadme kaardil **📅 Broneeringud**: algus- ja lõppkuupäev (kaasa arvatud) ja valikuline märkus. Algus täna kuni 180 päeva ette, kestus kuni 60 päeva, kuni 20 kehtivat broneeringut kasutaja kohta, kattuvaid broneeringuid ei saa teha.
- **Teise inimese poolt täna broneeritud seadet võtta ei saa**: skanner näitab broneerija nime ja telefoni (helista, tema saab broneeringu tühistada). Broneerija ise saab võtta.
- Kui sinu käes oleva seadme on keegi teine järgmiseks 3 päevaks broneerinud, näed avalehel hoiatust „Tagasta õigeks ajaks“.
- Avalehel on **Minu broneeringud** (tühistamine). Tühistada saab oma broneeringu; superkasutaja ja haldur saavad tühistada iga broneeringu (halduses vahekaart **Broneeringud**).

## Taatlus / kalibreerimine (Margo 01.11.2026)
- Seadmel: **kehtib kuni**, **intervall (kuud)**, viimane tegija ja tunnistus. Uus olek **taatlusel/kalibreerimisel** (võtta ei saa); halduses nupp „Saada taatlusele“.
- Haldus → seade → **📏 Registreeri taatlus**: kuupäev, tunnistuse nr, tegija (labor), tulemus (sobib / ei sobi), järgmine tähtaeg (tühi = kuupäev + intervall). „Sobib“ uuendab tähtaja ja taastab oleku „kasutusel“; „ei sobi“ paneb seadme remonti. Kasutajate märkused „Vajab taatlemist“ märgitakse lahendatuks. Taatluste ajalugu on seadme juures.
- Seadme kaardil näevad kasutajad tähtaega, viimast taatlust, tegijat ja tunnistuse numbrit. Aegunud taatlusega seadet ei saa võtta (seadetes välja lülitatav).
- **Kalender (Outlook, Google, telefon):** Haldus → Seaded → **Loo kalendri link**. Outlookis: Kalender → Lisa kalender → Veebist → kleebi link. Kalendris on taatluse tähtajad (meeldetuletus „taatluse hoiatus“ päeva ette) ja broneeringud. Link on salajane (32 juhuslikku märki); uue lingi loomine tühistab vana. Microsoft 365 halduri õigusi ei vaja.

## Halduse märgid
Vahekaardil on punane number või täpp, kui seal on üle vaatamata infot: **Ülevaade** (lahendamata vaidlused ja märkused), **Kasutajad** (kinnitust ootavad), **Seadmed** (aegunud taatlusega), **Broneeringud** (uued pärast vahekaardi viimast avamist), **Logi** ● (uued sündmused pärast viimast avamist). „Viimane avamine“ jäetakse meelde selles brauseris.

## Kustutamine (Margo 01.11.2026)
- Haldus → Seadmed / Töökohad / Kasutajad → **🗑 Kustuta** (kinnitus jah/ei). Kirje kaob kohe kõigile peale halduri (ka superkasutajale): otsing, laod, skännimine („Tundmatu QR-kood“), sisselogimine.
- Halduses on kustutatud rida läbikriipsutatud ja nupp **↩ Taasta (N p)**. Pärast 30 päeva kustutatakse kirje lõplikult (Durable Objecti alarm ja halduse ülevaate avamine) ja nupp on „Taastamine aegunud“.
- Lõplikul kustutamisel kaob seadmel ka märkused ja ajalugu, kasutajal telefoni indeks (sama numbriga saab uuesti registreeruda) ja kinnitused. **Üldine sündmuste logi jääb alles** (tõend).
- Ei saa kustutada: seadet, mis on kellegi nimel; kasutajat, kelle nimel on seadmeid; ladu, mis on mõne seadme koduladu.

## Foto (valikuline)
Foto võtmisel, tagastamisel ja märkusega (nt kahjustuse tõendamiseks vaidluses). Vajab R2 sidet `FOTOD` (`wrangler.toml`, plokk on kommenteeritud). Seadetes: `ei` / `valikuline` / `kohustuslik`. Telefon vähendab foto (≤ 1600 px JPEG, EXIF ja GPS kaovad); server kontrollib tüüpi ja suurust (≤ 1,5 MB). Fotot näeb ainult haldur (logi ja märkused, „📷 foto“). Säilitusaeg: sea R2 bucket'ile elutsükli reegel (nt 365 päeva) Cloudflare'i juhtpaneelis.

## Kujundus (10.11.2026)
Sama mis **K | KODU** (margo875/qrkodu, kujundus B „Kodu arhiiv“, Margo 03.11.2026): paber #FAF9F6, tekst ja põhinupp #1C1C1A, aktsent #A33B20, raadius 8 px, pealkirjad Newsreader, tekst Instrument Sans (SIL OFL, litsentsid `fondid/`, failid `src/fondid.js`, Worker serveerib `/fondid/…`). Tume teema süsteemi järgi. Päis ja PWA nimi „K | Krativara“ (Margo 10.11.2026), paremal töökoht või firma. Sisselogitud kasutajal alumine menüü **Minu · Võta · Tagasta · Otsi**. Seadme kaardil olekuplokk (Vaba / Sinu nimel / Kasutuses / Ei saa võtta). Ikoonid joonikoonid (emotikonid ainult halduses). PWA ikoon K-märk + VARA, avakuval „K | VARA“ (`node tooriistad/ikoonid.cjs`). Prinditavad sildid ja plakat jäävad mustvalgeks Arialiks.

## Ostuandmed, dokumendid ja pildilt lugemine (0.7.0, Margo 10.11.2026)
- Seadmel lisaks: **tootja, mudel** (näevad kõik), **ostukuupäev, hind km-ta, müüja, garantii kuni** (näeb ainult haldur; CSV-s olemas).
- **Dokumendid:** haldus → seade → „📷 Pildista“ või „Vali fail“ (arve, tšekk, andmesilt, garantii, kasutusjuhend, muu). Originaal (foto või PDF ≤ 10 MB) salvestatakse R2-sse (`FOTOD`) muutmata kujul ja seotakse seadmega salvestamisel. Eemaldamine märgib dokumendi kustutatuks; fail kustub koos seadme lõpliku kustutamisega.
- **Pildilt lugemine** (Workers AI, `[ai]` plokk `wrangler.toml`-is, mudel Meta Llama 3.2 Vision, nagu K | KODU tšekilugemine): arvelt/tšekilt nimi, tootja, mudel, seerianr, hind, müüja, ostu- ja garantiikuupäev; andmesildilt tootja, mudel, seerianr, aasta. Tühjad väljad täidetakse, erinevad näidatakse „Kasuta“ nupuga. Päevas kuni 50 lugemist. Esimesel korral Haldus → Seaded → „Nõustun pildimudeli litsentsiga“. [KONTROLLIMATA päris Workers AI-s: pildi sisendi kuju]
- **Hooldus (korduv):** seadmel kuni 10 hooldusplaani (kordus 3/6/12/24/36 kuud, viimati, järgmine, meeldetuletus päeva enne). Kalendrilingis koos meeldetuletusega; seadme kaardil hoiatus „tulekul“ / „üle tähtaja“ (võtmist ei keela). „✓ Tehtud“ (kuupäev, kulu, tegija, märkus) arvutab järgmise tähtaja; ajalugu seadme juures.
- **Kleebised valikutega:** haldus → Seadmed (vali) → 🖨 Kleebised või Eeltrükitud koodid → „Kleebised valikutega“. Suurus 100/90/80/70/60 % (QR 19,5 → 11,7 mm), sama koodiga QR-e 0–6, leidja kleebis Kindaveli raamis: „TEATA LEIUST“ neljal küljel / oma tekst üleval ja all (kuni 20 märki, suurtähed) / ilma. Prindi või SVG trükikojale. Valik jääb brauserisse meelde.
- Varundus: ootel (Margo otsustab).

## Väline hooldus: töökäsk, link ja PIN (0.8.0, Margo 10.11.2026)
- **Hooldajad** (Haldus → Hooldus): ettevõte, registrikood, KMKR, aadress, kontaktisik, telefon, e-post, arve e-post, märkus. Seadmele saab valida vaikimisi hooldaja.
- **Saada hooldusesse** (seadme juures): hooldaja, tellimus/rikke kirjeldus, kehtivus (vaikimisi 30 päeva, kuni 180). Seade läheb olekusse „remondis“ (võtta ei saa). Kellegi nimel olevat seadet ei saa saata.
- **Töökäsk (A)**: prinditav A4-tellimus (tellija, seade, tootja/mudel/seerianr, hooldaja kontakt ja arve andmed, kirjeldus) koos hoolduse QR-iga `/H/<link>`. Hooldaja skännib QR-i ja jõuab seadme hoolduse vaatesse.
- **PIN (C)**: 8 numbrit, arvutatakse HMAC-iga (TOKEN_SECRET; töökäsu id, hooldusesse märkimise kuupäev, inventarinumber, hooldaja id, töökäsu sool), PIN-i ennast ei salvestata. Võõras skännib seadme kleebist → leidja leht + „Hooldaja? Sisesta PIN“. Piirid: 5 katset 15 min IP kohta; iga 10 vale PIN-i järel töökäsu PIN 1 tunniks lukus (haldurile teade). Katse loetakse enne kontrolli (paralleelpäringud ei pääse mööda). Link ja PIN näidatakse ainult loomisel; trükis on PIN **eraldi lehel** (töökäsk liigub koos seadmega, PIN antakse hooldajale eraldi).
- **Hooldaja vaade**: ainult seadme tehnilised andmed ja tellimus (mitte kasutajad, hinnad, ostuandmed, ajalugu). Sissekanded (vastuvõtt, tehtud töö, osad, akt, kooskõlastus, muu; summa km-ta) ja failid (foto, akt, arve, tunnistus; ≤ 10 MB, kuni 40) – lisab, muudab ja eemaldab kuni haldur töökäsu sulgeb; „Märgi tehtuks“ (valmis / ei ole parandatav / vajab kooskõlastust). Muudetud kande 5 viimast vana versiooni ja eemaldatud kanded/failid jäävad haldurile näha (tõend). Piirid: 60 kannet, 40 faili (koos eemaldatutega 80, kokku 300 MB). Seadme kustutamine tühistab töökäsu; lõplik kustutamine kustutab ka töökäsud ja nende failid. Sessioon (küpsis, 12 h) on seotud ühe töökäsuga.
- **Haldur**: töökäsu ülevaade, „Kinnita ja sulge“ (sissekanded ja summa hooldusajalukku, valitud hooldusplaan tehtuks, seadme olek), „Tühista“, „Uus PIN ja link“ (vanad lakkavad kohe, ka avatud sessioonid). Teavitused: esimene sissekanne, tehtud, PIN lukus.
- **Ava uuesti** (0.8.1, Margo 10.11.2026): suletud või tühistatud töökäsk kuni 14 päeva pärast sulgemist, põhjus kohustuslik. Sama töökäsk koos sissekannete ja failidega, uus link ja PIN (vanad ei kehti), uus kehtivus; sulgemise hooldusajaloo kanne märgitakse tühistatuks (jääb näha läbikriipsutatult), hooldusplaani kuupäevad taastatakse, seade läheb olekusse „remondis“. Ei saa, kui seade on kellegi nimel, kustutatud või sellel on teine avatud töökäsk. Logi + teavitus.

## Haldus `/admin` (ADMIN_TOKEN)
- **Ülevaade:** vaidlused, kinnitust ootavad kasutajad, kinnitamata ülevõtud (keelu eemaldamine), märkused (lahendamine), taatlus aegub/aegunud, kasutuses seadmed (päevade arv, üle `hoiata_paevi` punasena, „Tagasta (haldur)“).
- **Seadmed:** lisa/muuda (nimi, tüüp, inventari- ja seerianumber, taatlus kuni, olek, koduladu, lisainfo, valikuliselt olemasolev 12-märgine kood), ajalugu, **sildid printimiseks** (32 × 44 mm, QR 28 mm + nimi + inventarinr + kood), CSV.
- **Töökohad:** lisa/muuda, **A4 plakat** töökoha QR-iga ja juhisega; registreerimine *vaba* või *administraatori kinnitusega* (töökoha või üldise seade kaupa). **Vaikimisi administraatori kinnitusega** (Margo otsus 01.11.2026): uus kasutaja saab sisse logida, aga seadmeid võtta alles pärast kinnitamist (halduse ülevaade „Ootavad kinnitust“, teavitus Telegrami/ntfy-sse).
- **Kasutajad:** aktiveeri/peata, **taastuskood** parooli unustamisel (8 märki, 24 h; kasutaja sisestab selle „Unustasid parooli?“ all), keelu eemaldamine, hilinenud tagastuste arv.
- **Logi** (300 viimast, CSV kuni 5000) ja **Seaded** (firma nimi, leidja kontakttelefon, limiit, registreerimine, hoiatuste päevad, taatluse keeld, foto).

## Paigaldus
```
npx wrangler login
npx wrangler secret put ADMIN_TOKEN       # openssl rand -base64 32
npx wrangler secret put TOKEN_SECRET      # openssl rand -base64 32
npx wrangler secret put DEV_TOKEN         # vealogi /dev (valikuline)
# valikuline: TG_BOT_TOKEN, TG_CHAT_ID, NTFY_TOPIC, NTFY_TOKEN, OMANIKU_TELEFON (+3725…); fotode jaoks R2 (vt wrangler.toml)
npm run deploy
```
Siis `/admin` → Seaded (firma nimi) → Töökohad (lisa, prindi plakat) → Seadmed (lisa, prindi sildid).
**Domeen: `qrp.krativara.ee`** (Margo 02.11.2026: nimi Krativara, domeen krativara.ee registreeritud; varasem `kratt.kindavel.ee` eemaldati, kleebiseid polnud prinditud). Eeldus: krativara.ee on samas Cloudflare'i kontos aktiivne tsoon. QR sisaldab aadressi püsivalt (`HTTPS://<DOMEEN>/S/<KOOD>`, suurtähtedega, alfanumeeriline režiim, veaparandus Q); pärast printimist aadressi ei muudeta.

## Versioon, vealogi, avakuva (0.3.0)
- **Versioon:** `src/versioon.js` (tõsta iga sisulise muudatusega) + deploy'i id (`[version_metadata]`). Näha iga lehe jaluses.
- **„Uus versioon, värskenda“:** leht kontrollib `/api/versioon` iga 5 min ja rakendusse naastes; kui deploy on muutunud, tuleb alla riba.
- **Vealogi (ainult arendajale):** brauseri vead ja serveri erindid → `/dev` (võti `DEV_TOKEN`, haldur ei näe). Säilib 30 päeva, kuni 500 kirjet, piir 20 tunnis IP kohta (serveri vead 100 tunnis). Salvestub: veateade, stack, lehe tee, versioon, brauser + OS üldkujul. Ei salvestata kasutaja nime, telefoni ega IP-d. `DEV_TOKEN` peab erinema `ADMIN_TOKEN`-ist. Lisaks Workers Logs (`[observability]`) Cloudflare'i paneelis.
- **Avakuvale (PWA):** manifest + ikoonid. Android Chrome: jaluses nupp „Lisa avakuvale“ (või brauseri menüü); iPhone: Jaga → Lisa avakuvale. Võrguta tööd (service worker) pole.

## Turvalisus ja privaatsus
- Parool: PBKDF2-SHA256 (vaikimisi 100 000 iteratsiooni, 16-baidine sool). Sessioon: juhuslik 40-märgine token, serveris ainult SHA-256 räsi, küpsis `HttpOnly; Secure; SameSite=Lax`. API nõuab päist `X-QW: 1` (CSRF).
- Vigaste sisselogimiste piir: 8 telefoni ja 30 IP kohta 15 minutis; haldus 10 viga; registreerimine 10 tunnis IP kohta. Loendurid on DO mälus (kaovad DO taaskäivitusel, rünnaku ajal DO töötab).
- IP-d ei salvestata (piirangu võti on soolatud räsi). CSP nonce'iga, välist koodi ei laeta, `X-Frame-Options: DENY`, kaamera ja asukoht ainult oma lehel.
- **Isikuandmed:** kasutaja nimi ja telefon on nähtavad kolleegidele (kelle käes seade on) ja haldurile; see on registreerimisel öeldud. Logi säilib DO-s piiramata ajaga; kui vaja, lisa säilitustähtaeg (ettepanek allpool).
- **Parool ja CPU [KONTROLLIMATA]:** tasuta plaani CPU-piir päringu kohta võib PBKDF2 100 000 iteratsiooniga ületada (viga 1102 sisselogimisel). Siis sea `PBKDF2_ITER` väiksemaks (nt 30000); vanad paroolid töötavad edasi (iteratsioonide arv on räsis).
- Durable Objectide SQLite tasuta plaanil ja `new_sqlite_classes` süntaks on mälu järgi [KONTROLLIMATA]; kontrolli <https://developers.cloudflare.com/durable-objects/> enne esimest deploy'd.

## QR-lugeja
Brauseri `BarcodeDetector` (Android Chrome), selle puudumisel `/jsqr.js` (jsQR 1.4.0, Apache-2.0, iPhone Safari jt). Kaamera nõuab HTTPS-i. Kui kaamera luba puudub, saab koodi sisestada käsitsi (sildil). Kontrollitud: Chromium võltskaameraga (jsQR-tee) loeb seadme QR-i, võõras domeen / suvaline tekst annab „Tundmatu QR-kood“, töökoha QR annab juhise. Päris telefonidega (iPhone, Android) ei ole veel proovitud.

## Testid
```
npm test
```
Node 22 sisseehitatud testijooksja: registreerimine ja sisselogimine, mitu seadet ja juurde võtmine, ülevõtt ja keeld, vaidlus, tagastus teise eest, remont/taatlus/limiit, märkused, foto (R2 asendus), lehed ja CSP.

## Edasiarendus (ettepanekud)
- Kasutaja teavitus ülevõtust (SMS või ntfy kasutaja kaupa); praegu näeb ta seda järgmisel avamisel.
- Logi säilitustähtaeg ja isikuandmete kustutamine lahkunud töötajal.
- Broneerimine (seade homseks objektile) ja tagastustähtaeg seadme kaupa.
- Seadme komplekt (nt tahhümeeter + statiiv + latt) ühe QR-iga.
