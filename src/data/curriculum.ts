// カリキュラム定義: 5漢字=1ステージ、学年を3学期に分ける。
// 実データは scripts/gen-content.mjs が生成する curriculum.gen.json（小1〜中3）。
// - 小1〜小6: 文部科学省 学年別漢字配当表（KANJIDIC2のgrade情報）
// - 中1〜中3: 公式配当が存在しないため、常用漢字の残りを頻度順に3等分（データ差し替え可）
// - 小1の最初の4ステージは初期版のID・構成を維持（進捗データ互換）
import { GAME_CONFIG } from '../config/gameConfig'
import genCurriculum from './gen/curriculum.gen.json'

export interface StageDef {
  id: string
  label: string
  kanji: string[]
}

export interface TermDef {
  id: string
  /** 0始まりの期番号 */
  index: number
  stages: StageDef[]
}

export interface GradeCurriculum {
  grade: number
  gradeLabel: string
  terms: TermDef[]
  /** 配当漢字全体 */
  allKanji: string[]
  /** 期の表示名の上書き（マスター級: さかな／ことわざ・四字じゅくご 等） */
  termLabels?: string[]
  note?: string
}

interface GenStage {
  id: string
  label: string
  kanji: string[]
}

interface GenGrade {
  grade: number
  kanji: string[]
  stages: GenStage[]
  terms: { id: string; index: number; stageIds: string[] }[]
  termLabels?: string[]
}

function gradeLabelLong(grade: number): string {
  if (grade >= 10) return 'マスター'
  return grade <= 6 ? `小学${grade}年` : `中学${grade - 6}年`
}

export const CURRICULUM: GradeCurriculum[] = (genCurriculum as GenGrade[]).map((g) => {
  const stageMap = new Map(g.stages.map((s) => [s.id, s]))
  return {
    grade: g.grade,
    gradeLabel: gradeLabelLong(g.grade),
    allKanji: g.kanji,
    termLabels: g.termLabels,
    terms: g.terms.map((t) => ({
      id: t.id,
      index: t.index,
      stages: t.stageIds.map((id) => stageMap.get(id)).filter((s): s is GenStage => s != null),
    })),
    note:
      g.grade === 10
        ? 'エキストラ: さかなの漢字・四字熟語（学校の配当外）'
        : g.grade >= 7
          ? '中学の配当は頻度順の独自編成です（公式の学年別配当はありません）'
          : undefined,
  }
})

// ステージ番号を全学年の通し番号にする（第43回）。
// 「ステージN」形式のラベルだけを小1→マスターの順で振り直す（マスター級の
// 「さかな①」等の名前つきステージはそのまま）。同一ステージの再掲（そうまとめ）は
// 同じオブジェクトを共有しているため、一度だけ処理する。
{
  let seq = 0
  const seen = new Set<string>()
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      for (const st of term.stages) {
        if (seen.has(st.id)) continue
        seen.add(st.id)
        if (/^ステージ\d+$/.test(st.label)) st.label = `ステージ${++seq}`
      }
    }
  }
}

/** 実在するステージID（過去に削除されたステージの古い記録を集計に混ぜないため。第37回） */
export const ACTIVE_STAGE_IDS: Set<string> = new Set(
  CURRICULUM.flatMap((c) => c.terms.flatMap((t) => t.stages.map((s) => s.id)))
)

// ============================================================
// まとめテスト（第43回で全面改編）:
// 旧「学期ごと1本」（中学は120字超）は長すぎて続かないため、
// 4ステージ（最大20字=20問）ごとの通し番号テスト「まとめテスト N」に分割。
// 学期の境界はまたがない（旧・学期テスト100点の実績を内包テストへ引き継げるように）。
// そうまとめ等の再掲ステージからはテストを作らない。
// ============================================================
export interface TermTestDef {
  id: string
  /** 全体の通し番号（1始まり） */
  num: number
  /** 「まとめテスト12」 */
  label: string
  /** 「ステージ45〜48」「さかな①〜うみのいきもの」 */
  rangeLabel: string
  grade: number
  /** 属する旧・学期ID（実績引き継ぎ用） */
  termId: string
  stageIds: string[]
  kanji: string[]
}

