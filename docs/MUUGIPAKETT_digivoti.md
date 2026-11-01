# QR-digivõti: müügipakett ja müügikõne (mustand 01.11.2026)

Eesmärk: müüa QR-digivõtme idee ja tehtud töö paketina ostjale või litsentsivõtjale nii, et tal on odavam ja kindlam osta kui ise (ka AI-ga) uuesti teha.
Alus: `KONTSEPTSIOON_QR_digivoti.md`, töötav tööriistaregister (`../README.md`), investorinäidis `../digivoti/` (pooleli, teise agendi töö), investoriesitlus.
Hinnad ja tunnid on hinnangud, mitte pakkumised. Õigusküsimused on märgitud **→ Nõunik kontrollib**. Allikaviited, mida ei saanud veebis kinnitada, on märgitud **[KONTROLLIMATA]**.

---

## 1. Aus lähtekoht

1. **Ainult ideed ei osteta peaaegu kunagi.** Idee ei ole autoriõigusega kaitstud (kaitstud on väljendus, nt kood ja tekst, mitte põhimõte; → Nõunik kontrollib), seega ostja saab sama mõtte ise ellu viia. Lisaks on QR-ligipääs ise juba turul olemas (külaliste süsteemid, mobiilivõtmed).
2. **Ostetakse riski vähendamist ja aega.** Ostja maksab selle eest, mida ta ise kiiresti ega odavalt ei saa: **töötav ja testitud kood**, **tõendatud nõudlus** (pilootkliendi kiri, LOI, hinnaga huvi), **valdkonnateadmine** (ehitusobjektid, tööriistad, alltöövõtjad, tuleohutus, palgast kinnipidamine), **aeg turule** (kuud, mitte nädalad) ja **lahendatud ohud** (GDPR, TLS-i kinnipidamine, evakuatsiooniuksed, riistvara päris objektil).
3. **„Teeme ise AI-ga“ on päris vastuväide.** AI teeb koodi kirjutamise odavaks. AI ei anna pilootkliente, läbiproovitud releed ukse juures, ehitusplatsi kogemust ega õiguslikku paketti. Seetõttu ei müü me koodi, vaid **valmis äriüksuse algust**: kood + tõendid + teadmine + üleminekutugi.

**Ise tegemine vs ostmine (konservatiivne, Eesti turu suurusjärgud, hinnang):**

| Rida | Tunnid (madal – kõrge) | Hind €/h | Kulu € (madal – kõrge) |
|---|---|---|---|
| Nõuded, ärianalüüs, kasutusjuhud (uks, automaat, auto, tööriist, töösuhte lõpp) | 40 – 80 | 50 – 80 | 2 000 – 6 400 |
| Tagaserver + kasutaja- ja haldusliides, õigusreeglid, ajaaken, logi | 250 – 400 | 50 – 80 | 12 500 – 32 000 |
| Muutuv QR (TOTP-laadne), releekäsud, töösuhte lõpu loogika, testid | 60 – 120 | 50 – 80 | 3 000 – 9 600 |
| Riistvara integratsioon ja proovid (Shelly/ESP32, lukk, automaat, võtmekapp) | 80 – 160 | 50 – 80 | 4 000 – 12 800 |
| Kuuaruanne raamatupidamisse (kinnipidamised, sõidupäevik), formaadid | 30 – 60 | 50 – 80 | 1 500 – 4 800 |
| Turvaülevaatus (sõltumatu) | 30 – 60 | 70 – 100 | 2 100 – 6 000 |
| Õiguslik analüüs: GDPR/töötaja jälgimine, kinnipidamine, erisoodustus, tuleohutus, turvategevuse luba | 25 – 50 | 120 – 200 | 3 000 – 10 000 |
| Dokumentatsioon, demo-komplekt, koolitusmaterjal | 30 – 60 | 50 – 80 | 1 500 – 4 800 |
| **Kokku ilma AI-ta** | **≈ 545 – 990 h** | | **≈ 29 600 – 86 400 €** |
| **Kokku AI-abiga** (tagaserveri, liidese ja QR-loogika read −40 %, ülejäänu sama) | | | **≈ 23 000 – 70 000 €** |

Lisaks rahale: **4–8 kuud kalendriaega** (piloot, riistvara tarne, õiguslik kooskõlastus) ja **riskid**, mida tabel ei kata: vale lukuvalik evakuatsiooniteel, GDPR-kaebus töötajalt, kinnipidamine ilma nõusolekuta, relee ei tööta objekti Wi-Fi-s, pilootklient ei tule. Need riskid on ostja tegelik kulu. Meie pakett vähendab neid, mitte ainult tunde.

---

## 2. Kirjandus ja mudelid: mida kasutame

