/**
 * Genera build/icon.ico con 4 tamaños reales: 16×16, 32×32, 48×48, 256×256
 * Windows requiere múltiples tamaños en el ICO para mostrarlo correctamente.
 * El PNG original 256×256 se escala a los tamaños menores con bilinear.
 */
import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, '..', 'build');
const OUT_ICO   = path.join(OUT_DIR, 'icon.ico');
const OUT_PNG   = path.join(OUT_DIR, 'icon256.png');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── LIENZO RGBA 256×256 ──────────────────────────────────────────────────────
const SZ = 256;
const px = new Uint8Array(SZ * SZ * 4);

const set = (x, y, r, g, b, a = 255) => {
  if (x < 0 || x >= SZ || y < 0 || y >= SZ) return;
  const i = (y * SZ + x) * 4;
  if (a >= 254) { px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=255; return; }
  const ao = px[i+3]/255, an = a/255, af = ao + an*(1-ao);
  if (!af) return;
  px[i]  =((px[i]  *ao+r*an*(1-ao))/af)|0;
  px[i+1]=((px[i+1]*ao+g*an*(1-ao))/af)|0;
  px[i+2]=((px[i+2]*ao+b*an*(1-ao))/af)|0;
  px[i+3]=(af*255)|0;
};

const rect = (x1,y1,x2,y2,r,g,b,a=255) => {
  for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) set(x,y,r,g,b,a);
};

const circ = (cx,cy,rad,r,g,b,a=255) => {
  const r2=rad*rad;
  for(let y=cy-rad;y<=cy+rad;y++)
    for(let x=cx-rad;x<=cx+rad;x++)
      if((x-cx)**2+(y-cy)**2<=r2) set(x,y,r,g,b,a);
};

// ─── DIBUJAR ÍCONO ────────────────────────────────────────────────────────────

// 1. Fondo azul degradado con esquinas redondeadas
const CR = 46;
for(let y=0;y<SZ;y++) for(let x=0;x<SZ;x++){
  const corner=(x<CR&&y<CR)?[(CR),(CR)]:(x>=SZ-CR&&y<CR)?[SZ-CR-1,CR]:(x<CR&&y>=SZ-CR)?[CR,SZ-CR-1]:(x>=SZ-CR&&y>=SZ-CR)?[SZ-CR-1,SZ-CR-1]:null;
  if(corner && (x-corner[0])**2+(y-corner[1])**2>CR*CR) continue;
  const t=(x+y)/(SZ*1.8);
  set(x,y, (12+t*22)|0, (40+t*45)|0, (130+t*35)|0);
}

// 2. Cuerpo del contenedor (blanco, redondeado)
for(let y=78;y<=170;y++) for(let x=20;x<=170;x++){
  const r=7;
  const inC=(x<20+r&&y<78+r)?(x-20-r)**2+(y-78-r)**2>r*r:(x>170-r&&y<78+r)?(x-170+r)**2+(y-78-r)**2>r*r:(x<20+r&&y>170-r)?(x-20-r)**2+(y-170+r)**2>r*r:(x>170-r&&y>170-r)?(x-170+r)**2+(y-170+r)**2>r*r:false;
  if(!inC) set(x,y,255,255,255);
}

// 3. Líneas de corrugación del contenedor
for(let i=0;i<4;i++){ const lx=40+i*34; rect(lx,81,lx+2,167,110,155,230,130); }

// 4. Letras GF en el contenedor (azul marino)
//  — G —
rect(58,104,84,111, 18,52,130); // top
rect(55,104,63,140, 18,52,130); // izq
rect(58,133,84,140, 18,52,130); // bot
rect(77,120,84,140, 18,52,130); // der
rect(72,119,84,126, 18,52,130); // med
//  — F —
rect(94,104,118,111, 18,52,130); // top
rect(91,104,99,140, 18,52,130); // izq
rect(94,118,113,125, 18,52,130); // med

// 5. Cabina (blanca, redondeado)
for(let y=98;y<=170;y++) for(let x=166;x<=235;x++){
  const r=7;
  const inC=(x<166+r&&y<98+r)?(x-166-r)**2+(y-98-r)**2>r*r:(x>235-r&&y<98+r)?(x-235+r)**2+(y-98-r)**2>r*r:false;
  if(!inC) set(x,y,255,255,255);
}

