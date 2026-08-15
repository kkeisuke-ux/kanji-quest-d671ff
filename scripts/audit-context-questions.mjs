// ============================================================
// 文脈なし「語のみ」問題の監査（第23回・QUALITY.md準拠）
//   node scripts/audit-context-questions.mjs
// アプリが実際に配信する問題（手書き優先＋語のみ問題の抑制ルール適用後）を再現し、
// 学年ごとに「文脈なし問題がまだ出る字」を一覧する。
// この一覧の字に手書き問題（hand/gradeN.json）を書けば、語のみ問題は自動的に消える。
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'src', 'data')

const excluded = new Set(JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'excluded.json'), 'utf8')))
const gen = JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'questions.gen.json'), 'utf8')).filter((q) => !excluded.has(q.id))
const curriculum = JSON.parse(fs.readFileSync(path.join(DATA, 'gen', 'curriculum.gen.json'), 'utf8'))

// 手書き問題のある字（questions.ts の HAND_CHARS を再現）
// QUESTION_BANK（初期20字）はソースから拾わず固定リスト（check-hand-questions.mjs と同じ）
const handChars = new Set([...'一二三十川山日田口人大木本子女学校森右左'])
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const file = path.join(DATA, 'hand', `grade${g}.json`)
  if (!fs.existsSync(file)) continue
  for (const e of JSON.parse(fs.readFileSync(file, 'utf8'))) handChars.add(e.kanji)
}

const hasContext = (q) => q.parts.some((p) => p.text != null && /[。、！？]/.test(p.text))
const render = (q) => q.parts.map((p) => (p.blank ? `〔${p.blank.reading}〕` : p.ruby ? `${p.text}(${p.ruby})` : p.text)).join('')

const gradeOf = new Map()
for (const g of curriculum) for (const k of g.kanji) if (!gradeOf.has(k)) gradeOf.set(k, g.grade)

// 配信再現: 手書き字はgen除外、文脈ありが1問でもある字は語のみ全捨て
const byChar = new Map()
for (const q of gen) {
  if (handChars.has(q.char)) continue
  const arr = byChar.get(q.char) ?? []
  arr.push(q)
  byChar.set(q.char, arr)
}

const perGrade = new Map() // grade -> { fallbackChars: [], wordOnlyServed: n, ctxServed: n }
for (const [char, list] of byChar) {
  const g = gradeOf.get(char) ?? 0
  const st = perGrade.get(g) ?? { fallbackChars: [], wordOnlyServed: 0, ctxServed: 0 }
  const ctx = list.filter(hasContext)
  if (ctx.length > 0) st.ctxServed += ctx.length
  else {
    st.fallbackChars.push(char)
    st.wordOnlyServed += list.length
  }
  perGrade.set(g, st)
}

let totalFallback = 0
for (const g of [...perGrade.keys()].sort((a, b) => a - b)) {
  const st = perGrade.get(g)
  const label = g <= 6 ? `小${g}` : `中${g - 6}`
  totalFallback += st.fallbackChars.length
  console.log(
    `${label}: 文脈つき配信 ${st.ctxServed}問 / 語のみ暫定残存 ${st.fallbackChars.length}字 ${st.wordOnlyServed}問` +
      (st.fallbackChars.length > 0 ? ` → ${st.fallbackChars.join('')}` : '')
  )
}
console.log(`---`)
console.log(`語のみ問題が残る字: 合計 ${totalFallback}字（この字に手書き問題を書けば自動的に消える）`)

// サンプル表示（残存する語のみ問題の例）
const args = process.argv.slice(2)
if (args[0] === '--samples') {
  for (const [char, list] of byChar) {
    if (list.some(hasContext)) continue
    for (const q of list.slice(0, 2)) console.log(`  ${char}: ${render(q)}`)
  }
}
