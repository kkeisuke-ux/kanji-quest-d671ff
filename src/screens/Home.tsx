// ホーム画面（仕様 §36）: 今日の学習・今日の復習・仲間・コイン・進捗。
import { getCurriculumForGrade, gradeLabelOf, termTestTitle, type StageDef } from '../data/curriculum'
import { MAX_LEVEL, getSpecies, nameForLevel, stageForLevel, starsNeededFor } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, listOwned, listProgress, listTestResults, listUnknown } from '../storage/repo'
import { Button, Card, LoadingView, StarMeter, StatusChips } from '../ui/components'
import { SoundButton } from '../ui/SoundButton'

export function Home() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [unknown, progressList, owned, results] = await Promise.all([
      listUnknown(profileId),
      listProgress(profileId),
      listOwned(profileId),
      listTestResults(profileId),
    ])
    const buddy = profile.buddyId != null ? (owned.find((o) => o.id === profile.buddyId) ?? null) : null
    const mastered = progressList.filter((p) => p.masteredAt != null).length
    const { cur, fallback } = getCurriculumForGrade(profile.grade)
    const practicedSet = new Set(progressList.filter((p) => p.practicedAt != null).map((p) => p.char))
    const stagePerfectSet = new Set(
      results.filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
    )
    const termPerfectSet = new Set(
      results.filter((r) => r.kind === 'term' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
    )
    // おすすめ: 「100点を1回も取っていない いちばん低いステージ」を出す（2026-08-08修正）。
    // そのステージが練習未完了なら練習へ、練習済みなら５もんテストへ。
    let targetStage: { stage: StageDef; practiced: boolean } | null = null
    let nextTerm: { id: string; title: string } | null = null
    outer: for (const term of cur.terms) {
      for (const st of term.stages) {
        if (!stagePerfectSet.has(st.id)) {
          targetStage = { stage: st, practiced: st.kanji.every((k) => practicedSet.has(k)) }
          break outer
        }
      }
    }
    for (const term of cur.terms) {
      if (term.stages.length > 0 && !termPerfectSet.has(term.id)) {
        nextTerm = { id: term.id, title: termTestTitle(cur, term.index) }
        break
      }
    }
    const gradeName = cur.grade <= 6 ? `${cur.grade}年生` : gradeLabelOf(cur.grade)
    const totalPlayable = cur.terms.flatMap((t) => t.stages).flatMap((s) => s.kanji).length
    const allStages = cur.terms.flatMap((t) => t.stages)
    const clearedStages = allStages.filter((s) => stagePerfectSet.has(s.id)).length
    return {
      profile,
      unknown,
      mastered,
      buddy,
      fallback,
      totalPlayable,
      clearedStages,
      totalStages: allStages.length,
      targetStage,
      nextTerm,
      gradeName,
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, unknown, mastered, buddy, fallback, totalPlayable, clearedStages, totalStages, targetStage, nextTerm, gradeName } = data
  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null

  const recommend = targetStage
    ? targetStage.practiced
      ? {
          text: `${gradeName}　${targetStage.stage.label}の ５もんテストで 100点を めざそう！`,
          route: { name: 'stageTest', stageId: targetStage.stage.id } as const,
        }
      : {
          text: `${gradeName}　${targetStage.stage.label}「${targetStage.stage.kanji.join('')}」の れんしゅうを すすめよう`,
          route: { name: 'learn', stageId: targetStage.stage.id } as const,
        }
    : nextTerm
      ? { text: `${nextTerm.title}で 100点に ちょうせん！`, route: { name: 'termTest', termId: nextTerm.id } as const }
      : { text: 'ぜんぶ 100点！ すごい！ また ちょうせんして きろくを のばそう', route: { name: 'tests' } as const }

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
          <Card className="tile tile-study" onClick={() => navigate(recommend.route)}>
            <h2>きょうの がくしゅう</h2>
            <p className="tile-big">{recommend.text}</p>
          </Card>
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
          <div className="progress-line">
            <span>
              マスターした漢字　{mastered} / {totalPlayable}字　　100点クリア　{clearedStages} / {totalStages}ステージ
            </span>
            <div className="masterbar">
              <div className="masterbar-fill" style={{ width: `${totalPlayable > 0 ? (mastered / totalPlayable) * 100 : 0}%` }} />
            </div>
            {fallback && <p className="tile-sub">いまは 小1の漢字で れんしゅうできるよ（ほかの学年は じゅんびちゅう）</p>}
          </div>
        </div>

        <div className="home-right">
          <Card className="buddy-card" onClick={() => navigate({ name: 'friends' })}>
            {buddy && buddySpecies ? (
              <>
                <CharacterSprite speciesId={buddy.speciesId} level={buddy.level} size={140} />
                <p className="buddy-name">{nameForLevel(buddy.speciesId, buddy.level)}</p>
                <p className="buddy-level">
                  レベル {buddy.level}
                  {buddy.level >= MAX_LEVEL ? '（MAX）' : ` / ${MAX_LEVEL}`}
                </p>
                <p className="buddy-desc">{buddySpecies.stages[stageForLevel(buddy.level)].desc}</p>
                <StarMeter fed={buddy.starsFed ?? 0} need={starsNeededFor(buddy.level)} />
                <p className="tile-sub">スターを あげて そだてよう</p>
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
    </div>
  )
}
