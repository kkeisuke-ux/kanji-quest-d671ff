// れんしゅうマップ: 学習済みの場所が視覚的に分かる（仕様 §1, §16）。
import { getCurriculumForGrade, termKanji, termLabel } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, getTestSession, listProgress, listUnknown } from '../storage/repo'
import { Button, Card, KanjiChip, LoadingView, TopBar, type KanjiChipState } from '../ui/components'

export function StageMap() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [progressList, unknown] = await Promise.all([listProgress(profileId), listUnknown(profileId)])
    const { cur, fallback } = getCurriculumForGrade(profile.grade)
    const sessions: Record<string, boolean> = {}
    for (const term of cur.terms) {
      if (term.stages.length === 0) continue
      const s = await getTestSession(profileId, `term:${term.id}`)
      sessions[term.id] = s != null && s.currentIndex > 0
    }
    return {
      profile,
      cur,
      fallback,
      sessions,
      progressMap: new Map(progressList.map((p) => [p.char, p])),
      unknownSet: new Set(unknown.map((u) => u.char)),
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { cur, fallback, progressMap, unknownSet, sessions } = data

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
      <TopBar title={`れんしゅうマップ（${cur.gradeLabel}）`} back={{ name: 'home' }} />
      {fallback && <p className="map-note">いまは 小1の漢字で れんしゅうできるよ（ほかの学年は じゅんびちゅう）</p>}
      <div className="map-scroll">
        {cur.terms.map((term) => {
          const kanji = termKanji(term).filter((c) => hasRefKanji(c) && hasQuestions(c))
          return (
            <section key={term.id} className="term-section">
              <h2 className="term-title">{termLabel(term.index)}</h2>
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
                      return (
                        <Card key={stage.id} className="stage-card">
                          <div className="stage-head">
                            <span className="stage-label">{stage.label}</span>
                            {practicedAll && <span className="stage-done">れんしゅうずみ</span>}
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
                    <Card className="stage-card stage-card-test">
                      <div className="stage-head">
                        <span className="stage-label">{termLabel(term.index)}の 大きなテスト</span>
                      </div>
                      <p className="stage-test-desc">{kanji.length}問 れんぞく！ とちゅうで やめても つづきから できるよ</p>
                      {sessions[term.id] && <p className="stage-resume">とちゅうの きろくあり</p>}
                      <Button variant="accent" onClick={() => navigate({ name: 'termTest', termId: term.id })} disabled={kanji.length === 0}>
                        ちょうせんする
                      </Button>
                    </Card>
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
