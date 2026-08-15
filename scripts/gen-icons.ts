// PWA用アイコンPNGを依存ライブラリなしで生成する（グラデ背景 + 白の「漢」）。
//   npx vite-node scripts/gen-icons.ts
// 出力: public/icons/icon-512.png, icon-192.png, apple-touch-icon.png(180)
// 第49回: 「山」の手書き線分から、KanjiVGの筆順データで描く「漢」に変更。
// （文字を変えたいときは下の ICON_CHAR を書き換えるだけでよい）
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRefKanji, hasRefKanji } from '../src/core/refdata'
import { KANJIVG_VIEWBOX } from '../src/data/kanjivg/strokes.gen'

const ICON_CHAR = '漢'
/** 文字が占める割合（アイコンの一辺に対して） */
const GLYPH_RATIO = 0.7
/** 線の太さ（アイコンの一辺に対する半径） */
const STROKE_RADIUS = 0.019

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---- 最小PNGエンコーダ ----
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
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- 描画 ----
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

if (!hasRefKanji(ICON_CHAR)) throw new Error(`筆順データがありません: ${ICON_CHAR}`)
const ref = getRefKanji(ICON_CHAR)

function renderIcon(size: number): Buffer {
  const buf = Buffer.alloc(size * size * 4)
  const scale = (size * GLYPH_RATIO) / KANJIVG_VIEWBOX
  const off = (size - KANJIVG_VIEWBOX * scale) / 2
  // 画をアイコン座標の線分列にする
  const segs: [number, number, number, number][] = []
  for (const st of ref.strokes) {
    const pts = st.raw109.map((p) => ({ x: off + p.x * scale, y: off + p.y * scale }))
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y])
  }
  const r = STROKE_RADIUS * size
  // 走査を軽くするため、線分のバウンディングボックスで絞り込む
  const pad = r + 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 背景: 上下グラデ（インディゴ→紫）
      const t = y / size
      let R = Math.round(74 + (123 - 74) * t)
      let G = Math.round(103 + (91 - 103) * t)
      let B = Math.round(216 + (230 - 216) * t)
      let d = Infinity
      const px = x + 0.5
      const py = y + 0.5
      for (const [ax, ay, bx, by] of segs) {
        if (px < Math.min(ax, bx) - pad || px > Math.max(ax, bx) + pad) continue
        if (py < Math.min(ay, by) - pad || py > Math.max(ay, by) + pad) continue
        const dd = distToSegment(px, py, ax, ay, bx, by)
        if (dd < d) d = dd
      }
      const a = Math.max(0, Math.min(1, r - d + 0.5))
      if (a > 0) {
        R = Math.round(R + (255 - R) * a)
        G = Math.round(G + (255 - G) * a)
        B = Math.round(B + (255 - B) * a)
      }
      const i = (y * size + x) * 4
      buf[i] = R
      buf[i + 1] = G
      buf[i + 2] = B
      buf[i + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

for (const [name, size] of [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
] as [string, number][]) {
  fs.writeFileSync(path.join(OUT_DIR, name), renderIcon(size))
  console.log('wrote', name, `(${ICON_CHAR}・${ref.strokeCount}画)`)
}
