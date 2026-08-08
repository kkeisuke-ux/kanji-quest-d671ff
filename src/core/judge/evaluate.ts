// ============================================================
// 漢字判定エンジン本体（仕様 §6, §7, §8）
// - 書いた順序を無視して User Stroke ↔ Reference Stroke を形状マッチング
//   （コスト行列 + Hungarian algorithm）
// - その対応関係から「字形」「書き順」「書く方向」を別々に評価する
// - 単純な○×判定はしない
// ============================================================
import {
  applyCharTransform,
  bboxOf,
  makeCharTransform,
  polylineLength,
  resample,
  type Pt,
} from '../geometry'
import { clampedAspect, getRefKanji, type RefKanji, type RefStroke } from '../refdata'
import { DEFAULT_JUDGE_CONFIG, type JudgeConfig } from '../../config/judgeConfig'
import { pairCost, pairMetrics, strokeFeatures, type PairMetrics, type StrokeFeatures } from './metrics'
import { hungarian } from './hungarian'

export type Verdict = 'perfect' | 'okWithNotes' | 'wrong'

export interface PairEval {
  /** 書いた順（0始まり） */
  userIndex: number
  /** 対応するお手本の画番号（0始まり） */
  refIndex: number
  /** 逆方向に書かれたと判定 */
  reversed: boolean
  /** 採用した向きのコスト */
  cost: number
  costForward: number
  costReversed: number
  shapeOk: boolean
  metrics: PairMetrics
}

export interface OrderError {
  /** swap: a画目とb画目（ref番号0始まり）が逆 / misplaced: a=書いた順位, b=実際のref番号 */
  kind: 'swap' | 'misplaced'
  a: number
  b: number
}

export interface KanjiEvaluation {
  char: string
  refCount: number
  userCount: number
  countMatch: boolean
  droppedTinyStrokes: number
  pairs: PairEval[]
  missingRefIndexes: number[]
  extraUserIndexes: number[]
  /** 書いた順に並べた対応ref番号 */
  orderSeq: number[]
  orderOk: boolean
  orderErrors: OrderError[]
  directionOk: boolean
  directionErrors: number[]
  shapeOk: boolean
  avgCost: number
  worstPair: PairEval | null
  aspectOk: boolean
  aspectLogDiff: number
  score: number
  verdict: Verdict
  /** テストでの採点（設定 orderStrictInTests に依存） */
  correctForTest: boolean
  messages: string[]
  notes: string[]
}

function refStrokeFeatures(rs: RefStroke): StrokeFeatures {
  return {
    pts: rs.norm,
    len: rs.normLen,
    start: rs.normStart,
    end: rs.normEnd,
    centroid: rs.normCentroid,
    angle: rs.normAngle,
  }
}

function analyzeOrder(seq: number[]): { ok: boolean; errors: OrderError[] } {
  const sorted = [...seq].sort((a, b) => a - b)
  const diffPos: number[] = []
  for (let i = 0; i < seq.length; i++) if (seq[i] !== sorted[i]) diffPos.push(i)
  if (diffPos.length === 0) return { ok: true, errors: [] }
  if (diffPos.length === 2) {
    const [p, q] = diffPos
    if (seq[p] === sorted[q] && seq[q] === sorted[p]) {
      return { ok: false, errors: [{ kind: 'swap', a: Math.min(seq[p], seq[q]), b: Math.max(seq[p], seq[q]) }] }
    }
  }
  const errors: OrderError[] = []
  for (let i = 0; i < seq.length && errors.length < 3; i++) {
    if (seq[i] !== sorted[i]) errors.push({ kind: 'misplaced', a: i, b: seq[i] })
  }
  return { ok: false, errors }
}

function emptyEvaluation(char: string, refCount: number, dropped: number): KanjiEvaluation {
  return {
    char,
    refCount,
    userCount: 0,
    countMatch: false,
    droppedTinyStrokes: dropped,
    pairs: [],
    missingRefIndexes: Array.from({ length: refCount }, (_, i) => i),
    extraUserIndexes: [],
    orderSeq: [],
    orderOk: false,
    orderErrors: [],
    directionOk: true,
    directionErrors: [],
    shapeOk: false,
    avgCost: Infinity,
    worstPair: null,
    aspectOk: true,
    aspectLogDiff: 0,
    score: 0,
    verdict: 'wrong',
    correctForTest: false,
    messages: ['まだ書けていないよ'],
    notes: [],
  }
}

/**
 * 自由筆記（お手本位置に依存しない）1文字の総合評価。
 * strokesPx: キャンバスCSS px座標のストローク列 / boxSizePx: キャンバス一辺
 */
