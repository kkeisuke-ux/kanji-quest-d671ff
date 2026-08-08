// ============================================================
// 完全版コンテンツ生成（小1〜中3）: node scripts/gen-content.mjs
//
// 生成物:
//   src/data/kanjivg/strokes.gen.ts   … 常用漢字全字のストローク（KanjiVG由来）
//   src/data/gen/curriculum.gen.json  … 学年別カリキュラム（5字ステージ×3学期）
//   src/data/gen/questions.gen.json   … 穴埋め問題（頻出単語から機械抽出）
//
// データ源（scripts/cache/ に事前取得）:
//   - KanjiVG (© Ulrich Apel, CC BY-SA 3.0) … 筆順ストローク
//   - KANJIDIC2 (© EDRDG, CC BY-SA 4.0)     … 学年配当・頻度・読み
//   - JMdict (© EDRDG) + JmdictFurigana     … 頻出単語とふりがな分割
//
// 問題は「人間が編纂した辞書の頻出単語」からの決定的抽出であり、
// AIの自由生成ではない（仕様§12の制約に適合）。
// 中学の配当は公的に固定されていないため、常用漢字の残り(grade=8)を
// 頻度順に3等分して中1/中2/中3とする（データ差し替えで変更可能）。
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.join(__dirname, 'cache')
const SRC = path.join(__dirname, '..', 'src')
const GEN_DIR = path.join(SRC, 'data', 'gen')
fs.mkdirSync(GEN_DIR, { recursive: true })

const isKanji = (c) => /[㐀-鿿]/u.test(c)
const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))

// ---------- 1. KANJIDIC2 ----------
console.log('KANJIDIC2 を読み込み中…')
const kd2 = zlib.gunzipSync(fs.readFileSync(path.join(CACHE, 'kanjidic2.xml.gz'))).toString('utf8')
const kanjiInfo = new Map() // char -> {grade, freq, strokes, on[], kun[]}
for (const block of kd2.split('<character>').slice(1)) {
  const lit = block.match(/<literal>(.*?)<\/literal>/u)?.[1]
  if (!lit || lit.length !== 1) continue
  const grade = Number(block.match(/<grade>(\d+)<\/grade>/)?.[1] ?? 0)
  const freq = Number(block.match(/<freq>(\d+)<\/freq>/)?.[1] ?? 99999)
  const strokes = Number(block.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1] ?? 0)
  const on = [...block.matchAll(/<reading r_type="ja_on">(.*?)<\/reading>/g)].map((m) => m[1])
  const kun = [...block.matchAll(/<reading r_type="ja_kun">(.*?)<\/reading>/g)].map((m) => m[1])
  kanjiInfo.set(lit, { grade, freq, strokes, on, kun })
}
console.log(`  ${kanjiInfo.size}字`)

// ---------- 2. 学年リスト ----------
const byGrade = new Map() // 1..6, 8
for (const [ch, info] of kanjiInfo) {
  if (info.grade >= 1 && info.grade <= 6) {
    if (!byGrade.has(info.grade)) byGrade.set(info.grade, [])
    byGrade.get(info.grade).push(ch)
  } else if (info.grade === 8) {
    if (!byGrade.has(8)) byGrade.set(8, [])
    byGrade.get(8).push(ch)
  }
}
const sortEasy = (a, b) => {
  const ia = kanjiInfo.get(a)
  const ib = kanjiInfo.get(b)
  return ia.freq - ib.freq || ia.strokes - ib.strokes || a.codePointAt(0) - b.codePointAt(0)
}
for (const list of byGrade.values()) list.sort(sortEasy)
const joyoRest = byGrade.get(8) ?? []
const third = Math.ceil(joyoRest.length / 3)
const gradeKanji = {
  1: byGrade.get(1) ?? [],
  2: byGrade.get(2) ?? [],
  3: byGrade.get(3) ?? [],
  4: byGrade.get(4) ?? [],
  5: byGrade.get(5) ?? [],
  6: byGrade.get(6) ?? [],
  7: joyoRest.slice(0, third),
  8: joyoRest.slice(third, third * 2),
  9: joyoRest.slice(third * 2),
}
for (const g of Object.keys(gradeKanji)) console.log(`  学年${g}: ${gradeKanji[g].length}字`)

