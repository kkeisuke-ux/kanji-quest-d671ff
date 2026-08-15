// ステージテスト（5問）とまとめテスト（第43回: 4ステージ=最大20問の通し番号テスト）。
import { findStage, findTermTest } from '../data/curriculum'
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
  const test = findTermTest(termId)
  if (!test) {
    return (
      <div className="screen">
        <TopBar title="テストが みつかりません" back={{ name: 'tests' }} />
      </div>
    )
  }
  // 練習していなくても、いつでも受けられる（2026-08-08 第9回）
  const chars = test.kanji.filter((c) => hasRefKanji(c) && hasQuestions(c))
  return <TestRunner kind="term" targetId={termId} chars={chars} title={test.label} backRoute={{ name: 'tests' }} />
}
