// まとめテスト一覧（第43回で全面改編）。
// 旧「学期ごと1本（最大120字超）」は長すぎて続かないため、
// 4ステージ（最大20問）ごとの通し番号テスト「まとめテスト N」に分割した。
// 「100点満点をとるまでやりたくなる」ことを重視:
// - 100点回数（王冠）・最高記録・「100点まであと○問」を表示
// - 旧・学期テストの100点は内包する新テストへ自動で引き継ぐ
import { CURRICULUM, TERM_TESTS, getCurriculumForGrade, perfectTermTestIds } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, getTestSession, listProgress, listTestResults } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'
import { GradeSelector, effectiveBrowseGrade } from '../ui/GradeSelector'
import { useScrollMemory } from '../ui/scrollMemory'

interface TestEntry {
  id: string
  label: string
  rangeLabel: string
  practicedCount: number
  totalCount: number
  perfectCount: number
  best: { correct: number; total: number } | null
  hasSession: boolean
}

export function TestsHub() {
  const profileId = useAppState((s) => s.profileId)
  const browseGrade = useAppState((s) => s.browseGrade)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [progress, results] = await Promise.all([listProgress(profileId), listTestResults(profileId)])
    const practiced = new Set(progress.filter((p) => p.practicedAt != null).map((p) => p.char))
    const achieved = perfectTermTestIds(results)
    // どの学年のまとめテストでも受けられる（2026-08-08 第8回）。
    // 既定は「まだ100点をとっていないまとめテストが残る いちばん低い学年」（第37回）。
    let defaultGrade: number | null = null
    if (browseGrade == null) {
      for (const c of CURRICULUM) {
        if (TERM_TESTS.some((t) => t.grade === c.grade && !achieved.has(t.id))) {
          defaultGrade = c.grade
          break
        }
      }
    }
    const { cur, fallback } = getCurriculumForGrade(browseGrade ?? defaultGrade ?? effectiveBrowseGrade(null, profile.grade))
    const entries: TestEntry[] = []
    for (const test of TERM_TESTS.filter((t) => t.grade === cur.grade)) {
      const all = test.kanji.filter((c) => hasRefKanji(c) && hasQuestions(c))
      const runs = results.filter((r) => r.kind === 'term' && r.targetId === test.id)
      let best: TestEntry['best'] = null
      let perfectRuns = 0
      for (const r of runs) {
        if (!best || r.correct > best.correct) best = { correct: r.correct, total: r.total }
        if (r.total > 0 && r.correct === r.total) perfectRuns++
      }
      // 旧・学期テストからの引き継ぎ100点は1回ぶんとして数える
      const perfectCount = perfectRuns + (perfectRuns === 0 && achieved.has(test.id) ? 1 : 0)
      const session = await getTestSession(profileId, `term:${test.id}`)
      entries.push({
        id: test.id,
        label: test.label,
        rangeLabel: test.rangeLabel,
        practicedCount: all.filter((c) => practiced.has(c)).length,
        totalCount: all.length,
        perfectCount,
        best,
        hasSession: session != null && session.currentIndex > 0,
      })
    }
    return { entries, fallback, grade: cur.grade, gradeLabel: cur.gradeLabel, ownGrade: profile.grade }
  }, [profileId, browseGrade])

  // 戻ってきたとき、直前に見ていたテストの位置をそのまま表示する（2026-08-14 第31回）
  const scrollRef = useScrollMemory(data ? `tests:${profileId}:g${data.grade}` : null)

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title={`テストする（${data.gradeLabel}）`} back={{ name: 'home' }} />
      <div className="map-scroll" ref={scrollRef}>
        <GradeSelector ownGrade={data.ownGrade} effectiveGrade={data.grade} />
        <p className="tile-sub map-note">1つの テストは さいだい20問。もんだいは まいかい ランダムに でるよ</p>
        {data.entries.map((e) => (
          <Card key={e.id} className={`termtest-card ${e.perfectCount > 0 ? 'termtest-card-perfect' : ''}`}>
            <div className="termtest-head">
              <span className="termtest-title">
                {e.perfectCount > 0 && <span className="crown">👑</span>}
                {e.label}
                <span className="termtest-range">（{e.rangeLabel}）</span>
              </span>
              <span className={`stage-clear ${e.perfectCount === 0 ? 'stage-clear-zero' : ''}`}>100点 {e.perfectCount}回</span>
            </div>
            <p className="tile-sub">
              しゅつだい: {e.totalCount}問（いつでも うけられるよ。れんしゅうずみ {e.practicedCount}字）
            </p>
            {e.best ? (
              e.best.correct === e.best.total ? (
                <p className="termtest-status termtest-status-perfect">100点 たっせい！ なんども ちょうせんして きろくを のばそう</p>
              ) : (
                <p className="termtest-status">
                  さいこう {e.best.correct}/{e.best.total}問　—　<b>100点まで あと{e.best.total - e.best.correct}問！</b>
                </p>
              )
            ) : e.perfectCount > 0 ? (
              <p className="termtest-status termtest-status-perfect">100点 たっせい！（まえの ながい テストで クリアずみ）</p>
            ) : (
              <p className="termtest-status">まだ ちょうせんしていないよ</p>
            )}
            {e.hasSession && <p className="stage-resume">とちゅうの きろくあり（つづきから できるよ）</p>}
            <Button variant={e.perfectCount > 0 ? 'secondary' : 'accent'} onClick={() => navigate({ name: 'termTest', termId: e.id })}>
              {e.best && e.best.correct !== e.best.total ? '100点に ちょうせん！' : 'ちょうせんする'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
