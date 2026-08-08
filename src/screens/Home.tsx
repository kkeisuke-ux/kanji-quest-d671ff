// ホーム画面（仕様 §36）: 今日の学習・今日の復習・仲間・コイン・進捗。
import { getCurriculumForGrade, type StageDef } from '../data/curriculum'
import { getSpecies } from '../data/species'
import { evolutionInfo } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { dueReviewChars, getProfile, listOwned, listProgress, listTestResults, listUnknown } from '../storage/repo'
import { Button, Card, CoinBadge, ExpBar, LoadingView, StarBadge } from '../ui/components'
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
    let nextStage: StageDef | null = null
    outer: for (const term of cur.terms) {
      for (const st of term.stages) {
        if (st.kanji.some((k) => !practicedSet.has(k))) {
          nextStage = st
          break outer
        }
      }
    }
    const totalPlayable = cur.terms.flatMap((t) => t.stages).flatMap((s) => s.kanji).length
    const allStages = cur.terms.flatMap((t) => t.stages)
    const clearedStages = allStages.filter((s) =>
      results.some((r) => r.kind === 'stage' && r.targetId === s.id && r.total > 0 && r.correct === r.total)
    ).length
    return { profile, due, unknown, mastered, buddy, nextStage, fallback, totalPlayable, clearedStages, totalStages: allStages.length }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, due, unknown, mastered, buddy, nextStage, fallback, totalPlayable, clearedStages, totalStages } = data
  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null
  const tease = buddy ? evolutionInfo(buddy).tease : false

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
          <SoundButton />
          <CoinBadge coins={profile.coins} />
          <StarBadge stars={profile.stars} />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate({ name: 'settings' })}>
            せってい
          </button>
        </div>
      </header>

      <div className="home-main">
        <div className="home-left">
          <Card className="tile tile-study" onClick={() => (nextStage ? navigate({ name: 'learn', stageId: nextStage.id }) : navigate({ name: 'stages' }))}>
            <h2>きょうの がくしゅう</h2>
            {nextStage ? (
              <>
                <p className="tile-big">{nextStage.label}</p>
                <p className="tile-kanji">{nextStage.kanji.join('　')}</p>
                <Button size="lg">はじめる！</Button>
              </>
            ) : (
              <>
                <p className="tile-big">ぜんぶ れんしゅうずみ！</p>
                <p>テストや ふくしゅうに ちょうせんしよう</p>
                <Button size="lg">マップを みる</Button>
              </>
            )}
          </Card>
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
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'stages' })}>
              れんしゅうマップ
            </Card>
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
              マスターした漢字　{mastered} / {totalPlayable}字　　★100てんクリア　{clearedStages} / {totalStages}ステージ
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
                <CharacterSprite speciesId={buddy.speciesId} stage={buddy.stage} size={140} />
                <p className="buddy-name">{buddySpecies.stages[buddy.stage].name}</p>
                <p className="buddy-level">Lv.{buddy.level}</p>
                <ExpBar level={buddy.level} exp={buddy.exp} />
                {tease && <p className="buddy-tease">もうすぐ なにかが おこりそう……</p>}
                <p className="tile-sub">いっしょに べんきょうちゅう</p>
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