| Allikas | Mõte (2–4 rida) | Mida siit kasutame |
|---|---|---|
| **Robert B. Cialdini, *Influence: The Psychology of Persuasion* (1984; *New and Expanded* 2021) ja *Pre-Suasion* (2016)** | Kuus mõjutamise põhimõtet: vastastikkus, pühendumus ja järjepidevus, sotsiaalne tõend, autoriteet, meeldimine, nappus; 2021. väljaandes seitsmes: ühtsus (unity). *Pre-Suasion*: tähelepanu, mis on suunatud vahetult enne pakkumist, muudab otsust. | Vastastikkus: tasuta 20-min demo ja „valmis ärikeis“ enne küsimist. Sotsiaalne tõend: LOI-d ja piloodi logi. Autoriteet: ehitusjärelevalve taust. Nappus: ainulitsents ühele partnerile piirkonnas. Pre-suasion: kohtumine algab küsimusega „mitu kaarti/võtit jääb aastas töösuhte lõpus tagastamata?“ |
| **Daniel Kahneman, Amos Tversky: prospektiteooria (*Econometrica*, 1979) ja ankurdamine (*Science*, 1974)** [KONTROLLIMATA: aasta ja ajakiri mälust] | Kaotus kaalub otsuses rohkem kui sama suur võit. Esimene number (ankur) mõjutab kõiki järgmisi hinnanguid. | Raamime ostu kui **kaotuse vältimist**: „iga kuu ilma selleta kaotab teie klient …“ ja „konkurent jõuab VKE segmenti enne“. Esimene number laual on **asendamiskulu ~ 30–86 tuh €**, mitte meie hind. |
| **Neil Rackham, *SPIN Selling* (1988, McGraw-Hill; uuring ~35 000 müügikõne põhjal)** | Suures B2B-müügis võidab küsimuste järjekord: Situatsioon → Probleem → Implikatsioon → Vajaduse kasu. Ostja ise sõnastab väärtuse. | 15-min kohtumise keskosa (p 4.3) on SPIN-küsimused; implikatsiooni küsimused viivad ostja enda arvutatud kahjuni. |
| **Matthew Dixon, Brent Adamson, *The Challenger Sale* (2011)** | Keerukas B2B-müügis võidab müüja, kes **õpetab** kliendile uue vaatenurga, **kohandab** sõnumi ostukomitee liikmele ja **juhib** otsust, mitte ainult ei ehita suhet. | Avame „kaubandusliku õpetusega“: kaardisüsteem lahendab ukse, aga VKE kulu on viies eri süsteemis (uks, tööriist, auto, kohvikassa, sõidupäevik). Kohandame: juhile kasv, finantsile kinnipidamine, IT-le turve. |
| **Oren Klaff, *Pitch Anything* (2011)** [KONTROLLIMATA: aasta ja kirjastus mälust] | Kohtumises võidab see, kes kontrollib **raami** (võimu-, aja-, intriigi- ja auhinnaraam). „Prizing“: pakkuja on auhind, mitte palujad. | Raam: „me valime ühe partneri Balti riikides“ (auhind); ajaraam: pakkumine kehtib kuni piloodi lõpuni; lühike kohtumine, lahkume enne, kui huvi langeb. Ei kasuta manipulatsiooni: kõik väited on tõesed. |
| **Geoffrey A. Moore, *Crossing the Chasm* (1991)** [KONTROLLIMATA: aasta mälust] | Varajaste kasutajate ja peavoolu vahel on kuristik; see ületatakse ühe kitsa **rannapeaga** (beachhead), kus lahendus on täielik. | Rannapea: **ehitus- ja paigaldusettevõtted 20–250 töötajat** (tööriistad + objekti konteinerid + alltöövõtjad + tööautod). Ostjale müüme valmis rannapea, mitte „kõike kõigile“. |
| **Clayton M. Christensen, Taddy Hall, Karen Dillon, David S. Duncan, *Competing Against Luck* (2016)** | Kliendid „palkavad“ toote, et saavutada edasiminek kindlas olukorras (Job to Be Done), ja „vallandavad“, kui see ei tööta. | Töö, mida klient palkab: „**töösuhte lõpus kõik ühe klõpsuga kinni ja kuu lõpus raamatupidamine korras ilma Excelita**“. Ostja töö: „uus VKE-toode ilma 6-kuulise arenduseta“. |
| **Rob Fitzpatrick, *The Mom Test* (2013; 2. väljaanne hiljem)** | Ära küsi „kas see on hea idee?“: kõik valetavad viisakusest. Küsi mineviku käitumist ja pühendumust (aeg, raha, maine). | LOI-de kogumine (p 3.4): küsime, mis juhtus viimati, kui töötaja lahkus, ja palume **pühendumust** (pilootkiri hinnaga), mitte kiitust. |
| **B2B ostukomitee (Gartner B2B buying journey)** | Keerukat B2B-ostu otsustab grupp, mitte üks inimene; Gartneri arvud teiseste allikate kaudu on 6–10 otsustajat, teistes allikates 5–20 [KONTROLLIMATA: Gartneri esmaallikat ei leitud]. Gartneri järgi on konsensuse saavutanud grupid oluliselt tõenäolisemalt rahul tehingu kvaliteediga (Computer Weekly vahendusel). | Iga ostja juures kaardistame vähemalt: ärisuuna juht (kasv), finantsjuht (hind, royalty), tehnikajuht (kood, turve), jurist (IP, GDPR), müügijuht (kas nad suudavad seda müüa). Igaühele oma 1-leheline. |
| **IP- ja M&A-tehingute väärtustamine** | Kolm tavapärast lähenemist: **kulupõhine** (cost-to-replicate: mis maksaks uuesti teha), **turupõhine** (võrreldavad tehingud) ja **tulupõhine** (tulevane tulu, sh *relief-from-royalty*: kui palju litsentsitasu omanik säästab). Rusikareegel „25 % litsentsivõtja kasumist“ (Goldscheider) on ainult lähtepunkt; USA föderaalne apellatsioonikohus nimetas seda kõrvaleheidetud rusikareegliks. **Earn-out**: osa hinnast makstakse hiljem, kui eesmärgid täituvad; **royalty**: protsent müügist. | Hinna alampiir tuleb kulupõhisest arvutusest (p 1), lisaosa earn-out'i/royalty kaudu, sest tulevane tulu ei ole tõendatud. Ostja risk ja müüja ülespoole võit jagatakse. |

