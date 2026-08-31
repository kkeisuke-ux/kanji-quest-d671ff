// データアクセス層。画面からはこのモジュール経由で読み書きする。
import { GAME_CONFIG } from '../config/gameConfig'
import { bonusForStreak, dailyStreakCoins, studySummary, todayYmd, ymdOf, monthKeyOf } from '../game/streak'
import type { StreakBonus } from '../game/streak'
import {
  dbAdd,
  dbClear,
  dbCount,
  dbDelete,
  dbGet,
  dbGetAll,
  dbIndexAll,
  dbIndexKeys,
  dbPut,
} from './db'
import type {
  ActivityRecord,
  AnswerOutcome,
  CoinHistoryRecord,
  DexEntryRecord,
  GachaHistoryRecord,
  KanjiProgress,
  OwnedCharacterRecord,
  PracticeSessionRecord,
  Profile,
  SettingsRecord,
  StrokeSampleRecord,
  StudyDayRecord,
  TestResultRecord,
  TestSessionRecord,
  UnknownKanjiRecord,
} from './models'

export const PROFILE_COLORS = ['#e0645f', '#4a67d8', '#3f9d63', '#e79a2e', '#8a5bd6']
export const MAX_PROFILES = 5

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfTomorrow(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() + DAY_MS
}

// ---------------- Profiles ----------------
export async function listProfiles(): Promise<Profile[]> {
  const all = await dbGetAll<Profile>('profiles')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export function getProfile(id: string): Promise<Profile | undefined> {
  return dbGet<Profile>('profiles', id)
}

export async function saveProfile(p: Profile): Promise<void> {
  await dbPut('profiles', p)
}

export async function createProfile(name: string, grade: number): Promise<Profile> {
  const existing = await listProfiles()
  if (existing.length >= MAX_PROFILES) throw new Error('プロフィールは5人までです')
  const profile: Profile = {
    id: uuid(),
    name,
    grade,
    color: PROFILE_COLORS[existing.length % PROFILE_COLORS.length],
    coins: GAME_CONFIG.coins.initialGift,
    stars: 0,
    buddyId: null,
    gachaCount: 0,
    gachaMissStreak: 0,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  }
  await dbPut('profiles', profile)
  await dbAdd('coinHistory', {
    profileId: profile.id,
    delta: GAME_CONFIG.coins.initialGift,
    reason: 'はじめてのプレゼント',
    balanceAfter: profile.coins,
    at: Date.now(),
  } satisfies Omit<CoinHistoryRecord, 'id'>)
  await addActivity(profile.id, profile.name, 'join', `${profile.name}が かんじクエストを はじめました`)
  try {
    void navigator.storage?.persist?.()
  } catch {
    // 永続化リクエスト失敗は無視
  }
  return profile
}

export async function deleteProfileDeep(profileId: string): Promise<void> {
  const byProfileStores = [
    'kanjiProgress',
    'strokeSamples',
    'testResults',
    'testSessions',
    'practiceSessions',
    'unknownKanji',
    'coinHistory',
    'ownedCharacters',
    'dexEntries',
    'gachaHistory',
    'studyDays',
  ] as const
  for (const store of byProfileStores) {
    const keys = await dbIndexKeys(store, 'byProfile', profileId)
    for (const key of keys) await dbDelete(store, key)
  }
  const feed = await dbGetAll<ActivityRecord>('activityFeed')
  for (const item of feed) {
    if (item.profileId === profileId && item.id != null) await dbDelete('activityFeed', item.id)
  }
  await dbDelete('profiles', profileId)
}

// ---------------- KanjiProgress / SRS ----------------
export function defaultProgress(profileId: string, char: string): KanjiProgress {
  return {
    profileId,
    char,
    correct: 0,
    wrong: 0,
    unknown: 0,
    shapeErrors: 0,
    orderErrors: 0,
    directionErrors: 0,
    traceDone: 0,
    writes: 0,
    contextWrites: 0,
    practicedAt: null,
    masteredAt: null,
    srsLevel: 0,
    nextReviewAt: null,
    lastSeenAt: null,
    recentVariantIds: [],
  }
}

export async function getProgress(profileId: string, char: string): Promise<KanjiProgress> {
  const found = await dbGet<KanjiProgress>('kanjiProgress', [profileId, char])
  return found ?? defaultProgress(profileId, char)
}

export async function saveProgress(p: KanjiProgress): Promise<void> {
  await dbPut('kanjiProgress', p)
}

export function listProgress(profileId: string): Promise<KanjiProgress[]> {
  return dbIndexAll<KanjiProgress>('kanjiProgress', 'byProfile', profileId)
}

export interface OutcomeOptions {
  context: 'test' | 'review' | 'practice'
  orderError?: boolean
  directionError?: boolean
  shapeError?: boolean
}

/** 正誤結果を進捗とSRSへ反映する（仕様 §17） */
export async function applyOutcome(
  profileId: string,
  char: string,
  outcome: AnswerOutcome,
  opts: OutcomeOptions
): Promise<KanjiProgress> {
  const p = await getProgress(profileId, char)
  const now = Date.now()
  p.lastSeenAt = now
  if (outcome === 'correct') p.correct++
  else if (outcome === 'wrong') p.wrong++
  else p.unknown++
  if (opts.shapeError) p.shapeErrors++
  if (opts.orderError) p.orderErrors++
  if (opts.directionError) p.directionErrors++

  const intervals = GAME_CONFIG.review.intervalsDays
  if (opts.context === 'test' || opts.context === 'review') {
    if (outcome === 'correct') {
      p.srsLevel = Math.min(p.srsLevel + 1, intervals.length - 1)
      p.nextReviewAt = now + intervals[p.srsLevel] * DAY_MS
    } else {
      p.srsLevel = 0
      p.nextReviewAt = startOfTomorrow()
    }
    if (opts.context === 'test') {
      if (outcome === 'correct') p.masteredAt = p.masteredAt ?? now
      else p.masteredAt = null
    }
  } else if (p.nextReviewAt == null) {
    // 練習で初めて触れた漢字は明日復習に出す
    p.nextReviewAt = startOfTomorrow()
  }
  await saveProgress(p)
  void markStudied(profileId)
  return p
}

export async function recordRecentVariant(profileId: string, char: string, variantId: string): Promise<void> {
  const p = await getProgress(profileId, char)
  p.recentVariantIds = [variantId, ...p.recentVariantIds.filter((v) => v !== variantId)].slice(0, 3)
  await saveProgress(p)
}

export async function dueReviewChars(profileId: string): Promise<string[]> {
  const all = await listProgress(profileId)
  const now = Date.now()
  return all
    .filter((p) => p.nextReviewAt != null && p.nextReviewAt <= now && (p.correct + p.wrong + p.unknown + p.writes + p.traceDone > 0))
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, GAME_CONFIG.review.dailyMax)
    .map((p) => p.char)
}

