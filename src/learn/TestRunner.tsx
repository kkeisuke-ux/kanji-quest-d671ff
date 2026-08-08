// テスト実行の共通コンポーネント（2026-08-08フィードバック反映版）。
// - 漢字の出題順はランダム、文脈・熟語もランダム（直近出題は回避）
// - 不正解は×と理由を表示し、正解するまで何度でも書き直せる（認識ミス救済）
// - 「わからない」→ 答えを見て、なぞってから次へ
// - 大型テストは1問ごとに自動保存、途中再開可能
// - 全問正解（100点）でファンファーレ
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { shuffled } from '../core/geometry'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { questionProvider, type Question } from '../data/questions'
import { awardStudy, checkMilestones, type ExpGrantEvents } from '../game/logic'
import { playClear, playCorrect, playWrong } from '../sound/sound'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast, type Route } from '../state/store'
import {
  addActivity,
  addTestResult,
  addUnknown,
  applyOutcome,
  clearUnknown,
  deleteTestSession,
  getProfile,
  getProgress,
  getTestSession,
  masteredCount,
  recordRecentVariant,
  saveTestSession,
} from '../storage/repo'
import type { TestItemRecord, TestSessionRecord } from '../storage/models'
import { BuddyCorner, type BuddyMood } from './BuddyCorner'
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { JudgeMark } from '../ui/JudgeMark'
import { SoundButton } from '../ui/SoundButton'
import { QuestionPrompt } from './QuestionPrompt'
import { TraceStep } from './TraceStep'
import { WritingPad } from './WritingPad'
import { saveSample } from './sampleUtil'

export interface TestRunnerProps {
  kind: 'stage' | 'term'
  targetId: string
  chars: string[]
  title: string
  backRoute: Route
}

type Phase = 'init' | 'askResume' | 'running' | 'reveal' | 'done'

