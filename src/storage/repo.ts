// データアクセス層。画面からはこのモジュール経由で読み書きする。
import { GAME_CONFIG } from '../config/gameConfig'
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
  Profile,
  SettingsRecord,
  StrokeSampleRecord,
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
    'unknownKanji',
    'coinHistory',
    'ownedCharacters',
    'dexEntries',
    'gachaHistory',
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

// ---------------- Unknown list（わからなかった漢字。仕様 §15） ----------------
export async function addUnknown(profileId: string, char: string, reason: 'unknown' | 'wrong'): Promise<void> {
  const existing = await dbGet<UnknownKanjiRecord>('unknownKanji', [profileId, char])
  const now = Date.now()
  if (existing) {
    existing.lastFailedAt = now
    existing.reason = reason
    await dbPut('unknownKanji', existing)
  } else {
    await dbPut('unknownKanji', { profileId, char, addedAt: now, reason, lastFailedAt: now } satisfies UnknownKanjiRecord)
  }
}

export async function clearUnknown(profileId: string, char: string): Promise<boolean> {
  const existing = await dbGet<UnknownKanjiRecord>('unknownKanji', [profileId, char])
  if (!existing) return false
  await dbDelete('unknownKanji', [profileId, char])
  return true
}

export function listUnknown(profileId: string): Promise<UnknownKanjiRecord[]> {
  return dbIndexAll<UnknownKanjiRecord>('unknownKanji', 'byProfile', profileId)
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

export async function saveTestSession(rec: TestSessionRecord): Promise<void> {
  await dbPut('testSessions', rec)
}

export async function deleteTestSession(profileId: string, testKey: string): Promise<void> {
  await dbDelete('testSessions', [profileId, testKey])
}

// ---------------- Characters ----------------
export function listOwned(profileId: string): Promise<OwnedCharacterRecord[]> {
  return dbIndexAll<OwnedCharacterRecord>('ownedCharacters', 'byProfile', profileId)
}

export function getOwned(id: number): Promise<OwnedCharacterRecord | undefined> {
  return dbGet<OwnedCharacterRecord>('ownedCharacters', id)
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
    'settings',
  ] as const
  for (const s of stores) await dbClear(s)
}
