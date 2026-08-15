// ============================================================
// 分担執筆された手書き問題（src/data/hand/parts/g{N}-*.json）を
// 学年ファイル src/data/hand/grade{N}.json に結合する。
//   node scripts/merge-hand-parts.mjs
// 学年の配当順に並べ、重複・欠落を検査する。
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HAND = path.join(__dirname, '..', 'src', 'data', 'hand')
const PARTS = path.join(HAND, 'parts')
const curriculum = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'gen', 'curriculum.gen.json'), 'utf8'))

let errors = 0
for (const g of [2, 3, 4, 5, 6, 7, 8, 9]) {
  const files = fs.existsSync(PARTS)
    ? fs.readdirSync(PARTS).filter((f) => f.startsWith(`g${g}-`) && f.endsWith('.json')).sort()
    : []
  if (files.length === 0) continue
  const merged = new Map()
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(PARTS, f), 'utf8'))
    for (const entry of data) {
      if (merged.has(entry.kanji)) {
        console.error(`NG: grade${g} 「${entry.kanji}」が複数ファイルに重複（${f}）`)
        errors++
      }
      merged.set(entry.kanji, entry)
    }
  }
  const order = curriculum.find((c) => c.grade === g).kanji
  const missing = order.filter((k) => !merged.has(k))
  if (missing.length > 0) {
    console.error(`NG: grade${g} 欠落 ${missing.length}字: ${missing.join('')}`)
    errors++
  }
  const extra = [...merged.keys()].filter((k) => !order.includes(k))
  if (extra.length > 0) {
    console.error(`NG: grade${g} 配当外: ${extra.join('')}`)
    errors++
  }
  const sorted = order.filter((k) => merged.has(k)).map((k) => merged.get(k))
  fs.writeFileSync(path.join(HAND, `grade${g}.json`), JSON.stringify(sorted, null, 1), 'utf8')
  console.log(`grade${g}.json: ${sorted.length}字 ${sorted.reduce((n, e) => n + e.questions.length, 0)}問（${files.join(', ')}）`)
}
console.log(errors === 0 ? '結合OK' : `エラー ${errors}件`)
process.exit(errors === 0 ? 0 : 1)
