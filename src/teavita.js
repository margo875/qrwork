// Halduri teavitus: Telegram (TG_BOT_TOKEN + TG_CHAT_ID) ja/või ntfy (NTFY_TOPIC, valikuliselt NTFY_TOKEN, NTFY_URL).
// Kui ühtegi pole seadistatud, ei saadeta midagi (sündmused on ikkagi halduse logis).
// Telegrami osa (chat id kontroll, veateade vihjega, sendPhoto) on üle võetud repost margo875/leiamind (src/worker.js, 02.11.2026).

// TG_CHAT_ID kontroll: kehtiv on -?\d+ või @kanal. Vigast väärtust (nt boti token) ei saadeta kuhugi ega näidata.
export function tgChatId(env) {
  if (env.TG_CHAT_ID === undefined || env.TG_CHAT_ID === null) return { seatud: false };
  const v = String(env.TG_CHAT_ID).trim();
  if (!v) return { seatud: false };
  if (/^-?\d+$/.test(v) || /^@[A-Za-z][A-Za-z0-9_]{3,}$/.test(v)) return { seatud: true, ok: true, id: v };
  return { seatud: true, ok: false, viga: v.includes(':')
    ? 'TG_CHAT_ID on vigane: tundub, et sinna on pandud boti token. Pane sinna vestluse ID (number).'
    : 'TG_CHAT_ID on vigane. Pane sinna vestluse ID (number, nt 123456789 või -100123456789) või @kanal.' };
}

const TG_VIHJED = [
  [/chat not found/i, 'ava bot Telegramis ja vajuta Start'],
  [/bot can'?t send messages to (a )?bot/i, 'TG_CHAT_ID-s on boti token'],
  [/unauthorized/i, 'TG_BOT_TOKEN on vale'],
  [/bot was blocked/i, 'bot on Telegramis blokeeritud, eemalda blokeering'],
];
// Telegrami veateade halduri jaoks: tokenit ei näidata kunagi.
export function tgVeateade(env, kirjeldus, status) {
  let k = String(kirjeldus || '').replace(/\d{5,}:[A-Za-z0-9_-]{10,}/g, '[token]');
  if (env.TG_BOT_TOKEN && String(env.TG_BOT_TOKEN).length >= 10) k = k.split(String(env.TG_BOT_TOKEN)).join('[token]');
  k = k.slice(0, 200);
  const vihje = TG_VIHJED.find(([re]) => re.test(k))?.[1];
  return `Telegram: ${k || `HTTP ${status}`}${vihje ? ` (${vihje})` : ''}`;
}

// gps = {lat, lon} → Telegram sendLocation (kaardipunkt) pärast teksti. foto = {bytes, mime, laiend} → sendPhoto (tekst allkirjaks).
// Tagastab {saadetud: õnnestunud kanalite arv, tg: {seatud, ok, viga}, ntfy: {seatud, ok, viga}, fotoOk}.
export async function teavita(env, tekst, gps, foto) {
  const tul = { saadetud: 0, tg: { seatud: false }, ntfy: { seatud: false }, fotoOk: false };
  const tood = [];
  const chat = tgChatId(env);
  if (env.TG_BOT_TOKEN || chat.seatud) {
    tul.tg.seatud = true;
    if (!env.TG_BOT_TOKEN) tul.tg.viga = 'TG_BOT_TOKEN puudub';
    else if (!chat.seatud) tul.tg.viga = 'TG_CHAT_ID puudub';
    else if (!chat.ok) tul.tg.viga = chat.viga;
  }
  if (env.TG_BOT_TOKEN && chat.ok) {
    const url = (m) => `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${m}`;
    const tg = (m, keha) => fetch(url(m), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat.id, ...keha }) });
    tood.push((async () => {
      let t, tekstEraldi = true;
      try {
        if (foto) {
          try {
            const pikk = tekst.length > 1024; // caption ≤ 1024: pikem tekst läheb eraldi sendMessage'ina
            const fd = new FormData();
            fd.append('chat_id', chat.id);
            fd.append('caption', pikk ? tekst.split('\n')[0].slice(0, 1024) : tekst);
            fd.append('photo', new Blob([foto.bytes], { type: foto.mime }), `foto.${foto.laiend}`);
            const r = await fetch(url('sendPhoto'), { method: 'POST', body: fd, signal: AbortSignal.timeout(10000) });
            tul.fotoOk = r.ok !== false;
            tekstEraldi = !tul.fotoOk || pikk;
            if (tul.fotoOk && !pikk) t = r;
          } catch (e) { console.error('sendPhoto ebaõnnestus', e); }
        }
        if (tekstEraldi) t = await tg('sendMessage', { text: (foto && !tul.fotoOk ? `${tekst}\n(foto ei jõudnud kohale)` : tekst).slice(0, 4000), disable_web_page_preview: true });
        if (t && t.ok === false) {
          let d = '';
          try { d = (await t.clone().json())?.description; } catch { /* keha pole JSON */ }
          tul.tg.viga = tgVeateade(env, d, t.status);
        } else { tul.tg.ok = true; tul.saadetud++; }
        if (gps && tul.tg.ok) await tg('sendLocation', { latitude: gps.lat, longitude: gps.lon }).catch(() => {});
      } catch (e) { tul.tg.viga = tgVeateade(env, e && e.message ? `ühendus: ${e.message}` : 'ühendus ebaõnnestus', 0); }
    })());
  }
  if (env.NTFY_TOPIC) {
    tul.ntfy.seatud = true;
    const h = { 'Content-Type': 'text/plain; charset=utf-8', Title: 'Krativara' };
    if (env.NTFY_TOKEN) h.Authorization = `Bearer ${env.NTFY_TOKEN}`;
    tood.push((async () => {
      try {
        const r = await fetch(`${env.NTFY_URL || 'https://ntfy.sh'}/${encodeURIComponent(env.NTFY_TOPIC)}`, { method: 'POST', headers: h, body: (foto ? `${tekst}\n(foto ainult Telegramis)` : tekst).slice(0, 4000) });
        if (r.ok) { tul.ntfy.ok = true; tul.saadetud++; } else tul.ntfy.viga = `ntfy: HTTP ${r.status}`;
      } catch (e) { tul.ntfy.viga = 'ntfy: ühendus ebaõnnestus'; }
    })());
  }
  await Promise.all(tood);
  if (tul.tg.viga) console.error('teavitus:', tul.tg.viga);
  if (tul.ntfy.viga) console.error('teavitus:', tul.ntfy.viga);
  return tul;
}
