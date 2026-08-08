// ステージテスト（5問）と学期相当の大型テスト（仕様 §13, §16）。
import { findStage, findTerm, termKanji, termLabel } from '../data/curriculum'
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
        <TopBar title="テストが みつかりません" back={{ name: 'stages' }} />
      </div>
    )
  }
  // 大型テストは分割せず、期の全漢字を連続で出題する（仕様 §16）
  const chars = termKanji(found.term).filter((c) => hasRefKanji(c) && hasQuestions(c))
  return (
    <TestRunner
      kind="term"
      targetId={termId}
      chars={chars}
      title={`${termLabel(found.term.index)}の 大きなテスト`}
      backRoute={{ name: 'stages' }}
    />
  )
}