export const TERM_TESTS: TermTestDef[] = (() => {
  const out: TermTestDef[] = []
  const seen = new Set<string>()
  let num = 0
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      const fresh = term.stages.filter((s) => !seen.has(s.id))
      fresh.forEach((s) => seen.add(s.id))
      for (let i = 0; i < fresh.length; i += 4) {
        const chunk = fresh.slice(i, i + 4)
        num++
        out.push({
          id: `${term.id}-m${i / 4 + 1}`,
          num,
          label: `まとめテスト${num}`,
          rangeLabel: chunk.length === 1 ? chunk[0].label : `${chunk[0].label}〜${chunk[chunk.length - 1].label}`,
          grade: cur.grade,
          termId: term.id,
          stageIds: chunk.map((s) => s.id),
          kanji: chunk.flatMap((s) => s.kanji),
        })
      }
    }
  }
  return out
})()

export const TERM_TEST_TOTAL = TERM_TESTS.length

export function findTermTest(id: string): TermTestDef | null {
  return TERM_TESTS.find((t) => t.id === id) ?? null
}

/**
 * 100点をとったまとめテストIDの集合（称号・実績の基準。第43回）。
 * 旧・学期まとめテスト（分割前）の100点は、そのとき出題範囲に含まれていた
 * 新テストすべてに引き継ぐ（例: 旧「1年1学期」100点 → その学期の新テスト全部が100点あつかい。
 * 旧「そうまとめ」100点 → マスター級の全テストが100点あつかい）。
 */
export function perfectTermTestIds(
  results: { kind: string; targetId: string; total: number; correct: number }[]
): Set<string> {
  const perfect = new Set(
    results.filter((r) => r.kind === 'term' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
  )
  const out = new Set<string>()
  // 旧・学期IDごとの「その学期に含まれていたステージID」（そうまとめの再掲も含む）
  const legacyStageIds = new Map<string, Set<string>>()
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      if (perfect.has(term.id)) legacyStageIds.set(term.id, new Set(term.stages.map((s) => s.id)))
    }
  }
  for (const t of TERM_TESTS) {
    if (perfect.has(t.id)) {
      out.add(t.id)
      continue
    }
    for (const ids of legacyStageIds.values()) {
      if (t.stageIds.every((sid) => ids.has(sid))) {
        out.add(t.id)
        break
      }
    }
  }
  return out
}

/** 5問テスト（ステージテスト）で100点をとったことのあるステージIDの集合 */
export function perfectStageIds(
  results: { kind: string; targetId: string; total: number; correct: number }[]
): Set<string> {
  return new Set(
    results.filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
  )
}

// ---------------- 飛び級テスト（第63回） ----------------
// これまでレベルは「完了した学期のうち いちばん上」で、下が空いていても上に飛べた。
// そのため先の学年を少しやるだけでレベルだけが上がってしまい、実力と表示がずれていた。
// かといって「1年生から順に全部」にすると、5年生の子は1〜4年で129ステージ＝645問を
// やり直すことになり、続かない。
// そこで レベルは「1年生から切れ目なくつながっているところまで」に戻したうえで、
// 学年ごとに飛び級テスト（その学年からランダム20問・ぜんぶ正解で合格）を用意した。
// 合格した学年は積み上げの計算で通過ずみとして扱う。テスト自体が関所になるので、
// できる子は軽い手間で先に行けて、できない子は飛べない。

export interface SkipTestDef {
  id: string
  grade: number
  /** 「1年生 とびきゅうテスト」 */
  label: string
  gradeLabel: string
  /** 出題もとの漢字（ここからランダムに20問） */
  kanji: string[]
}

export const SKIP_TESTS: SkipTestDef[] = CURRICULUM.map((cur) => ({
  id: `skip-g${cur.grade}`,
  grade: cur.grade,
  label: `${shortGradeLabel(cur.grade)} とびきゅうテスト`,
  gradeLabel: shortGradeLabel(cur.grade),
  kanji: cur.terms.flatMap((t) => t.stages.flatMap((s) => s.kanji)),
}))

export function shortGradeLabel(grade: number): string {
  if (grade <= 6) return `${grade}年生`
  if (grade <= 9) return `中${grade - 6}`
  return 'マスター'
}

export function findSkipTest(id: string): SkipTestDef | null {
  return SKIP_TESTS.find((t) => t.id === id) ?? null
}

