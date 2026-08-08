// 学習フロー（仕様 §10, §11）:
// 1漢字につき STEP1なぞり → STEP2自分で3回 → STEP3文脈・熟語で5回。5漢字で1ステージ。
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { findStage } from '../data/curriculum'
import { questionProvider, type Question } from '../data/questions'
import { awardStudy } from '../game/logic'
import { QuestionPrompt } from '../learn/QuestionPrompt'
import { TraceStep } from '../learn/TraceStep'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast } from '../state/store'
import { addActivity, getProgress, recordRecentVariant, saveProgress } from '../storage/repo'
import { Button, CoinBadge, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { KanjiSvg } from '../ui/KanjiSvg'

type Step = 'trace' | 'write' | 'context' | 'stageDone'

const WRITE_ROUNDS = 3
const CONTEXT_ROUNDS = 5

export function LearnFlow({ stageId, startIndex = 0 }: { stageId: string; startIndex?: number }) {
  const profile = useProfile()
  const found = findStage(stageId)
  const [kanjiIdx, setKanjiIdx] = useState(startIndex)
  const [step, setStep] = useState<Step>('trace')
  const [round, setRound] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const busyRef = useRef(false)

  const stage = found?.stage
  const char = stage?.kanji[kanjiIdx]

  // 文脈問題の取得（STEP3・ラウンドごと）
  useEffect(() => {
    if (step !== 'context' || !profile || !char) return
    let alive = true
    setQuestion(null)
    void (async () => {
      const progress = await getProgress(profile.id, char)
      const picked = await questionProvider.pick(char, progress.recentVariantIds)
      if (!alive) return
      setQuestion(picked)
      if (picked) await recordRecentVariant(profile.id, char, picked.id)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, round, char, profile?.id])

  // ◎のときは自動で次へ（テンポ重視）
  useEffect(() => {
    if (!evalResult || step === 'trace' || step === 'stageDone') return
    if (evalResult.verdict !== 'perfect') return
    const t = window.setTimeout(() => nextAfterFeedback(), 1100)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalResult])

  if (!found || !stage) {
    return (
      <div className="screen">
        <TopBar title="ステージが みつかりません" back={{ name: 'stages' }} />
      </div>
    )
  }
  if (!profile || !char) return <LoadingView />

  const resetForNext = () => {
    setEvalResult(null)
    setAttempt((a) => a + 1)
  }

  const gotoNextKanji = async () => {
    const progress = await getProgress(profile.id, char)
    progress.practicedAt = Date.now()
    await saveProgress(progress)
    bumpData()
    if (kanjiIdx + 1 >= stage.kanji.length) {
      const reward = await awardStudy(profile.id, GAME_CONFIG.coins.stageClearBonus, 0, 'ステージクリア')
      await addActivity(profile.id, profile.name, 'stageClear', `${profile.name}が ${stage.label}の れんしゅうを おえました`)
      queueEvolutionFromEvents(reward.expEvents)
      bumpData()
      setStep('stageDone')
    } else {
      setKanjiIdx((i) => i + 1)
      setStep('trace')
      setRound(0)
      resetForNext()
    }
  }

  const onTraceDone = async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const progress = await getProgress(profile.id, char)
      progress.traceDone++
      progress.lastSeenAt = Date.now()
      if (progress.nextReviewAt == null) {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        progress.nextReviewAt = d.getTime() + 86400000
      }
      await saveProgress(progress)
      const reward = await awardStudy(profile.id, GAME_CONFIG.coins.trace, GAME_CONFIG.exp.trace, 'なぞりれんしゅう')
      queueEvolutionFromEvents(reward.expEvents)
      showToast(`なぞり かんぺき！ +${GAME_CONFIG.coins.trace}コイン`)
      bumpData()
      setStep('write')
      setRound(0)
      resetForNext()
    } finally {
      busyRef.current = false
    }
  }

  const onWriteEvaluated = async (ev: KanjiEvaluation, strokes: InkStroke[], size: number) => {
    setEvalResult(ev)
    const isContext = step === 'context'
    await saveSample(profile.id, char, ev, strokes, size, 'practice')
    const progress = await getProgress(profile.id, char)
    if (isContext) progress.contextWrites++
    else progress.writes++
    if (ev.shapeOk && !ev.orderOk) progress.orderErrors++
    if (ev.shapeOk && !ev.directionOk) progress.directionErrors++
    if (!ev.shapeOk) progress.shapeErrors++
    progress.lastSeenAt = Date.now()
    await saveProgress(progress)
    if (ev.correctForTest) {
      const coins =
        (isContext ? GAME_CONFIG.coins.contextWrite : GAME_CONFIG.coins.freeWrite) +
        (ev.verdict === 'perfect' ? GAME_CONFIG.coins.perfectBonus : 0)
      const reward = await awardStudy(
        profile.id,
        coins,
        GAME_CONFIG.exp.write,
        isContext ? 'ぶんしょうもんだい' : 'かきとりれんしゅう'
      )
      queueEvolutionFromEvents(reward.expEvents)
      showToast(`+${coins}コイン`)
    }
    bumpData()
  }

  const nextAfterFeedback = () => {
    const isContext = step === 'context'
    const rounds = isContext ? CONTEXT_ROUNDS : WRITE_ROUNDS
    if (round + 1 >= rounds) {
      if (isContext) void gotoNextKanji()
      else {
        setStep('context')
        setRound(0)
        resetForNext()
      }
    } else {
      setRound((r) => r + 1)
      resetForNext()
    }
  }

  if (step === 'stageDone') {
    return (
      <div className="screen">
        <TopBar title={`${stage.label} かんりょう！`} back={{ name: 'stages' }} />
        <div className="center-panel">
          <div className="card result-main">
            <div className="result-score">よく がんばりました！</div>
            <p>ステージクリアボーナス +{GAME_CONFIG.coins.stageClearBonus}コイン</p>
            <div className="result-chips">
              {stage.kanji.map((k) => (
                <KanjiChip key={k} char={k} state="practiced" />
              ))}
            </div>
            <div className="row gap">
              <Button onClick={() => navigate({ name: 'stageTest', stageId })}>５もんテストに ちょうせん！</Button>
              <Button variant="secondary" onClick={() => navigate({ name: 'stages' })}>
                マップへ もどる
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stepLabel =
    step === 'trace'
      ? 'STEP1　かきじゅんを なぞろう'
      : step === 'write'
        ? `STEP2　じぶんで かこう（${round + 1}かいめ / ${WRITE_ROUNDS}かい）`
        : `STEP3　ぶんの中で かこう（${round + 1}もんめ / ${CONTEXT_ROUNDS}もん）`

  return (
    <div className="screen">
      <TopBar
        title={`${stage.label}　${kanjiIdx + 1}/${stage.kanji.length}「${char}」`}
        back={{ name: 'stages' }}
        right={<CoinBadge coins={profile.coins} />}
      />
      <div className="step-banner">{stepLabel}</div>
      <div className="split">
        <div className="split-left">
          {step === 'trace' && (
            <div className="model-note card">
              <p>うすい線を じゅんばんに なぞってね。</p>
              <p>
                <span className="dot-green">●</span> が かきはじめ、
                <span className="dot-blue">●</span> が すすむ ほうこうだよ。
              </p>
            </div>
          )}
          {step === 'write' && (
            <div className="model-panel card">
              <p className="model-caption">お手本（すうじは かきじゅん）</p>
              <KanjiSvg char={char} full numbers className="model-kanji" />
            </div>
          )}
          {step === 'context' &&
            (question ? (
              <QuestionPrompt question={question} answered={evalResult?.correctForTest === true} />
            ) : (
              <LoadingView label="もんだいを よういちゅう…" />
            ))}
          {evalResult && step !== 'trace' && (
            <div className={`feedback fb-${evalResult.verdict}`}>
              <div className="feedback-icon">
                {evalResult.verdict === 'perfect' ? '◎' : evalResult.verdict === 'okWithNotes' ? '○' : '×'}
              </div>
              <ul className="feedback-msgs">
                {evalResult.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {evalResult.notes.map((m, i) => (
                  <li key={`n${i}`} className="feedback-note">
                    {m}
                  </li>
                ))}
              </ul>
              <div className="row gap">
                {!evalResult.correctForTest && (
                  <Button variant="secondary" onClick={resetForNext}>
                    もういちど
                  </Button>
                )}
                <Button onClick={nextAfterFeedback}>つぎへ</Button>
              </div>
            </div>
          )}
        </div>
        <div className="split-right">
          {step === 'trace' ? (
            <TraceStep char={char} onDone={onTraceDone} />
          ) : (
            <WritingPad
              char={char}
              resetKey={`${char}-${step}-${round}-${attempt}`}
              onEvaluated={onWriteEvaluated}
              disabled={evalResult != null}
              overlay={
                evalResult && !evalResult.shapeOk ? (
                  <KanjiSvg char={char} full color="#e0645f" opacity={0.5} className="ghost-overlay" />
                ) : evalResult ? (
                  <div className={`judge-flash flash-${evalResult.correctForTest ? 'correct' : 'wrong'}`}>
                    {evalResult.verdict === 'perfect' ? '◎' : evalResult.correctForTest ? '○' : '×'}
                  </div>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
