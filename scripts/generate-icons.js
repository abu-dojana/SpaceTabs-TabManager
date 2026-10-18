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

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0x00
  const scanlineWidth = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineWidth));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + scanlineWidth);
    rawData[rawOffset] = 0; // None filter
    rgbaBuffer.copy(rawData, rawOffset + 1, y * scanlineWidth, (y + 1) * scanlineWidth);
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function pointInPolygon(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderIconRGBA(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;

  // Scaled needle vertices (from Lucide 24x24 translated by 4,4 in 32x32)
  // Polygon: [16.24, 7.76], [14.12, 14.12], [7.76, 16.24], [9.88, 9.88]
  // In [0,1] normalized coords:
  // (4 + x) / 32, (4 + y) / 32
  const needleNorm = [
    [(4 + 16.24) / 32, (4 + 7.76) / 32],
    [(4 + 14.12) / 32, (4 + 14.12) / 32],
    [(4 + 7.76) / 32, (4 + 16.24) / 32],
    [(4 + 9.88) / 32, (4 + 9.88) / 32],
  ];
  const needlePoly = needleNorm.map(([nx, ny]) => [nx * size, ny * size]);

  const ringRadius = (10 / 32) * size;
  const ringThickness = Math.max(1, (2 / 32) * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rect check
      let inRect = false;
      const rx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const ry = Math.max(radius - y, 0, y - (size - 1 - radius));
      if (rx * rx + ry * ry <= radius * radius) {
        inRect = true;
      }

      if (!inRect) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Compass circle check
      const distFromCenter = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const onRing = Math.abs(distFromCenter - ringRadius) <= (ringThickness / 2 + 0.3);

      // Compass needle check
      const inNeedle = pointInPolygon(x + 0.5, y + 0.5, needlePoly);

      if (onRing || inNeedle) {
        // White icon
        buf[idx] = 255;
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = 255;
      } else {
        // Blue gradient background (#3B82F6 -> #1D4ED8)
        const factor = (x + y) / (size * 2);
        const r = Math.round(59 + (29 - 59) * factor);
        const g = Math.round(130 + (78 - 130) * factor);
        const b = Math.round(246 + (216 - 246) * factor);
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255;
      }
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
  <g transform="translate(16, 16) scale(4)" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="white"/>
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

console.log('Successfully generated icons: icon.svg, icon-16.png, icon-32.png, icon-48.png, icon-128.png');
