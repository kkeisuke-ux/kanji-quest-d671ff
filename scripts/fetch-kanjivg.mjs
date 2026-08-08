// KanjiVG (https://kanjivg.tagaini.net / https://github.com/KanjiVG/kanjivg) から
// 漢字ごとの stroke SVG を取得し、src/data/kanjivg/strokes.gen.ts を生成する。
// ライセンス: KanjiVG © Ulrich Apel, Creative Commons Attribution-Share Alike 3.0
// 使い方: node scripts/fetch-kanjivg.mjs [追加したい漢字列]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, 'kanjivg-cache')
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'kanjivg', 'strokes.gen.ts')

// 初期検証用の20字（仕様書 §33）
const BASE_KANJI = '一二三十人大木本川山日田口女子学校森右左'
// 画数の期待値（学年別漢字配当表・一般的な画数。取得データの検証用）
const EXPECTED_STROKES = {
  一: 1, 二: 2, 三: 3, 十: 2, 人: 2, 大: 3, 木: 4, 本: 5, 川: 3, 山: 3,
  日: 4, 田: 5, 口: 3, 女: 3, 子: 3, 学: 8, 校: 10, 森: 12, 右: 5, 左: 5,
}

const extra = process.argv[2] ?? ''
const chars = [...new Set([...(BASE_KANJI + extra)])].filter((c) => c.trim())

fs.mkdirSync(CACHE_DIR, { recursive: true })
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })

async function fetchSvg(ch) {
  const hex = ch.codePointAt(0).toString(16).padStart(5, '0')
  const cacheFile = path.join(CACHE_DIR, `${hex}.svg`)
  if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, 'utf8')
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${ch} (${url}) -> HTTP ${res.status}`)
  const svg = await res.text()
  fs.writeFileSync(cacheFile, svg, 'utf8')
  return svg
}

function extractStrokes(svg, ch) {
  // StrokePaths グループ内の <path> を文書順に取得。id の -sN で並び替え（保険）
  const withId = [...svg.matchAll(/<path[^>]*\bid="[^"]*-s(\d+)"[^>]*\bd="([^"]+)"[^>]*\/?>/g)]
    .map((m) => ({ n: Number(m[1]), d: m[2] }))
  if (withId.length > 0) return withId.sort((a, b) => a.n - b.n).map((p) => p.d)
  const anyPath = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"[^>]*\/?>/g)].map((m) => m[1])
  if (anyPath.length === 0) throw new Error(`${ch}: no <path> found`)
  return anyPath
}

const entries = []
const failures = []
for (const ch of chars) {
  try {
    const svg = await fetchSvg(ch)
    const strokes = extractStrokes(svg, ch)
    const expected = EXPECTED_STROKES[ch]
    if (expected != null && expected !== strokes.length) {
      console.warn(`WARN ${ch}: expected ${expected} strokes but got ${strokes.length}`)
    }
    entries.push([ch, strokes])
    console.log(`OK  ${ch}  ${strokes.length} strokes`)
  } catch (err) {
    failures.push(ch)
    console.error(`FAIL ${ch}: ${err.message}`)
  }
}

if (entries.length === 0) {
  console.error('No data fetched. Aborting without writing output.')
  process.exit(1)
}

const body = entries
  .map(([ch, strokes]) => `  ${JSON.stringify(ch)}: [\n${strokes.map((d) => `    ${JSON.stringify(d)},`).join('\n')}\n  ],`)
  .join('\n')

const out = `// ============================================================
// 自動生成ファイル: scripts/fetch-kanjivg.mjs が生成。手動編集しない。
// ストロークデータの出典: KanjiVG (https://kanjivg.tagaini.net)
// Copyright (C) Ulrich Apel
// License: Creative Commons Attribution-Share Alike 3.0
// https://creativecommons.org/licenses/by-sa/3.0/
// viewBox は 0 0 109 109、<path> の並び順 = 正しい筆順。
// ============================================================

export const KANJIVG_VIEWBOX = 109

/** 漢字 → 1画ごとのSVGパス(d属性)。配列順が筆順。 */
export const KANJIVG: Record<string, string[]> = {
${body}
}
`
fs.writeFileSync(OUT_FILE, out, 'utf8')
console.log(`\nwrote ${OUT_FILE} (${entries.length} kanji${failures.length ? `, FAILED: ${failures.join('')}` : ''})`)
