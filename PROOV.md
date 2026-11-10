# Krativara prooviversioon (ilma domeenita)

Aadress: `https://qrwork-proov.<sinu-konto>.workers.dev` (Cloudflare'i tasuta alamdomeen). Oma andmed, ei sega päris versiooni `qrp.krativara.ee`.
Vajab arvutit, kuhu on paigaldatud Node.js (22+) ja Git. Kõik käsud käivad repo kaustas (`qrwork`).

## 1. Kood (üks kord)
```
git clone https://github.com/margo875/qrwork
cd qrwork
git checkout claude/kujundus-kodu
```
Hiljem uuendamiseks: `git pull`.

## 2. Cloudflare'i sisselogimine (üks kord)
```
npx wrangler login
```
Avaneb brauser → luba ligipääs.

## 3. Saladused (üks kord)
Iga käsk küsib väärtust; kirjuta vähemalt 16 märki (näiteks KeePassXC-ga genereeritud) ja salvesta need KeePassXC-sse.
```
npx wrangler secret put ADMIN_TOKEN --env proov
npx wrangler secret put TOKEN_SECRET --env proov
```
Kui küsitakse, kas luua uus Worker „qrwork-proov“, vasta **jah**.

## 4. Käivita
```
npx wrangler deploy --env proov
```
Lõpus näidatakse aadressi (`…workers.dev`). Ava telefonis:
- **Haldus**: `<aadress>/admin` → sisesta ADMIN_TOKEN.
- Haldus → Seaded → firma nimi; Töökohad → lisa ladu (registreerimine „vaba“) → prindi plakat või ava töökoha link telefonis → registreeru.
- Seadmed → lisa seade → 🖨 Kleebised (proovi 100 / 70 / 60 %).
- Hooldus → lisa hooldaja (võid olla ise) → seadme juures „Saada hooldusesse“ → prindi töökäsk → skänni teise telefoniga.

## Valikuline
- **Fotod ja dokumendid**: Cloudflare → R2 → Create bucket `qrwork-proov-fotod`, siis `wrangler.toml`-is eemalda `[[env.proov.r2_buckets]]` ploki ridade eest `#` ja tee uuesti samm 4.
- **Pildilt lugemine**: Haldus → Seaded → „Nõustun pildimudeli litsentsiga“ (Workers AI on juba seotud; tasuta kvoot).
- **Telegram**: `npx wrangler secret put TG_BOT_TOKEN --env proov` ja `TG_CHAT_ID` (sama bot, mis Leia mind'is).

Kui sisselogimisel tuleb viga 1102 (CPU limiit tasuta plaanil): `wrangler.toml` → `[env.proov]` alla `vars = { PBKDF2_ITER = "30000" }` ja samm 4 uuesti.

Prooviversiooni kustutamine: Cloudflare → Workers & Pages → qrwork-proov → Settings → Delete.
