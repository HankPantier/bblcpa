#!/usr/bin/env tsx
/**
 * Generate solid-color placeholder PNGs into public/content-assets/.
 * Pure Node (zlib) — no image libraries. Used to keep the template rendering
 * cleanly before a client supplies real photography.
 *
 * Usage:
 *   tsx scripts/generate-placeholder.ts                       # template defaults
 *   tsx scripts/generate-placeholder.ts out.png 1600 900 #1f2937
 */
import { deflateSync } from 'node:zlib'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function isPositiveInt(s: string): boolean {
  const n = Number(s)
  return Number.isInteger(n) && n > 0
}

function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type 2 = truecolor RGB
  const rowLen = width * 3
  const raw = Buffer.alloc((rowLen + 1) * height)
  for (let y = 0; y < height; y++) {
    const off = y * (rowLen + 1)
    raw[off] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2]
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function write(file: string, w: number, h: number, hex: string): Promise<void> {
  const outDir = path.join(process.cwd(), 'public', 'content-assets')
  await fs.mkdir(outDir, { recursive: true })
  const out = path.join(outDir, file)
  await fs.writeFile(out, solidPng(w, h, hexToRgb(hex)))
  console.log(`✓ ${file} (${w}×${h}, ${hex})`)
}

async function main(): Promise<void> {
  const [, , file, w, h, hex] = process.argv
  if (file && w && h && hex) {
    if (!isPositiveInt(w) || !isPositiveInt(h)) {
      throw new Error(`Invalid dimensions: width and height must be positive integers (got ${w}×${h})`)
    }
    if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error(`Invalid hex color: ${hex} (expected #RRGGBB)`)
    }
    await write(file, Number(w), Number(h), hex)
    return
  }
  // Template defaults — match the references shipped in content/pages/home.md.
  await write('hero-office.png', 1600, 900, '#1f2937')
  await write('team-photo.png', 1200, 900, '#334155')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