// ---------- 3. ストローク（KanjiVG） ----------
console.log('KanjiVG ストロークを抽出中…')
const kvDir = path.join(CACHE, 'kanjivg', 'kanji')
function extractStrokes(svg) {
  const withId = [...svg.matchAll(/<path[^>]*\bid="[^"]*-s(\d+)"[^>]*\bd="([^"]+)"[^>]*\/?>/g)].map((m) => ({
    n: Number(m[1]),
    d: m[2],
  }))
  if (withId.length > 0) return withId.sort((a, b) => a.n - b.n).map((p) => p.d)
  return [...svg.matchAll(/<path[^>]*\bd="([^"]+)"[^>]*\/?>/g)].map((m) => m[1])
}
const strokesMap = new Map()
const missingStroke = []
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  for (const ch of gradeKanji[g]) {
    const hex = ch.codePointAt(0).toString(16).padStart(5, '0')
    const file = path.join(kvDir, `${hex}.svg`)
    if (!fs.existsSync(file)) {
      missingStroke.push(ch)
      continue
    }
    const strokes = extractStrokes(fs.readFileSync(file, 'utf8'))
    if (strokes.length === 0) {
      missingStroke.push(ch)
      continue
    }
    strokesMap.set(ch, strokes)
  }
}
if (missingStroke.length > 0) {
  console.warn(`  ストローク未取得: ${missingStroke.length}字（カリキュラムから除外）: ${missingStroke.join('')}`)
  for (const g of Object.keys(gradeKanji)) gradeKanji[g] = gradeKanji[g].filter((c) => strokesMap.has(c))
}
console.log(`  ストローク: ${strokesMap.size}字`)

// ---------- 4. JMdict 頻出単語 ----------
console.log('JMdict を読み込み中…（1〜2分）')
const jmdict = zlib.gunzipSync(fs.readFileSync(path.join(CACHE, 'JMdict_e.gz'))).toString('utf8')
const words = new Map() // word -> {reading, score}
{
  const chunks = jmdict.split('<entry>')
  for (let i = 1; i < chunks.length; i++) {
    const e = chunks[i]
    const keb = e.match(/<keb>(.*?)<\/keb>/)?.[1]
    if (!keb || keb.length < 2 || keb.length > 6) continue
    if (!/^[㐀-鿿぀-ゟ゠-ヿー々]+$/u.test(keb)) continue
    if (keb.includes('々')) continue
    const reb = e.match(/<reb>(.*?)<\/reb>/)?.[1]
    if (!reb) continue
    // 「ふつうは かな書き」の語（強ち・一に等）は漢字書き取りの題材に不向きなので除外
    if (e.includes('<misc>&uk;</misc>')) continue
    const pris = [...e.matchAll(/<(?:ke|re)_pri>(.*?)<\/(?:ke|re)_pri>/g)].map((m) => m[1])
    // 子ども適合の優先度（第11回フィードバック）:
    // ichi（日常基本語彙リスト由来）を新聞頻出語（news=大人向けに偏る）より大幅に優先する
    let ichi = 0
    let other = 0
    for (const p of pris) {
      if (p === 'ichi1') ichi = Math.max(ichi, 2)
      else if (p === 'ichi2') ichi = Math.max(ichi, 1)
      else if (/^(news1|spec1|gai1)$/.test(p)) other = Math.max(other, 3)
      else if (/^(news2|spec2)$/.test(p)) other = Math.max(other, 2)
      else if (/^nf(\d\d)$/.test(p)) other = Math.max(other, Number(p.slice(2)) <= 24 ? 2 : 1)
    }
    if (ichi === 0 && other < 2) continue
    const score = ichi * 5 + other
    const prev = words.get(keb)
    if (!prev || score > prev.score) words.set(keb, { reading: reb, score })
  }
}
console.log(`  頻出単語: ${words.size}語`)

