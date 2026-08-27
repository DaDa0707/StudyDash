/**
 * PWA アイコンを生成する（依存パッケージなし）。
 *
 *   node scripts/generate-icons.mjs
 *
 * 角丸の正方形にチェックマークを描いた PNG を書き出す。
 * 4倍で描いてから縮小することで輪郭を滑らかにしている。
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BACKGROUND = [79, 70, 229]; // #4f46e5
const FOREGROUND = [255, 255, 255];
const SUPERSAMPLE = 4;

/** 点と線分の距離。チェックマークを太さのある線として描くのに使う。 */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** 角丸正方形の内側かどうか */
function insideRoundedSquare(x, y, size, inset, radius) {
  const min = inset;
  const max = size - inset;
  if (x < min || x > max || y < min || y > max) return false;

  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/**
 * @param {number} size 出力サイズ（px）
 * @param {number} markScale マークの大きさ（0-1）。maskable は安全領域に収めるため小さくする。
 * @param {number} bgInsetRatio 背景の余白。maskable では 0（全面）にする。
 */
function renderIcon(size, markScale, bgInsetRatio) {
  const s = size * SUPERSAMPLE;
  const inset = s * bgInsetRatio;
  const radius = (s - inset * 2) * 0.22;

  // チェックマークの3点（中央基準の相対座標）
  const c = s / 2;
  const m = s * markScale;
  const points = [
    [c - m * 0.34, c + m * 0.02],
    [c - m * 0.08, c + m * 0.28],
    [c + m * 0.36, c - m * 0.26],
  ];
  const stroke = m * 0.16;

  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgHits = 0;
      let fgHits = 0;
      const samples = SUPERSAMPLE * SUPERSAMPLE;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = x * SUPERSAMPLE + sx + 0.5;
          const py = y * SUPERSAMPLE + sy + 0.5;

          if (!insideRoundedSquare(px, py, s, inset, radius)) continue;
          bgHits += 1;

          const d = Math.min(
            distanceToSegment(px, py, ...points[0], ...points[1]),
            distanceToSegment(px, py, ...points[1], ...points[2]),
          );
          if (d <= stroke / 2) fgHits += 1;
        }
      }

      const alpha = bgHits / samples;
      const markRatio = bgHits === 0 ? 0 : fgHits / bgHits;

      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          BACKGROUND[channel] * (1 - markRatio) + FOREGROUND[channel] * markRatio,
        );
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return pixels;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));

  return Buffer.concat([length, typeAndData, crc]);
}

function toPng(pixels, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  // 各行の先頭にフィルタバイト（0 = None）を付ける
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const TARGETS = [
  { file: "icon-192.png", size: 192, markScale: 0.62, bgInset: 0 },
  { file: "icon-512.png", size: 512, markScale: 0.62, bgInset: 0 },
  // maskable は外周が切り取られるため、マークを安全領域（中央80%）に収める
  { file: "icon-maskable-512.png", size: 512, markScale: 0.46, bgInset: 0 },
  { file: "apple-touch-icon.png", size: 180, markScale: 0.62, bgInset: 0 },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const pixels = renderIcon(target.size, target.markScale, target.bgInset);
  writeFileSync(join(OUT_DIR, target.file), toPng(pixels, target.size));
  console.log(`wrote ${target.file} (${target.size}x${target.size})`);
}
