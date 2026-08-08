// カリキュラム定義: 5漢字=1ステージ、学年を3期に分ける（仕様 §10, §16）。
// 期の表示名は gameConfig.termLabels で変更できる（「1学期」→「第1期」等）。
import { GAME_CONFIG } from '../config/gameConfig'
import { GRADE1_KANJI } from './kanjiIndex'

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
  /** 配当漢字全体（未収録含む） */
  allKanji: string[]
  note?: string
}

const grade1: GradeCurriculum = {
  grade: 1,
  gradeLabel: '小学1年',
  allKanji: GRADE1_KANJI,
  terms: [
    {
      id: 'g1t1',
      index: 0,
      stages: [
        { id: 'g1t1s1', label: 'ステージ1', kanji: [...'一二三十川'] },
        { id: 'g1t1s2', label: 'ステージ2', kanji: [...'山日田口人'] },
      ],
    },
    {
      id: 'g1t2',
      index: 1,
      stages: [
        { id: 'g1t2s1', label: 'ステージ3', kanji: [...'大木本子女'] },
        { id: 'g1t2s2', label: 'ステージ4', kanji: [...'学校森右左'] },
      ],
    },
    { id: 'g1t3', index: 2, stages: [] },
  ],
  note: '現在は判定エンジン検証用の20字（仕様§33）を収録。残りはデータ追加のみで拡張できます。',
}

export const CURRICULUM: GradeCurriculum[] = [grade1]

export const GRADE_LABELS = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3']

export function gradeLabelOf(grade: number): string {
  return GRADE_LABELS[grade - 1] ?? `学年${grade}`
}

/** 学年のカリキュラム。未整備学年は小1へフォールバック（fallback=true） */
export function getCurriculumForGrade(grade: number): { cur: GradeCurriculum; fallback: boolean } {
  const found = CURRICULUM.find((c) => c.grade === grade)
  if (found) return { cur: found, fallback: false }
  return { cur: grade1, fallback: true }
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
