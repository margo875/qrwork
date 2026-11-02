// HTML-lehed: kasutaja rakendus (/, /K/<kood>, /S/<kood>) ja haldus (/admin).
// Välist koodi ei laeta: QR-generaator on src/qrgen.js (MIT), QR-lugeja jsQR /jsqr.js (Apache-2.0) ainult siis,
// kui brauseril pole BarcodeDetector'it. Kõik kasutaja sisestatud väärtused läbivad esc().
import { QR_JS } from './qrgen.js';
import { EXIF_JS } from './exif.js';

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
function laeSkript(src){return new Promise((ok,ei)=>{const s=document.createElement('script');s.src=src;s.nonce=NONCE;s.onload=ok;s.onerror=ei;document.head.appendChild(s);});}`;

const STIIL = `*{box-sizing:border-box}body{font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#f3f4f6;color:#111}
main{max-width:640px;margin:0 auto;padding:16px}h1{font-size:1.35rem;margin:.2rem 0 .6rem}h2{font-size:1.1rem;margin:1.2rem 0 .5rem}
.kaart{background:#fff;border-radius:12px;padding:14px;margin:10px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
button,.nupp{font:inherit;border:0;border-radius:10px;padding:12px 16px;cursor:pointer;background:#e5e7eb;color:#111;text-decoration:none;display:inline-block}
button.suur{display:block;width:100%;font-size:1.25rem;padding:20px;margin:10px 0;font-weight:600}
.roh{background:#15803d;color:#fff}.sin{background:#1d4ed8;color:#fff}.pun{background:#b91c1c;color:#fff}.kol{background:#fde68a}
button:disabled{opacity:.5}input,select,textarea{font:inherit;width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px;margin:4px 0 10px;background:#fff}
label{font-size:.9rem;color:#374151}.vaike{font-size:.85rem;color:#4b5563}.viga{background:#fee2e2;color:#7f1d1d;padding:10px;border-radius:9px;margin:8px 0}
.hoiatus{background:#fef3c7;color:#78350f;padding:8px 10px;border-radius:9px;margin:6px 0}.ok{background:#dcfce7;color:#14532d;padding:10px;border-radius:9px;margin:8px 0}
ul.loend{list-style:none;padding:0;margin:0}ul.loend li{background:#fff;border-radius:10px;padding:10px 12px;margin:6px 0;box-shadow:0 1px 2px rgba(0,0,0,.06)}
video{width:100%;max-height:45vh;background:#000;border-radius:12px;object-fit:cover}.rida{display:flex;gap:8px;align-items:center}.rida>*{flex:1;min-width:0}
.tabs{display:flex;gap:6px;margin:8px 0}.tabs button{flex:1}.tabs .val{background:#1d4ed8;color:#fff}a{color:#1d4ed8}
.mark{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.mark input{width:auto;margin-top:4px}
#uusver{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#1d4ed8;color:#fff;padding:10px 16px;text-align:center}#uusver button{margin-left:8px;background:#fff;color:#1d4ed8;width:auto}
#jalus{color:#6b7280;font-size:.8rem;text-align:center;padding:16px 16px 60px}#jalus button{width:auto;padding:4px 10px;font-size:.8rem}
.lahter{position:relative}.lahter textarea{display:block;padding-bottom:26px}.lahter input{display:block;padding-right:64px}
.lk{position:absolute;right:12px;bottom:18px;font-size:.75rem;line-height:1;color:#6b7280;pointer-events:none}.lk.pk{color:#b91c1c}.lahter.in .lk{bottom:auto;top:50%;transform:translateY(-50%)}
.tapp{display:inline-block;min-width:1.3em;padding:0 .35em;border-radius:1em;background:#dc2626;color:#fff;font-size:.75rem;line-height:1.3em;text-align:center;font-weight:700}`;

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

export function appLeht(nonce, { seade = '', koht = '', info = '', ver } = {}) {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Krativara</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#1d4ed8"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><style>${STIIL}</style></head>
<body><main id="sisu"><p>Laen…</p></main>
<script nonce="${nonce}">
${ABI}
${koodTekstist.toString()}
${kasitsiKood.toString()}
${EXIF_JS}
const URL_SEADE=${JSON.stringify(seade)}, URL_KOHT=${JSON.stringify(koht)}, URL_INFO=${JSON.stringify(info)};
let S={firma:'',koht:null,mina:null};
const LS={get(k){try{return localStorage.getItem(k)||''}catch(e){return ''}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
async function api(tee,keha){
  try{const r=await fetch(tee,{method:'POST',headers:{'Content-Type':'application/json','X-QW':'1'},body:JSON.stringify(keha||{}),credentials:'same-origin'});
    let j={};try{j=await r.json()}catch(e){}j.status=r.status;if(r.status===401&&tee!=='/api/logi-sisse'&&tee!=='/api/parool'){S.mina=null;}return j;}
  catch(e){return {ok:false,viga:'Võrguühendus puudub. Proovi uuesti.'}}
}
const sisu=h=>{peata();$('#sisu').innerHTML=h;window.scrollTo(0,0);};
const pea=()=>'<h1>'+esc(S.firma||'Krativara')+'</h1>';

// ---------- algus ----------
(async function(){
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
  sisu(pea()+'<p>Tere, <b>'+esc(m.kasutaja.nimi)+'</b>'+(S.koht?' · '+esc(S.koht.nimi):'')+'</p>'+(teade||'')+
   (ootel?'<div class="hoiatus">Sinu konto ootab administraatori kinnitust. Seadmeid saad võtta pärast kinnitamist.</div>':'')+
   (m.kinnitamata.length?'<h2>Vajab sinu vastust</h2><p class="vaike">Enne uue seadme võtmist vasta allolevale.</p>'+m.kinnitamata.map(kinnitusHTML).join(''):'')+
   '<button class="suur roh" id="vota"'+(ootel||m.kinnitamata.length?' disabled':'')+'>📥 Võta seade</button>'+
   '<button class="suur sin" id="tagasta"'+(ootel?' disabled':'')+'>📤 Tagasta seade</button>'+
   '<h2>Minu seadmed ('+m.seadmed.length+'/'+m.max_seadmeid+')</h2>'+
   (m.seadmed.length?'<ul class="loend">'+m.seadmed.map(s=>'<li data-kood="'+esc(s.kood)+'"><b>'+esc(s.nimi)+'</b>'+(s.invnr?' <span class="vaike">'+esc(s.invnr)+'</span>':'')+'<br><span class="vaike">alates '+esc(aeg(s.alates))+(paevi(s.alates)>0?' ('+paevi(s.alates)+' p)':'')+'</span>'+(s.bron?'<div class="hoiatus">📅 Broneeritud: '+esc(s.bron.nimi)+' '+esc(s.bron.algus)+' – '+esc(s.bron.lopp)+'. Tagasta õigeks ajaks.</div>':'')+'</li>').join('')+'</ul>':'<p class="vaike">Sinu nimel ei ole praegu ühtegi seadet.</p>')+
   ((m.broneeringud||[]).length?'<h2>Minu broneeringud</h2><ul class="loend">'+m.broneeringud.map(b=>'<li class="bron" data-kood="'+esc(b.kood)+'"><div class="rida"><span><b>'+esc(b.nimi)+'</b> <span class="vaike">'+esc(b.invnr)+'</span><br>📅 '+esc(b.algus)+' – '+esc(b.lopp)+'</span><button style="flex:0 0 auto" data-btyh="'+esc(b.id)+'" data-bkood="'+esc(b.kood)+'">Tühista</button></div></li>').join('')+'</ul>':'')+
   (ootel?'':'<button class="suur" id="otsi">🔍 Kus on seade?</button>')+(m.kasutaja.super?'<button class="suur" id="laod">🏬 Laod ja seis</button>':'')+'<p class="vaike" style="text-align:center"><a href="#" id="valja">Logi välja</a></p>');
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
  return '<label for="'+id+'">📷 '+esc(silt)+(r==='kohustuslik'?' (kohustuslik)':' (valikuline)')+'</label><input type="file" accept="image/*" capture="environment" id="'+id+'"><div id="'+id+'_t"></div>';}
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
function ajaluguHTML(a){return a&&a.length?'<h2>Ajalugu</h2><ul class="loend">'+a.map(x=>'<li><span class="vaike">'+esc(aeg(x.aeg))+'</span> · <b>'+esc(x.nimi)+'</b> '+esc(SILDID[x.tyyp]||x.tyyp)+
  (x.eelmise_nimi?' ('+esc(x.tyyp==='kinnitas'||x.tyyp==='vaidlus'?'uus: ':'eelmine: ')+esc(x.eelmise_nimi)+')':'')+(x.foto?' 📷':'')+'</li>').join('')+'</ul>':'';}

// ---------- skanner ----------
let voog=null, toimib=false, det=null;
function peata(){toimib=false;if(voog){voog.getTracks().forEach(t=>t.stop());voog=null;}}
async function kaamera(video,onTekst,teade){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){teade('Kaamera ei ole selles brauseris saadaval. Sisesta kood käsitsi (seadme sildil).');return;}
  try{voog=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});}
  catch(e){teade('Kaamera luba puudub. Luba kaamera brauseri seadetes või sisesta kood käsitsi.');return;}
  video.srcObject=voog; video.setAttribute('playsinline',''); try{await video.play();}catch(e){}
  if(!det&&'BarcodeDetector' in window){try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes('qr_code'))det=new BarcodeDetector({formats:['qr_code']});}catch(e){}}
  if(!det&&!window.jsQR){try{await laeSkript('/jsqr.js');}catch(e){teade('QR-lugeja laadimine ebaõnnestus. Sisesta kood käsitsi.');return;}}
  toimib=true; const c=document.createElement('canvas'), cx=c.getContext('2d',{willReadFrequently:true});
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
function skanner(reziim){
  const vota=reziim==='vota'; const valik=[];
  sisu('<h1>'+(vota?'📥 Võta seade':'📤 Tagasta seade')+'</h1><p class="vaike">Suuna kaamera seadmel olevale QR-koodile. Võid skännida mitu seadet järjest.</p>'+
   '<video id="vid" muted playsinline></video><div id="teade"></div><ul class="loend" id="valik"></ul>'+
   '<div class="rida"><input id="kasitsi" placeholder="Kood käsitsi (12 märki sildilt)" autocapitalize="characters"><button id="lisa" style="flex:0 0 auto">Lisa</button></div>'+
   fotoHTML('foto_s',vota?'Foto seadmest võtmisel':'Foto seadmest tagastamisel')+
   '<button class="suur '+(vota?'roh':'sin')+'" id="kinnita" disabled>'+(vota?'Võta':'Tagasta')+'</button><button class="suur" id="katkesta">Katkesta</button>');
  const teade=(t,liik)=>{$('#teade').innerHTML=t?'<div class="'+(liik||'viga')+'">'+esc(t)+'</div>':'';};
  const tegevus=x=>{ if(!x.info) return false;
    if(vota) return x.info.vota.lubatud&&(!x.info.vota.vaja_ule||x.ule);
    if(x.info.minu) return true; return !!(x.info.seade.kellel&&x.teise);};
  const joonista=()=>{
    $('#valik').innerHTML=valik.map((x,i)=>{
      const s=x.info.seade,v=x.info.vota,kel=s.kellel; let h='<li><div class="rida"><b>'+esc(s.nimi)+'</b><button data-eemalda="'+i+'" style="flex:0 0 auto;padding:4px 10px">✕</button></div>'+(s.invnr?'<span class="vaike">'+esc(s.invnr)+'</span>':'');
      h+=s.hoiatused.map(t=>'<div class="hoiatus">⚠️ '+esc(t)+'</div>').join('');
      if(vota){
        if(!v.lubatud) h+='<div class="viga">⛔ '+esc(v.pohjus)+'</div>';
        else if(v.vaja_ule) h+='<div class="hoiatus">Seade on registreeritud: <b>'+esc(kel.nimi)+'</b> '+(kel.tel?'(<a href="tel:'+esc(kel.tel)+'">'+esc(kel.tel)+'</a>)':'')+' alates '+esc(aeg(kel.alates))+'.</div>'+
          '<label class="mark"><input type="checkbox" data-ule="'+i+'"'+(x.ule?' checked':'')+'><span>Võtan seadme üle. '+esc(kel.nimi)+' peab kinnitama, et tagastas või andis seadme üle, enne kui saab ise uusi seadmeid võtta.</span></label>';
        else h+='<div class="ok">✅ Valmis võtma</div>';
      } else {
        if(x.info.minu) h+='<div class="ok">✅ Tagastan</div>';
        else if(kel) h+='<div class="hoiatus">See seade on registreeritud: <b>'+esc(kel.nimi)+'</b> alates '+esc(aeg(kel.alates))+', mitte sinu nimel.</div>'+
          '<label class="mark"><input type="checkbox" data-teise="'+i+'"'+(x.teise?' checked':'')+'><span>Seade on siin tagasi, märgin selle tagastatuks '+esc(kel.nimi)+' eest. Tema peab seda hiljem kinnitama.</span></label>';
        else h+='<div class="vaike">ℹ️ Seade ei ole kellegi nimel (juba tagastatud).</div>';
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
  if(!j.ok){sisu(pea()+'<div class="viga">'+(j.status===404?'Tundmatu QR-kood. Pöördu administraatori poole.':esc(j.viga))+'</div><button class="suur" id="tagasi">Tagasi</button>');$('#tagasi').onclick=()=>pohi();return;}
  const s=j.seade,v=j.vota,kel=s.kellel;
  let h=pea()+'<div class="kaart"><h2 style="margin-top:0">'+esc(s.nimi)+'</h2>'+
   (s.tyyp?'<div>Tüüp: '+esc(s.tyyp)+'</div>':'')+(s.invnr?'<div>Inventarinr: '+esc(s.invnr)+'</div>':'')+(s.seerianr?'<div>Seerianr: '+esc(s.seerianr)+'</div>':'')+
   (s.taatlus&&s.taatlus.kuni?'<div>📏 Taatlus/kalibreerimine kehtib kuni: <b>'+esc(s.taatlus.kuni)+'</b>'+(s.taatlus.viimati?'<br><span class="vaike">Viimati '+esc(s.taatlus.viimati)+(s.taatlus.tegija?', '+esc(s.taatlus.tegija):'')+(s.taatlus.tunnistus?', tunnistus '+esc(s.taatlus.tunnistus):'')+'</span>':'')+'</div>':'')+(s.olek!=='aktiivne'?'<div><b>Olek: '+esc(({remondis:'remondis/hoolduses',taatlusel:'taatlusel/kalibreerimisel',maha:'maha kantud'})[s.olek]||s.olek)+'</b></div>':'')+
   (s.lisainfo?'<p class="vaike">'+esc(s.lisainfo)+'</p>':'')+
   (kel?'<div class="'+(j.minu?'ok':'hoiatus')+'">'+(j.minu?'Seade on sinu nimel':'Kasutuses: <b>'+esc(kel.nimi)+'</b> '+(kel.tel?'<a href="tel:'+esc(kel.tel)+'">'+esc(kel.tel)+'</a>':''))+' alates '+esc(aeg(kel.alates))+(kel.koht?' ('+esc(kel.koht)+')':'')+'</div>'
       :'<div class="ok">Vaba'+(s.asukoht?' – '+esc(s.asukoht):'')+'</div>')+
   s.hoiatused.map(t=>'<div class="hoiatus">⚠️ '+esc(t)+'</div>').join('')+'</div>';
  if(skannitud&&(j.minu||v.lubatud||kel)) h+=fotoHTML('foto_k','Foto seadmest');
  if(skannitud){
    if(j.minu) h+='<button class="suur sin" id="tagasta1">📤 Tagasta</button>';
    else if(v.lubatud&&!v.vaja_ule) h+='<button class="suur roh" id="vota1">📥 Võta</button>';
    else if(v.lubatud&&v.vaja_ule) h+='<label class="mark"><input type="checkbox" id="ule1"><span>Võtan seadme üle. '+esc(kel.nimi)+' peab kinnitama, et tagastas või andis seadme üle, enne kui saab ise uusi seadmeid võtta.</span></label><button class="suur roh" id="vota1" disabled>📥 Võta üle</button>';
    else if(!v.juba) h+='<div class="viga">⛔ '+esc(v.pohjus)+'</div>';
    if(!j.minu&&kel&&S.mina&&S.mina.kasutaja.olek==='aktiivne') h+='<label class="mark"><input type="checkbox" id="teise1"><span>Seade on siin tagasi, märgin selle tagastatuks '+esc(kel.nimi)+' eest.</span></label><button class="suur" id="tagastaTeise" disabled>Märgi tagastatuks</button>';
  }
  const aktiivne=S.mina&&S.mina.kasutaja.olek==='aktiivne';
  const tana=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Tallinn'});
  if(aktiivne&&s.olek!=='maha') h+='<h2>📅 Broneeringud</h2><div class="kaart">'+((s.bron||[]).length?'<ul class="loend">'+s.bron.map(b=>'<li><div class="rida"><span>'+esc(b.algus)+' – '+esc(b.lopp)+' · <b>'+esc(b.nimi)+'</b> '+(b.tel?'<a href="tel:'+esc(b.tel)+'">'+esc(b.tel)+'</a>':'')+(b.markus?'<br><span class="vaike">'+esc(b.markus)+'</span>':'')+'</span>'+
     ((b.kasutaja===S.mina.kasutaja.id||S.mina.kasutaja.super)?'<button style="flex:0 0 auto" data-btyh="'+esc(b.id)+'">Tühista</button>':'')+'</div></li>').join('')+'</ul>':'<p class="vaike">Broneeringuid pole.</p>')+
   '<div class="rida"><div><label>Algus</label><input type="date" id="b_algus" min="'+tana+'" value="'+tana+'"></div><div><label>Lõpp</label><input type="date" id="b_lopp" min="'+tana+'" value="'+tana+'"></div></div>'+
   '<input id="b_markus" maxlength="200" placeholder="Märkus (nt objekt), valikuline"><button id="b_saada">Broneeri</button><div id="b_teade"></div></div>';
  if(aktiivne) h+='<h2>Märkus</h2><div class="kaart"><p class="vaike">Registriandmeid muudab administraator. Sina saad lisada märkuse.</p><select id="mtyyp"><option value="">— vali —</option>'+
   Object.entries(j.marke_tyybid).map(([k,t])=>'<option value="'+k+'">'+esc(t)+'</option>').join('')+'</select><textarea id="mtekst" rows="2" maxlength="500" placeholder="Täpsustus (valikuline)"></textarea>'+
   (S.mina&&S.mina.foto!=='ei'?'<label for="foto_m">📷 Foto (valikuline)</label><input type="file" accept="image/*" capture="environment" id="foto_m"><div id="foto_m_t"></div>':'')+'<button id="msaada">Lisa märkus</button><div id="mteade"></div>'+
   (s.margmed.length?'<ul class="loend">'+s.margmed.map(m=>'<li><b>'+esc(j.marke_tyybid[m.tyyp])+'</b> <span class="vaike">'+esc(m.nimi)+', '+esc(aeg(m.aeg))+'</span>'+(m.tekst?'<br>'+esc(m.tekst):'')+'</li>').join('')+'</ul>':'')+'</div>'+
   ajaluguHTML(s.ajalugu)+'<button class="suur" id="tagasi">'+(S.mina?'Avalehele':'Tagasi')+'</button>';
  sisu(h);
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
  sisu(pea()+'<h2>🔍 Kus on seade?</h2><div class="rida"><input id="q" placeholder="Nimi, tüüp või inventarinumber"><button id="qr" style="flex:0 0 auto">📷 QR</button></div>'+
   '<div id="kaam" hidden><video id="vid" muted playsinline></video><div id="teade"></div></div><div id="tul"></div><button class="suur" id="tagasi">Tagasi</button>');
  $('#tagasi').onclick=()=>pohi();
  $('#qr').onclick=()=>{ if(toimib){peata();$('#kaam').hidden=true;return;} $('#kaam').hidden=false;
    kaamera($('#vid'),t=>{const k=koodTekstist(t,location.host);
      if(!k||k.liik==='K'){$('#teade').innerHTML='<div class="viga">'+(k?'See on töökoha QR-kood.':'Tundmatu QR-kood. Pöördu administraatori poole.')+'</div>';if(navigator.vibrate)navigator.vibrate([200,100,200]);return;}
      peata(); seadmeVaade(k.kood,false);},t=>{$('#teade').innerHTML='<div class="hoiatus">'+esc(t)+'</div>';}); };
  let t=null; const otsi=async()=>{const j=await api('/api/otsi',{q:$('#q').value}); if(!j.ok){$('#tul').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}
    if(j.vaja_paringut){$('#tul').innerHTML='<p class="vaike">Kirjuta vähemalt 2 märki või skänni kataloogi QR-kood.</p>';return;}
    $('#tul').innerHTML=j.tulemused.length?'<ul class="loend">'+j.tulemused.map(s=>'<li data-kood="'+esc(s.kood)+'"><b>'+esc(s.nimi)+'</b> <span class="vaike">'+esc(s.invnr)+'</span><br>'+
      (s.kellel?'Kasutuses: <b>'+esc(s.kellel.nimi)+'</b> '+(s.kellel.tel?'<a href="tel:'+esc(s.kellel.tel)+'">'+esc(s.kellel.tel)+'</a>':'')+' alates '+esc(aeg(s.kellel.alates)):(s.olek==='remondis'?'Remondis':'Vaba'+(s.asukoht?' – '+esc(s.asukoht):'')))+
      (s.hoiatused.length?'<br><span class="vaike">⚠️ '+esc(s.hoiatused.join('; '))+'</span>':'')+'</li>').join('')+'</ul>':'<p class="vaike">Ei leitud.</p>';
    document.querySelectorAll('#tul li').forEach(li=>li.onclick=e=>{if(e.target.tagName!=='A')seadmeVaade(li.dataset.kood,false);});};
  $('#q').oninput=()=>{clearTimeout(t);t=setTimeout(otsi,250);}; otsi();
}

// ---------- laod ja seis (superkasutaja) ----------
async function laod(){
  const j=await api('/api/laod',{}); if(!j.ok){alert(j.viga);return;}
  const rida=x=>'<li data-kood="'+esc(x.kood)+'"><b>'+esc(x.nimi)+'</b> <span class="vaike">'+esc(x.invnr)+'</span>'+(x.kellel?'<br><span class="vaike">'+esc(x.kellel)+' '+esc(x.tel)+' alates '+esc(aeg(x.alates))+'</span>':'')+'</li>';
  sisu(pea()+'<h2>🏬 Laod ja seis</h2>'+j.laod.map(l=>'<div class="kaart"><h2 style="margin-top:0">'+esc(l.nimi)+(l.lyhend?' <span class="vaike">('+esc(l.lyhend)+')</span>':'')+'</h2>'+
    '<div>Laos vabad: <b>'+l.vabad.length+'</b> · väljas: <b>'+l.valjas.length+'</b>'+(l.remondis.length?' · remondis: <b>'+l.remondis.length+'</b>':'')+'</div>'+
    (l.vabad.length?'<details><summary>Vabad ('+l.vabad.length+')</summary><ul class="loend">'+l.vabad.map(rida).join('')+'</ul></details>':'')+
    (l.valjas.length?'<details><summary>Väljas ('+l.valjas.length+')</summary><ul class="loend">'+l.valjas.map(rida).join('')+'</ul></details>':'')+
    (l.remondis.length?'<details><summary>Remondis ('+l.remondis.length+')</summary><ul class="loend">'+l.remondis.map(rida).join('')+'</ul></details>':'')+'</div>').join('')+
    '<button class="suur" id="tagasi">Tagasi</button>');
  $('#tagasi').onclick=()=>pohi();
  document.querySelectorAll('li[data-kood]').forEach(li=>li.onclick=()=>seadmeVaade(li.dataset.kood,false));
}

// ---------- leidja (sisse logimata) ----------
// Üle võetud leiamind'ist (Margo 02.11.2026): asukoht lehe avamisel (watchPosition ≤ 30 s, lõpp ≤ 20 m juures, alles jääb kõige täpsem),
// parim lugem saadetakse automaatselt üks kord (/api/asukoht), lehelt lahkumisel sendBeaconiga. Leidjale loendurit ega ootamist ei näidata.
let LW=null;
function leidLopp(){if(LW){LW.lopeta();LW=null;}}
async function leidjaVaade(kood){
  const j=await api('/api/avalik',{kood});
  if(!j.ok){sisu('<h1>Tundmatu QR-kood</h1><div class="viga">Seda koodi ei ole registris. Pöördu administraatori poole.</div>');return;}
  S.firma=j.firma; const T=j.token;
  sisu('<h1>'+esc(j.firma)+'</h1><div class="kaart"><p>See tööriist kuulub firmale <b>'+esc(j.firma)+'</b>:<br><b>'+esc(j.nimi)+'</b>'+(j.invnr?' ('+esc(j.invnr)+')':'')+'</p>'+
   '<p>Leidsid selle? Palun anna teada, kus see on. Aitäh!</p>'+
   '<label for="tekst">Kus seade on / kirjeldus</label><div class="lahter"><textarea id="tekst" rows="3" maxlength="400"></textarea><span class="lk" id="tekst-lk">0/400</span></div>'+
   '<label for="kontakt">Sinu telefon või e-post (valikuline)</label><div class="lahter in"><input id="kontakt" maxlength="100"><span class="lk" id="kontakt-lk">0/100</span></div>'+
   '<p class="vaike">🔒 Sinu nime ega kontaktandmeid ei saadeta, kui sa neid vormi ei lisa.</p>'+
   '<label for="lfoto">📷 Lisa foto (valikuline)</label><input id="lfoto" type="file" accept="image/*" capture="environment">'+
   '<div id="lfeel" hidden><img id="lfimg" alt="Foto eelvaade" style="max-width:100%;max-height:180px;border-radius:8px;margin-top:8px"><button id="lfvota" type="button">Eemalda</button></div>'+
   '<button class="suur roh" id="saada">Saada omanikule</button>'+(j.telefon?'<a class="nupp" id="helista" href="tel:'+esc(j.telefon)+'">📞 Helista omanikule</a>':'')+
   '<div id="olek" role="status"></div></div>'+
   '<div class="kaart"><p class="vaike">Oled selle firma töötaja?</p><button id="sisse">Logi sisse</button></div>');
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
main{max-width:1100px}table{border-collapse:collapse;width:100%;background:#fff;font-size:.9rem}td,th{border-bottom:1px solid #e5e7eb;padding:6px;text-align:left;vertical-align:top}
.tabs{flex-wrap:wrap}.tabs button{flex:0 0 auto}.vana{background:#fee2e2}button.v{padding:6px 10px;font-size:.85rem;margin:2px}
.vorm{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}
#print{display:none}
@media print{@page{size:A4;margin:8mm}body{background:#fff}main{display:none}#print{display:block}
 .sildid{display:flex;flex-wrap:wrap;gap:3mm}.silt{width:32mm;height:44mm;border:0.2mm dashed #999;padding:1mm;text-align:center;font:bold 2.6mm/1.15 Arial,sans-serif;overflow:hidden;break-inside:avoid}
 .silt svg{width:28mm;height:28mm;display:block;margin:0 auto}.silt .k{font:2.2mm monospace}
 .plakat{text-align:center;font-family:Arial,sans-serif;page-break-after:always}.plakat svg{width:120mm;height:120mm}.plakat h1{font-size:12mm;margin:6mm 0 2mm}.plakat h2{font-size:9mm;margin:0 0 6mm}.plakat ol{text-align:left;font-size:5.5mm;max-width:160mm;margin:6mm auto}}
</style></head><body><main id="m"><h1>Krativara haldus</h1>
<div id="login" class="kaart"><label>Halduse võti (ADMIN_TOKEN)</label><input id="tok" type="password" autocomplete="current-password">
<label class="mark"><input type="checkbox" id="mal"><span>Jäta selles brauseris meelde</span></label><button class="sin" id="sisse">Ava</button><div id="lviga"></div></div>
<div id="app" hidden><div class="tabs" id="tabs"></div><div id="sisu"></div></div></main><div id="print"></div>
<script nonce="${nonce}">${QR_JS}</script>
<script nonce="${nonce}">
${ABI}
let TOK='', U=null, TAB='ulevaade';
try{TOK=localStorage.getItem('qw_admin')||sessionStorage.getItem('qw_admin')||'';}catch(e){}
async function a(tee,keha){const r=await fetch('/api/admin/'+tee,keha?{method:'POST',headers:{'Authorization':'Bearer '+TOK,'Content-Type':'application/json'},body:JSON.stringify(keha)}:{headers:{'Authorization':'Bearer '+TOK}});
  let j={};try{j=await r.json()}catch(e){} if(r.status===401){$('#app').hidden=true;$('#login').hidden=false;} j.status=r.status; return j;}
$('#sisse').onclick=async()=>{TOK=$('#tok').value.trim(); try{($('#mal').checked?localStorage:sessionStorage).setItem('qw_admin',TOK);}catch(e){} await lae();};
async function lae(){U=await a('ulevaade'); if(!U.ok){$('#lviga').innerHTML='<div class="viga">'+esc(U.viga||'Viga')+'</div>';return;} $('#login').hidden=true;$('#app').hidden=false; tabs(); naita();}
const TABS={ulevaade:'Ülevaade',seadmed:'Seadmed',bron:'Broneeringud',kohad:'Töökohad',kasutajad:'Kasutajad',logi:'Logi',seaded:'Seaded'};
// Täpp vahekaardil = üle vaatamata info: lahendamata vaidlused ja märkused, kinnitust ootavad kasutajad, aegunud taatlused,
// uued broneeringud ja logikirjed pärast vahekaardi viimast avamist (meelespea selles brauseris).
const NAHTUD={get(k){try{return +localStorage.getItem('qw_nahtud_'+k)||0}catch(e){return 0}},set(k,v){try{localStorage.setItem('qw_nahtud_'+k,String(v))}catch(e){}}};
function tapid(){ if(!U) return {}; const t=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Tallinn'});
  return { ulevaade:U.vaidlused.length+U.margmed.length, kasutajad:U.kasutajad.filter(k=>k.olek==='ootel'&&!k.kustutatud).length,
    seadmed:U.seadmed.filter(s=>!s.kustutatud&&s.olek!=='maha'&&s.taatlus_kuni&&s.taatlus_kuni<t).length,
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
function naita(){ const f={ulevaade,seadmed,bron,kohad,kasutajad,logi,seaded}[TAB];
  if(TAB==='bron') NAHTUD.set('bron',Date.now()); if(TAB==='logi') NAHTUD.set('logi',U.logi_viimane||Date.now()); tabs(); f(); }
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

function seadmed(muuda){
  const s=muuda||{};
  $('#sisu').innerHTML='<h2>'+(muuda?'Muuda seadet':'Lisa seade')+'</h2><div class="kaart"><div class="vorm">'+
   '<div><label>Nimi *</label><input id="s_nimi" value="'+esc(s.nimi)+'"></div><div><label>Tüüp</label><input id="s_tyyp" value="'+esc(s.tyyp)+'" placeholder="nt nivelliir, laserkaugusmõõtja"></div>'+
   '<div><label>Inventarinumber</label><input id="s_invnr" value="'+esc(s.invnr)+'" placeholder="'+(muuda?'':'tühi = automaatne (nt L1-2611001)')+'"></div><div><label>Seerianumber</label><input id="s_seerianr" value="'+esc(s.seerianr)+'"></div>'+
   '<div><label>Taatlus/kalibreerimine kehtib kuni</label><input id="s_taatlus" type="date" value="'+esc(s.taatlus_kuni)+'"></div>'+
   '<div><label>Taatluse intervall (kuud, valikuline)</label><input id="s_intervall" type="number" min="1" max="120" value="'+esc(s.taatlus_intervall||'')+'"></div>'+
   '<div><label>Olek</label><select id="s_olek">'+Object.entries(OLEK).map(([k,t])=>'<option value="'+k+'"'+(s.olek===k?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
   '<div><label>'+(muuda?'Koduladu':'Ladu, kus registreeritakse *')+'</label><select id="s_asukoht">'+kohaValik(s.koduladu)+'</select></div>'+
   (muuda?'':'<div><label>Olemasolev kood (valikuline, 12 märki)</label><input id="s_kood" placeholder="tühi = uus kood"></div>')+
   '</div><label>Lisainfo (kasutajad näevad)</label><textarea id="s_lisa" rows="2">'+esc(s.lisainfo)+'</textarea>'+
   '<button class="roh" id="s_salv">'+(muuda?'Salvesta':'Lisa seade')+'</button> '+(muuda?'<button id="s_loobu">Loobu</button> <button id="s_ajalugu">Ajalugu</button>':'')+'<div id="s_teade"></div><div id="s_aj"></div></div>'+
   (muuda?'<h2>📏 Registreeri taatlus / kalibreerimine</h2><div class="kaart"><div class="vorm"><div><label>Kuupäev *</label><input type="date" id="t_kp"></div><div><label>Tunnistuse nr</label><input id="t_tun"></div>'+
     '<div><label>Tegija (labor)</label><input id="t_teg" value="'+esc(s.taatlus_tegija||'')+'"></div><div><label>Tulemus *</label><select id="t_tul"><option value="sobib">sobib</option><option value="ei_sobi">ei sobi (→ remonti)</option></select></div>'+
     '<div><label>Järgmine tähtaeg (tühi = kuupäev + intervall)</label><input type="date" id="t_j"></div></div><input id="t_mark" placeholder="Märkus (valikuline)" maxlength="300">'+
     '<button class="roh" id="t_salv">Salvesta taatlus</button> <button id="t_oleku">Saada taatlusele (olek)</button><div id="t_teade"></div><div id="t_ajalugu"></div></div>':'')+
   '<h2>Seadmed ('+U.seadmed.length+')</h2><div class="rida"><input id="filter" placeholder="Filtreeri"><button id="prindi" style="flex:0 0 auto">🖨 Sildid</button><button id="kataloog" style="flex:0 0 auto">📖 Kataloog</button></div><p class="vaike">Sildid (seadme QR) kleebitakse seadmele. Kataloog (eraldi QR, ainult otsinguks) pannakse lattu; sellega ei saa seadet võtta.</p>'+
   '<table id="st"><tr><th><input type="checkbox" id="koik" style="width:auto"></th><th>Nimi</th><th>Inv/seeria</th><th>Taatlus</th><th>Olek</th><th>Kellel / asukoht</th><th>Kood</th><th></th></tr>'+
   U.seadmed.map(x=>'<tr data-kood="'+x.kood+'"'+kustStiil(x)+'><td><input type="checkbox" class="vali" value="'+x.kood+'" style="width:auto"></td><td><a href="#" data-muuda="'+x.kood+'">'+esc(x.nimi)+'</a><br><span class="vaike">'+esc(x.tyyp)+'</span></td><td>'+esc(x.invnr)+'<br><span class="vaike">'+esc(x.seerianr)+'</span></td><td>'+esc(x.taatlus_kuni||'')+'</td><td>'+OLEK[x.olek]+'</td><td>'+(x.kellel?esc(x.kellel.nimi):esc(x.asukoht_nimi))+'</td><td class="vaike">'+x.kood+'</td><td>'+kustNupp('seade',x.kood,x)+'</td></tr>').join('')+'</table>'+
   '<p><button id="csv">⬇ Seadmed CSV</button></p>';
  $('#s_salv').onclick=async()=>{const j=await a('seade',{kood:muuda?muuda.kood:undefined,uus_kood:$('#s_kood')?$('#s_kood').value.trim():undefined,nimi:$('#s_nimi').value,tyyp:$('#s_tyyp').value,invnr:$('#s_invnr').value,seerianr:$('#s_seerianr').value,taatlus_kuni:$('#s_taatlus').value,taatlus_intervall:$('#s_intervall').value,olek:$('#s_olek').value,asukoht:$('#s_asukoht').value,lisainfo:$('#s_lisa').value});
    if(!j.ok){$('#s_teade').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} U=await a('ulevaade'); seadmed(); $('#s_teade').innerHTML='<div class="ok">Salvestatud: '+esc(j.seade.nimi)+' ('+j.seade.kood+')</div>';};
  if($('#s_loobu'))$('#s_loobu').onclick=()=>seadmed();
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
  '<h2>🔔 Teavitused</h2><div class="kaart"><p class="vaike">Saadab testteate Telegrami (TG_BOT_TOKEN, TG_CHAT_ID) ja ntfy-sse (NTFY_TOPIC). Vea korral näed põhjust.</p><button id="t_test">Saada testteade</button><div id="t_teade"></div></div>';
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
.vk{background:#fff;border-radius:8px;padding:8px 10px;margin:6px 0;font-size:.85rem;word-break:break-word}.vk pre{white-space:pre-wrap;font-size:.75rem;margin:4px 0 0}</style></head>
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