// ---------- 5. ふりがな分割 ----------
console.log('JmdictFurigana を読み込み中…')
const furiganaRaw = JSON.parse(fs.readFileSync(path.join(CACHE, 'JmdictFurigana.json'), 'utf8').replace(/^﻿/, ''))
const furigana = new Map()
for (const item of furiganaRaw) {
  furigana.set(`${item.text}|${item.reading}`, item.furigana)
}
console.log(`  ${furigana.size}件`)

// ---------- 6. 漢字→単語候補 ----------
console.log('問題候補を組み立て中…')

// その漢字の常用の音訓（KANJIDIC2）にある読みか？（第11回: 難読・特殊読みの語を後回しにする）
// 連濁（かみ→がみ）と促音便（がく→がっ）は同じ読みとみなす。
const DAKU = 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'
const SEION = 'かきくけこさしすせそたちつてとはひふへほはひふへほ'
const dedaku = (s) => {
  const i = DAKU.indexOf(s[0])
  return i >= 0 ? SEION[i] + s.slice(1) : s
}
function readingFamiliar(ch, rt) {
  const info = kanjiInfo.get(ch)
  if (!info || !rt) return false
  const variants = new Set([rt, dedaku(rt)])
  const prefixes = new Set()
  if (rt.endsWith('っ')) {
    prefixes.add(rt.slice(0, -1))
    prefixes.add(dedaku(rt).slice(0, -1))
  }
  const readings = []
  for (const kun of info.kun) {
    const clean = kun.replace(/-/g, '')
    readings.push(clean.includes('.') ? clean.split('.')[0] : clean)
  }
  for (const on of info.on) readings.push(kataToHira(on.replace(/-/g, '')))
  for (const r of readings) {
    if (!r) continue
    if (variants.has(r)) return true
    for (const p of prefixes) if (p && r.startsWith(p)) return true
  }
  return false
}

const candidates = new Map() // char -> [{word, segs, segIdx, rt, score, len, kanaLen, kanjiCount, rOk}]
for (const [word, { reading, score }] of words) {
  const segs = furigana.get(`${word}|${reading}`)
  if (!segs) continue
  let kanjiCount = 0
  let kanaLen = 0
  for (const seg of segs) {
    kanaLen += seg.rt ? seg.rt.length : seg.ruby.length
    for (const k of seg.ruby) if (isKanji(k)) kanjiCount++
  }
  const hasKata = /[ァ-ヶ]/.test(word)
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    if (!seg.rt || seg.ruby.length !== 1 || !isKanji(seg.ruby)) continue
    const ch = seg.ruby
    if (!strokesMap.has(ch)) continue
    if (!candidates.has(ch)) candidates.set(ch, [])
    candidates.get(ch).push({
      word,
      segs,
      segIdx: i,
      rt: seg.rt,
      score,
      len: word.length,
      kanaLen,
      kanjiCount,
      hasKata,
      rOk: readingFamiliar(ch, seg.rt) ? 0 : 1,
    })
  }
}

// 学年ごとの「見せてよい漢字」累積セット
const cumulative = new Map()
{
  let acc = new Set()
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    acc = new Set([...acc, ...gradeKanji[g]])
    cumulative.set(g, acc)
  }
}
const gradeOf = new Map()
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) for (const ch of gradeKanji[g]) gradeOf.set(ch, g)