export async function masteredCount(profileId: string): Promise<number> {
  const all = await listProgress(profileId)
  return all.filter((p) => p.masteredAt != null).length
}

// ---------------- Unknown list（わからなかった漢字。仕様 §15 + 2026-08-08 出どころ分離） ----------------
export type UnknownSource = 'stage' | 'term'

function unknownSources(rec: UnknownKanjiRecord): UnknownSource[] {
  return rec.sources ?? ['stage']
}

export async function addUnknown(
  profileId: string,
  char: string,
  reason: 'unknown' | 'wrong',
  source: UnknownSource
): Promise<void> {
  const existing = await dbGet<UnknownKanjiRecord>('unknownKanji', [profileId, char])
  const now = Date.now()
  if (existing) {
    existing.lastFailedAt = now
    existing.reason = reason
    const sources = unknownSources(existing)
    if (!sources.includes(source)) sources.push(source)
    existing.sources = sources
    await dbPut('unknownKanji', existing)
  } else {
    await dbPut('unknownKanji', {
      profileId,
      char,
      addedAt: now,
      reason,
      lastFailedAt: now,
      sources: [source],
    } satisfies UnknownKanjiRecord)
  }
}

/** テストで正解したとき、そのテスト種類ぶんのリストから外す。全部外れたらレコード削除 */
export async function clearUnknown(profileId: string, char: string, source: UnknownSource): Promise<boolean> {
  const existing = await dbGet<UnknownKanjiRecord>('unknownKanji', [profileId, char])
  if (!existing) return false
  const sources = unknownSources(existing).filter((s) => s !== source)
  if (!unknownSources(existing).includes(source)) return false
  if (sources.length === 0) {
    await dbDelete('unknownKanji', [profileId, char])
  } else {
    existing.sources = sources
    await dbPut('unknownKanji', existing)
  }
  return true
}

export async function listUnknown(profileId: string, source?: UnknownSource): Promise<UnknownKanjiRecord[]> {
  const all = await dbIndexAll<UnknownKanjiRecord>('unknownKanji', 'byProfile', profileId)
  if (!source) return all
  return all.filter((r) => unknownSources(r).includes(source))
}

