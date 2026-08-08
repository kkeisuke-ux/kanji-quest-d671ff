// ============================================================
// 判定エンジン自己テスト（仕様 §33 の検証ケースA〜Fを合成データで自動実行）
// A: 正しい形＋正しい書き順 → 正解(perfect)
// B: 正しい形＋書き順違い   → 形OK＋書き順エラー検出
// C: 正しい位置を逆方向     → 形OK＋方向エラー検出
// D: 1画不足               → 不正解（画数エラー）
// E: 余分な1画             → 不正解（画数エラー）
// F: 子どもらしい歪み       → 正解
// ※ G(手のひら)・H(指) はInkCanvasの入力段階で弾くため、ブラウザ側のE2Eで検証する。
// ============================================================
import { mulberry32, resample, type Pt } from '../geometry'
import { getRefKanji, listRefKanji } from '../refdata'
import { DEFAULT_JUDGE_CONFIG, mergeJudgeConfig, type JudgeConfigPatch } from '../../config/judgeConfig'
import { evaluateKanji } from './evaluate'

export type SelfTestCaseId = 'A_correct' | 'B_swap' | 'C_reverse' | 'D_missing' | 'E_extra' | 'F_sloppy' | 'X_wrongChar'

export interface SelfTestCaseResult {
  char: string
  caseId: SelfTestCaseId
  pass: boolean
  expected: string
  actual: string
  score: number
  avgCost: number
  /** 最悪ストロークの (ref番号, コスト)。しきい値調整用 */
  worst: { ref: number; cost: number } | null
}

export interface SelfTestSummary {
  totalCases: number
  passedCases: number
  byCase: Record<string, { passed: number; total: number }>
  results: SelfTestCaseResult[]
  seed: number
}

interface JitterOpts {
  noiseAmp: number
  strokeOffset: number
  rotDeg: number
  scaleMin: number
  scaleMax: number
}

// 「ふつうに丁寧に書いた子どもの字」相当
const LIGHT: JitterOpts = { noiseAmp: 1.1, strokeOffset: 2.0, rotDeg: 3, scaleMin: 0.9, scaleMax: 1.1 }
// 「かなり雑だが読める子どもの字」相当（Fケース）
const HEAVY: JitterOpts = { noiseAmp: 2.2, strokeOffset: 3.6, rotDeg: 6, scaleMin: 0.8, scaleMax: 1.2 }

const BOX = 400

/** お手本ストロークから、子どもの筆記を模した合成ストロークを作る（109座標系） */
function synthStrokes(char: string, rnd: () => number, opts: JitterOpts): Pt[][] {
  const ref = getRefKanji(char)
  const cx = 54.5
  const cy = 54.5
  const scale = opts.scaleMin + rnd() * (opts.scaleMax - opts.scaleMin)
  const rot = (((rnd() * 2 - 1) * opts.rotDeg) * Math.PI) / 180
  const dx = (rnd() * 2 - 1) * 5
  const dy = (rnd() * 2 - 1) * 5
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  return ref.strokes.map((rs) => {
    const base = resample(rs.raw109, 40)
    const ox = (rnd() * 2 - 1) * opts.strokeOffset
    const oy = (rnd() * 2 - 1) * opts.strokeOffset
    const nx: number[] = []
    const ny: number[] = []
    for (let i = 0; i < base.length; i++) {
      nx.push((rnd() * 2 - 1) * opts.noiseAmp)
      ny.push((rnd() * 2 - 1) * opts.noiseAmp)
    }
    const sm = (arr: number[], i: number) =>
      (arr[Math.max(0, i - 1)] + arr[i] + arr[Math.min(arr.length - 1, i + 1)]) / 3
    return base.map((p, i) => {
      const rx = (p.x - cx) * scale
      const ry = (p.y - cy) * scale
      return {
        x: cx + rx * cos - ry * sin + dx + ox + sm(nx, i),
        y: cy + rx * sin + ry * cos + dy + oy + sm(ny, i),
      }
    })
  })
}

function toPx(strokes109: Pt[][]): Pt[][] {
  const k = BOX / 109
  return strokes109.map((s) => s.map((p) => ({ x: p.x * k, y: p.y * k })))
}

/** 既定は全収録漢字から等間隔サンプル40字（全2,000字超を毎回回すと重いため） */
function defaultSample(): string[] {
  const all = listRefKanji()
  if (all.length <= 40) return all
  const step = Math.floor(all.length / 40)
  return Array.from({ length: 40 }, (_, i) => all[i * step])
}

