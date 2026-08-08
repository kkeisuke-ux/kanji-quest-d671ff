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
}

function gradeLabelLong(grade: number): string {
  return grade <= 6 ? `小学${grade}年` : `中学${grade - 6}年`
}

export const CURRICULUM: GradeCurriculum[] = (genCurriculum as GenGrade[]).map((g) => {
  const stageMap = new Map(g.stages.map((s) => [s.id, s]))
  return {
    grade: g.grade,
    gradeLabel: gradeLabelLong(g.grade),
    allKanji: g.kanji,
    terms: g.terms.map((t) => ({
      id: t.id,
      index: t.index,
      stages: t.stageIds.map((id) => stageMap.get(id)).filter((s): s is GenStage => s != null),
    })),
    note: g.grade >= 7 ? '中学の配当は頻度順の独自編成です（公式の学年別配当はありません）' : undefined,
  }
})

/** プロフィールで選べる学年（年少・年中・年長は小1の内容で遊ぶ） */
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

/** まとめテストの表示名（例: 「1年1学期まとめテスト」「中1・1学期まとめテスト」） */
export function termTestTitle(cur: GradeCurriculum, termIndex: number): string {
  const gradePart = cur.grade >= 1 && cur.grade <= 6 ? `${cur.grade}年` : `${gradeLabelOf(cur.grade)}・`
  return `${gradePart}${termLabel(termIndex)}まとめテスト`
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