// ---------- 7. 問題生成 ----------
const questions = []
let fallbackOnly = 0
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const allowed = cumulative.get(g)
  // 低学年ほど「短くて漢字が少ない語」を優先（第11回: 読み・語の難しさがやる気を奪う対策）
  const maxKanjiCount = g <= 2 ? 2 : g <= 4 ? 3 : 99
  const maxKanaLen = g <= 2 ? 7 : g <= 4 ? 9 : 99
  for (const ch of gradeKanji[g]) {
    const cands = (candidates.get(ch) ?? [])
      .filter((c) => {
        // カタカナ混じり語（カリブ海等の固有名詞・外来語）は小4以下では出さない
        if (g <= 4 && c.hasKata) return false
        for (let i = 0; i < c.segs.length; i++) {
          if (i === c.segIdx) continue
          for (const k of c.segs[i].ruby) {
            if (isKanji(k) && !allowed.has(k)) return false
          }
        }
        return true
      })
      .map((c) => {
        // 学年適合度: 語に含まれる他の漢字の最高学年（低いほどやさしい）
        let maxOther = 0
        for (let i = 0; i < c.segs.length; i++) {
          if (i === c.segIdx) continue
          for (const k of c.segs[i].ruby) {
            if (isKanji(k)) maxOther = Math.max(maxOther, gradeOf.get(k) ?? 9)
          }
        }
        // 学年オーバーの長さ・漢字数・カタカナ混じりは除外はせず後回し（候補が少ない字の救済）
        const lenOver = c.kanjiCount > maxKanjiCount || c.kanaLen > maxKanaLen || c.hasKata ? 1 : 0
        return { ...c, maxOther, lenOver }
      })
      // やさしい語から: 他の漢字の学年が低い → 常用の読み → 学年相応の長さ →
      // 日常語スコアが高い → 短い
      .sort(
        (a, b) =>
          a.maxOther - b.maxOther || a.rOk - b.rOk || a.lenOver - b.lenOver || b.score - a.score || a.len - b.len
      )
    const picked = []
    const usedReadings = new Set()
    const usedWords = new Set()
    // 読みの多様性を優先して5問。ただし常用外の読み(rOk)・学年オーバー(lenOver)の語は
    // ふつうの語で埋まらなかった時の穴埋めにだけ使う（第11回: 難読語がやる気を奪う対策）
    for (const pass of [0, 1, 2, 3]) {
      for (const c of cands) {
        if (picked.length >= 5) break
        if (usedWords.has(c.word)) continue
        if (pass === 0 && (usedReadings.has(c.rt) || c.rOk || c.lenOver)) continue
        if (pass === 1 && (c.rOk || c.lenOver)) continue
        if (pass === 2 && c.rOk) continue
        picked.push(c)
        usedWords.add(c.word)
        usedReadings.add(c.rt)
      }
    }
    let n = 0
    for (const c of picked) {
      // 漢字セグメントにはルビを付ける（習っていない字でも読める。仮名同士のみ結合）
      const parts = []
      for (let i = 0; i < c.segs.length; i++) {
        const seg = c.segs[i]
        if (i === c.segIdx) {
          parts.push({ blank: { reading: seg.rt } })
        } else if (seg.rt) {
          parts.push({ text: seg.ruby, ruby: seg.rt })
        } else if (parts.length > 0 && parts[parts.length - 1].text != null && parts[parts.length - 1].ruby == null) {
          parts[parts.length - 1].text += seg.ruby
        } else {
          parts.push({ text: seg.ruby })
        }
      }
      questions.push({ id: `g${ch}-${++n}`, char: ch, kind: 'word', parts })
    }
    // 足りなければ読み問題で補完（訓読み優先。「あら.う」→〔あら〕う）
    if (n < 3) {
      const info = kanjiInfo.get(ch)
      const readings = []
      for (const kun of info.kun) {
        const clean = kun.replace(/-/g, '')
        if (clean.includes('.')) {
          const [stem, okuri] = clean.split('.')
          if (stem) readings.push({ blank: stem, after: okuri })
        } else if (clean) readings.push({ blank: clean, after: '' })
      }
      for (const on of info.on) readings.push({ blank: kataToHira(on.replace(/-/g, '')), after: '' })
      const seen = new Set()
      for (const r of readings) {
        if (n >= 3) break
        const key = r.blank + '|' + r.after
        if (seen.has(key) || !r.blank) continue
        seen.add(key)
        const parts = [{ blank: { reading: r.blank } }]
        if (r.after) parts.push({ text: r.after })
        questions.push({ id: `g${ch}-${++n}`, char: ch, kind: 'read', parts })
      }
      if (picked.length === 0) fallbackOnly++
    }
  }
}
console.log(`  問題: ${questions.length}問（単語問題なし=読みのみの字: ${fallbackOnly}）`)

