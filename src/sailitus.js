// Säilitusajad ja anonüümimine. Allikas: margo875/advisor, teadmised/krativara/
//   05_isikuandmete_oiguslik_alus.md jaotis 6 (ühtne säilitustabel), 03_isikuandmete_tootlemise_leping.md lisa 1 ja
//   „Avatud küsimused“ p 6.3–6.4 ja 6.8, 04_privaatsusteave.md tekst A.
// Alus [HINNANG, dok 05]: tööandja kahjunõue töötaja vastu aegub 12 kuu jooksul teadasaamisest, kuid mitte hiljem kui
// 3 aastat pärast kahju tekkimist (TLS § 74 lg 4); seepärast logi vaikimisi 24 kuud, ülempiir 36 kuud.
export const SAILITUS_PIIRID = {
  sail_logi_kuud: [1, 36],
  sail_max_kuud: [1, 36],
  sail_foto_kuud: [1, 36],
  sail_leid_paevi: [1, 365],
  sail_leid_tagasi_paevi: [1, 365],
  sail_bron_paevi: [0, 365],
  sail_lahkunud_kuud: [1, 36],
  sail_lahkunud_korras_paevi: [1, 365],
};
export function sailitusKontroll(s) {
  if (s.sail_max_kuud < s.sail_logi_kuud) return 'Lahendamata juhtumite ülempiir ei saa olla lühem kui logi säilitusaeg.';
  return null;
}

const ANON = 'endine kasutaja';
const SYSTEEM = new Set(['haldur', 'süsteem']);
// Logirea anonüümimine: nimed ja kasutaja id-d välja, sündmus, aeg, seade ja töökoht jäävad (statistika, seadme ajalugu).
// Kasutaja kustutamisel või lahkumisel jääb nimi logisse ainult selle säilitusaja lõpuni (dok 03 p 6.8, dok 04 tekst A).
export function anonuumiRida(x, nyyd) {
  const y = { ...x };
  if (y.nimi && !SYSTEEM.has(y.nimi)) y.nimi = ANON;
  if (y.eelmise_nimi) y.eelmise_nimi = ANON;
  if (typeof y.uus === 'string' && y.uus) y.uus = ANON;
  delete y.kasutaja; delete y.eelmine; delete y.kontakt;
  if (y.liik === 'kasutaja' && y.tekst) y.tekst = ANON; // kustutatud / lopp_kustutatud: tekst = kasutaja nimi
  y.anon = nyyd;
  return y;
}
export function anonuumiIsik(o) { return o ? { id: '', nimi: ANON, tel: '' } : o; }