/** 「わからなかった漢字のふくしゅう」完了を記録（復習済み表示用） */
export async function markUnknownReviewed(profileId: string, char: string): Promise<void> {
  const existing = await dbGet<UnknownKanjiRecord>('unknownKanji', [profileId, char])
  if (!existing) return
  existing.lastReviewedAt = Date.now()
  await dbPut('unknownKanji', existing)
  void markStudied(profileId)
}

// ---------------- Coins ----------------
export async function addCoins(profileId: string, delta: number, reason: string): Promise<Profile> {
  const profile = await getProfile(profileId)
  if (!profile) throw new Error('profile not found')
  profile.coins = Math.max(0, profile.coins + delta)
  profile.lastActiveAt = Date.now()
  await dbPut('profiles', profile)
  await dbAdd('coinHistory', {
    profileId,
    delta,
    reason,
    balanceAfter: profile.coins,
    at: Date.now(),
  } satisfies Omit<CoinHistoryRecord, 'id'>)
  return profile
}

export function listCoinHistory(profileId: string): Promise<CoinHistoryRecord[]> {
  return dbIndexAll<CoinHistoryRecord>('coinHistory', 'byProfile', profileId)
}

// ---------------- Stroke samples（判定調整用の筆記データ。仕様 §32） ----------------
export async function addStrokeSample(rec: Omit<StrokeSampleRecord, 'id'>): Promise<number> {
  const id = (await dbAdd('strokeSamples', rec)) as number
  const count = await dbCount('strokeSamples')
  const max = 400
  if (count > max) {
    const all = await dbGetAll<StrokeSampleRecord>('strokeSamples')
    const removable = all.filter((s) => s.humanLabel == null).sort((a, b) => a.at - b.at)
    for (const s of removable.slice(0, count - max)) {
      if (s.id != null) await dbDelete('strokeSamples', s.id)
    }
  }
  return id
}

export async function listStrokeSamples(char?: string): Promise<StrokeSampleRecord[]> {
  const all = await dbGetAll<StrokeSampleRecord>('strokeSamples')
  const filtered = char ? all.filter((s) => s.char === char) : all
  return filtered.sort((a, b) => b.at - a.at)
}

export async function labelStrokeSample(id: number, label: 'correct' | 'incorrect' | null): Promise<void> {
  const rec = await dbGet<StrokeSampleRecord>('strokeSamples', id)
  if (!rec) return
  rec.humanLabel = label
  await dbPut('strokeSamples', rec)
}

// ---------------- Tests ----------------
export async function addTestResult(rec: Omit<TestResultRecord, 'id'>): Promise<number> {
  return (await dbAdd('testResults', rec)) as number
}

export function listTestResults(profileId: string): Promise<TestResultRecord[]> {
  return dbIndexAll<TestResultRecord>('testResults', 'byProfile', profileId)
}

export function getTestSession(profileId: string, testKey: string): Promise<TestSessionRecord | undefined> {
  return dbGet<TestSessionRecord>('testSessions', [profileId, testKey])
}

// ---------------- れんしゅうの途中保存 ----------------
export function getPracticeSession(profileId: string, stageId: string): Promise<PracticeSessionRecord | undefined> {
  return dbGet<PracticeSessionRecord>('practiceSessions', [profileId, stageId])
}

export async function savePracticeSession(rec: PracticeSessionRecord): Promise<void> {
  await dbPut('practiceSessions', rec)
}

export async function deletePracticeSession(profileId: string, stageId: string): Promise<void> {
  await dbDelete('practiceSessions', [profileId, stageId])
}

export async function saveTestSession(rec: TestSessionRecord): Promise<void> {
  await dbPut('testSessions', rec)
}

export async function deleteTestSession(profileId: string, testKey: string): Promise<void> {
  await dbDelete('testSessions', [profileId, testKey])
}

// ---------------- Characters ----------------
// 旧EXP制→スター制への移行（starsFed未定義のレコードを読み込み時に変換）
function migrateOwned(rec: OwnedCharacterRecord): boolean {
  if (rec.starsFed != null) return false
  const maxLevel = 6
  rec.level = Math.min(maxLevel, Math.max(1, (rec.stage ?? 0) * 2 + 1))
  rec.stage = Math.min(2, Math.floor((rec.level - 1) / 2))
  rec.starsFed = 0
  return true
}

