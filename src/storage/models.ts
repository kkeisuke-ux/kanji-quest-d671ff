// 永続化データのモデル定義（仕様 §35）。
// 仕様のエンティティ対応:
//   Profile→profiles / KanjiProgress→kanjiProgress / StrokeResult→strokeSamples
//   TestResult→testResults / UnknownKanji→unknownKanji / ReviewSchedule→kanjiProgress内のsrs項目
//   CoinBalance→profiles.coins / CoinHistory→coinHistory
//   Character(マスタ)→src/data/species.ts / OwnedCharacter・CharacterLevel→ownedCharacters
//   GachaHistory→gachaHistory

export interface Profile {
  id: string
  name: string
  /** 1-6=小1-小6, 7-9=中1-中3 */
  grade: number
  color: string
  coins: number
  stars: number
  /** いっしょに勉強している仲間（ownedCharactersのid） */
  buddyId: number | null
  gachaCount: number
  gachaMissStreak: number
  /** 判定のきびしさ 1(とてもあまい)〜5(とてもきびしい)。未設定は3(ふつう) */
  judgeStrictness?: number
  createdAt: number
  lastActiveAt: number
}

export interface KanjiProgress {
  profileId: string
  char: string
  correct: number
  wrong: number
  unknown: number
  shapeErrors: number
  orderErrors: number
  directionErrors: number
  traceDone: number
  writes: number
  contextWrites: number
  /** ステージ学習フロー（なぞり→3回→文脈5回）を完了した日時 */
  practicedAt: number | null
  /** テストで正解して習得扱いになった日時 */
  masteredAt: number | null
  /** 間隔反復の段階（0..intervalsDays.length-1） */
  srsLevel: number
  nextReviewAt: number | null
  lastSeenAt: number | null
  /** 直近に出題した問題ID（連続で同じ文脈を出さない。仕様 §12） */
  recentVariantIds: string[]
}

export interface StoredStroke {
  pointerType: string
  usedCoalesced: boolean
  /** [x, y] のリスト（容量対策で再サンプリング済み） */
  points: [number, number][]
}

export interface StrokeSampleRecord {
  id?: number
  profileId: string
  char: string
  at: number
  boxSize: number
  strokes: StoredStroke[]
  summary: {
    verdict: string
    score: number
    avgCost: number
    countMatch: boolean
    orderOk: boolean
    directionOk: boolean
  }
  context: 'practice' | 'test' | 'review' | 'debug'
  /** 判定デバッグ画面での人間ラベル（しきい値調整用。仕様 §32） */
  humanLabel: 'correct' | 'incorrect' | null
}

export type AnswerOutcome = 'correct' | 'wrong' | 'unknown'

export interface TestItemRecord {
  char: string
  result: AnswerOutcome
  orderError: boolean
  directionError: boolean
  score: number
  /** 正解までに書き直した回数（認識ミス調整の分析用） */
  retries?: number
}

export interface TestResultRecord {
  id?: number
  profileId: string
  kind: 'stage' | 'term'
  targetId: string
  at: number
  total: number
  correct: number
  items: TestItemRecord[]
}

export interface TestSessionRecord {
  profileId: string
  /** 'term:<termId>' */
  testKey: string
  kind: 'term'
  targetId: string
  chars: string[]
  currentIndex: number
  items: TestItemRecord[]
  startedAt: number
  updatedAt: number
}

/** ステージれんしゅうの途中保存（途中でやめても続きから再開できる） */
export interface PracticeSessionRecord {
  profileId: string
  stageId: string
  kanjiIdx: number
  round: number
  updatedAt: number
}

export interface UnknownKanjiRecord {
  profileId: string
  char: string
  addedAt: number
  reason: 'unknown' | 'wrong'
  lastFailedAt: number
}

export interface CoinHistoryRecord {
  id?: number
  profileId: string
  delta: number
  reason: string
  balanceAfter: number
  at: number
}

export interface OwnedCharacterRecord {
  id?: number
  profileId: string
  speciesId: string
  /** 進化段階（0始まり）。level から導出される（stageForLevel） */
  stage: number
  /** レベル=姿（1〜maxLevel）。スターをあげると上がる */
  level: number
  /** 次のレベルに向けてあげたスターの数（2026-08-08〜。未定義は旧EXP制データ→移行される） */
  starsFed?: number
  /** 旧EXP制の名残（未使用） */
  exp: number
  friendExp: number
  obtainedAt: number
}

export interface DexEntryRecord {
  profileId: string
  speciesId: string
  stage: number
  discoveredAt: number
}

export interface GachaHistoryRecord {
  id?: number
  profileId: string
  cost: number
  /** 出会えなかった場合 null */
  resultSpeciesId: string | null
  duplicated: boolean
  at: number
}

export interface ActivityRecord {
  id?: number
  profileId: string
  profileName: string
  type: 'join' | 'stageClear' | 'termTest' | 'gacha' | 'evolve' | 'milestone'
  message: string
  at: number
}

export interface SettingsRecord {
  key: string
  value: unknown
}
