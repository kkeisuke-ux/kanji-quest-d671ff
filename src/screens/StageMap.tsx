// れんしゅうマップ: 学習済みの場所が視覚的に分かる（仕様 §1, §16）。
import { getCurriculumForGrade, termDisplayLabel } from '../data/curriculum'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, listProgress, listTestResults, listUnknown } from '../storage/repo'
import { Button, Card, KanjiChip, LoadingView, TopBar, type KanjiChipState } from '../ui/components'
import { GradeSelector, effectiveBrowseGrade } from '../ui/GradeSelector'

export function StageMap() {
  const profileId = useAppState((s) => s.profileId)
  const browseGrade = useAppState((s) => s.browseGrade)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [progressList, unknown, results] = await Promise.all([
      listProgress(profileId),
      listUnknown(profileId),
      listTestResults(profileId),
    ])
    // どの学年の漢字でも練習できる（既定は自分の学年。2026-08-08 第8回）
    const { cur, fallback } = getCurriculumForGrade(effectiveBrowseGrade(browseGrade, profile.grade))
    const stagePerfect = new Map<string, number>()
    for (const r of results) {
      if (r.kind === 'stage' && r.total > 0 && r.correct === r.total) {
        stagePerfect.set(r.targetId, (stagePerfect.get(r.targetId) ?? 0) + 1)
      }
    }
    return {
      profile,
      cur,
      fallback,
      stagePerfect,
      progressMap: new Map(progressList.map((p) => [p.char, p])),
      unknownSet: new Set(unknown.map((u) => u.char)),
      ownGrade: profile.grade,
    }
  }, [profileId, browseGrade])

  if (!data) return <LoadingView />
  const { cur, fallback, progressMap, unknownSet, stagePerfect, ownGrade } = data

  const chipState = (char: string): KanjiChipState => {
    if (unknownSet.has(char)) return 'unknown'
    const p = progressMap.get(char)
    if (!p) return 'none'
    if (p.masteredAt != null) return 'mastered'
    if (p.practicedAt != null) return 'practiced'
    return 'none'
  }

  return (
    <div className="screen">
      <TopBar title={`れんしゅうする（${cur.gradeLabel}）`} back={{ name: 'home' }} />
      {fallback && <p className="map-note">小1の漢字に ちょうせんするよ！</p>}
      <div className="map-scroll">
        <GradeSelector ownGrade={ownGrade} />
        <p className="tile-sub map-note-inline">まとめテストは ホームの「テストする」から ちょうせんできるよ</p>
        {cur.terms.map((term) => {
          return (
            <section key={term.id} className="term-section">
              <h2 className="term-title">{termDisplayLabel(cur, term.index)}</h2>
              {term.stages.length === 0 ? (
                <Card className="stage-card stage-card-empty">じゅんびちゅう…</Card>
              ) : (
                <>
                  <div className="stage-grid">
                    {term.stages.map((stage) => {
                      const practicedAll = stage.kanji.every((k) => {
                        const p = progressMap.get(k)
                        return p?.practicedAt != null
                      })
                      const perfect = stagePerfect.get(stage.id) ?? 0
                      return (
                        <Card key={stage.id} className="stage-card">
                          <div className="stage-head">
                            <span className="stage-label">{stage.label}</span>
                            <span className="row gap-sm">
                              <span className={`stage-clear ${perfect === 0 ? 'stage-clear-zero' : ''}`}>100点 {perfect}回</span>
                              {perfect === 0 && practicedAll && <span className="stage-done">れんしゅうずみ</span>}
                            </span>
                          </div>
                          <div className="stage-chips">
                            {stage.kanji.map((k) => (
                              <KanjiChip key={k} char={k} state={chipState(k)} />
                            ))}
                          </div>
                          <div className="row gap">
                            <Button size="sm" onClick={() => navigate({ name: 'learn', stageId: stage.id })}>
                              れんしゅう
                            </Button>
                            <Button size="sm" variant={practicedAll ? 'accent' : 'secondary'} onClick={() => navigate({ name: 'stageTest', stageId: stage.id })}>
                              ５もんテスト
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </section>
          )
        })}
        <div className="map-legend">
          <span>
            <span className="kanji-chip chip-none legend-chip">字</span> まだ
          </span>
          <span>
            <span className="kanji-chip chip-practiced legend-chip">字</span> れんしゅうした
          </span>
          <span>
            <span className="kanji-chip chip-mastered legend-chip">字</span> マスター
          </span>
          <span>
            <span className="kanji-chip chip-unknown legend-chip">字</span> わからなかった
          </span>
        </div>
      </div>
    </div>
  )
}
