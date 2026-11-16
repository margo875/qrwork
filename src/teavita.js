// Halduri teavitus: Telegram (TG_BOT_TOKEN + TG_CHAT_ID) ja/või ntfy (NTFY_TOPIC + NTFY_TOKEN, valikuliselt NTFY_URL).
// Kui ühtegi pole seadistatud, ei saadeta midagi (sündmused on ikkagi halduse logis).
// Andmete minimeerimine (advisor teadmised/krativara/03 „Avatud küsimused“ p 6.2 ja p 6.5):
//  - teavitusse ei panda töötaja telefoninumbrit (seda teeb register.js);
//  - Telegrami eraldi asukohasõnumit (sendLocation) ei saadeta; leidja asukoht on ainult tekstis lingina;
//  - ntfy saadetakse ainult ligipääsuvõtmega (NTFY_TOKEN), sest avalikku teemat saab lugeda igaüks, kes teab selle nime.
export function teavitusKanalid(env) {
  const k = [];
  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) k.push('Telegram');
  if (env.NTFY_TOPIC && env.NTFY_TOKEN) k.push('ntfy');
  return k;
}
export async function teavita(env, tekst) {
  const tood = [];
  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    tood.push(fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: tekst.slice(0, 4000), disable_web_page_preview: true }),
    }));
  }
  if (env.NTFY_TOPIC && env.NTFY_TOKEN) {
    const h = { 'Content-Type': 'text/plain; charset=utf-8', Title: 'Krativara', Authorization: `Bearer ${env.NTFY_TOKEN}` };
    tood.push(fetch(`${env.NTFY_URL || 'https://ntfy.sh'}/${encodeURIComponent(env.NTFY_TOPIC)}`, { method: 'POST', headers: h, body: tekst.slice(0, 4000) }));
  }
  const r = await Promise.allSettled(tood);
  return r.filter((x) => x.status === 'fulfilled' && x.value.ok).length;
}
