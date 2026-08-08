// 筆記サンプルの保存（しきい値調整用。仕様 §32）。
// 容量対策として1画32点に再サンプリングして保存する。
import { resample } from '../core/geometry'
import type { InkStroke } from '../core/ink/types'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import { addStrokeSample } from '../storage/repo'
import type { StrokeSampleRecord } from '../storage/models'

export async function saveSample(
  profileId: string,
  char: string,
  ev: KanjiEvaluation,
  strokes: InkStroke[],
  boxSize: number,
  context: StrokeSampleRecord['context'],
  humanLabel: 'correct' | 'incorrect' | null = null
): Promise<number> {
  const stored = strokes.map((s) => ({
    pointerType: s.pointerType,
    usedCoalesced: s.usedCoalesced,
    points: resample(
      s.points.map((p) => ({ x: p.x, y: p.y })),
      32
    ).map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] as [number, number]),
  }))
  return addStrokeSample({
    profileId,
    char,
    at: Date.now(),
    boxSize,
    strokes: stored,
    summary: {
      verdict: ev.verdict,
      score: ev.score,
      avgCost: Number.isFinite(ev.avgCost) ? Math.round(ev.avgCost * 1000) / 1000 : -1,
      countMatch: ev.countMatch,
      orderOk: ev.orderOk,
      directionOk: ev.directionOk,
    },
    context,
    humanLabel,
  })
}