export async function listOwned(profileId: string): Promise<OwnedCharacterRecord[]> {
  const all = await dbIndexAll<OwnedCharacterRecord>('ownedCharacters', 'byProfile', profileId)
  for (const rec of all) {
    if (migrateOwned(rec)) await dbPut('ownedCharacters', rec)
  }
  return all
}

export async function getOwned(id: number): Promise<OwnedCharacterRecord | undefined> {
  const rec = await dbGet<OwnedCharacterRecord>('ownedCharacters', id)
  if (rec && migrateOwned(rec)) await dbPut('ownedCharacters', rec)
  return rec
}

export async function addOwnedCharacter(rec: Omit<OwnedCharacterRecord, 'id'>): Promise<number> {
  return (await dbAdd('ownedCharacters', rec)) as number
}

export async function saveOwned(rec: OwnedCharacterRecord): Promise<void> {
  await dbPut('ownedCharacters', rec)
}

export async function discoverDex(profileId: string, speciesId: string, stage: number): Promise<boolean> {
  const existing = await dbGet<DexEntryRecord>('dexEntries', [profileId, speciesId, stage])
  if (existing) return false
  await dbPut('dexEntries', { profileId, speciesId, stage, discoveredAt: Date.now() } satisfies DexEntryRecord)
  return true
}

export function listDex(profileId: string): Promise<DexEntryRecord[]> {
  return dbIndexAll<DexEntryRecord>('dexEntries', 'byProfile', profileId)
}

export async function addGachaHistory(rec: Omit<GachaHistoryRecord, 'id'>): Promise<void> {
  await dbAdd('gachaHistory', rec)
}

// ---------------- Activity feed（みんな画面。仕様 §30） ----------------
export async function addActivity(
  profileId: string,
  profileName: string,
  type: ActivityRecord['type'],
  message: string
): Promise<void> {
  await dbAdd('activityFeed', { profileId, profileName, type, message, at: Date.now() } satisfies Omit<ActivityRecord, 'id'>)
  const all = await dbGetAll<ActivityRecord>('activityFeed')
  if (all.length > 120) {
    const oldest = all.sort((a, b) => a.at - b.at).slice(0, all.length - 120)
    for (const item of oldest) {
      if (item.id != null) await dbDelete('activityFeed', item.id)
    }
  }
}

export async function listActivity(limit = 50): Promise<ActivityRecord[]> {
  const all = await dbGetAll<ActivityRecord>('activityFeed')
  return all.sort((a, b) => b.at - a.at).slice(0, limit)
}

// ---------------- べんきょうカレンダー（第45回） ----------------
/**
 * 「きょう べんきょうした」を記録する。れんしゅう・テスト・ふくしゅうのどれでも1つやれば付く。
 * 呼び出し側が結果を待つ必要はない（画面の進行を止めないよう void で呼んでよい）。
 */
export const PENDING_BONUS_KEY = (profileId: string) => `pendingStreakBonus:${profileId}`

/**
 * markStudied は解答のたびに投げっぱなし（void）で呼ばれるので、同時に走ると
 * 「その日はじめて」の判定が二重に通ってボーナスが2回出うる。
 * IndexedDBのget→putは不可分ではないため、ここで直列化しておく。
 */
let studyChain: Promise<unknown> = Promise.resolve()

export async function markStudied(profileId: string, at: number = Date.now()): Promise<void> {
  const run = studyChain.then(() => markStudiedInner(profileId, at))
  studyChain = run.catch(() => undefined)
  await run
}

