/**
 * Genera íconos Android desde build/icon256.png
 * Escala a los tamaños estándar: mdpi(48), hdpi(72), xhdpi(96), xxhdpi(144), xxxhdpi(192)
 * También crea ic_launcher_round y ic_launcher_foreground para adaptive icons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const ICON_PNG = path.join(__dirname, '..', 'build', 'icon256.png');

// Read the 256x256 PNG and decode to RGBA pixels
function decodePNG(pngBuffer) {
  // Minimal PNG decoder — handles our simple case (RGBA, no interlace)
  let offset = 8; // skip signature
  let width = 0, height = 0;
  const idatChunks = [];

  while (offset < pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.slice(offset + 4, offset + 8).toString('ascii');
    const data = pngBuffer.slice(offset + 8, offset + 8 + len);
    offset += 12 + len; // len + type + data + crc

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);

  // Unfilter (each row starts with a filter byte)
  const bpp = 4; // RGBA
  const rowBytes = width * bpp;
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (rowBytes + 1)];
    const rowStart = y * (rowBytes + 1) + 1;
    const prevRowStart = (y - 1) * (rowBytes + 1) + 1;

    for (let x = 0; x < rowBytes; x++) {
      const i = rowStart + x;
      const a = x >= bpp ? pixels[y * rowBytes + x - bpp] : 0;
      const b = y > 0 ? pixels[(y - 1) * rowBytes + x] : 0;
      const c = (x >= bpp && y > 0) ? pixels[(y - 1) * rowBytes + x - bpp] : 0;

      let val = raw[i];
      switch (filterType) {
        case 0: break;
        case 1: val = (val + a) & 0xFF; break;
        case 2: val = (val + b) & 0xFF; break;
        case 3: val = (val + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: { // Paeth
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          val = (val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF;
          break;
        }
      }
      pixels[y * rowBytes + x] = val;
    }
  }

  return { width, height, pixels };
}

// Bilinear scale
function scaleTo(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const gx = (x + 0.5) * srcW / dstW - 0.5;
      const gy = (y + 0.5) * srcH / dstH - 0.5;
      const x0 = Math.max(0, Math.floor(gx)), x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.max(0, Math.floor(gy)), y1 = Math.min(srcH - 1, y0 + 1);
      const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
      const i = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const tl = src[(y0 * srcW + x0) * 4 + c], tr = src[(y0 * srcW + x1) * 4 + c];
        const bl = src[(y1 * srcW + x0) * 4 + c], br = src[(y1 * srcW + x1) * 4 + c];
        dst[i + c] = (tl * (1 - fx) * (1 - fy) + tr * fx * (1 - fy) + bl * (1 - fx) * fy + br * fx * fy + 0.5) | 0;
      }
    }
  }
  return dst;
}

// PNG encoder (same as create-icon.mjs)
function crc32(buf) {
  if (!crc32.t) {
    crc32.t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc32.t[n] = c; }
  }
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crc32.t[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type), d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length, 0);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crc]);
}

function makePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 4) + 1 + x * 4;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]; raw[d + 3] = rgba[s + 3];
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const pngBuf = fs.readFileSync(ICON_PNG);
const { width, height, pixels } = decodePNG(pngBuf);
console.log(`Source icon: ${width}×${height}`);

const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, size] of Object.entries(SIZES)) {
  const dir = path.join(ANDROID_RES, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const scaled = scaleTo(pixels, width, height, size, size);
  const png = makePNG(size, size, scaled);

  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), png);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), png);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), png);

  console.log(`  ${folder}: ${size}×${size} (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('✅ Android icons generated');
