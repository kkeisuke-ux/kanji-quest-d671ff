// ステージテスト（5問）と学期相当の大型テスト。
// 大型テストは「その期で れんしゅうずみの全漢字」を対象にする（2026-08-08変更）。
import { findStage, findTerm, termKanji, termTestTitle } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { hasRefKanji } from '../core/refdata'
import { TestRunner } from '../learn/TestRunner'
import { TopBar } from '../ui/components'

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
  const found = findTerm(termId)
  if (!found) {
    return (
      <div className="screen">
        <TopBar title="テストが みつかりません" back={{ name: 'tests' }} />
      </div>
    )
  }
  const title = termTestTitle(found.cur, found.term.index)
  // 練習していなくても、いつでもその学期の全漢字で受けられる（2026-08-08 第9回）
  const chars = termKanji(found.term).filter((c) => hasRefKanji(c) && hasQuestions(c))
  return <TestRunner kind="term" targetId={termId} chars={chars} title={title} backRoute={{ name: 'tests' }} />
}
