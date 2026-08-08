// わからなかった漢字のふくしゅう（2026-08-08 第6回フィードバックで刷新）。
// - ５もんテスト由来／まとめテスト由来で別々にふくしゅうする
// - 1文字につき4回: ①書き順アシスト → ②書き順の数字＋グレー → ③グレーのみ → ④何もなしで書く
// - 1文字おわるごとに「つぎの漢字を ふくしゅうする」ボタン
// - リストから消えるのは、その出どころのテストで正解したときだけ（復習では消えない）
import { useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { hasRefKanji } from '../core/refdata'
import { findStageOfChar } from '../data/curriculum'
import { awardCoinsFor } from '../game/logic'
import { BuddyCorner } from '../learn/BuddyCorner'
import { TraceStep, type TraceMode } from '../learn/TraceStep'
import { UsageExamples } from '../learn/UsageExamples'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { playCoins, playCorrect, playWrong } from '../sound/sound'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { clearUnknown, listUnknown, markUnknownReviewed } from '../storage/repo'
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { CoinReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { KanjiSvg } from '../ui/KanjiSvg'

const ROUNDS: ('guided' | 'numbers' | 'gray' | 'write')[] = ['guided', 'numbers', 'gray', 'write']

const ROUND_LABELS = [
  '1かいめ　かきじゅんを なぞろう',
  '2かいめ　すうじの じゅんばんに なぞろう',
  '3かいめ　うすい字を なぞろう',
  '4かいめ　なにも見ないで かこう',
]

export function Review({ source, chars: charsParam }: { source: 'stage' | 'term'; chars?: string[] }) {
  const profileId = useAppState((s) => s.profileId)
  const [index, setIndex] = useState(0)
  const [round, setRound] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [traceMark, setTraceMark] = useState(false)
  const [phase, setPhase] = useState<'practice' | 'charDone' | 'allDone'>('practice')

  const { data: list } = useAsyncData(async () => {
    if (!profileId) return null
    if (charsParam && charsParam.length > 0) return charsParam.filter((c) => hasRefKanji(c))
    return (await listUnknown(profileId, source)).map((u) => u.char).filter((c) => hasRefKanji(c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, source])

  if (!profileId || !list) return <LoadingView />

  const title = source === 'stage' ? '５もんテストの ふくしゅう' : 'まとめテストの ふくしゅう'
  const char = list[index]

  if (list.length === 0 || !char) {
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'unknownList' }} />
        <div className="center-panel">
          <div className="card result-main">
            <p className="result-score">ふくしゅうする漢字は ないよ！</p>
            <Button onClick={() => navigate({ name: 'unknownList' })}>もどる</Button>
          </div>
        </div>
      </div>
    )
  }

  const completeChar = async () => {
    await markUnknownReviewed(profileId, char)
    // ふくしゅうを やりきったら リストから消す（第12回: テスト正解を待たずに解除）
    await clearUnknown(profileId, char, source)
    await awardCoinsFor(profileId, GAME_CONFIG.coins.reviewPerCorrect, `ふくしゅう「${char}」`)
    playCoins()
    showToast(`「${char}」ふくしゅうかんりょう！`)
    bumpData()
    setPhase(index + 1 >= list.length ? 'allDone' : 'charDone')
  }

  const nextRound = () => {
    setEvalResult(null)
    setAttempt((a) => a + 1)
    if (round + 1 >= ROUNDS.length) {
      void completeChar()
    } else {
      setRound((r) => r + 1)
    }
  }

  const onTraceDone = () => {
    setTraceMark(true)
    playCorrect()
    window.setTimeout(() => {
      setTraceMark(false)
      nextRound()
    }, 750)
  }

  const onWriteEvaluated = async (ev: KanjiEvaluation, strokes: InkStroke[], size: number) => {
    setEvalResult(ev)
    await saveSample(profileId, char, ev, strokes, size, 'review')
    if (ev.correctForTest) {
      playCorrect()
      window.setTimeout(() => nextRound(), 1200)
    } else {
      playWrong()
    }
  }

  const gotoNextChar = () => {
    setIndex((i) => i + 1)
    setRound(0)
    setEvalResult(null)
    setAttempt((a) => a + 1)
    setPhase('practice')
  }

  // 復習した漢字が入っているテストへすぐ行けるボタン（2026-08-08 第7回）
  const testJumpButton = (forChar: string, big = false) => {
    const hit = findStageOfChar(forChar)
    if (!hit) return null
    if (source === 'stage') {
      return (
        <Button
          size={big ? 'lg' : 'sm'}
          variant={big ? 'accent' : 'secondary'}
          onClick={() => navigate({ name: 'stageTest', stageId: hit.stage.id })}
        >
          「{forChar}」が でる ５もんテストを うける
        </Button>
      )
    }
    return (
      <Button
        size={big ? 'lg' : 'sm'}
        variant={big ? 'accent' : 'secondary'}
        onClick={() => navigate({ name: 'termTest', termId: hit.term.id })}
      >
        「{forChar}」が でる まとめテストを うける
      </Button>
    )
  }

  if (phase === 'allDone') {
    const lastChar = list[list.length - 1]
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'unknownList' }} />
        <div className="center-panel">
          <div className="card result-main">
            <BuddyCorner mood="celebrate" size={110} message="よくがんばったね！" />
            <div className="result-score">ぜんぶ ふくしゅう できた！</div>
            <div className="result-chips">
              {list.map((k) => (
                <KanjiChip key={k} char={k} state="practiced" />
              ))}
            </div>
            <CoinReward amount={GAME_CONFIG.coins.reviewPerCorrect} />
            <p className="tile-sub">ふくしゅうした漢字は リストから きえたよ！ こんどは テストで 100点に ちょうせんしよう！</p>
            <div className="result-actions">
              {testJumpButton(lastChar, true)}
              <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'unknownList' })}>
                リストに もどる
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'charDone') {
    const nextChar = list[index + 1]
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'unknownList' }} />
        <div className="center-panel">
          <div className="card result-main">
            <div className="result-score">「{char}」の ふくしゅう おわり！</div>
            <p className="tile-sub">「{char}」は リストから きえたよ！</p>
            <CoinReward amount={GAME_CONFIG.coins.reviewPerCorrect} />
            <div className="result-actions">
              <Button size="lg" variant="accent" onClick={gotoNextChar}>
                つぎの漢字「{nextChar}」を ふくしゅうする（あと{list.length - index - 1}字）
              </Button>
              {testJumpButton(char)}
              <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'unknownList' })}>
                きょうは ここまで
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const roundKind = ROUNDS[round]
  const isWrite = roundKind === 'write'

  return (
    <div className="screen">
      <TopBar title={`${title}　「${char}」（${index + 1}/${list.length}字）`} back={{ name: 'unknownList' }} />
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
            <p>{isWrite ? 'おもいだして かいてみよう。' : 'ガイドに そって なぞろう。'}</p>
          </div>
          <UsageExamples char={char} />
          {evalResult && !evalResult.correctForTest && (
            <div className="feedback fb-wrong">
              <div className="feedback-icon">×</div>
              <ul className="feedback-msgs">
                {evalResult.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="row gap">
                <Button
                  onClick={() => {
                    setEvalResult(null)
                    setAttempt((a) => a + 1)
                  }}
                >
                  もういちど かく
                </Button>
                <Button variant="ghost" onClick={nextRound}>
                  つぎへ すすむ
                </Button>
              </div>
            </div>
          )}
          <BuddyCorner mood={traceMark || evalResult?.correctForTest ? 'happy' : 'idle'} />
        </div>
        <div className="split-right">
          {isWrite ? (
            <WritingPad
              char={char}
              resetKey={`${char}-w-${attempt}`}
              onEvaluated={onWriteEvaluated}
              disabled={evalResult != null}
              overlay={
                evalResult ? (
                  evalResult.correctForTest ? (
                    <JudgeMark kind="correct" />
                  ) : (
                    <>
                      {!evalResult.shapeOk && <KanjiSvg char={char} full color="#e0645f" opacity={0.4} className="ghost-overlay" />}
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
              mode={roundKind as TraceMode}
              onDone={onTraceDone}
              disabled={traceMark}
              overlay={traceMark ? <JudgeMark kind="correct" /> : null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
