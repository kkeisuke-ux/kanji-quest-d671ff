// ホーム画面（仕様 §36）: 今日の学習・今日の復習・仲間・コイン・進捗。
import { getCurriculumForGrade, termTestTitle, type StageDef } from '../data/curriculum'
import { MAX_LEVEL, getSpecies, nameForLevel, starsNeededFor } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { dueReviewChars, getProfile, listOwned, listProgress, listTestResults, listUnknown } from '../storage/repo'
import { Button, Card, LoadingView, StarMeter, StatusChips } from '../ui/components'
import { SoundButton } from '../ui/SoundButton'

export function Home() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [due, unknown, progressList, owned, results] = await Promise.all([
      dueReviewChars(profileId),
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
    // おすすめ: ①練習が終わっていないステージ → ②100点がまだの5問テスト → ③100点がまだのまとめテスト
    let nextPractice: StageDef | null = null
    let nextStageTest: StageDef | null = null
    let nextTerm: { id: string; title: string } | null = null
    for (const term of cur.terms) {
      for (const st of term.stages) {
        const allPracticed = st.kanji.every((k) => practicedSet.has(k))
        if (!allPracticed && !nextPractice) nextPractice = st
        if (allPracticed && !stagePerfectSet.has(st.id) && !nextStageTest) nextStageTest = st
      }
      if (term.stages.length > 0 && !termPerfectSet.has(term.id) && !nextTerm) {
        nextTerm = { id: term.id, title: termTestTitle(cur, term.index) }
      }
    }
    const totalPlayable = cur.terms.flatMap((t) => t.stages).flatMap((s) => s.kanji).length
    const allStages = cur.terms.flatMap((t) => t.stages)
    const clearedStages = allStages.filter((s) => stagePerfectSet.has(s.id)).length
    return {
      profile,
      due,
      unknown,
      mastered,
      buddy,
      fallback,
      totalPlayable,
      clearedStages,
      totalStages: allStages.length,
      nextPractice,
      nextStageTest,
      nextTerm,
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, due, unknown, mastered, buddy, fallback, totalPlayable, clearedStages, totalStages, nextPractice, nextStageTest, nextTerm } = data
  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null

  const recommend = nextPractice
    ? { text: `${nextPractice.label}「${nextPractice.kanji.join('')}」の れんしゅうを すすめよう`, route: { name: 'learn', stageId: nextPractice.id } as const }
    : nextStageTest
      ? { text: `${nextStageTest.label}の ５もんテストで 100てんを めざそう！`, route: { name: 'stageTest', stageId: nextStageTest.id } as const }
      : nextTerm
        ? { text: `${nextTerm.title}で 100てんに ちょうせん！`, route: { name: 'termTest', termId: nextTerm.id } as const }
        : { text: 'ぜんぶ 100てん！ すごい！ ふくしゅうで キープしよう', route: { name: 'review', mode: 'due' } as const }

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
            <Card className="tile" onClick={() => due.length > 0 && navigate({ name: 'review', mode: 'due' })}>
              <h3>きょうの ふくしゅう</h3>
              <p className="tile-num">{due.length}字</p>
              {due.length === 0 && <p className="tile-sub">いまは なし！</p>}
            </Card>
            <Card className="tile" onClick={() => navigate({ name: 'unknownList' })}>
              <h3>わからなかった漢字</h3>
              <p className="tile-num">{unknown.length}字</p>
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