Allikad (kontrollitud 01.11.2026 veebiotsinguga): Cialdini – <https://en.wikipedia.org/wiki/Robert_Cialdini>; SPIN – <https://www.routledge.com/SPINr-Selling/Rackham/p/book/9781138465954>; Challenger – <https://www.audible.com/pd/The-Challenger-Sale-Audiobook/0593163141>; Competing Against Luck – <https://books.apple.com/us/book/competing-against-luck/id1080332425>; Mom Test – <https://www.shortform.com/blog/the-mom-test-book/>; Gartner konsensus – <https://www.computerweekly.com/microscope/news/366623625/Gartner-shines-light-on-B2B-buyer-challenges>; 25 % reegel – <https://lesi.org/les-nouvelles/les-nouvelles-online/march-2011>, <https://www.bvresources.com/articles/legal-and-court-case-update/25-rule-does-not-irretrievably-damage-royalty-analysis>.

---

## 3. Valitud lahendus (üks)

### 3.1 Lahendus ühe lausega
**Ainulitsents ühele strateegilisele partnerile Balti riikides (Eesti, Läti, Leedu) koos ostuoptsiooniga:** partner saab koodi, kaubamärgi kasutuse ja kogu paketi ainuõigusega oma piirkonnas, maksab sissetulekutasu + royalty'd ja võib 24 kuu jooksul kogu IP eelnevalt kokku lepitud hinnaga välja osta.

**Miks just see:**
- Puhas müük kohe annab praeguses staadiumis (piloote pole) madala hinna. Litsents + optsioon laseb ostjal alustada väikese riskiga ja Margol saada osa ülespoole võidust.
- Ainuõigus on päris nappus (Cialdini, Klaff), mitte võte: me ei saa sama paketti kahele konkurendile anda.
- Ostuoptsioon vastab ostja hirmule „mis siis, kui Margo kaob“ (p 4.5, „kes hooldab“).

### 3.2 Paketi sisu
| # | Osa | Sisu | Valmis? |
|---|---|---|---|
| 1 | **Kood ja IP** | `qrwork` (tööriistade register, töötab, testid) + `digivoti` (uks, muutuv QR, relee, automaat, auto, töösuhte lõpp, kuuaruanne, testid); lähtekood, testid, paigaldusjuhend, kolmandate osapoolte litsentside nimekiri (jsQR Apache-2.0, QR-generaator MIT). Õiguste üleandmine/litsents lepinguga. | osaliselt (digivoti pooleli) |
| 2 | **Dokumentatsioon** | arhitektuur, andmemudel, turvapõhimõtted, API, halduri ja kasutaja juhend, paigaldaja juhend (Shelly/ESP32). | osaliselt |
| 3 | **Demo-komplekt** | ratastel raam: uks elektrilukuga + relee, „automaat“, muutuva QR-iga ekraan, tööriist kleebisega, haldusvaade suurel ekraanil; 5-min stsenaarium (kontseptsiooni p 3). | tegemata (riistvara 400–800 €) |
| 4 | **Õiguslik pakett** | GDPR andmekaitsealase mõjuhinnangu (DPIA) mall, töötaja teavitus, kinnipidamise nõusoleku vorm, säilitustähtajad, tuleohutuse/evakuatsiooniuste nõuete kokkuvõte, turvategevuse loa küsimus. **→ Nõunik kontrollib** kõik õigusviited (TLS § 78, TuMS § 48, AKI juhend, turvategevuse seadus); tuleohutuse tehniline osa **→ Ehitusinsener**. | tegemata |
| 5 | **Nõudluse tõendid** | 2–3 LOI-d või pilootkirja (p 3.4), piloodi logi kokkuvõte (anonüümne), kliendivestluste märkmed (Mom Test). | tegemata |
| 6 | **Äriline osa** | rannapea kirjeldus (ehitusettevõtted 20–250 töötajat), hinnamudel kliendile (3 €/kasutaja/kuu + 5 €/uks/kuu, hinnang), 10 segmenti, konkurentide võrdlus. | olemas (kontseptsioon), täpsustada |
| 7 | **Üleminekutugi** | **6 kuud**: kuni 40 h Margo/arendaja aega (koolitus, esimese 3 kliendi juurutus, vigade parandus 90 päeva), edasi tunnitasuga. | pakkumises |

