import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlineWidth = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineWidth));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + scanlineWidth);
    rawData[rawOffset] = 0;
    rgbaBuffer.copy(rawData, rawOffset + 1, y * scanlineWidth, (y + 1) * scanlineWidth);
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// Normalized (0 to 1) 24x24 Lucide Layers segments
const normalizedSegments = [
  // Top diamond
  [12 / 24, 2.8 / 24, 21.2 / 24, 7.5 / 24],
  [21.2 / 24, 7.5 / 24, 12 / 24, 12.2 / 24],
  [12 / 24, 12.2 / 24, 2.8 / 24, 7.5 / 24],
  [2.8 / 24, 7.5 / 24, 12 / 24, 2.8 / 24],
  // Middle chevron
  [2.8 / 24, 12.5 / 24, 12 / 24, 17.2 / 24],
  [12 / 24, 17.2 / 24, 21.2 / 24, 12.5 / 24],
  // Bottom chevron
  [2.8 / 24, 17.5 / 24, 12 / 24, 22.2 / 24],
  [12 / 24, 22.2 / 24, 21.2 / 24, 17.5 / 24],
];

function renderIconRGBA(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.22);
  const pad = size * 0.19;
  const innerSize = size - pad * 2;
  const thickness = Math.max(1.2, size * 0.075);

  const scaledSegments = normalizedSegments.map(([x1, y1, x2, y2]) => [
    pad + x1 * innerSize,
    pad + y1 * innerSize,
    pad + x2 * innerSize,
    pad + y2 * innerSize,
  ]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // Rounded rectangle distance & antialiasing
      const rx = Math.max(radius - px, 0, px - (size - radius));
      const ry = Math.max(radius - py, 0, py - (size - radius));
      const distFromCorner = Math.hypot(rx, ry);
      let cornerAlpha = 1.0;
      if (distFromCorner > radius) {
        cornerAlpha = Math.max(0, 1.0 - (distFromCorner - radius));
      }

      if (cornerAlpha <= 0) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Find minimum distance to any layers line segment
      let minDist = 999999;
      for (const [x1, y1, x2, y2] of scaledSegments) {
        const d = distToSegment(px, py, x1, y1, x2, y2);
        if (d < minDist) minDist = d;
      }

      // Antialiased stroke coverage
      const strokeRadius = thickness / 2;
      let strokeAlpha = 0;
      if (minDist <= strokeRadius) {
        strokeAlpha = 1.0;
      } else if (minDist <= strokeRadius + 0.8) {
        strokeAlpha = Math.max(0, 1.0 - (minDist - strokeRadius) / 0.8);
      }

      // Vibrant Gradient Background (#3B82F6 -> #1D4ED8)
      const factor = (x + y) / (size * 2);
      const bgR = Math.round(59 + (29 - 59) * factor);
      const bgG = Math.round(130 + (78 - 130) * factor);
      const bgB = Math.round(246 + (216 - 246) * factor);

      // Blend white stroke (255,255,255) over background
      const finalR = Math.round(bgR * (1 - strokeAlpha) + 255 * strokeAlpha);
      const finalG = Math.round(bgG * (1 - strokeAlpha) + 255 * strokeAlpha);
      const finalB = Math.round(bgB * (1 - strokeAlpha) + 255 * strokeAlpha);
      const finalA = Math.round(255 * cornerAlpha);

      buf[idx] = finalR;
      buf[idx + 1] = finalG;
      buf[idx + 2] = finalB;
      buf[idx + 3] = finalA;
    }
  }
  return buf;
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <g transform="translate(24, 24) scale(3.333)" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9A1 1 0 0 0 22 7.91a1 1 0 0 0 0-1.83z"/>
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>
  </g>
</svg>`;

const targetDirs = [
  path.resolve('src/public'),
  path.resolve('public'),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'icon.svg'), svgContent, 'utf-8');

  for (const size of [16, 32, 48, 128]) {
    const rgba = renderIconRGBA(size);
    const pngBuf = encodePNG(size, size, rgba);
    fs.writeFileSync(path.join(dir, `icon-${size}.png`), pngBuf);
  }
}

console.log('Successfully generated modern Layers icons: icon.svg, icon-16.png, icon-32.png, icon-48.png, icon-128.png');
