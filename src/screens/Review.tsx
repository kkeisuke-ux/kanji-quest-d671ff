// 復習モード（仕様 §15, §17）。
// - mode 'due': 今日の復習（間隔反復。子どもには仕組みを見せない）
// - mode 'unknown': わからなかった漢字の復習（正解してもリストからは消えない。
//   正式なテストで正解したときだけ自動で消える）
import { useEffect, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { hasRefKanji } from '../core/refdata'
import { questionProvider, type Question } from '../data/questions'
import { awardStudy } from '../game/logic'
import { QuestionPrompt } from '../learn/QuestionPrompt'
import { TraceStep } from '../learn/TraceStep'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { applyOutcome, dueReviewChars, getProgress, listUnknown, recordRecentVariant } from '../storage/repo'
import { playCorrect, playWrong } from '../sound/sound'
import { Button, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { JudgeMark } from '../ui/JudgeMark'
import { KanjiSvg } from '../ui/KanjiSvg'
import { SoundButton } from '../ui/SoundButton'

export function Review({ mode, chars: charsParam }: { mode: 'due' | 'unknown'; chars?: string[] }) {
  const profileId = useAppState((s) => s.profileId)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'write' | 'relearn' | 'done'>('write')
  const [question, setQuestion] = useState<Question | null>(null)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [attempt, setAttempt] = useState(0)

  // リストは初回に一度だけ確定させる（復習中に変動させない）
  const { data: list } = useAsyncData(async () => {
    if (!profileId) return null
    if (charsParam && charsParam.length > 0) return charsParam.filter((c) => hasRefKanji(c))
    if (mode === 'due') return dueReviewChars(profileId)
    return (await listUnknown(profileId)).map((u) => u.char).filter((c) => hasRefKanji(c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, mode])

  const char = list?.[index]

  useEffect(() => {
    if (phase !== 'write' || !profileId || !char) return
    let alive = true
    setQuestion(null)
    void (async () => {
      const progress = await getProgress(profileId, char)
      const picked = await questionProvider.pick(char, progress.recentVariantIds)
      if (!alive) return
      setQuestion(picked)
      if (picked) await recordRecentVariant(profileId, char, picked.id)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, profileId, char])

  if (!profileId || !list) return <LoadingView />

  const title = mode === 'due' ? 'きょうの ふくしゅう' : 'わからなかった漢字の ふくしゅう'

  if (list.length === 0) {
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'home' }} />
        <div className="center-panel">
          <div className="card result-main">
            <p className="result-score">いまは ふくしゅうする漢字が ないよ！</p>
            <Button onClick={() => navigate({ name: 'home' })}>ホームへ</Button>
          </div>
        </div>
      </div>
    )
  }

  const advance = () => {
    setEvalResult(null)
    setAttempt((a) => a + 1)
    if (index + 1 >= list.length) setPhase('done')
    else {
      setIndex(index + 1)
      setPhase('write')
    }
  }

  const onEvaluated = async (ev: KanjiEvaluation, strokes: InkStroke[], size: number) => {
    if (!char) return
    setEvalResult(ev)
    await saveSample(profileId, char, ev, strokes, size, 'review')
    const outcome = ev.correctForTest ? 'correct' : 'wrong'
    if (outcome === 'correct') playCorrect()
    else playWrong()
    await applyOutcome(profileId, char, outcome, {
      context: 'review',
      orderError: ev.shapeOk && !ev.orderOk,
      directionError: ev.shapeOk && !ev.directionOk,
      shapeError: !ev.shapeOk,
    })
    if (outcome === 'correct') {
      setCorrectCount((c) => c + 1)
      const reward = await awardStudy(profileId, GAME_CONFIG.coins.reviewPerCorrect, GAME_CONFIG.exp.write, 'ふくしゅう')
      queueEvolutionFromEvents(reward.expEvents)
      showToast(`+${GAME_CONFIG.coins.reviewPerCorrect}コイン`)
    }
    bumpData()
  }

  if (phase === 'done') {
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'home' }} />
        <div className="center-panel">
          <div className="card result-main">
            <div className="result-score">
              ふくしゅう おわり！　{list.length}字中 {correctCount}字 せいかい
            </div>
            {mode === 'unknown' && <p className="tile-sub">テストで せいかいすると リストから じどうで きえるよ</p>}
            <Button onClick={() => navigate({ name: 'home' })}>ホームへ</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar title={`${title}　${index + 1} / ${list.length}`} back={{ name: 'home' }} right={<SoundButton />} />
      {mode === 'unknown' && <div className="step-banner">まちがえても だいじょうぶ。テストで せいかいしたら リストから そつぎょう！</div>}
      {phase === 'relearn' && char ? (
        <div className="split">
          <div className="split-left">
            <div className="model-note card">
              <p>もういちど かきじゅんを たしかめよう</p>
            </div>
          </div>
          <div className="split-right">
            <TraceStep char={char} onDone={advance} />
          </div>
        </div>
      ) : (
        <div className="split">
          <div className="split-left">
            {question ? (
              <QuestionPrompt question={question} answered={evalResult?.correctForTest === true} />
            ) : (
              <LoadingView label="もんだいを よういちゅう…" />
            )}
            {evalResult && (
              <div className={`feedback fb-${evalResult.verdict}`}>
                <div className="feedback-icon">
                  {evalResult.verdict === 'perfect' ? '◎' : evalResult.verdict === 'okWithNotes' ? '○' : '×'}
                </div>
                <ul className="feedback-msgs">
                  {evalResult.messages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <div className="row gap">
                  {evalResult.correctForTest ? (
                    <Button onClick={advance}>つぎへ</Button>
                  ) : (
                    <Button onClick={() => setPhase('relearn')}>かきじゅんを おさらいする</Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="split-right">
            {char && (
              <WritingPad
                char={char}
                resetKey={`${char}-${attempt}`}
                onEvaluated={onEvaluated}
                disabled={evalResult != null}
                overlay={
                  evalResult ? (
                    evalResult.correctForTest ? (
                      <JudgeMark kind="correct" />
                    ) : (
                      <>
                        <KanjiSvg char={char} full color="#e0645f" opacity={0.4} className="ghost-overlay" />
                        <JudgeMark kind="wrong" />
                      </>
                    )
                  ) : null
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
