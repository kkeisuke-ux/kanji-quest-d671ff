// ============================================================
// ゲーム（報酬システム）の設定。数値はすべてここで調整する（仕様 §20, §23）。
// ============================================================

export const GAME_CONFIG = {
  coins: {
    /** なぞり練習1画完走（漢字1字分） */
    trace: 1,
    /** 自由に1回書けた */
    freeWrite: 2,
    /** 文脈問題1問正解 */
    contextWrite: 2,
    /** ◎（書き順・方向も完璧）ボーナス */
    perfectBonus: 1,
    /** ステージテスト1問正解 */
    stageTestPerCorrect: 3,
    /** 大型テスト1問正解 */
    termTestPerCorrect: 2,
    /** 復習1問正解 */
    reviewPerCorrect: 3,
    /** ステージ（5字）学習完了ボーナス */
    stageClearBonus: 10,
    /** 大型テスト完走ボーナス */
    termTestFinishBonus: 30,
    /** はじめてのプレゼント（プロフィール作成時） */
    initialGift: 60,
  },
  exp: {
    /** なぞり練習（漢字1字分）で仲間に入るEXP */
    trace: 2,
    /** 1回書けたときのEXP */
    write: 4,
    /** テスト正解のEXP */
    testCorrect: 6,
  },
  star: {
    /** スター1個の値段（コイン） */
    cost: 20,
    /** スター1個で仲間に入るEXP */
    exp: 100,
  },
  gacha: {
    /** ガチャ1回の値段 */
    gachaCost: 30,
    /** 仲間に出会える確率（0-1） */
    encounterRate: 0.72,
    /** この回数連続ではずれたら次は必ず出会える（0で無効） */
    pityStreak: 3,
    /** 最初の1回は必ず出会える */
    firstGachaGuaranteed: true,
    /** レア度ごとの出現率（合計1.0） */
    rarityRates: { common: 0.7, rare: 0.25, epic: 0.05 } as Record<string, number>,
    /** すでにいる仲間が出たとき、その仲間に入る「なかよしEXP」 */
    duplicateFriendExp: 60,
  },
  levels: {
    /** 次のレベルまでに必要なEXP */
    expToNext: (level: number): number => 20 + level * 12,
    /** 進化するレベル（種族側で上書き可能）。[1段階目→2段階目, 2段階目→3段階目] */
    defaultEvolveLevels: [10, 22],
    /** 進化予告（「もうすぐ何かが起こりそう…」）を出す残りレベル数 */
    evolveTeaseWithin: 2,
  },
  review: {
    /** 間隔反復の間隔（日）。正解するたび次の段階へ */
    intervalsDays: [0, 1, 3, 7, 14, 30],
    /** 「今日の復習」に出す最大数 */
    dailyMax: 20,
  },
  /** マスター字数のお知らせマイルストーン（みんな画面） */
  milestones: [10, 20, 50, 80, 100, 150, 200],
  /** 期の表示名（データ設定だけで変更可能。仕様 §16） */
  termLabels: ['1学期', '2学期', '3学期'],
} as const

export type GameConfig = typeof GAME_CONFIG
