// みんな画面（2026-08-14 第37回で視覚重視に刷新）:
// 各利用者の「マスターした漢字」「５もんテスト100点」「まとめテスト100点」「ずかん」を
// 大きな数字で見比べられるダッシュボード。称号バッジつき。
// 順位付けはしない（仕様 §30）。細かい学期別リストは廃止（情報過多のため）。
import { ACTIVE_STAGE_IDS, CURRICULUM, TERM_TEST_TOTAL, perfectTermTestIds } from '../data/curriculum'
import { totalDexStages } from '../data/species'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { backfillStudyDays, listDex, listProfiles, listProgress, listStudyDays, listTestResults } from '../storage/repo'
import { Card, LoadingView, TopBar } from '../ui/components'
import { RankChip } from '../ui/RankBadge'
import { StudyCalendar } from '../ui/StudyCalendar'
import type { StudyDayRecord } from '../storage/models'

interface ProfileDash {
  id: string
  name: string
  color: string
  mastered: number
  stageCleared: number
  termCleared: number
  dexCount: number
  /** 100点をとったまとめテストの本数（称号ランク） */
  perfectCount: number
  /** べんきょうカレンダー用（第45回） */
  studyDays: StudyDayRecord[]
}

export function Minna() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData<{ dash: ProfileDash[]; totals: { chars: number; stages: number; terms: number; dex: number } } | null>(
    async () => {
      const profiles = await listProfiles()
      // 分母は全学年（小1〜中3＋マスター級）の合計。そうまとめの再掲はユニーク化して除外（第34回）
      const allStages = [
        ...new Map(CURRICULUM.flatMap((c) => c.terms.flatMap((t) => t.stages)).map((s) => [s.id, s])).values(),
      ]
      const totals = {
        chars: new Set(allStages.flatMap((s) => s.kanji)).size,
        stages: allStages.length,
        terms: TERM_TEST_TOTAL,
        dex: totalDexStages(),
      }
      const dash = await Promise.all(
        profiles.map(async (p) => {
          await backfillStudyDays(p.id)
          const [progress, results, dex, studyDays] = await Promise.all([
            listProgress(p.id),
            listTestResults(p.id),
            listDex(p.id),
            listStudyDays(p.id),
          ])
          const stagePerfect = new Set<string>()
          for (const r of results) {
            if (r.kind === 'stage' && r.total > 0 && r.correct === r.total && ACTIVE_STAGE_IDS.has(r.targetId)) {
              stagePerfect.add(r.targetId)
            }
          }
          const termPerfect = perfectTermTestIds(results)
          return {
            id: p.id,
            name: p.name,
            color: p.color,
            mastered: progress.filter((x) => x.masteredAt != null).length,
            stageCleared: stagePerfect.size,
            termCleared: termPerfect.size,
            dexCount: dex.length,
            perfectCount: termPerfect.size,
            studyDays,
          }
        })
      )
      return { dash, totals }
    },
    [profileId]
  )

  if (!data) return <LoadingView />
  const { dash, totals } = data

  const stat = (icon: string, label: string, value: number, total: number, unit = '') => (
    <div className="stat-card minna-stat">
      <span className="stat-label">
        {icon} {label}
      </span>
      <span className="stat-num">
        {value}
        <small>
          {' '}
          / {total}
          {unit}
        </small>
      </span>
      <div className="masterbar">
        <div className="masterbar-fill" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  )

  return (
    <div className="screen">
      <TopBar title="みんな" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub minna-note">じゅんいは ないよ。みんな それぞれの ペースで がんばろう！</p>
        <div className="minna-dash">
          {dash.map((d) => (
            <Card key={d.id} className="minna-profile-card">
              <div className="minna-head">
                <span className="avatar" style={{ background: d.color }}>
                  {d.name.slice(0, 1)}
                </span>
                <p className="minna-name">
                  {d.name}
                  <RankChip perfectCount={d.perfectCount} />
                </p>
              </div>
              <div className="stat-row minna-stat-row">
                {stat('📖', 'マスターした漢字', d.mastered, totals.chars, '字')}
                {stat('✏️', '５もんテスト 100点', d.stageCleared, totals.stages, 'ステージ')}
                {stat('💮', 'まとめテスト 100点', d.termCleared, totals.terms, 'テスト')}
                {stat('📔', 'ずかん', d.dexCount, totals.dex, 'しゅるい')}
              </div>
              {/* だれが どれだけ 続いているか（第45回）。今月ぶんだけの小さいカレンダー */}
              <StudyCalendar records={d.studyDays} navigable={false} compact title="" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
