// まとめテスト専用ページ（2026-08-08 第2回フィードバックで新設）。
// 「100点満点をとるまでやりたくなる」ことを重視:
// - 100点回数（王冠）・最高記録・「100点まであと○問」を表示
// - 100点でスペシャルボーナスコイン
import { GAME_CONFIG } from '../config/gameConfig'
import { getCurriculumForGrade, termKanji, termTestTitle } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, getTestSession, listProgress, listTestResults } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'
import { SoundButton } from '../ui/SoundButton'

interface TermEntry {
  termId: string
  title: string
  practicedCount: number
  totalCount: number
  perfectCount: number
  best: { correct: number; total: number } | null
  hasSession: boolean
}

export function TestsHub() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const { cur, fallback } = getCurriculumForGrade(profile.grade)
    const [progress, results] = await Promise.all([listProgress(profileId), listTestResults(profileId)])
    const practiced = new Set(progress.filter((p) => p.practicedAt != null).map((p) => p.char))
    const entries: TermEntry[] = []
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      const all = termKanji(term).filter((c) => hasRefKanji(c) && hasQuestions(c))
      const termResults = results.filter((r) => r.kind === 'term' && r.targetId === term.id)
      let best: TermEntry['best'] = null
      let perfectCount = 0
      for (const r of termResults) {
        if (!best || r.correct > best.correct) best = { correct: r.correct, total: r.total }
        if (r.total > 0 && r.correct === r.total) perfectCount++
      }
      const session = await getTestSession(profileId, `term:${term.id}`)
      entries.push({
        termId: term.id,
        title: termTestTitle(cur, term.index),
        practicedCount: all.filter((c) => practiced.has(c)).length,
        totalCount: all.length,
        perfectCount,
        best,
        hasSession: session != null && session.currentIndex > 0,
      })
    }
    return { entries, fallback }
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="テストする" back={{ name: 'home' }} right={<SoundButton />} />
      <div className="map-scroll">
        <p className="tile-sub map-note">
          もんだいは まいかい ランダムに でるよ。100てんを とると スペシャルボーナス +{GAME_CONFIG.coins.termTestPerfectBonus}コイン！
        </p>
        {data.entries.map((e) => (
          <Card key={e.termId} className={`termtest-card ${e.perfectCount > 0 ? 'termtest-card-perfect' : ''}`}>
            <div className="termtest-head">
              <span className="termtest-title">
                {e.perfectCount > 0 && <span className="crown">👑</span>}
                {e.title}
              </span>
              {e.perfectCount > 0 && <span className="stage-clear">100てん {e.perfectCount}かい</span>}
            </div>
            <p className="tile-sub">
              しゅつだい: れんしゅうずみの {e.practicedCount}字（ぜんぶで{e.totalCount}字）
            </p>
            {e.best ? (
              e.best.correct === e.best.total ? (
                <p className="termtest-status termtest-status-perfect">100てん たっせい！ なんども ちょうせんして きろくを のばそう</p>
              ) : (
                <p className="termtest-status">
                  さいこう {e.best.correct}/{e.best.total}問　—　<b>100てんまで あと{e.best.total - e.best.correct}もん！</b>
                </p>
              )
            ) : (
              <p className="termtest-status">まだ ちょうせんしていないよ</p>
            )}
            {e.hasSession && <p className="stage-resume">とちゅうの きろくあり（つづきから できるよ）</p>}
            <Button
              variant={e.perfectCount > 0 ? 'secondary' : 'accent'}
              onClick={() => navigate({ name: 'termTest', termId: e.termId })}
              disabled={e.practicedCount === 0}
            >
              {e.practicedCount === 0 ? 'まず れんしゅうしよう' : e.best && e.best.correct !== e.best.total ? '100てんに ちょうせん！' : 'ちょうせんする'}
            </Button>
          </Card>
        ))}
        {data.fallback && <p className="tile-sub map-note">いまは 小1の漢字で ちょうせんできるよ（ほかの学年は じゅんびちゅう）</p>}
      </div>
    </div>
  )
}
