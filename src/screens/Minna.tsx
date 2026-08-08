// みんな画面（2026-08-08刷新）: できごと履歴ではなく、各利用者の進捗を視覚的に表示。
// - 覚えた（マスターした）漢字数
// - どのステージまで完全クリアか（5問テスト100点＝クリア）
// - 各学期テストの最高点
// 順位付けはしない（仕様 §30）。
import { getCurriculumForGrade, gradeLabelOf, termKanji, termLabel } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { listProfiles, listProgress, listTestResults } from '../storage/repo'
import { Card, LoadingView, TopBar } from '../ui/components'

interface ProfileDash {
  id: string
  name: string
  color: string
  gradeLabel: string
  mastered: number
  totalPlayable: number
  terms: {
    label: string
    stages: { label: string; state: 'cleared' | 'practiced' | 'none'; perfectCount: number }[]
    best: { correct: number; total: number } | null
  }[]
}

export function Minna() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData<ProfileDash[]>(async () => {
    const profiles = await listProfiles()
    return Promise.all(
      profiles.map(async (p) => {
        const [progress, results] = await Promise.all([listProgress(p.id), listTestResults(p.id)])
        const progressMap = new Map(progress.map((x) => [x.char, x]))
        const { cur } = getCurriculumForGrade(p.grade)
        const stagePerfect = new Map<string, number>()
        const termBest = new Map<string, { correct: number; total: number }>()
        for (const r of results) {
          if (r.kind === 'stage' && r.total > 0 && r.correct === r.total) {
            stagePerfect.set(r.targetId, (stagePerfect.get(r.targetId) ?? 0) + 1)
          }
          if (r.kind === 'term') {
            const best = termBest.get(r.targetId)
            if (!best || r.correct > best.correct) termBest.set(r.targetId, { correct: r.correct, total: r.total })
          }
        }
        const terms = cur.terms
          .filter((t) => t.stages.length > 0)
          .map((t) => ({
            label: termLabel(t.index),
            best: termBest.get(t.id) ?? null,
            stages: t.stages.map((s) => {
              const practicedAll = s.kanji.every((k) => progressMap.get(k)?.practicedAt != null)
              const perfectCount = stagePerfect.get(s.id) ?? 0
              return {
                label: s.label.replace('ステージ', ''),
                state: perfectCount > 0 ? ('cleared' as const) : practicedAll ? ('practiced' as const) : ('none' as const),
                perfectCount,
              }
            }),
          }))
        const totalPlayable = cur.terms
          .flatMap((t) => t.stages)
          .flatMap((s) => s.kanji)
          .filter((c) => hasRefKanji(c) && hasQuestions(c)).length
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          gradeLabel: gradeLabelOf(p.grade),
          mastered: progress.filter((x) => x.masteredAt != null).length,
          totalPlayable,
          terms,
        }
      })
    )
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="みんな" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub minna-note">じゅんいは ないよ。みんな それぞれの ペースで がんばろう！（★=５もんテストで100てん）</p>
        <div className="minna-dash">
          {data.map((d) => (
            <Card key={d.id} className="minna-profile-card">
              <div className="minna-head">
                <span className="avatar" style={{ background: d.color }}>
                  {d.name.slice(0, 1)}
                </span>
                <div>
                  <p className="minna-name">
                    {d.name} <span className="minna-grade">{d.gradeLabel}</span>
                  </p>
                  <p className="minna-mastered">
                    マスターした漢字　<b>{d.mastered}</b> / {d.totalPlayable}字
                  </p>
                  <div className="masterbar minna-bar">
                    <div
                      className="masterbar-fill"
                      style={{ width: `${d.totalPlayable > 0 ? (d.mastered / d.totalPlayable) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="minna-terms">
                {d.terms.map((t) => (
                  <div key={t.label} className="minna-term-row">
                    <span className="minna-term-label">{t.label}</span>
                    <span className="minna-stages">
                      {t.stages.map((s) => (
                        <span key={s.label} className={`mini-stage mini-stage-${s.state}`} title={`ステージ${s.label}`}>
                          {s.state === 'cleared' ? '★' : s.label}
                        </span>
                      ))}
                    </span>
                    <span className="minna-term-best">
                      {t.best ? `テストさいこう ${t.best.correct}/${t.best.total}問` : 'テストは まだ'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
