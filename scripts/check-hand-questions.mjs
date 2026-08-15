// ============================================================
// 手書き問題データの品質チェック（QUALITY.md準拠の機械検査）
//   node scripts/check-hand-questions.mjs                 … hand/grade*.json 全部
//   node scripts/check-hand-questions.mjs <file> <grade>  … 指定ファイルを学年Nとして検査
// 検査項目:
//   1. 空欄○が1つだけ
//   2. 対象の漢字が文中に見えない（答え漏れ）
//   3. 読みが ひらがな
//   4. 文中の裸の漢字（ルビなし）は「その学年までに習う字」だけ
//   5. 1字につき5問以上
//   6. kanjiは1文字・その学年の配当字
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HAND_DIR = path.join(__dirname, '..', 'src', 'data', 'hand')
const curriculum = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'gen', 'curriculum.gen.json'), 'utf8'))

// 学年ごとの配当字と累積（その学年までに習う字）セット
const gradeChars = new Map() // grade -> Set
const cumulative = new Map() // grade -> Set
{
  let acc = new Set()
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const cur = curriculum.find((c) => c.grade === g)
    const set = new Set(cur ? cur.kanji : [])
    gradeChars.set(g, set)
    acc = new Set([...acc, ...set])
    cumulative.set(g, acc)
  }
}

let errors = 0
const err = (msg) => {
  console.error('NG:', msg)
  errors++
}

function checkFile(file, grade) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const allowed = cumulative.get(grade)
  const gset = gradeChars.get(grade)
  const seen = new Set()
  let qTotal = 0
  for (const entry of data) {
    const { kanji, questions } = entry
    if (!kanji || [...kanji].length !== 1) err(`${path.basename(file)}: kanjiが1文字でない: ${JSON.stringify(kanji)}`)
    if (!gset.has(kanji)) err(`${path.basename(file)}: 「${kanji}」は学年${grade}の配当字ではない`)
    if (seen.has(kanji)) err(`${path.basename(file)}: 「${kanji}」が重複`)
    seen.add(kanji)
    if (!Array.isArray(questions) || questions.length < 5) err(`「${kanji}」: 問題が5問未満（${questions?.length ?? 0}問）`)
    for (const q of questions ?? []) {
      qTotal++
      const s = q.sentence ?? ''
      const blanks = (s.match(/○/g) ?? []).length
      if (blanks !== 1) err(`「${kanji}」: 空欄○が${blanks}個: ${s}`)
      if (s.includes(kanji)) err(`「${kanji}」: 答えの字が文に見えている: ${s}`)
      if (!q.reading || !/^[ぁ-ゖー]+$/.test(q.reading)) err(`「${kanji}」: 読みが不正: ${JSON.stringify(q.reading)} (${s})`)
      const stripped = s.replace(/[㐀-鿿]+\([ぁ-ゖー]+\)/gu, '')
      for (const ch of stripped) {
        if (/[㐀-鿿]/u.test(ch) && !allowed.has(ch)) err(`「${kanji}」: 学年${grade}までに習わない漢字「${ch}」がルビなしで使われている: ${s}`)
      }
    }
  }
  return { chars: data.length, questions: qTotal, seen }
}

const args = process.argv.slice(2)
if (args.length >= 2) {
  const r = checkFile(args[0], Number(args[1]))
  console.log(`チェック: ${r.chars}字 / ${r.questions}問`)
} else {
  // hand/grade{N}.json 全部＋学年ごとのカバレッジ
  let total = { chars: 0, questions: 0 }
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const file = path.join(HAND_DIR, `grade${g}.json`)
    if (!fs.existsSync(file)) continue
    const r = checkFile(file, g)
    total.chars += r.chars
    total.questions += r.questions
    // カバレッジ（小1は旧手書き20字がquestions.ts側にあるため不足扱いしない）
    const legacy = g === 1 ? new Set([...'一二三十川山日田口人大木本子女学校森右左']) : new Set()
    const missing = [...gradeChars.get(g)].filter((c) => !r.seen.has(c) && !legacy.has(c))
    if (missing.length > 0) err(`grade${g}: 未収録 ${missing.length}字: ${missing.join('')}`)
    console.log(`grade${g}: ${r.chars}字 ${r.questions}問${missing.length === 0 ? '（全字カバー）' : ''}`)
  }
  console.log(`合計: ${total.chars}字 / ${total.questions}問`)
}
console.log(errors === 0 ? 'すべて合格' : `エラー ${errors}件`)
process.exit(errors === 0 ? 0 : 1)
