// Draw the app icons (PNG) for "install on the home screen" - no image library needed (from the Lao Kip project).
// The mark: white "MN" on the brand orange (--brand #b8431a), same as the logo in the menu.
// Usage: node scripts/make-icons.mjs -> icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
// Run again only when the logo or the colours change; the PNG files are part of the site.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ROOT } from "./lib/util.mjs";

const OUT_DIR = path.join(ROOT, "icons");
const BRAND = [184, 67, 26];
const INK = [255, 255, 255];
const SAMPLES = 4; // 4 x 4 samples per pixel = smooth edges
const W = 0.078; // stroke width
// "M" and "N" in a 0..1 square: [x1, y1, x2, y2]. Round line ends.
const STROKES = [
  [0.19, 0.67, 0.19, 0.33], [0.19, 0.33, 0.315, 0.53], [0.315, 0.53, 0.44, 0.33], [0.44, 0.33, 0.44, 0.67], // M
  [0.56, 0.67, 0.56, 0.33], [0.56, 0.33, 0.81, 0.67], [0.81, 0.67, 0.81, 0.33], // N
];

function distToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function inRoundedSquare(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
  return Math.hypot(x - cx, y - cy) <= r;
}
// radius = corner radius (0 = full square, for "maskable" icons the phone cuts itself); scale = size of the letters
function draw(size, { radius, scale }) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let bg = 0, ink = 0;
    for (let sy = 0; sy < SAMPLES; sy++) for (let sx = 0; sx < SAMPLES; sx++) {
      const u = (x + (sx + 0.5) / SAMPLES) / size, v = (y + (sy + 0.5) / SAMPLES) / size;
      if (radius > 0 && !inRoundedSquare(u, v, radius)) continue;
      bg++;
      const gu = 0.5 + (u - 0.5) / scale, gv = 0.5 + (v - 0.5) / scale;
      if (STROKES.some((s) => distToSegment(gu, gv, s) <= W / 2)) ink++;
    }
    const i = (y * size + x) * 4, k = bg ? ink / bg : 0;
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BRAND[c] * (1 - k) + INK[c] * k);
    rgba[i + 3] = Math.round((bg / (SAMPLES * SAMPLES)) * 255);
  }
  return rgba;
}

// ---------- a minimal PNG writer (RGBA, 8 bit) ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const ICONS = [
  ["icon-192.png", 192, { radius: 0.22, scale: 1 }],
  ["icon-512.png", 512, { radius: 0.22, scale: 1 }],
  ["icon-maskable-512.png", 512, { radius: 0, scale: 0.74 }], // full square, letters inside the safe middle
  ["apple-touch-icon.png", 180, { radius: 0, scale: 0.92 }], // iPhone rounds the corners itself
  ["favicon-48.png", 48, { radius: 0.22, scale: 1 }],
];
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, size, shape] of ICONS) {
  const file = png(size, draw(size, shape));
  fs.writeFileSync(path.join(OUT_DIR, name), file);
  console.log(`${name}  ${size}x${size}  ${(file.length / 1024).toFixed(1)} KB`);
}