// 6. Parabrisas (azul translúcido)
rect(175,107,228,159, 30,100,210, 210);
rect(173,105,175,161, 255,255,255); // marco izq
rect(173,105,228,107, 255,255,255); // marco top

// 7. Faro (amarillo)
circ(229,148,8,255,215,0);
circ(229,148,5,255,245,150);

// 8. Chasis
rect(20,172,235,180, 255,255,255);

// 9. Ruedas (2 traseras + 1 delantera)
const wheel=(cx,cy,ro,ri)=>{
  circ(cx,cy,ro,255,255,255);
  circ(cx,cy,ri,25,55,150);
  circ(cx,cy,(ri*0.4)|0,220,225,240);
};
wheel(62,194,25,16);
wheel(144,194,25,16);
wheel(208,194,21,14);

// 10. Estribo
rect(22,170,90,175, 200,215,240,160);
rect(140,170,180,175,200,215,240,160);
rect(196,170,230,175,200,215,240,160);

// 11. Espejo retrovisor
rect(229,116,237,128,255,255,255);
rect(232,110,237,116,200,215,235);

// 12. Escape
rect(16,153,24,177,180,200,230);
circ(20,153,5,160,185,220);

// 13. Sombra bajo el camión
for(let x=25;x<235;x++){
  const a=(35*Math.sin(Math.PI*(x-25)/210))|0;
  circ(x,218,2,0,0,20,a);
}

