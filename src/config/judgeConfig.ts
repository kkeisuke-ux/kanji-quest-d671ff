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
  // 既定値は「ふつう」（実機フィードバックにより2026-08-08に大幅緩和。旧: 0.42/0.30）
  strokePassCost: 0.55,
  shortStrokeSlack: 1.0,
  shortStrokeLenRef: 0.35,
  charAvgPassCost: 0.39,
  reverseMargin: 0.04,
  aspectLogTolerance: 1.25,
  trace: {
    passCost: 0.78,
    startRadius: 0.4,
  },
  scoring: {
    // 2026-08-08変更: 書き順・書く方向が違う場合は○にしない（正しく書けるまでリトライ）。
    // 字形のきびしさとは独立（字形はSTRICTNESSで調整、書き順は常に判定）。
    orderStrictInTests: true,
    autoJudgeDelayMs: 700,
  },
  samples: {
    keepMax: 400,
  },
}

// ============================================================
// 判定のきびしさ（ユーザーがプロフィールごとに設定。仕様追加 2026-08-08）
// 合格コストしきい値に係数を掛ける。1=とてもあまい 〜 5=とてもきびしい。
// 注意: 「とてもあまい」でも別の漢字は不正解になる（自己テストX参照。
// 誤字拒否コストの下限 avg≒0.73 に対し L1でも上限0.57で余裕がある）。
// ============================================================
// 2026-08-08 第3回フィードバック: デフォルト=とてもあまい(1.45)、さらに甘い「もっとあまい」を追加
export const STRICTNESS_FACTORS: Record<number, number> = {
  1: 1.6,
  2: 1.45,
  3: 1.2,
  4: 1.0,
  5: 0.76,
}

export const STRICTNESS_LABELS = ['もっとあまい', 'とてもあまい', 'あまい', 'ふつう', 'きびしい']

export const DEFAULT_STRICTNESS = 2

export function applyStrictness(cfg: JudgeConfig, level: number): JudgeConfig {
  const lv = Math.min(5, Math.max(1, Math.round(level || DEFAULT_STRICTNESS)))
  const f = STRICTNESS_FACTORS[lv] ?? 1
  if (f === 1) return cfg
  // なぞりは位置ガイドが見えているので緩めすぎない（隣の画への誤マッチ防止）。
  // 始点半径は固定、合格コストの緩和は±15〜20%まで。
  const traceF = Math.min(1.15, Math.max(0.8, f))
  return {
    ...cfg,
    strokePassCost: cfg.strokePassCost * f,
    charAvgPassCost: cfg.charAvgPassCost * f,
    trace: {
      passCost: cfg.trace.passCost * traceF,
      startRadius: cfg.trace.startRadius,
    },
  }
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
