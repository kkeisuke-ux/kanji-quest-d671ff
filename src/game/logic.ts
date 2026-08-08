// ゲームロジック（2026-08-08 第4回フィードバックで全面刷新）。
// - 育成はシンプルに「スターをあげる」だけ。レベル=姿（上がるたびに見た目が変わる）
// - 学習はコインだけを生む。コイン→スター→レベルアップの循環
// - ガチャの重複は「おみやげスター」に変換
import { GAME_CONFIG } from '../config/gameConfig'
import {
  MAX_LEVEL,
  SPECIES,
  getSpecies,
  nameForLevel,
  speciesByRarity,
  stageForLevel,
  starsNeededFor,
  type Rarity,
} from '../data/species'
import type { OwnedCharacterRecord, Profile } from '../storage/models'
import {
  addActivity,
  addCoins,
  addGachaHistory,
  addOwnedCharacter,
  discoverDex,
  getOwned,
  getProfile,
  listOwned,
  saveOwned,
  saveProfile,
} from '../storage/repo'

export { MAX_LEVEL, stageForLevel, starsNeededFor }

/** 旧EXP制データをスター制へ移行する（読み込み時に一度だけ） */
export function normalizeOwned(rec: OwnedCharacterRecord): boolean {
  if (rec.starsFed != null) return false
  rec.level = Math.min(MAX_LEVEL, Math.max(1, (rec.stage ?? 0) * 2 + 1))
  rec.stage = stageForLevel(rec.level)
  rec.starsFed = 0
  return true
}

/** 学習の報酬（コインのみ） */
export async function awardCoinsFor(profileId: string, coins: number, reason: string): Promise<Profile> {
  return addCoins(profileId, coins, reason)
}

export interface FeedStarResult {
  ok: true
  leveledUp: boolean
  fromLevel: number
  newLevel: number
  starsFed: number
  /** 次のレベルまでに必要な残りスター（最大レベルならnull） */
  starsNeeded: number | null
  isMax: boolean
}

export type FeedStarOutcome = FeedStarResult | { ok: false; reason: 'noStars' | 'max' | 'notFound' }

/** スターを1個あげる。必要数に達したらレベルアップ（=姿が変わる） */
export async function feedStar(profileId: string, ownedId: number): Promise<FeedStarOutcome> {
  const profile = await getProfile(profileId)
  const owned = await getOwned(ownedId)
  if (!profile || !owned) return { ok: false, reason: 'notFound' }
  if (profile.stars <= 0) return { ok: false, reason: 'noStars' }
  if (owned.level >= MAX_LEVEL) return { ok: false, reason: 'max' }

  profile.stars--
  await saveProfile(profile)

  const fromLevel = owned.level
  owned.starsFed = (owned.starsFed ?? 0) + 1
  const need = starsNeededFor(owned.level) ?? Infinity
  let leveledUp = false
  if (owned.starsFed >= need) {
    owned.starsFed = 0
    owned.level = Math.min(MAX_LEVEL, owned.level + 1)
    leveledUp = true
    const newStage = stageForLevel(owned.level)
    if (newStage !== owned.stage) {
      owned.stage = newStage
      await discoverDex(profileId, owned.speciesId, newStage)
    }
    await addActivity(
      profileId,
      profile.name,
      'evolve',
      `${profile.name}の ${nameForLevel(owned.speciesId, owned.level)}が レベル${owned.level}に あがった！`
    )
  }
  await saveOwned(owned)
  return {
    ok: true,
    leveledUp,
    fromLevel,
    newLevel: owned.level,
    starsFed: owned.starsFed,
    starsNeeded: starsNeededFor(owned.level),
    isMax: owned.level >= MAX_LEVEL,
  }
}

export async function buyStars(profileId: string, count = 1): Promise<{ ok: boolean; bought?: number; profile?: Profile }> {
  const profile = await getProfile(profileId)
  if (!profile) return { ok: false }
  const cost = GAME_CONFIG.star.cost * count
  if (profile.coins < cost) return { ok: false }
  const updated = await addCoins(profileId, -cost, count === 1 ? 'スターをかった' : `スターを${count}こかった`)
  updated.stars += count
  await saveProfile(updated)
  return { ok: true, bought: count, profile: updated }
}

