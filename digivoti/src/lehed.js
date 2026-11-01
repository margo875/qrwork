// HTML-lehed: kasutaja rakendus (/, /O/<kood>, /kutse), haldus (/admin), muutuva QR-i ekraan (/ekraan/<kood>)
// ja demo-lehed, mis simuleerivad releed (/demo/uks/<kood>, /demo/automaat/<kood>).
// Välist koodi ei laeta: QR-generaator src/qrgen.js (MIT), QR-lugeja jsQR /jsqr.js (Apache-2.0) ainult siis, kui brauseril
// pole BarcodeDetector'it. Kõik kasutaja sisestatud väärtused läbivad esc(). NB: lehe skriptid on JS-mallides, seega
// kliendikoodis ei kasutata kaldkriipsuga paojadasid; regulaaravaldisega funktsioonid lähevad lehele .toString() abil.
import { QR_JS } from './qrgen.js';

// Skännitud QR teksti tõlgendus. Kehtib ainult sama hosti /O/<kood> (valikuliselt ?d=<muutuv kood>).
export function koodTekstist(t, host) {
  t = String(t || '').trim();
  const m = /^https?:\/\/([^/?#\s]+)\/O\/([0-9A-Z]{12})\/?(?:\?d=([0-9A-Z]{8}))?$/i.exec(t);
  if (!m || m[1].toLowerCase() !== String(host || '').toLowerCase()) return null;
  return { kood: m[2].toUpperCase(), d: (m[3] || '').toUpperCase() };
}
export function kasitsiKood(v) {
  const k = String(v || '').trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[\s-]/g, '');
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(k) ? k : null;
}
export function sendidEurost(v) {
  const s = String(v || '').trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

const ABI = `const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const aeg=t=>t?new Date(t).toLocaleString('et-EE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
const euro=s=>(Number(s||0)/100).toFixed(2).replace('.',',');
const KUUD=['jaanuar','veebruar','märts','aprill','mai','juuni','juuli','august','september','oktoober','november','detsember'];
const kuuNimi=k=>KUUD[Number(k.slice(5,7))-1]+' '+k.slice(0,4);
const IKOON={uks:'🚪',automaat:'☕',seade:'🖨️',auto:'🚗'};
const NONCE=document.currentScript.nonce;
function laeSkript(src){return new Promise((ok,ei)=>{const s=document.createElement('script');s.src=src;s.nonce=NONCE;s.onload=ok;s.onerror=ei;document.head.appendChild(s);});}
function qrSvg(tekst){const m=window.qrMatrix(tekst),n=m.length,q=4,w=n+2*q;let d='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])d+='M'+(x+q)+' '+(y+q)+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';}
const ${koodTekstist.name}=${koodTekstist.toString()};
const ${kasitsiKood.name}=${kasitsiKood.toString()};
const ${sendidEurost.name}=${sendidEurost.toString()};`;

const STIIL = `*{box-sizing:border-box}body{font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#eef2f7;color:#0f172a}
main{max-width:640px;margin:0 auto;padding:16px}h1{font-size:1.35rem;margin:.2rem 0 .6rem}h2{font-size:1.05rem;margin:.2rem 0 .5rem}
.kaart{background:#fff;border-radius:14px;padding:14px;margin:12px 0;box-shadow:0 1px 3px rgba(15,23,42,.08)}
button,.nupp{font:inherit;border:0;border-radius:10px;padding:12px 16px;cursor:pointer;background:#e2e8f0;color:#0f172a;text-decoration:none;display:inline-block}
button.suur{display:block;width:100%;font-size:1.2rem;padding:18px;margin:10px 0;font-weight:600}
.roh{background:#15803d;color:#fff}.sin{background:#1e40af;color:#fff}.pun{background:#b91c1c;color:#fff}
button:disabled{opacity:.5}input,select{font:inherit;width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px;margin:4px 0 10px;background:#fff}
label{font-size:.9rem;color:#334155}.vaike{font-size:.85rem;color:#475569}.viga{background:#fee2e2;color:#7f1d1d;padding:10px;border-radius:9px;margin:8px 0}
.ok{background:#dcfce7;color:#14532d;padding:10px;border-radius:9px;margin:8px 0}.hoiatus{background:#fef3c7;color:#78350f;padding:8px 10px;border-radius:9px;margin:6px 0}
ul.loend{list-style:none;padding:0;margin:0}ul.loend li{padding:9px 2px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px}
ul.loend li:last-child{border-bottom:0}video{width:100%;max-height:50vh;background:#000;border-radius:12px;object-fit:cover}
.rida{display:flex;gap:8px;align-items:center}.rida>*{flex:1}.rida>button{flex:0 0 auto}
.pais{display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;border-radius:14px;padding:12px 14px}
.pais b{font-size:1.1rem}.summa{font-size:2rem;font-weight:700;margin:4px 0}.silt{display:inline-block;background:#e0e7ff;color:#1e3a8a;border-radius:999px;padding:1px 9px;font-size:.8rem;margin:1px}
.tulemus{border-radius:18px;padding:34px 16px;text-align:center;color:#fff;font-size:1.6rem;font-weight:700;margin:14px 0}.tulemus .ik{font-size:4rem;display:block}
.tulemus.jah{background:#15803d}.tulemus.ei{background:#b91c1c}.tulemus small{display:block;font-size:1rem;font-weight:400;margin-top:6px}
.tooted{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tooted button{padding:18px 8px;background:#fff;border:2px solid #cbd5e1;font-weight:600}
.tooted button span{display:block;font-weight:400;color:#475569}.tabs{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}.tabs .val{background:#1e40af;color:#fff}a{color:#1e40af}`;

const pea = (pealkiri, lisaStiil = '') => `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0f172a"><title>${pealkiri}</title><style>${STIIL}${lisaStiil}</style></head>`;

// ---------- kasutaja rakendus ----------
export function appLeht(nonce, { kood = '', d = '', kutse = false } = {}) {
  return `${pea('QR-digivõti')}<body><main><div id="sisu"><p>Laen…</p></div></main>
<script nonce="${nonce}">
${ABI}
const ALG={kood:${JSON.stringify(kood)},d:${JSON.stringify(d)},kutse:${kutse ? 'true' : 'false'}};
let MINA=null;
async function api(tee,keha){let r;try{r=await fetch(tee,{method:'POST',headers:{'Content-Type':'application/json','X-QW':'1'},body:JSON.stringify(keha||{})});}catch(e){return {ok:false,viga:'Võrguühendus puudub.'};}
  let j={};try{j=await r.json()}catch(e){j={ok:false,viga:'Serveri viga'}} j.status=r.status; if(r.status===401&&tee!=='/api/logi-sisse'){MINA=null;} return j;}
function sisu(h){peata();$('#sisu').innerHTML=h;window.scrollTo(0,0);}
const tagasi='<button id="tagasi" class="suur">← Avalehele</button>';
function tagasiNupp(){const b=$('#tagasi');if(b)b.onclick=async()=>{const j=await api('/api/mina');if(j.ok){MINA=j;kodu();}else login();};}

async function start(){
  if(ALG.kutse){const t=location.hash.slice(1);history.replaceState(null,'','/kutse');return kutseVaade(t);}
  const j=await api('/api/alusta'); MINA=j.mina;
  if(!MINA) return login();
  jatka();
}
function jatka(){ if(ALG.kood){const k=ALG.kood,d=ALG.d;ALG.kood='';ALG.d='';history.replaceState(null,'','/');return objekt(k,d);} kodu(); }

function login(){
  sisu('<h1>🔑 QR-digivõti</h1><div class="kaart"><label>Telefon</label><input id="tel" type="tel" autocomplete="username" placeholder="5123 4567">'+
   '<label>PIN või parool</label><input id="par" type="password" autocomplete="current-password"><button class="suur sin" id="sisse">Logi sisse</button><div id="v"></div>'+
   '<p class="vaike">Esimesel korral ava haldurilt saadud kutselink. Pärast sisselogimist jääb telefon sisse logituks.</p></div>');
  $('#sisse').onclick=async()=>{const j=await api('/api/logi-sisse',{tel:$('#tel').value,parool:$('#par').value});
    if(!j.ok){$('#v').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;} MINA=j.mina; jatka();};
}
async function kutseVaade(token){
  const j=await api('/api/kutse-info',{token});
  if(!j.ok){sisu('<h1>Kutse</h1><div class="viga">'+esc(j.viga)+'</div><a class="nupp" href="/">Avalehele</a>');return;}
  sisu('<h1>Tere, '+esc(j.nimi)+'!</h1><div class="kaart"><p>'+esc(j.firma)+' kutsus sind kasutama QR-digivõtit. Telefon: <b>'+esc(j.tel)+'</b>.</p>'+
   '<label>Vali PIN või parool (vähemalt 6 märki)</label><input id="p1" type="password" autocomplete="new-password" inputmode="numeric">'+
   '<label>Korda</label><input id="p2" type="password" autocomplete="new-password" inputmode="numeric"><button class="suur roh" id="ok">Alusta</button><div id="v"></div></div>');
  $('#ok').onclick=async()=>{ if($('#p1').value!==$('#p2').value){$('#v').innerHTML='<div class="viga">PIN-id ei kattu.</div>';return;}
    const r=await api('/api/kutse',{token,parool:$('#p1').value}); if(!r.ok){$('#v').innerHTML='<div class="viga">'+esc(r.viga)+'</div>';return;}
    MINA=r.mina; history.replaceState(null,'','/'); kodu(); };
}

function kodu(){
  const m=MINA;
  const ostud=m.ostud.slice(0,8).map(o=>'<li><span>'+esc(o.toode)+' <span class="vaike">'+esc(o.automaat)+', '+aeg(o.aeg)+'</span></span><b>'+euro(o.hind_s)+' €</b></li>').join('');
  const kasut=m.kasutused.map(k=>'<li><span>'+(IKOON[k.tyyp]||'')+' '+esc(k.nimi)+' <span class="vaike">alates '+aeg(k.alates)+'</span></span><button class="roh" data-o="'+k.kood+'">Lõpeta</button></li>').join('');
  const lig=m.ligipaasud.map(o=>'<li><span>'+(IKOON[o.tyyp]||'')+' '+esc(o.nimi)+(o.dyn?' <span class="silt">muutuv QR</span>':'')+'</span><span class="vaike">'+esc(o.ajaaken)+(o.praegu?'':' (praegu suletud)')+'</span></li>').join('');
  sisu('<div class="pais"><b>'+esc(m.firma)+'</b><span>'+esc(m.kasutaja.nimi)+'</span></div>'+
   '<button class="suur sin" id="skan">📷 Skänni QR-kood</button>'+
   '<div class="rida"><input id="kas" placeholder="Kood käsitsi (12 märki)" autocapitalize="characters"><button id="kasok">Ava</button></div>'+
   (kasut?'<div class="kaart"><h2>Pooleli kasutused</h2><ul class="loend">'+kasut+'</ul></div>':'')+
   '<div class="kaart"><h2>Minu ostud: '+esc(kuuNimi(m.kuu))+'</h2><div class="summa" id="kuusumma">'+euro(m.ostud_summa_s)+' €</div>'+
   (ostud?'<ul class="loend">'+ostud+'</ul>':'<p class="vaike">Sel kuul oste pole.</p>')+'<p class="vaike">Kuu summa peetakse kinni palgast (kokkuleppe alusel).</p></div>'+
   '<div class="kaart"><h2>Minu ligipääsud</h2>'+(lig?'<ul class="loend">'+lig+'</ul>':'<p class="vaike">Ligipääse pole.</p>')+
   '<p class="vaike">Rühmad: '+(m.kasutaja.ryhmad.map(r=>'<span class="silt">'+esc(r)+'</span>').join(' ')||'—')+'</p></div>'+
   '<button id="valja">Logi välja</button>');
  $('#skan').onclick=skanner;
  $('#kasok').onclick=()=>{const k=kasitsiKood($('#kas').value); if(!k){alert('Kood on 12 märki (sildil QR-koodi all).');return;} objekt(k,'');};
  document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>objekt(b.dataset.o,''));
  $('#valja').onclick=async()=>{await api('/api/logi-valja');MINA=null;login();};
}

// ---------- objekt ----------
async function objekt(kood,d){
  const j=await api('/api/objekt',{kood});
  if(j.status===401) return login();
  if(!j.ok){sisu('<div class="tulemus ei"><span class="ik">❓</span>'+esc(j.viga)+'</div>'+tagasi);tagasiNupp();return;}
  const o=j.objekt;
  if(!j.kontroll.lubatud && o.tyyp!=='uks'){sisu('<h1>'+IKOON[o.tyyp]+' '+esc(o.nimi)+'</h1><div class="tulemus ei"><span class="ik">⛔</span>'+esc(j.kontroll.pohjus)+'</div>'+tagasi);tagasiNupp();return;}
  if(o.tyyp==='uks') return uks(o,d);
  if(o.tyyp==='automaat') return automaat(o);
  return kasutus(o,j.kasutus);
}
async function uks(o,d){
  sisu('<h1>🚪 '+esc(o.nimi)+'</h1><div class="tulemus" style="background:#334155"><span class="ik">⏳</span>Kontrollin õigust…</div>');
  const r=await api('/api/ava',{kood:o.kood,d});
  sisu('<h1>🚪 '+esc(o.nimi)+'</h1>'+(r.ok?'<div class="tulemus jah" id="tul"><span class="ik">🔓</span>Uks on avatud<small>'+r.sekundit+' sekundit</small></div>'
    :'<div class="tulemus ei" id="tul"><span class="ik">⛔</span>'+esc(r.viga)+'</div>')+(o.dyn?'':'<button class="suur" id="uuesti">Ava uuesti</button>')+tagasi);
  if($('#uuesti')) $('#uuesti').onclick=()=>uks(o,'');
  tagasiNupp();
}
function automaat(o){
  const t=o.tooted||[];
  sisu('<h1>☕ '+esc(o.nimi)+'</h1><p class="vaike">Vali toode. Summa lisatakse sinu kuu ostudele.</p>'+
   (t.length?'<div class="tooted">'+t.map(x=>'<button data-t="'+x.id+'">'+esc(x.nimi)+'<span>'+euro(x.hind_s)+' €</span></button>').join('')+'</div>':'<div class="hoiatus">Tooteid pole lisatud.</div>')+
   '<div id="kinnitus"></div>'+tagasi);
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const x=t.find(y=>y.id===b.dataset.t);
    $('#kinnitus').innerHTML='<div class="kaart"><h2>Kinnita ost</h2><p style="font-size:1.3rem">'+esc(x.nimi)+' — <b>'+euro(x.hind_s)+' €</b></p><div class="rida"><button class="roh" id="jah">Kinnita</button><button id="ei">Tühista</button></div></div>';
    $('#ei').onclick=()=>{$('#kinnitus').innerHTML='';};
    $('#jah').onclick=async()=>{$('#jah').disabled=true;const r=await api('/api/ost',{kood:o.kood,toode:x.id});
      sisu('<h1>☕ '+esc(o.nimi)+'</h1>'+(r.ok?'<div class="tulemus jah" id="tul"><span class="ik">✅</span>Väljastan: '+esc(r.toode)+'<small>'+euro(r.hind_s)+' € · sel kuul kokku '+euro(r.kuu_summa_s)+' €</small></div>'
        :'<div class="tulemus ei" id="tul"><span class="ik">⛔</span>'+esc(r.viga)+'</div>')+'<button class="suur" id="veel">Osta veel</button>'+tagasi);
      $('#veel').onclick=()=>automaat(o); tagasiNupp();};
    $('#kinnitus').scrollIntoView({behavior:'smooth'});});
  tagasiNupp();
}
function kasutus(o,k){
  const auto=o.tyyp==='auto';
  let h='<h1>'+IKOON[o.tyyp]+' '+esc(o.nimi)+'</h1>';
  if(k&&!k.minu) h+='<div class="tulemus ei"><span class="ik">⛔</span>Kasutusel<small>'+esc(k.nimi)+' alates '+aeg(k.alates)+'</small></div>';
  else if(k&&k.minu) h+='<div class="kaart"><p>Kasutus alates <b>'+aeg(k.alates)+'</b>'+(auto?', algnäit <b>'+k.odo_algus+' km</b>':'')+'</p>'+
    (auto?'<label>Odomeetri lõpunäit (km)</label><input id="odo" type="number" inputmode="numeric" min="'+k.odo_algus+'">':'')+'<button class="suur roh" id="lopeta">⏹ Lõpeta kasutus</button><div id="v"></div></div>';
  else h+='<div class="kaart">'+(auto?'<label>Odomeetri näit (km)</label><input id="odo" type="number" inputmode="numeric" value="'+(o.odo_viimane??'')+'">'+
    '<label>Sõidu eesmärk</label><input id="ees" placeholder="nt objekt Tartu mnt 10">':'')+'<button class="suur sin" id="alusta">▶ Alusta kasutust</button><div id="v"></div></div>';
  sisu(h+tagasi); tagasiNupp();
  const v=t=>{$('#v').innerHTML='<div class="viga">'+esc(t)+'</div>';};
  if($('#alusta')) $('#alusta').onclick=async()=>{const r=await api('/api/kasutus-alusta',{kood:o.kood,odo:auto?Number($('#odo').value):undefined,eesmark:auto?$('#ees').value:undefined});
    if(!r.ok) return v(r.viga); sisu('<h1>'+IKOON[o.tyyp]+' '+esc(o.nimi)+'</h1><div class="tulemus jah" id="tul"><span class="ik">▶</span>Kasutus alustatud<small>Lõpetamiseks skänni uuesti või vajuta avalehel „Lõpeta“.</small></div>'+tagasi); tagasiNupp();};
  if($('#lopeta')) $('#lopeta').onclick=async()=>{const r=await api('/api/kasutus-lopeta',{kood:o.kood,odo:auto?Number($('#odo').value):undefined});
    if(!r.ok) return v(r.viga); sisu('<h1>'+IKOON[o.tyyp]+' '+esc(o.nimi)+'</h1><div class="tulemus jah" id="tul"><span class="ik">⏹</span>Kasutus lõpetatud<small>'+(auto?r.km+' km · ':'')+r.minutit+' min</small></div>'+tagasi); tagasiNupp();};
}

// ---------- skanner ----------
let voog=null, toimib=false, det=null;
function peata(){toimib=false;if(voog){voog.getTracks().forEach(t=>t.stop());voog=null;}}
async function skanner(){
  sisu('<h1>📷 Skänni QR-kood</h1><video id="vid" muted playsinline></video><div id="teade"></div>'+
   '<div class="rida"><input id="kas" placeholder="Kood käsitsi (12 märki)" autocapitalize="characters"><button id="kasok">Ava</button></div>'+tagasi);
  tagasiNupp();
  $('#kasok').onclick=()=>{const k=kasitsiKood($('#kas').value); if(k) objekt(k,''); else teade('Kood on 12 märki.');};
  const teade=t=>{$('#teade').innerHTML='<div class="hoiatus">'+esc(t)+'</div>';};
  const video=$('#vid');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){teade('Kaamera ei ole saadaval. Sisesta kood käsitsi.');return;}
  try{voog=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});}
  catch(e){teade('Kaamera luba puudub. Luba kaamera brauseri seadetes või sisesta kood käsitsi.');return;}
  video.srcObject=voog; try{await video.play();}catch(e){}
  if(!det&&'BarcodeDetector' in window){try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes('qr_code'))det=new BarcodeDetector({formats:['qr_code']});}catch(e){}}
  if(!det&&!window.jsQR){try{await laeSkript('/jsqr.js');}catch(e){teade('QR-lugeja laadimine ebaõnnestus. Sisesta kood käsitsi.');return;}}
  toimib=true; const c=document.createElement('canvas'), cx=c.getContext('2d',{willReadFrequently:true});
  const samm=async()=>{ if(!toimib) return;
    try{ let t=null;
      if(video.readyState>=2&&video.videoWidth){
        if(det){const r=await det.detect(video); if(r&&r[0]) t=r[0].rawValue;}
        else{const w=video.videoWidth,h=video.videoHeight,k=Math.min(1,720/Math.max(w,h));c.width=w*k|0;c.height=h*k|0;cx.drawImage(video,0,0,c.width,c.height);
          const r=window.jsQR(cx.getImageData(0,0,c.width,c.height).data,c.width,c.height,{inversionAttempts:'dontInvert'});if(r)t=r.data;}
      }
      if(t){const x=koodTekstist(t,location.host); if(x){peata();return objekt(x.kood,x.d);} teade('See QR-kood ei kuulu sellesse süsteemi.');}
    }catch(e){}
    if(toimib) setTimeout(samm,det?150:220);
  }; samm();
}
start();
</script></body></html>`;
}

// ---------- haldus ----------
export function adminLeht(nonce) {
  return `${pea('Digivõtme haldus', `main{max-width:1150px}table{border-collapse:collapse;width:100%;background:#fff;font-size:.9rem}
td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}button.v{padding:6px 10px;font-size:.85rem;margin:2px}
.vorm{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0 12px;align-items:end}.paevad label{display:inline-flex;gap:3px;margin-right:8px}
.paevad input{width:auto}.kutse{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.kutse svg{width:150px;height:150px}.kood{font-family:monospace}
.uus{animation:vilgu 1.5s}@keyframes vilgu{from{background:#fef08a}to{background:#fff}}.olek-peatatud{color:#b91c1c;font-weight:600}.olek-kutsutud{color:#a16207}
.reaalaeg{display:inline-block;width:10px;height:10px;border-radius:50%;background:#16a34a;margin-right:6px;animation:pulss 1.5s infinite}@keyframes pulss{50%{opacity:.3}}
.numbrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.numbrid div{background:#fff;border-radius:12px;padding:12px}.numbrid b{display:block;font-size:1.5rem}
#print{display:none}@media print{@page{size:A4;margin:10mm}body{background:#fff}main{display:none}#print{display:block}
.sildid{display:flex;flex-wrap:wrap;gap:6mm}.psilt{width:60mm;border:0.3mm dashed #999;padding:3mm;text-align:center;font:bold 4mm/1.2 Arial,sans-serif;break-inside:avoid}
.psilt svg{width:50mm;height:50mm;display:block;margin:0 auto}.psilt .k{font:3mm monospace}}`)}<body><main id="m"><h1>🔑 Digivõtme haldus</h1>
<div id="login" class="kaart"><label>Halduse võti (ADMIN_TOKEN)</label><input id="tok" type="password" autocomplete="current-password"><button class="sin" id="sisse">Ava</button><div id="lviga"></div></div>
<div id="app" hidden><div class="tabs" id="tabs"></div><div id="sisu"></div></div></main><div id="print"></div>
<script nonce="${nonce}">${QR_JS}</script>
<script nonce="${nonce}">
${ABI}
let TOK='',U=null,TAB='logi',TOKENID={},VIIMANE=0,TAIMER=null;
try{TOK=sessionStorage.getItem('dv_admin')||'';TOKENID=JSON.parse(sessionStorage.getItem('dv_seadmed')||'{}');}catch(e){}
const salvestaTokenid=()=>{try{sessionStorage.setItem('dv_seadmed',JSON.stringify(TOKENID));}catch(e){}};
async function a(tee,keha){const r=await fetch('/api/admin/'+tee,keha?{method:'POST',headers:{'Authorization':'Bearer '+TOK,'Content-Type':'application/json'},body:JSON.stringify(keha)}:{headers:{'Authorization':'Bearer '+TOK}});
  let j={};try{j=await r.json()}catch(e){} if(r.status===401){$('#app').hidden=true;$('#login').hidden=false;} j.status=r.status; return j;}
async function laeCsv(liik,kuu){const r=await fetch('/api/admin/aruanne.csv?liik='+liik+'&kuu='+kuu,{headers:{'Authorization':'Bearer '+TOK}}); if(!r.ok){alert('Viga');return;}
  const b=await r.blob(); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download=liik+'_'+kuu+'.csv'; document.body.appendChild(l); l.click(); l.remove();}
$('#sisse').onclick=async()=>{TOK=$('#tok').value.trim(); try{sessionStorage.setItem('dv_admin',TOK);}catch(e){} await lae();};
async function lae(){U=await a('ulevaade'); if(!U.ok){$('#lviga').innerHTML='<div class="viga">'+esc(U.viga||'Viga')+'</div>';return;} $('#login').hidden=true;$('#app').hidden=false; tabs(); naita();}
const TABS={logi:'Reaalajas logi',kasutajad:'Kasutajad',objektid:'Objektid',tooted:'Tooted',aruanded:'Kuuaruanne',demo:'Demo'};
function tabs(){$('#tabs').innerHTML=Object.entries(TABS).map(([k,t])=>'<button data-t="'+k+'" class="'+(k===TAB?'val':'')+'">'+t+'</button>').join('');
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=async()=>{TAB=b.dataset.t;U=await a('ulevaade');tabs();naita();});}
function naita(){ clearInterval(TAIMER); ({logi,kasutajad,objektid,tooted,aruanded,demo})[TAB](); }
const S=h=>{$('#sisu').innerHTML=h;};
const kasutajaNimi=id=>(U.kasutajad.find(k=>k.id===id)||{}).nimi||'';
const qrUrl=kood=>(location.protocol+'//'+location.host).toUpperCase()+'/O/'+kood;

// --- logi ---
function sundmus(x){const t=x.tyyp, n=esc(x.nimi||''), o=esc(x.objekt||'');
  const T={uks_avatud:['🔓',n+' avas: '+o],uks_keeldutud:['⛔',n+' — '+o+': '+esc(x.pohjus||'')],ost:['☕',n+' ostis '+esc(x.toode)+' ('+esc(x.automaat||'')+') '+euro(x.hind_s)+' €'],ost_tuhistatud:['↩',n+' ost tühistati: '+esc(x.toode)+' '+euro(x.hind_s)+' € ('+esc(x.pohjus||'')+')'],tooted_muudetud:['🏷','Tooted muudetud: '+o],seadmetoken_uus:['🔑','Uus seadmetoken: '+o],objekt_muudetud:['✏','Objekt muudetud: '+o],kasutaja_muudetud:['✏','Kasutaja muudetud: '+n],kutse_loodud:['✉','Uus kutse: '+n],
    kasutus_algus:['▶',n+' alustas: '+o+(x.odo!=null?' ('+x.odo+' km)':'')],kasutus_lopp:['⏹',n+' lõpetas: '+o+(x.km!=null?' ('+x.km+' km)':'')+(x.markus?' — '+esc(x.markus):'')],
    toosuhe_lopp:['🛑','Töösuhe lõppes: '+n+' (sessioone kehtetuks '+x.sessioone+')'],kutse_kasutatud:['📱',n+' aktiveeris telefoni'],kasutaja_loodud:['👤','Uus kasutaja: '+n],
    kasutaja_taastatud:['♻','Taastatud: '+n],objekt_loodud:['➕','Uus objekt: '+o],demo_loodud:['🎬','Demoandmed loodud']}[t]||['•',esc(t)+' '+n+' '+o];
  return T;}
async function logi(){
  S('<div class="kaart"><h2><span class="reaalaeg"></span>Reaalajas logi</h2><table><thead><tr><th style="width:140px">Aeg</th><th style="width:30px"></th><th>Sündmus</th></tr></thead><tbody id="lg"></tbody></table></div>');
  VIIMANE=0; const uuenda=async()=>{const j=await a('logi'); if(!j.ok) return; const tb=$('#lg'); if(!tb) return;
    tb.innerHTML=j.logi.slice(0,150).map(x=>{const [ik,t]=sundmus(x);return '<tr class="'+(VIIMANE&&x.aeg>VIIMANE?'uus':'')+'"><td>'+aeg(x.aeg)+'</td><td>'+ik+'</td><td>'+t+'</td></tr>';}).join('');
    if(j.logi[0]) VIIMANE=Math.max(VIIMANE,j.logi[0].aeg);};
  await uuenda(); TAIMER=setInterval(uuenda,2000);
}

// --- kasutajad ---
function kasutajad(){
  S('<div class="kaart"><h2 id="kvp">Uus kasutaja</h2><div class="vorm"><div><label>Nimi</label><input id="k_nimi"></div><div><label>Telefon</label><input id="k_tel" placeholder="5123 4567"></div>'+
   '<div><label>Rühmad (komaga eraldatud)</label><input id="k_ryh" placeholder="Kontor, Ladu" list="ryhmlist"></div><div><button class="sin" id="k_salv">Salvesta</button> <button id="k_tyhi">Tühjenda</button></div></div>'+
   '<datalist id="ryhmlist">'+U.ryhmad.map(r=>'<option value="'+esc(r)+'">').join('')+'</datalist><div id="k_tul"></div></div>'+
   '<div class="kaart"><table><thead><tr><th>Nimi</th><th>Telefon</th><th>Rühmad</th><th>Olek</th><th></th></tr></thead><tbody>'+
   U.kasutajad.map(k=>'<tr><td>'+esc(k.nimi)+'</td><td>'+esc(k.tel)+'</td><td>'+k.ryhmad.map(r=>'<span class="silt">'+esc(r)+'</span>').join(' ')+'</td><td class="olek-'+k.olek+'">'+
     ({aktiivne:'aktiivne',kutsutud:'kutse saadetud',peatatud:'peatatud'}[k.olek])+'</td><td>'+
     '<button class="v" data-muuda="'+k.id+'">Muuda</button>'+(k.olek!=='peatatud'?'<button class="v" data-kutse="'+k.id+'">Uus kutse</button><button class="v pun" data-peata="'+k.id+'">Töösuhe lõppes</button>':'<button class="v" data-taasta="'+k.id+'">Taasta</button>')+'</td></tr>').join('')+
   '</tbody></table></div>');
  let muuda=null;
  $('#k_tyhi').onclick=()=>{muuda=null;['#k_nimi','#k_tel','#k_ryh'].forEach(s=>$(s).value='');$('#kvp').textContent='Uus kasutaja';};
  $('#k_salv').onclick=async()=>{const j=await a('kasutaja',{id:muuda||undefined,nimi:$('#k_nimi').value,tel:$('#k_tel').value,ryhmad:$('#k_ryh').value});
    if(!j.ok){$('#k_tul').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}
    U=await a('ulevaade'); kasutajad(); if(j.kutse) naitaKutse(j.kutse,U.kasutajad.find(k=>k.id===j.id));};
  document.querySelectorAll('[data-muuda]').forEach(b=>b.onclick=()=>{const k=U.kasutajad.find(x=>x.id===b.dataset.muuda);muuda=k.id;$('#k_nimi').value=k.nimi;$('#k_tel').value=k.tel;$('#k_ryh').value=k.ryhmad.join(', ');$('#kvp').textContent='Muuda: '+k.nimi;});
  document.querySelectorAll('[data-kutse]').forEach(b=>b.onclick=async()=>{const j=await a('kutse',{id:b.dataset.kutse});if(j.ok)naitaKutse(j.kutse,U.kasutajad.find(k=>k.id===b.dataset.kutse));else alert(j.viga);});
  document.querySelectorAll('[data-peata]').forEach(b=>b.onclick=async()=>{const k=U.kasutajad.find(x=>x.id===b.dataset.peata);
    if(!confirm('Töösuhe lõppes: '+k.nimi+'? Kõik ligipääsud suletakse kohe ja telefon logitakse välja.'))return;
    const j=await a('peata',{id:k.id}); if(!j.ok){alert(j.viga);return;} U=await a('ulevaade'); kasutajad();
    $('#k_tul').innerHTML='<div class="ok">🛑 '+esc(k.nimi)+' on peatatud. Kehtetuks: '+j.sessioone+' sessiooni, tühistatud käske '+j.kaske+', lõpetatud kasutusi '+j.kasutusi+'. Ükski uks ega automaat enam ei avane.</div>';});
  document.querySelectorAll('[data-taasta]').forEach(b=>b.onclick=async()=>{await a('taasta',{id:b.dataset.taasta});U=await a('ulevaade');kasutajad();});
}
function naitaKutse(token,k){const url=location.origin+'/kutse#'+token;
  $('#k_tul').innerHTML='<div class="ok kutse"><div>'+qrSvg(url)+'</div><div><b>Kutse: '+esc(k?k.nimi:'')+'</b><br>Skänni telefoniga või saada link (kehtib 7 päeva, ühekordne):<br><a href="'+esc(url)+'" target="_blank" id="kutselink" class="kood">'+esc(url)+'</a></div></div>';}

// --- objektid ---
const PAEVAD=['E','T','K','N','R','L','P'];
function objektid(){
  S('<div class="kaart"><h2 id="ovp">Uus objekt</h2><div class="vorm"><div><label>Tüüp</label><select id="o_tyyp"><option value="uks">🚪 Uks</option><option value="automaat">☕ Automaat</option><option value="seade">🖨️ Seade (arvuti, printer)</option><option value="auto">🚗 Auto</option></select></div>'+
   '<div><label>Nimi</label><input id="o_nimi"></div><div><label>Lubatud rühmad (* = kõik)</label><input id="o_ryh" list="ryhmlist" placeholder="Kontor, Ladu"></div><div><label>Avamisaeg (s)</label><input id="o_aeg" type="number" value="5" min="1" max="30"></div></div>'+
   '<label class="paevad"><input type="checkbox" id="o_aken"> Ajaaken:</label> <span class="paevad">'+PAEVAD.map((p,i)=>'<label><input type="checkbox" class="o_p" value="'+(i+1)+'"'+(i<5?' checked':'')+'>'+p+'</label>').join('')+'</span>'+
   '<div class="rida" style="max-width:320px"><input id="o_algus" value="07:00"><input id="o_lopp" value="19:00"></div>'+
   '<label class="paevad"><input type="checkbox" id="o_dyn"> Muutuv QR (ainult uks; ekraan ukse juures, iga 30 s uus kood)</label><br>'+
   '<button class="sin" id="o_salv">Salvesta</button> <button id="o_tyhi">Tühjenda</button><datalist id="ryhmlist">'+U.ryhmad.map(r=>'<option value="'+esc(r)+'">').join('')+'</datalist><div id="o_tul"></div></div>'+
   '<div class="kaart"><button id="prindi">🖨 Prindi kõik QR-sildid</button><table><thead><tr><th></th><th>Nimi</th><th>Kood</th><th>Rühmad</th><th>Ajaaken</th><th>Seade</th><th></th></tr></thead><tbody>'+
   U.objektid.map(o=>'<tr><td>'+IKOON[o.tyyp]+'</td><td>'+esc(o.nimi)+(o.dyn?' <span class="silt">muutuv QR</span>':'')+(o.kasutus?'<br><span class="vaike">kasutab '+esc(o.kasutus.nimi)+'</span>':'')+'</td><td class="kood">'+o.kood+'</td><td>'+
     (o.ryhmad||[]).map(r=>'<span class="silt">'+esc(r==='*'?'kõik':r)+'</span>').join(' ')+'</td><td>'+esc(o.ajaaken)+'</td><td>'+(o.nahtud&&Date.now()-o.nahtud<15000?'🟢 ühendatud':'⚪')+'</td><td>'+
     '<button class="v" data-om="'+o.kood+'">Muuda</button><button class="v" data-silt="'+o.kood+'">QR-silt</button><button class="v" data-tok="'+o.kood+'">Seadmetoken</button>'+demoNupud(o)+'</td></tr>').join('')+'</tbody></table></div>');
  let muuda=null;
  $('#o_tyhi').onclick=()=>{muuda=null;objektid();};
  $('#o_salv').onclick=async()=>{const ak=$('#o_aken').checked?{paevad:[...document.querySelectorAll('.o_p:checked')].map(x=>Number(x.value)),algus:$('#o_algus').value,lopp:$('#o_lopp').value}:null;
    const j=await a('objekt',{kood:muuda||undefined,tyyp:$('#o_tyyp').value,nimi:$('#o_nimi').value,ryhmad:$('#o_ryh').value,ajaaken:ak,dyn:$('#o_dyn').checked,avamisaeg_s:Number($('#o_aeg').value)});
    if(!j.ok){$('#o_tul').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}
    if(j.seadmetoken){TOKENID[j.kood]=j.seadmetoken;salvestaTokenid();} U=await a('ulevaade'); objektid(); if(j.seadmetoken) naitaToken(j.kood,j.seadmetoken);};
  document.querySelectorAll('[data-om]').forEach(b=>b.onclick=()=>{const o=U.objektid.find(x=>x.kood===b.dataset.om);muuda=o.kood;$('#ovp').textContent='Muuda: '+o.nimi;
    $('#o_tyyp').value=o.tyyp;$('#o_tyyp').disabled=true;$('#o_nimi').value=o.nimi;$('#o_ryh').value=(o.ryhmad||[]).join(', ');$('#o_aeg').value=o.avamisaeg_s||5;$('#o_dyn').checked=o.dyn;
    $('#o_aken').checked=!!o.ajaaken_obj; if(o.ajaaken_obj){document.querySelectorAll('.o_p').forEach(x=>x.checked=o.ajaaken_obj.paevad.includes(Number(x.value)));$('#o_algus').value=o.ajaaken_obj.algus;$('#o_lopp').value=o.ajaaken_obj.lopp;}
    window.scrollTo(0,0);});
  document.querySelectorAll('[data-silt]').forEach(b=>b.onclick=()=>prindi([U.objektid.find(x=>x.kood===b.dataset.silt)]));
  $('#prindi').onclick=()=>prindi(U.objektid.filter(o=>!o.dyn));
  document.querySelectorAll('[data-tok]').forEach(b=>b.onclick=async()=>{if(!confirm('Luua uus seadmetoken? Vana token lakkab kohe töötamast.'))return;
    const j=await a('seadmetoken',{kood:b.dataset.tok}); if(!j.ok){alert(j.viga);return;} TOKENID[b.dataset.tok]=j.seadmetoken; salvestaTokenid(); objektid(); naitaToken(b.dataset.tok,j.seadmetoken);});
}
function demoNupud(o){const t=TOKENID[o.kood]; if(!t) return '';
  let h=''; if(o.tyyp==='uks') h+='<a class="nupp v" target="_blank" href="/demo/uks/'+o.kood+'#'+t+'">Demolukk</a>';
  if(o.tyyp==='automaat') h+='<a class="nupp v" target="_blank" href="/demo/automaat/'+o.kood+'#'+t+'">Demoautomaat</a>';
  if(o.dyn) h+='<a class="nupp v" target="_blank" href="/ekraan/'+o.kood+'#'+t+'">Ekraan</a>'; return h;}
function naitaToken(kood,t){$('#o_tul').innerHTML='<div class="ok">Seadmetoken (näidatakse ainult nüüd; seadmes: Authorization: Bearer …):<br><b class="kood">'+esc(t)+'</b><br>Relee küsib: POST '+esc(location.origin)+'/api/relee/'+kood+'</div>';}
function prindi(list){$('#print').innerHTML='<div class="sildid">'+list.map(o=>'<div class="psilt">'+qrSvg(qrUrl(o.kood))+esc(o.nimi)+'<div class="k">'+o.kood+'</div><div class="k">Skänni telefoniga</div></div>').join('')+'</div>';window.print();}

// --- tooted ---
function tooted(){
  const aut=U.objektid.filter(o=>o.tyyp==='automaat');
  S(aut.length?aut.map(o=>'<div class="kaart" data-aut="'+o.kood+'"><h2>☕ '+esc(o.nimi)+'</h2><table><thead><tr><th>Toode</th><th style="width:140px">Hind (€)</th><th></th></tr></thead><tbody>'+
    (o.tooted||[]).map(t=>rida(t)).join('')+'</tbody></table><button class="v" data-lisa>+ Lisa toode</button> <button class="v sin" data-salv>Salvesta</button><span data-tul></span></div>').join(''):'<div class="kaart">Automaate pole. Lisa objekt tüübiga „Automaat“.</div>');
  document.querySelectorAll('[data-aut]').forEach(k=>{
    k.querySelector('[data-lisa]').onclick=()=>{k.querySelector('tbody').insertAdjacentHTML('beforeend',rida({id:'',nimi:'',hind_s:0}));kustutaNupud();};
    k.querySelector('[data-salv]').onclick=async()=>{const list=[];for(const r of k.querySelectorAll('tbody tr')){const h=sendidEurost(r.querySelector('.th').value);
        if(h===null){k.querySelector('[data-tul]').innerHTML=' <span class="viga">Vigane hind: '+esc(r.querySelector('.th').value)+'</span>';return;} list.push({id:r.dataset.id||undefined,nimi:r.querySelector('.tn').value,hind_s:h});}
      const j=await a('tooted',{kood:k.dataset.aut,tooted:list}); k.querySelector('[data-tul]').innerHTML=j.ok?' ✅ Salvestatud':' <span class="viga">'+esc(j.viga)+'</span>'; U=await a('ulevaade');};
  }); kustutaNupud();
}
const rida=t=>'<tr data-id="'+esc(t.id)+'"><td><input class="tn" value="'+esc(t.nimi)+'"></td><td><input class="th" value="'+euro(t.hind_s)+'"></td><td><button class="v" data-kust>✕</button></td></tr>';
function kustutaNupud(){document.querySelectorAll('[data-kust]').forEach(b=>b.onclick=()=>b.closest('tr').remove());}

// --- aruanded ---
async function aruanded(kuu){
  kuu=kuu||U.kuu; const j=await a('kuu?kuu='+kuu);
  S('<div class="kaart"><div class="rida" style="max-width:420px"><input type="month" id="kuu" value="'+kuu+'"><button id="nk">Näita</button></div>'+
   '<div class="numbrid"><div>Kinnipidamised kokku<b>'+euro(j.kokku_s)+' €</b></div><div>Oste<b>'+j.ostude_arv+'</b></div><div>Läbipääse<b>'+j.labipaase+'</b></div><div>Sõite / km<b>'+j.soite+' / '+j.km+'</b></div></div></div>'+
   '<div class="kaart"><h2>Kinnipidamised palgast: '+esc(kuuNimi(kuu))+'</h2><table><thead><tr><th>Töötaja</th><th>Telefon</th><th>Oste</th><th>Summa</th></tr></thead><tbody>'+
   j.kinnipidamised.map(x=>'<tr><td>'+esc(x.nimi)+'</td><td>'+esc(x.tel)+'</td><td>'+x.arv+'</td><td><b>'+euro(x.summa_s)+' €</b></td></tr>').join('')+
   '<tr><td><b>KOKKU</b></td><td></td><td>'+j.ostude_arv+'</td><td><b>'+euro(j.kokku_s)+' €</b></td></tr></tbody></table></div>'+
   '<div class="kaart"><h2>Lae alla (CSV, Excel)</h2><button class="sin" data-csv="kinnipidamised">Kinnipidamised</button> <button data-csv="ostud">Ostud ridadena</button> <button data-csv="soidupaevik">Sõidupäevik</button> <button data-csv="labipaas">Läbipääsulogi</button> <button data-csv="seadmed">Seadmete kasutus</button></div>');
  $('#nk').onclick=()=>aruanded($('#kuu').value);
  document.querySelectorAll('[data-csv]').forEach(b=>b.onclick=()=>laeCsv(b.dataset.csv,kuu));
}

// --- demo ---
function demo(){
  const n=U.objektid.length+U.kasutajad.length;
  S('<div class="kaart"><h2>🎬 Investoridemo</h2><p class="vaike">Loob 3 kasutajat, 2 ust (üks muutuva QR-iga), kohvi- ja snäkiautomaadi, printeri ja auto. Lukk ja automaadid on simuleeritud demolehtedel (sama releeliides, mida kasutab päris Shelly/ESP32).</p>'+
   '<button class="sin" id="loo"'+(n?' disabled':'')+'>Loo demoandmed</button> <button class="pun" id="kust">Kustuta kõik andmed</button><div id="d_tul"></div></div>'+demoLingid());
  $('#loo').onclick=async()=>{const j=await a('demo',{}); if(!j.ok){$('#d_tul').innerHTML='<div class="viga">'+esc(j.viga)+'</div>';return;}
    j.seadmed.forEach(s=>{TOKENID[s.kood]=s.seadmetoken;}); salvestaTokenid();
    try{sessionStorage.setItem('dv_kutsed',JSON.stringify(j.kutsed));}catch(e){} U=await a('ulevaade'); demo();};
  $('#kust').onclick=async()=>{if(prompt('Kõik andmed kustutatakse. Kirjuta KUSTUTA')!=='KUSTUTA')return; await a('lahtesta',{kinnitus:'KUSTUTA'}); TOKENID={}; salvestaTokenid();
    try{sessionStorage.removeItem('dv_kutsed');}catch(e){} U=await a('ulevaade'); demo();};
}
function demoLingid(){let kutsed=[];try{kutsed=JSON.parse(sessionStorage.getItem('dv_kutsed')||'[]');}catch(e){}
  const obj=U.objektid.filter(o=>TOKENID[o.kood]&&(o.tyyp==='uks'||o.tyyp==='automaat'));
  if(!kutsed.length&&!obj.length) return '';
  return '<div class="kaart"><h2>Seadmed (ava suurel ekraanil)</h2><ul class="loend">'+obj.map(o=>'<li><span>'+IKOON[o.tyyp]+' '+esc(o.nimi)+'</span><span>'+demoNupud(o)+'</span></li>').join('')+'</ul></div>'+
   '<div class="kaart"><h2>Kutsed (skänni telefoniga)</h2><div class="numbrid">'+kutsed.map(k=>{const url=location.origin+'/kutse#'+k.kutse;const u=U.kasutajad.find(x=>x.id===k.id)||{};
     return '<div><b style="font-size:1rem">'+esc(k.nimi)+'</b><span class="vaike">'+esc(k.tel)+' · '+esc((u.ryhmad||[]).join(', '))+' · '+esc(u.olek||'')+'</span>'+qrSvg(url)+'<a class="kutselink" data-nimi="'+esc(k.nimi)+'" target="_blank" href="'+esc(url)+'">Ava kutse</a></div>';}).join('')+'</div></div>';}
if(TOK) lae();
</script></body></html>`;
}

// ---------- muutuva QR-i ekraan (ukse juures; ESP32 + ekraan või tahvel) ----------
export function ekraanLeht(nonce, { kood }) {
  return `${pea('Ukse ekraan', `body{background:#0f172a;color:#fff;text-align:center}main{max-width:none}#qr svg{width:min(78vmin,560px);height:min(78vmin,560px);border-radius:16px}
.riba{height:10px;background:#1e293b;border-radius:5px;max-width:560px;margin:14px auto;overflow:hidden}.riba div{height:100%;background:#22c55e;transition:width 1s linear}`)}
<body><main><h1 id="nimi" style="font-size:2rem">Ukse ekraan</h1><div id="qr"></div><div class="riba"><div id="riba" style="width:100%"></div></div>
<p style="font-size:1.3rem">📱 Skänni telefoniga, et avada. Kood vahetub iga 30 sekundi järel.</p><p id="olek" class="vaike" style="color:#94a3b8"></p></main>
<script nonce="${nonce}">${QR_JS}</script>
<script nonce="${nonce}">
${ABI}
const KOOD=${JSON.stringify(kood)}, TOKEN=location.hash.slice(1); let lopp=0, timer=null;
async function too(){try{const r=await fetch('/api/ekraan/'+KOOD,{method:'POST',headers:{Authorization:'Bearer '+TOKEN}});const j=await r.json();
  if(!j.ok){$('#olek').textContent='Viga: '+(j.viga||r.status);return setTimeout(too,5000);}
  $('#nimi').textContent=j.nimi; $('#qr').innerHTML=qrSvg(j.url); $('#qr').dataset.url=j.url; lopp=Date.now()+j.kehtib_ms; $('#olek').textContent='Ühendatud';
  clearTimeout(timer); timer=setTimeout(too,j.kehtib_ms+300);}catch(e){$('#olek').textContent='Ühendus puudub, proovin uuesti…';setTimeout(too,3000);}}
setInterval(()=>{$('#riba').style.width=Math.max(0,Math.min(100,(lopp-Date.now())/300))+'%';},500);
too();
</script></body></html>`;
}

// ---------- demo: simuleeritud relee ----------
const DEMO_POLL = `const KOOD=KOOD_JSON, TOKEN=location.hash.slice(1);
async function kysi(){let j=null;try{const r=await fetch('/api/relee/'+KOOD,{method:'POST',headers:{Authorization:'Bearer '+TOKEN}});j=await r.json();}catch(e){}
  if(!j||!j.ok){$('#olek').textContent=j?('Viga: '+j.viga):'Ühendus puudub…';return setTimeout(kysi,3000);}
  $('#olek').textContent='🟢 Ühendatud serveriga (küsib iga sekund)'; $('#nimi').textContent=j.nimi; if(j.kask) taida(j.kask); setTimeout(kysi,1000);}`;

export function demoUksLeht(nonce, { kood }) {
  return `${pea('Demolukk', `body{background:#111827;color:#fff;text-align:center;transition:background .4s}body.avatud{background:#14532d}main{max-width:none;padding-top:6vh}
#lukk{font-size:min(40vmin,260px);line-height:1;display:inline-block;transition:transform .4s}.avatud #lukk{transform:scale(1.15) rotate(-8deg)}
#silt{font-size:min(10vmin,64px);font-weight:800;letter-spacing:.08em;margin:2vh 0}#kes{font-size:1.6rem;min-height:2rem}`)}
<body><main><p id="nimi" style="font-size:1.4rem;color:#cbd5e1">Uks</p><div id="lukk">🔒</div><div id="silt">LUKUS</div><div id="kes"></div>
<p id="olek" style="color:#94a3b8"></p><p class="vaike" style="color:#64748b">Demo: see leht simuleerib ukse releed. Päris seade (Shelly/ESP32) küsib sama liidest.</p></main>
<script nonce="${nonce}">
${ABI}
${DEMO_POLL.replace('KOOD_JSON', JSON.stringify(kood))}
let sulge=null;
function taida(k){ if(k.liik!=='ava') return; document.body.classList.add('avatud'); $('#lukk').textContent='🔓'; $('#silt').textContent='AVATUD'; $('#kes').textContent=k.kellele?('Tere, '+k.kellele+'!'):'';
  clearTimeout(sulge); sulge=setTimeout(()=>{document.body.classList.remove('avatud');$('#lukk').textContent='🔒';$('#silt').textContent='LUKUS';$('#kes').textContent='';},(k.sekundit||5)*1000);}
kysi();
</script></body></html>`;
}

export function demoAutomaatLeht(nonce, { kood }) {
  return `${pea('Demoautomaat', `body{background:#1f2937;color:#fff;text-align:center}main{max-width:520px;padding-top:4vh}
.masin{background:linear-gradient(#475569,#334155);border-radius:24px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.ekraan{background:#0f172a;border-radius:12px;padding:16px;font:600 1.4rem/1.3 monospace;color:#4ade80;min-height:4.5rem}
.ava{margin:22px auto 0;width:70%;height:170px;background:#020617;border-radius:12px;position:relative;overflow:hidden}
#toode{position:absolute;left:0;right:0;top:-120px;font-size:90px;transition:top .9s cubic-bezier(.5,1.6,.5,1)}#toode.all{top:30px}
ul{list-style:none;padding:0;color:#cbd5e1}`)}
<body><main><h1 id="nimi">Automaat</h1><div class="masin"><div class="ekraan" id="ekr">Vali toode telefonis</div><div class="ava"><div id="toode"></div></div></div>
<ul id="ajalugu"></ul><p id="olek" style="color:#94a3b8"></p><p class="vaike" style="color:#94a3b8">Demo: see leht simuleerib automaadi releed / MDB-liidest.</p></main>
<script nonce="${nonce}">
${ABI}
${DEMO_POLL.replace('KOOD_JSON', JSON.stringify(kood))}
const AJ=[]; let tagasi=null;
function ikoon(n){n=n.toLowerCase();return n.includes('vesi')?'💧':n.includes('krõps')?'🥔':n.includes('šokol')?'🍫':n.includes('batoon')?'🍪':n.includes('kakao')?'🍫':'☕';}
function taida(k){ if(k.liik!=='valjasta') return; $('#ekr').textContent='Väljastan: '+k.toode; const t=$('#toode'); t.className=''; t.textContent=ikoon(k.toode||'');
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.className='all'));
  AJ.unshift(new Date().toLocaleTimeString('et-EE')+' · '+k.toode+' · '+(k.kellele||'')); $('#ajalugu').innerHTML=AJ.slice(0,5).map(x=>'<li>'+esc(x)+'</li>').join('');
  clearTimeout(tagasi); tagasi=setTimeout(()=>{t.className='';$('#ekr').textContent='Vali toode telefonis';},4000);}
kysi();
</script></body></html>`;
}