/**
 * 飛び級テストに合格ずみの学年。合格は「ぜんぶ正解」のみ（部分点では通さない）。
 * 何度でも受けられるので、1回でも満点があれば合格あつかい。
 */
export function passedSkipGrades(
  results: { kind: string; targetId: string; total: number; correct: number }[]
): Set<number> {
  const out = new Set<number>()
  for (const r of results) {
    if (r.kind !== 'skip' || r.total <= 0 || r.correct !== r.total) continue
    const t = findSkipTest(r.targetId)
    if (t) out.add(t.grade)
  }
  return out
}

/** その学年の全ステージが5問テスト100点で埋まっているか（＝飛び級テストなしで通過ずみ） */
function gradeFilledByStages(cur: GradeCurriculum, perfect: Set<string>): boolean {
  const stages = cur.terms.flatMap((t) => t.stages)
  return stages.length > 0 && stages.every((s) => perfect.has(s.id))
}

/**
 * 到達レベル（第63回でルール変更）。
 * **1年生から切れ目なくつながっているところまで**を返す。
 * 飛び級テストに合格した学年、または全ステージ100点の学年は「通過ずみ」として飛ばして先へ進む。
 * 例:「2年生1学期」「中1 2学期」「マスター・さかな」。1学期も完了していなければnull。
 */
export function stageClearLevelLabel(perfect: Set<string>, passedGrades?: Set<number>): string | null {
  const passed = passedGrades ?? new Set<number>()
  let best: { cur: GradeCurriculum; index: number } | null = null
  for (const cur of CURRICULUM) {
    // 飛び級テスト合格 or 全ステージ100点の学年は、まるごと通過ずみ
    if (passed.has(cur.grade) || gradeFilledByStages(cur, perfect)) {
      const last = [...cur.terms].reverse().find((t) => t.stages.length > 0)
      if (last) best = { cur, index: last.index }
      continue
    }
    // そうでなければ、この学年の中で連続して完了している学期まで進んで、そこで止まる
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      if (!term.stages.every((s) => perfect.has(s.id))) return best ? formatLevelLabel(best.cur, best.index) : null
      best = { cur, index: term.index }
    }
    // 学年の途中で抜けがあった場合はここに来ない（上のreturnで抜ける）
  }
  return best ? formatLevelLabel(best.cur, best.index) : null
}

/**
 * 積み上げの先で、とびとびに完了している学期の数。
 * レベルは連続ぶんだけを表すが、飛ばした先でがんばった分が消えたように見えると
 * やる気を削ぐので、「ほかにクリア ○」として別に見せる。
 */
export function extraClearedTermCount(perfect: Set<string>, passedGrades?: Set<number>): number {
  const reached = stageClearLevelLabel(perfect, passedGrades)
  if (reached == null) {
    // 1つも連続していないなら、完了している学期はすべて「とびとび」
    return countClearedTerms(perfect)
  }
  // 連続ぶんに含まれる学期を数え、完了総数から引く
  const passed = passedGrades ?? new Set<number>()
  let inRow = 0
  outer: for (const cur of CURRICULUM) {
    if (passed.has(cur.grade) || gradeFilledByStages(cur, perfect)) {
      inRow += cur.terms.filter((t) => t.stages.length > 0 && t.stages.every((s) => perfect.has(s.id))).length
      continue
    }
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      if (!term.stages.every((s) => perfect.has(s.id))) break outer
      inRow++
    }
  }
  return Math.max(0, countClearedTerms(perfect) - inRow)
}

function countClearedTerms(perfect: Set<string>): number {
  let n = 0
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      if (term.stages.every((s) => perfect.has(s.id))) n++
    }
  }
  return n
}

/**
 * これまでのさいこう記録（第63回）。旧ルールと同じ「完了した学期のうち いちばん上」。
 * ルールを積み上げに変えた日に表示が下がって見えるのを防ぐために残してある。
 */
export function bestClearLevelLabel(perfect: Set<string>): string | null {
  let best: { cur: GradeCurriculum; index: number } | null = null
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      if (!term.stages.every((s) => perfect.has(s.id))) continue
      best = { cur, index: term.index }
    }
  }
  return best ? formatLevelLabel(best.cur, best.index) : null
}