// ---------- 8. カリキュラム ----------
// 小1の既存4ステージはID・構成を維持（進捗データ互換）
const LEGACY_G1 = [
  { id: 'g1t1s1', kanji: [...'一二三十川'] },
  { id: 'g1t1s2', kanji: [...'山日田口人'] },
  { id: 'g1t2s1', kanji: [...'大木本子女'] },
  { id: 'g1t2s2', kanji: [...'学校森右左'] },
]
const legacySet = new Set(LEGACY_G1.flatMap((s) => s.kanji))

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const curriculum = []
for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const all = gradeKanji[g]
  let stages = []
  let terms = []
  if (g === 1) {
    const rest = all.filter((c) => !legacySet.has(c))
    const restChunks = chunk(rest, 5)
    stages = [
      ...LEGACY_G1.map((s, i) => ({ id: s.id, label: `ステージ${i + 1}`, kanji: s.kanji })),
      ...restChunks.map((ks, i) => ({ id: `g1x s${i + 5}`.replace(' ', ''), label: `ステージ${i + 5}`, kanji: ks })),
    ]
    // 学期: 既存の所属（s1,s2→1学期 / s3,s4→2学期）を守りつつ残りを配分
    const restIds = restChunks.map((_, i) => `g1xs${i + 5}`)
    const t1 = ['g1t1s1', 'g1t1s2', ...restIds.slice(0, 3)]
    const t2 = ['g1t2s1', 'g1t2s2', ...restIds.slice(3, 6)]
    const t3 = restIds.slice(6)
    terms = [
      { id: 'g1t1', index: 0, stageIds: t1 },
      { id: 'g1t2', index: 1, stageIds: t2 },
      { id: 'g1t3', index: 2, stageIds: t3 },
    ]
  } else {
    const chunks = chunk(all, 5)
    stages = chunks.map((ks, i) => ({ id: `g${g}s${i + 1}`, label: `ステージ${i + 1}`, kanji: ks }))
    const per = Math.ceil(stages.length / 3)
    terms = [0, 1, 2].map((t) => ({
      id: `g${g}t${t + 1}`,
      index: t,
      stageIds: stages.slice(t * per, (t + 1) * per).map((s) => s.id),
    }))
  }
  curriculum.push({ grade: g, kanji: all, stages, terms })
}

// ---------- 9. 出力 ----------
console.log('ファイルを書き出し中…')
// strokes.gen.ts
{
  const ordered = [...'一二三十人大木本川山日田口女子学校森右左'].filter((c) => strokesMap.has(c))
  const rest = [...strokesMap.keys()].filter((c) => !ordered.includes(c))
  const body = [...ordered, ...rest]
    .map((ch) => `  ${JSON.stringify(ch)}: ${JSON.stringify(strokesMap.get(ch))},`)
    .join('\n')
  const out = `// ============================================================
// 自動生成ファイル: scripts/gen-content.mjs が生成。手動編集しない。
// ストロークデータの出典: KanjiVG (https://kanjivg.tagaini.net)
// Copyright (C) Ulrich Apel
// License: Creative Commons Attribution-Share Alike 3.0
// https://creativecommons.org/licenses/by-sa/3.0/
// viewBox は 0 0 109 109、配列順 = 正しい筆順。全${strokesMap.size}字。
// ============================================================

export const KANJIVG_VIEWBOX = 109

/** 漢字 → 1画ごとのSVGパス(d属性)。配列順が筆順。 */
export const KANJIVG: Record<string, string[]> = {
${body}
}
`
  fs.writeFileSync(path.join(SRC, 'data', 'kanjivg', 'strokes.gen.ts'), out, 'utf8')
}
fs.writeFileSync(path.join(GEN_DIR, 'curriculum.gen.json'), JSON.stringify(curriculum), 'utf8')
fs.writeFileSync(path.join(GEN_DIR, 'questions.gen.json'), JSON.stringify(questions), 'utf8')

// 問題数の分布ログ
const qCount = new Map()
for (const q of questions) qCount.set(q.char, (qCount.get(q.char) ?? 0) + 1)
const hist = {}
for (const ch of strokesMap.keys()) {
  const c = qCount.get(ch) ?? 0
  hist[c] = (hist[c] ?? 0) + 1
}
console.log('  1字あたり問題数の分布:', JSON.stringify(hist))
console.log('完了')
