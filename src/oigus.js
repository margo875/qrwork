// Privaatsusteave (/privaatsus) ja kasutustingimused (/tingimused).
// Tekstid: margo875/advisor, haru claude/pilv-too, teadmised/krativara/
//   04_privaatsusteave.md (tekst A töötajale, tekst B leidjale; IKÜM art 13),
//   06_kasutustingimused.md (osa A töötajale, osa B leidjale),
//   05_isikuandmete_oiguslik_alus.md (õiguslik alus: töötaja – õigustatud huvi; leidja sõnum – õigustatud huvi, GPS – nõusolek).
// Tekstis valikud ([Telegram / ntfy], foto, superkasutaja jms) valitakse seadistuse järgi; Kliendi andmed (registrikood,
// aadress, kontakt) tulevad halduse seadetest. Täitmata väli on lehel nähtav märkena „[täitmata: …]“.
// Muuda teksti ainult koos advisor'i dokumentidega (04, 05, 06), et need oleksid samad.

export const andmedEL = (env) => String(env?.ANDMETE_ASUKOHT || '').toLowerCase() === 'eu';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const T = (v, nimi) => (v ? esc(v) : `<mark>[täitmata: ${esc(nimi)}]</mark>`);
const kp = (d) => (d ? d.split('-').reverse().join('.') : '');

const STIIL = `*{box-sizing:border-box}body{font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#f3f4f6;color:#111}
main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:1.35rem}h2{font-size:1.15rem;margin-top:1.6rem}h3{font-size:1rem;margin:1.1rem 0 .3rem}
section{background:#fff;border-radius:12px;padding:14px 16px;margin:12px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid #d1d5db;padding:6px;text-align:left;vertical-align:top}
mark{background:#fde68a}a{color:#1d4ed8}.vaike{font-size:.85rem;color:#4b5563}`;

function leht(pealkiri, sisu) {
  return () => `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(pealkiri)}</title><style>${STIIL}</style></head><body><main>${sisu}
<p class="vaike"><a href="/privaatsus">Privaatsusteave</a> · <a href="/tingimused">Kasutustingimused</a> · <a href="/">Krativara</a></p></main></body></html>`;
}

function kanalTekst(k) { return k.length ? k.join(' / ') : ''; }

export function sailitusTabel(s) {
  const r = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  return '<table><tr><th>Andmed</th><th>Säilitusaeg</th></tr>' +
    r('Võtmise, tagastuse, ülevõtu, tagastuse teise eest, kinnituse, märkuse, vaidluse ja broneeringu logiread (sh töötaja nimi)', `${s.sail_logi_kuud} kuud sündmusest; seejärel asendatakse nimi märkega „endine kasutaja“`) +
    r('Lahendamata puudujäägi, kao, kahju või vaidlusega seotud logiread ja fotod', `kuni juhtumi lahendamiseni, kuid mitte üle ${s.sail_max_kuud} kuu sündmusest; nõude esitamisel menetluse lõpuni`) +
    r('Fotod', `${s.sail_foto_kuud} kuud; juhtumiga seotud foto nagu eelmine rida`) +
    r('Lahkunud töötaja konto', `lahkumisel konto peatatakse, parooli räsi ja sessioonid kustutatakse; nimi ja telefon anonüümitakse ${s.sail_lahkunud_kuud} kuud pärast lahkumist või ${s.sail_lahkunud_korras_paevi} päeva pärast seda, kui seadmete üleandmine oli korras; logiridades säilib nimi logi säilitusaja lõpuni`) +
    r('Broneeringud', `${s.sail_bron_paevi} päeva pärast broneeringu lõppu`) +
    r('Leiuteade (sõnum, kontakt, asukoht, linn)', `${s.sail_leid_paevi} päeva või ${s.sail_leid_tagasi_paevi} päeva pärast seadme tagasisaamist, kumb saabub varem`) +
    r('Teavituskanali sõnumid', 'kuni 90 päeva; kustutab vastutav töötleja oma vestlusest või teemast') +
    r('Kustutatud kirjed', '30 päeva taastatavad, seejärel lõplik kustutamine') +
    r('Sisselogimisküpsis <code>qw_sess</code>', '180 päeva või väljalogimiseni') + '</table>';
}

function vastutav(s) {
  return `Vastutav töötleja on <b>${T(s.firma !== 'Firma' && s.firma, 'firma nimi')}</b>, registrikood ${T(s.registrikood, 'registrikood')}, aadress ${T(s.aadress, 'aadress')}, kontakt ${T(s.andmekaitse_kontakt, 'andmekaitse kontakt')}.` +
    (s.dpo ? ` Andmekaitsespetsialist: ${esc(s.dpo)}.` : '') +
    ` Krativara teenust osutab ${esc(s.firma)} nimel Kindavel OÜ (volitatud töötleja).`;
}