### 3.3 Tehingu struktuur ja hind
| Osa | Ankur (esimene pakkumine) | Sihthind | Kõndimise piir (alla selle ei müü) |
|---|---|---|---|
| Sissetulekutasu (ainulitsents Baltikumis, 5 a) | 45 000 € | 30 000 € | 20 000 € |
| Royalty partneri digivõtme netokäibest | 6 % | 5 % | 4 % |
| Minimaalne aastane royalty (kaitseb „riiulisse panemise“ eest) | 8 000 €/a | 6 000 €/a | 4 000 €/a; ilma miinimumita ainuõigust ei anta |
| Ostuoptsioon kogu IP-le (24 kuu jooksul) | 120 000 € | 100 000 € | 75 000 € (sh juba makstud sissetulekutasu arvestamata) |
| Üleminekutugi | 6 kuud / 40 h sees | sama | 3 kuud / 20 h sees |

**Põhjendus:**
- **Ankur** tuleb kulupõhisest arvutusest (p 1: 30–86 tuh € ilma AI-ta) + aeg turule 4–8 kuud. Klaff/Kahneman: esimene number laual on asendamiskulu, siis meie pakkumine (45 000 €) on sellest selgelt allpool.
- **Kõndimise piir 20 000 €** ≈ AI-abiga ise tegemise madal ots (≈ 23 000 €). Alla selle on ostjal tõesti odavam ise teha ja Margol pole mõtet ainuõigust anda.
- **Royalty 4–6 %**: tarkvara litsentsides levinud vahemik [KONTROLLIMATA: täpne turu vahemik vajab võrreldavate tehingute andmebaasi]; 25 % reegel annaks ainult kontrollnumbri, mitte aluse.
- **Kui LOI-d puuduvad**, langeb realistlik sissetulekutasu kõndimise piiri lähedale. Iga allkirjastatud LOI on läbirääkimises tugevam kui ükski slaid.
- Alternatiiv, kui ostja tahab kohe kõike: ühekordne müük 60 000–75 000 € + earn-out 10 % käibest 3 aastat (lagi 50 000 €). Seda pakume ainult vastuseks, mitte esimesena.

### 3.4 Mida Margo teeb enne müüki (4–6 nädalat)
1. **2–3 LOI-d / pilootkirja** ehitus- või paigaldusettevõttelt (20–250 töötajat). Mom Test: küsi viimast korda, kui töötaja lahkus (mis jäi tagastamata, kui palju aega kulus); siis paku 60-päevast pilooti fikseeritud hinnaga (nt 300–500 € paigaldus + 1 kuu tasuta) ja palu kirja: „Kui piloot vastab kirjeldusele, oleme valmis maksma X €/kuu“. LOI on mittesiduv, aga hinnaga.
2. **Demo-komplekt kokku** (uks + relee + automaat + ekraan) ja 2-min video.
3. **Üks päris piloot** (kasvõi ühe konteineri uks + 20 tööriista) ja anonüümne logi „mis juhtus 30 päevaga“.
4. **IP-omaniku selgus:** kelle nimel on kood (Margo isiklikult, P.P. Ehitusjärelevalve OÜ, Kindavel OÜ)? Kõik osad ühe omaniku alla. AI-ga loodud koodi autoriõiguslik staatus ja Claude'i kasutustingimused väljundi kohta **→ Nõunik kontrollib**.
5. **Õiguslik pakett** (p 3.2 rida 4) Nõuniku kontrolliga.
6. **Andmetuba** (ilma koodita): demo video, arhitektuuri skeem, testide tulemuste kokkuvõte, LOI-d, õiguslik kokkuvõte.

### 3.5 Kuidas kaitsta ideed enne tehingut
- **Mida õigus kaitseb ja mida mitte (→ Nõunik kontrollib):** lähtekood ja dokumentatsioon on autoriõiguse objekt (arvutiprogramm kui kirjandusteos); **idee, põhimõte, äriloogika ja meetod ei ole** autoriõigusega kaitstud. Arvutiprogramm „sellisena“ ei ole Euroopas üldjuhul patenditav. Ärisaladus on kaitstud ainult siis, kui seda hoitakse mõistlike meetmetega saladuses (NDA, piiratud ligipääs). Kaubamärk „digivõti“ vajab eraldi kontrolli ja registreerimist. **Ühtegi õiguskaitset ei lubata ostjale enne Nõuniku kontrolli.**
- **Järjekord:** 1) avalik osa: probleem, demo video, tulemused, ilma tehniliste detailideta; 2) **NDA** enne arhitektuuri ja andmetoa avamist (NDA ei takista ideed kopeerimast, aga kaitseb konfidentsiaalset materjali ja jätab jälje); 3) **elav demo** Margo juhtimisel, kood jääb Margo serverisse; 4) **lähtekood alles pärast allkirjastatud lepingut ja esimest makset** (või escrow kaudu); 5) lepingus: konfidentsiaalsus, konkurentsi mitteloomise klausel tehingu ajal, IP jääb Margole kuni optsiooni täitmiseni.
- **Tegelik kaitse on kiirus ja suhe:** kes on kuu ajaga teinud piloodi ja LOI-d, on ostjale väärtuslikum kui tema enda 6-kuuline projekt.

