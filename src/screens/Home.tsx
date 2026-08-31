// ホーム画面（仕様 §36）: 学習入口・復習・仲間・コイン・進捗・称号。
import { useEffect, useState } from 'react'
import { CURRICULUM, TERM_TEST_TOTAL, getCurriculumForGrade, perfectTermTestIds } from '../data/curriculum'
import { MAX_LEVEL, getSpecies, nameForLevel, stageForLevel, starsNeededFor } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import {
  backfillStudyDays,
  getProfile,
  listOwned,
  listProgress,
  listStudyDays,
  listTestResults,
  listUnknown,
  takePendingStreakBonus,
} from '../storage/repo'
import { rankForCount } from '../game/ranks'
import type { StreakBonus } from '../game/streak'
import { Button, Card, LoadingView, StarMeter, StatusChips } from '../ui/components'
import { StreakBonusModal } from '../ui/StreakBonusModal'
import { RankBadge, RankListModal } from '../ui/RankBadge'
import { SoundButton } from '../ui/SoundButton'
import { StudyCalendar } from '../ui/StudyCalendar'

export function Home() {
  const profileId = useAppState((s) => s.profileId)
  const [showRanks, setShowRanks] = useState(false)
  // れんぞくボーナスは練習中に割り込まず、ホームに戻ってきたときに受け取り演出を出す（第52回）
  const [bonuses, setBonuses] = useState<StreakBonus[]>([])
  useEffect(() => {
    if (!profileId) return
    void takePendingStreakBonus(profileId).then((list) => {
      if (list.length > 0) setBonuses(list)
    })
  }, [profileId])
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    // カレンダー導入前の記録から べんきょうした日を1度だけ復元する（第45回）
    await backfillStudyDays(profileId)
    const [unknown, progressList, owned, results, studyDays] = await Promise.all([
      listUnknown(profileId),
      listProgress(profileId),
      listOwned(profileId),
      listTestResults(profileId),
      listStudyDays(profileId),
    ])
    const buddy = profile.buddyId != null ? (owned.find((o) => o.id === profile.buddyId) ?? null) : null
    const mastered = progressList.filter((p) => p.masteredAt != null).length
    const { fallback } = getCurriculumForGrade(profile.grade)
    const stagePerfectSet = new Set(
      results.filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
    )
    const termPerfectSet = perfectTermTestIds(results)
    // マスター字数・100点クリアは自分の学年だけでなく全学年（小1〜中3＋マスター級）の合計（第34回）。
    // マスター級の「そうまとめ」学期はステージを再掲しているため、IDと字でユニーク化して数える
    const allStages = [
      ...new Map(CURRICULUM.flatMap((c) => c.terms.flatMap((t) => t.stages)).map((s) => [s.id, s])).values(),
    ]
    const totalPlayable = new Set(allStages.flatMap((s) => s.kanji)).size
    const clearedStages = allStages.filter((s) => stagePerfectSet.has(s.id)).length
    const termTotal = TERM_TEST_TOTAL
    return {
      profile,
      studyDays,
      unknown,
      mastered,
      buddy,
      fallback,
      totalPlayable,
      clearedStages,
      totalStages: allStages.length,
      termTotal,
      // 称号ランク: 100点をとったまとめテストの本数（第36回。第43回で20問テスト基準に）
      termPerfectCount: termPerfectSet.size,
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, studyDays, unknown, mastered, buddy, fallback, totalPlayable, clearedStages, totalStages, termTotal, termPerfectCount } = data
  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <button className="home-profile" onClick={() => navigate({ name: 'profiles' })}>
          <span className="avatar avatar-sm" style={{ background: profile.color }}>
            {profile.name.slice(0, 1)}
          </span>
          <span>{profile.name}</span>
        </button>
        <div className="home-badges">
          <StatusChips />
          <SoundButton />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate({ name: 'settings' })}>
            せってい
          </button>
        </div>
      </header>

      <div className="home-main">
        <div className="home-left">
          <div className="home-actions">
            <button className="action-btn action-practice" onClick={() => navigate({ name: 'stages' })}>
              <span className="action-icon">✏️</span>
              <span className="action-label">れんしゅうする</span>
              <span className="action-sub">かきじゅん・かきとり・５もんテスト</span>
            </button>
            <button className="action-btn action-test" onClick={() => navigate({ name: 'tests' })}>
              <span className="action-icon">💮</span>
              <span className="action-label">テストする</span>
              <span className="action-sub">まとめテストで 100てんを めざそう</span>
            </button>
          </div>
          {/* べんきょうカレンダー（第45回）: 学習の入口のすぐ下に置いて「きょうも やろう」を促す */}
          <StudyCalendar records={studyDays} />
          <div className="tile-row">
            <Card className="tile" onClick={() => navigate({ name: 'unknownList' })}>
              <h3>わからなかった漢字の ふくしゅう</h3>
              <p className="tile-num">{unknown.length}字</p>
              {unknown.length === 0 && <p className="tile-sub">いまは なし！</p>}
            </Card>
          </div>
          <div className="tile-row">
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'gacha' })}>
              なかまガチャ
            </Card>
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'dex' })}>
              なかまずかん
            </Card>
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'minna' })}>
              みんな
            </Card>
          </div>
          {/* 3つの実績を大きく表示（第37回。全学年の合計） */}
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-label">📖 マスターした漢字</span>
              <span className="stat-num">
                {mastered}
                <small> / {totalPlayable}字</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${totalPlayable > 0 ? (mastered / totalPlayable) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">✏️ ５もんテスト 100点</span>
              <span className="stat-num">
                {clearedStages}
                <small> / {totalStages}ステージ</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${totalStages > 0 ? (clearedStages / totalStages) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">💮 まとめテスト 100点</span>
              <span className="stat-num">
                {termPerfectCount}
                <small> / {termTotal}テスト</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${termTotal > 0 ? (termPerfectCount / termTotal) * 100 : 0}%` }} />
              </div>
            </div>
            {/* 4枠目: 称号（タップで全30種の一覧。第38回） */}
            <button className="stat-card stat-card-btn" onClick={() => setShowRanks(true)}>
              <span className="stat-label">🏅 しょうごう</span>
              {(() => {
                const rank = rankForCount(termPerfectCount)
                return rank ? (
                  <span className="stat-rank">
                    <RankBadge rank={rank} size={38} />
                    <span className="stat-rank-label">{rank.label}</span>
                  </span>
                ) : (
                  <span className="stat-rank">
                    <span className="stat-rank-none">まだ なし</span>
                  </span>
                )
              })()}
              <span className="stat-rank-hint">タップで いちらん</span>
            </button>
          </div>
          {fallback && <p className="tile-sub">いまは 小1の漢字で れんしゅうできるよ（ほかの学年は じゅんびちゅう）</p>}
        </div>

        <div className="home-right">
          <Card className="buddy-card" onClick={() => navigate({ name: 'friends' })}>
            {buddy && buddySpecies ? (
              <>
                <div className="buddy-sprite-box">
                  <CharacterSprite speciesId={buddy.speciesId} level={buddy.level} size={140} />
                </div>
                <div className="buddy-info">
                  <p className="buddy-name">{nameForLevel(buddy.speciesId, buddy.level)}</p>
                  <p className="buddy-level">
                    レベル {buddy.level}
                    {buddy.level >= MAX_LEVEL ? '（MAX）' : ''}
                  </p>
                  <p className="buddy-desc">{buddySpecies.stages[stageForLevel(buddy.level)].desc}</p>
                  <StarMeter fed={buddy.starsFed ?? 0} need={starsNeededFor(buddy.level)} />
                  <p className="tile-sub">スターを あげて そだてよう</p>
                </div>
              </>
            ) : (
              <>
                <div className="buddy-empty">？</div>
                <p>まだ なかまが いないよ</p>
                <Button
                  onClick={() => navigate({ name: 'gacha' })}
                >
                  ガチャで なかまを むかえよう
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
      <RankListModal open={showRanks} perfectCount={termPerfectCount} onClose={() => setShowRanks(false)} />
      <StreakBonusModal profileId={profileId} bonuses={bonuses} onClose={() => setBonuses([])} />
    </div>
  )
}
