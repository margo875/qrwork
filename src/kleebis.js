// Leiamindi kleebis 30 × 30 mm (raamtekst „TEATA LEIUST“, registrikleebis, tekstita kleebis). Üle võetud repost margo875/leiamind
// (src/leht.js KLEEBIS_JS, 02.11.2026); geomeetria ja mõõdud on seal README-s „Kleebis“. q = {n: moodulid, p: SVG tee}, ühik 1 mm.
export const KLEEBIS_JS = String.raw`
var KLV={
  s:{S:30,B:3.31,C:2.005,fs:2.8,tl:20,m:0,qzm:0},
  a:{S:30,B:3.31,C:2.005,fs:2.8,tl:20,m:19.9/29,qzm:0},
  b:{S:0,B:2.604,C:1.604,fs:2.24,tl:16,m:18.5/29,qzm:2.5}
};
var KLB={s:(30-2*3.31)/37,a:19.9/29,b:18.5/29}, KLM=0.5, KLVAIKE='a';
var KLR={ws:5,mx:1,idw:4.2,idf:1.8,nf:2.2};
function kleebisGeom(q,v){
  var g=KLV[v]||KLV[KLVAIKE];
  if(g.m&&q.n!==29)g=KLV.s;
  var m=g.m||(g.S-2*g.B)/(q.n+8), S=g.qzm?2*g.B+(q.n+2*g.qzm)*m:g.S;
  return {S:S,B:g.B,C:g.C,fs:g.fs,tl:g.tl,m:m,x0:(S-q.n*m)/2};
}
function kleebisMoot(q,v,ilma){
  if(ilma)return (q.n+8)*(KLB[v]||KLB[KLVAIKE])+2*KLM;
  return kleebisGeom(q,v).S;
}
function kEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function kLaius(t){var w=0,i,c;for(i=0;i<t.length;i++){c=t.charAt(i);w+=/[mwMW@]/.test(c)?0.95:/[ijlt.,:;'|!f1 I]/.test(c)?0.3:/[A-ZÕÄÖÜŠŽ]/.test(c)?0.72:0.58;}return w;}
// Registrikleebis (Margo 01.11.2026): QR (sama moodul ja vaikne tsoon 4 moodulit nagu tekstita kleebisel) + kirjutusruum >= 5 mm + kirjutusjoon.
// Joone vasakus otsas ID viimased 4 märki, joone kohal (kirjutusruumis) valikuline sildi nimi hallis kirjas. Raamteksti ei ole.
function kleebisRegMoot(q,v){
  var m=KLB[v]||KLB[KLVAIKE], W=(q.n+8)*m+2*KLM, yL=KLM+(q.n+8)*m+KLR.ws;
  return {W:W,H:yL+0.6,yL:yL,m:m,ws:KLR.ws};
}
function kleebisReg(q,id,v,nimi){
  var r=function(x){return +x.toFixed(4);}, g=kleebisRegMoot(q,v), W=g.W, m=g.m, yL=g.yL,
    x0=(W-q.n*m)/2, y0=KLM+4*m, xl=KLR.mx+KLR.idw+0.5, xr=W-KLR.mx,
    k=String(id).replace(/[^A-Za-z0-9]/g,'').slice(-4),
    o='<rect x=".1" y=".1" width="'+r(W-.2)+'" height="'+r(g.H-.2)+'" fill="#fff" stroke="#999" stroke-width=".2" stroke-dasharray=".8 .8"/>'
    +'<path transform="translate('+r(x0)+' '+r(y0)+') scale('+m.toFixed(5)+')" d="'+q.p+'" fill="#000" shape-rendering="crispEdges"/>'
    +'<text x="'+KLR.mx+'" y="'+r(yL-.2)+'" font-family="monospace" font-size="'+KLR.idf+'" textLength="'+KLR.idw+'" lengthAdjust="spacingAndGlyphs" fill="#000">'+kEsc(k)+'</text>'
    +'<line x1="'+r(xl)+'" y1="'+r(yL)+'" x2="'+r(xr)+'" y2="'+r(yL)+'" stroke="#000" stroke-width=".25"/>',
    t=String(nimi==null?'':nimi).replace(/[\u0000-\u001f]/g,' ').trim(), a=xr-xl-0.6;
  if(t){
    while(t.length>1&&kLaius(t)*KLR.nf>a)t=t.slice(0,-1).trim();
    if(t.length<String(nimi).trim().length)t=t.replace(/.$/,'')+'…';
    o+='<text x="'+r(xl+0.3)+'" y="'+r(yL-.5)+'" font-family="Arial, Helvetica, sans-serif" font-size="'+KLR.nf+'" fill="#999">'+kEsc(t)+'</text>';
  }
  return o;
}
function kleebisSvg(q,id,v,ilma){
  var r=function(x){return +x.toFixed(4);}, S, m, x0;
  if(ilma){
    S=kleebisMoot(q,v,true); m=KLB[v]||KLB[KLVAIKE]; x0=(S-q.n*m)/2;
    return '<rect x=".1" y=".1" width="'+r(S-.2)+'" height="'+r(S-.2)+'" fill="#fff" stroke="#999" stroke-width=".2" stroke-dasharray=".8 .8"/>'
      +'<path transform="translate('+x0.toFixed(4)+' '+x0.toFixed(4)+') scale('+m.toFixed(5)+')" d="'+q.p+'" fill="#000" shape-rendering="crispEdges"/>';
  }
  var g=kleebisGeom(q,v), t='TEATA LEIUST', B=g.B, C=g.C; S=g.S; m=g.m; x0=g.x0;
  var E=S-B, H=r(S/2),
    f='font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="'+g.fs+'" text-anchor="middle" textLength="'+g.tl+'" lengthAdjust="spacingAndGlyphs" fill="#000"',
    k=String(id).replace(/[^A-Za-z0-9]/g,'').slice(-4);
  return '<rect x=".1" y=".1" width="'+r(S-.2)+'" height="'+r(S-.2)+'" fill="#fff" stroke="#999" stroke-width=".2" stroke-dasharray=".8 .8"/>'
    +'<path transform="translate('+x0.toFixed(4)+' '+x0.toFixed(4)+') scale('+m.toFixed(5)+')" d="'+q.p+'" fill="#000" shape-rendering="crispEdges"/>'
    +'<text x="'+H+'" y="'+r(B)+'" '+f+'>'+t+'</text>'
    +'<text transform="translate('+r(E)+' '+H+') rotate(90)" '+f+'>'+t+'</text>'
    +'<text x="'+H+'" y="'+r(E+C)+'" '+f+'>'+t+'</text>'
    +'<text transform="translate('+r(B)+' '+H+') rotate(-90)" '+f+'>'+t+'</text>'
    +'<text transform="translate('+r(S-2.3)+' '+r(S-4.6)+') rotate(90)" font-family="monospace" font-size="1.3" textLength="3" lengthAdjust="spacingAndGlyphs" fill="#000">'+k+'</text>';
}`;