---

## 4. Müügikõne

### 4.1 Elevator pitch (30 s)
> „Iga kord, kui ehitusfirmas töötaja lahkub, jäävad maha võtmed, kaardid, kadunud tööriistad ja kohvikassa võlg. Kaardisüsteem lahendab ainult ukse. Meil on töötav süsteem, kus töötaja telefon avab ukse, võtab tööriista, broneerib auto ja ostab automaadist, ning haldur sulgeb kõik ühe nupuga ja saadab kuu lõpus faili raamatupidamisse. See on ehitusjärelevalve inseneri tehtud, testitud ja valmis. Otsime **ühte** partnerit Balti riikides, kes viib selle oma klientideni. Kas teil on 15 minutit, et näha seda töös?“

### 4.2 Kõne skript (3 min)
1. **Avang, luba (15 s).** „Tere, siin Margo Pädam, olen ehitusinsener ja ehitusjärelevalve taustaga. Helistan, sest teie [turvalahendused / autopargi lahendused / rendiäri] kliendid on täpselt need ettevõtted, kelle probleemi me lahendasime. Kas teil on 3 minutit?“
2. **Kaubanduslik õpetus (Challenger, 45 s).** „Me arvame tavaliselt, et VKE läbipääsuprobleem on uks. Objektidel nägin, et kulu on tegelikult viies kohas korraga: uksed, tööriistad, autod, kohvikassa, sõidupäevik. Igaüks eri süsteemis või Excelis. Töösuhte lõpus tuleb kõik käsitsi kokku korjata. Kaardisüsteem katab ainult esimest.“
3. **Küsimus (SPIN, 45 s).** „Kuidas teie kliendid praegu töösuhte lõpu korraldavad? … Kui palju neist küsib teilt midagi odavamat kui täis kaardisüsteem? … Mis juhtub, kui te neile midagi ei paku?“ (kuula, kirjuta üles nende sõnad)
4. **Tõend ja auhind (Cialdini/Klaff, 45 s).** „Meil on töötav süsteem, testid, demo-komplekt ja [N] ettevõtet, kes on kirjalikult valmis pilootima. Me ei müü seda kõigile: valime Balti riikides ühe partneri ainuõigusega, sest kood ja klientide huvi peavad minema ühte kohta.“
5. **Selge järgmine samm (30 s).** „Ma ei küsi täna otsust. Küsin 15 minutit järgmisel nädalal, kus näete demot ja ütlete ise, kas see sobib teie müügiga. Kas teisipäev või neljapäev sobib paremini?“

### 4.3 15-min kohtumise struktuur (SPIN + Challenger)
| Min | Osa | Mida teen | Mudel |
|---|---|---|---|
| 0–1 | Raam | „15 minutit, lõpus otsustate, kas järgmine samm on mõttekas. Kui ei ole, ütlete otse.“ | Klaff: ajaraam |
| 1–3 | Õpetus | 1 slaid: „viis süsteemi ühe asemel“ + töösuhte lõpu kontrollnimekiri (mida tuleb tagasi korjata) | Challenger, Pre-Suasion |
| 3–7 | SPIN | S: mis on teie klientidel praegu? P: kus see valutab? I: mis see maksab (kadunud tööriist, lahkunud töötaja kaart, raamatupidaja tunnid)? N: mida tähendaks teie müügile, kui saaksite VKE-le pakkuda ühte odavat süsteemi? | Rackham |
| 7–11 | Demo | Uus töötaja → avab ukse → ostab kohvi → võtab tööriista → haldur „Töösuhe lõppes“ → uks ei avane → kuuaruanne. Iga sammu juures üks number nende sõnadest (I-küsimustest). | sotsiaalne tõend, kaotuse vältimine |
| 11–13 | Pakett ja raam | Paketi 7 osa (p 3.2), ainulitsents + optsioon, LOI-d. Hinda **ei** ütle enne, kui küsitakse; kui küsitakse, siis esimesena asendamiskulu, siis meie vahemik. | ankurdamine, nappus |
| 13–15 | Järgmine samm | Ostukomitee: „Kes teie poolt veel peab seda nägema (finants, tehnika, jurist)?“ NDA + andmetuba + kokkulepitud kuupäev. | Gartner: ostukomitee, Cialdini: pühendumus |

### 4.4 Külm e-kiri (≤ 120 sõna) ja kaks järelkirja

**Teema:** Üks nupp töösuhte lõpus: uksed, tööriistad, autod, automaadid

> Tere,
>
> olen ehitusinsener ja ehitusjärelevalve taustaga. Teie VKE-kliendid maksavad töösuhte lõpus sama probleemi eest viies kohas: uksed, tööriistad, tööautod, kohvikassa ja sõidupäevik.
>
> Meil on töötav ja testitud süsteem: töötaja telefon avab ukse, võtab tööriista, broneerib auto ja ostab automaadist. Haldur sulgeb kõik ühe nupuga ja saadab kuu lõpus faili raamatupidamisse. Sisemisel uksel piisab 20–60 € releest, kaarti pole vaja.
>
> Otsime Balti riikides ühte partnerit, kes viib selle oma klientideni (ainulitsents). Kas 15-minutiline demo järgmisel nädalal sobib? Pakun teisipäeva või neljapäeva.
>
> Lugupidamisega
> Margo Pädam

