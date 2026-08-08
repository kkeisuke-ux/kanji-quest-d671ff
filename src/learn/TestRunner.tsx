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
import { questionProvider, questionWriteChars, type Question } from '../data/questions'
import { awardCoinsFor, awardStarsFor, checkMilestones } from '../game/logic'
import { playCorrect, playFinish, playPerfect, playWrong } from '../sound/sound'
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
  listTestResults,
  masteredCount,
  recordRecentVariant,
  saveTestSession,
} from '../storage/repo'
import type { TestItemRecord, TestSessionRecord } from '../storage/models'
import { BuddyCorner, type BuddyMood } from './BuddyCorner'
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { PerfectCelebration } from '../ui/Celebration'
import { CoinReward, StarReward, type CoinBreakdownItem } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
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
  // 「全部書く」問題（四字熟語）の、いま書いている空欄番号（第20回）
  const [blankIdx, setBlankIdx] = useState(0)
  const [revealChar, setRevealChar] = useState<string | null>(null)
  const [revealMark, setRevealMark] = useState(false)
  const [resultCoins, setResultCoins] = useState<{ amount: number; breakdown?: CoinBreakdownItem[] } | null>(null)
  const [resultStars, setResultStars] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [savedSession, setSavedSession] = useState<TestSessionRecord | null>(null)
  const itemsRef = useRef<TestItemRecord[]>([])
  const startMasteredRef = useRef<number | null>(null)
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
    setBlankIdx(0)
    void (async () => {
      const progress = await getProgress(profile.id, char)
      // マスター級（g10〜）のテストでは、意味説明つきの手書き問題を優先して出す（第19回）
      let picked: Question | null = null
      if (targetId.startsWith('g10')) {
        const withMeaning = (await questionProvider.getVariants(char)).filter((v) => v.meaning != null)
        if (withMeaning.length > 0) {
          const fresh = withMeaning.filter((v) => !progress.recentVariantIds.includes(v.id))
          const pool = fresh.length > 0 ? fresh : withMeaning
          picked = pool[Math.floor(Math.random() * pool.length)]
        }
      }
      if (!picked) {
        // 通常学年のテストには「全部書く」問題（四字熟語）は出さない（第20回）
        const vs = await questionProvider.getVariants(char)
        const singles = vs.filter((v) => questionWriteChars(v).length === 1)
        const basePool = singles.length > 0 ? singles : vs
        const fresh = basePool.filter((v) => !progress.recentVariantIds.includes(v.id))
        const pool = fresh.length > 0 ? fresh : basePool
        picked = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null
      }
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
    // まとめテストの「何回目か」は、今回の結果を保存する前に数える（第16回: 2回目からは半分）
    const pastTermRuns =
      kind === 'term'
        ? (await listTestResults(profile.id)).filter((r) => r.kind === 'term' && r.targetId === targetId).length
        : 0
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
      const msg = perfect
        ? `${profile.name}が ${title}で 100点を とりました！（${correct}/${finalItems.length}問）`
        : `${profile.name}が ${title}に ちょうせんしました（${correct}/${finalItems.length}問正解）`
      await addActivity(profile.id, profile.name, 'termTest', msg)
    }
    // コイン（第16回改定）:
    // - まとめテスト: 長いので点数に関わらず完走ボーナス。ミスが少ないほど多く、100点は大きい。
    //   同じテストの2回目以降は半分。
    // - ５もんテスト: 100点のときだけボーナス（従来どおり）。
    if (kind === 'term') {
      const T = GAME_CONFIG.termTest
      const misses = finalItems.length - correct
      const base = misses === 0 ? T.perfect : misses === 1 ? T.miss1 : misses === 2 ? T.miss2 : T.finish
      const half = pastTermRuns >= 1
      const amount = Math.max(1, half ? Math.floor(base * T.repeatFactor) : base)
      const label =
        (misses === 0 ? '100点ボーナス' : misses <= 2 ? `ミス${misses}こだけ ボーナス` : 'さいごまで がんばった ボーナス') +
        (half ? '（2回目からは はんぶん）' : '')
      await awardCoinsFor(profile.id, amount, label)
      setResultCoins({ amount, breakdown: [{ label, value: amount }] })
    } else if (perfect) {
      const perfectBonus = GAME_CONFIG.coins.stageTestPerfectBonus
      await awardCoinsFor(profile.id, perfectBonus, '100点ボーナス')
      setResultCoins({ amount: perfectBonus })
    } else {
      setResultCoins(null)
    }
    // スターは「がんばって完走したら」必ずもらえる。100点は多め（2026-08-08 第9回）
    const starReward = perfect
      ? kind === 'term'
        ? GAME_CONFIG.starRewards.termTestPerfect
        : GAME_CONFIG.starRewards.stageTestPerfect
      : kind === 'term'
        ? GAME_CONFIG.starRewards.termTestFinish
        : GAME_CONFIG.starRewards.stageTestFinish
    await awardStarsFor(profile.id, starReward)
    setResultStars(starReward)
    const after = await masteredCount(profile.id)
    const fresh = await getProfile(profile.id)
    if (fresh && startMasteredRef.current != null) await checkMilestones(fresh, startMasteredRef.current, after)
    bumpData()
    setPhase('done')
    // ジングルは3段階: 完了 ＜ ５もんテスト100点 ＜ まとめテスト100点
    if (perfect) {
      setBuddyMood('celebrate')
      if (kind === 'term') {
        setShowCelebration(true) // playGrandはセレブレーション側で鳴る
      } else {
        playPerfect()
      }
    } else {
      playFinish()
    }
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
      await saveSample(profile.id, currentWriteChar, ev, strokes, boxSize, 'test')
      await applyOutcome(profile.id, char, 'correct', {
        context: 'test',
        orderError: item.orderError,
        directionError: item.directionError,
        shapeError: false,
      })
      const removed = await clearUnknown(profile.id, char, kind)
      if (removed) showToast(`「${char}」が わからないリストから きえたよ！`)
      // 1文字せいかいごとに+1コイン（全部書く問題は書いた字数ぶん。第15・20回）
      await awardCoinsFor(profile.id, GAME_CONFIG.coins.testPerKanji * writeChars.length, `テスト「${char}」`)
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

  // この問題で書く字のならび（四字熟語=4字、ふつうは1字）
  const writeChars = question ? questionWriteChars(question) : [chars[index]]
  const currentWriteChar = writeChars[Math.min(blankIdx, writeChars.length - 1)] ?? chars[index]

  const handleEvaluated = (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => {
    if (mark || phase !== 'running') return
    if (ev.correctForTest) {
      if (blankIdx < writeChars.length - 1) {
        // 全部書く問題の途中の字が正解 → ○を短く見せて次の空欄へ
        void saveSample(profile.id, currentWriteChar, ev, strokes, boxSize, 'test')
        playCorrect()
        setMark('correct')
        window.setTimeout(() => {
          setMark(null)
          setWrongEval(null)
          setBlankIdx((i) => i + 1)
        }, 650)
      } else {
        void finalizeCorrect(ev, strokes, boxSize)
      }
    } else {
      // 不正解: 記録はまだ確定せず、理由を見せて書き直しできるようにする
      playWrong()
      void saveSample(profile.id, currentWriteChar, ev, strokes, boxSize, 'test')
      setWrongEval(ev)
      setTries((t) => t + 1)
    }
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
      await addUnknown(profile.id, char, 'unknown', kind)
      await persistSession(chars, index + 1, newItems)
      bumpData()
      setWrongEval(null)
      setRevealChar(currentWriteChar) // 全部書く問題では「いま書けなかった字」をなぞる
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
    }, 750)
  }

  const restartTest = async () => {
    if (kind === 'term') await deleteTestSession(profile.id, testKey)
    setResultCoins(null)
    setResultStars(0)
    setShowCelebration(false)
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
        <TopBar title={title} back={backRoute} />
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
        {showCelebration && (
          <PerfectCelebration
            title={title}
            coins={resultCoins?.amount ?? 0}
            stars={resultStars}
            breakdown={resultCoins?.breakdown}
            onClose={() => setShowCelebration(false)}
          />
        )}
        <TopBar title={`${title} けっか`} back={backRoute} />
        <div className="result-wrap">
          <div className={`card result-main ${perfect ? 'result-perfect' : ''}`}>
            {perfect && <div className="perfect-banner">👑 100点！ パーフェクト！</div>}
            <BuddyCorner mood={perfect ? 'celebrate' : 'idle'} size={100} message={perfect ? 'すごーい！' : 'よくがんばったね'} />
            <div className="result-score">
              {items.length}問中 {correct}問 せいかい！
            </div>
            <div className="result-rate">せいとうりつ {rate}%</div>
            {resultCoins && !(kind === 'term' && perfect && showCelebration) && (
              <CoinReward amount={resultCoins.amount} breakdown={resultCoins.breakdown} />
            )}
            {!(kind === 'term' && perfect && showCelebration) && (
              <StarReward amount={resultStars} note={perfect ? undefined : 'がんばって かんそうした ごほうび！'} />
            )}
            {!perfect && (
              <p className="termtest-status">
                <b>100点まで あと{items.length - correct}問！</b> もういちど ちょうせんしてみよう
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
          <div className="result-actions">
            {perfect ? (
              <Button size="lg" variant="accent" onClick={() => navigate(kind === 'stage' ? { name: 'stages' } : { name: 'home' })}>
                つぎへ！
              </Button>
            ) : (
              <>
                <Button size="lg" variant="accent" onClick={() => void restartTest()}>
                  100点に もういちど ちょうせん！
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(backRoute)}>
                  つぎへ すすむ
                </Button>
              </>
            )}
            {unknowns.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'review', source: kind })}>
                こたえを みた漢字を ふくしゅう
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'reveal') {
    const char = revealChar ?? chars[index]
    return (
      <div className="screen">
        <TopBar title={`${title}　${index + 1} / ${chars.length}`} back={backRoute} />
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
              disabled={revealMark}
              overlay={revealMark ? <JudgeMark kind="correct" /> : null}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar title={`${title}　${index + 1} / ${chars.length}`} back={backRoute} />
      <div className="split">
        <div className="split-left">
          {question ? (
            <QuestionPrompt
              question={question}
              answered={mark === 'correct' && blankIdx >= writeChars.length - 1}
              filled={blankIdx}
            />
          ) : (
            <LoadingView label="もんだいを よういちゅう…" />
          )}
          {writeChars.length > 1 && (
            <p className="test-note yoji-note">
              四字熟語を <b>ぜんぶ</b> 書こう！　いま {Math.min(blankIdx + 1, writeChars.length)}文字目 / {writeChars.length}文字
            </p>
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
              {/* ×でもパッドはすぐ書ける状態に戻っている（第12回: 正解するまで何度でも書き直せる） */}
              <p className="feedback-retry-note">そのまま もういちど かいて だいじょうぶだよ！</p>
              <div className="row gap">
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
            char={currentWriteChar}
            resetKey={`${targetId}-${index}-${blankIdx}-${tries}`}
            onEvaluated={handleEvaluated}
            disabled={mark != null}
            overlay={mark === 'correct' ? <JudgeMark kind="correct" /> : null}
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
