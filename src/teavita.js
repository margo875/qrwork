// Halduri teavitus: Telegram (TG_BOT_TOKEN + TG_CHAT_ID) ja/või ntfy (NTFY_TOPIC, valikuliselt NTFY_TOKEN, NTFY_URL).
// Kui ühtegi pole seadistatud, ei saadeta midagi (sündmused on ikkagi halduse logis).
export async function teavita(env, tekst, gps) {
  const tood = [];
  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    tood.push(fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: tekst.slice(0, 4000), disable_web_page_preview: true }),
    }));
    if (gps) tood.push(fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendLocation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, latitude: gps.lat, longitude: gps.lon }),
    }));
  }
  if (env.NTFY_TOPIC) {
    const h = { 'Content-Type': 'text/plain; charset=utf-8', Title: 'Kratt' };
    if (env.NTFY_TOKEN) h.Authorization = `Bearer ${env.NTFY_TOKEN}`;
    tood.push(fetch(`${env.NTFY_URL || 'https://ntfy.sh'}/${encodeURIComponent(env.NTFY_TOPIC)}`, { method: 'POST', headers: h, body: tekst.slice(0, 4000) }));
  }
  const r = await Promise.allSettled(tood);
  return r.filter((x) => x.status === 'fulfilled' && x.value.ok).length;
}
