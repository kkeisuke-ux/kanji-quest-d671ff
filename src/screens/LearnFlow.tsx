// 学習フロー（2026-08-08フィードバック反映版）:
// 1漢字につき5回書く。
//   1回目: 書き順ガイドつきなぞり（始点●・方向アニメ）
//   2回目: うすいグレー＋書き順の数字でなぞり
//   3回目: うすいグレーのみでなぞり
//   4・5回目: 自分で書く
// 途中でやめても同じ場所から再開できる（practiceSessionsに自動保存）。
// バディが画面に常駐し、正解すると一緒に喜ぶ。
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { findStage } from '../data/curriculum'
import { awardCoinsFor } from '../game/logic'
import { BuddyCorner, type BuddyMood } from '../learn/BuddyCorner'
import { TraceStep, type TraceMode } from '../learn/TraceStep'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { playCoins, playCorrect, playPerfect, playWrong } from '../sound/sound'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast } from '../state/store'
import {
  addActivity,
  deletePracticeSession,
  getPracticeSession,
  getProgress,
  savePracticeSession,
  saveProgress,
} from '../storage/repo'
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { CoinReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { KanjiSvg } from '../ui/KanjiSvg'
import { StrictnessButton } from '../ui/StrictnessButton'

type RoundKind = 'trace-guided' | 'trace-numbers' | 'trace-gray' | 'write'

const ROUNDS: RoundKind[] = ['trace-guided', 'trace-numbers', 'trace-gray', 'write', 'write']

const ROUND_LABELS = [
  '1かいめ　かきじゅんを おぼえよう',
  '2かいめ　すうじの じゅんばんに なぞろう',
  '3かいめ　うすい字を なぞろう',
  '4かいめ　じぶんで かこう',
  '5かいめ　じぶんで かこう（さいご！）',
]

const ROUND_HINTS = [
  ['うすい線を じゅんばんに なぞってね。', 'みどりの●が かきはじめ、あおい点が すすむ ほうこうだよ。'],
  ['こんどは すうじだけが ヒント。', 'すうじの じゅんばんに 1画ずつ なぞろう。'],
  ['ヒントは うすい字だけ！', 'かきじゅんを おもいだしながら なぞろう。'],
  ['なにも見ないで かいてみよう。', 'まちがえても だいじょうぶ！'],
  ['さいごの1かい！', 'じしんを もって かこう。'],
]

export function LearnFlow({ stageId }: { stageId: string; startIndex?: number }) {
  const profile = useProfile()
  const found = findStage(stageId)
  const [loaded, setLoaded] = useState(false)
  const [kanjiIdx, setKanjiIdx] = useState(0)
  const [round, setRound] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [stageDone, setStageDone] = useState(false)
  const [traceMark, setTraceMark] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const busyRef = useRef(false)
  const moodTimerRef = useRef<number | null>(null)
  const advanceRoundRef = useRef<() => Promise<void>>(async () => {})

  const stage = found?.stage
  const char = stage?.kanji[kanjiIdx]

  // 途中保存の復元（初回のみ）
  useEffect(() => {
    if (!profile || !stage || loaded) return
    let alive = true
    void (async () => {
      const session = await getPracticeSession(profile.id, stageId)
      if (!alive) return
      if (session && session.kanjiIdx < stage.kanji.length && (session.kanjiIdx > 0 || session.round > 0)) {
        setKanjiIdx(session.kanjiIdx)
        setRound(Math.min(session.round, ROUNDS.length - 1))
        showToast(`とちゅうから さいかい！（${session.kanjiIdx + 1}文字目）`)
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

  // ◎（かんぺき）は自動で次へ。
  // 注意: フックはearly returnより前に置くこと（React #310対策）。
  useEffect(() => {
    if (!evalResult || evalResult.verdict !== 'perfect') return
    const t = window.setTimeout(() => {
      setEvalResult(null)
      setAttempt((a) => a + 1)
      void advanceRoundRef.current()
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

  const happyBuddy = () => {
    setBuddyMood('happy')
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => setBuddyMood('idle'), 1800)
  }

  const resetForNext = () => {
    setEvalResult(null)
    setAttempt((a) => a + 1)
  }

  const persist = (nextKanjiIdx: number, nextRound: number) =>
    savePracticeSession({ profileId: profile.id, stageId, kanjiIdx: nextKanjiIdx, round: nextRound, updatedAt: Date.now() })

  const restart = async () => {
    await deletePracticeSession(profile.id, stageId)
    setKanjiIdx(0)
    setRound(0)
    resetForNext()
    showToast('さいしょから はじめるよ')
  }

  const completeKanji = async () => {
    const progress = await getProgress(profile.id, char)
    progress.practicedAt = Date.now()
    await saveProgress(progress)
    // 1文字れんしゅうかんりょう → +10コイン（画面アクションで分かるように音＋トースト）
    await awardCoinsFor(profile.id, GAME_CONFIG.coins.practicePerKanji, `れんしゅう「${char}」`)
    playCoins()
    showToast(`「${char}」かんりょう！ +${GAME_CONFIG.coins.practicePerKanji}コイン`)
    if (kanjiIdx + 1 >= stage.kanji.length) {
      await deletePracticeSession(profile.id, stageId)
      await addActivity(profile.id, profile.name, 'stageClear', `${profile.name}が ${stage.label}の れんしゅうを おえました`)
      bumpData()
      playPerfect()
      setStageDone(true)
    } else {
      await persist(kanjiIdx + 1, 0)
      bumpData()
      setKanjiIdx((i) => i + 1)
      setRound(0)
      resetForNext()
    }
  }

  const completeRound = async () => {
    if (round + 1 >= ROUNDS.length) {
      await completeKanji()
    } else {
      await persist(kanjiIdx, round + 1)
      setRound((r) => r + 1)
      resetForNext()
    }
  }
  advanceRoundRef.current = completeRound

  const onTraceDone = async () => {
    if (busyRef.current) return
    busyRef.current = true
    // なぞりでも大きな○＋ピンポーン（2026-08-08フィードバック）
    setTraceMark(true)
    playCorrect()
    happyBuddy()
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
      bumpData()
    } finally {
      window.setTimeout(() => {
        setTraceMark(false)
        void completeRound().finally(() => {
          busyRef.current = false
        })
      }, 950)
    }
  }

  const onWriteEvaluated = async (ev: KanjiEvaluation, strokes: InkStroke[], size: number) => {
    setEvalResult(ev)
    await saveSample(profile.id, char, ev, strokes, size, 'practice')
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
    void completeRound()
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
              {stage.kanji.map((k) => (
                <KanjiChip key={k} char={k} state="practiced" />
              ))}
            </div>
            <CoinReward amount={stage.kanji.length * GAME_CONFIG.coins.practicePerKanji} />
            <div className="result-actions">
              <Button size="lg" variant="accent" onClick={() => navigate({ name: 'stageTest', stageId })}>
                ５もんテストに ちょうせん！
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'stages' })}>
                もどる
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const roundKind = ROUNDS[round]
  const isWrite = roundKind === 'write'
  const traceMode: TraceMode = roundKind === 'trace-guided' ? 'guided' : roundKind === 'trace-numbers' ? 'numbers' : 'gray'

  return (
    <div className="screen">
      <TopBar
        title={`${stage.label}　${kanjiIdx + 1}/${stage.kanji.length}「${char}」`}
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
        {ROUND_LABELS[round]}
        <span className="round-dots">
          {ROUNDS.map((_, i) => (
            <span key={i} className={`round-dot ${i < round ? 'done' : i === round ? 'now' : ''}`} />
          ))}
        </span>
      </div>
      <div className="split">
        <div className="split-left">
          <div className="model-note card">
            {ROUND_HINTS[round].map((h, i) => (
              <p key={i}>
                {round === 0 && i === 1 ? (
                  <>
                    <span className="dot-green">●</span>が かきはじめ、<span className="dot-blue">●</span>が すすむ ほうこうだよ。
                  </>
                ) : (
                  h
                )}
              </p>
            ))}
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
              char={char}
              resetKey={`${char}-${round}-${attempt}`}
              onEvaluated={onWriteEvaluated}
              disabled={evalResult != null}
              overlay={
                evalResult ? (
                  evalResult.correctForTest ? (
                    <JudgeMark kind="correct" />
                  ) : (
                    <>
                      {/* 形もちがう時だけ正しい形を重ねる（書き順ミスのみの時は×だけ） */}
                      {!evalResult.shapeOk && (
                        <KanjiSvg char={char} full color="#e0645f" opacity={0.4} className="ghost-overlay" />
                      )}
                      <JudgeMark kind="wrong" />
                    </>
                  )
                ) : null
              }
            />
          ) : (
            <TraceStep
              key={`${char}-${round}`}
              char={char}
              mode={traceMode}
              onDone={() => void onTraceDone()}
              overlay={traceMark ? <JudgeMark kind="correct" /> : null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