export function evaluateKanji(
  char: string,
  strokesPx: Pt[][],
  boxSizePx: number,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG
): KanjiEvaluation {
  const ref = getRefKanji(char, cfg.resampleN)
  const s109 = 109 / Math.max(boxSizePx, 1)

  // 109座標系へ変換し、ゴミストローク（極小の点）を除去
  const kept: Pt[][] = []
  let dropped = 0
  for (const s of strokesPx) {
    const conv = s.map((p) => ({ x: p.x * s109, y: p.y * s109 }))
    if (conv.length < 2 || polylineLength(conv) < cfg.minStrokeLen109) {
      dropped++
      continue
    }
    kept.push(conv)
  }

  const refCount = ref.strokeCount
  const userCount = kept.length
  if (userCount === 0) return emptyEvaluation(char, refCount, dropped)
  const countMatch = userCount === refCount

  // 文字全体を正規化（大きさ・位置ずれを許容。仕様 §8）
  const inkBBox = bboxOf(kept)
  const t = makeCharTransform(inkBBox)
  const userNorm = kept.map((s) => resample(applyCharTransform(s, t), cfg.resampleN))
  const userFeat = userNorm.map(strokeFeatures)
  const userFeatRev = userNorm.map((s) => strokeFeatures([...s].reverse()))
  const refFeat = ref.strokes.map(refStrokeFeatures)

  // コスト行列（向きに依存しない min(順方向, 逆方向) でマッチング）
  const mF: PairMetrics[][] = []
  const mR: PairMetrics[][] = []
  const cF: number[][] = []
  const cR: number[][] = []
  for (let u = 0; u < userCount; u++) {
    mF.push([])
    mR.push([])
    cF.push([])
    cR.push([])
    for (let r = 0; r < refCount; r++) {
      const f = pairMetrics(userFeat[u], refFeat[r], cfg.dtwBand)
      const rv = pairMetrics(userFeatRev[u], refFeat[r], cfg.dtwBand)
      mF[u].push(f)
      mR[u].push(rv)
      cF[u].push(pairCost(f, cfg.weights))
      cR[u].push(pairCost(rv, cfg.weights))
    }
  }

  const K = Math.max(userCount, refCount)
  const PAD = 5
  const matrix: number[][] = []
  for (let u = 0; u < K; u++) {
    const row: number[] = []
    for (let r = 0; r < K; r++) {
      if (u < userCount && r < refCount) row.push(Math.min(cF[u][r], cR[u][r]))
      else row.push(PAD)
    }
    matrix.push(row)
  }
  const assignment = hungarian(matrix)

  // 短い画ほど合格コストを緩める（点・短い画の相対誤差対策）
  const passCostFor = (refIndex: number): number => {
    const len = refFeat[refIndex].len
    const t = Math.min(1, Math.max(0, 1 - len / Math.max(cfg.shortStrokeLenRef, 1e-6)))
    return cfg.strokePassCost * (1 + cfg.shortStrokeSlack * t)
  }

  const pairs: PairEval[] = []
  const matchedRefs = new Set<number>()
  const extraUserIndexes: number[] = []
  for (let u = 0; u < userCount; u++) {
    const r = assignment[u]
    if (r >= 0 && r < refCount) {
      const reversed = cR[u][r] + cfg.reverseMargin < cF[u][r]
      const cost = reversed ? cR[u][r] : cF[u][r]
      pairs.push({
        userIndex: u,
        refIndex: r,
        reversed,
        cost,
        costForward: cF[u][r],
        costReversed: cR[u][r],
        shapeOk: cost <= passCostFor(r),
        metrics: reversed ? mR[u][r] : mF[u][r],
      })
      matchedRefs.add(r)
    } else {
      extraUserIndexes.push(u)
    }
  }
  const missingRefIndexes: number[] = []
  for (let r = 0; r < refCount; r++) if (!matchedRefs.has(r)) missingRefIndexes.push(r)

  pairs.sort((a, b) => a.userIndex - b.userIndex)
  const orderSeq = pairs.map((p) => p.refIndex)
  const order = analyzeOrder(orderSeq)

  const directionErrors = pairs.filter((p) => p.reversed && p.shapeOk).map((p) => p.refIndex)
  const directionOk = directionErrors.length === 0

  const avgCost = pairs.length > 0 ? pairs.reduce((acc, p) => acc + p.cost, 0) / pairs.length : Infinity
  const worstPair = pairs.length > 0 ? pairs.reduce((w, p) => (p.cost > w.cost ? p : w), pairs[0]) : null

  const shapeOk = countMatch && pairs.length === refCount && pairs.every((p) => p.shapeOk) && avgCost <= cfg.charAvgPassCost

  const inkAspect = clampedAspect(inkBBox)
  const aspectLogDiff = Math.abs(Math.log2(inkAspect / ref.aspect))
  const aspectOk = aspectLogDiff <= cfg.aspectLogTolerance

  let verdict: Verdict
  if (!shapeOk) verdict = 'wrong'
  else if (order.ok && directionOk) verdict = 'perfect'
  else verdict = 'okWithNotes'

  let score: number
  if (!shapeOk) {
    score = countMatch ? 30 : 15
  } else {
    const shapePenalty = Math.round(Math.min(25, Math.max(0, avgCost * 120)))
    const orderPenalty = order.ok ? 0 : Math.min(15, 5 * order.errors.length + 5)
    const dirPenalty = Math.min(10, directionErrors.length * 5)
    score = Math.max(40, 100 - shapePenalty - orderPenalty - dirPenalty)
  }

  const messages: string[] = []
  const notes: string[] = []
  if (verdict === 'perfect') {
    messages.push('よくできました！')
  } else if (verdict === 'okWithNotes') {
    messages.push('形は合っています')
    for (const e of order.errors) {
      if (e.kind === 'swap') messages.push(`${e.a + 1}画目と${e.b + 1}画目の書き順が逆です`)
      else messages.push(`${e.a + 1}番目に書いた線は、ほんとうは${e.b + 1}画目の線です`)
    }
    for (const r of directionErrors) messages.push(`${r + 1}画目は反対の方向から書いています`)
  } else {
    if (!countMatch) {
      if (userCount < refCount) messages.push(`画がたりないよ（お手本は${refCount}画、いま${userCount}画）`)
      else messages.push(`画がおおいよ（お手本は${refCount}画、いま${userCount}画）`)
    } else if (worstPair) {
      messages.push(`${worstPair.refIndex + 1}画目の形がすこしちがうようです`)
      messages.push('お手本をよく見てもういちど書いてみよう')
    }
  }
  if (shapeOk && !aspectOk) notes.push('たてよこのバランスにも気をつけよう')

  const correctForTest = shapeOk && (cfg.scoring.orderStrictInTests ? order.ok && directionOk : true)

  return {
    char,
    refCount,
    userCount,
    countMatch,
    droppedTinyStrokes: dropped,
    pairs,
    missingRefIndexes,
    extraUserIndexes,
    orderSeq,
    orderOk: order.ok,
    orderErrors: order.errors,
    directionOk,
    directionErrors,
    shapeOk,
    avgCost,
    worstPair,
    aspectOk,
    aspectLogDiff,
    score,
    verdict,
    correctForTest,
    messages,
    notes,
  }
}

