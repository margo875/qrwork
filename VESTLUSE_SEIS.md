# Vestluse seis – Kratt (repo qrwork), 02.11.2026

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

**Järgmine samm:** Margo vastab otsustele 1–3; uues lõimes alusta sellest failist ja README-st.

## Lisa 02.11.2026 (Nõuniku teated selle lõimesse, Margo otse kinnitamata siin lõimes)
- **Nimi „Krativara“, domeen krativara.kindavel.ee**, vana kratt.kindavel.ee suunab edasi (Margo Nõuniku lõimes: „Jah, uus aadress ka“).
- Pakkuja Kindavel OÜ, tööandja P.P. Ehitusjärelevalve OÜ, töölepingus IT-arendust pole.
- Õigusdokumendid valmis: margo875/advisor, haru claude/pilv-too, `teadmised/krativara/` (dok 03 p 6 = avatud küsimused, dok 04 tekst A/B = privaatsusteave, dok 06 = kasutustingimused).
- **8 tootemuudatust enne katset** (Nõunik; privaatsusteavet ei avaldata enne):
  1. leidja lehel GPS-linnuke vaikimisi välja + lause, kuhu asukoht läheb ja kui kaua hoitakse;
  2. teavitustest töötaja telefon välja (registreerimine, ülevõtt, märkus, vaidlus, leiuteade); Telegrami sendLocation välja; IP-linna ei salvestata, kui leidja asukohta ei luba;
  3. automaatsed säilitusajad (DO alarm, seadetes muudetav): logi vaikimisi 24 kuud (max 3 a) → nimi anonüümseks; leiuteated 90 p; lahkunud töötaja nimi/telefon anonüümseks 12 kuu (puudujäägita 30 p) pärast; „hoia“ märge vaidluse/puudujäägi ridadele (TLS § 74 lg 4);
  4. R2 fotode elutsükkel 6 kuud;
  5. ntfy ainult tokeniga (eelistatult EL), DO ja R2 jurisdiktsioon EL;
  6. domeen krativara.kindavel.ee; iga klient = oma paigaldus;
  7. registreerimisvormile nõustumise linnuke + lingid kasutustingimustele ja privaatsusteabele; leidja lehele lühike privaatsusteave;
  8. halduses täielik JSON-eksport.
- Lisaks varem pakutud: versiooninumber + „uus versioon“ riba, varjatud vealogi, PWA.
- NB DO jurisdiktsioon: olemasoleva DO asukohta ei saa muuta; EL-i jaoks uus namespace (`idFromName` + `jurisdiction('eu')`) → andmete ülekanne või uus algus (katseandmed). [KONTROLLIMATA]
