// QR-digivõti: Shelly Gen2+ (Plus 1, Pro 1, Gen3/Gen4) skript ukse- või automaadireleele.
// *** PÄRIS SEADMEL PROOVIMATA (01.11.2026). Enne kasutust proovi laual, mitte evakuatsiooniteel. ***
//
// Tööpõhimõte: seade KÜSIB serverilt (pollib) iga sekund POST /api/relee/<KOOD> oma seadmetokeniga. Server annab
// ühekordse käsu {liik: "ava"|"valjasta", sekundit: N} või kask: null. Sissetulevaid ühendusi pole vaja (NAT/tulemüür ok).
// Seadistus: Shelly veebiliides → Scripts → Add script → kleebi see → muuda KONF → Save → Start (ja „Run on startup“).
// Seadmetoken: halduse lehel objekti juures „Seadmetoken“ (näidatakse üks kord). Hoia seda nagu võtit.
// Tuleohutus: evakuatsioonitee uks peab avanema ka ilma süsteemita (fail-safe lukk, tulekahjusignaal); see skript
// ei asenda seda.

let KONF = {
  server: 'https://qrdigivoti.<konto>.workers.dev', // Margo otsustab domeeni; seni workers.dev aadress
  kood: 'XXXXXXXXXXXX',                            // objekti 12-märgine kood
  token: 'SEADMETOKEN_32_MARKI',                    // seadmetoken (32 märki)
  relee: 0,                                         // releekanal (Switch id)
  intervall_ms: 1000,
  max_sekundit: 30,
};

let kaib = false;

function kysi() {
  if (kaib) return;
  kaib = true;
  Shelly.call('HTTP.Request', {
    method: 'POST',
    url: KONF.server + '/api/relee/' + KONF.kood,
    headers: { Authorization: 'Bearer ' + KONF.token, 'Content-Type': 'application/json' },
    body: '{}',
    timeout: 5,
  }, function (vastus, viga, teade) {
    kaib = false;
    if (viga !== 0 || !vastus || vastus.code !== 200) {
      if (vastus && vastus.code === 401) print('Vale seadmetoken');
      return;
    }
    let j = null;
    try { j = JSON.parse(vastus.body); } catch (e) { return; }
    if (!j || !j.kask) return;
    let s = j.kask.sekundit || 1;
    if (s > KONF.max_sekundit) s = KONF.max_sekundit;
    // toggle_after: relee lülitub ise tagasi välja ka siis, kui ühendus vahepeal katkeb
    Shelly.call('Switch.Set', { id: KONF.relee, on: true, toggle_after: s });
    print('Käsk ' + j.kask.liik + ' ' + s + ' s ' + (j.kask.kellele || ''));
  });
}

Timer.set(KONF.intervall_ms, true, kysi);