// ============================================================
// なぞり練習用: 1画だけの判定（お手本の位置に重ねて書く。仕様 §9）
// ============================================================
export interface TraceJudgeResult {
  ok: boolean
  /** 始点が遠すぎる */
  startTooFar: boolean
  /** 逆方向に書いたと推定される */
  reversed: boolean
  cost: number
  startDist: number
}

export function judgeTraceStroke(
  char: string,
  strokeIndex: number,
  strokePx: Pt[],
  boxSizePx: number,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG
): TraceJudgeResult {
  const ref = getRefKanji(char, cfg.resampleN)
  const rs = ref.strokes[strokeIndex]
  if (!rs) throw new Error(`judgeTraceStroke: stroke ${strokeIndex} not found for ${char}`)
  const s109 = 109 / Math.max(boxSizePx, 1)
  const conv = strokePx.map((p) => ({ x: p.x * s109, y: p.y * s109 }))
  if (conv.length < 2 || polylineLength(conv) < cfg.minStrokeLen109) {
    return { ok: false, startTooFar: false, reversed: false, cost: Infinity, startDist: Infinity }
  }
  // なぞりでは「お手本の位置」に合わせる必要があるため、ref側の正規化変換を使う
  const norm = resample(applyCharTransform(conv, ref.transform), cfg.resampleN)
  const feat = strokeFeatures(norm)
  const featRev = strokeFeatures([...norm].reverse())
  const refF = refStrokeFeatures(rs)
  // なぞりは位置ガイドが見えているため、位置系（始点・終点・重心）の重みを倍にして
  // 「となりの別の画」への誤マッチを防ぐ。線の揺れ（DTW）への寛容さは変えない。
  const traceWeights = {
    ...cfg.weights,
    start: cfg.weights.start * 2,
    end: cfg.weights.end * 2,
    centroid: cfg.weights.centroid * 2,
  }
  const costF = pairCost(pairMetrics(feat, refF, cfg.dtwBand), traceWeights)
  const costR = pairCost(pairMetrics(featRev, refF, cfg.dtwBand), traceWeights)
  const startDist = Math.hypot(feat.start.x - rs.normStart.x, feat.start.y - rs.normStart.y)
  const endNearStart = Math.hypot(feat.end.x - rs.normStart.x, feat.end.y - rs.normStart.y)

  const startTooFar = startDist > cfg.trace.startRadius
  const ok = !startTooFar && costF <= cfg.trace.passCost
  const reversed =
    !ok && costR <= cfg.trace.passCost && costR + cfg.reverseMargin < costF && endNearStart <= cfg.trace.startRadius

  return { ok, startTooFar, reversed, cost: costF, startDist }
}