(≈ 85 sõna)

**Järelkiri 1 (4 päeva hiljem):**
> Tere, lisan 2-minutilise video, kus uus töötaja avab ukse, võtab tööriista ja haldur lõpetab töösuhte ühe nupuga. Kui teemat käsitleb teie juures keegi teine, palun öelge, kellele kirjutada. Margo

**Järelkiri 2 (7 päeva hiljem, viimane):**
> Tere, see on minu viimane kiri sel teemal. Lõpetame partneri valiku [kuupäev]. Kui see ei ole teile praegu prioriteet, on ka see vastus mulle kasulik. Kui on, saadan kalendrikutse. Margo

### 4.5 Vastuväidete käsitlus
| Vastuväide | Vastus |
|---|---|
| **„Teeme ise AI-ga.“** | „Õige, koodi saab AI-ga kirjutada, me tegime ka. Meie arvutus näitab, et ise tegemine maksab 23–70 tuhat eurot ja 4–8 kuud, sest suurem osa tööst on riistvara proovid, tuleohutus, GDPR, kinnipidamise kord ja pilootkliendid. Neid AI ei tee. Te ostate 6 kuud ja need riskid. Kui teie oma arvutus tuleb odavam, tehke ise. Võrdleme numbreid?“ |
| **„Liiga varajane.“** | „Nõus, seepärast pole see puhas müük. Ainulitsents laseb alustada väikese sissetulekutasuga; suurem osa tasust tuleb royalty'na alles siis, kui te müüte. Ostuoptsioon jääb teie kätte. Mida peaks nägema, et see poleks enam varajane? 3 pilooti?“ |
| **„Kaardid töötavad.“** | „Välisuksel ja kõrge turvatasemega ruumis jäävad kaardid, ja see on õige. Probleem on kõik muu: tööriistad, autod, automaadid, konteinerid, alltöövõtjad. Seal kaarti ei ole ja seal on kulu. See täiendab teie kaardisüsteemi, mitte ei asenda seda.“ |
| **„GDPR.“** | „Õige mure. Süsteem on ehitatud minimeerimise põhimõttel: IP-sid ei salvestata, andmed on EL-is, logil on eesmärk ja säilitusaeg. Paketis on DPIA mall, töötaja teavitus ja nõusoleku vorm, mille jurist on üle vaadanud [alles pärast Nõuniku kontrolli]. Te ei alusta nullist.“ |
| **„Hind on liiga kõrge.“** | „Võrdleme kolme numbrit: ise tegemine 23–70 tuhat ja 4–8 kuud, meie sissetulekutasu, ja teie esimese aasta müük 20 kliendile. Mis osa neist teile ei sobi: summa, makse ajastus või risk? Saame osa tasust viia royalty'sse.“ (Ära lange alla kõndimise piiri.) |
| **„Kes seda hooldab?“** | „Esimesed 6 kuud mina koos arendajaga, kokkulepitud tundidega. Kood on testidega, dokumenteeritud ja tavapärasel platvormil, nii et teie arendaja saab selle üle võtta. Ostuoptsiooniga saate kogu IP enda kätte, siis ei sõltu te minust.“ |
| **„Margo pole tarkvarafirma.“** | „Just. Ma tean ehitusplatsi, tööriistade kadu ja alltöövõtjate ligipääsu seestpoolt. Seda tarkvarafirma ei tea. Tarkvarafirma olete teie. Me ei konkureeri teiega, me anname teile valmis toote ja esimesed kliendid.“ |
| **„Miks just teie (miks meie)?“** | „Sest teil on juba kliendid, paigaldajad ja müük. Mul on toode ja pilootide huvi. Kumbki ei jõua üksi kiiresti VKE-turule. Valime ühe partneri, sest ainuõigus on teie kaitse konkurentide eest.“ |
| **„Saatke materjal, vaatame.“** | „Saadan 1-lehelise ja video. Kas leppime kohe kokku 15 minutit pärast seda, kui olete vaadanud? Muidu läheb see postkasti.“ |
| **„Meil on oma mobiilivõtme lahendus.“** | „Hea, siis on teil uste pool olemas. Kas see katab tööriistad, autod, automaadid ja palgast kinnipidamise? Kui ei, saab meie osa olla mooduliks teie lahenduse juures; pakett on selleks ka litsentsina.“ |

---

## 5. 10 kontakti (ostjad või litsentsivõtjad, mitte lõppkliendid)

Kontrollitud veebiotsinguga 01.11.2026. Isikunimesid ja isiklikke kontakte ei koguta; roll on soovitus, kellele kirjutada (otsi ettevõtte kodulehelt või üldaadressilt). Tõenäosus = tõenäosus jõuda tõsise läbirääkimiseni, mitte tehinguni.

