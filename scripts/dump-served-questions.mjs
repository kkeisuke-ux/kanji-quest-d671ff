// ============================================================
// 配信される全問題の学年別ダンプ（品質レビュー用・2026-08-14 第31回）
//   node scripts/dump-served-questions.mjs <出力ディレクトリ>
// questions.ts の配信ルール（手書き優先・語のみ抑制）を再現し、
// 学年ごとに「実際に子どもが見る問題」を1行1問で書き出す。
// 行形式: 字\tソース(hand|gen|bank)\t問題ID\t表示文
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'src', 'data')
const outDir = process.argv[2]
if (!outDir) {
  console.error('usage: node scripts/dump-served-questions.mjs <outDir>')
  process.exit(1)
}
fs.mkdirSync(outDir, { recursive: true })

const excluded = new Set(JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'excluded.json'), 'utf8')))
const gen = JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'questions.gen.json'), 'utf8')).filter((q) => !excluded.has(q.id))
const curriculum = JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'curriculum.gen.json'), 'utf8'))

// QUESTION_BANK の初期20字（questions.ts と同じ固定リスト）
const BANK_CHARS = [...'一二三十川山日田口人大木本子女学校森右左']

const handEntries = new Map() // char -> entry
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const file = path.join(DATA, 'hand', `grade${g}.json`)
  if (!fs.existsSync(file)) continue
  for (const e of JSON.parse(fs.readFileSync(file, 'utf8'))) handEntries.set(e.kanji, e)
}

const handChars = new Set([...BANK_CHARS, ...handEntries.keys()])
const hasContext = (q) => q.parts.some((p) => p.text != null && /[。、！？]/.test(p.text))
const render = (q) =>
  q.parts
    .map((p) => (p.blank ? `〔${p.blank.reading}〕` : p.ruby ? `${p.text}(${p.ruby})` : p.text))
    .join('')

const gradeOf = new Map()
for (const g of curriculum) for (const k of g.kanji) if (!gradeOf.has(k)) gradeOf.set(k, g.grade)

// gen配信分（手書き字は除外、文脈ありが1問でもあれば語のみ全捨て）
const genByChar = new Map()
for (const q of gen) {
  if (handChars.has(q.char)) continue
  const arr = genByChar.get(q.char) ?? []
  arr.push(q)
  genByChar.set(q.char, arr)
}

const lines = new Map() // grade -> lines[]
const push = (grade, line) => {
  const arr = lines.get(grade) ?? []
  arr.push(line)
  lines.set(grade, arr)
}

// 手書き（hand JSON）
for (const [char, e] of handEntries) {
  const g = gradeOf.get(char) ?? 0
  e.questions.forEach((q, i) => {
    push(g, `${char}\thand\th${char}-${i + 1}\t${q.sentence.replace(/○/g, `〔${q.reading}〕`)}`)
  })
}

// gen配信分
for (const [char, list] of genByChar) {
  const g = gradeOf.get(char) ?? 0
  const ctx = list.filter(hasContext)
  const served = ctx.length > 0 ? ctx : list
  for (const q of served) push(g, `${char}\tgen${ctx.length > 0 ? '' : '(語のみ)'}\t${q.id}\t${render(q)}`)
}

for (const g of [...lines.keys()].sort((a, b) => a - b)) {
  const label = g <= 6 ? `小${g}` : g <= 9 ? `中${g - 6}` : `その他${g}`
  const arr = lines.get(g)
  // 配当順に並べる
  const order = new Map()
  const cur = curriculum.find((c) => c.grade === g)
  if (cur) cur.kanji.forEach((k, i) => order.set(k, i))
  arr.sort((a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999))
  const file = path.join(outDir, `served-g${g}.txt`)
  fs.writeFileSync(file, arr.join('\n') + '\n', 'utf8')
  console.log(`${label}: ${arr.length}問 -> ${file}`)
}
