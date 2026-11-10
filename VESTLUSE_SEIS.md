# Vestluse seis – Krativara (endine Kratt, repo qrwork), 10.11.2026

**10.11.2026 (lõim „Qrwork (krativara) 1110.01“):** Margo: „Jätka. Vaata ja ühtlusta disaini kindavel kodu äpiga, aga funktsionaalsuse poolelt on krativara töökohale/tööriistade/seadmete haldusele suunatud.“
**Tehtud (haru `claude/kujundus-kodu`, aluseks `ccr-1519d9cb-57d2v9` 0.5.1):** 0.6.0 kujundus K | KODU B järgi (palett, fondid, päis, alumine menüü, olekuplokk, joonikoonid, tume teema, PWA ikoon KRATIVARA). Testid 41/41, kuvad 390 px hele/tume kontrollitud. Funktsionaalsus muutmata.
**Margo 10.11:** „Päisesse K | Krativara. Sama ka PWA nimetus.“ → tehtud. Sammud 1–2 (tsoon, saladused) teeb Margo hiljem. 30 ikooniideed disainilõuendil (Margo valib).
**Tehtud 0.7.0 (Margo 10.11 „1, 2 jah. 3 mõtleme hiljem“):** ostuandmed (ainult haldur), dokumendid R2-s + pildilt lugemine (Workers AI), hooldusplaanid, kleebised valikutega (100–60 %, QR 0–6, TEATA LEIUST / oma tekst / ilma). Sõltumatu kontroll (Opus): lekkeid pole, 2 keskmist + 6 madalat leidu parandatud, testid 48/48. Avakuva nimi „K | VARA“. Varundus ootel.
**Margo küsis 10.11:** ostutšekk, hind, ostukoht ja -aeg; korduv hooldus (1×/2× aastas, 1× 2 a); kasutajate logi; foto ostul/võtmisel/tagastamisel; QR juurde trükkimine; automaatne varundus koos QR-iga (Excel draivis, kohalik server). Olemas: logi, foto võtmisel/tagastamisel/märkusel (vajab R2), sildid ja partiid, taatluse intervall kuudes, käsitsi CSV. Puudu: ostuandmed + tšekk, eraldi hooldus (taatlusest lahus), automaatne varundus.
**Ootel:** Cloudflare'i seadistus lõpuni (tsoon krativara.ee, saladused, main'i liitmine, R2, Telegram), vt README „Paigaldus“; (2) harude liitmine: `claude/project-thread-mjdpyp` (05.11, privaatsus, domeen krativara.kindavel.ee) läheb vastuollu selle haruga (leidja automaatne asukoht, Telegrami foto, domeen qrp.krativara.ee) → vaikimisi: domeen qrp.krativara.ee (Margo 02.11 sõnum), privaatsusharu muudatused liidetakse ükshaaval pärast Margo valikut.

---
(varasem seis 02.11.2026)

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

**Margo 02.11 (2. sõnum):** „Ma registreerisin krativara.ee domeeni“ „Praegu jääb senine cloudflare“ „Miks kasutad suunamist mitte kohe muuta … Näiteks qrp.krativara.ee“ „Mingeid kleebiseid pole veel prinditud“ „Jah, tee punkt 3.“
**Tehtud (haru `ccr-b7663577-93oge9`):** nimi Krativara; domeen `qrp.krativara.ee` (suunamine eemaldatud, kratt.kindavel.ee välja); 0.3.0: versioon jaluses, „uus versioon“ riba, vealogi `/dev` (DEV_TOKEN), Workers Logs, PWA. Testid 22/22, brauseris (Pixel 7 emuleeritud) kontrollitud.
**Margo teha:** krativara.ee tsoon Cloudflare'i (nimeserverid); `wrangler secret put DEV_TOKEN` (või Cloudflare → Worker → Settings → Variables); liita haru main'i.
**Ootel:** aadressi lõplik kuju (qrp. vs muu) enne printimist; eraldi Cloudflare'i konto alles piirangute korral.

**Sõltumatu ülevaatus (Opus) tehtud**, keskmised ja madalad leiud parandatud (kalendri võti logist välja, serveri logi piir, UA üldkujul, manifest).
**Järgmine samm:** Margo teeb punktid (tsoon, DEV_TOKEN) ja liidab.
