import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(rootDir, "public");
const iconDir = join(publicDir, "icons");

const palette = {
  bg: [11, 15, 20, 255],
  fg: [122, 162, 247, 255],
  accent: [158, 206, 106, 255],
};

function ensureDirs() {
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(iconDir, { recursive: true });
}

function setPixel(buffer, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const idx = (y * size + x) * 4;
  buffer[idx] = color[0];
  buffer[idx + 1] = color[1];
  buffer[idx + 2] = color[2];
  buffer[idx + 3] = color[3];
}

function fill(buffer, size, color) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(buffer, size, x, y, color);
    }
  }
}

function fillRect(buffer, size, x, y, w, h, color) {
  for (let iy = 0; iy < h; iy += 1) {
    for (let ix = 0; ix < w; ix += 1) {
      setPixel(buffer, size, x + ix, y + iy, color);
    }
  }
}

function drawCircle(buffer, size, cx, cy, radius, color) {
  const r2 = radius * radius;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(buffer, size, x, y, color);
      }
    }
  }
}

function drawLine(buffer, size, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const radius = thickness / 2;
  if (steps === 0) {
    drawCircle(buffer, size, x0, y0, radius, color);
    return;
  }
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    drawCircle(buffer, size, x, y, radius, color);
  }
}

function renderIcon(size) {
  const buffer = new Uint8Array(size * size * 4);
  fill(buffer, size, palette.bg);

  const margin = Math.round(size * 0.2);
  const topY = margin;
  const leftX = margin;
  const rightX = size - 1 - margin;
  const bottomY = size - 1 - margin;
  const midX = Math.round((leftX + rightX) / 2);
  const thickness = Math.max(1, Math.round(size * 0.12));

  drawLine(buffer, size, leftX, topY, midX, bottomY, thickness, palette.fg);
  drawLine(buffer, size, rightX, topY, midX, bottomY, thickness, palette.fg);

  const cursorSize = Math.max(2, Math.round(size * 0.18));
  const cursorMargin = Math.max(2, Math.round(size * 0.12));
  const cursorX = size - cursorMargin - cursorSize;
  const cursorY = size - cursorMargin - cursorSize;
  fillRect(buffer, size, cursorX, cursorY, cursorSize, cursorSize, palette.accent);

  return buffer;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  crc.writeUInt32BE(crcValue >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < stride; x += 1) {
      raw[rowStart + 1 + x] = pixels[y * stride + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const directory = Buffer.alloc(16 * count);
  let offset = 6 + directory.length;
  const images = [];

  entries.forEach((entry, index) => {
    const { size, data } = entry;
    const dirOffset = index * 16;
    directory[dirOffset] = size === 256 ? 0 : size;
    directory[dirOffset + 1] = size === 256 ? 0 : size;
    directory[dirOffset + 2] = 0;
    directory[dirOffset + 3] = 0;
    directory.writeUInt16LE(1, dirOffset + 4);
    directory.writeUInt16LE(32, dirOffset + 6);
    directory.writeUInt32LE(data.length, dirOffset + 8);
    directory.writeUInt32LE(offset, dirOffset + 12);
    offset += data.length;
    images.push(data);
  });

  return Buffer.concat([header, directory, ...images]);
}

function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="vtr">
  <rect width="100" height="100" rx="16" fill="#0b0f14" />
  <line x1="22" y1="22" x2="50" y2="78" stroke="#7aa2f7" stroke-width="12" stroke-linecap="round" />
  <line x1="78" y1="22" x2="50" y2="78" stroke="#7aa2f7" stroke-width="12" stroke-linecap="round" />
  <rect x="64" y="64" width="18" height="18" rx="4" fill="#9ece6a" />
</svg>
`;
}

function writeAssets() {
  ensureDirs();

  const sizes = [16, 32, 48, 180];
  const pngBuffers = new Map();

  sizes.forEach((size) => {
    const pixels = renderIcon(size);
    const png = encodePng(size, pixels);
    pngBuffers.set(size, png);
  });

  writeFileSync(join(publicDir, "favicon-16.png"), pngBuffers.get(16));
  writeFileSync(join(publicDir, "favicon-32.png"), pngBuffers.get(32));
  writeFileSync(join(publicDir, "favicon-48.png"), pngBuffers.get(48));
  writeFileSync(join(publicDir, "apple-touch-icon.png"), pngBuffers.get(180));

  const ico = encodeIco([
    { size: 16, data: pngBuffers.get(16) },
    { size: 32, data: pngBuffers.get(32) },
    { size: 48, data: pngBuffers.get(48) },
  ]);
  writeFileSync(join(publicDir, "favicon.ico"), ico);

  const svg = buildSvg();
  writeFileSync(join(publicDir, "favicon.svg"), svg);
  writeFileSync(join(iconDir, "vtr-mark.svg"), svg);
}

writeAssets();
console.log("favicon assets generated");