function edastus(i) {
  const s = i.seaded;
  return (i.el ? 'Andmebaas ja fotod asuvad Cloudflare\'i Euroopa Liidu andmekeskustes. ' : '') +
    `Taristupartner Cloudflare, Inc. asub USA-s. Edastuse alus: ${T(s.edastus_alus, 'edastuse alus (nt standardlepingutingimused või EL–USA andmekaitseraamistik)')}.` +
    (i.kanalid.includes('Telegram') ? ' Halduri teavitused liiguvad Telegrami kaudu, mis ei asu EL-is.' : '') +
    ` Lisateave: ${T(s.andmekaitse_kontakt, 'andmekaitse kontakt')}.`;
}

export function privaatsusLeht(i) {
  const s = i.seaded, kanal = kanalTekst(i.kanalid), firma = esc(s.firma);
  const kontakt = T(s.andmekaitse_kontakt, 'andmekaitse kontakt');
  const foto = i.foto !== 'ei';
  return leht('Privaatsusteave – Krativara', `<h1>Privaatsusteave</h1>
<section id="tootaja"><h2>A. Töötajale (Krativara kasutaja)</h2>
<h3>Kes töötleb sinu andmeid?</h3><p>${vastutav(s)}</p>
<h3>Milleks andmeid kasutatakse?</h3><ul><li>töökoha seadmete arvestus: kelle käes seade on, millal see võeti ja tagastati, millises laos see on;</li>
<li>seadme üleandmine ja ülevõtt kolleegide vahel ning vaidluste lahendamine;</li><li>seadme seisukorra märkused${foto ? ' ja fotod' : ''} (kahjustus, puuduv tarvik, taatlus);</li>
<li>broneeringud;</li><li>kontol sisselogimine ja konto kaitse.</li></ul>
<p><b>Õiguslik alus:</b> vastutava töötleja õigustatud huvi pidada arvestust töövahendite üle ja kaitsta oma vara (isikuandmete kaitse üldmäärus (EL) 2016/679 art 6 lg 1 p f).</p>
<h3>Milliseid andmeid töödeldakse?</h3><table><tr><th>Andmed</th><th>Kust</th><th>Kohustuslik?</th></tr>
<tr><td>nimi, telefon</td><td>sina registreerimisel</td><td>jah, ilma nendeta ei saa seadmeid võtta</td></tr>
<tr><td>parool</td><td>sina; salvestatakse ainult räsina, keegi ei näe seda</td><td>jah</td></tr>
<tr><td>võtmise, tagastuse, ülevõtu ja broneeringu aeg, töökoht ja seade</td><td>süsteem sinu tegevuse põhjal</td><td>jah</td></tr>
<tr><td>märkused ja vaidluse põhjendus</td><td>sina</td><td>ei</td></tr>
${foto ? `<tr><td>fotod seadmest (EXIF ja asukoht eemaldatakse)</td><td>sina</td><td>${i.foto === 'kohustuslik' ? 'jah, tööandja on nõudnud' : 'ei'}</td></tr>` : ''}
<tr><td>hilinenud tagastuste arv</td><td>süsteem</td><td>–</td></tr></table>
<p>Sinu IP-aadressi ei salvestata. Sinu asukohta ei jälgita.</p>
<h3>Kes andmeid näeb?</h3><ul>
<li>Kolleegid näevad sinu nime ja telefoni, kui seade on sinu käes või kui sa oled seadme broneerinud (et nad saaksid sinuga ühendust võtta).</li>
<li>Kolleegid näevad seadme kaardil ka seadme viimase 15 sündmuse ajalugu koos sinu nimega ja sinu nime märkuse juures, mille sa seadmele lisasid.</li>
<li>Superkasutaja (${firma} määratud isik) näeb kõiki seadmeid ja seda, kelle käes need on, koos nime ja telefoniga.</li>
<li>Haldur (${firma} määratud isik) näeb kõiki andmeid, logi${foto ? ' ja fotosid' : ''}.</li>
<li>Kindavel OÜ ja tema taristupartner Cloudflare, Inc. hoiavad andmeid teenuse osutamiseks.</li>
${kanal ? `<li>Halduri teavitused saadetakse ${esc(kanal)} kanalisse. Need sisaldavad seadme nime, sündmust ja sinu nime, kui sa registreerusid (kinnitust ootav kasutaja), võtsid seadme üle või kui seade võeti sinult üle, lisasid seadmele probleemi märkuse (nt „Kahjustatud“) või vaidlustasid ülevõtu, ning leiuteate korral selle töötaja nime, kelle nimel seade on. Telefoninumbrit teavitusse ei saadeta.</li>` : ''}
${i.kalender ? '<li>Broneeringud koos sinu nimega on halduri kalendris.</li>' : ''}</ul>
<h3>Kas andmeid edastatakse väljapoole EL-i?</h3><p>${edastus(i)}</p>
<h3>Kui kaua andmeid hoitakse?</h3>${sailitusTabel(s)}
<p>Kui sinu konto kustutatakse, jääb sinu nimi sündmuste logi ridadesse logi säilitusaja lõpuni ja seejärel anonüümitakse. Säilitusajad rakenduvad automaatselt.</p>
<h3>Küpsised ja telefoni mälu</h3><p>Krativara kasutab ühte vajalikku küpsist (<code>qw_sess</code>), mis hoiab sind sisse logituna. Sinu nimi ja telefon jäetakse sinu telefoni brauserisse meelde, et järgmine kord ei peaks neid uuesti sisestama. Reklaami- ega analüütikaküpsiseid ei ole.</p>
<h3>Sinu õigused</h3><p>Sul on õigus taotleda oma andmetega tutvumist, nende parandamist, kustutamist ja töötlemise piiramist ning esitada töötlemisele vastuväide. Taotlus: ${kontakt}.
Kui leiad, et sinu õigusi on rikutud, võid pöörduda Andmekaitse Inspektsiooni (<a href="https://www.aki.ee">www.aki.ee</a>) või kohtusse.</p>
<h3>Automaatsed otsused</h3><p>Süsteem keelab automaatselt uute seadmete võtmise, kui keegi on sinu nimel oleva seadme üle võtnud ja sa ei ole sellele vastanud. Keeld kaob kohe, kui vastad („Jah, tagastasin“ või „Ei, vaidlustan“). Profiilianalüüsi ei tehta.</p>
<p class="vaike">Kehtib alates ${T(kp(s.tingimused_kehtib), 'kuupäev')}.</p></section>
<section id="leidja"><h2>B. Leidjale</h2>${leidjaTekst(i)}</section>`);
}

