# Vestluse seis – Krativara (endine Kratt, repo qrwork), 02.11.2026

**Teema:** QR-põhine tööriistade register töökohale „Kratt“, https://kratt.kindavel.ee (Cloudflare Worker + Durable Object, deploy Workers Builds'iga `main`-ist).

**Tehtud:** register, võtmine/tagastamine, ülevõtt + vaidlus, leidja leht, foto (R2 valikuline), inventarinumber `L1-2611001`, superkasutaja + laod, kataloogi QR `/I/`, kustutamine 30 p taastamisega, broneerimine, taatluse register, kalendrilink (ICS), halduse vahekaartide märgid. Testid 17/17. Sõltumatu ülevaatus tehtud (Opus).
**Ootel:** PR #4 (kustutamine, broneerimine, taatlus, kalender, märgid) – Margo liidab. Tööharu punane rist = `wrangler preview` ei toeta DO-d; soovitus: Cloudflare → Settings → Build → lülita non-production branch builds välja.

**Margo laused:** „Ära praegu veel arenda, alustame selgitustest, võimalustest ja sellest mida ja millal oleks mõistlik teha või arutada.“ „See võiks olla üks töötaja initsiatiivi projektidest … ja siis seda vb laiemalt turustada.“

**Nõunikule saadetud (02.11):** dokumentatsiooni palve (õiguste kuuluvus AutÕS, katse-/litsentsileping, isikuandmete töötlemise leping, privaatsusteave, õiguslik alus, kasutustingimused). Nõunik küsib Margolt: pakkuja (eraisik / Kindavel OÜ), tööandja, kas töölepingus on IT-arendus.

**Ootel otsused (soovitus → vaikimisi):**
1. Toote nimi ja domeen enne päris kleebiste printimist (QR-is püsivalt): oma domeen (nt kratt.ee, kontrollimata kas vaba) vs kratt.kindavel.ee → vaikimisi jääb kratt.kindavel.ee kuni esitluseni.
2. Eraldi Cloudflare'i konto tootele: jah, enne katset tööandjaga (piirid ja arveldus on konto kohta; kindavel.ee alamdomeen teises kontos vajab oma domeeni) → vaikimisi koos punktiga 1.
3. Järgmine arendus (väike): versiooninumber + „uus versioon, värskenda“ riba + varjatud tehniline vealogi (kliendi vead + Workers Logs, ainult arendajale, 30 p) + PWA (avakuvale lisamine).
4. Hiljem: Microsoft 365 sisselogimine (multi-tenant Entra rakendus, tellija IT annab nõusoleku, koodi ei jagata), mitme firma tugi (praegu üks DO „firma“ = üks firma), Smart-ID/Mobiil-ID (leping SK või vahendajaga), Teams'i teavitused.

**Märkus:** teine lõim („QR-põhine digivõti süsteem“) kirjutas samasse repos harusse `claude/qr-digital-key-system-z0mhov` (docs/); see on eraldi projekt, mitte Kratt.

**Otsus 1 (Margo 02.11):** „nimi Krativara, aadress täpsustada, domeen krativara.ee loomisel, vana hakkab suunama edasi“. Tehtud harus `ccr-b7663577-93oge9`: nimi lehtedel/teavitustes/kalendris, `PEA_HOST` suunamine (301/308), vana domeeni QR-id tuntakse ära, testid 19/19. krativara.ee saadavus kontrollimata (pilvest RDAP ei avane).
**Ootel:** otsus 3 (versiooninumber + vealogi + PWA: jah/ei) – Margo vastus jäi sõnumist puudu; otsus 2 (eraldi Cloudflare'i konto) koos domeeni registreerimisega.

**Järgmine samm:** Margo registreerib krativara.ee (või kontrollib saadavust internet.ee-s), vastab otsusele 3.