| Järk | Ettevõte | Tegevusala (kontrollitud) | URL | Kellele kirjutada | Miks just neile | Nende võit | Tõenäosus |
|---|---|---|---|---|---|---|---|
| 1 | **Navirec** (Eesti kapital, Tallinn) | autopargi GPS-jälgimine, sõidupäevik, sõidukite broneering, uste avamine mobiilirakendusega | <https://navirec.com/en/about-us>, <https://navirec.com/en/solution/opening-and-closing-doors-via-mobile-app> | tootejuht / ärisuuna juht | Neil on juba sõidupäevik, autobroneering ja rakendusega uste avamine; meie pakett lisab tööriistad, automaadid ja kinnipidamise samale kliendile. | Uus moodul olemasolevale kliendibaasile, suurem käive kliendi kohta, ilma 6-kuulise arenduseta. | **kõrge**: tegevus kattub kõige rohkem, Eesti otsustus |
| 2 | **Hansab** (Hansab Group, BaltCap enamusosalus 2023) | turva- ja teenindusautomaatika B2B-klientidele Baltikumis, läbipääsusüsteemid (nt sadamad, pank, tehased) | <https://www.hansab.com/news/>, <https://www.baltcap.com/portfolio-item/hansab/> | ärisuuna juht (turvalahendused) / arendusjuht | Balti läbipääsuintegraator, kelle praegused projektid on suured; VKE segment vajab odavamat toodet. Teeb ise oste (2026 Replicant IT). | Odav VKE-toode olemasolevale müügile ja paigaldajatele; erakapitali omanik otsib kasvu. | **kõrge**: ostuvõimekus ja sobiv portfell; konkureerib ka sisemise arendusega |
| 3 | **G4S Eesti AS** (Allied Universal grupp) | turvateenused ja turvatehnika, videovalve teenusena VKE-le | <https://securitybuyer.com/?p=13763>, <https://www.inforegister.ee/10024993-G4S-BALTICS-AS/> | turvasüsteemide juht | Neil on juba VKE-le suunatud teenusmudel (video kui teenus); digivõti sobib sama mudeli juurde. | Lisateenus olemasolevale VKE-kliendile, korduv tulu. | **keskmine**: läbipääsusüsteemide pakkumist ei õnnestunud veebist kinnitada, grupiotsused välismaal |
| 4 | **Ramirent Baltic AS** (Loxam grupp) | ehitus- ja tööstusseadmete rent, moodulite tehas Rae vallas | <https://scoris.eu/company/EE/10199349>, <https://modules.ramirent.ee/?p=3> | digitaalteenuste / tootejuht Baltikumis | Rendivahendite väljastus ja tagastus ning objektikonteinerid on täpselt `qrwork` + digivõtme juhtum. | Iseteeninduslik väljastus konteinerist/kapist, vähem kadusid, lisateenus ehitusklientidele. | **keskmine**: sobivus suur, aga Loxami üleminek 2026–2030 võib otsuseid aeglustada |
| 5 | **ASSA ABLOY Opening Solution Baltic AS** (ASSA ABLOY grupp, Tallinn) | lukkude ja uksesüsteemide hulgimüük Baltikumis | <https://www.assaabloy.com/ee/en/about-us>, <https://ariregister.rik.ee/est/company/10116821> | ärisuuna juht / tootejuht (elektroonilised lukud) | Lukutootja kohalik üksus, kes müüb paigaldajatele; VKE-le vajab lukkudega koos odavat juhtimistarkvara. | Lukkude lisamüük VKE-le koos tarkvaraga. | **madal–keskmine**: grupil on oma mobiilivõtme tooted, kohalik üksus on peamiselt hulgimüüja |
| 6 | **Merit Tarkvara AS** (Visma grupp) | raamatupidamis- ja palgatarkvara (Merit Aktiva, Merit Palk) | <https://www.merit.ee/en/> | partnerluse / integratsioonide juht | Kuuaruande kinnipidamised lähevad otse palgaarvestusse; Merit Palk on suure kasutajabaasiga. | Lisamoodul või integratsioon, mis seob kliendi tugevamini. | **madal** ostjana, **keskmine** integratsioonipartnerina (sotsiaalne tõend teistele ostjatele) |
| 7 | **Mainor Ülemiste AS** (Ülemiste City, TestCity) | linnaku arendaja, uute tehnoloogiate testkeskkond | <https://www.ulemistecity.ee/en/test-city-news/ulemiste-city-introduced-test-city-a-unique-testing-environment-for-new-technologies-in-the-nordics/> | TestCity / innovatsioonijuht | Ametlik testkeskkond, kus piloodi saab teha päris hoones; ostjale tugev tõend. | Uus nutilinnaku teenus üürnikele (uksed, ruumid, automaadid), innovatsiooni näide. | **keskmine** piloodiks, **madal** ostjana |
| 8 | **Cramo Estonia AS** (Boels grupp) | ehitus- ja tööstusseadmete rent, Tallinn, Tartu, Pärnu | <https://www.emis.cn/php/company-profile/EE/Cramo_Estonia_AS_en_2344477.html>, <https://mena.nl/artikel/pitch-best-deal-2020-boels-cramo> | ärisuuna / digitaalteenuste juht | Sama juhtum nagu Ramirent; teine pakkuja annab läbirääkimisel alternatiivi. | Iseteeninduslik väljastus, vähem kadusid. | **madal–keskmine**: otsused grupis (Boels), kaubamärgi üleminek |
| 9 | **Telia Eesti AS** | side, IoT ärilahendused (nt Sigfox-partnerlus Connected Balticsiga) | <https://www.telia.ee/en/uudised/telia-eesti-toob-sigfox-tehnoloogiaga-asjade-interneti-lahemale> | IoT / äriklientide lahenduste juht | Müüb ärikliendile ühenduvust ja IoT-lahendusi; digivõti on valmis „rakendus“ selle peale. | Lisateenus VKE paketti, rohkem ühendusi. | **madal**: suur organisatsioon, praegune Eesti IoT pakkumine veebist kinnitamata |
| 10 | **Buildit** (riistvara- ja IoT-kiirendi, Riia; algus Tartus) | eelkülviinvesteeringud riistvara/IoT idufirmadesse | <https://techcrunch.com/2014/02/17/buildit>, <https://ecosystem.fi/eco/buildit-latvia/> | programmi juht | Kui partner tahab, et Margo jääks toote juurde, on kiirendi teine tee (raha + mentorid); alternatiiv: EstBAN (<https://estban.ee/?p=2855>). | Varajane osalus IoT-ettevõttes. | **madal**: investor, mitte ostja; eelkülvi puhul nõutakse teadete järgi Lätis asutamist |

