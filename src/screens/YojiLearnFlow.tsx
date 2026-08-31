// 四字熟語ステージ専用の学習フロー（2026-08-08 第21回）:
// 1文字ずつバラバラに練習するのではなく、四字熟語を「4文字つづけて」書く。
//   1しゅうめ: 4文字を じゅんばんに なぞる（すうじヒントつき）
//   2しゅうめ: 4文字を じゅんばんに じぶんで書く
// 問題文（QuestionPrompt）に読みと意味を常に表示し、書けた字から空欄が埋まっていく。
// 途中でやめても同じ場所から再開できる（practiceSessionsに自動保存）。
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { findStage } from '../data/curriculum'
import { questionWriteChars, yojiQuestionOf } from '../data/questions'
import { awardCoinsFor, awardStarsFor } from '../game/logic'
import { BuddyCorner, type BuddyMood } from '../learn/BuddyCorner'
import { QuestionPrompt } from '../learn/QuestionPrompt'
import { TraceStep } from '../learn/TraceStep'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { playCorrect, playPerfect, playWrong } from '../sound/sound'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast } from '../state/store'
import {
  addActivity,
  deletePracticeSession,
  getPracticeSession,
  getProgress,
  markStudied,
  savePracticeSession,
  saveProgress,
} from '../storage/repo'
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { CoinReward, StarReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { KanjiSvg } from '../ui/KanjiSvg'
import { StarSplash } from '../ui/StarSplash'
import { StrictnessButton } from '../ui/StrictnessButton'

const CHARS_PER_IDIOM = 4
// 1しゅうめ=なぞり(0..3)、2しゅうめ=じぶんで(4..7)
const TOTAL_STEPS = CHARS_PER_IDIOM * 2

export function YojiLearnFlow({ stageId }: { stageId: string }) {
  const profile = useProfile()
  const found = findStage(stageId)
  const [loaded, setLoaded] = useState(false)
  const [idiomIdx, setIdiomIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [stageDone, setStageDone] = useState(false)
  const [idiomSplash, setIdiomSplash] = useState(false)
  const [traceMark, setTraceMark] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const busyRef = useRef(false)
  const moodTimerRef = useRef<number | null>(null)
  const advanceStepRef = useRef<() => Promise<void>>(async () => {})

  const stage = found?.stage
  // 代表字（ステージの配当字）と、その字の四字熟語問題
  const char = stage?.kanji[idiomIdx]
  const question = char ? yojiQuestionOf(char) : null
  const writeChars = question ? questionWriteChars(question) : []
  const idiom = writeChars.join('')
  const blankIdx = step % CHARS_PER_IDIOM
  const isWrite = step >= CHARS_PER_IDIOM
  const currentChar = writeChars[blankIdx]

  // 途中保存の復元（初回のみ）
  useEffect(() => {
    if (!profile || !stage || loaded) return
    let alive = true
    void (async () => {
      const session = await getPracticeSession(profile.id, stageId)
      if (!alive) return
      if (session && session.kanjiIdx < stage.kanji.length && (session.kanjiIdx > 0 || session.round > 0)) {
        setIdiomIdx(session.kanjiIdx)
        setStep(Math.min(session.round, TOTAL_STEPS - 1))
        showToast(`とちゅうから さいかい！（${session.kanjiIdx + 1}つめの よじじゅくご）`)
      }
      setLoaded(true)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, stageId, loaded])

  useEffect(() => () => {
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
  }, [])

  // ◎（かんぺき）は自動で次へ。フックはearly returnより前に置く（React #310対策）
  useEffect(() => {
    if (!evalResult || evalResult.verdict !== 'perfect') return
    const t = window.setTimeout(() => {
      setEvalResult(null)
      setAttempt((a) => a + 1)
      void advanceStepRef.current()
    }, 1300)
    return () => window.clearTimeout(t)
  }, [evalResult])

  if (!found || !stage) {
    return (
      <div className="screen">
        <TopBar title="ステージが みつかりません" back={{ name: 'stages' }} />
      </div>
    )
  }
  if (!profile || !char || !loaded) return <LoadingView />
  if (!question || writeChars.length < 2) {
    return (
      <div className="screen">
        <TopBar title="もんだいが みつかりません" back={{ name: 'stages' }} />
      </div>
    )
  }

  const happyBuddy = () => {
    setBuddyMood('happy')
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => setBuddyMood('idle'), 1800)
  }

  const resetForNext = () => {
    setEvalResult(null)
    setAttempt((a) => a + 1)
  }

  const persist = (nextIdiomIdx: number, nextStep: number) =>
    savePracticeSession({ profileId: profile.id, stageId, kanjiIdx: nextIdiomIdx, round: nextStep, updatedAt: Date.now() })

  const restart = async () => {
    await deletePracticeSession(profile.id, stageId)
    setIdiomIdx(0)
    setStep(0)
    resetForNext()
    showToast('さいしょから はじめるよ')
  }

  const completeIdiom = async () => {
    const progress = await getProgress(profile.id, char)
    progress.practicedAt = Date.now()
    await saveProgress(progress)
    void markStudied(profile.id)
    // 1熟語れんしゅうかんりょう → コイン＋スター（配当字1字ぶんの扱い）
    await awardCoinsFor(profile.id, GAME_CONFIG.coins.practicePerKanji, `れんしゅう「${idiom}」`)
    await awardStarsFor(profile.id, GAME_CONFIG.starRewards.practiceKanji)
    if (idiomIdx + 1 >= stage.kanji.length) {
      await awardStarsFor(profile.id, GAME_CONFIG.starRewards.practiceStage)
      await deletePracticeSession(profile.id, stageId)
      await addActivity(profile.id, profile.name, 'stageClear', `${profile.name}が ${stage.label}の れんしゅうを おえました`)
      bumpData()
      playPerfect()
      setStageDone(true)
    } else {
      await persist(idiomIdx + 1, 0)
      bumpData()
      setIdiomSplash(true)
    }
  }

  const nextIdiom = () => {
    setIdiomSplash(false)
    setIdiomIdx((i) => i + 1)
    setStep(0)
    resetForNext()
  }

  const completeStep = async () => {
    if (step + 1 >= TOTAL_STEPS) {
      await completeIdiom()
    } else {
      await persist(idiomIdx, step + 1)
      setStep((s) => s + 1)
      resetForNext()
    }
  }
  advanceStepRef.current = completeStep

  const onTraceDone = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setTraceMark(true)
    playCorrect()
    happyBuddy()
    try {
      // 進捗は代表字（ステージ配当字）に記録する
      const progress = await getProgress(profile.id, char)
      progress.traceDone++
      progress.lastSeenAt = Date.now()
      await saveProgress(progress)
      bumpData()
    } finally {
      window.setTimeout(() => {
        setTraceMark(false)
        void completeStep().finally(() => {
          busyRef.current = false
        })
      }, 750)
    }
  }

  const onWriteEvaluated = async (ev: KanjiEvaluation, strokes: InkStroke[], size: number) => {
    setEvalResult(ev)
    await saveSample(profile.id, currentChar, ev, strokes, size, 'practice')
    const progress = await getProgress(profile.id, char)
    progress.writes++
    if (ev.shapeOk && !ev.orderOk) progress.orderErrors++
    if (ev.shapeOk && !ev.directionOk) progress.directionErrors++
    if (!ev.shapeOk) progress.shapeErrors++
    progress.lastSeenAt = Date.now()
    await saveProgress(progress)
    if (ev.correctForTest) {
      playCorrect()
      happyBuddy()
    } else {
      playWrong()
    }
    bumpData()
  }

  const nextAfterFeedback = () => {
    resetForNext()
    void completeStep()
  }

  if (stageDone) {
    return (
      <div className="screen">
        <TopBar title={`${stage.label} かんりょう！`} back={{ name: 'stages' }} />
        <div className="center-panel">
          <div className="card result-main">
            <BuddyCorner mood="celebrate" size={120} message="やったね！" />
            <div className="result-score">よく がんばりました！</div>
            <div className="result-chips">
              {stage.kanji.map((k) => {
                const q = yojiQuestionOf(k)
                return <KanjiChip key={k} char={q ? questionWriteChars(q).join('') : k} state="practiced" />
              })}
            </div>
            <StarReward
              amount={GAME_CONFIG.starRewards.practiceKanji + GAME_CONFIG.starRewards.practiceStage}
              note={`ステージ ぜんぶ クリア ボーナス！（よじじゅくご1つごとに ⭐${GAME_CONFIG.starRewards.practiceKanji}も もらったよ）`}
            />
            <CoinReward amount={stage.kanji.length * GAME_CONFIG.coins.practicePerKanji} />
            <div className="result-actions">
              <Button size="lg" variant="accent" onClick={() => navigate({ name: 'stageTest', stageId })}>
                ５もんテストに ちょうせん！
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'stages' })}>
                べつのステージを えらぶ
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar
        title={`${stage.label}　${idiomIdx + 1}/${stage.kanji.length}「${idiom}」`}
        back={{ name: 'stages' }}
        right={
          <span className="row gap-sm">
            <StrictnessButton />
            <Button size="sm" variant="ghost" onClick={() => void restart()}>
              さいしょから
            </Button>
          </span>
        }
      />
      <div className="step-banner">
        {isWrite
          ? `2しゅうめ　じぶんで ぜんぶ 書こう！　${blankIdx + 1}文字目 / ${writeChars.length}`
          : `1しゅうめ　なぞって おぼえよう　${blankIdx + 1}文字目 / ${writeChars.length}`}
        <span className="round-dots">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className={`round-dot ${i < step ? 'done' : i === step ? 'now' : ''}`} />
          ))}
        </span>
      </div>
      <div className="split">
        <div className="split-left">
          <QuestionPrompt question={question} filled={blankIdx} />
          <div className="model-note card">
            {isWrite ? (
              <>
                <p>こんどは お手本なしで、よじじゅくごを 4文字 つづけて 書こう！</p>
                <p>まちがえても だいじょうぶ。なんどでも かきなおせるよ。</p>
              </>
            ) : (
              <>
                <p>よじじゅくごを 4文字 じゅんばんに なぞろう。</p>
                <p>すうじの じゅんばんに 1画ずつ なぞってね。</p>
              </>
            )}
          </div>
          {evalResult && !evalResult.correctForTest && (
            <div className={`feedback fb-${evalResult.verdict}`}>
              <div className="feedback-icon">×</div>
              <ul className="feedback-msgs">
                {evalResult.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="row gap">
                <Button onClick={resetForNext}>もういちど かく</Button>
                <Button variant="ghost" onClick={nextAfterFeedback}>
                  つぎへ すすむ
                </Button>
              </div>
            </div>
          )}
          {evalResult && evalResult.correctForTest && evalResult.verdict === 'okWithNotes' && (
            <div className="feedback fb-okWithNotes">
              <div className="feedback-icon">○</div>
              <ul className="feedback-msgs">
                {evalResult.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="row gap">
                <Button onClick={nextAfterFeedback}>つぎへ</Button>
              </div>
            </div>
          )}
          <BuddyCorner mood={buddyMood} />
        </div>
        <div className="split-right">
          {isWrite ? (
            <WritingPad
              char={currentChar}
              resetKey={`${idiom}-${step}-${attempt}`}
              onEvaluated={onWriteEvaluated}
              disabled={evalResult != null}
              overlay={
                evalResult ? (
                  evalResult.correctForTest ? (
                    <JudgeMark kind="correct" />
                  ) : (
                    <>
                      {!evalResult.shapeOk && (
                        <KanjiSvg char={currentChar} full color="#e0645f" opacity={0.4} className="ghost-overlay" />
                      )}
                      <JudgeMark kind="wrong" />
                    </>
                  )
                ) : null
              }
            />
          ) : (
            <TraceStep
              key={`${idiom}-${step}`}
              char={currentChar}
              mode="numbers"
              onDone={() => void onTraceDone()}
              disabled={traceMark}
              overlay={traceMark ? <JudgeMark kind="correct" /> : null}
            />
          )}
        </div>
      </div>
      {idiomSplash && (
        <StarSplash
          char={idiom}
          stars={GAME_CONFIG.starRewards.practiceKanji}
          coins={GAME_CONFIG.coins.practicePerKanji}
          remain={stage.kanji.length - (idiomIdx + 1)}
          nextLabel={`つぎの よじじゅくごへ（あと${stage.kanji.length - (idiomIdx + 1)}こ）`}
          onNext={nextIdiom}
        />
      )}
    </div>
  )
}
