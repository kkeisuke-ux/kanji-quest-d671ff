// ステージテスト（5問）とまとめテスト（第43回: 4ステージ=最大20問の通し番号テスト）。
import { findSkipTest, findStage, findTermTest } from '../data/curriculum'
import { hasQuestions } from '../data/questions'
import { GAME_CONFIG } from '../config/gameConfig'
import { shuffled } from '../core/geometry'
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

/**
 * 飛び級テスト（第63回）。その学年の漢字から**毎回ランダムに20問**。
 * 20問ぜんぶ正解で合格 → その学年はレベルの積み上げで通過ずみになる。
 * 毎回ちがう問題が出るので、まぐれで通りつづけることはできない。
 */
export function SkipTestScreen({ skipId }: { skipId: string }) {
  const test = findSkipTest(skipId)
  if (!test) {
    return (
      <div className="screen">
        <TopBar title="テストが みつかりません" back={{ name: 'tests' }} />
      </div>
    )
  }
  const pool = test.kanji.filter((c) => hasRefKanji(c) && hasQuestions(c))
  // 出題数より漢字が少ない学年でも成立するように、足りなければあるぶんだけ出す
  const chars = shuffled(pool).slice(0, GAME_CONFIG.skipTest.questionCount)
  return <TestRunner kind="skip" targetId={skipId} chars={chars} title={test.label} backRoute={{ name: 'tests' }} />
}
