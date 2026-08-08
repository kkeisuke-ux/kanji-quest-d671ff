// 学年別漢字配当表（小1）と収録状況。
// 漢字データとプログラムロジックは分離する（仕様 §31）。
// 小2〜小6・中学はデータ追加のみで拡張できる（scripts/fetch-kanjivg.mjs 参照）。
import { KANJIVG } from './kanjivg/strokes.gen'

/** 小学1年 配当漢字 80字（文部科学省 学年別漢字配当表に基づく。※READMEの確認事項参照） */
export const GRADE1_KANJI: string[] = [
  ...'一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六',
]

/** ストロークデータ（お手本）があるか */
export function hasStrokeData(char: string): boolean {
  return char in KANJIVG
}

/** 現在プレイ可能な小1漢字 */
export function playableGrade1(): string[] {
  return GRADE1_KANJI.filter(hasStrokeData)
}