export function runSelfTest(patch?: JudgeConfigPatch, seed = 20260808, chars?: string[]): SelfTestSummary {
  const cfg = mergeJudgeConfig(DEFAULT_JUDGE_CONFIG, patch)
  const list = chars ?? defaultSample()
  const results: SelfTestCaseResult[] = []

  for (const char of list) {
    const ref = getRefKanji(char)
    const n = ref.strokeCount
    const rnd = mulberry32(seed + char.codePointAt(0)!)

    const push = (caseId: SelfTestCaseId, strokes109: Pt[][], expected: string, check: (ev: ReturnType<typeof evaluateKanji>) => boolean) => {
      const ev = evaluateKanji(char, toPx(strokes109), BOX, cfg)
      const actual = `verdict=${ev.verdict} shapeOk=${ev.shapeOk} orderOk=${ev.orderOk} dirOk=${ev.directionOk} count=${ev.userCount}/${ev.refCount}`
      results.push({
        char,
        caseId,
        pass: check(ev),
        expected,
        actual,
        score: ev.score,
        avgCost: Number.isFinite(ev.avgCost) ? Math.round(ev.avgCost * 1000) / 1000 : -1,
        worst: ev.worstPair ? { ref: ev.worstPair.refIndex, cost: Math.round(ev.worstPair.cost * 1000) / 1000 } : null,
      })
    }

    // A: 正しい形・正しい順・正しい方向
    push('A_correct', synthStrokes(char, rnd, LIGHT), 'verdict=perfect', (ev) => ev.verdict === 'perfect')

    // B: 1画目と2画目を入れ替えて書く（画数2以上）
    if (n >= 2) {
      const s = synthStrokes(char, rnd, LIGHT)
      const swapped = [s[1], s[0], ...s.slice(2)]
      push('B_swap', swapped, '形OK + 書き順エラー検出', (ev) => ev.shapeOk && !ev.orderOk && ev.verdict === 'okWithNotes')
    }

    // C: 1画目を逆方向から書く
    {
      const s = synthStrokes(char, rnd, LIGHT)
      const rev = [[...s[0]].reverse(), ...s.slice(1)]
      push('C_reverse', rev, '形OK + 方向エラー検出(1画目)', (ev) => ev.shapeOk && ev.directionErrors.includes(0) && ev.verdict === 'okWithNotes')
    }

    // D: 最後の1画を書かない（画数2以上）
    if (n >= 2) {
      const s = synthStrokes(char, rnd, LIGHT).slice(0, n - 1)
      push('D_missing', s, '不正解（画数不足）', (ev) => ev.verdict === 'wrong' && !ev.countMatch)
    }

    // E: 余分な1画を追加
    {
      const s = synthStrokes(char, rnd, LIGHT)
      const dup = s[0].map((p) => ({ x: p.x + 3, y: p.y + 3 }))
      push('E_extra', [...s, dup], '不正解（画数過多）', (ev) => ev.verdict === 'wrong' && !ev.countMatch)
    }

    // F: かなり雑（子どもの自然な範囲）でも正解になる
    push('F_sloppy', synthStrokes(char, rnd, HEAVY), 'verdict=perfect（雑でも正解）', (ev) => ev.verdict === 'perfect')

    // X: 同じ画数の「別の漢字」を書いたら不正解になる（しきい値の緩めすぎ検知）
    {
      const sameCount = listRefKanji()
        .filter((c) => c !== char && getRefKanji(c).strokeCount === n)
        .sort()
      if (sameCount.length > 0) {
        const other = sameCount[char.codePointAt(0)! % sameCount.length]
        const s = synthStrokes(other, rnd, LIGHT)
        push('X_wrongChar', s, `不正解（「${other}」を書いた）`, (ev) => ev.verdict === 'wrong')
      }
    }
  }

  const byCase: Record<string, { passed: number; total: number }> = {}
  for (const r of results) {
    byCase[r.caseId] ??= { passed: 0, total: 0 }
    byCase[r.caseId].total++
    if (r.pass) byCase[r.caseId].passed++
  }

  return {
    totalCases: results.length,
    passedCases: results.filter((r) => r.pass).length,
    byCase,
    results,
    seed,
  }
}
