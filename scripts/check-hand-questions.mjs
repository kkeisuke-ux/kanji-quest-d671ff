// ============================================================
// 手書き問題データの品質チェック: node scripts/check-hand-questions.mjs
// QUALITY.md の基準のうち、機械検査できる項目を確認する。
//  1. 空欄○が1つだけあるか
//  2. 対象の漢字が文中に見えていないか（答え漏れ）
//  3. 読みが ひらがなで入っているか
//  4. 文中の漢字が小1配当（＋ルビ付き）以外に使われていないか
//  5. 1字につき5問あるか
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(__dirname, '..', 'src', 'data', 'hand', 'grade1.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))

const GRADE1 = new Set([
  ...'一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六',
])

let errors = 0
const err = (msg) => {
  console.error('NG:', msg)
  errors++
}

for (const entry of data) {
  const { kanji, questions } = entry
  if (!kanji || [...kanji].length !== 1) err(`kanjiが1文字でない: ${JSON.stringify(kanji)}`)
  if (!Array.isArray(questions) || questions.length < 5) err(`${kanji}: 問題が5問未満（${questions?.length ?? 0}問）`)
  for (const q of questions ?? []) {
    const s = q.sentence ?? ''
    const blanks = (s.match(/○/g) ?? []).length
    if (blanks !== 1) err(`${kanji}: 空欄○が${blanks}個: ${s}`)
    if (s.includes(kanji)) err(`${kanji}: 答えの字が文に見えている: ${s}`)
    if (!q.reading || !/^[ぁ-ゖー]+$/.test(q.reading)) err(`${kanji}: 読みが不正: ${JSON.stringify(q.reading)}`)
    // ルビ記法 漢字(よみ) の部分を除いた本文に、小1配当外の漢字が裸で出ていないか
    const stripped = s.replace(/[㐀-鿿]+\([ぁ-ゖー]+\)/gu, '')
    for (const ch of stripped) {
      if (/[㐀-鿿]/u.test(ch) && !GRADE1.has(ch)) err(`${kanji}: 配当外の漢字「${ch}」がルビなしで使われている: ${s}`)
    }
  }
}

const kanjiSet = new Set(data.map((e) => e.kanji))
console.log(`チェック: ${data.length}字 / ${data.reduce((n, e) => n + e.questions.length, 0)}問`)
console.log(errors === 0 ? 'すべて合格' : `エラー ${errors}件`)
process.exit(errors === 0 ? 0 : 1)