**Järjekord:** 1 Navirec → 2 Hansab → 3 G4S → 4 Ramirent → 5 ASSA ABLOY → 6 Merit (integratsioon paralleelselt) → 7 Mainor Ülemiste (piloot paralleelselt) → 8 Cramo → 9 Telia → 10 Buildit/EstBAN (ainult kui partnerit ei leia).
Põhjus: kõigepealt need, kelle praegune toode kattub kõige rohkem ja kes otsustavad Eestis; paralleelselt piloodi ja integratsiooni kontaktid, mis annavad tõendeid teistele.

---

## 6. 6-nädalane tegevuskava ja mõõdikud

| Nädal | Tegevus | Mõõdik (eesmärk) |
|---|---|---|
| 1 | IP-omaniku otsus; Nõunikule õigusküsimused (p 3.4–3.5); demo-komplekti riistvara tellimine; 10 pilootkliendi nimekiri (ehitus/paigaldus, 20–250 töötajat); 1-leheline + NDA mall | 10 pilootkliendi kandidaati; Nõuniku tellimus tehtud |
| 2 | 10 Mom Test vestlust pilootklientidega (minevik, valu, raha); demo-komplekt kokku; 2-min video | ≥ 6 vestlust; demo töötab |
| 3 | Pilootkirjad/LOI-d; 1 piloodi paigaldus; külmkirjad kontaktidele 1–5 | ≥ 1 LOI; 5 kirja saadetud |
| 4 | Järelkirjad; esimesed 15-min kohtumised; Merit ja Mainor Ülemiste paralleelselt; piloodi logi | ≥ 3 kohtumist; ≥ 2 LOI kokku |
| 5 | Teine voor: ostukomitee kohtumised (finants, tehnika, jurist) NDA all; andmetuba; kirjad kontaktidele 6–9 | ≥ 2 NDA-d; ≥ 1 ostukomitee kohtumine |
| 6 | Kirjalik pakkumine (term sheet) 1–2 partnerile; tähtaeg 2 nädalat; piloodi 30 päeva kokkuvõte | ≥ 1 kirjalik pakkumine; 3 LOI-d; otsus jätkata või muuta |

**Kogumõõdikud 6 nädala lõpus:** 10 pilootkliendi vestlust, 3 LOI-d, 6 ostjakohtumist, 2 NDA-d, 1–2 kirjalikku pakkumist (term sheet).
**Lõpetamise kriteerium:** kui 6 nädala järel pole ühtegi LOI-d ega ostukomitee kohtumist, ei langetata hinda, vaid muudetakse rannapead (nt ladu/logistika, kontseptsiooni segment #3) ja korratakse nädalaid 2–4.

---

## Kontrollimata ja avatud küsimused
- Kahneman–Tversky (1979, 1974), Moore (1991), Klaff (2011) aastad on mälust [KONTROLLIMATA]; Gartneri ostukomitee suurus esmaallikast leidmata.
- Royalty turuvahemik 4–6 % on hinnang [KONTROLLIMATA].
- G4S Eesti läbipääsusüsteemide pakkumine ja Telia Eesti praegune IoT pakkumine veebist kinnitamata; Buildit'i praegune vastuvõtt ebaselge.
- Kõik õigusküsimused (autoriõigus koodile ja AI-väljundile, ärisaladus, NDA mõju, TLS § 78, TuMS § 48, GDPR, turvategevuse tegevusluba) **→ Nõunik kontrollib**; evakuatsiooniuste tehniline osa **→ Ehitusinsener**.
- Pilves ei olnud investoriesitlust ega digivõtme lõplikku seisu; pakett tuleb pärast `digivoti/` valmimist üle vaadata.