/**
 * コインの1/5デノミ移行（2026-08-08 第5回リバランス）。
 * レートを5分の1にしたため、既存残高も1/5に変換して実質価値を保つ。一度だけ実行。
 */
export async function migrateCoinDenomination(): Promise<void> {
  const { getSetting, putSetting, listProfiles } = await import('../storage/repo')
  const done = await getSetting<boolean>('coinRebalance1')
  if (done) return
  for (const p of await listProfiles()) {
    p.coins = Math.max(0, Math.round(p.coins / 5))
    await saveProfile(p)
  }
  await putSetting('coinRebalance1', true)
}

function pickRarity(): Rarity {
  const rates = GAME_CONFIG.gacha.rarityRates
  const roll = Math.random()
  let acc = 0
  for (const r of ['common', 'rare', 'epic'] as Rarity[]) {
    acc += rates[r] ?? 0
    if (roll < acc) return r
  }
  return 'common'
}

export type GachaOutcome =
  | { outcome: 'noCoins' }
  | { outcome: 'miss'; profile: Profile }
  | { outcome: 'new'; profile: Profile; speciesId: string; name: string; becameBuddy: boolean }
  | { outcome: 'dup'; profile: Profile; speciesId: string; stage: number; name: string; starGift: number }

/** なかまガチャ。重複はおみやげスターに変換 */
export async function rollGacha(profileId: string): Promise<GachaOutcome> {
  const cfg = GAME_CONFIG.gacha
  let profile = await getProfile(profileId)
  if (!profile) throw new Error('profile not found')
  if (profile.coins < cfg.gachaCost) return { outcome: 'noCoins' }

  profile = await addCoins(profileId, -cfg.gachaCost, 'なかまガチャ')
  const guaranteed =
    (cfg.firstGachaGuaranteed && profile.gachaCount === 0) ||
    (cfg.pityStreak > 0 && profile.gachaMissStreak >= cfg.pityStreak)
  const encountered = guaranteed || Math.random() < cfg.encounterRate
  profile.gachaCount++

  if (!encountered) {
    profile.gachaMissStreak++
    await saveProfile(profile)
    await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: null, duplicated: false, at: Date.now() })
    return { outcome: 'miss', profile }
  }

  profile.gachaMissStreak = 0
  const pool = speciesByRarity(pickRarity())
  const sp = pool[Math.floor(Math.random() * pool.length)] ?? SPECIES[0]
  const owned = await listOwned(profileId)
  const existing = owned.find((o) => o.speciesId === sp.id)

  if (existing) {
    profile.stars += cfg.duplicateStarGift
    await saveProfile(profile)
    await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: sp.id, duplicated: true, at: Date.now() })
    return {
      outcome: 'dup',
      profile,
      speciesId: sp.id,
      stage: existing.stage,
      name: nameForLevel(sp.id, existing.level),
      starGift: cfg.duplicateStarGift,
    }
  }

  const rec: Omit<OwnedCharacterRecord, 'id'> = {
    profileId,
    speciesId: sp.id,
    stage: 0,
    level: 1,
    starsFed: 0,
    exp: 0,
    friendExp: 0,
    obtainedAt: Date.now(),
  }
  const id = await addOwnedCharacter(rec)
  let becameBuddy = false
  if (profile.buddyId == null) {
    profile.buddyId = id
    becameBuddy = true
  }
  await saveProfile(profile)
  await discoverDex(profileId, sp.id, 0)
  await addActivity(profileId, profile.name, 'gacha', `${profile.name}に あたらしい なかま「${sp.stages[0].name}」が ふえました`)
  await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: sp.id, duplicated: false, at: Date.now() })
  return { outcome: 'new', profile, speciesId: sp.id, name: sp.stages[0].name, becameBuddy }
}

/** マスター字数のマイルストーン通知（みんな画面用。順位付けはしない） */
export async function checkMilestones(profile: Profile, before: number, after: number): Promise<void> {
  for (const m of GAME_CONFIG.milestones) {
    if (before < m && after >= m) {
      await addActivity(profile.id, profile.name, 'milestone', `${profile.name}が 漢字を${m}字 マスターしました`)
    }
  }
}