// ─── ENCODER PNG puro Node.js ──────────────────────────────────────────────
function crc32(buf){
  if(!crc32.t){
    crc32.t=new Uint32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crc32.t[n]=c;}
  }
  let c=0xFFFFFFFF;
  for(const b of buf) c=crc32.t[(c^b)&0xFF]^(c>>>8);
  return(c^0xFFFFFFFF)>>>0;
}
function chunk(type,data){
  const t=Buffer.from(type),d=Buffer.isBuffer(data)?data:Buffer.from(data);
  const len=Buffer.allocUnsafe(4); len.writeUInt32BE(d.length,0);
  const crc=Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t,d])),0);
  return Buffer.concat([len,t,d,crc]);
}
function makePNG(w,h,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  const raw=Buffer.allocUnsafe(h*(1+w*4));
  for(let y=0;y<h;y++){
    raw[y*(1+w*4)]=0;
    for(let x=0;x<w;x++){
      const s=(y*w+x)*4,d=y*(1+w*4)+1+x*4;
      raw[d]=rgba[s];raw[d+1]=rgba[s+1];raw[d+2]=rgba[s+2];raw[d+3]=rgba[s+3];
    }
  }
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

// ─── SCALE BILINEAR (256→other sizes) ────────────────────────────────────────
function scaleTo(src,srcW,srcH,dstW,dstH){
  const dst=new Uint8Array(dstW*dstH*4);
  for(let y=0;y<dstH;y++) for(let x=0;x<dstW;x++){
    const gx=(x+0.5)*srcW/dstW-0.5, gy=(y+0.5)*srcH/dstH-0.5;
    const x0=Math.max(0,Math.floor(gx)),x1=Math.min(srcW-1,x0+1);
    const y0=Math.max(0,Math.floor(gy)),y1=Math.min(srcH-1,y0+1);
    const fx=gx-Math.floor(gx),fy=gy-Math.floor(gy);
    const i=((y*dstW+x)*4);
    for(let c=0;c<4;c++){
      const tl=src[(y0*srcW+x0)*4+c],tr=src[(y0*srcW+x1)*4+c];
      const bl=src[(y1*srcW+x0)*4+c],br=src[(y1*srcW+x1)*4+c];
      dst[i+c]=(tl*(1-fx)*(1-fy)+tr*fx*(1-fy)+bl*(1-fx)*fy+br*fx*fy+0.5)|0;
    }
  }
  return dst;
}

// ─── CONSTRUIR ICO MULTI-TAMAÑO ───────────────────────────────────────────────
// ICO formato: header(6) + N×directory(16) + N×imagedata
// Para 256×256 se embebe PNG directamente (ICO moderno Windows Vista+)
// Para 16,32,48 se embebe BMP (BITMAPINFOHEADER + XOR mask + AND mask)

function makeBMP(size, rgba){
  // BITMAPINFOHEADER = 40 bytes
  const headerSize=40, rowBytes=size*4;
  // ICO BMP: height = size*2 (XOR+AND stacked), AND mask = 1bpp
  const andRowBytes = Math.ceil(size/8);
  const andRowPadded = Math.ceil(andRowBytes/4)*4;
  const xorSize = size*rowBytes;
  const andSize = size*andRowPadded;
  const totalSize = headerSize + xorSize + andSize;

  const buf = Buffer.allocUnsafe(totalSize);
  let off=0;
  buf.writeUInt32LE(headerSize,off); off+=4;
  buf.writeInt32LE(size,off);        off+=4;
  buf.writeInt32LE(size*2,off);      off+=4; // doubled for ICO
  buf.writeUInt16LE(1,off);          off+=2; // planes
  buf.writeUInt16LE(32,off);         off+=2; // bit count
  buf.writeUInt32LE(0,off);          off+=4; // compression (none)
  buf.writeUInt32LE(xorSize,off);    off+=4; // image size
  buf.writeInt32LE(0,off);           off+=4; // X px/m
  buf.writeInt32LE(0,off);           off+=4; // Y px/m
  buf.writeUInt32LE(0,off);          off+=4; // colors used
  buf.writeUInt32LE(0,off);          off+=4; // important

  // XOR mask (BGRA, bottom-up)
  for(let y=size-1;y>=0;y--){
    for(let x=0;x<size;x++){
      const s=(y*size+x)*4;
      buf[off++]=rgba[s+2]; // B
      buf[off++]=rgba[s+1]; // G
      buf[off++]=rgba[s];   // R
      buf[off++]=rgba[s+3]; // A
    }
  }

  // AND mask (1bpp, bottom-up, padded to 4 bytes)
  for(let y=size-1;y>=0;y--){
    let byteVal=0,bit=7,rowOff=0;
    for(let x=0;x<size;x++){
      const a=rgba[(y*size+x)*4+3];
      if(a<128) byteVal|=(1<<bit);
      if(--bit<0){ buf[off+rowOff++]=byteVal; byteVal=0; bit=7; }
    }
    if(bit<7) buf[off+rowOff++]=byteVal;
    while(rowOff<andRowPadded) buf[off+rowOff++]=0;
    off+=andRowPadded;
  }
  return buf;
}

// Generar PNG 256×256
const png256 = makePNG(SZ,SZ,px);
fs.writeFileSync(OUT_PNG, png256);

// Escalar a 16,32,48
const sizes=[16,32,48];
const bmps = sizes.map(s=>makeBMP(s, scaleTo(px,SZ,SZ,s,s)));

// ICO header + directory + data
const numImages = sizes.length + 1; // 16,32,48 + 256
const dataOffset = 6 + numImages*16;
const images=[...bmps, png256];
const imageSizes=[...sizes,0]; // 0 = 256 para ICO

const hdr=Buffer.allocUnsafe(6);
hdr.writeUInt16LE(0,0); hdr.writeUInt16LE(1,2); hdr.writeUInt16LE(numImages,4);

const entries=[];
let curOffset=dataOffset;
for(let i=0;i<numImages;i++){
  const e=Buffer.allocUnsafe(16);
  e[0]=imageSizes[i]; e[1]=imageSizes[i]; e[2]=0; e[3]=0;
  e.writeUInt16LE(1,4); e.writeUInt16LE(32,6);
  e.writeUInt32LE(images[i].length,8);
  e.writeUInt32LE(curOffset,12);
  curOffset+=images[i].length;
  entries.push(e);
}

const ico=Buffer.concat([hdr,...entries,...images]);
fs.writeFileSync(OUT_ICO,ico);

console.log(`✅ Ícono multi-tamaño generado:`);
console.log(`   PNG 256×256: ${OUT_PNG} (${(png256.length/1024).toFixed(1)} KB)`);
console.log(`   ICO (16+32+48+256): ${OUT_ICO} (${(ico.length/1024).toFixed(1)} KB)`);
sizes.forEach((s,i)=>console.log(`   BMP ${s}×${s}: ${(bmps[i].length/1024).toFixed(1)} KB`));