export function TestRunner({ kind, targetId, chars: baseChars, title, backRoute }: TestRunnerProps) {
  const profile = useProfile()
  const [phase, setPhase] = useState<Phase>('init')
  const [chars, setChars] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [items, setItems] = useState<TestItemRecord[]>([])
  const [question, setQuestion] = useState<Question | null>(null)
  const [wrongEval, setWrongEval] = useState<KanjiEvaluation | null>(null)
  const [tries, setTries] = useState(0)
  const [mark, setMark] = useState<'correct' | null>(null)
  const [revealMark, setRevealMark] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [savedSession, setSavedSession] = useState<TestSessionRecord | null>(null)
  const itemsRef = useRef<TestItemRecord[]>([])
  const startMasteredRef = useRef<number | null>(null)
  const evoQueueRef = useRef<ExpGrantEvents[]>([])
  const busyRef = useRef(false)
  const moodTimerRef = useRef<number | null>(null)
  const testKey = `${kind}:${targetId}`

  const setItemsBoth = (v: TestItemRecord[]) => {
    itemsRef.current = v
    setItems(v)
  }

  // 途中セッションの確認（大型テストのみ）。出題順はランダム化して開始
  useEffect(() => {
    if (!profile || phase !== 'init') return
    let alive = true
    void (async () => {
      startMasteredRef.current = await masteredCount(profile.id)
      if (kind === 'term') {
        const session = await getTestSession(profile.id, testKey)
        if (!alive) return
        if (session && session.currentIndex > 0 && session.currentIndex < session.chars.length) {
          setSavedSession(session)
          setPhase('askResume')
          return
        }
      }
      if (!alive) return
      setChars(shuffled(baseChars))
      setItemsBoth([])
      setIndex(0)
      setPhase('running')
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, phase])

  // 出題（indexごと）
  useEffect(() => {
    if (phase !== 'running' || !profile) return
    const char = chars[index]
    if (!char) return
    let alive = true
    setQuestion(null)
    setWrongEval(null)
    setTries(0)
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
  }, [phase === 'running', index, chars, profile?.id])

  useEffect(() => () => {
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
  }, [])

  if (!profile) return <LoadingView />

  const happyBuddy = (mood: BuddyMood = 'happy') => {
    setBuddyMood(mood)
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => setBuddyMood('idle'), 1800)
  }

  const resume = (fromSaved: boolean) => {
    if (fromSaved && savedSession) {
      setChars(savedSession.chars)
      setItemsBoth(savedSession.items)
      setIndex(savedSession.currentIndex)
    } else {
      if (savedSession) void deleteTestSession(profile.id, testKey)
      setChars(shuffled(baseChars))
      setItemsBoth([])
      setIndex(0)
    }
    setPhase('running')
  }

  const persistSession = async (charsNow: string[], nextIndex: number, newItems: TestItemRecord[]) => {
    if (kind !== 'term') return
    await saveTestSession({
      profileId: profile.id,
      testKey,
      kind: 'term',
      targetId,
      chars: charsNow,
      currentIndex: nextIndex,
      items: newItems,
      startedAt: savedSession?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }

  const finish = async (finalItems: TestItemRecord[]) => {
    const correct = finalItems.filter((i) => i.result === 'correct').length
    const perfect = finalItems.length > 0 && correct === finalItems.length
    await addTestResult({
      profileId: profile.id,
      kind,
      targetId,
      at: Date.now(),
      total: finalItems.length,
      correct,
      items: finalItems,
    })
    if (kind === 'term') {
      await deleteTestSession(profile.id, testKey)
      await awardStudy(profile.id, GAME_CONFIG.coins.termTestFinishBonus, 0, 'テストかんそう')
      const msg = perfect
        ? `${profile.name}が ${title}で 100てんを とりました！（${correct}/${finalItems.length}問）`
        : `${profile.name}が ${title}に ちょうせんしました（${correct}/${finalItems.length}問正解）`
      await addActivity(profile.id, profile.name, 'termTest', msg)
    }
    if (perfect) {
      // 100点スペシャルボーナス（100点を目指したくなる仕様）
      const bonus = kind === 'term' ? GAME_CONFIG.coins.termTestPerfectBonus : GAME_CONFIG.coins.stageTestPerfectBonus
      const reward = await awardStudy(profile.id, bonus, 0, '100てんボーナス')
      if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
      showToast(`100てんボーナス +${bonus}コイン！`)
    }
    const after = await masteredCount(profile.id)
    const fresh = await getProfile(profile.id)
    if (fresh && startMasteredRef.current != null) await checkMilestones(fresh, startMasteredRef.current, after)
    bumpData()
    setPhase('done')
    if (perfect) {
      playClear()
      setBuddyMood('celebrate')
    }
    const evo = evoQueueRef.current.find((e) => e.evolvedTo)
    if (evo) queueEvolutionFromEvents(evo)
  }

  const advance = (newItems: TestItemRecord[]) => {
    const nextIndex = index + 1
    if (nextIndex >= chars.length) void finish(newItems)
    else setIndex(nextIndex)
  }

  const finalizeCorrect = async (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const char = chars[index]
      const item: TestItemRecord = {
        char,
        result: 'correct',
        orderError: ev.shapeOk && !ev.orderOk,
        directionError: ev.shapeOk && !ev.directionOk,
        score: ev.score,
        retries: tries,
      }
      const newItems = [...itemsRef.current, item]
      setItemsBoth(newItems)
      setMark('correct')
      playCorrect()
      happyBuddy()
      await saveSample(profile.id, char, ev, strokes, boxSize, 'test')
      await applyOutcome(profile.id, char, 'correct', {
        context: 'test',
        orderError: item.orderError,
        directionError: item.directionError,
        shapeError: false,
      })
      const removed = await clearUnknown(profile.id, char)
      if (removed) showToast(`「${char}」が わからないリストから きえたよ！`)
      const reward = await awardStudy(
        profile.id,
        kind === 'stage' ? GAME_CONFIG.coins.stageTestPerCorrect : GAME_CONFIG.coins.termTestPerCorrect,
        GAME_CONFIG.exp.testCorrect,
        'テストせいかい'
      )
      if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
      await persistSession(chars, index + 1, newItems)
      bumpData()
      window.setTimeout(() => {
        setMark(null)
        busyRef.current = false
        advance(newItems)
      }, 1300)
    } catch (err) {
      busyRef.current = false
      throw err
    }
  }

  const handleEvaluated = (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => {
    if (mark || phase !== 'running') return
    if (ev.correctForTest) {
      void finalizeCorrect(ev, strokes, boxSize)
    } else {
      // 不正解: 記録はまだ確定せず、理由を見せて書き直しできるようにする
      playWrong()
      void saveSample(profile.id, chars[index], ev, strokes, boxSize, 'test')
      setWrongEval(ev)
      setTries((t) => t + 1)
    }
  }

  const retryWrite = () => {
    setWrongEval(null)
  }

  const handleUnknown = async () => {
    if (busyRef.current || mark) return
    busyRef.current = true
    try {
      const char = chars[index]
      const item: TestItemRecord = {
        char,
        result: 'unknown',
        orderError: false,
        directionError: false,
        score: 0,
        retries: tries,
      }
      const newItems = [...itemsRef.current, item]
      setItemsBoth(newItems)
      await applyOutcome(profile.id, char, 'unknown', { context: 'test', shapeError: true })
      await addUnknown(profile.id, char, 'unknown')
      await persistSession(chars, index + 1, newItems)
      bumpData()
      setWrongEval(null)
      setPhase('reveal') // 答えを見て、なぞってから次へ
    } finally {
      busyRef.current = false
    }
  }

  // 「こたえをみる」のなぞりにも○を出す（ただし正解にはカウントしない）
  const revealDone = () => {
    setRevealMark(true)
    playCorrect()
    window.setTimeout(() => {
      setRevealMark(false)
      setPhase('running')
      advance(itemsRef.current)
    }, 950)
  }

  const restartTest = async () => {
    if (kind === 'term') await deleteTestSession(profile.id, testKey)
    evoQueueRef.current = []
    setChars(shuffled(baseChars))
    setItemsBoth([])
    setIndex(0)
    setWrongEval(null)
    setTries(0)
    setMark(null)
    setBuddyMood('idle')
    setPhase('running')
  }

  if (phase === 'init') return <LoadingView />

  if (phase === 'askResume') {
    return (
      <div className="screen">
        <TopBar title={title} back={backRoute} right={<SoundButton />} />
        <div className="center-panel">
          <div className="card resume-card">
            <p>
              とちゅうまで やった きろくが あるよ（{savedSession?.currentIndex ?? 0} / {savedSession?.chars.length ?? 0}問）
            </p>
            <div className="row gap">
              <Button onClick={() => resume(true)}>つづきから</Button>
              <Button variant="secondary" onClick={() => resume(false)}>
                さいしょから
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = items.filter((i) => i.result === 'correct').length
    const unknowns = items.filter((i) => i.result === 'unknown')
    const orderMiss = items.filter((i) => i.orderError)
    const dirMiss = items.filter((i) => i.directionError)
    const perfect = items.length > 0 && correct === items.length
    const rate = items.length > 0 ? Math.round((correct / items.length) * 100) : 0
    return (
      <div className="screen">
        <TopBar title={`${title} けっか`} back={backRoute} right={<SoundButton />} />
        <div className="result-wrap">
          <div className={`card result-main ${perfect ? 'result-perfect' : ''}`}>
            {perfect && <div className="perfect-banner">👑 100てん！ パーフェクト！</div>}
            <BuddyCorner mood={perfect ? 'celebrate' : 'idle'} size={100} message={perfect ? 'すごーい！' : 'よくがんばったね'} />
            <div className="result-score">
              {items.length}問中 {correct}問 せいかい！
            </div>
            <div className="result-rate">せいとうりつ {rate}%</div>
            {!perfect && (
              <p className="termtest-status">
                <b>100てんまで あと{items.length - correct}もん！</b> もういちど ちょうせんしてみよう
              </p>
            )}
            <div className="result-chips">
              {items.map((i, n) => (
                <KanjiChip key={n} char={i.char} state={i.result === 'correct' ? 'mastered' : 'unknown'} />
              ))}
            </div>
          </div>
          {unknowns.length > 0 && (
            <div className="card">
              <h3>こたえを みた漢字（ふくしゅうリストに いれたよ）</h3>
              <div className="result-chips">
                {unknowns.map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="unknown" />
                ))}
              </div>
            </div>
          )}
          {orderMiss.length > 0 && (
            <div className="card">
              <h3>書き順に ちゅういの漢字（形はOK）</h3>
              <div className="result-chips">
                {orderMiss.map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="practiced" />
                ))}
              </div>
            </div>
          )}
          {dirMiss.length > 0 && (
            <div className="card">
              <h3>書く方向に ちゅういの漢字（形はOK）</h3>
              <div className="result-chips">
                {dirMiss.map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="practiced" />
                ))}
              </div>
            </div>
          )}
          <div className="row gap wrap">
            {!perfect && (
              <Button variant="accent" onClick={() => void restartTest()}>
                100てんに もういちど ちょうせん！
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(backRoute)}>
              もどる
            </Button>
            {unknowns.length > 0 && (
              <Button onClick={() => navigate({ name: 'review', mode: 'unknown' })}>わからなかった漢字を ふくしゅう</Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'reveal') {
    const char = chars[index]
    return (
      <div className="screen">
        <TopBar title={`${title}　${index + 1} / ${chars.length}`} back={backRoute} right={<SoundButton />} />
        <div className="step-banner">こたえは「{char}」。すうじの じゅんばんに なぞって おぼえよう</div>
        <div className="split">
          <div className="split-left">
            {question && <QuestionPrompt question={question} answered />}
            <div className="model-note card">
              <p>グレーの字を 1画ずつ なぞってね。</p>
              <p>なぞりおわったら ○が ついて、つぎの もんだいへ すすむよ。</p>
            </div>
            <BuddyCorner mood="idle" message="いっしょに おぼえよう" />
          </div>
          <div className="split-right">
            <TraceStep
              key={`reveal-${char}-${index}`}
              char={char}
              mode="numbers"
              onDone={revealDone}
              overlay={revealMark ? <JudgeMark kind="correct" /> : null}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar title={`${title}　${index + 1} / ${chars.length}`} back={backRoute} right={<SoundButton />} />
      <div className="split">
        <div className="split-left">
          {question ? (
            <QuestionPrompt question={question} answered={mark === 'correct'} />
          ) : (
            <LoadingView label="もんだいを よういちゅう…" />
          )}
          {!wrongEval && (
            <p className="test-note">
              お手本なしで 書いてみよう。せいかいするまで 何どでも かきなおせるよ。わからないときは「こたえを みる」！
            </p>
          )}
          {wrongEval && (
            <div className="feedback fb-wrong">
              <div className="feedback-icon">×</div>
              <ul className="feedback-msgs">
                {wrongEval.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="row gap">
                <Button onClick={retryWrite}>もういちど かく</Button>
                <Button variant="secondary" onClick={() => void handleUnknown()}>
                  こたえを みる
                </Button>
              </div>
            </div>
          )}
          <BuddyCorner mood={buddyMood} />
        </div>
        <div className="split-right">
          <WritingPad
            char={chars[index]}
            resetKey={`${targetId}-${index}-${tries}`}
            onEvaluated={handleEvaluated}
            disabled={mark != null || wrongEval != null}
            overlay={mark === 'correct' ? <JudgeMark kind="correct" /> : wrongEval ? <JudgeMark kind="wrong" /> : null}
            extraFooter={
              <Button variant="secondary" size="sm" onClick={() => void handleUnknown()} disabled={mark != null}>
                こたえを みる
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