// Tekst B (dok 04); kasutatakse ka leidja lehel vormi all
export function leidjaTekst(i) {
  const s = i.seaded, kanal = kanalTekst(i.kanalid), kontakt = T(s.andmekaitse_kontakt, 'andmekaitse kontakt');
  return `<p>Teate saab ${esc(s.firma)} (${kontakt}), selle seadme omanik. Teenust osutab Kindavel OÜ.</p>
<p>Kasutame sinu sõnumit, kontakti (kui selle annad) ja asukohta (ainult siis, kui märgid ise „Lisa minu asukoht“ ja lubad telefonil selle saata), et seade kätte saada ja vajadusel sinuga ühendust võtta. Umbkaudne linn tuleb sinu internetiühenduse andmetest; IP-aadressi ei salvestata.</p>
<p>Alus: sõnumi ja kontakti puhul omaniku õigustatud huvi saada seade tagasi (määrus (EL) 2016/679 art 6 lg 1 p f), asukoha puhul sinu nõusolek (art 6 lg 1 p a).
${kanal ? `Teade jõuab seadme halduri ${esc(kanal)} kanalisse${i.kanalid.includes('Telegram') ? ' ja võib liikuda väljapoole EL-i' : ''}.` : 'Teade jõuab seadme haldurile.'}
Hoiame teadet ${s.sail_leid_paevi} päeva või ${s.sail_leid_tagasi_paevi} päeva pärast seadme tagasisaamist, kumb saabub varem.</p>
<p>Sul on õigus oma andmetega tutvuda, neid parandada või kustutada ning esitada vastuväide või võtta asukoha kohta antud nõusolek tagasi: ${kontakt}. Kaebus: Andmekaitse Inspektsioon, <a href="https://www.aki.ee">www.aki.ee</a>.</p>`;
}

