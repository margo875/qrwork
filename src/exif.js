// Foto asukoht brauseris (EXIF GPS ja DateTimeOriginal), sõltuvusteta. Üle võetud repost margo875/leiamind (src/leht.js EXIF_JS, 02.11.2026).
// Sõltuvusteta, katkematu (try/catch, kõik lugemised DataView piirides), ei loe rohkem kui talle antud baitid (leht annab faili 2 MB algusest).
// Tagastab {lat, lon, aeg|null} või null. Kaamera vaikeväärtus 0,0 loetakse asukoha puudumiseks.
// Allikas on string (nagu QR_JS), et sama kood töötaks lehel ja testides; sisemisi nimega funktsioone pole (pakendaja ei lisa abiväljakutseid).
export const EXIF_JS = String.raw`
function exifGps(ab){
  try{
    if(!ab||!ab.byteLength)return null;
    var d=new DataView(ab),n=d.byteLength,p=2;
    if(n<12||d.getUint16(0)!==0xFFD8)return null;
    for(var seg=0;seg<64&&p+4<=n;seg++){
      if(d.getUint8(p)!==0xFF)return null;
      var m=d.getUint8(p+1);
      if(m===0xFF){p++;continue;}
      if(m===0xD8||m===0x01||(m>=0xD0&&m<=0xD7)){p+=2;continue;}
      if(m===0xDA||m===0xD9)return null;
      var len=d.getUint16(p+2);
      if(len<2)return null;
      if(m===0xE1&&len>=10&&d.getUint32(p+4)===0x45786966&&d.getUint16(p+8)===0){
        var t=p+10,bo=d.getUint16(t),le;
        if(bo===0x4949)le=true;else if(bo===0x4D4D)le=false;else return null;
        if(d.getUint16(t+2,le)!==42)return null;
        var gpsOff=0,exifOff=0,o=t+d.getUint32(t+4,le),c=d.getUint16(o,le);
        for(var i=0;i<c&&i<200;i++){
          var e=o+2+i*12,tag=d.getUint16(e,le);
          if(tag===0x8825)gpsOff=d.getUint32(e+8,le);
          if(tag===0x8769)exifOff=d.getUint32(e+8,le);
        }
        if(!gpsOff)return null;
        var aeg=null;
        if(exifOff){
          var o2=t+exifOff,c2=d.getUint16(o2,le);
          for(var j=0;j<c2&&j<200;j++){
            var e2=o2+2+j*12;
            if(d.getUint16(e2,le)===0x9003&&d.getUint32(e2+4,le)>=19){
              var q=t+d.getUint32(e2+8,le),sx='';
              for(var k=0;k<19;k++)sx+=String.fromCharCode(d.getUint8(q+k));
              var mm=/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(sx);
              if(mm)aeg=mm[1]+'-'+mm[2]+'-'+mm[3]+' '+mm[4]+':'+mm[5]+':'+mm[6];
            }
          }
        }
        var og=t+gpsOff,cg=d.getUint16(og,le),latRef=0,lonRef=0,latO=0,lonO=0;
        for(var g=0;g<cg&&g<200;g++){
          var eg=og+2+g*12,tg=d.getUint16(eg,le);
          if(tg===1)latRef=d.getUint8(eg+8);
          if(tg===3)lonRef=d.getUint8(eg+8);
          if((tg===2||tg===4)&&d.getUint16(eg+2,le)===5&&d.getUint32(eg+4,le)===3){
            if(tg===2)latO=d.getUint32(eg+8,le);else lonO=d.getUint32(eg+8,le);
          }
        }
        if(!latO||!lonO)return null;
        var v=[0,0];
        for(var z=0;z<2;z++){
          var b=t+(z?lonO:latO),deg=0,div=1;
          for(var r=0;r<3;r++){
            var nu=d.getUint32(b+r*8,le),de=d.getUint32(b+r*8+4,le);
            if(de===0)return null;
            deg+=(nu/de)/div;div*=60;
          }
          v[z]=deg;
        }
        if(latRef===83)v[0]=-v[0];else if(latRef!==78)return null;
        if(lonRef===87)v[1]=-v[1];else if(lonRef!==69)return null;
        if(!isFinite(v[0])||!isFinite(v[1])||Math.abs(v[0])>90||Math.abs(v[1])>180)return null;
        if(v[0]===0&&v[1]===0)return null;
        return {lat:Math.round(v[0]*1e6)/1e6,lon:Math.round(v[1]*1e6)/1e6,aeg:aeg};
      }
      p+=2+len;
    }
  }catch(x){}
  return null;
}`;