async function markStudiedInner(profileId: string, at: number): Promise<void> {
  const ymd = ymdOf(at)
  const existing = await dbGet<StudyDayRecord>('studyDays', [profileId, ymd])
  if (existing) {
    existing.count++
    existing.lastAt = Math.max(existing.lastAt, at)
    existing.firstAt = Math.min(existing.firstAt, at)
    await dbPut('studyDays', existing)
    return
  }
  await dbPut('studyDays', { profileId, ymd, count: 1, firstAt: at, lastAt: at } satisfies StudyDayRecord)

  // その日はじめてスタンプが付いたときだけ、れんぞくボーナスを判定する（第52回）。
  // 1日1レコードなので、この分岐に入る回数＝1日1回。二重付与にならない。
  const days = await listStudyDays(profileId)
  const { streak } = studySummary(days, monthKeyOf(at))
  const earned: StreakBonus[] = []

  // 毎日ぶん（第59回）。れんぞくが のびるほど 1日ぶんが 増える
  const daily = dailyStreakCoins(streak)
  if (daily > 0) {
    earned.push({ streak, coins: daily, label: streak === 1 ? 'きょうの ぶん' : `${streak}日め れんぞく` })
  }
  // 節目ぶん（上のせ）
  const milestone = bonusForStreak(streak)
  if (milestone) earned.push(milestone)
  if (earned.length === 0) return

  // コインは「ホームでうけとる！を押した瞬間」に足す（第62回）。
  // 先に足してしまうと、受け取り画面で数字が動かず、本当に入ったのか分からない
  if (milestone) {
    const profile = await getProfile(profileId)
    if (profile) {
      await addActivity(profileId, profile.name, 'milestone', `${profile.name}が ${milestone.label}を たっせい！`)
    }
  }
  // 受け取り演出はホームで出す（練習中に割り込むと集中が切れるため、持ち越して見せる）
  const pending = (await getSetting<StreakBonus[]>(PENDING_BONUS_KEY(profileId))) ?? []
  await putSetting(PENDING_BONUS_KEY(profileId), [...pending, ...earned])
}

/** ホームで受け取り演出を出したあと消す */
export async function takePendingStreakBonus(profileId: string): Promise<StreakBonus[]> {
  const pending = (await getSetting<StreakBonus[]>(PENDING_BONUS_KEY(profileId))) ?? []
  if (pending.length > 0) await putSetting(PENDING_BONUS_KEY(profileId), [])
  return pending
}

export function listStudyDays(profileId: string): Promise<StudyDayRecord[]> {
  return dbIndexAll<StudyDayRecord>('studyDays', 'byProfile', profileId)
}

/**
 * カレンダー導入前の記録から、べんきょうした日を1度だけ復元する。
 * これをしないと導入時にカレンダーが真っ白になり、それまでの積み上げが無かったことになる。
 * 元にするのは テスト実施日 / 漢字をれんしゅう・習得した日 / ふくしゅう完了日。
 */
export async function backfillStudyDays(profileId: string): Promise<void> {
  const flagKey = `studyDaysBackfilled:${profileId}`
  if (await getSetting<boolean>(flagKey)) return
  const [tests, progress, unknown] = await Promise.all([
    listTestResults(profileId),
    listProgress(profileId),
    listUnknown(profileId),
  ])
  const stamps = new Map<string, number>()
  const add = (at: number | null | undefined) => {
    if (!at) return
    const ymd = ymdOf(at)
    const prev = stamps.get(ymd)
    if (prev == null || at < prev) stamps.set(ymd, at)
  }
  for (const t of tests) add(t.at)
  for (const p of progress) {
    add(p.practicedAt)
    add(p.masteredAt)
    add(p.lastSeenAt)
  }
  for (const u of unknown) add(u.lastReviewedAt)
  for (const [ymd, at] of stamps) {
    const existing = await dbGet<StudyDayRecord>('studyDays', [profileId, ymd])
    if (existing) continue
    await dbPut('studyDays', { profileId, ymd, count: 1, firstAt: at, lastAt: at } satisfies StudyDayRecord)
  }
  await putSetting(flagKey, true)
}

/** きょうスタンプが付いているか（画面の出しわけ用） */
export async function hasStudiedToday(profileId: string): Promise<boolean> {
  return (await dbGet<StudyDayRecord>('studyDays', [profileId, todayYmd()])) != null
}

// ---------------- はじめてのチュートリアル（第55回） ----------------
const TUTORIAL_KEY = (profileId: string) => `tutorialDone:${profileId}`

export async function isTutorialDone(profileId: string): Promise<boolean> {
  return (await getSetting<boolean>(TUTORIAL_KEY(profileId))) === true
}

export async function markTutorialDone(profileId: string): Promise<void> {
  await putSetting(TUTORIAL_KEY(profileId), true)
}

// ---------------- Settings ----------------
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const rec = await dbGet<SettingsRecord>('settings', key)
  return rec?.value as T | undefined
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  await dbPut('settings', { key, value } satisfies SettingsRecord)
}

// ---------------- 全消去（バックアップ読み込み用） ----------------
export async function clearAllStores(): Promise<void> {
  const stores = [
    'profiles',
    'kanjiProgress',
    'strokeSamples',
    'testResults',
    'testSessions',
    'unknownKanji',
    'coinHistory',
    'ownedCharacters',
    'dexEntries',
    'gachaHistory',
    'activityFeed',
    'studyDays',
    'settings',
  ] as const
  for (const s of stores) await dbClear(s)
}
