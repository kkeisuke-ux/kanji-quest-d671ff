// ステージテスト（5問）と学期相当の大型テスト。
// 大型テストは「その期で れんしゅうずみの全漢字」を対象にする（2026-08-08変更）。
import { findStage, findTerm, termKanji, termTestTitle } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { TestRunner } from '../learn/TestRunner'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listProgress } from '../storage/repo'
import { Button, LoadingView, TopBar } from '../ui/components'

export function StageTestScreen({ stageId }: { stageId: string }) {
  const found = findStage(stageId)
  if (!found) {
    return (
      <div className="screen">
        <TopBar title="テストが みつかりません" back={{ name: 'stages' }} />
      </div>
    )
  }
  const chars = found.stage.kanji.filter((c) => hasRefKanji(c) && hasQuestions(c))
  return (
    <TestRunner
      kind="stage"
      targetId={stageId}
      chars={chars}
      title={`${found.stage.label} ５もんテスト`}
      backRoute={{ name: 'stages' }}
    />
  )
}

export function TermTestScreen({ termId }: { termId: string }) {
  const profileId = useAppState((s) => s.profileId)
  const found = findTerm(termId)
  const { data: chars } = useAsyncData(async () => {
    if (!found || !profileId) return null
    const progress = await listProgress(profileId)
    const practiced = new Set(progress.filter((p) => p.practicedAt != null).map((p) => p.char))
    return termKanji(found.term).filter((c) => hasRefKanji(c) && hasQuestions(c) && practiced.has(c))
  }, [profileId, termId])

  if (!found) {
    return (
      <div className="screen">
        <TopBar title="テストが みつかりません" back={{ name: 'tests' }} />
      </div>
    )
  }
  const title = termTestTitle(found.cur, found.term.index)
  if (!chars) return <LoadingView />
  if (chars.length === 0) {
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'tests' }} />
        <div className="center-panel">
          <div className="card result-main">
            <p className="result-score">まだ れんしゅうした漢字が ないよ</p>
            <p className="tile-sub">「れんしゅうする」で れんしゅうしてから ちょうせんしよう！</p>
            <Button onClick={() => navigate({ name: 'stages' })}>れんしゅうへ</Button>
          </div>
        </div>
      </div>
    )
  }
  return <TestRunner kind="term" targetId={termId} chars={chars} title={title} backRoute={{ name: 'tests' }} />
}