function formatLevelLabel(cur: GradeCurriculum, index: number): string {
  const tl = termDisplayLabel(cur, index)
  if (cur.grade <= 6) return `${cur.grade}年生${tl}`
  if (cur.grade <= 9) return `中${cur.grade - 6} ${tl}`
  return `マスター・${tl}`
}

export const GRADE_OPTIONS: { value: number; label: string }[] = [
  { value: -2, label: '年少' },
  { value: -1, label: '年中' },
  { value: 0, label: '年長' },
  { value: 1, label: '小1' },
  { value: 2, label: '小2' },
  { value: 3, label: '小3' },
  { value: 4, label: '小4' },
  { value: 5, label: '小5' },
  { value: 6, label: '小6' },
  { value: 7, label: '中1' },
  { value: 8, label: '中2' },
  { value: 9, label: '中3' },
  { value: 10, label: 'マスター' },
]

export function gradeLabelOf(grade: number): string {
  return GRADE_OPTIONS.find((o) => o.value === grade)?.label ?? `学年${grade}`
}

/** 学年のカリキュラム。年少〜年長は小1へフォールバック（fallback=true） */
export function getCurriculumForGrade(grade: number): { cur: GradeCurriculum; fallback: boolean } {
  const found = CURRICULUM.find((c) => c.grade === grade)
  if (found) return { cur: found, fallback: false }
  return { cur: CURRICULUM[0], fallback: true }
}

export function termLabel(index: number): string {
  return GAME_CONFIG.termLabels[index] ?? `第${index + 1}期`
}

/** 期の表示名（学年ごとの上書きがあればそれを使う。マスター級=さかな 等） */
export function termDisplayLabel(cur: GradeCurriculum, index: number): string {
  return cur.termLabels?.[index] ?? termLabel(index)
}

export function termKanji(term: TermDef): string[] {
  return term.stages.flatMap((s) => s.kanji)
}

export function findStage(stageId: string): { stage: StageDef; term: TermDef; cur: GradeCurriculum } | null {
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      for (const stage of term.stages) {
        if (stage.id === stageId) return { stage, term, cur }
      }
    }
  }
  return null
}

export function findTerm(termId: string): { term: TermDef; cur: GradeCurriculum } | null {
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      if (term.id === termId) return { term, cur }
    }
  }
  return null
}

/** まとめテストの表示名（例: 「1年1学期まとめテスト」「マスター・さかな まとめテスト」） */
export function termTestTitle(cur: GradeCurriculum, termIndex: number): string {
  const gradePart = cur.grade >= 1 && cur.grade <= 6 ? `${cur.grade}年` : `${gradeLabelOf(cur.grade)}・`
  return `${gradePart}${termDisplayLabel(cur, termIndex)}まとめテスト`
}

/**
 * まとめテスト100点の最高到達レベル表示（第28回）。
 * 例:「1年1学期」「4年3学期」「中2 2学期」「マスター・そうまとめ」。100点がまだ無ければnull。
 * 学年順（小1→中3→マスター）→学期順で一番進んでいる100点クリア済みまとめテストを返す。
 */
export function termClearLevelLabel(perfectTermIds: Iterable<string>): string | null {
  let best: { grade: number; index: number; cur: GradeCurriculum } | null = null
  for (const id of perfectTermIds) {
    const found = findTerm(id)
    if (!found) continue
    const g = found.cur.grade
    const idx = found.term.index
    if (!best || g > best.grade || (g === best.grade && idx > best.index)) {
      best = { grade: g, index: idx, cur: found.cur }
    }
  }
  if (!best) return null
  const tl = termDisplayLabel(best.cur, best.index)
  if (best.grade <= 6) return `${best.grade}年${tl}`
  if (best.grade <= 9) return `中${best.grade - 6} ${tl}`
  return `マスター・${tl}`
}

/** その漢字が属するステージを探す（配当は学年間で重複しない前提） */
export function findStageOfChar(char: string): { stage: StageDef; term: TermDef; cur: GradeCurriculum } | null {
  for (const cur of CURRICULUM) {
    for (const term of cur.terms) {
      for (const stage of term.stages) {
        if (stage.kanji.includes(char)) return { stage, term, cur }
      }
    }
  }
  return null
}
