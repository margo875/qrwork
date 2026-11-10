// HTML-lehed: kasutaja rakendus (/, /K/<kood>, /S/<kood>) ja haldus (/admin).
// Välist koodi ei laeta: QR-generaator on src/qrgen.js (MIT), QR-lugeja jsQR /jsqr.js (Apache-2.0) ainult siis,
// kui brauseril pole BarcodeDetector'it. Kõik kasutaja sisestatud väärtused läbivad esc().
import { QR_JS } from './qrgen.js';
import { EXIF_JS } from './exif.js';
import { KLEEBIS_JS } from './kleebis.js';

// Skännitud QR teksti tõlgendus. Kehtib ainult sama hosti /S/<kood> (seade) või /K/<kood> (töökoht).
// Funktsioon läheb lehele .toString() abil, seega sama kood töötab brauseris ja testides.
export function koodTekstist(t, host) {
  t = String(t || '').trim();
  const m = /^https?:\/\/([^/?#\s]+)\/([SKI])\/([0-9A-Z]{12})\/?$/i.exec(t);
  if (!m || m[1].toLowerCase() !== String(host || '').toLowerCase()) return null;
  return { liik: m[2].toUpperCase(), kood: m[3].toUpperCase() };
}
export function kasitsiKood(v) {
  const k = String(v || '').trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[\s-]/g, '');
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(k) ? k : null;
}
const ABI = `const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const aeg=t=>t?new Date(t).toLocaleString('et-EE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const paevi=t=>Math.floor((Date.now()-t)/86400000);
const NONCE=document.currentScript.nonce;
// Joonikoonid (24×24, joon 1,7; sama stiil mis K | KODU alumisel menüül)
const IKD={minu:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".6" fill="currentColor"/><circle cx="3.5" cy="12" r=".6" fill="currentColor"/><circle cx="3.5" cy="18" r=".6" fill="currentColor"/>',
 vota:'<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 tagasta:'<path d="M12 14V3M7.5 7.5 12 3l4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 otsi:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 skann:'<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10"/>',
 ladu:'<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M7 20v-6h10v6M7 17h10"/>',
 kalender:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 mootja:'<path d="M3 16.5 16.5 3 21 7.5 7.5 21 3 16.5Z"/><path d="m7 12.5 2 2M10 9.5l2 2M13 6.5l2 2"/>',
 kaamera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
 hoiatus:'<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17v.5"/>',
 keeld:'<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
 ok:'<circle cx="12" cy="12" r="8.5"/><path d="m8 12.5 2.8 2.8L16 10"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>',
 lukk:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
 telefon:'<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/>',
 kell:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>'};
const ik=n=>'<span class="ikoon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+IKD[n]+'</svg></span>';
function laeSkript(src){return new Promise((ok,ei)=>{const s=document.createElement('script');s.src=src;s.nonce=NONCE;s.onload=ok;s.onerror=ei;document.head.appendChild(s);});}`;

// QR-lugeja (kaamera + BarcodeDetector või jsQR), ühine rakendusele ja haldusele (eeltrükitud kleebise skännimine seadme lisamisel)
const SKANNER_JS = `let voog=null, toimib=false, det=null, kv=0;
// kv = kaamera käivituse number: peata() ja uus käivitus muudavad selle, hilinenud getUserMedia voog suletakse kohe
function peata(){kv++;toimib=false;if(voog){voog.getTracks().forEach(t=>t.stop());voog=null;}}
async function kaamera(video,onTekst,teade){
  peata(); const minu=kv;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){teade('Kaamera ei ole selles brauseris saadaval. Sisesta kood käsitsi (seadme sildil).');return;}
  let v;try{v=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});}
  catch(e){if(minu!==kv)return;teade('Kaamera luba puudub. Luba kaamera brauseri seadetes või sisesta kood käsitsi.');return;}
  if(minu!==kv){v.getTracks().forEach(t=>t.stop());return;}
  voog=v; video.srcObject=voog; video.setAttribute('playsinline',''); try{await video.play();}catch(e){}
  if(!det&&'BarcodeDetector' in window){try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes('qr_code'))det=new BarcodeDetector({formats:['qr_code']});}catch(e){}}
  if(!det&&!window.jsQR){try{await laeSkript('/jsqr.js');}catch(e){teade('QR-lugeja laadimine ebaõnnestus. Sisesta kood käsitsi.');return;}}
  if(minu!==kv)return; toimib=true; const c=document.createElement('canvas'), cx=c.getContext('2d',{willReadFrequently:true});
  let viimane='',viimaneAeg=0;
  const samm=async()=>{ if(!toimib) return;
    try{ let t=null;
      if(video.readyState>=2&&video.videoWidth){
        if(det){const r=await det.detect(video); if(r&&r[0]) t=r[0].rawValue;}
        else{const w=video.videoWidth,h=video.videoHeight,k=Math.min(1,720/Math.max(w,h));c.width=w*k|0;c.height=h*k|0;cx.drawImage(video,0,0,c.width,c.height);
          const d=cx.getImageData(0,0,c.width,c.height);const r=window.jsQR(d.data,c.width,c.height,{inversionAttempts:'dontInvert'});if(r)t=r.data;}
      }
      if(t&&(t!==viimane||Date.now()-viimaneAeg>3000)){viimane=t;viimaneAeg=Date.now();onTekst(t);}
    }catch(e){}
    if(toimib) setTimeout(samm,det?150:220);
  }; samm();
}
`;

// Kujundus: Kindaveli B (sama mis K | KODU, margo875/qrkodu avalik/app.css „Kujundus B“, Margo 03.11.2026; Krativarale üle võetud 10.11.2026).
// Paber #FAF9F6, tekst/põhinupp #1C1C1A, aktsent #A33B20, raadius 8 px, pealkirjad Newsreader, tekst Instrument Sans. Tume teema süsteemi järgi.
const TUME = `--tume:#F1ECE6;--hele:#1C1916;--kast:#26221E;--joon:#3D3731;--nork:#A99F94;--pind:#2E2924;--valjaraam:#8A8F8B;--aktsent:#E8836A;
  --rohe:#6FBF95;--puna:#E0786D;--lahene:#E8B565;--ok-hele:#1F3328;--lahene-hele:#3A2C17;--puna-hele:#3A1F1C;`;
const STIIL = `@font-face{font-family:'Instrument Sans';font-weight:400 700;font-display:swap;src:url(/fondid/instrument-sans-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Instrument Sans';font-weight:400 700;font-display:swap;src:url(/fondid/instrument-sans-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Newsreader';font-weight:500;font-display:swap;src:url(/fondid/newsreader-500-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Newsreader';font-weight:500;font-display:swap;src:url(/fondid/newsreader-500-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
:root{--tume:#1C1C1A;--hele:#FAF9F6;--kast:#FFFFFF;--joon:#D9D6CF;--nork:#5E5B55;--pind:#F0EEE9;--valjaraam:#7C807D;--aktsent:#A33B20;
  --rohe:#2F6B4F;--puna:#B3261E;--lahene:#8A5300;--ok-hele:#E3EFE8;--lahene-hele:#F6E7D2;--puna-hele:#F7E3E0;--raadius:8px;
  --seriif:'Newsreader',Georgia,'Times New Roman',serif;--sans:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root{${TUME}color-scheme:dark}}
*{box-sizing:border-box}body{font:16px/1.5 var(--sans);margin:0;background:var(--hele);color:var(--tume)}
main{max-width:640px;margin:0 auto;padding:16px 16px 32px}
h1,h2{font-family:var(--seriif);font-weight:500;letter-spacing:-.01em}h1{font-size:30px;line-height:1.15;margin:8px 0 6px}h2{font-size:21px;margin:26px 0 10px}
.riba{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;background:var(--hele);border-bottom:1px solid var(--joon)}
.riba .nimi{display:flex;align-items:baseline;gap:10px;flex:1;font:700 21px/1 var(--sans);letter-spacing:-.02em;color:var(--tume);text-decoration:none}
.riba .mark::before{content:'K';color:var(--aktsent)}
.riba .alam{font:500 22px/1 var(--seriif);color:var(--aktsent);padding-left:10px;border-left:1px solid var(--joon);letter-spacing:0}
.riba .roll{max-width:45%;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--nork);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.alapealkiri{color:var(--nork);margin:0 0 16px}
.kaart{background:var(--kast);border:1px solid var(--joon);border-radius:var(--raadius);padding:14px 16px;margin:10px 0}
.kaart>h2:first-child{margin-top:0}
button,.nupp{font:600 16px/1.25 var(--sans);min-height:48px;border:1px solid var(--valjaraam);border-radius:var(--raadius);padding:12px 18px;cursor:pointer;
  background:var(--kast);color:var(--tume);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center}
button.suur,.nupp.suur{display:flex;width:100%;font-size:18px;min-height:60px;padding:16px;margin:10px 0}
.roh,.sin{background:var(--tume);color:var(--hele);border-color:var(--tume)}
.sin{background:var(--kast);color:var(--tume);border:2px solid var(--tume)}
.pun{background:var(--puna);color:#fff;border-color:var(--puna)}.kol{background:var(--lahene-hele);color:var(--lahene);border-color:var(--lahene)}
button:disabled{opacity:.45;cursor:default}
input,select,textarea{font:inherit;width:100%;min-height:48px;padding:11px 12px;border:1px solid var(--valjaraam);border-radius:var(--raadius);margin:4px 0 10px;background:var(--kast);color:var(--tume)}
input[type=file]{min-height:0;padding:10px}input[type=checkbox],input[type=radio]{accent-color:var(--tume);width:20px;height:20px;min-height:0}
input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--tume);outline-offset:2px}
label{display:block;font-size:14px;color:var(--nork);margin-top:4px}.vaike{font-size:14px;color:var(--nork)}
a{color:var(--tume);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;font-weight:600}a.nupp{text-decoration:none}
.viga,.hoiatus,.ok,.teave{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--raadius);margin:8px 0;font-weight:500}
.viga{background:var(--puna-hele);color:var(--puna)}.hoiatus{background:var(--lahene-hele);color:var(--lahene)}.ok{background:var(--ok-hele);color:var(--rohe)}.teave{background:var(--pind);color:var(--nork)}
.viga b,.hoiatus b,.ok b{color:inherit}.viga a,.hoiatus a,.ok a{color:inherit}
.kaart.hoiatus{display:block;background:var(--kast);color:var(--tume);border-left:4px solid var(--lahene)}
ul.loend{list-style:none;padding:0;margin:0}
ul.loend li{background:var(--kast);border:1px solid var(--joon);border-radius:var(--raadius);padding:12px 14px;margin:8px 0}
ul.loend li[data-kood]{position:relative;padding-right:36px;cursor:pointer}ul.loend li[data-kood]::after{content:'›';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:26px;color:var(--nork)}
.kaart ul.loend li{background:var(--hele)}
.inv{font-size:13px;letter-spacing:.02em;color:var(--nork);font-weight:400}
video{width:100%;max-height:45vh;background:#000;border-radius:var(--raadius);object-fit:cover}
.rida{display:flex;gap:8px;align-items:center}.rida>*{flex:1;min-width:0}.rida>button{flex:0 0 auto}
.tabs{display:flex;gap:8px;margin:10px 0}.tabs button{flex:1;font-weight:500}.tabs .val{background:var(--tume);color:var(--hele);border-color:var(--tume);font-weight:700}
.mark{display:flex;gap:10px;align-items:flex-start;margin:8px 0;color:var(--tume);font-size:15px}.mark input{flex:none;margin:2px 0 0}
details{margin:8px 0}summary{cursor:pointer;font-weight:600;padding:8px 0;min-height:40px}
.ikoon{display:inline-flex;flex:none}.ikoon svg{width:22px;height:22px;display:block}.suur .ikoon svg{width:26px;height:26px}
.viga .ikoon svg,.hoiatus .ikoon svg,.ok .ikoon svg,.teave .ikoon svg{width:20px;height:20px;margin-top:1px}
.olekuplokk{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:var(--raadius);margin:12px 0;color:#fff;background:var(--tume)}
.olekuplokk strong{display:flex;align-items:center;gap:8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.olekuplokk.vaba{background:#2F6B4F}.olekuplokk.minu{background:var(--tume);color:var(--hele)}.olekuplokk.minu a{color:inherit}.olekuplokk.teise{background:#8A5300}.olekuplokk.ei{background:#B3261E}
.olekuplokk span{font-size:15px}.olekuplokk a{color:#fff}
dl.andmed{margin:6px 0 4px;padding:0}dl.andmed>div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--joon)}
dl.andmed>div:last-child{border-bottom:0}dl.andmed dt{color:var(--nork)}dl.andmed dd{margin:0;font-weight:600;text-align:right;overflow-wrap:anywhere}
.silt{display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--pind);color:var(--nork);border:1px solid var(--joon);vertical-align:2px}
.menyy{position:fixed;left:0;right:0;bottom:0;z-index:6;display:grid;grid-template-columns:repeat(4,1fr);background:var(--hele);border-top:1px solid var(--joon);padding:0 8px env(safe-area-inset-bottom)}
.menyy button{position:relative;flex-direction:column;gap:3px;min-height:60px;padding:10px 0 9px;border:0;border-radius:0;background:none;color:var(--nork);font:500 13px/1.1 var(--sans)}
.menyy button[aria-current=page]{color:var(--tume);font-weight:700}
.menyy button[aria-current=page]::before{content:'';position:absolute;top:-1px;left:50%;width:44px;height:3px;margin-left:-22px;background:var(--tume);border-radius:0 0 2px 2px}
.menyy .ikoon svg{width:24px;height:24px}.menyy button:focus-visible{outline-offset:-4px}
body.menyyga main{padding-bottom:calc(96px + env(safe-area-inset-bottom))}body.menyyga #jalus{padding-bottom:calc(84px + env(safe-area-inset-bottom))}body.menyyga #uusver{bottom:calc(61px + env(safe-area-inset-bottom))}
#uusver{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--tume);color:var(--hele);padding:10px 16px;text-align:center}
#uusver button{margin-left:8px;min-height:36px;padding:6px 12px;background:var(--hele);color:var(--tume);border-color:var(--hele)}
#jalus{color:var(--nork);font-size:13px;text-align:center;padding:16px 16px 60px}#jalus button{min-height:32px;padding:4px 10px;font-size:13px}
.lahter{position:relative}.lahter textarea{display:block;padding-bottom:26px}.lahter input{display:block;padding-right:64px}
.lk{position:absolute;right:12px;bottom:18px;font-size:12px;line-height:1;color:var(--nork);pointer-events:none}.lk.pk{color:var(--puna)}.lahter.in .lk{bottom:auto;top:50%;transform:translateY(-50%)}
.tapp{display:inline-block;min-width:1.3em;padding:0 .35em;border-radius:1em;background:var(--aktsent);color:#fff;font-size:12px;line-height:1.3em;text-align:center;font-weight:700}
.keskel{text-align:center}[hidden]{display:none!important}input[type=search]::-webkit-search-cancel-button{filter:grayscale(1)}
@media (max-width:700px){table{display:block;overflow-x:auto}}`;

// Päis „K | Krativara“ (Margo 10.11.2026; sama nimi on PWA-l), paremal töökoht või firma
const RIBA = `<header class="riba"><a href="/" class="nimi" aria-label="K | Krativara, avalehele"><span class="mark"></span><span class="alam">Krativara</span></a><span id="roll" class="roll"></span></header>`;

// Kõigil lehtedel: tehniline vealogi (ainult arendajale, /dev), „uus versioon“ riba, jalus versiooniga ja avakuvale lisamine.
// Vealogisse ei saadeta kasutaja andmeid: ainult veateade, fail/rida, lehe tee (ilma päringuta), versioon, brauser.
function lisaJs(nonce, ver) {
  return `<script nonce="${nonce}">
(function(){
const VER=${JSON.stringify(ver || { v: '', id: '' })};
const e2=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let n=0;
function saada(o){if(++n>10)return;try{fetch('/api/viga',{method:'POST',headers:{'Content-Type':'application/json','X-QW':'1'},credentials:'same-origin',keepalive:true,
  body:JSON.stringify(Object.assign(o,{leht:location.pathname,v:VER.v,id:VER.id,ua:navigator.userAgent}))}).catch(function(){});}catch(e){}}
window.addEventListener('error',function(e){saada({liik:'klient',teade:String(e.message||'viga'),fail:String(e.filename||''),rida:e.lineno||0,veerg:e.colno||0,stack:String(e.error&&e.error.stack||'')});});
window.addEventListener('unhandledrejection',function(e){const r=e.reason;saada({liik:'klient',teade:'Promise: '+String(r&&r.message||r),stack:String(r&&r.stack||'')});});
let rb=false;
function riba(){if(rb)return;rb=true;const d=document.createElement('div');d.id='uusver';d.innerHTML='Uus versioon on saadaval. <button id="uv_b">Värskenda</button>';document.body.appendChild(d);document.getElementById('uv_b').onclick=function(){location.reload();};}
async function kontrolli(){try{const r=await fetch('/api/versioon',{cache:'no-store'});const j=await r.json();if(j.v!==VER.v||(j.id&&VER.id&&j.id!==VER.id))riba();}catch(e){}}
setInterval(kontrolli,5*60*1000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')kontrolli();});
let ip=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();ip=e;jalus();});
function jalus(){let f=document.getElementById('jalus');if(!f){f=document.createElement('footer');f.id='jalus';document.body.appendChild(f);}
  const app=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
  f.innerHTML='Krativara v'+e2(VER.v)+(VER.id?' ('+e2(VER.id)+')':'')+(app?'':ip?' · <button id="lisa_av">Lisa avakuvale</button>':ios?' · Avakuvale: Jaga → Lisa avakuvale':'');
  const b=document.getElementById('lisa_av');if(b)b.onclick=async function(){ip.prompt();try{await ip.userChoice;}catch(e){}ip=null;jalus();};}
jalus();
})();
</script>`;
}

export function appLeht(nonce, { seade = '', koht = '', info = '', hooldus = '', ver } = {}) {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>K | Krativara</title><meta name="apple-mobile-web-app-title" content="K | VARA"><meta name="application-name" content="K | Krativara"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#FAF9F6" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#1C1916" media="(prefers-color-scheme: dark)"><link rel="preload" href="/fondid/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="apple-touch-icon" href="/apple-touch-icon.png"><style>${STIIL}</style></head>
<body>${RIBA}<main id="sisu"><p class="vaike">Laen…</p></main><nav class="menyy" id="menyy" aria-label="Põhimenüü" hidden></nav>
<script nonce="${nonce}">
${ABI}
${koodTekstist.toString()}
${kasitsiKood.toString()}
${EXIF_JS}
const URL_SEADE=${JSON.stringify(seade)}, URL_KOHT=${JSON.stringify(koht)}, URL_INFO=${JSON.stringify(info)}, URL_HOOLDUS=${JSON.stringify(hooldus)};
let S={firma:'',koht:null,mina:null};
const LS={get(k){try{return localStorage.getItem(k)||''}catch(e){return ''}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
async function api(tee,keha){
  try{const r=await fetch(tee,{method:'POST',headers:{'Content-Type':'application/json','X-QW':'1'},body:JSON.stringify(keha||{}),credentials:'same-origin'});
    let j={};try{j=await r.json()}catch(e){}j.status=r.status;if(r.status===401&&tee!=='/api/logi-sisse'&&tee!=='/api/parool'){S.mina=null;}return j;}
  catch(e){return {ok:false,viga:'Võrguühendus puudub. Proovi uuesti.'}}
}
// sisu(h, k): k = alumise menüü aktiivne punkt ('minu','vota','tagasta','otsi'), '' = menüü ilma aktiivseta, puudub = menüüta (sisselogimata, leidja)
const sisu=(h,k)=>{peata();$('#sisu').innerHTML=h;window.scrollTo(0,0);menyy(k);const r=$('#roll');if(r)r.textContent=S.koht?S.koht.nimi:(S.firma||'');};
const MENYY=[['minu','Minu',()=>pohi()],['vota','Võta',()=>skanner('vota')],['tagasta','Tagasta',()=>skanner('tagasta')],['otsi','Otsi',()=>otsing()]];
function menyy(k){const n=$('#menyy');if(!n)return;const m=S.mina,nahtav=!!m&&typeof k==='string';n.hidden=!nahtav;document.body.classList.toggle('menyyga',nahtav);if(!nahtav)return;
  const ootel=m.kasutaja.olek==='ootel',keeld=ootel||(m.kinnitamata||[]).length>0;
  n.innerHTML=MENYY.map(([v,silt])=>'<button type="button" data-m="'+v+'"'+(v===k?' aria-current="page"':'')+((v==='vota'&&keeld)||((v==='tagasta'||v==='otsi')&&ootel)?' disabled':'')+'>'+ik(v)+'<span>'+silt+'</span></button>').join('');
  n.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{history.replaceState(null,'','/');MENYY.find(x=>x[0]===b.dataset.m)[2]();});}
const pea=()=>'<h1>'+esc(S.firma||'Krativara')+'</h1>';

// ---------- algus ----------
(async function(){
  if(URL_HOOLDUS){history.replaceState(null,'','/');const r=await api('/api/hooldus/link',{token:URL_HOOLDUS});
    if(!r.ok){sisu('<h1>Hoolduse töökäsk</h1><div class="viga">'+ik('keeld')+'<span>'+esc(r.viga||'Link ei kehti.')+'</span></div><p class="vaike">Küsi seadme omanikult uus link või skänni seadme kleebist ja sisesta PIN.</p>');return;}
    return hooldajaVaade();}
  if(URL_KOHT) LS.set('qw_koht',URL_KOHT);
  const j=await api('/api/alusta',{koht:URL_KOHT||LS.get('qw_koht')});
  S.firma=j.firma||'';S.koht=j.koht||null;S.mina=j.mina||null;
  if(URL_KOHT&&!S.koht){sisu(pea()+'<div class="viga">Tundmatu töökoha QR-kood. Pöördu administraatori poole.</div>');return;}
  if(URL_SEADE){ if(S.mina) return seadmeVaade(URL_SEADE,true); return leidjaVaade(URL_SEADE); }
  if(URL_INFO){ if(S.mina) return seadmeVaade(URL_INFO,false); S.info=URL_INFO; return sisene(); }
  if(URL_KOHT) history.replaceState(null,'','/');
  S.mina?pohi():sisene();
})();

// ---------- sisselogimine ja registreerumine ----------
function sisene(pealeSeade,algus){
  const reg=!!S.koht, tab=algus||(reg&&!LS.get('qw_tel')?'reg':'sisse');
  sisu(pea()+(S.koht?'<p class="vaike">Töökoht: <b>'+esc(S.koht.nimi)+'</b></p>':'')+
   (reg?'<div class="tabs"><button id="t1" class="'+(tab==='sisse'?'val':'')+'">Logi sisse</button><button id="t2" class="'+(tab==='reg'?'val':'')+'">Uus kasutaja</button></div>':'<h2>Logi sisse</h2>')+
   '<div class="kaart">'+(tab==='reg'?
     '<label>Ees- ja perekonnanimi</label><input id="nimi" autocomplete="name" value="'+esc(LS.get('qw_nimi'))+'">'+
     '<label>Telefon</label><input id="tel" type="tel" autocomplete="tel" inputmode="tel" value="'+esc(LS.get('qw_tel'))+'" placeholder="5123 4567">'+
     '<label>Vali parool (vähemalt 6 märki)</label><input id="par" type="password" autocomplete="new-password">'+
     '<p class="vaike">Sinu nimi ja telefon on nähtavad kolleegidele ja administraatorile, kui seade on sinu nimel (et seadet leida).</p>'+
     '<button class="suur roh" id="saada">Registreeru</button>'
   :'<label>Telefon</label><input id="tel" type="tel" autocomplete="username" inputmode="tel" value="'+esc(LS.get('qw_tel'))+'" placeholder="5123 4567">'+
     '<label>Parool</label><input id="par" type="password" autocomplete="current-password">'+
     '<button class="suur sin" id="saada">Logi sisse</button><p><a href="#" id="unustasin">Unustasid parooli?</a></p>'+
     (reg?'':'<p class="vaike">Uue kasutaja loomiseks skänni töökoha QR-kood.</p>'))+
   '<div id="teade"></div></div>');
  if($('#t1'))$('#t1').onclick=()=>sisene(pealeSeade,'sisse'); if($('#t2'))$('#t2').onclick=()=>sisene(pealeSeade,'reg');
  if($('#unustasin'))$('#unustasin').onclick=e=>{e.preventDefault();taastus(pealeSeade)};
  $('#saada').onclick=async()=>{
    const tel=$('#tel').value, parool=$('#par').value; $('#saada').disabled=true;
    const j=tab==='reg'?await api('/api/registreeru',{nimi:$('#nimi').value,tel,parool,koht:S.koht&&S.koht.kood}):await api('/api/logi-sisse',{tel,parool});
    $('#saada').disabled=false;
    if(!j.ok){$('#teade').innerHTML='<div class="viga">'+esc(j.viga||'Viga')+'</div>';return;}
    LS.set('qw_tel',j.mina.kasutaja.tel); LS.set('qw_nimi',j.mina.kasutaja.nimi); S.mina=j.mina;
    pealeSeade?seadmeVaade(pealeSeade,true):S.info?seadmeVaade(S.info,false):pohi();
  };
}
function taastus(pealeSeade){
  sisu(pea()+'<h2>Parooli taastamine</h2><div class="kaart"><p class="vaike">Küsi administraatorilt taastuskood (kehtib 24 h).</p>'+
   '<label>Telefon</label><input id="tel" type="tel" autocomplete="username" value="'+esc(LS.get('qw_tel'))+'">'+
   '<label>Taastuskood</label><input id="kood" autocomplete="one-time-code" autocapitalize="characters">'+
   '<label>Uus parool</label><input id="par" type="password" autocomplete="new-password">'+
   '<button class="suur sin" id="saada">Salvesta ja logi sisse</button><button id="tagasi">Tagasi</button><div id="teade"></div></div>');
  $('#tagasi').onclick=()=>sisene(pealeSeade,'sisse');
  $('#saada').onclick=async()=>{const j=await api('/api/parool',{tel:$('#tel').value,kood:$('#kood').value,parool:$('#par').value});
    if(!j.ok){$('#teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} S.mina=j.mina; pealeSeade?seadmeVaade(pealeSeade,true):pohi();};
}

// ---------- põhivaade ----------
function kinnitusHTML(x){
  const mis=x.liik==='ulevott'?'võttis selle üle':'märkis selle tagastatuks';
  return '<div class="kaart hoiatus" data-id="'+esc(x.id)+'"><b>'+esc(x.seadme_nimi)+'</b> oli sinu nimel (alates '+esc(aeg(x.alates))+'). '+
   esc(x.uus&&x.uus.nimi)+(x.uus&&x.uus.tel?' (<a href="tel:'+esc(x.uus.tel)+'">'+esc(x.uus.tel)+'</a>)':'')+' '+mis+' '+esc(aeg(x.aeg))+
   ', sest tagastust polnud registreeritud.<br><b>Kas tagastasid seadme või andsid selle üle?</b>'+
   '<div class="rida" style="margin-top:8px"><button class="roh k-jah">Jah, tagastasin / andsin üle</button><button class="k-ei">Ei, vaidlustan</button></div>'+
   '<div class="k-vorm" hidden><label>Mis juhtus? (läheb administraatorile)</label><textarea rows="3" maxlength="500"></textarea><button class="pun k-saada">Saada vaidlustus</button></div></div>';
}
function pohi(teade){
  const m=S.mina; if(!m) return sisene();
  const ootel=m.kasutaja.olek==='ootel';
  sisu('<h1>Tere, '+esc(m.kasutaja.nimi.split(' ')[0])+'</h1><p class="alapealkiri">'+esc(S.firma||'Krativara')+(S.koht?' · '+esc(S.koht.nimi):'')+'</p>'+(teade||'')+
   (ootel?'<div class="hoiatus">'+ik('kell')+'<span>Sinu konto ootab administraatori kinnitust. Seadmeid saad võtta pärast kinnitamist.</span></div>':'')+
   (m.kinnitamata.length?'<h2>Vajab sinu vastust</h2><p class="vaike">Enne uue seadme võtmist vasta allolevale.</p>'+m.kinnitamata.map(kinnitusHTML).join(''):'')+
   '<button class="suur roh" id="vota"'+(ootel||m.kinnitamata.length?' disabled':'')+'>'+ik('vota')+'Võta seade</button>'+
   '<button class="suur sin" id="tagasta"'+(ootel?' disabled':'')+'>'+ik('tagasta')+'Tagasta seade</button>'+
   '<h2>Minu seadmed <span class="vaike">'+m.seadmed.length+' / '+m.max_seadmeid+'</span></h2>'+
   (m.seadmed.length?'<ul class="loend">'+m.seadmed.map(s=>'<li data-kood="'+esc(s.kood)+'"><b>'+esc(s.nimi)+'</b><br>'+(s.invnr?'<span class="inv">'+esc(s.invnr)+'</span> · ':'')+'<span class="vaike">alates '+esc(aeg(s.alates))+(paevi(s.alates)>0?' ('+paevi(s.alates)+' p)':'')+'</span>'+(s.bron?'<div class="hoiatus">'+ik('kalender')+'Broneeritud: '+esc(s.bron.nimi)+' '+esc(s.bron.algus)+' – '+esc(s.bron.lopp)+'. Tagasta õigeks ajaks.</div>':'')+'</li>').join('')+'</ul>':'<div class="teave">'+ik('info')+'<span>Sinu nimel ei ole praegu ühtegi seadet.</span></div>')+
   ((m.broneeringud||[]).length?'<h2>Minu broneeringud</h2><ul class="loend">'+m.broneeringud.map(b=>'<li class="bron" data-kood="'+esc(b.kood)+'"><div class="rida"><span><b>'+esc(b.nimi)+'</b> <span class="inv">'+esc(b.invnr)+'</span><br><span class="vaike">'+esc(b.algus)+' – '+esc(b.lopp)+'</span></span><button data-btyh="'+esc(b.id)+'" data-bkood="'+esc(b.kood)+'">Tühista</button></div></li>').join('')+'</ul>':'')+
   (ootel?'':'<button class="suur" id="otsi">'+ik('otsi')+'Kus on seade?</button>')+(m.kasutaja.super?'<button class="suur" id="laod">'+ik('ladu')+'Laod ja seis</button>':'')+'<p class="vaike keskel"><a href="#" id="valja">Logi välja</a></p>','minu');
  $('#vota').onclick=()=>skanner('vota'); $('#tagasta').onclick=()=>skanner('tagasta'); if($('#otsi'))$('#otsi').onclick=otsing; if($('#laod'))$('#laod').onclick=laod;
  $('#valja').onclick=async e=>{e.preventDefault();await api('/api/logi-valja');S.mina=null;sisene();};
  document.querySelectorAll('ul.loend li').forEach(li=>li.onclick=e=>{if(e.target.tagName!=='BUTTON')seadmeVaade(li.dataset.kood,false);});
  document.querySelectorAll('[data-btyh]').forEach(b=>b.onclick=async()=>{if(!confirm('Tühistada broneering?'))return;const j=await api('/api/bron-tyhista',{kood:b.dataset.bkood,id:b.dataset.btyh});if(j.ok){S.mina=j.mina;pohi('<div class="ok">Broneering tühistatud.</div>');}else alert(j.viga);});
  document.querySelectorAll('[data-id]').forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('.k-jah').onclick=async()=>{const j=await api('/api/kinnita',{id,vastus:'jah'}); if(j.ok){S.mina=j.mina;pohi();} else alert(j.viga);};
    el.querySelector('.k-ei').onclick=()=>{el.querySelector('.k-vorm').hidden=false;};
    el.querySelector('.k-saada').onclick=async()=>{const j=await api('/api/kinnita',{id,vastus:'vaidlus',tekst:el.querySelector('textarea').value}); if(j.ok){S.mina=j.mina;pohi('<div class="ok">Vaidlustus saadeti administraatorile.</div>');} else alert(j.viga);};
  });
}

// ---------- foto (valikuline; vähendatakse brauseris ≤ 1600 px JPEG, EXIF kaob) ----------
const SILDID={vott:'võttis',tagastus:'tagastas',ulevott:'võttis üle',tagastus_teise_eest:'märkis tagastatuks teise eest',tagastus_halduri_poolt:'haldur registreeris tagastuse',marge:'märkus',kinnitas:'kinnitas ülevõtu',vaidlus:'vaidlustas ülevõtu'};
function fotoHTML(id,silt){const r=S.mina&&S.mina.foto; if(!r||r==='ei') return '';
  return '<label for="'+id+'">'+esc(silt)+(r==='kohustuslik'?' (kohustuslik)':' (valikuline)')+'</label><input type="file" accept="image/*" capture="environment" id="'+id+'"><div id="'+id+'_t"></div>';}
function fotoValmis(id){const r=S.mina&&S.mina.foto; return !(r==='kohustuslik'&&!(window.FOTO&&window.FOTO[id]));}
async function vahenda(fail){const url=URL.createObjectURL(fail);try{const img=await new Promise((ok,ei)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ei;i.src=url;});
  const k=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=img.naturalWidth*k|0;c.height=img.naturalHeight*k|0;c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.75));}finally{URL.revokeObjectURL(url);}}
function fotoSeo(id,muutus){const el=$('#'+id); if(!el) return; window.FOTO=window.FOTO||{}; window.FOTO[id]=null;
  el.onchange=async()=>{const t=$('#'+id+'_t'); window.FOTO[id]=null; if(muutus)muutus(); if(!el.files[0]) return; t.innerHTML='<div class="vaike">Laen üles…</div>';
    try{const b=await vahenda(el.files[0]); const r=await fetch('/api/foto',{method:'POST',headers:{'Content-Type':'image/jpeg','X-QW':'1'},body:b,credentials:'same-origin'}); const j=await r.json();
      if(!j.ok) throw new Error(j.viga); window.FOTO[id]=j.foto; t.innerHTML='<div class="ok">Foto lisatud ✓</div>';}
    catch(e){t.innerHTML='<div class="viga">Foto üleslaadimine ebaõnnestus'+(e&&e.message?': '+esc(e.message):'')+'</div>';}
    if(muutus)muutus();};}
const fotoVoti=id=>(window.FOTO&&window.FOTO[id])||undefined;
function ajaluguHTML(a){return a&&a.length?'<h2>Ajalugu</h2><ul class="loend">'+a.map(x=>'<li><span class="vaike">'+esc(aeg(x.aeg))+'</span><br><b>'+esc(x.nimi)+'</b> '+esc(SILDID[x.tyyp]||x.tyyp)+
  (x.eelmise_nimi?' ('+esc(x.tyyp==='kinnitas'||x.tyyp==='vaidlus'?'uus: ':'eelmine: ')+esc(x.eelmise_nimi)+')':'')+(x.foto?' <span class="silt">foto</span>':'')+'</li>').join('')+'</ul>':'';}

// ---------- skanner ----------
${SKANNER_JS}
function skanner(reziim){
  const vota=reziim==='vota'; const valik=[];
  sisu('<h1>'+(vota?'Võta seade':'Tagasta seade')+'</h1><p class="alapealkiri">Suuna kaamera seadmel olevale QR-koodile. Võid skännida mitu seadet järjest.</p>'+
   '<video id="vid" muted playsinline></video><div id="teade"></div><ul class="loend" id="valik"></ul>'+
   '<div class="rida"><input id="kasitsi" placeholder="Kood käsitsi (12 märki sildilt)" autocapitalize="characters"><button id="lisa">Lisa</button></div>'+
   fotoHTML('foto_s',vota?'Foto seadmest võtmisel':'Foto seadmest tagastamisel')+
   '<button class="suur '+(vota?'roh':'sin')+'" id="kinnita" disabled>'+(vota?'Võta':'Tagasta')+'</button><button class="suur" id="katkesta">Katkesta</button>',reziim);
  const teade=(t,liik)=>{$('#teade').innerHTML=t?'<div class="'+(liik||'viga')+'">'+esc(t)+'</div>':'';};
  const tegevus=x=>{ if(!x.info) return false;
    if(vota) return x.info.vota.lubatud&&(!x.info.vota.vaja_ule||x.ule);
    if(x.info.minu) return true; return !!(x.info.seade.kellel&&x.teise);};
  const joonista=()=>{
    $('#valik').innerHTML=valik.map((x,i)=>{
      const s=x.info.seade,v=x.info.vota,kel=s.kellel; let h='<li><div class="rida"><b>'+esc(s.nimi)+'</b><button data-eemalda="'+i+'" aria-label="Eemalda" style="min-height:40px;padding:6px 10px">'+ik('x')+'</button></div>'+(s.invnr?'<span class="inv">'+esc(s.invnr)+'</span>':'');
      h+=s.hoiatused.map(t=>'<div class="hoiatus">'+ik('hoiatus')+'<span>'+esc(t)+'</span></div>').join('');
      if(vota){
        if(!v.lubatud) h+='<div class="viga">'+ik('keeld')+'<span>'+esc(v.pohjus)+'</span></div>';
        else if(v.vaja_ule) h+='<div class="hoiatus">Seade on registreeritud: <b>'+esc(kel.nimi)+'</b> '+(kel.tel?'(<a href="tel:'+esc(kel.tel)+'">'+esc(kel.tel)+'</a>)':'')+' alates '+esc(aeg(kel.alates))+'.</div>'+
          '<label class="mark"><input type="checkbox" data-ule="'+i+'"'+(x.ule?' checked':'')+'><span>Võtan seadme üle. '+esc(kel.nimi)+' peab kinnitama, et tagastas või andis seadme üle, enne kui saab ise uusi seadmeid võtta.</span></label>';
        else h+='<div class="ok">'+ik('ok')+'Valmis võtma</div>';
      } else {
        if(x.info.minu) h+='<div class="ok">'+ik('ok')+'Tagastan</div>';
        else if(kel) h+='<div class="hoiatus">See seade on registreeritud: <b>'+esc(kel.nimi)+'</b> alates '+esc(aeg(kel.alates))+', mitte sinu nimel.</div>'+
          '<label class="mark"><input type="checkbox" data-teise="'+i+'"'+(x.teise?' checked':'')+'><span>Seade on siin tagasi, märgin selle tagastatuks '+esc(kel.nimi)+' eest. Tema peab seda hiljem kinnitama.</span></label>';
        else h+='<div class="teave">'+ik('info')+'<span>Seade ei ole kellegi nimel (juba tagastatud).</span></div>';
      }
      return h+'</li>';}).join('');
    const n=valik.filter(tegevus).length; $('#kinnita').disabled=!n||!fotoValmis('foto_s'); $('#kinnita').textContent=(vota?'Võta':'Tagasta')+(n?' ('+n+')':'');
    document.querySelectorAll('[data-eemalda]').forEach(b=>b.onclick=()=>{valik.splice(+b.dataset.eemalda,1);joonista();});
    document.querySelectorAll('[data-ule]').forEach(b=>b.onchange=()=>{valik[+b.dataset.ule].ule=b.checked;joonista();});
    document.querySelectorAll('[data-teise]').forEach(b=>b.onchange=()=>{valik[+b.dataset.teise].teise=b.checked;joonista();});
  };
  const lisa=async kood=>{
    if(valik.some(x=>x.kood===kood)){teade('See seade on juba nimekirjas.','hoiatus');return;}
    const j=await api('/api/seade',{kood});
    if(j.status===401) return sisene();
    if(!j.ok){teade(j.status===404?'Tundmatu QR-kood. Pöördu administraatori poole.':(j.viga||'Viga'));if(navigator.vibrate)navigator.vibrate([200,100,200]);return;}
    if(navigator.vibrate)navigator.vibrate(80);
    valik.push({kood,info:j,ule:false,teise:false}); teade('Lisatud: '+j.seade.nimi,'ok'); joonista();
  };
  const tekstist=t=>{const k=koodTekstist(t,location.host);
    if(!k){teade('Tundmatu QR-kood. Pöördu administraatori poole.');if(navigator.vibrate)navigator.vibrate([200,100,200]);return;}
    if(k.liik==='K'){teade('See on töökoha QR-kood. Skänni seadmel olevat koodi.','hoiatus');return;}
    if(k.liik==='I'){teade('See on kataloogi QR-kood (ainult otsinguks). Skänni seadmel olevat koodi.','hoiatus');return;}
    lisa(k.kood);};
  $('#lisa').onclick=()=>{const k=kasitsiKood($('#kasitsi').value);if(!k){teade('Kood on 12 märki (numbrid ja tähed), vaata seadme sildilt.');return;}$('#kasitsi').value='';lisa(k);};
  $('#katkesta').onclick=()=>pohi();
  $('#kinnita').onclick=async()=>{
    const koodid=valik.filter(tegevus).map(x=>x.kood); $('#kinnita').disabled=true;
    const foto=fotoVoti('foto_s');
    const j=vota?await api('/api/vota',{koodid,ule:valik.filter(x=>x.ule).map(x=>x.kood),koht:S.koht&&S.koht.kood,foto})
               :await api('/api/tagasta',{koodid,teise_eest:valik.filter(x=>x.teise).map(x=>x.kood),koht:S.koht&&S.koht.kood,foto});
    if(j.status===401) return sisene();
    if(!j.ok){teade(j.viga||'Viga');$('#kinnita').disabled=false;return;}
    S.mina=j.mina;
    const okk=j.tulemused.filter(r=>r.ok), vead=j.tulemused.filter(r=>!r.ok);
    pohi((okk.length?'<div class="ok">'+(vota?'Võetud: ':'Tagastatud: ')+okk.map(r=>esc(r.nimi)).join(', ')+'</div>':'')+
      vead.map(r=>'<div class="viga">'+esc(r.nimi||r.kood)+': '+esc(r.viga||(r.vaja_ule?'seade on vahepeal teise nimel, skänni uuesti':(r.teise_nimel?'seade on teise nimel':'ei õnnestunud')))+'</div>').join(''));
  };
  fotoSeo('foto_s',joonista);
  kaamera($('#vid'),tekstist,t=>teade(t,'hoiatus'));
}

// ---------- seadme kaart ----------
async function seadmeVaade(kood,skannitud){
  const j=await api('/api/seade',{kood});
  if(j.status===401) return sisene(kood);
  if(!j.ok){sisu(pea()+'<div class="viga">'+ik('keeld')+'<span>'+(j.status===404?'Tundmatu QR-kood. Pöördu administraatori poole.':esc(j.viga))+'</span></div><button class="suur" id="tagasi">Tagasi</button>',S.mina?'':undefined);$('#tagasi').onclick=()=>pohi();return;}
  const s=j.seade,v=j.vota,kel=s.kellel;
  const OLEKUD={remondis:'remondis/hoolduses',taatlusel:'taatlusel/kalibreerimisel',maha:'maha kantud'};
  const rida=(k,v)=>v?'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>':'';
  // olekuplokk nagu K | KODU eseme vaates: täis värv, ikoon + suurtähed + üks lause
  const olek=s.olek!=='aktiivne'?['ei','keeld','Ei saa võtta',esc(OLEKUD[s.olek]||s.olek)]
    :kel?(j.minu?['minu','ok','Sinu nimel','alates '+esc(aeg(kel.alates))+(kel.koht?' · '+esc(kel.koht):'')]
      :['teise','kell','Kasutuses',esc(kel.nimi)+(kel.tel?' · <a href="tel:'+esc(kel.tel)+'">'+esc(kel.tel)+'</a>':'')+' · alates '+esc(aeg(kel.alates))+(kel.koht?' · '+esc(kel.koht):'')])
    :['vaba','ok','Vaba',s.asukoht?esc(s.asukoht):'laos'];
  let h='<h1>'+esc(s.nimi)+'</h1>'+(s.invnr?'<p class="inv" style="margin:0 0 4px">'+esc(s.invnr)+'</p>':'')+
   '<div class="olekuplokk '+olek[0]+'"><strong>'+ik(olek[1])+olek[2]+'</strong><span>'+olek[3]+'</span></div>'+
   s.hoiatused.map(t=>'<div class="hoiatus">'+ik('hoiatus')+'<span>'+esc(t)+'</span></div>').join('')+
   '<div class="kaart"><dl class="andmed">'+rida('Tüüp',esc(s.tyyp))+rida('Tootja',esc(s.tootja))+rida('Mudel',esc(s.mudel))+rida('Inventarinr',esc(s.invnr))+rida('Seerianr',esc(s.seerianr))+
   (s.hooldused||[]).map(x=>rida('Hooldus: '+esc(x.nimi),'järgmine '+esc(x.jargmine))).join('')+
   (s.taatlus&&s.taatlus.kuni?rida('Taatlus kehtib kuni',esc(s.taatlus.kuni))+rida('Viimane taatlus',s.taatlus.viimati?esc(s.taatlus.viimati)+(s.taatlus.tegija?', '+esc(s.taatlus.tegija):''):'')+rida('Tunnistus',esc(s.taatlus.tunnistus)):'')+
   '</dl>'+(s.lisainfo?'<p class="vaike" style="margin:8px 0 0">'+esc(s.lisainfo)+'</p>':'')+'</div>';
  if(skannitud&&(j.minu||v.lubatud||kel)) h+=fotoHTML('foto_k','Foto seadmest');
  if(skannitud){
    if(j.minu) h+='<button class="suur sin" id="tagasta1">'+ik('tagasta')+'Tagasta</button>';
    else if(v.lubatud&&!v.vaja_ule) h+='<button class="suur roh" id="vota1">'+ik('vota')+'Võta</button>';
    else if(v.lubatud&&v.vaja_ule) h+='<label class="mark"><input type="checkbox" id="ule1"><span>Võtan seadme üle. '+esc(kel.nimi)+' peab kinnitama, et tagastas või andis seadme üle, enne kui saab ise uusi seadmeid võtta.</span></label><button class="suur roh" id="vota1" disabled>'+ik('vota')+'Võta üle</button>';
    else if(!v.juba) h+='<div class="viga">'+ik('keeld')+'<span>'+esc(v.pohjus)+'</span></div>';
    if(!j.minu&&kel&&S.mina&&S.mina.kasutaja.olek==='aktiivne') h+='<label class="mark"><input type="checkbox" id="teise1"><span>Seade on siin tagasi, märgin selle tagastatuks '+esc(kel.nimi)+' eest.</span></label><button class="suur" id="tagastaTeise" disabled>Märgi tagastatuks</button>';
  }
  const aktiivne=S.mina&&S.mina.kasutaja.olek==='aktiivne';
  const tana=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Tallinn'});
  if(aktiivne&&s.olek!=='maha') h+='<h2>Broneeringud</h2><div class="kaart">'+((s.bron||[]).length?'<ul class="loend">'+s.bron.map(b=>'<li><div class="rida"><span>'+esc(b.algus)+' – '+esc(b.lopp)+' · <b>'+esc(b.nimi)+'</b> '+(b.tel?'<a href="tel:'+esc(b.tel)+'">'+esc(b.tel)+'</a>':'')+(b.markus?'<br><span class="vaike">'+esc(b.markus)+'</span>':'')+'</span>'+
     ((b.kasutaja===S.mina.kasutaja.id||S.mina.kasutaja.super)?'<button data-btyh="'+esc(b.id)+'">Tühista</button>':'')+'</div></li>').join('')+'</ul>':'<p class="vaike">Broneeringuid pole.</p>')+
   '<div class="rida"><div><label>Algus</label><input type="date" id="b_algus" min="'+tana+'" value="'+tana+'"></div><div><label>Lõpp</label><input type="date" id="b_lopp" min="'+tana+'" value="'+tana+'"></div></div>'+
   '<input id="b_markus" maxlength="200" placeholder="Märkus (nt objekt), valikuline"><button id="b_saada">Broneeri</button><div id="b_teade"></div></div>';
  if(aktiivne) h+='<h2>Märkus</h2><div class="kaart"><p class="vaike">Registriandmeid muudab administraator. Sina saad lisada märkuse.</p><select id="mtyyp"><option value="">— vali —</option>'+
   Object.entries(j.marke_tyybid).map(([k,t])=>'<option value="'+k+'">'+esc(t)+'</option>').join('')+'</select><textarea id="mtekst" rows="2" maxlength="500" placeholder="Täpsustus (valikuline)"></textarea>'+
   (S.mina&&S.mina.foto!=='ei'?'<label for="foto_m">Foto (valikuline)</label><input type="file" accept="image/*" capture="environment" id="foto_m"><div id="foto_m_t"></div>':'')+'<button id="msaada">Lisa märkus</button><div id="mteade"></div>'+
   (s.margmed.length?'<ul class="loend">'+s.margmed.map(m=>'<li><b>'+esc(j.marke_tyybid[m.tyyp])+'</b><br><span class="vaike">'+esc(m.nimi)+', '+esc(aeg(m.aeg))+'</span>'+(m.tekst?'<br>'+esc(m.tekst):'')+'</li>').join('')+'</ul>':'')+'</div>'+
   ajaluguHTML(s.ajalugu)+'<button class="suur" id="tagasi">'+(S.mina?'Avalehele':'Tagasi')+'</button>';
  sisu(h,S.mina?'':undefined);
  const nupud=()=>{const ok=fotoValmis('foto_k');['vota1','tagasta1','tagastaTeise'].forEach(i=>{const b=$('#'+i);if(!b)return;
    const lisa=i==='vota1'&&$('#ule1')?!$('#ule1').checked:i==='tagastaTeise'?!$('#teise1').checked:false; b.disabled=!ok||lisa;});};
  fotoSeo('foto_k',nupud); fotoSeo('foto_m'); nupud();
  const tee=async(tee,keha)=>{const r=await api(tee,{koht:S.koht&&S.koht.kood,foto:fotoVoti('foto_k'),...keha}); if(!r.ok){alert(r.viga);return;} S.mina=r.mina; const t=r.tulemused[0];
    pohi(t.ok?'<div class="ok">'+(tee==='/api/vota'?'Võetud: ':'Tagastatud: ')+esc(t.nimi)+'</div>':'<div class="viga">'+esc(t.nimi||'')+': '+esc(t.viga||'ei õnnestunud, proovi uuesti')+'</div>');};
  if($('#ule1'))$('#ule1').onchange=nupud;
  if($('#teise1'))$('#teise1').onchange=nupud;
  if($('#vota1'))$('#vota1').onclick=()=>tee('/api/vota',{koodid:[kood],ule:$('#ule1')&&$('#ule1').checked?[kood]:[]});
  if($('#tagasta1'))$('#tagasta1').onclick=()=>tee('/api/tagasta',{koodid:[kood]});
  if($('#tagastaTeise'))$('#tagastaTeise').onclick=()=>tee('/api/tagasta',{koodid:[kood],teise_eest:[kood]});
  if($('#b_saada'))$('#b_saada').onclick=async()=>{const r=await api('/api/broneeri',{kood,algus:$('#b_algus').value,lopp:$('#b_lopp').value,markus:$('#b_markus').value});
    if(!r.ok){$('#b_teade').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;} S.mina=r.mina; seadmeVaade(kood,skannitud);};
  document.querySelectorAll('[data-btyh]').forEach(b=>b.onclick=async()=>{if(!confirm('Tühistada broneering?'))return;const r=await api('/api/bron-tyhista',{kood,id:b.dataset.btyh});if(r.ok){S.mina=r.mina;seadmeVaade(kood,skannitud);}else alert(r.viga);});
  if($('#msaada'))$('#msaada').onclick=async()=>{const r=await api('/api/marge',{kood,tyyp:$('#mtyyp').value,tekst:$('#mtekst').value,foto:fotoVoti('foto_m')});
    $('#mteade').innerHTML=r.ok?'<div class="ok">Märkus lisatud, administraator näeb seda.</div>':'<div class="viga">'+esc(r.viga)+'</div>'; if(r.ok){$('#mtekst').value='';}};
  $('#tagasi').onclick=()=>{history.replaceState(null,'','/');pohi();};
}

// ---------- otsing: kus seade on ----------
// Tavakasutaja näeb ainult otsingu tulemust; superkasutaja näeb tühja otsinguga kõiki seadmeid.
// „Skänni QR“: kataloogi (/I/) või seadme (/S/) kood avab seadme kaardi ainult vaatamiseks (võtta saab ainult seadme skännimisega).
function otsing(){
  const sup=S.mina&&S.mina.kasutaja.super;
  sisu('<h1>Kus on seade?</h1><p class="alapealkiri">Otsi nime, tüübi või inventarinumbri järgi või skänni QR-kood.</p><div class="rida"><input id="q" type="search" placeholder="Nimi, tüüp või inventarinumber"><button id="qr">'+ik('skann')+'QR</button></div>'+
   '<div id="kaam" hidden><video id="vid" muted playsinline></video><div id="teade"></div></div><div id="tul"></div><button class="suur" id="tagasi">Tagasi</button>','otsi');
  $('#tagasi').onclick=()=>pohi();
  $('#qr').onclick=()=>{ if(toimib){peata();$('#kaam').hidden=true;return;} $('#kaam').hidden=false;
    kaamera($('#vid'),t=>{const k=koodTekstist(t,location.host);
      if(!k||k.liik==='K'){$('#teade').innerHTML='<div class="viga">'+(k?'See on töökoha QR-kood.':'Tundmatu QR-kood. Pöördu administraatori poole.')+'</div>';if(navigator.vibrate)navigator.vibrate([200,100,200]);return;}
      peata(); seadmeVaade(k.kood,false);},t=>{$('#teade').innerHTML='<div class="hoiatus">'+esc(t)+'</div>';}); };
  let t=null; const otsi=async()=>{const j=await api('/api/otsi',{q:$('#q').value}); if(!j.ok){$('#tul').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}
    if(j.vaja_paringut){$('#tul').innerHTML='<p class="vaike">Kirjuta vähemalt 2 märki või skänni kataloogi QR-kood.</p>';return;}
    $('#tul').innerHTML=j.tulemused.length?'<ul class="loend">'+j.tulemused.map(s=>'<li data-kood="'+esc(s.kood)+'"><b>'+esc(s.nimi)+'</b> <span class="inv">'+esc(s.invnr)+'</span><br>'+
      (s.kellel?'Kasutuses: <b>'+esc(s.kellel.nimi)+'</b> '+(s.kellel.tel?'<a href="tel:'+esc(s.kellel.tel)+'">'+esc(s.kellel.tel)+'</a>':'')+' alates '+esc(aeg(s.kellel.alates)):(s.olek==='remondis'?'Remondis':'Vaba'+(s.asukoht?' – '+esc(s.asukoht):'')))+
      (s.hoiatused.length?'<br><span class="vaike" style="color:var(--lahene)">'+esc(s.hoiatused.join('; '))+'</span>':'')+'</li>').join('')+'</ul>':'<p class="vaike">Ei leitud.</p>';
    document.querySelectorAll('#tul li').forEach(li=>li.onclick=e=>{if(e.target.tagName!=='A')seadmeVaade(li.dataset.kood,false);});};
  $('#q').oninput=()=>{clearTimeout(t);t=setTimeout(otsi,250);}; otsi();
}

// ---------- laod ja seis (superkasutaja) ----------
async function laod(){
  const j=await api('/api/laod',{}); if(!j.ok){alert(j.viga);return;}
  const rida=x=>'<li data-kood="'+esc(x.kood)+'"><b>'+esc(x.nimi)+'</b> <span class="inv">'+esc(x.invnr)+'</span>'+(x.kellel?'<br><span class="vaike">'+esc(x.kellel)+' '+esc(x.tel)+' alates '+esc(aeg(x.alates))+'</span>':'')+'</li>';
  sisu('<h1>Laod ja seis</h1>'+j.laod.map(l=>'<div class="kaart"><h2>'+esc(l.nimi)+(l.lyhend?' <span class="vaike">('+esc(l.lyhend)+')</span>':'')+'</h2>'+
    '<div>Laos vabad: <b>'+l.vabad.length+'</b> · väljas: <b>'+l.valjas.length+'</b>'+(l.remondis.length?' · remondis: <b>'+l.remondis.length+'</b>':'')+'</div>'+
    (l.vabad.length?'<details><summary>Vabad ('+l.vabad.length+')</summary><ul class="loend">'+l.vabad.map(rida).join('')+'</ul></details>':'')+
    (l.valjas.length?'<details><summary>Väljas ('+l.valjas.length+')</summary><ul class="loend">'+l.valjas.map(rida).join('')+'</ul></details>':'')+
    (l.remondis.length?'<details><summary>Remondis ('+l.remondis.length+')</summary><ul class="loend">'+l.remondis.map(rida).join('')+'</ul></details>':'')+'</div>').join('')+
    '<button class="suur" id="tagasi">Tagasi</button>','');
  $('#tagasi').onclick=()=>pohi();
  document.querySelectorAll('li[data-kood]').forEach(li=>li.onclick=()=>seadmeVaade(li.dataset.kood,false));
}

// ---------- hooldaja (väline hooldus, Margo 10.11.2026) ----------
// Sessioon on seotud ühe töökäsuga (küpsis qw_hool). Hooldaja saab sissekandeid ja faile lisada, muuta ja eemaldada kuni haldur töökäsu sulgeb.
let HV=null;
async function hooldajaVaade(teade){
  const j=await api('/api/hooldus/too',{});
  if(!j.ok){sisu('<h1>Hoolduse töökäsk</h1><div class="viga">'+ik('keeld')+'<span>'+esc(j.viga||'Viga')+'</span></div>');return;}
  HV=j; S.firma=j.firma; const t=j.too, L=j.liigid, sd=t.seade;
  const rida=(k,v)=>v?'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>':'';
  sisu('<h1>'+esc(sd.nimi)+'</h1><p class="alapealkiri">Hoolduse töökäsk · '+esc(t.hooldaja)+' · kehtib kuni '+esc(t.kehtib_kuni)+'</p>'+(teade||'')+
   (t.olek==='tehtud'?'<div class="olekuplokk minu"><strong>'+ik('ok')+'Märgitud tehtuks</strong><span>'+esc(L.ettepanekud[t.ettepanek]||'')+(t.ettepanek_tekst?' · '+esc(t.ettepanek_tekst):'')+'. Saad veel parandada, kuni omanik kinnitab.</span></div>'
     :'<div class="olekuplokk teise"><strong>'+ik('mootja')+'Hoolduses</strong><span>Alates '+esc(t.kuupaev)+'</span></div>')+
   '<div class="kaart"><dl class="andmed">'+rida('Omanik',esc(j.firma))+rida('Inventarinr',esc(sd.invnr))+rida('Tüüp',esc(sd.tyyp))+rida('Tootja',esc(sd.tootja))+rida('Mudel',esc(sd.mudel))+rida('Seerianr',esc(sd.seerianr))+'</dl>'+
   (t.rike?'<p style="margin:10px 0 0"><b>Rike / töö:</b><br><span style="white-space:pre-wrap">'+esc(t.rike)+'</span></p>':'')+'</div>'+
   '<h2>Sissekanded</h2>'+(t.kirjed.length?'<ul class="loend">'+t.kirjed.map(k=>'<li><b>'+esc(L.kirjed[k.liik]||k.liik)+'</b>'+(k.kulu!=null?' · '+esc(String(k.kulu).replace('.',','))+' €':'')+'<br><span style="white-space:pre-wrap">'+esc(k.tekst)+'</span><br><span class="vaike">'+esc(aeg(k.loodud))+(k.muudetud?' · muudetud '+esc(aeg(k.muudetud)):'')+'</span>'+
     '<div class="rida" style="margin-top:6px"><button data-km="'+esc(k.id)+'">Muuda</button><button data-ke="'+esc(k.id)+'">Eemalda</button></div></li>').join('')+'</ul>':'<div class="teave">'+ik('info')+'<span>Sissekandeid pole. Alusta vastuvõtust (seisukord, tarvikud).</span></div>')+
   '<div class="kaart" id="k_vorm"><h2 id="k_pealk" style="margin-top:0">Lisa sissekanne</h2><input type="hidden" id="k_id"><label for="k_liik">Liik</label><select id="k_liik">'+Object.entries(L.kirjed).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select>'+
   '<label for="k_tekst">Tekst</label><textarea id="k_tekst" rows="4" maxlength="2000"></textarea><label for="k_kulu">Summa € km-ta (valikuline)</label><input id="k_kulu" inputmode="decimal">'+
   '<div class="rida"><button class="roh" id="k_salv">Salvesta</button><button id="k_loobu" hidden>Loobu</button></div><div id="k_teade"></div></div>'+
   '<h2>Fotod ja dokumendid</h2>'+(t.failid.length?'<ul class="loend">'+t.failid.map(f=>'<li><div class="rida"><span>'+(f.mime==='application/pdf'?'PDF':'Foto')+' · <b>'+esc(L.failid[f.liik]||f.liik)+'</b>'+(f.nimi?' · '+esc(f.nimi):'')+'<br><span class="vaike">'+esc(aeg(f.aeg))+' · '+Math.round(f.suurus/1024)+' kB</span></span><a class="nupp" href="/api/hooldus/fail?k='+encodeURIComponent(f.voti)+'" target="_blank" rel="noopener">Ava</a><button data-fe="'+esc(f.voti)+'">Eemalda</button></div></li>').join('')+'</ul>':'')+
   '<div class="kaart"><label for="f_liik">Faili liik</label><select id="f_liik">'+Object.entries(L.failid).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select>'+
   '<div class="rida"><label class="nupp" style="margin:4px 0">'+ik('kaamera')+'Pildista<input type="file" id="f_kaam" accept="image/*" capture="environment" hidden></label><label class="nupp" style="margin:4px 0">Vali fail<input type="file" id="f_fail" accept="image/jpeg,image/png,image/webp,application/pdf" hidden></label></div><div id="f_teade"></div></div>'+
   '<h2>Töö tulemus</h2><div class="kaart"><label for="v_e">Tulemus</label><select id="v_e">'+Object.entries(L.ettepanekud).map(([k,v])=>'<option value="'+k+'"'+(t.ettepanek===k?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select>'+
   '<label for="v_t">Märkus omanikule (valikuline)</label><textarea id="v_t" rows="2" maxlength="500">'+esc(t.ettepanek_tekst)+'</textarea><button class="suur roh" id="v_salv">'+ik('ok')+(t.olek==='tehtud'?'Uuenda tulemust':'Märgi tehtuks')+'</button><div id="v_teade"></div></div>'+
   '<p class="vaike keskel"><a href="#" id="h_valja">Lõpeta (logi välja)</a></p>');
  const v=$('#k_vorm');
  document.querySelectorAll('[data-km]').forEach(b=>b.onclick=()=>{const k=t.kirjed.find(x=>x.id===b.dataset.km);$('#k_id').value=k.id;$('#k_liik').value=k.liik;$('#k_tekst').value=k.tekst;$('#k_kulu').value=k.kulu==null?'':String(k.kulu).replace('.',',');
    $('#k_pealk').textContent='Muuda sissekannet';$('#k_loobu').hidden=false;v.scrollIntoView({behavior:'smooth'});});
  $('#k_loobu').onclick=()=>hooldajaVaade();
  document.querySelectorAll('[data-ke]').forEach(b=>b.onclick=async()=>{if(!confirm('Eemaldada sissekanne? Omanik näeb, et see eemaldati.'))return;const r=await api('/api/hooldus/kirje-eemalda',{id:b.dataset.ke});if(!r.ok){alert(r.viga);return;}hooldajaVaade();});
  document.querySelectorAll('[data-fe]').forEach(b=>b.onclick=async()=>{if(!confirm('Eemaldada fail? Omanik näeb, et see eemaldati.'))return;const r=await api('/api/hooldus/fail-eemalda',{voti:b.dataset.fe});if(!r.ok){alert(r.viga);return;}hooldajaVaade();});
  $('#k_salv').onclick=async()=>{const r=await api('/api/hooldus/kirje',{id:$('#k_id').value||undefined,liik:$('#k_liik').value,tekst:$('#k_tekst').value,kulu:$('#k_kulu').value.trim()});
    if(!r.ok){$('#k_teade').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;}hooldajaVaade('<div class="ok">'+ik('ok')+'Salvestatud.</div>');};
  const yles=async el=>{let f=el.files&&el.files[0];el.value='';if(!f)return;const ft=$('#f_teade');
    if(f.size>10*1024*1024&&f.type.startsWith('image/')){ft.innerHTML='<div class="vaike">Foto on suur, vähendan…</div>';try{f=await vahenda2(f);}catch(e){}}
    if(f.size>10*1024*1024){ft.innerHTML='<div class="viga">Fail on liiga suur (kuni 10 MB).</div>';return;}
    ft.innerHTML='<div class="vaike">Laen üles…</div>';
    try{const r=await fetch('/api/hooldus/fail?liik='+$('#f_liik').value+'&nimi='+encodeURIComponent((f.name||'').slice(0,80)),{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream','X-QW':'1'},body:f,credentials:'same-origin'});
      const j2=await r.json();if(!j2.ok)throw new Error(j2.viga);hooldajaVaade('<div class="ok">'+ik('ok')+'Fail lisatud.</div>');}
    catch(e){ft.innerHTML='<div class="viga">Üleslaadimine ebaõnnestus'+(e&&e.message?': '+esc(e.message):'')+'</div>';}};
  $('#f_kaam').onchange=e=>yles(e.target);$('#f_fail').onchange=e=>yles(e.target);
  $('#v_salv').onclick=async()=>{const r=await api('/api/hooldus/valmis',{ettepanek:$('#v_e').value,tekst:$('#v_t').value});if(!r.ok){$('#v_teade').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;}hooldajaVaade('<div class="ok">'+ik('ok')+'Omanik sai teate.</div>');};
  $('#h_valja').onclick=async e=>{e.preventDefault();await api('/api/hooldus/valja',{});sisu('<h1>Aitäh!</h1><p class="alapealkiri">Töökäsk on suletud selles telefonis. Uuesti sisenemiseks skänni seade ja sisesta PIN.</p>');};
}
async function vahenda2(fail){const url=URL.createObjectURL(fail);try{const img=await new Promise((ok,ei)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ei;i.src=url;});
  const k=Math.min(1,3000/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=img.naturalWidth*k|0;c.height=img.naturalHeight*k|0;c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.88));}finally{URL.revokeObjectURL(url);}}

// ---------- leidja (sisse logimata) ----------
// Üle võetud leiamind'ist (Margo 02.11.2026): asukoht lehe avamisel (watchPosition ≤ 30 s, lõpp ≤ 20 m juures, alles jääb kõige täpsem),
// parim lugem saadetakse automaatselt üks kord (/api/asukoht), lehelt lahkumisel sendBeaconiga. Leidjale loendurit ega ootamist ei näidata.
let LW=null;
function leidLopp(){if(LW){LW.lopeta();LW=null;}}
async function leidjaVaade(kood){
  const j=await api('/api/avalik',{kood});
  if(j.sidumata){sisu('<h1>Krativara</h1><div class="kaart"><p>See kood ei ole veel kasutusel.</p><p class="vaike"><a href="/admin#seo='+esc(kood)+'">Haldur: seo kood seadmega</a></p></div>');return;}
  if(!j.ok){sisu('<h1>Tundmatu QR-kood</h1><div class="viga">Seda koodi ei ole registris. Pöördu administraatori poole.</div>');return;}
  S.firma=j.firma; const T=j.token;
  sisu('<h1>'+esc(j.nimi)+'</h1><p class="alapealkiri">See tööriist kuulub firmale <b>'+esc(j.firma)+'</b>'+(j.invnr?' · <span class="inv">'+esc(j.invnr)+'</span>':'')+'.</p>'+
   '<div class="kaart"><p style="margin-top:0"><b>Leidsid selle?</b> Palun anna teada, kus see on. Aitäh!</p>'+
   '<label for="tekst">Kus seade on / kirjeldus</label><div class="lahter"><textarea id="tekst" rows="3" maxlength="400"></textarea><span class="lk" id="tekst-lk">0/400</span></div>'+
   '<label for="kontakt">Sinu telefon või e-post (valikuline)</label><div class="lahter in"><input id="kontakt" maxlength="100"><span class="lk" id="kontakt-lk">0/100</span></div>'+
   '<div class="teave">'+ik('lukk')+'<span>Sinu nime ega kontaktandmeid ei saadeta, kui sa neid vormi ei lisa.</span></div>'+
   '<label for="lfoto">Lisa foto (valikuline)</label><input id="lfoto" type="file" accept="image/*" capture="environment">'+
   '<div id="lfeel" hidden><img id="lfimg" alt="Foto eelvaade" style="max-width:100%;max-height:180px;border-radius:8px;margin-top:8px"><button id="lfvota" type="button">Eemalda</button></div>'+
   '<button class="suur roh" id="saada">Saada omanikule</button>'+(j.telefon?'<a class="nupp suur" id="helista" href="tel:'+esc(j.telefon)+'">'+ik('telefon')+'Helista omanikule</a>':'')+
   '<div id="olek" role="status"></div></div>'+
   (j.hooldus?'<div class="kaart"><h2>Hooldaja?</h2>'+(j.hooldus_sees?'<button class="suur roh" id="h_ava">'+ik('mootja')+'Ava hoolduse töökäsk</button>':
     '<p class="vaike" style="margin-top:0">Seade on hoolduses. Sisesta töökäsul olev 8-kohaline PIN.</p><label for="h_pin">PIN</label><input id="h_pin" inputmode="numeric" autocomplete="one-time-code" maxlength="9" placeholder="1234 5678" style="letter-spacing:.2em;font-size:20px"><button class="roh" id="h_sisse">Ava töökäsk</button><div id="h_teade"></div>')+'</div>':'')+
   '<div class="kaart"><p class="vaike">Oled selle firma töötaja?</p><button id="sisse">Logi sisse</button></div>');
  if($('#h_ava'))$('#h_ava').onclick=()=>{leidLopp();hooldajaVaade();};
  if($('#h_sisse'))$('#h_sisse').onclick=async()=>{$('#h_sisse').disabled=true;const r=await api('/api/hooldus/pin',{kood,pin:$('#h_pin').value});$('#h_sisse').disabled=false;
    if(!r.ok){$('#h_teade').innerHTML='<div class="viga">'+ik('keeld')+'<span>'+esc(r.viga||'Vale PIN.')+'</span></div>';return;} leidLopp();hooldajaVaade();};
  const ol=$('#olek'), nupp=$('#saada'), tk=$('#tekst'), kk=$('#kontakt');
  const post=(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json','X-QW':'1'},body:JSON.stringify(Object.assign({token:T},b)),credentials:'same-origin'}).then(r=>r.json()).catch(()=>({ok:false,viga:'ühendus'}));
  const postFoto=(b,f)=>{const fd=new FormData();for(const k in b)if(b[k]!==undefined&&b[k]!==null)fd.append(k,b[k]);fd.append('foto',f,'foto.jpg');
    return fetch('/api/leid',{method:'POST',headers:{'X-QW':'1','X-Leid-Token':T},body:fd,credentials:'same-origin'}).then(r=>r.json()).catch(()=>({ok:false,viga:'ühendus'}));};
  const beacon=(u,b)=>{const s=JSON.stringify(Object.assign({token:T},b));let ok=false;
    try{ok=!!(navigator.sendBeacon&&navigator.sendBeacon(u,new Blob([s],{type:'text/plain'})));}catch(x){}
    if(!ok){try{fetch(u,{method:'POST',headers:{'Content-Type':'text/plain'},body:s,keepalive:true}).catch(()=>{});}catch(x){}}};
  // Tekstilahtrite kõva piir: maxlength + lõikamine sisestusel (poolik surrogaatpaar lõppu ei jää), loendur kasti nurgas
  function piira(el,max){const lk=$('#'+el.id+'-lk');const u=()=>{if(el.value.length>max)el.value=el.value.slice(0,max).replace(/[\\uD800-\\uDBFF]$/,'');const n=el.value.length;lk.textContent=n+'/'+max;lk.classList.toggle('pk',n>=max-1);};el.addEventListener('input',u);u();}
  piira(tk,400);piira(kk,100);
  // Asukoht
  let W=null,POS=null,AUTO=false,REFUS=false,SAADETUD=false;
  const acc=p=>{const a=p&&p.coords.accuracy;return Number.isFinite(a)?a:Infinity;};
  const pvanus=()=>POS?Math.max(0,Math.round((Date.now()-POS.t)/1000)):0;
  const koord=p=>({lat:p.coords.latitude,lon:p.coords.longitude,tapsus:p.coords.accuracy,pos_vanus:pvanus()});
  function lopetaW(){if(!W)return;try{navigator.geolocation.clearWatch(W.id);}catch(e){}clearTimeout(W.vaht);W=null;}
  function autoSaada(){if(AUTO)return;AUTO=true;const p=POS&&POS.p;if(!p)return;SAADETUD=true;post('/api/asukoht',koord(p));}
  function lahkub(){if(AUTO||!POS)return;AUTO=true;SAADETUD=true;lopetaW();beacon('/api/asukoht',koord(POS.p));}
  const peidus=()=>{if(document.visibilityState==='hidden')lahkub();};
  if(navigator.geolocation){
    const w=W={id:null,vaht:null};
    const lopp=()=>{if(W!==w)return;lopetaW();autoSaada();};
    w.vaht=setTimeout(lopp,30000);
    const uus=p=>{if(W!==w)return;const a=p.coords.accuracy;if(POS&&!(Number.isFinite(a)&&a<acc(POS.p)))return;POS={p:p,t:Date.now()};if(Number.isFinite(a)&&a<=20)lopp();};
    const viga=e=>{if(W!==w)return;if(e&&e.code===1){REFUS=true;lopetaW();}};
    try{w.id=navigator.geolocation.watchPosition(uus,viga,{enableHighAccuracy:true,maximumAge:0});}catch(e){lopetaW();}
  }
  addEventListener('pagehide',lahkub);document.addEventListener('visibilitychange',peidus);
  LW={lopeta(){lopetaW();AUTO=true;removeEventListener('pagehide',lahkub);document.removeEventListener('visibilitychange',peidus);}};
  // Foto: vähendatakse canvases (EXIF ja GPS kaovad), foto GPS loetakse originaalist eraldi
  let FOTO=null,FG=null,FN=0;
  const fi=$('#lfoto'),fe=$('#lfeel'),fm=$('#lfimg');
  function fotoVota(){FN++;FOTO=null;FG=null;fi.value='';fe.hidden=true;if(fm.src)URL.revokeObjectURL(fm.src);fm.removeAttribute('src');}
  fi.onchange=async()=>{const f=fi.files&&fi.files[0];if(!f){fotoVota();return;}const n=++FN;FOTO=null;FG=null;let g=null;
    try{g=exifGps(await f.slice(0,2097152).arrayBuffer());}catch(x){g=null;} if(n!==FN)return; FG=g;
    try{const b=await vahenda(f);if(n!==FN)return;if(!b||b.size>2*1024*1024)throw new Error('suur');FOTO=b;if(fm.src)URL.revokeObjectURL(fm.src);fm.src=URL.createObjectURL(b);fe.hidden=false;}
    catch(x){if(n!==FN)return;fotoVota();ol.innerHTML='<div class="viga">Seda fotot ei saanud kasutada. Saad saata ilma fotota.</div>';}};
  $('#lfvota').onclick=fotoVota;
  const vf=r=>r.viga==='foto liiga suur'||r.viga==='foto tüüp';
  const vastus=r=>r.viga==='oota minut'?'Liiga tihti. Oota minut ja proovi uuesti.':r.viga==='tais'?'Omanik ei saa praegu sõnumeid vastu võtta. Proovi helistada või tule hiljem tagasi.':r.viga==='aegunud'?'Leht on aegunud. Skänni kood uuesti.':(r.viga&&/märki/.test(r.viga))?r.viga:'Saatmine ebaõnnestus. Proovi uuesti.';
  nupp.onclick=async()=>{
    const h={tekst:tk.value.trim(),kontakt:kk.value.trim()};
    if(!h.tekst&&!h.kontakt&&!FOTO){ol.innerHTML='<div class="viga">Kirjuta, kus seade on, või lisa foto.</div>';return;}
    const p=POS&&POS.p; if(p){AUTO=true;lopetaW();}
    nupp.disabled=true; ol.innerHTML='<div class="vaike">Saadan…</div>';
    const keha=p?Object.assign(koord(p),h,SAADETUD?{auto_saadetud:1}:{}):Object.assign({},h,REFUS?{puudub:'luba'}:navigator.geolocation?{}:{puudub:'tugi'});
    let fotoga=!!FOTO,r;
    if(fotoga){r=await postFoto(Object.assign({},keha,FG?{foto_lat:FG.lat,foto_lon:FG.lon,foto_aeg:FG.aeg||undefined}:{}),FOTO);if(vf(r)){fotoga=false;r=await post('/api/leid',keha);}}
    else r=await post('/api/leid',keha);
    if(!r.ok){nupp.disabled=false;ol.innerHTML='<div class="viga">'+esc(vastus(r))+'</div>';return;}
    ol.innerHTML='<div class="ok">'+(r.teavitatud?'Saadetud. Aitäh!':'Salvestatud. Aitäh!')+'</div>';
  };
  const hl=$('#helista'); if(hl)hl.addEventListener('click',()=>beacon('/api/helista',{}));
  $('#sisse').onclick=()=>{leidLopp();sisene(kood,'sisse');};
}
</script>${lisaJs(nonce, ver)}</body></html>`;
}

export function adminLeht(nonce, { ver } = {}) {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Krativara haldus</title><style>${STIIL}
main{max-width:1100px}table{border-collapse:collapse;width:100%;background:var(--kast);font-size:14px;border:1px solid var(--joon);border-radius:var(--raadius)}td,th{border-bottom:1px solid var(--joon);padding:8px;text-align:left;vertical-align:top}th{font-weight:600;color:var(--nork);background:var(--pind)}
.tabs{flex-wrap:wrap}.tabs button{flex:0 0 auto}.vana{background:var(--puna-hele)}button.v{min-height:36px;padding:6px 10px;font-size:14px;margin:2px}.tabs button{min-height:44px}
.vorm{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}
#print{display:none}
@media print{@page{size:A4;margin:8mm}body{background:#fff}main,.riba,#jalus,#uusver,#menyy{display:none!important}#print{display:block}
 .sildid{display:flex;flex-wrap:wrap;gap:3mm}.silt{width:32mm;height:44mm;border:0.2mm dashed #999;padding:1mm;text-align:center;font:bold 2.6mm/1.15 Arial,sans-serif;overflow:hidden;break-inside:avoid}
 .silt svg{width:28mm;height:28mm;display:block;margin:0 auto}
 .krida{display:flex;gap:4mm;align-items:center;margin:0 0 2mm;break-inside:avoid}.krida .k{font:2.5mm monospace}.krida svg{display:block;flex:0 0 auto}.silt .k{font:2.2mm monospace}
 .plakat{text-align:center;font-family:Arial,sans-serif;page-break-after:always}.plakat svg{width:120mm;height:120mm}.plakat h1{font-size:12mm;margin:6mm 0 2mm}.plakat h2{font-size:9mm;margin:0 0 6mm}.plakat ol{text-align:left;font-size:5.5mm;max-width:160mm;margin:6mm auto}}
</style></head><body>${RIBA.replace('Krativara</span>','Krativara</span><span class="roll" style="margin-left:4px">haldus</span>')}<main id="m"><h1>Haldus</h1>
<div id="login" class="kaart"><label>Halduse võti (ADMIN_TOKEN)</label><input id="tok" type="password" autocomplete="current-password">
<label class="mark"><input type="checkbox" id="mal"><span>Jäta selles brauseris meelde</span></label><button class="sin" id="sisse">Ava</button><div id="lviga"></div></div>
<div id="app" hidden><div class="tabs" id="tabs"></div><div id="sisu"></div></div></main><div id="print"></div>
<script nonce="${nonce}">${QR_JS}</script>
<script nonce="${nonce}">
${ABI}
${KLEEBIS_JS}
${koodTekstist.toString()}
${kasitsiKood.toString()}
${SKANNER_JS}
let TOK='', U=null, TAB='ulevaade';
try{TOK=localStorage.getItem('qw_admin')||sessionStorage.getItem('qw_admin')||'';}catch(e){}
async function a(tee,keha){const r=await fetch('/api/admin/'+tee,keha?{method:'POST',headers:{'Authorization':'Bearer '+TOK,'Content-Type':'application/json'},body:JSON.stringify(keha)}:{headers:{'Authorization':'Bearer '+TOK}});
  let j={};try{j=await r.json()}catch(e){} if(r.status===401){$('#app').hidden=true;$('#login').hidden=false;} j.status=r.status; return j;}
$('#sisse').onclick=async()=>{TOK=$('#tok').value.trim(); try{($('#mal').checked?localStorage:sessionStorage).setItem('qw_admin',TOK);}catch(e){} await lae();};
async function lae(){U=await a('ulevaade'); if(!U.ok){$('#lviga').innerHTML='<div class="viga">'+esc(U.viga||'Viga')+'</div>';return;} $('#login').hidden=true;$('#app').hidden=false; tabs(); naita();
  seoHash();}
function seoHash(){const h=/^#seo=([0-9A-Z]{12})$/.exec(location.hash); if(h){history.replaceState(null,'',location.pathname);TAB='seadmed';tabs();seoKood(h[1]);}}
window.addEventListener('hashchange',()=>{if(U&&U.ok)seoHash();});
const TABS={ulevaade:'Ülevaade',seadmed:'Seadmed',hooldus:'Hooldus',bron:'Broneeringud',kohad:'Töökohad',kasutajad:'Kasutajad',logi:'Logi',seaded:'Seaded'};
// Täpp vahekaardil = üle vaatamata info: lahendamata vaidlused ja märkused, kinnitust ootavad kasutajad, aegunud taatlused,
// uued broneeringud ja logikirjed pärast vahekaardi viimast avamist (meelespea selles brauseris).
const NAHTUD={get(k){try{return +localStorage.getItem('qw_nahtud_'+k)||0}catch(e){return 0}},set(k,v){try{localStorage.setItem('qw_nahtud_'+k,String(v))}catch(e){}}};
function tapid(){ if(!U) return {}; const t=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Tallinn'});
  return { ulevaade:U.vaidlused.length+U.margmed.length, kasutajad:U.kasutajad.filter(k=>k.olek==='ootel'&&!k.kustutatud).length,
    seadmed:U.seadmed.filter(s=>!s.kustutatud&&s.olek!=='maha'&&s.taatlus_kuni&&s.taatlus_kuni<t).length,
    hooldus:(U.tood||[]).filter(t=>t.olek==='tehtud').length,
    bron:(U.broneeringud||[]).filter(b=>b.loodud>NAHTUD.get('bron')).length, logi:U.logi_viimane>NAHTUD.get('logi')?1:0 };}
function tabs(){const tp=tapid(); $('#tabs').innerHTML=Object.entries(TABS).map(([k,t])=>'<button data-t="'+k+'" class="'+(k===TAB?'val':'')+'">'+t+(tp[k]?' <span class="tapp">'+(k==='logi'?'●':tp[k])+'</span>':'')+'</button>').join('')+'<button id="varskenda">↻</button>';
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;tabs();naita();}); $('#varskenda').onclick=lae;}
// Kustutamine: 30 päeva taastatav. Kustutatud rida on halduses hall, „Taasta“ kuni tähtajani, siis mitteaktiivne.
const KUST_MS=30*86400000;
function kustNupp(liik,id,x){ if(!x.kustutatud) return '<button class="v" data-kustuta="'+liik+'" data-kid="'+esc(id)+'" data-knimi="'+esc(x.nimi)+'">🗑 Kustuta</button>';
  const jaanud=Math.ceil((x.kustutatud+KUST_MS-Date.now())/86400000);
  return jaanud>0?'<button class="v roh" data-taasta="'+liik+'" data-kid="'+esc(id)+'">↩ Taasta ('+jaanud+' p)</button>':'<button class="v" disabled>Taastamine aegunud</button>';}
const kustStiil=x=>x.kustutatud?' style="opacity:.5;text-decoration:line-through"':'';
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-kustuta],[data-taasta]'); if(!b) return;
  const kust=!!b.dataset.kustuta, liik=b.dataset.kustuta||b.dataset.taasta, nim={seade:'seadme',koht:'lao/töökoha',kasutaja:'kasutaja'}[liik];
  if(kust&&!confirm('Kustutada '+nim+' „'+b.dataset.knimi+'“?\\n\\nKõigile peale halduri on see kohe kadunud. 30 päeva jooksul saab selle taastada, siis kustutatakse lõplikult.')) return;
  const j=await a(kust?'kustuta':'taasta',{liik,id:b.dataset.kid}); if(!j.ok){alert(j.viga);return;} U=await a('ulevaade'); naita();});
const kohaValik=(val,tyhi)=>'<option value="">'+(tyhi||'—')+'</option>'+U.kohad.filter(k=>!k.kustutatud).map(k=>'<option value="'+k.kood+'"'+(k.kood===val?' selected':'')+'>'+esc(k.nimi)+'</option>').join('');
const OLEK={aktiivne:'kasutusel',remondis:'remondis/hoolduses',taatlusel:'taatlusel/kalibreerimisel',maha:'maha kantud'};
function naita(){ peata(); const f={ulevaade,seadmed,hooldus,bron,kohad,kasutajad,logi,seaded}[TAB];
  if(TAB==='bron') NAHTUD.set('bron',Date.now()); if(TAB==='logi') NAHTUD.set('logi',U.logi_viimane||Date.now()); tabs(); f(); }
// ---------- väline hooldus: hooldajad ja töökäsud (Margo 10.11.2026) ----------
const TOO_OLEK={avatud:'hoolduses',tehtud:'hooldaja märkis tehtuks',suletud:'suletud',tuhistatud:'tühistatud'};
const ETTEP={valmis:'valmis, võib tagastada',ei_parandatav:'ei ole parandatav',kooskolastus:'vajab kooskõlastust (hind/osad)'};
function hooldus(uusKood){const H=U.hooldajad||[],T=(U.tood||[]).slice().sort((a,b)=>b.loodud-a.loodud);
  const sd=uusKood?U.seadmed.find(x=>x.kood===uusKood):null;
  $('#sisu').innerHTML=(sd?'<h2>Saada hooldusesse: '+esc(sd.nimi)+' <span class="vaike">'+esc(sd.invnr)+'</span></h2><div class="kaart"><div class="vorm"><div><label>Hooldaja *</label><select id="hs_h"><option value="">— vali —</option>'+H.filter(h=>h.aktiivne!==false).map(h=>'<option value="'+h.id+'"'+(sd.hooldaja===h.id?' selected':'')+'>'+esc(h.nimi)+'</option>').join('')+'</select></div>'+
     '<div><label>Töökäsk kehtib (päeva)</label><input id="hs_p" type="number" min="1" max="180" value="30"></div></div><label>Tellimus / rikke kirjeldus (hooldaja näeb)</label><textarea id="hs_r" rows="4" maxlength="1000" placeholder="nt Kalibreerimine ja tunnistus. Kukkus, ekraan ei põle."></textarea>'+
     '<button class="roh" id="hs_salv">Loo töökäsk</button> <button id="hs_loobu">Loobu</button><div id="hs_teade"></div>'+(H.length?'':'<div class="hoiatus">Lisa enne hooldaja (allpool).</div>')+'</div>':'')+
   '<h2>Töökäsud</h2>'+(T.length?'<table><tr><th>Seade</th><th>Hooldaja</th><th>Alates</th><th>Kehtib kuni</th><th>Olek</th><th></th></tr>'+T.map(t=>'<tr><td>'+esc(t.seade_nimi)+'<br><span class="vaike">'+esc(t.invnr)+'</span></td><td>'+esc(t.hooldaja_nimi)+'</td><td>'+esc(t.kuupaev)+'</td><td>'+esc(new Date(t.kehtib_kuni).toLocaleDateString('et-EE'))+'</td><td>'+
     (t.olek==='tehtud'?'<b>'+esc(TOO_OLEK[t.olek])+'</b><br><span class="vaike">'+esc(ETTEP[t.ettepanek]||'')+'</span>':esc(TOO_OLEK[t.olek]))+(t.kehtib_kuni<Date.now()&&(t.olek==='avatud'||t.olek==='tehtud')?'<br><span class="vaike" style="color:var(--puna)">aegunud</span>':'')+'</td><td><button class="v" data-too="'+t.id+'">Ava</button></td></tr>').join('')+'</table>':'<p class="vaike">Töökäske pole. Seadme juures: „Saada hooldusesse“.</p>')+
   '<div id="too_vaade"></div>'+
   '<h2>Hooldajad</h2>'+(H.length?'<table><tr><th>Ettevõte</th><th>Kontakt</th><th>Arve</th><th></th></tr>'+H.map(h=>'<tr'+(h.aktiivne===false?' class="kustutatud" style="opacity:.55"':'')+'><td><b>'+esc(h.nimi)+'</b><br><span class="vaike">'+esc(h.regkood)+(h.kmkr?' · KMKR '+esc(h.kmkr):'')+'</span></td><td>'+esc(h.kontakt)+'<br>'+(h.tel?'<a href="tel:'+esc(h.tel)+'">'+esc(h.tel)+'</a> ':'')+esc(h.epost)+'</td><td>'+esc(h.arve_epost)+'<br><span class="vaike">'+esc(h.aadress)+'</span></td><td><button class="v" data-hm="'+h.id+'">Muuda</button></td></tr>').join('')+'</table>':'')+
   '<div class="kaart"><h2 id="hj_pealk" style="margin-top:0">Lisa hooldaja</h2><input type="hidden" id="hj_id"><div class="vorm">'+
   [['nimi','Ettevõtte nimi *'],['regkood','Registrikood'],['kmkr','KMKR nr'],['aadress','Aadress'],['kontakt','Kontaktisik'],['tel','Telefon'],['epost','E-post'],['arve_epost','Arve e-post']].map(([k,t])=>'<div><label>'+t+'</label><input id="hj_'+k+'"></div>').join('')+
   '</div><label>Märkus (nt hinnakokkulepe, leping)</label><textarea id="hj_markus" rows="2"></textarea><label class="mark"><input type="checkbox" id="hj_akt" checked><span>Aktiivne (valikus)</span></label><button class="roh" id="hj_salv">Salvesta hooldaja</button><div id="hj_teade"></div></div>';
  if($('#hs_salv')){$('#hs_loobu').onclick=()=>hooldus();
    $('#hs_salv').onclick=async()=>{const j=await a('hooldusse',{kood:sd.kood,hooldaja:$('#hs_h').value,rike:$('#hs_r').value,paevi:$('#hs_p').value});
      if(!j.ok){$('#hs_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} U=await a('ulevaade');hooldus();tooVaade(j.too.id,j);};}
  document.querySelectorAll('[data-too]').forEach(b=>b.onclick=()=>tooVaade(b.dataset.too));
  document.querySelectorAll('[data-hm]').forEach(b=>b.onclick=()=>{const h=H.find(x=>x.id===b.dataset.hm);$('#hj_id').value=h.id;['nimi','regkood','kmkr','aadress','kontakt','tel','epost','arve_epost','markus'].forEach(k=>$('#hj_'+k).value=h[k]||'');$('#hj_akt').checked=h.aktiivne!==false;$('#hj_pealk').textContent='Muuda hooldajat';$('#hj_nimi').scrollIntoView();});
  $('#hj_salv').onclick=async()=>{const b={id:$('#hj_id').value||undefined,aktiivne:$('#hj_akt').checked};['nimi','regkood','kmkr','aadress','kontakt','tel','epost','arve_epost','markus'].forEach(k=>b[k]=$('#hj_'+k).value);
    const j=await a('hooldaja',b);if(!j.ok){$('#hj_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}U=await a('ulevaade');hooldus();};}
// Töökäsu ülevaade: hooldaja sissekanded (ka muudetud ja eemaldatud), failid; kinnita ja sulge / tühista / uus PIN ja link
async function tooVaade(id,uus){const j=await a('too?id='+id);if(!j.ok){alert(j.viga);return;}const t=j.too,s=U.seadmed.find(x=>x.kood===t.kood)||{};const lahti=t.olek==='avatud'||t.olek==='tehtud';
  const K={vastuvott:'vastuvõtt',too:'tehtud töö',osad:'osad / materjal',akt:'akt / tunnistus',kooskolastus:'kooskõlastus',muu:'muu'};
  const kulu=t.kirjed.filter(k=>!k.kustutatud).reduce((x,k)=>x+(k.kulu||0),0);
  $('#too_vaade').innerHTML='<div class="kaart" id="too_k"><h2 style="margin-top:0">Töökäsk: '+esc(t.seade_nimi)+' <span class="vaike">'+esc(t.invnr)+'</span></h2>'+
   '<p>'+esc(t.hooldaja_nimi)+' · alates '+esc(t.kuupaev)+' · kehtib kuni '+esc(new Date(t.kehtib_kuni).toLocaleDateString('et-EE'))+' · <b>'+esc(TOO_OLEK[t.olek])+'</b>'+(t.ettepanek?' · '+esc(ETTEP[t.ettepanek]):'')+'</p>'+
   (t.ettepanek_tekst?'<p class="vaike">Hooldaja: '+esc(t.ettepanek_tekst)+'</p>':'')+(t.rike?'<p><b>Tellimus:</b> <span style="white-space:pre-wrap">'+esc(t.rike)+'</span></p>':'')+
   (uus?'<div class="ok">'+ik('ok')+'<span>Töökäsk loodud. PIN: <b style="font-size:20px;letter-spacing:.1em">'+esc(uus.pin_vorm)+'</b> (näidatakse ainult nüüd, see on ka prinditud töökäsul).</span></div><button class="roh" id="too_prindi">🖨 Prindi töökäsk (QR + PIN)</button>':'')+
   '<h3>Sissekanded'+(kulu?' · kokku '+esc(kulu.toFixed(2).replace('.',','))+' €':'')+'</h3>'+(t.kirjed.length?'<table><tr><th>Aeg</th><th>Liik</th><th>Tekst</th><th>Summa</th></tr>'+t.kirjed.map(k=>'<tr'+(k.kustutatud?' style="text-decoration:line-through;opacity:.55"':'')+'><td>'+esc(aeg(k.loodud))+(k.muudetud?'<br><span class="vaike">muudetud '+esc(aeg(k.muudetud))+'</span>':'')+'</td><td>'+esc(K[k.liik]||k.liik)+'</td><td style="white-space:pre-wrap">'+esc(k.tekst)+
     ((k.ajalugu||[]).length?'<details><summary class="vaike">Varasemad versioonid ('+k.ajalugu.length+')</summary>'+k.ajalugu.map(v=>'<div class="vaike" style="white-space:pre-wrap;border-top:1px solid var(--joon);padding:4px 0">'+esc(aeg(v.aeg))+': '+esc(v.tekst)+(v.kulu!=null?' ('+esc(String(v.kulu))+' €)':'')+'</div>').join('')+'</details>':'')+'</td><td>'+(k.kulu!=null?esc(String(k.kulu).replace('.',','))+' €':'')+'</td></tr>').join('')+'</table>':'<p class="vaike">Sissekandeid pole.</p>')+
   '<h3>Failid</h3>'+(t.failid.length?'<ul class="loend">'+t.failid.map(f=>'<li'+(f.kustutatud?' style="text-decoration:line-through;opacity:.55"':'')+'><div class="rida"><span>'+(f.mime==='application/pdf'?'PDF':'Foto')+' · '+esc(f.liik)+(f.nimi?' · '+esc(f.nimi):'')+'<br><span class="vaike">'+esc(aeg(f.aeg))+(f.kustutatud?' · hooldaja eemaldas':'')+'</span></span><button data-tf="'+esc(f.voti)+'">Ava</button></div></li>').join('')+'</ul>':'<p class="vaike">Faile pole.</p>')+
   (lahti?'<h3>Kinnita ja sulge</h3><div class="vorm"><div><label>Seadme olek pärast</label><select id="ts_o"><option value="aktiivne">kasutusel</option><option value="remondis">remondis/hoolduses</option><option value="maha">maha kantud</option></select></div>'+
     '<div><label>Märgi hooldusplaan tehtuks</label><select id="ts_p"><option value="">—</option>'+(s.hooldused||[]).map(h=>'<option value="'+h.id+'">'+esc(h.nimi)+'</option>').join('')+'</select></div></div><input id="ts_m" maxlength="300" placeholder="Märkus ajalukku (valikuline)">'+
     '<div class="rida" style="flex-wrap:wrap"><button class="roh" id="ts_sulge">Kinnita ja sulge</button><button id="ts_pin">Uus PIN ja link</button><button id="ts_tyh">Tühista töökäsk</button></div><p class="vaike">Sulgemisel lähevad sissekanded ja summa seadme hooldusajalukku, hooldaja ligipääs lõpeb.</p>':
     (t.suletud&&Date.now()-t.suletud<14*86400000?'<h3>Ava uuesti</h3><p class="vaike">Kuni '+esc(new Date(t.suletud+14*86400000).toLocaleDateString('et-EE'))+'. Sissekanded ja failid jäävad, luuakse uus link ja PIN. '+(t.olek==='suletud'?'Sulgemise kanne hooldusajaloos märgitakse tühistatuks ja hooldusplaani kuupäevad taastatakse.':'')+'</p>'+
       '<div class="vorm"><div><label>Põhjus *</label><input id="ta_p" maxlength="300" placeholder="nt suleti ekslikult, garantiiremont"></div><div><label>Kehtib (päeva)</label><input id="ta_d" type="number" min="1" max="180" value="30"></div></div><button id="ta_ava">🔁 Ava uuesti</button>':''))+
   ((t.avamised||[]).length?'<p class="vaike">Avatud uuesti: '+t.avamised.map(x=>esc(aeg(x.aeg))+' ('+esc(x.pohjus)+')').join('; ')+'</p>':'')+'<div id="ts_teade"></div></div>';
  $('#too_k').scrollIntoView({behavior:'smooth'});
  document.querySelectorAll('[data-tf]').forEach(b=>b.onclick=async()=>{const r=await fetch('/api/admin/too-fail?k='+encodeURIComponent(b.dataset.tf),{headers:{'Authorization':'Bearer '+TOK}});if(!r.ok){alert('Faili ei leitud.');return;}const u=URL.createObjectURL(await r.blob());window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000);});
  if($('#too_prindi'))$('#too_prindi').onclick=()=>prindiTookask(t,s,uus);
  if($('#ta_ava'))$('#ta_ava').onclick=async()=>{const r=await a('too-ava',{id:t.id,pohjus:$('#ta_p').value,paevi:$('#ta_d').value});if(!r.ok){$('#ts_teade').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;}U=await a('ulevaade');hooldus();tooVaade(t.id,r);};
  if(!lahti)return;
  $('#ts_sulge').onclick=async()=>{if(!confirm('Kinnitada hooldus ja sulgeda töökäsk?'))return;const r=await a('too-sulge',{id:t.id,olek:$('#ts_o').value,plaan:$('#ts_p').value||undefined,markus:$('#ts_m').value});if(!r.ok){$('#ts_teade').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;}U=await a('ulevaade');hooldus();};
  $('#ts_tyh').onclick=async()=>{if(!confirm('Tühistada töökäsk? Hooldaja ligipääs lõpeb.'))return;const r=await a('too-tuhista',{id:t.id});if(!r.ok){alert(r.viga);return;}U=await a('ulevaade');hooldus();};
  $('#ts_pin').onclick=async()=>{if(!confirm('Vana PIN ja link lakkavad kohe töötamast. Jätkata?'))return;const r=await a('too-uus-pin',{id:t.id});if(!r.ok){alert(r.viga);return;}tooVaade(t.id,r);};}
// Töökäsk A4 (tellimus): klient, seade, tellimus, hooldaja, kehtivus, hoolduse QR (link) ja PIN. Link ja PIN näidatakse ainult loomisel.
function prindiTookask(t,s,v){const f=U.seaded.firma||'',h=(U.hooldajad||[]).find(x=>x.id===t.hooldaja)||{},link='HTTPS://'+location.host.toUpperCase()+'/H/'+v.link;
  const r=(k,x)=>x?'<tr><td style="color:#555;padding:1.2mm 4mm 1.2mm 0;width:42mm">'+k+'</td><td style="padding:1.2mm 0"><b>'+esc(x)+'</b></td></tr>':'';
  $('#print').innerHTML='<div style="font-family:Instrument Sans,Arial,sans-serif;font-size:3.6mm;color:#1C1C1A;max-width:180mm;margin:0 auto">'+
   '<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:.4mm solid #1C1C1A;padding-bottom:2mm"><div style="font:700 6mm Instrument Sans,Arial"><span style="color:#A33B20">K</span> | Krativara</div><div>'+esc(f)+'</div></div>'+
   '<h1 style="font:500 9mm Newsreader,Georgia,serif;margin:6mm 0 2mm">Hoolduse töökäsk</h1><p style="margin:0 0 5mm;color:#555">Tellimus nr '+esc(t.id)+' · '+esc(t.kuupaev)+' · kehtib kuni '+esc(new Date(t.kehtib_kuni).toLocaleDateString('et-EE'))+'</p>'+
   '<div style="display:flex;gap:8mm;align-items:flex-start"><table style="border-collapse:collapse;flex:1">'+r('Tellija',f)+r('Seade',s.nimi||t.seade_nimi)+r('Inventarinumber',t.invnr)+r('Tootja / mudel',[s.tootja,s.mudel].filter(Boolean).join(' '))+r('Seerianumber',s.seerianr)+
     r('Hooldaja',h.nimi||t.hooldaja_nimi)+r('Kontakt',[h.kontakt,h.tel,h.epost].filter(Boolean).join(', '))+r('Arve',[h.arve_epost,h.regkood?'reg '+h.regkood:''].filter(Boolean).join(', '))+'</table>'+
     '<div style="text-align:center;width:52mm">'+qrSvg(link).replace('<svg ','<svg style="width:50mm;height:50mm" ')+'<div style="font-size:3mm;color:#555">Skänni hoolduse vaate avamiseks</div></div></div>'+
   '<h2 style="font:500 6mm Newsreader,Georgia,serif;margin:6mm 0 2mm">Tellimus / rikke kirjeldus</h2><div style="border:.3mm solid #999;border-radius:1.5mm;padding:3mm;min-height:24mm;white-space:pre-wrap">'+esc(t.rike||'')+'</div>'+
   '<div style="margin-top:6mm;border:.4mm solid #1C1C1A;border-radius:1.5mm;padding:3mm 4mm"><b>Hooldajale:</b> skänni ülal olev QR telefoni kaameraga. Lisa vastuvõtul foto seisukorrast, tööde kirjeldus, aktid ja arve; vigu saad parandada kuni omanik töö kinnitab. '+
     'Kui see leht pole käepärast: skänni seadme kleebist ja sisesta PIN, mille saad omanikult eraldi.</div>'+
   '<p style="font-size:2.8mm;color:#555;margin-top:4mm">Ligipääs kehtib ainult sellele seadmele kuni '+esc(new Date(t.kehtib_kuni).toLocaleDateString('et-EE'))+' või töökäsu sulgemiseni. Ära jaga seda lehte kõrvalistele isikutele.</p></div>'+
   // PIN eraldi lehel (kontrolli leid 10.11.2026): töökäsk liigub koos seadmega, PIN antakse hooldajale eraldi (käest kätte, SMS, e-kiri)
   '<div style="page-break-before:always;font-family:Instrument Sans,Arial,sans-serif;color:#1C1C1A;max-width:180mm;margin:0 auto;padding-top:10mm">'+
   '<div style="border:.4mm dashed #999;border-radius:1.5mm;padding:6mm;width:100mm"><div style="font:700 4mm Instrument Sans,Arial"><span style="color:#A33B20">K</span> | Krativara · hoolduse PIN</div>'+
   '<p style="margin:3mm 0 1mm;font-size:3.4mm">'+esc(s.nimi||t.seade_nimi)+' · '+esc(t.invnr)+'<br>'+esc(h.nimi||t.hooldaja_nimi)+' · kehtib kuni '+esc(new Date(t.kehtib_kuni).toLocaleDateString('et-EE'))+'</p>'+
   '<div style="font:700 10mm monospace;letter-spacing:1.5mm;margin:3mm 0">'+esc(v.pin_vorm)+'</div><p style="font-size:2.8mm;color:#555;margin:0">Skänni seadme kleebist ja sisesta PIN. Hoia töökäsust eraldi.</p></div></div>';
  document.fonts.load('700 10px "Instrument Sans"').catch(()=>{}).then(()=>window.print());}
function bron(){ const l=U.broneeringud||[];
  $('#sisu').innerHTML='<h2>📅 Broneeringud ('+l.length+')</h2>'+(l.length?'<table><tr><th>Seade</th><th>Kes</th><th>Periood</th><th>Märkus</th><th></th></tr>'+l.map(b=>'<tr><td>'+esc(b.seade)+'</td><td>'+esc(b.nimi)+'<br><a href="tel:'+esc(b.tel)+'">'+esc(b.tel)+'</a></td><td>'+esc(b.algus)+' – '+esc(b.lopp)+'</td><td>'+esc(b.markus||'')+'</td><td><button class="v" data-abtyh="'+esc(b.id)+'" data-kood="'+esc(b.kood)+'">Tühista</button></td></tr>').join('')+'</table>':'<p class="vaike">Kehtivaid broneeringuid pole.</p>');
  document.querySelectorAll('[data-abtyh]').forEach(x=>x.onclick=async()=>{if(!confirm('Tühistada broneering?'))return;const j=await a('bron-tyhista',{kood:x.dataset.kood,id:x.dataset.abtyh});j.ok?(U=await a('ulevaade'),naita()):alert(j.viga);});}

function ulevaade(){
  const kasut=U.seadmed.filter(s=>s.kellel).sort((x,y)=>x.kellel.alates-y.kellel.alates);
  const piir=U.seaded.hoiata_paevi, t30=new Date(Date.now()+U.seaded.taatlus_hoiatus_paevi*86400000).toISOString().slice(0,10);
  const taatlus=U.seadmed.filter(s=>!s.kustutatud&&s.olek!=='maha'&&s.taatlus_kuni&&s.taatlus_kuni<=t30).sort((x,y)=>x.taatlus_kuni<y.taatlus_kuni?-1:1);
  const ootel=U.kasutajad.filter(k=>k.olek==='ootel'&&!k.kustutatud);
  $('#sisu').innerHTML=
   (U.vaidlused.length?'<h2>❗ Vaidlused ('+U.vaidlused.length+')</h2><table>'+U.vaidlused.map(v=>'<tr><td><b>'+esc(v.seadme_nimi)+'</b><br>'+esc(aeg(v.vaidlus_aeg))+'</td><td>'+esc(v.eelmine&&v.eelmine.nimi)+' vaidlustab, et '+esc(v.uus&&v.uus.nimi)+(v.liik==='ulevott'?' võttis üle':' märkis tagastatuks')+':<br>„'+esc(v.tekst)+'“</td><td><button class="v" data-vaidlus="'+esc(v.voti)+'">Lahendatud</button></td></tr>').join('')+'</table>':'')+
   (ootel.length?'<h2>👤 Ootavad kinnitust ('+ootel.length+')</h2><table>'+ootel.map(k=>'<tr><td>'+esc(k.nimi)+'</td><td>'+esc(k.tel)+'</td><td><button class="v roh" data-kinnita="'+k.id+'">Kinnita</button><button class="v" data-peata="'+k.id+'">Keeldu</button></td></tr>').join('')+'</table>':'')+
   (U.kinnitused.length?'<h2>🔁 Kinnitamata ülevõtud ('+U.kinnitused.length+')</h2><p class="vaike">Need kasutajad ei saa uusi seadmeid võtta enne, kui vastavad.</p><table>'+U.kinnitused.map(x=>'<tr><td>'+esc(x.kasutaja)+'</td><td>'+esc(x.seadme_nimi)+'</td><td>'+esc(x.uus&&x.uus.nimi)+(x.liik==='ulevott'?' võttis üle ':' märkis tagastatuks ')+esc(aeg(x.aeg))+'</td><td><button class="v" data-keeld="'+x.kasutaja_id+'">Eemalda keeld</button></td></tr>').join('')+'</table>':'')+
   (U.margmed.length?'<h2>⚠️ Märkused ('+U.margmed.length+')</h2><table>'+U.margmed.map(m=>{const s=U.seadmed.find(s=>s.kood===m.kood)||{};return '<tr><td><b>'+esc(s.nimi)+'</b><br><span class="vaike">'+esc(s.invnr)+'</span></td><td>'+esc({ei_toota:'Ei tööta',taatlus:'Vajab taatlemist/kalibreerimist',kahjustus:'Kahjustatud',tarvik:'Tarvik puudu',muu:'Muu'}[m.tyyp])+(m.tekst?': '+esc(m.tekst):'')+(m.foto?' <a href="#" data-foto="'+esc(m.foto)+'">📷</a>':'')+'<br><span class="vaike">'+esc(m.nimi)+', '+esc(aeg(m.aeg))+'</span></td><td><button class="v" data-marge="'+esc(m.voti)+'">Lahendatud</button></td></tr>';}).join('')+'</table>':'')+
   (taatlus.length?'<h2>📏 Taatlus/kalibreerimine aegub või aegunud</h2><table>'+taatlus.map(s=>'<tr><td>'+esc(s.nimi)+'</td><td>'+esc(s.invnr)+'</td><td>'+esc(s.taatlus_kuni)+'</td><td>'+(s.kellel?esc(s.kellel.nimi):'')+'</td></tr>').join('')+'</table>':'')+
   '<h2>📋 Kasutuses ('+kasut.length+' / '+U.seadmed.filter(s=>!s.kustutatud&&s.olek!=='maha').length+')</h2><table><tr><th>Seade</th><th>Kellel</th><th>Alates</th><th>Päevi</th><th></th></tr>'+
   kasut.map(s=>'<tr class="'+(paevi(s.kellel.alates)>piir?'vana':'')+'"><td><b>'+esc(s.nimi)+'</b><br><span class="vaike">'+esc(s.invnr)+'</span></td><td>'+esc(s.kellel.nimi)+'<br><a href="tel:'+esc(s.kellel.tel)+'">'+esc(s.kellel.tel)+'</a></td><td>'+esc(aeg(s.kellel.alates))+(s.kellel.koht?'<br>'+esc(s.kellel.koht):'')+'</td><td>'+paevi(s.kellel.alates)+'</td><td><button class="v" data-tagasta="'+s.kood+'">Tagasta (haldur)</button></td></tr>').join('')+'</table>';
  const nupp=(sel,f)=>document.querySelectorAll(sel).forEach(b=>b.onclick=f);
  nupp('[data-vaidlus]',async e=>{const otsus=prompt('Otsus / märkus:')||'';const j=await a('vaidlus-lahenda',{voti:e.target.dataset.vaidlus,otsus});j.ok?lae():alert(j.viga);});
  nupp('[data-marge]',async e=>{const otsus=prompt('Mis tehti? (valikuline)')||'';const j=await a('marge-lahenda',{voti:e.target.dataset.marge,otsus});j.ok?lae():alert(j.viga);});
  nupp('[data-keeld]',async e=>{if(!confirm('Eemaldada kasutaja kõik kinnitamata ülevõtud?'))return;const j=await a('kinnitused-eemalda',{id:e.target.dataset.keeld});j.ok?lae():alert(j.viga);});
  nupp('[data-tagasta]',async e=>{if(!confirm('Registreerida tagastus halduri poolt?'))return;const j=await a('tagasta',{kood:e.target.dataset.tagasta});j.ok?lae():alert(j.viga);});
  nupp('[data-kinnita]',async e=>{const j=await a('kasutaja',{id:e.target.dataset.kinnita,olek:'aktiivne'});j.ok?lae():alert(j.viga);});
  nupp('[data-peata]',async e=>{const j=await a('kasutaja',{id:e.target.dataset.peata,olek:'blokeeritud'});j.ok?lae():alert(j.viga);});
}

// ---------- eeltrükitud koodid (partiid) ----------
// Haldur otsustab iga seadme puhul: „Lisa seade“ tühja koodiga = uus kood ja oma silt (🖨 Sildid), või eeltrükitud kleebise kood.
let PARTIID=[];
async function laePartiid(){const j=await a('partiid');PARTIID=j.ok?j.partiid:[];return PARTIID;}
const vabad=p=>p.koodid.filter(k=>!k.nimi).map(k=>k.kood);
async function partiid(teade){
  peata(); await laePartiid();
  $('#sisu').innerHTML='<h2>📦 Eeltrükitud koodid (partiid)</h2><div class="kaart"><p class="vaike">Genereeri koodid ette, prindi või saada trükikotta. Kleebis pannakse seadmele ja seadme lisamisel sisestad (või valid) selle koodi väljale „Kood“. Sidumata koodi skännimisel näeb leidja „See kood ei ole veel kasutusel“.</p>'+
   '<div class="vorm"><div><label>Kogus (1–200)</label><input id="p_n" type="number" min="1" max="200" value="24"></div><div><label>Märkus (valikuline)</label><input id="p_nimi" maxlength="60" placeholder="nt trükikoda nov 2026"></div></div><button class="roh" id="p_loo">Genereeri</button><div id="p_teade">'+(teade||'')+'</div></div>'+
   (PARTIID.length?PARTIID.map(p=>{const v=vabad(p);return '<div class="kaart"><b>'+esc(aeg(p.aeg))+'</b>'+(p.nimi?' · '+esc(p.nimi):'')+' · koode '+p.koodid.length+', vabu <b>'+v.length+'</b>'+
     '<div><button class="v" data-pa="silt" data-p="'+p.id+'">🖨 Krativara sildid (vabad)</button><button class="v" data-pa="kleebis" data-p="'+p.id+'">🖨 Kleebised valikutega (vabad)</button><button class="v" data-pa="csv" data-p="'+p.id+'">⬇ CSV</button></div>'+
     '<details><summary>Koodid</summary><table><tr><th>Kood</th><th>Seade</th><th></th></tr>'+p.koodid.map(k=>'<tr><td class="vaike">'+k.kood+'</td><td>'+(k.nimi?esc(k.nimi)+' '+esc(k.invnr)+(k.kustutatud?' (kustutatud)':''):'<span class="vaike">vaba</span>')+'</td><td>'+(k.nimi?'':'<button class="v" data-seo="'+k.kood+'">Seo seadmega</button>')+'</td></tr>').join('')+'</table></details></div>';}).join(''):'<p class="vaike">Partiisid pole.</p>')+
   '<button id="p_tagasi">← Seadmed</button>';
  $('#p_tagasi').onclick=()=>seadmed();
  $('#p_loo').onclick=async()=>{const j=await a('partii',{kogus:+$('#p_n').value,nimi:$('#p_nimi').value});
    if(!j.ok){$('#p_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} partiid('<div class="ok">Loodud '+j.partii.koodid.length+' koodi.</div>');};
  document.querySelectorAll('[data-seo]').forEach(b=>b.onclick=()=>seoKood(b.dataset.seo));
  document.querySelectorAll('[data-pa]').forEach(b=>b.onclick=()=>{const p=PARTIID.find(x=>x.id===b.dataset.p);if(!p)return;const v=vabad(p),act=b.dataset.pa;
    if(act==='csv'){const r=['kood;url;seade;inventarinr'].concat(p.koodid.map(k=>[k.kood,qrUrl('S',k.kood),k.nimi||'',k.invnr||''].map(x=>{if(/^[=+\\-@\\t\\r]/.test(x))x="'"+x;return /[;"\\n\\r]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(';')));alla('koodid-'+p.aeg+'.csv','\\ufeff'+r.join('\\r\\n'),'text/csv');return;}
    if(!v.length){alert('Vabu koode pole.');return;}
    if(act==='silt')prindiSildid(v.map(k=>({kood:k,nimi:'',invnr:''})));
    else if(act==='kleebis')kleebisPaneel(v,String(p.aeg));});
}
function seoKood(kood){seadmed(null,kood);}
function alla(nimi,tekst,mime){const l=document.createElement('a'),u=URL.createObjectURL(new Blob([tekst],{type:mime}));l.href=u;l.download=nimi;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function qrM(url){const m=window.qrMatrix(url),n=m.length;let p='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])p+='M'+c+' '+r+'h1v1h-1z';return {n:n,p:p};}
const mmS=x=>String(+x.toFixed(3));
// Kleebised valikutega (Margo 10.11.2026): sama koodiga QR-ide arv, suurus 100–60 %, leidja kleebis „TEATA LEIUST“ / oma tekst / ilma.
// Valik jääb selles brauseris meelde. Üks kood = üks rida, read samas järjekorras (lõikamine lihtne), kood halliga rea lõpus.
function kleebisValikLoe(){try{return JSON.parse(localStorage.getItem('qw_kleebis')||'{}')||{};}catch(e){return {};}}
function kvRead(koodid,valik){return koodid.map(k=>({kood:k,osad:kvRida(qrM(qrUrl('S',k)),valik)}));}
function kvKontrolli(valik){const o=kvRida(qrM(qrUrl('S','ABCDEFGHJK01')),valik);const w=o.reduce((x,[l])=>x+l,0)+(o.length-1)*4+14;if(w>190)throw new Error('Rida ei mahu A4-le ('+Math.round(w)+' mm): vali vähem QR-e või väiksem suurus.');}
async function prindiKleebised(koodid,valik){await document.fonts.load('700 10px "Instrument Sans"').catch(()=>{});
  $('#print').innerHTML='<div class="kleeb">'+kvRead(koodid,valik).map(r=>'<div class="krida">'+r.osad.map(([w,h,g])=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+mmS(w)+' '+mmS(h)+'" style="width:'+mmS(w)+'mm;height:'+mmS(h)+'mm">'+g+'</svg>').join('')+'<span class="k" style="align-self:center;color:#666">'+r.kood+'</span></div>').join('')+'</div>';
  window.print();}
function kleebisedSvg(koodid,valik){let y=0,W=0,g='';
  kvRead(koodid,valik).forEach(r=>{let x=0,H=0;r.osad.forEach(([w,h,s])=>{g+='<g transform="translate('+mmS(x)+' '+mmS(y)+')">'+s+'</g>';x+=w+4;H=Math.max(H,h);});
    g+='<text x="'+mmS(x)+'" y="'+mmS(y+H/2)+'" font-family="monospace" font-size="2.5" fill="#666" dominant-baseline="central">'+r.kood+'</text>';W=Math.max(W,x+22);y+=H+2;});
  return '<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="'+mmS(W)+'mm" height="'+mmS(y-2)+'mm" viewBox="0 0 '+mmS(W)+' '+mmS(y-2)+'">'+g+'</svg>\\n';}
// Valikute paneel: koodid = seadmete või partii koodid; nimi = failinime osa
function kleebisPaneel(koodid,nimi){const v=Object.assign({mastaap:1,qr:3,leidja:'teata',ylal:(U.seaded.firma||'').slice(0,20),all:''},kleebisValikLoe());v.ylal=String(v.ylal||'').slice(0,20);v.all=String(v.all||'').slice(0,20);
  const el=document.createElement('div');el.className='kaart';el.id='kv_paneel';
  el.innerHTML='<h2>Kleebised ('+koodid.length+' koodi)</h2><div class="vorm">'+
   '<div><label>Suurus</label><select id="kv_m">'+[1,0.9,0.8,0.7,0.6].map(m=>'<option value="'+m+'"'+(+v.mastaap===m?' selected':'')+'>'+Math.round(m*100)+' %'+(m===1?' (QR 19,5 mm)':m===0.6?' (QR 11,7 mm, proovi enne)':'')+'</option>').join('')+'</select></div>'+
   '<div><label>Sama koodiga QR-e (ilma tekstita)</label><select id="kv_q">'+[0,1,2,3,4,5,6].map(n=>'<option'+(+v.qr===n?' selected':'')+'>'+n+'</option>').join('')+'</select></div>'+
   '<div><label>Leidja kleebis (Kindaveli raam)</label><select id="kv_l"><option value="teata"'+(v.leidja==='teata'?' selected':'')+'>„TEATA LEIUST“ neljal küljel</option><option value="tekst"'+(v.leidja==='tekst'?' selected':'')+'>oma tekst kahel küljel</option><option value="pole"'+(v.leidja==='pole'?' selected':'')+'>ilma leidja kleebiseta</option></select></div>'+
   '<div id="kv_t"><label>Tekst üleval (kuni 20 märki)</label><input id="kv_y" maxlength="20" value="'+esc(v.ylal)+'"><label>Tekst all (kuni 20 märki)</label><input id="kv_a" maxlength="20" value="'+esc(v.all)+'" placeholder="nt telefon või „KRATIVARA“"></div></div>'+
   '<div id="kv_eel" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:var(--pind);border-radius:var(--raadius);margin:8px 0"></div><div id="kv_teade"></div>'+
   '<div class="rida" style="flex-wrap:wrap"><button class="roh" id="kv_prindi">🖨 Prindi</button><button id="kv_svg">⬇ SVG (trükikojale)</button><button id="kv_sulge">Sulge</button></div><p class="vaike">Prindi 100 % suuruses (ilma „sobita lehele“ valikuta). Pärast trükki proovi skännimist, eriti 60–70 % puhul.</p>';
  const vana=$('#kv_paneel');if(vana)vana.remove();$('#sisu').prepend(el);window.scrollTo(0,0);
  const loe=()=>({mastaap:+$('#kv_m').value,qr:+$('#kv_q').value,leidja:$('#kv_l').value,ylal:$('#kv_y').value,all:$('#kv_a').value});
  const uuenda=()=>{$('#kv_t').hidden=$('#kv_l').value!=='tekst';let valik;
    try{valik=kvValik(loe());kvKontrolli(valik);}catch(e){$('#kv_teade').innerHTML='<div class="viga">'+esc(e.message)+'</div>';$('#kv_eel').innerHTML='';return null;}
    $('#kv_teade').innerHTML=valik.leidja==='tekst'&&(U.seaded.firma||'').length>20&&$('#kv_y').value===U.seaded.firma.slice(0,20)?'<div class="teave">Firma nimi lühendati 20 märgini. Kirjuta vajadusel lühem kuju (nt ilma „OÜ“).</div>':'';try{localStorage.setItem('qw_kleebis',JSON.stringify(loe()));}catch(e){}
    const r=kvRead([koodid[0]],valik)[0];$('#kv_eel').innerHTML=r.osad.map(([w,h,g])=>'<svg viewBox="0 0 '+mmS(w)+' '+mmS(h)+'" style="width:'+(w*3.2).toFixed(1)+'px;height:'+(h*3.2).toFixed(1)+'px">'+g+'</svg>').join('')+'<span class="vaike">'+koodid[0]+' (eelvaade 1 : 1 ekraanil ligikaudu)</span>';return valik;};
  ['kv_m','kv_q','kv_l','kv_y','kv_a'].forEach(i=>$('#'+i).oninput=$('#'+i).onchange=uuenda);uuenda();
  $('#kv_prindi').onclick=()=>{const v=uuenda();if(v)prindiKleebised(koodid,v);};
  $('#kv_svg').onclick=()=>{const v=uuenda();if(v)alla('kleebised-'+nimi+'.svg',kleebisedSvg(koodid,v),'image/svg+xml');};
  $('#kv_sulge').onclick=()=>el.remove();}
// ---------- dokumendid ja pildilt lugemine (Margo 10.11.2026) ----------
const DOK_LIIGID={arve:'arve',tsekk:'tšekk',andmesilt:'andmesilt',garantii:'garantii',juhend:'kasutusjuhend',muu:'muu'};
let DOK_UUS=[], DOK_EEM=new Set(), HOOLD=[];
async function vahendaPilt(fail,max){const url=URL.createObjectURL(fail);try{const img=await new Promise((ok,ei)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ei;i.src=url;});
  const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=img.naturalWidth*k|0;c.height=img.naturalHeight*k|0;c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.85));}finally{URL.revokeObjectURL(url);}}
async function aPost(tee,blob){const r=await fetch('/api/admin/'+tee,{method:'POST',headers:{'Authorization':'Bearer '+TOK,'Content-Type':blob.type||'application/octet-stream'},body:blob});let j={};try{j=await r.json()}catch(e){}j.status=r.status;return j;}
async function avaDok(v){const r=await fetch('/api/admin/dokument?k='+encodeURIComponent(v),{headers:{'Authorization':'Bearer '+TOK}});if(!r.ok){alert('Faili ei leitud.');return;}
  const u=URL.createObjectURL(await r.blob());window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000);}
const AI_VALJAD=[['nimi','s_nimi','Nimi'],['tootja','s_tootja','Tootja'],['mudel','s_mudel','Mudel'],['seerianr','s_seerianr','Seerianr'],['ost_kuupaev','s_ostkp','Ostukuupäev'],['ost_hind','s_hind','Hind km-ta'],['ost_muuja','s_muuja','Müüja'],['garantii_kuni','s_garantii','Garantii kuni']];
function aiTulemus(e){const taidetud=[],muud=[];
  for(const [k,id,silt] of AI_VALJAD){let v=e[k];if(v==null||v==='')continue;if(k==='ost_hind')v=String(v).replace('.',',');const el=$('#'+id);if(!el)continue;
    if(!el.value.trim()){el.value=v;el.style.outline='2px solid var(--aktsent)';taidetud.push(silt);} else if(el.value.trim()!==v)muud.push([id,silt,v]);}
  let h=taidetud.length?'<div class="ok">Täidetud fotolt: '+esc(taidetud.join(', '))+'. Kontrolli üle.</div>':'';
  if(e.ost_hind==null&&e.ost_hind_km!=null)h+='<div class="teave">Fotol on hind km-ga '+esc(String(e.ost_hind_km).replace('.',','))+' €. Km-ta hinna sisesta ise.</div>';
  if(e.aasta)h+='<div class="teave">Valmistamise aasta fotolt: '+esc(e.aasta)+' (lisa vajadusel lisainfosse).</div>';
  if(muud.length)h+='<div class="kaart"><b>Fotol on teisiti</b>'+muud.map(([id,silt,v],i)=>'<div class="rida" style="margin-top:6px"><span>'+esc(silt)+': <b>'+esc(v)+'</b></span><button type="button" data-aiv="'+i+'">Kasuta</button></div>').join('')+'</div>';
  if(!h)h='<div class="teave">Fotolt ei õnnestunud midagi kindlalt lugeda. Täida väljad käsitsi.</div>';
  $('#d_ai').innerHTML=h;document.querySelectorAll('[data-aiv]').forEach(b=>b.onclick=()=>{const [id,,v]=muud[+b.dataset.aiv];$('#'+id).value=v;$('#'+id).style.outline='2px solid var(--aktsent)';b.disabled=true;b.textContent='Kasutatud';});}
function dokSeo(s){DOK_UUS=[];DOK_EEM=new Set();
  const joonista=()=>{const vanad=(s.dokumendid||[]).filter(d=>!d.kustutatud);
    $('#d_list').innerHTML=vanad.concat(DOK_UUS.map(d=>({...d,uus:true}))).map(d=>'<li><div class="rida"><span>'+(d.mime==='application/pdf'?'PDF':'Foto')+' · <b>'+esc(DOK_LIIGID[d.liik]||d.liik)+'</b>'+(d.nimi?' · '+esc(d.nimi):'')+'<br><span class="vaike">'+esc(aeg(d.aeg))+' · '+Math.round(d.suurus/1024)+' kB'+(d.uus?' · <b>uus, salvestub seadmega</b>':'')+(DOK_EEM.has(d.voti)?' · <b>eemaldatakse</b>':'')+'</span></span>'+
      '<button type="button" data-dava="'+esc(d.voti)+'">Ava</button>'+(d.uus?'':'<button type="button" data-deem="'+esc(d.voti)+'">'+(DOK_EEM.has(d.voti)?'Tühista':'Eemalda')+'</button>')+'</div></li>').join('');
    document.querySelectorAll('[data-dava]').forEach(b=>b.onclick=()=>avaDok(b.dataset.dava));
    document.querySelectorAll('[data-deem]').forEach(b=>b.onclick=()=>{const v=b.dataset.deem;DOK_EEM.has(v)?DOK_EEM.delete(v):DOK_EEM.add(v);joonista();});};
  const valitud=async el=>{const f=el.files&&el.files[0];el.value='';if(!f)return;const t=$('#d_teade'),liik=$('#d_liik').value;
    if(!U.foto_olemas){t.innerHTML='<div class="viga">Failide hoidla (R2, FOTOD) ei ole seadistatud.</div>';return;}
    if(f.size>10*1024*1024){t.innerHTML='<div class="viga">Fail on liiga suur (kuni 10 MB).</div>';return;}
    t.innerHTML='<div class="vaike">Salvestan originaali…</div>';
    const j=await aPost('dokument?liik='+liik+'&nimi='+encodeURIComponent(f.name.slice(0,80)),f);
    if(!j.ok){t.innerHTML='<div class="viga">'+esc(j.viga||'Üleslaadimine ebaõnnestus')+'</div>';return;}
    DOK_UUS.push(j.dokument);joonista();t.innerHTML='<div class="ok">Salvestatud ('+esc(DOK_LIIGID[liik])+'). Seotakse seadmega, kui vajutad „'+(s.kood?'Salvesta':'Lisa seade')+'“.</div>';
    if(!$('#d_loe')||!$('#d_loe').checked||!f.type.startsWith('image/'))return;
    $('#d_ai').innerHTML='<div class="vaike">Loen fotolt…</div>';
    try{const b=await vahendaPilt(f,1600);const r=await aPost('loe?liik='+(liik==='andmesilt'?'andmesilt':'arve'),b);
      if(!r.ok){$('#d_ai').innerHTML='<div class="hoiatus">'+esc(r.viga||'Lugemine ebaõnnestus')+'</div>';return;} aiTulemus(r.ettepanek);}
    catch(e){$('#d_ai').innerHTML='<div class="hoiatus">Fotot ei saanud lugeda. Täida väljad käsitsi.</div>';}};
  $('#d_kaamera').onchange=e=>valitud(e.target);$('#d_fail').onchange=e=>valitud(e.target);joonista();}
// ---------- hooldusplaanid (Margo 10.11.2026) ----------
const KORDUSED=[[6,'2× aastas (6 kuud)'],[12,'1× aastas (12 kuud)'],[24,'1× 2 aasta jooksul (24 kuud)'],[3,'iga 3 kuu järel'],[36,'iga 3 aasta järel']];
function hooldusSeo(s,muuda){HOOLD=(s.hooldused||[]).map(h=>({...h}));
  const joonista=()=>{$('#h_list').innerHTML=HOOLD.map((h,i)=>'<div class="kaart" style="margin:8px 0"><div class="vorm">'+
     '<div><label>Mis hooldus *</label><input data-h="'+i+'" data-k="nimi" maxlength="60" value="'+esc(h.nimi||'')+'" placeholder="nt hooldus, filtrite vahetus"></div>'+
     '<div><label>Kordus</label><select data-h="'+i+'" data-k="intervall">'+KORDUSED.concat(KORDUSED.some(x=>x[0]===+h.intervall)?[]:[[+h.intervall,'iga '+h.intervall+' kuu järel']]).map(([v,t])=>'<option value="'+v+'"'+(+h.intervall===v?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
     '<div><label>Viimati tehtud</label><input type="date" data-h="'+i+'" data-k="viimati" value="'+esc(h.viimati||'')+'"></div>'+
     '<div><label>Järgmine (tühi = viimati + kordus)</label><input type="date" data-h="'+i+'" data-k="jargmine" value="'+esc(h.id&&h.jargmine?h.jargmine:(h.jargmine||''))+'"></div>'+
     '<div><label>Meeldetuletus (päeva enne)</label><input type="number" min="0" max="180" data-h="'+i+'" data-k="hoiatus_paevi" value="'+esc(h.hoiatus_paevi==null?14:h.hoiatus_paevi)+'"></div></div>'+
     '<div class="rida" style="flex-wrap:wrap">'+(muuda&&h.id&&(s.hooldused||[]).some(x=>x.id===h.id)?'<button type="button" data-htehtud="'+i+'">✓ Tehtud</button>':'')+'<button type="button" data-heem="'+i+'">Eemalda</button></div>'+
     '<div id="ht_'+i+'"></div></div>').join('')||'<p class="vaike">Hooldusplaane pole.</p>';
    document.querySelectorAll('[data-h]').forEach(el=>el.oninput=el.onchange=()=>{const h=HOOLD[+el.dataset.h],k=el.dataset.k;h[k]=el.value;if(k==='viimati'||k==='intervall'){if(h.viimati&&k!=='jargmine'){h.jargmine='';const j=$('[data-h="'+el.dataset.h+'"][data-k="jargmine"]');if(j)j.value='';}}});
    document.querySelectorAll('[data-heem]').forEach(b=>b.onclick=()=>{HOOLD.splice(+b.dataset.heem,1);joonista();});
    document.querySelectorAll('[data-htehtud]').forEach(b=>b.onclick=()=>{const i=+b.dataset.htehtud,h=HOOLD[i],t=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Tallinn'});
      $('#ht_'+i).innerHTML='<div class="vorm"><div><label>Tehtud *</label><input type="date" id="ht_kp" max="'+t+'" value="'+t+'"></div><div><label>Kulu € (valikuline)</label><input id="ht_kulu" inputmode="decimal"></div><div><label>Tegija</label><input id="ht_teg" maxlength="80" value="'+esc(h.tegija||'')+'"></div></div><input id="ht_mark" maxlength="300" placeholder="Märkus (valikuline)"><button type="button" class="roh" id="ht_salv">Salvesta hooldus</button><div id="ht_teade"></div>';
      $('#ht_salv').onclick=async()=>{const j=await a('hooldus-tehtud',{kood:muuda.kood,id:h.id,kuupaev:$('#ht_kp').value,kulu:$('#ht_kulu').value.trim(),tegija:$('#ht_teg').value,markus:$('#ht_mark').value});
        if(!j.ok){$('#ht_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} U=await a('ulevaade'); seadmed(U.seadmed.find(x=>x.kood===muuda.kood)); $('#s_teade').innerHTML='<div class="ok">Hooldus salvestatud, järgmine '+esc(j.hooldus.jargmine)+'.</div>';};});};
  $('#h_lisa').onclick=()=>{HOOLD.push({nimi:'',intervall:12,viimati:'',jargmine:'',hoiatus_paevi:14});joonista();};joonista();
  if(muuda) a('hooldused?kood='+muuda.kood).then(j=>{const l=j.hooldused||[];if(!l.length)return;$('#h_list').insertAdjacentHTML('afterend','<details style="margin-top:8px"><summary>Hoolduste ajalugu ('+l.length+')</summary><table><tr><th>Kuupäev</th><th>Hooldus</th><th>Tegija</th><th>Kulu</th><th>Märkus</th></tr>'+
    l.map(x=>'<tr'+(x.tyhistatud?' style="text-decoration:line-through;opacity:.55" title="'+esc(x.tyhistus||'')+'"':'')+'><td>'+esc(x.kuupaev)+'</td><td>'+esc(x.nimi)+'</td><td>'+esc(x.tegija)+'</td><td>'+(x.kulu==null?'':esc(String(x.kulu).replace('.',','))+' €')+'</td><td>'+esc(x.markus)+'</td></tr>').join('')+'</table></details>');});}
function seadmed(muuda,seo){
  peata(); const s=muuda||{};
  $('#sisu').innerHTML='<h2>'+(muuda?'Muuda seadet':'Lisa seade')+'</h2><div class="kaart"><div class="vorm">'+
   '<div><label>Nimi *</label><input id="s_nimi" value="'+esc(s.nimi)+'"></div><div><label>Tüüp</label><input id="s_tyyp" value="'+esc(s.tyyp)+'" placeholder="nt nivelliir, laserkaugusmõõtja"></div>'+
   '<div><label>Inventarinumber</label><input id="s_invnr" value="'+esc(s.invnr)+'" placeholder="'+(muuda?'':'tühi = automaatne (nt L1-2611001)')+'"></div><div><label>Seerianumber</label><input id="s_seerianr" value="'+esc(s.seerianr)+'"></div>'+
   '<div><label>Tootja</label><input id="s_tootja" maxlength="60" value="'+esc(s.tootja)+'" placeholder="nt Leica, Bosch"></div><div><label>Mudel</label><input id="s_mudel" maxlength="60" value="'+esc(s.mudel)+'"></div>'+
   '<div><label>Taatlus/kalibreerimine kehtib kuni</label><input id="s_taatlus" type="date" value="'+esc(s.taatlus_kuni)+'"></div>'+
   '<div><label>Taatluse intervall (kuud, valikuline)</label><input id="s_intervall" type="number" min="1" max="120" value="'+esc(s.taatlus_intervall||'')+'"></div>'+
   '<div><label>Olek</label><select id="s_olek">'+Object.entries(OLEK).map(([k,t])=>'<option value="'+k+'"'+(s.olek===k?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
   '<div><label>'+(muuda?'Koduladu':'Ladu, kus registreeritakse *')+'</label><select id="s_asukoht">'+kohaValik(s.koduladu)+'</select></div>'+
   (muuda?'':'<div style="grid-column:1/-1"><label>Kood: tühi = uus kood (prindi silt) või eeltrükitud kleebise kood</label><div class="rida"><input id="s_kood" list="s_vabad" style="max-width:260px;font-family:monospace" value="'+esc(seo||'')+'" placeholder="tühi = uus kood"><button type="button" id="s_skann" style="flex:0 0 auto">📷 Skänni</button></div><datalist id="s_vabad"></datalist><div id="s_kaamera" hidden><video id="s_video"></video><button type="button" id="s_ksulge">Sulge kaamera</button></div><div id="s_kinfo"></div></div>')+
   '</div><label>Lisainfo (kasutajad näevad)</label><textarea id="s_lisa" rows="2">'+esc(s.lisainfo)+'</textarea>'+
   '<h3 style="margin:18px 0 4px">Dokumendid ja pildilt lugemine</h3><p class="vaike" style="margin:0 0 6px">Arve, tšekk või andmesilt. Originaal (foto või PDF) salvestatakse. '+(U.ai_olemas?'Fotolt loetakse väljad ettepanekuna: tühjad väljad täidetakse, teised näed allpool. Kontrolli enne salvestamist.':'Pildilt lugemine on välja lülitatud (Workers AI side puudub).')+'</p>'+
   '<div class="rida" style="flex-wrap:wrap"><select id="d_liik" style="flex:1 1 160px">'+Object.entries(DOK_LIIGID).map(([k,t])=>'<option value="'+k+'">'+t+'</option>').join('')+'</select>'+
   '<label class="nupp" style="margin:4px 0 10px;flex:0 0 auto">📷 Pildista<input type="file" id="d_kaamera" accept="image/*" capture="environment" hidden></label>'+
   '<label class="nupp" style="margin:4px 0 10px;flex:0 0 auto">Vali fail<input type="file" id="d_fail" accept="image/jpeg,image/png,image/webp,application/pdf" hidden></label></div>'+
   (U.ai_olemas?'<label class="mark"><input type="checkbox" id="d_loe" checked><span>Loe andmed fotolt (arve/tšekk: ost ja seade; andmesilt: tootja, mudel, seerianr)</span></label>':'')+
   '<div id="d_teade"></div><div id="d_ai"></div><ul class="loend" id="d_list"></ul>'+
   '<h3 style="margin:18px 0 4px">Ost ja garantii <span class="vaike">(näeb ainult haldur)</span></h3><div class="vorm">'+
   '<div><label>Ostukuupäev</label><input id="s_ostkp" type="date" value="'+esc(s.ost_kuupaev||'')+'"></div><div><label>Hind km-ta (€)</label><input id="s_hind" inputmode="decimal" value="'+esc(s.ost_hind==null?'':String(s.ost_hind).replace('.',','))+'"></div>'+
   '<div><label>Müüja</label><input id="s_muuja" maxlength="80" value="'+esc(s.ost_muuja)+'"></div><div><label>Garantii kuni</label><input id="s_garantii" type="date" value="'+esc(s.garantii_kuni||'')+'"></div></div>'+
   '<div class="vorm"><div><label>Vaikimisi hooldaja</label><select id="s_hooldaja"><option value="">—</option>'+(U.hooldajad||[]).filter(h=>h.aktiivne!==false||h.id===s.hooldaja).map(h=>'<option value="'+h.id+'"'+(s.hooldaja===h.id?' selected':'')+'>'+esc(h.nimi)+'</option>').join('')+'</select></div></div>'+
   (muuda?(s.too?'<div class="hoiatus">'+ik('mootja')+'<span>Seadmel on avatud hoolduse töökäsk. Vaata vahekaardilt „Hooldus“.</span></div>':'<button type="button" id="s_hooldusse">'+ik('mootja')+'Saada hooldusesse (töökäsk)</button>'):'')+
   '<h3 style="margin:18px 0 4px">Hooldus (korduv)</h3><p class="vaike" style="margin:0 0 6px">Nt hooldus 1× aastas, filtrid 2× aastas, kontroll 1× 2 aasta jooksul. Läheb kalendrisse; üle tähtaja on hoiatus, võtmist ei keela.</p><div id="h_list"></div><button type="button" id="h_lisa">+ Lisa hooldus</button>'+
   '<div style="height:14px"></div>'+
   '<button class="roh" id="s_salv">'+(muuda?'Salvesta':'Lisa seade')+'</button> '+(muuda?'<button id="s_loobu">Loobu</button> <button id="s_ajalugu">Ajalugu</button>':'')+'<div id="s_teade"></div><div id="s_aj"></div></div>'+
   (muuda?'<h2>📏 Registreeri taatlus / kalibreerimine</h2><div class="kaart"><div class="vorm"><div><label>Kuupäev *</label><input type="date" id="t_kp"></div><div><label>Tunnistuse nr</label><input id="t_tun"></div>'+
     '<div><label>Tegija (labor)</label><input id="t_teg" value="'+esc(s.taatlus_tegija||'')+'"></div><div><label>Tulemus *</label><select id="t_tul"><option value="sobib">sobib</option><option value="ei_sobi">ei sobi (→ remonti)</option></select></div>'+
     '<div><label>Järgmine tähtaeg (tühi = kuupäev + intervall)</label><input type="date" id="t_j"></div></div><input id="t_mark" placeholder="Märkus (valikuline)" maxlength="300">'+
     '<button class="roh" id="t_salv">Salvesta taatlus</button> <button id="t_oleku">Saada taatlusele (olek)</button><div id="t_teade"></div><div id="t_ajalugu"></div></div>':'')+
   '<h2>Seadmed ('+U.seadmed.length+')</h2><div class="rida"><input id="filter" placeholder="Filtreeri"><button id="prindi" style="flex:0 0 auto">🖨 Sildid</button><button id="kleebised" style="flex:0 0 auto">🖨 Kleebised</button><button id="kataloog" style="flex:0 0 auto">📖 Kataloog</button><button id="partiid" style="flex:0 0 auto">📦 Eeltrükitud koodid</button></div><p class="vaike">Sildid (seadme QR) kleebitakse seadmele. Kataloog (eraldi QR, ainult otsinguks) pannakse lattu; sellega ei saa seadet võtta.</p>'+
   '<table id="st"><tr><th><input type="checkbox" id="koik" style="width:auto"></th><th>Nimi</th><th>Inv/seeria</th><th>Taatlus</th><th>Olek</th><th>Kellel / asukoht</th><th>Kood</th><th></th></tr>'+
   U.seadmed.map(x=>'<tr data-kood="'+x.kood+'"'+kustStiil(x)+'><td><input type="checkbox" class="vali" value="'+x.kood+'" style="width:auto"></td><td><a href="#" data-muuda="'+x.kood+'">'+esc(x.nimi)+'</a><br><span class="vaike">'+esc(x.tyyp)+'</span></td><td>'+esc(x.invnr)+'<br><span class="vaike">'+esc(x.seerianr)+'</span></td><td>'+esc(x.taatlus_kuni||'')+'</td><td>'+OLEK[x.olek]+'</td><td>'+(x.kellel?esc(x.kellel.nimi):esc(x.asukoht_nimi))+'</td><td class="vaike">'+x.kood+'</td><td>'+kustNupp('seade',x.kood,x)+'</td></tr>').join('')+'</table>'+
   '<p><button id="csv">⬇ Seadmed CSV</button></p>';
  $('#s_salv').onclick=async()=>{const j=await a('seade',{kood:muuda?muuda.kood:undefined,uus_kood:$('#s_kood')?$('#s_kood').value.trim():undefined,nimi:$('#s_nimi').value,tyyp:$('#s_tyyp').value,invnr:$('#s_invnr').value,seerianr:$('#s_seerianr').value,taatlus_kuni:$('#s_taatlus').value,taatlus_intervall:$('#s_intervall').value,olek:$('#s_olek').value,asukoht:$('#s_asukoht').value,lisainfo:$('#s_lisa').value,
      tootja:$('#s_tootja').value,mudel:$('#s_mudel').value,hooldaja:$('#s_hooldaja').value,ost_kuupaev:$('#s_ostkp').value,ost_hind:$('#s_hind').value.trim(),ost_muuja:$('#s_muuja').value,garantii_kuni:$('#s_garantii').value,
      hooldused:HOOLD.map(h=>({id:h.id,nimi:h.nimi,intervall:+h.intervall,viimati:h.viimati||'',jargmine:h.jargmine||'',hoiatus_paevi:h.hoiatus_paevi===''?'':+h.hoiatus_paevi})),
      dokumendid_lisa:DOK_UUS.map(d=>d.voti),dokumendid_eemalda:[...DOK_EEM]});
    if(!j.ok){$('#s_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} U=await a('ulevaade'); seadmed(); $('#s_teade').innerHTML='<div class="ok">Salvestatud: '+esc(j.seade.nimi)+' ('+j.seade.kood+')</div>';};
  dokSeo(s); hooldusSeo(s,muuda); if($('#s_hooldusse'))$('#s_hooldusse').onclick=()=>{TAB='hooldus';tabs();hooldus(muuda.kood);};
  if($('#s_loobu'))$('#s_loobu').onclick=()=>seadmed();
  $('#partiid').onclick=()=>partiid();
  if($('#s_skann')){
    const info=h=>{$('#s_kinfo').innerHTML=h;};
    const sulge=()=>{peata();$('#s_kaamera').hidden=true;};
    // Loetud kood: ainult seadme QR (/S/ samal aadressil) või sildilt käsitsi loetav 12-märgine kood. Olek: vaba partiist / juba seadmel / uus.
    const loetud=t=>{const r=koodTekstist(t,location.host),k=r?(r.liik==='S'?r.kood:null):kasitsiKood(t);
      if(!k){info('<div class="viga">'+(r?'See on '+(r.liik==='K'?'töökoha':'kataloogi')+' QR-kood, mitte seadme kood.':'Tundmatu QR-kood (vale aadress või vorm).')+'</div>');return;}
      sulge();$('#s_kood').value=k;
      const sd=U.seadmed.find(x=>x.kood===k), pk=PARTIID.flatMap(p=>p.koodid).find(x=>x.kood===k);
      info(sd?'<div class="viga">Kood '+k+' on juba seadmel: '+esc(sd.nimi)+'.</div>':pk&&pk.nimi?'<div class="viga">Kood '+k+' on kasutatud ('+esc(pk.nimi)+').</div>':pk?'<div class="ok">Eeltrükitud kood '+k+' loetud (vaba). Täida väljad ja vajuta „Lisa seade“.</div>':'<div class="hoiatus">Kood '+k+' loetud, aga see ei ole üheski partiis. Selle võib siduda (nt varem prinditud silt).</div>');
      $('#s_nimi').focus();};
    $('#s_skann').onclick=()=>{info('');$('#s_kaamera').hidden=false;kaamera($('#s_video'),loetud,t=>{sulge();info('<div class="viga">'+esc(t)+'</div>');});};
    $('#s_ksulge').onclick=sulge;
  }
  if(!muuda)laePartiid().then(l=>{const d=$('#s_vabad');if(d)d.innerHTML=l.flatMap(vabad).map(k=>'<option value="'+k+'">').join('');});
  if(seo){$('#s_kood').scrollIntoView();$('#s_nimi').focus();}
  if($('#t_salv')){
    const lae_t=async()=>{const j=await a('taatlused?kood='+muuda.kood);$('#t_ajalugu').innerHTML=(j.taatlused||[]).length?'<table><tr><th>Kuupäev</th><th>Tulemus</th><th>Tunnistus</th><th>Tegija</th><th>Järgmine</th></tr>'+j.taatlused.map(t=>'<tr><td>'+esc(t.kuupaev)+'</td><td>'+(t.tulemus==='sobib'?'sobib':'<b>ei sobi</b>')+'</td><td>'+esc(t.tunnistus)+'</td><td>'+esc(t.tegija)+'</td><td>'+esc(t.jargmine||'')+'</td></tr>').join('')+'</table>':'<p class="vaike">Taatlusi pole registreeritud.</p>';};
    lae_t();
    $('#t_salv').onclick=async()=>{const j=await a('taatlus',{kood:muuda.kood,kuupaev:$('#t_kp').value,tunnistus:$('#t_tun').value,tegija:$('#t_teg').value,tulemus:$('#t_tul').value,jargmine:$('#t_j').value,markus:$('#t_mark').value});
      if(!j.ok){$('#t_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} U=await a('ulevaade'); seadmed(U.seadmed.find(x=>x.kood===muuda.kood)); $('#t_teade').innerHTML='<div class="ok">Taatlus salvestatud'+(j.taatlus.jargmine?', järgmine '+esc(j.taatlus.jargmine):'')+'.</div>';};
    $('#t_oleku').onclick=async()=>{const x=muuda;const j=await a('seade',{kood:x.kood,nimi:x.nimi,tyyp:x.tyyp,invnr:x.invnr,seerianr:x.seerianr,taatlus_kuni:x.taatlus_kuni||'',taatlus_intervall:x.taatlus_intervall||'',olek:'taatlusel',asukoht:x.koduladu||'',lisainfo:x.lisainfo});
      if(!j.ok){alert(j.viga);return;} U=await a('ulevaade'); seadmed(U.seadmed.find(y=>y.kood===x.kood));};
  }
  if($('#s_ajalugu'))$('#s_ajalugu').onclick=async()=>{const j=await a('logi?kood='+muuda.kood);$('#s_aj').innerHTML=logiTabel(j.logi||[]);};
  document.querySelectorAll('[data-muuda]').forEach(l=>l.onclick=e=>{e.preventDefault();seadmed(U.seadmed.find(x=>x.kood===l.dataset.muuda));window.scrollTo(0,0);});
  $('#filter').oninput=()=>{const q=$('#filter').value.toLowerCase();document.querySelectorAll('#st tr[data-kood]').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q));};
  $('#koik').onchange=e=>document.querySelectorAll('#st tr[data-kood]:not([hidden]) .vali').forEach(c=>c.checked=e.target.checked);
  $('#prindi').onclick=()=>{const v=[...document.querySelectorAll('.vali:checked')].map(c=>U.seadmed.find(x=>x.kood===c.value));if(!v.length){alert('Vali seadmed');return;}prindiSildid(v);};
  $('#kleebised').onclick=()=>{const v=[...document.querySelectorAll('.vali:checked')].map(c=>c.value);if(!v.length){alert('Vali seadmed');return;}kleebisPaneel(v,'seadmed');};
  $('#kataloog').onclick=()=>{let v=[...document.querySelectorAll('.vali:checked')].map(c=>U.seadmed.find(x=>x.kood===c.value));if(!v.length)v=U.seadmed.filter(x=>x.olek!=='maha');prindiKataloog(v.sort((a,b)=>(a.invnr||'').localeCompare(b.invnr||'')));};
  $('#csv').onclick=()=>lae_alla('seadmed.csv');
}
function qrSvg(tekst){const m=window.qrMatrix(tekst),n=m.length,q=4,w=n+2*q;let d='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])d+='M'+(x+q)+' '+(y+q)+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';}
const qrUrl=(liik,kood)=>'HTTPS://'+location.host.toUpperCase()+'/'+liik+'/'+kood;
function prindiKataloog(v){$('#print').innerHTML='<div style="font-family:Arial,sans-serif"><h1 style="font-size:6mm">'+esc(U.seaded.firma)+' – seadmete kataloog</h1><p style="font-size:3mm">Skänni rakenduses „Kus on seade?“ → 📷 QR. Kataloogi QR-iga seadet võtta ei saa.</p><table style="width:100%;border-collapse:collapse;font-size:3.5mm">'+
  v.map(s=>'<tr style="break-inside:avoid;border-bottom:0.2mm solid #999"><td style="width:24mm;padding:1mm">'+qrSvg(qrUrl('I',s.kood)).replace('<svg ','<svg style="width:22mm;height:22mm" ')+'</td><td><b>'+esc(s.nimi)+'</b><br>'+esc(s.invnr||'')+' '+esc(s.tyyp||'')+'</td><td>'+esc(s.koduladu_nimi||'')+'</td></tr>').join('')+'</table></div>';window.print();}
function prindiSildid(v){$('#print').innerHTML='<div class="sildid">'+v.map(s=>'<div class="silt">'+qrSvg(qrUrl('S',s.kood))+'<div>'+esc(s.nimi.slice(0,40))+'</div><div class="k">'+esc(s.invnr||'')+' '+s.kood+'</div></div>').join('')+'</div>';window.print();}
function prindiPlakat(k){$('#print').innerHTML='<div class="plakat"><h1>'+esc(U.seaded.firma)+'</h1><h2>'+esc(k.nimi)+'</h2>'+qrSvg(qrUrl('K',k.kood))+
  '<ol><li>Skänni see kood telefoni kaameraga.</li><li>Esimesel korral registreeru (nimi, telefon, parool). Edaspidi oled sisse logitud.</li><li>Vajuta <b>Võta seade</b> või <b>Tagasta seade</b> ja skänni seadmel olev QR-kood.</li></ol></div>';window.print();}

function kohad(){
  $('#sisu').innerHTML='<h2>Töökohad</h2><p class="vaike">Töökoha QR-kood pannakse lattu / objektile. Selle skännimine avab registri; uued kasutajad saavad registreeruda ainult töökoha koodiga.</p>'+
   '<table><tr><th>Nimi</th><th>Lühend</th><th>Registreerimine</th><th>Kood</th><th></th></tr>'+U.kohad.map(k=>'<tr'+kustStiil(k)+'><td>'+esc(k.nimi)+'</td><td>'+esc(k.lyhend||'')+'</td><td>'+esc(k.registreerimine||'vaikimisi ('+U.seaded.registreerimine+')')+'</td><td class="vaike">'+k.kood+'</td><td><button class="v" data-plakat="'+k.kood+'">🖨 Prindi QR</button><button class="v" data-kmuuda="'+k.kood+'">Muuda</button>'+kustNupp('koht',k.kood,k)+'</td></tr>').join('')+'</table>'+
   '<h2 id="kpealk">Lisa töökoht</h2><div class="kaart"><input type="hidden" id="k_kood"><label>Nimi</label><input id="k_nimi" placeholder="nt Ladu Tartu mnt / Objekt X"><label>Lühend inventarinumbris (tühi = automaatne L1, L2…)</label><input id="k_lyh" maxlength="6" autocapitalize="characters"><label>Uute kasutajate registreerimine</label><select id="k_reg"><option value="">vaikimisi (seadetest)</option><option value="vaba">vaba</option><option value="kinnitamisega">administraatori kinnitusega</option></select><button class="roh" id="k_salv">Salvesta</button><div id="k_teade"></div></div>';
  document.querySelectorAll('[data-plakat]').forEach(b=>b.onclick=()=>prindiPlakat(U.kohad.find(k=>k.kood===b.dataset.plakat)));
  document.querySelectorAll('[data-kmuuda]').forEach(b=>b.onclick=()=>{const k=U.kohad.find(k=>k.kood===b.dataset.kmuuda);$('#k_kood').value=k.kood;$('#k_nimi').value=k.nimi;$('#k_lyh').value=k.lyhend||'';$('#k_reg').value=k.registreerimine||'';$('#kpealk').textContent='Muuda töökohta';});
  $('#k_salv').onclick=async()=>{const j=await a('koht',{kood:$('#k_kood').value||undefined,nimi:$('#k_nimi').value,lyhend:$('#k_lyh').value,registreerimine:$('#k_reg').value||null});if(!j.ok){$('#k_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}U=await a('ulevaade');kohad();};
}

function kasutajad(){
  const O={aktiivne:'aktiivne',ootel:'ootab kinnitust',blokeeritud:'peatatud'};
  $('#sisu').innerHTML='<h2>Kasutajad ('+U.kasutajad.length+')</h2><table><tr><th>Nimi</th><th>Telefon</th><th>Olek</th><th>Seadmeid</th><th>Hilinenud tagastusi</th><th>Kinnitamata</th><th>Super­kasutaja</th><th></th></tr>'+
   U.kasutajad.map(k=>'<tr'+kustStiil(k)+'><td>'+esc(k.nimi)+'</td><td><a href="tel:'+esc(k.tel)+'">'+esc(k.tel)+'</a></td><td>'+O[k.olek]+'</td><td>'+k.seadmeid+'</td><td>'+(k.hilinenud||0)+'</td><td>'+k.kinnitamata+'</td><td><input type="checkbox" style="width:auto" data-super="'+k.id+'"'+(k.super?' checked':'')+'></td><td>'+
    (k.olek!=='aktiivne'?'<button class="v roh" data-olek="aktiivne" data-id="'+k.id+'">Aktiveeri</button>':'<button class="v" data-olek="blokeeritud" data-id="'+k.id+'">Peata</button>')+
    '<button class="v" data-lahtesta="'+k.id+'">Taastuskood</button>'+(k.kinnitamata?'<button class="v" data-keeld="'+k.id+'">Eemalda keeld</button>':'')+kustNupp('kasutaja',k.id,k)+'</td></tr>').join('')+'</table>';
  document.querySelectorAll('[data-super]').forEach(c=>c.onchange=async()=>{const j=await a('kasutaja',{id:c.dataset.super,super:c.checked});if(!j.ok){alert(j.viga);c.checked=!c.checked;}else U=await a('ulevaade');});
  document.querySelectorAll('[data-olek]').forEach(b=>b.onclick=async()=>{const j=await a('kasutaja',{id:b.dataset.id,olek:b.dataset.olek});j.ok?(U=await a('ulevaade'),kasutajad()):alert(j.viga);});
  document.querySelectorAll('[data-lahtesta]').forEach(b=>b.onclick=async()=>{const j=await a('lahtesta',{id:b.dataset.lahtesta});alert(j.ok?'Taastuskood: '+j.kood+'\\nKehtib 24 h. Anna see kasutajale (sisselogimise lehel „Unustasid parooli?“).':j.viga);});
  document.querySelectorAll('[data-keeld]').forEach(b=>b.onclick=async()=>{const j=await a('kinnitused-eemalda',{id:b.dataset.keeld});j.ok?(U=await a('ulevaade'),kasutajad()):alert(j.viga);});
}
const SYND={broneering:'broneeris',broneering_tyhistatud:'tühistas broneeringu',taatlus_tehtud:'taatlus registreeritud',kustutatud:'kustutatud (taastatav 30 p)',taastatud:'taastatud',lopp_kustutatud:'lõplikult kustutatud',vott:'võttis',tagastus:'tagastas',ulevott:'võttis üle',tagastus_teise_eest:'märkis tagastatuks teise eest',kinnitas:'kinnitas ülevõtu',vaidlus:'vaidlustas',marge:'märkus',registreerus:'registreerus',leiuteade:'leiuteade',tagastus_halduri_poolt:'haldur tagastas',seade_lisatud:'seade lisatud',seade_muudetud:'seade muudetud',kasutaja_kinnitatud:'kasutaja aktiveeritud',kasutaja_peatatud:'kasutaja peatatud',keeld_eemaldatud:'keeld eemaldatud',super_antud:'superkasutaja õigus antud',super_eemaldatud:'superkasutaja õigus eemaldatud',taastuskood:'taastuskood antud',parool_taastatud:'parool taastatud',marge_lahendatud:'märkus lahendatud',vaidlus_lahendatud:'vaidlus lahendatud'};
function logiTabel(l){const sn=k=>(U.seadmed.find(s=>s.kood===k)||{}).nimi||k||'';
  return '<table><tr><th>Aeg</th><th>Sündmus</th><th>Seade</th><th>Kes</th><th>Lisa</th></tr>'+l.map(x=>'<tr><td>'+esc(aeg(x.aeg))+'</td><td>'+esc(SYND[x.tyyp]||x.tyyp)+'</td><td>'+esc(sn(x.kood||x.leidkood))+'</td><td>'+esc(x.nimi||'')+'</td><td>'+esc([x.eelmise_nimi&&('eelmine: '+x.eelmise_nimi),x.uus&&('uus: '+x.uus),x.marge,x.tekst,x.kontakt,x.linn,x.gps&&('📍 '+x.gps.lat+','+x.gps.lon)].filter(Boolean).join(' · '))+(x.foto?' <a href="#" data-foto="'+esc(x.foto)+'">📷 foto</a>':'')+'</td></tr>').join('')+'</table>';}
document.addEventListener('click',async e=>{const f=e.target.closest&&e.target.closest('[data-foto]'); if(!f) return; e.preventDefault();
  const r=await fetch('/api/admin/foto?k='+encodeURIComponent(f.dataset.foto),{headers:{'Authorization':'Bearer '+TOK}}); if(!r.ok){alert('Fotot ei leitud');return;}
  const u=URL.createObjectURL(await r.blob()); const w=window.open(u,'_blank'); if(!w){location.href=u;}});
async function logi(){const j=await a('logi');$('#sisu').innerHTML='<h2>Logi (viimased 300)</h2><p><button id="csv">⬇ Logi CSV</button></p>'+logiTabel(j.logi||[]);$('#csv').onclick=()=>lae_alla('logi.csv');}
function seaded(){const s=U.seaded;
  $('#sisu').innerHTML='<h2>Seaded</h2><div class="kaart vorm"><div><label>Firma nimi</label><input id="e_firma" value="'+esc(s.firma)+'"></div><div><label>Kontakttelefon leidjale (valikuline)</label><input id="e_tel" value="'+esc(s.telefon||'')+'"></div>'+
  '<div><label>Seadmeid korraga ühe kasutaja nimel</label><input id="e_max" type="number" min="1" max="200" value="'+s.max_seadmeid+'"></div>'+
  '<div><label>Registreerimine (vaikimisi)</label><select id="e_reg"><option value="vaba"'+(s.registreerimine==='vaba'?' selected':'')+'>vaba</option><option value="kinnitamisega"'+(s.registreerimine==='kinnitamisega'?' selected':'')+'>administraatori kinnitusega</option></select></div>'+
  '<div><label>Hoiata, kui kasutuses üle (päeva)</label><input id="e_hp" type="number" min="0" max="365" value="'+s.hoiata_paevi+'"></div><div><label>Taatluse hoiatus (päeva enne)</label><input id="e_tp" type="number" min="0" max="365" value="'+s.taatlus_hoiatus_paevi+'"></div>'+
  '<div><label>Foto võtmisel/tagastamisel'+(U.foto_olemas?'':' (R2 side FOTOD puudub, foto on välja lülitatud)')+'</label><select id="e_foto">'+['ei','valikuline','kohustuslik'].map(v=>'<option'+(s.foto===v?' selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
  '<div><label class="mark"><input type="checkbox" id="e_tb"'+(s.taatlus_blokeerib?' checked':'')+'><span>Aegunud taatlusega seadet ei saa võtta</span></label></div></div><button class="roh" id="e_salv">Salvesta</button><div id="e_teade"></div>'+
  '<h2>📆 Kalender (Outlook / Google)</h2><div class="kaart"><p class="vaike">Taatluste tähtajad (meeldetuletus '+s.taatlus_hoiatus_paevi+' päeva ette) ja broneeringud. Outlookis: Kalender → Lisa kalender → Veebist → kleebi link. Link on salajane: kes selle saab, näeb seadmete nimesid ja broneerijaid.</p>'+
  '<input id="k_link" readonly value="'+(s.kalender_token?esc(location.origin+'/api/kalender/'+s.kalender_token+'.ics'):'')+'" placeholder="Link puudub"><button id="k_loo">'+(s.kalender_token?'Loo uus link (vana lakkab töötamast)':'Loo kalendri link')+'</button> <button id="k_kop">Kopeeri</button></div>'+
  '<h2>Pildilt lugemine (arve, tšekk, andmesilt)</h2><div class="kaart"><p class="vaike">'+(U.ai_olemas?'Workers AI on seotud. Mudel Meta Llama 3.2 Vision vajab esimesel korral litsentsiga nõustumist. Päevas kuni '+U.ai_paevas+' lugemist.':'Workers AI side (AI) puudub: lisa wrangler.toml-i plokk [ai] ja tee uus deploy.')+'</p>'+
   (U.ai_olemas?(s.ai_litsents?'<div class="ok">Nõustutud '+esc(aeg(s.ai_litsents.aeg))+'</div>':'')+'<button id="ai_lits">Nõustun pildimudeli litsentsiga</button><div id="ai_teade"></div>':'')+'</div>'+
  '<h2>🔔 Teavitused</h2><div class="kaart"><p class="vaike">Saadab testteate Telegrami (TG_BOT_TOKEN, TG_CHAT_ID) ja ntfy-sse (NTFY_TOPIC). Vea korral näed põhjust.</p><button id="t_test">Saada testteade</button><div id="t_teade"></div></div>';
  if($('#ai_lits'))$('#ai_lits').onclick=async()=>{const j=await a('ai-litsents',{});$('#ai_teade').innerHTML=j.ok?'<div class="ok">Nõusolek antud.</div>':'<div class="viga">'+esc(j.viga)+'</div>';if(j.ok)U.seaded.ai_litsents=j.ai_litsents;};
  $('#t_test').onclick=async()=>{$('#t_teade').innerHTML='<div class="vaike">Saadan…</div>';const j=await a('testteade',{});
    const rida=(n,x)=>!x||!x.seatud?n+': seadistamata':x.ok?n+': saadetud ✓':n+': '+(x.viga||'ebaõnnestus');
    $('#t_teade').innerHTML='<div class="'+(j.ok?'ok':'viga')+'">'+esc(j.tg?rida('Telegram',j.tg)+' · '+rida('ntfy',j.ntfy):(j.viga||'Viga'))+'</div>';};
  $('#k_loo').onclick=async()=>{if(s.kalender_token&&!confirm('Vana link lakkab töötamast. Jätkata?'))return;const j=await a('kalender',{uus:true});if(j.ok){U.seaded.kalender_token=j.token;seaded();}else alert(j.viga);};
  $('#k_kop').onclick=async()=>{try{await navigator.clipboard.writeText($('#k_link').value);$('#k_kop').textContent='Kopeeritud ✓';}catch(e){$('#k_link').select();}};
  $('#e_salv').onclick=async()=>{const j=await a('seaded',{firma:$('#e_firma').value,telefon:$('#e_tel').value.trim(),max_seadmeid:+$('#e_max').value,registreerimine:$('#e_reg').value,hoiata_paevi:+$('#e_hp').value,taatlus_hoiatus_paevi:+$('#e_tp').value,taatlus_blokeerib:$('#e_tb').checked,foto:$('#e_foto').value});
    $('#e_teade').innerHTML=j.ok?'<div class="ok">Salvestatud</div>':'<div class="viga">'+esc(j.viga)+'</div>'; if(j.ok)U.seaded=j.seaded;};
}
async function lae_alla(nimi){const r=await fetch('/api/admin/'+nimi,{headers:{'Authorization':'Bearer '+TOK}});if(!r.ok){alert('Viga');return;}const b=await r.blob();const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download=nimi;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
if(TOK) lae();
</script>${lisaJs(nonce, ver)}</body></html>`;
}

// Arendaja vealogi (/dev): võti DEV_TOKEN (Cloudflare'i saladus, ≥ 16 märki). Haldur (ADMIN_TOKEN) seda ei näe.
export function devLeht(nonce, { ver } = {}) {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Krativara vealogi</title><style>${STIIL}
.vk{background:var(--kast);border:1px solid var(--joon);border-radius:8px;padding:8px 10px;margin:6px 0;font-size:.85rem;word-break:break-word}.vk pre{white-space:pre-wrap;font-size:.75rem;margin:4px 0 0}</style></head>
<body><main><h1>Vealogi</h1>
<div id="login" class="kaart"><label>Arendaja võti (DEV_TOKEN)</label><input id="tok" type="password" autocomplete="current-password"><button class="sin" id="sisse">Ava</button><div id="lviga"></div></div>
<div id="app" hidden><p><button id="uuesti">↻ Värskenda</button> <button id="tyhjenda">Tühjenda logi</button></p><div id="loend"></div></div></main>
<script nonce="${nonce}">
${ABI}
let TOK='';try{TOK=sessionStorage.getItem('qw_dev')||'';}catch(e){}
async function d(tee,post){const r=await fetch('/api/dev/'+tee,post?{method:'POST',headers:{'Authorization':'Bearer '+TOK,'Content-Type':'application/json'},body:'{}'}:{headers:{'Authorization':'Bearer '+TOK}});let j={};try{j=await r.json()}catch(e){}j.status=r.status;return j;}
async function lae(){const j=await d('vead');if(!j.ok){$('#login').hidden=false;$('#app').hidden=true;$('#lviga').innerHTML=TOK?'<div class="viga">'+esc(j.viga||'Viga')+'</div>':'';return;}
  $('#login').hidden=true;$('#app').hidden=false;
  $('#loend').innerHTML=j.vead.length?j.vead.map(v=>'<div class="vk"><b>'+esc(v.aeg_tekst)+'</b> · '+esc(v.liik)+' · v'+esc(v.v)+(v.id?' ('+esc(v.id)+')':'')+'<br>'+esc(v.teade)+'<br><small>'+esc(v.leht)+(v.fail?' · '+esc(v.fail)+':'+esc(v.rida)+':'+esc(v.veerg):'')+'</small>'+(v.ua?'<br><small>'+esc(v.ua)+'</small>':'')+(v.stack?'<details><summary>stack</summary><pre>'+esc(v.stack)+'</pre></details>':'')+'</div>').join(''):'<p>Vigu pole (30 päeva).</p>';}
$('#sisse').onclick=()=>{TOK=$('#tok').value.trim();try{sessionStorage.setItem('qw_dev',TOK);}catch(e){}lae();};
$('#uuesti').onclick=lae;
$('#tyhjenda').onclick=async()=>{if(!confirm('Kustutan kogu vealogi?'))return;await d('tyhjenda',true);lae();};
lae();
</script>${lisaJs(nonce, ver)}</body></html>`;
}
