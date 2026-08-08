// ============================================================
// 判定しきい値の設定ファイル（仕様 §8）
// 実機（iPad + Apple Pencil）の子どもの筆記データを使って調整する。
// 「判定デバッグ」画面から一時的に上書きでき、設定として保存もできる。
// 距離の単位は「文字正規化空間」（文字全体の最大辺 = 1.0）。
// ============================================================

export interface JudgeWeights {
  /** DTW距離（形状＋位置）の重み */
  dtw: number
  /** 離散フレシェ距離の重み */
  frechet: number
  /** 始点距離の重み */
  start: number
  /** 終点距離の重み */
  end: number
  /** 弦方向の角度差（0..1に正規化）の重み */
  angle: number
  /** ストローク長の比率差の重み */
  length: number
  /** 重心距離（文字内での位置）の重み */
  centroid: number
}

export interface JudgeConfig {
  /** 1画あたりの再サンプリング点数 */
  resampleN: number
  /** DTWのバンド幅（Sakoe-Chiba） */
  dtwBand: number
  /** これより短い入力ストローク（109座標系）はゴミとして無視する */
  minStrokeLen109: number
  weights: JudgeWeights
  /** 1画ごとの合格コスト上限 */
  strokePassCost: number
  /**
   * 短い画への許容緩和。画長が shortStrokeLenRef（文字サイズ比）以下になるほど
   * 合格コストを最大 (1 + shortStrokeSlack) 倍まで緩める。
   * 画数の多い漢字の点・短い画が過剰に不正解になるのを防ぐ。
   */
  shortStrokeSlack: number
  shortStrokeLenRef: number
  /** 全画平均コストの合格上限 */
  charAvgPassCost: number
  /** 「逆方向に書いた」と判定するためのコスト差マージン */
  reverseMargin: number
  /** 全体バランス（縦横比）の許容 log2 差。超えたら注意メッセージ（不正解にはしない） */
  aspectLogTolerance: number
  /** なぞり練習（1画ずつ）の判定 */
  trace: {
    /** 1画の合格コスト上限（自由筆記より緩い） */
    passCost: number
    /** 始点はこの半径内から書き始める必要がある */
    startRadius: number
  }
  scoring: {
    /**
     * テストで「形は正しいが書き順/方向が違う」を不正解に数えるか。
     * false: 正解に数え、書き順ミスとして別途記録する（既定）。
     */
    orderStrictInTests: boolean
    /** 画数が揃ったあと自動判定するまでの待ち時間(ms) */
    autoJudgeDelayMs: number
  }
  samples: {
    /** 端末に保存する筆記サンプル（しきい値調整用）の上限件数 */
    keepMax: number
  }
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  resampleN: 28,
  dtwBand: 9,
  minStrokeLen109: 2.5,
  weights: {
    dtw: 1.0,
    frechet: 0.35,
    start: 0.55,
    end: 0.55,
    angle: 0.9,
    length: 0.25,
    centroid: 0.6,
  },
  strokePassCost: 0.42,
  shortStrokeSlack: 1.0,
  shortStrokeLenRef: 0.35,
  charAvgPassCost: 0.3,
  reverseMargin: 0.04,
  aspectLogTolerance: 1.25,
  trace: {
    passCost: 0.6,
    startRadius: 0.32,
  },
  scoring: {
    orderStrictInTests: false,
    autoJudgeDelayMs: 700,
  },
  samples: {
    keepMax: 400,
  },
}

export type JudgeConfigPatch = {
  [K in keyof JudgeConfig]?: JudgeConfig[K] extends object ? Partial<JudgeConfig[K]> : JudgeConfig[K]
}

export function mergeJudgeConfig(base: JudgeConfig, patch?: JudgeConfigPatch | null): JudgeConfig {
  if (!patch) return base
  return {
    ...base,
    ...patch,
    weights: { ...base.weights, ...(patch.weights ?? {}) },
    trace: { ...base.trace, ...(patch.trace ?? {}) },
    scoring: { ...base.scoring, ...(patch.scoring ?? {}) },
    samples: { ...base.samples, ...(patch.samples ?? {}) },
  } as JudgeConfig
}