export function tingimusedLeht(i) {
  const s = i.seaded, firma = esc(s.firma), kontakt = T(s.andmekaitse_kontakt, 'kontakt');
  return leht('Kasutustingimused – Krativara', `<h1>Kasutustingimused</h1>
<section id="tootaja"><h2>A. Töötajale</h2>
<h3>A1. Mis on Krativara</h3><p>Krativara on ${firma} töökoha seadmete register. QR-koodiga saad seadme võtta ja tagastada, vaadata, kus seade on, broneerida seadme ja teatada probleemist. Teenust osutab ${firma}-le Kindavel OÜ.</p>
<h3>A2. Konto</h3><ul><li>Registreeru oma nime ja oma telefoniga. Konto on isiklik: ära anna parooli teisele ega võta seadmeid teise nimel.</li>
${s.registreerimine === 'kinnitamisega' ? '<li>Konto aktiveerib haldur. Kuni kinnituseni saad sisse logida, kuid seadmeid võtta ei saa.</li>' : ''}
<li>Kui unustasid parooli, küsi haldurilt taastuskood (kehtib 24 tundi).</li><li>Kui telefon kaob või keegi teine teab su parooli, teata kohe haldurile.</li></ul>
<h3>A3. Seadme võtmine ja tagastamine</h3><ul><li>Võtmisel seotakse seade sinuga (nimi, telefon, aeg, töökoht). Tagasta ja registreeri tagastus, kui seade on tagasi laos või antud kolleegile.</li>
<li>Korraga võib sinu nimel olla kuni ${esc(s.max_seadmeid)} seadet.</li>
<li>Seadet ei saa võtta, kui see on remondis, maha kantud, taatlusel või aegunud taatlusega, kui teine inimene on selle täna broneerinud või kui sinu konto on peatatud.</li>
<li><b>Ülevõtt:</b> kui kolleeg võtab üle seadme, mis on veel sinu nimel, näed avalehel teadet. Vasta „Jah, tagastasin / andsin üle“ või „Ei, vaidlustan“ koos põhjusega. Kuni vastuseni ei saa sa uusi seadmeid võtta. Vaidlus läheb haldurile.</li>
<li><b>Tagastus teise eest:</b> kui seade on laos, aga kolleeg unustas tagastuse registreerida, võid märkida selle tagastatuks tema eest. Märgi ainult siis, kui seade on päriselt laos.</li></ul>
<h3>A4. Märkused${i.foto !== 'ei' ? ' ja fotod' : ''}</h3><ul><li>Seadme andmeid (nimi, numbrid, taatlus, olek) muudab ainult haldur. Sina saad lisada märkuse (<i>Ei tööta</i>, <i>Vajab taatlemist</i>, <i>Kahjustatud</i>, <i>Tarvik puudu</i>, <i>Muu</i>)${i.foto !== 'ei' ? ' ja foto' : ''}.</li>
<li>Kirjuta märkusesse ainult seadme kohta käivat.${i.foto !== 'ei' ? ' Ära lisa fotole inimesi, dokumente ega muud kõrvalist.' : ''}</li>
${i.foto !== 'ei' ? `<li>Foto võtmisel ja tagastamisel on ${i.foto}.</li>` : ''}</ul>
<h3>A5. Broneerimine</h3><p>Broneering on kuni 180 päeva ette ja kuni 60 päeva pikk. Tühista broneering, mida sa ei vaja. Haldur võib broneeringu tühistada.</p>
<h3>A6. Keelatud on</h3><ul><li>registreerida võltsnime või teise inimese telefoniga;</li><li>märkida võtmist, tagastust või ülevõttu, mida tegelikult ei toimunud;</li>
<li>proovida pääseda halduri vaatesse, teise kontole või süsteemi turvameetmetest mööda;</li><li>koormata süsteemi automaatsete päringutega;</li><li>kopeerida või levitada Krativara tarkvara.</li></ul>
<p>Rikkumise korral võib haldur konto peatada.</p>
<h3>A7. Andmed</h3><p>Sinu nime ja telefoni näevad kolleegid, kui seade on sinu käes või sinu broneeritud. Sinu nime näevad kolleegid ka seadme ajaloos ja sinu lisatud märkuse juures. Superkasutaja näeb kõiki seadmeid ja seda, kelle käes need on. Logi${i.foto !== 'ei' ? ' ja fotosid' : ''} näeb haldur. Täpsemalt: <a href="/privaatsus#tootaja">privaatsusteave</a>.</p>
<h3>A8. Kättesaadavus</h3><p>Krativara võib vahel olla ajutiselt kättesaamatu (hooldus, sidekatkestus). Siis anna seade üle tavapärasel viisil ja teata haldurile; registreeri võtmine või tagastus, kui süsteem töötab.</p>
<h3>A9. Muudatused ja kontakt</h3><p>Tingimuste muudatusest teatatakse rakenduses. Küsimused: ${kontakt}.</p>
<p class="vaike">Kehtib alates ${T(kp(s.tingimused_kehtib), 'kuupäev')}.</p></section>
<section id="leidja"><h2>B. Leidjale</h2><p>See seade kuulub ${firma}-le. Vormiga saad saata omanikule teate. Kontakt ja asukoht on vabatahtlikud; asukoht saadetakse ainult sinu loal.</p>
<p>Kirjuta ainult leiu kohta. Ära saada võltsteateid ega reklaami. Teadete arv on piiratud.</p>
<p>Teade ei anna õigust seadet endale jätta. Omanik võtab sinuga ühendust, kui jätsid kontakti${s.telefon ? `, või saad helistada: <a href="tel:${esc(s.telefon)}">${esc(s.telefon)}</a>` : ''}.</p>
<p>Andmed: <a href="/privaatsus#leidja">privaatsusteave</a>.</p></section>`);
}
