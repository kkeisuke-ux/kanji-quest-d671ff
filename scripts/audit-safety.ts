// ============================================================
// 出題文の安全性チェック（第48回・子ども向け適切性の一括監査）
//   npx vite-node scripts/audit-safety.ts
// アプリが実際に出題する全問題（手書き＋自動生成＋マスター級）を走査し、
// 子どもに不適切な語を含む候補をカテゴリ別に一覧する（判断は人が行う）。
// 出力: docs/question-safety-report.md
//
// 方針:
// - level 'ng'   … 原則そのまま出さない（性的・暴力・差別・犯罪）
// - level 'check'… 配当漢字の意味上どうしても必要な場合がある（弔・虜・患 等）。人が読んで判断する
// - 正規表現は「取りこぼしより誤検出」を優先するが、部分一致の事故（例:「おしえて」を
//   差別語と誤検出）を避けるため、日本語の連結に強い語だけを入れる
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FULL_BANK } from '../src/data/questions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(__dirname, '..', 'docs', 'question-safety-report.md')

const RULES: { key: string; level: 'ng' | 'check'; re: RegExp }[] = [
  {
    key: '性的',
    level: 'ng',
    re: /セックス|性交|性欲|全裸|裸に|わいせつ|猥褻|売春|買春|風俗店|愛人|不倫|浮気|童貞|処女|避妊|中絶|エロ|ポルノ|ヌード|乳房|ブラジャー|ストリップ|接吻/,
  },
  {
    key: '暴力・殺傷',
    level: 'ng',
    re: /殺され|殺した|殺す|殺人|射殺|絞殺|刺殺|自殺|首をつ|首を絞|なぐりつけ|殴りつけ|殴った|蹴りつけ|刺した|撃たれ|撃ち殺|拷問|処刑|虐待|暴行|レイプ|強姦|死体|遺体|血まみれ|血だらけ/,
  },
  {
    key: '差別・侮蔑',
    level: 'ng',
    re: /馬鹿|ばか者|バカ|阿呆|アホ|間抜け|まぬけ|ブス|デブ|ハゲ|きちがい|気違い|めくら|つんぼ|土人|乞食|くたばれ|死ね/,
  },
  {
    key: '犯罪・薬物',
    level: 'ng',
    re: /麻薬|覚醒剤|大麻|コカイン|ヘロイン|密売|密輸|恐喝|脅迫|誘拐|人質|強盗|窃盗|万引き|放火|テロ|爆弾|拳銃|賭博|八百長|横領|贈賄|収賄/,
  },
  { key: '飲酒・喫煙・賭け', level: 'check', re: /酒を飲|酒に酔|酔っ払|泥酔|ビール|ウイスキー|ワイン|焼酎|日本酒|たばこ|タバコ|煙草|喫煙|パチンコ|競馬|宝くじ/ },
  { key: '死・病気', level: 'check', re: /死ん|死亡|亡くな|死去|葬式|葬儀|お墓|墓地|末期|入院|手術|重病|不治|精神病|うつ病|認知症|病死/ },
  { key: '恋愛・家庭のもめごと', level: 'check', re: /離婚|別居|失恋|振られ|嫉妬|再婚|未亡人|家出/ },
  { key: 'お金の心配', level: 'check', re: /借金|破産|倒産|失業|リストラ|貧乏|貧困|飢え/ },
  { key: '戦争・災害', level: 'check', re: /戦争|空襲|原爆|核兵器|軍隊|兵士|侵略|虐殺|震災|津波|遭難|墜落/ },
  { key: 'こわい話', level: 'check', re: /幽霊|お化け|化け物|呪い|悪魔|地獄|亡霊|祟り/ },
  { key: '詐欺・悪事', level: 'check', re: /詐欺|悪事|犯行|逮捕|容疑|裁判|刑務所/ },
]

const render = (q: { parts: { text?: string; ruby?: string; blank?: { reading: string } }[] }) =>
  q.parts.map((p) => (p.blank ? `〔${p.blank.reading}〕` : p.text ?? '')).join('')

interface Row {
  char: string
  id: string
  kind: string
  text: string
  cat: string
  level: 'ng' | 'check'
  hit: string
}
const rows: Row[] = []
for (const q of FULL_BANK) {
  const text = render(q) + (q.meaning ? ` ／意味: ${q.meaning}` : '')
  for (const rule of RULES) {
    const m = text.match(rule.re)
    if (!m) continue
    rows.push({ char: q.char, id: q.id, kind: q.kind, text, cat: rule.key, level: rule.level, hit: m[0] })
    break
  }
}

const byCat = new Map<string, Row[]>()
for (const r of rows) {
  if (!byCat.has(r.cat)) byCat.set(r.cat, [])
  byCat.get(r.cat)!.push(r)
}
const ng = rows.filter((r) => r.level === 'ng')
const check = rows.filter((r) => r.level === 'check')

let md = `# 出題文の安全性チェック結果\n\n`
md += `- 実行: \`npx vite-node scripts/audit-safety.ts\`\n`
md += `- 対象: アプリが出題する全問題 **${FULL_BANK.length}問**（手書き＋自動生成＋マスター級、配信ルール適用後）\n`
md += `- 検出: 原則削除(ng) **${ng.length}件** / 要確認(check) **${check.length}件**\n`
md += `- 機械判定は候補出しのみ。最終判断は人が行う。'check' は配当漢字の意味上、必要な場合がある（弔・虜・患など）\n\n`
if (rows.length === 0) md += `**検出なし**\n\n`
for (const [cat, list] of byCat) {
  md += `## ${cat}（${list[0].level === 'ng' ? '原則削除' : '要確認'}）: ${list.length}件\n\n`
  md += `| 字 | ID | 種別 | 一致 | 問題文 |\n|---|---|---|---|---|\n`
  for (const r of list) md += `| ${r.char} | ${r.id} | ${r.kind} | ${r.hit} | ${r.text.replace(/\|/g, '/')} |\n`
  md += `\n`
}
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, md, 'utf8')
console.log(`全${FULL_BANK.length}問を検査`)
for (const [cat, list] of byCat) console.log(`  ${cat}: ${list.length}件 (${list[0].level})`)
console.log(`原則削除 ${ng.length} / 要確認 ${check.length}`)
console.log(`レポート: ${outFile}`)
