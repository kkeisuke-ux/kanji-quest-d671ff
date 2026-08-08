// テスト実行の共通コンポーネント（仕様 §13, §14, §16）。
// - ステージテスト(5問)と大型テスト(期の全漢字連続)を共用
// - お手本なし・ガイドなし・即時判定・「わからない」ボタン
// - 大型テストは1問ごとに自動保存し、Safari終了後も「前回の続きから」再開できる
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { KanjiEvaluation } from '../core/judge/evaluate'
import type { InkStroke } from '../core/ink/types'
import { questionProvider, type Question } from '../data/questions'
import { awardStudy, checkMilestones, type ExpGrantEvents } from '../game/logic'
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
import { Button, KanjiChip, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { QuestionPrompt } from './QuestionPrompt'
import { WritingPad } from './WritingPad'
import { saveSample } from './sampleUtil'

export interface TestRunnerProps {
  kind: 'stage' | 'term'
  targetId: string
  chars: string[]
  title: string
  backRoute: Route
}

type Phase = 'init' | 'askResume' | 'running' | 'done'

export function TestRunner({ kind, targetId, chars, title, backRoute }: TestRunnerProps) {
  const profile = useProfile()
  const [phase, setPhase] = useState<Phase>('init')
  const [index, setIndex] = useState(0)
  const [items, setItems] = useState<TestItemRecord[]>([])
  const [question, setQuestion] = useState<Question | null>(null)
  const [flash, setFlash] = useState<'correct' | 'wrong' | 'unknown' | null>(null)
  const [savedSession, setSavedSession] = useState<TestSessionRecord | null>(null)
  const startMasteredRef = useRef<number | null>(null)
  const evoQueueRef = useRef<ExpGrantEvents[]>([])
  const busyRef = useRef(false)
  const testKey = `${kind}:${targetId}`

  // 途中セッションの確認（大型テストのみ）
  useEffect(() => {
    if (!profile || phase !== 'init') return
    let alive = true
    void (async () => {
      startMasteredRef.current = await masteredCount(profile.id)
      if (kind === 'term') {
        const session = await getTestSession(profile.id, testKey)
        if (!alive) return
        if (session && session.currentIndex > 0 && session.currentIndex < chars.length) {
          setSavedSession(session)
          setPhase('askResume')
          return
        }
      }
      if (alive) setPhase('running')
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, phase])

  // 出題
  useEffect(() => {
    if (phase !== 'running' || !profile) return
    const char = chars[index]
    if (!char) return
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
  }, [phase, index, profile?.id])

  if (!profile) return <LoadingView />

  const resume = (fromSaved: boolean) => {
    if (fromSaved && savedSession) {
      setItems(savedSession.items)
      setIndex(savedSession.currentIndex)
    } else {
      setItems([])
      setIndex(0)
      if (savedSession) void deleteTestSession(profile.id, testKey)
    }
    setPhase('running')
  }

  const persistSession = async (nextIndex: number, newItems: TestItemRecord[]) => {
    if (kind !== 'term') return
    await saveTestSession({
      profileId: profile.id,
      testKey,
      kind: 'term',
      targetId,
      chars,
      currentIndex: nextIndex,
      items: newItems,
      startedAt: savedSession?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }

  const finish = async (finalItems: TestItemRecord[]) => {
    const correct = finalItems.filter((i) => i.result === 'correct').length
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
      const rate = finalItems.length > 0 ? correct / finalItems.length : 0
      const msg =
        rate >= 0.8
          ? `${profile.name}が ${title}をクリアしました（${correct}/${finalItems.length}問正解）`
          : `${profile.name}が ${title}にちょうせんしました（${correct}/${finalItems.length}問正解）`
      await addActivity(profile.id, profile.name, 'termTest', msg)
    }
    const after = await masteredCount(profile.id)
    const fresh = await getProfile(profile.id)
    if (fresh && startMasteredRef.current != null) await checkMilestones(fresh, startMasteredRef.current, after)
    bumpData()
    setPhase('done')
    const evo = evoQueueRef.current.find((e) => e.evolvedTo)
    if (evo) queueEvolutionFromEvents(evo)
  }

  const advance = (newItems: TestItemRecord[]) => {
    const nextIndex = index + 1
    if (nextIndex >= chars.length) void finish(newItems)
    else setIndex(nextIndex)
  }

  const process = async (
    item: TestItemRecord,
    ev: KanjiEvaluation | null,
    strokes: InkStroke[] | null,
    boxSize: number
  ) => {
    if (busyRef.current) return
    busyRef.current = true
    const newItems = [...items, item]
    setItems(newItems)
    setFlash(item.result)
    try {
      if (ev && strokes) await saveSample(profile.id, item.char, ev, strokes, boxSize, 'test')
      await applyOutcome(profile.id, item.char, item.result, {
        context: 'test',
        orderError: item.orderError,
        directionError: item.directionError,
        shapeError: ev ? !ev.shapeOk : item.result !== 'correct',
      })
      if (item.result === 'correct') {
        // 正式なテストで正解 → わからないリストから自動解除（仕様 §15）
        const removed = await clearUnknown(profile.id, item.char)
        if (removed) showToast(`「${item.char}」が わからないリストから きえたよ！`)
        const reward = await awardStudy(
          profile.id,
          kind === 'stage' ? GAME_CONFIG.coins.stageTestPerCorrect : GAME_CONFIG.coins.termTestPerCorrect,
          GAME_CONFIG.exp.testCorrect,
          'テストせいかい'
        )
        if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
      } else {
        await addUnknown(profile.id, item.char, item.result === 'unknown' ? 'unknown' : 'wrong')
      }
      await persistSession(index + 1, newItems)
      bumpData()
    } finally {
      window.setTimeout(() => {
        setFlash(null)
        busyRef.current = false
        advance(newItems)
      }, 900)
    }
  }

  const handleEvaluated = (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => {
    void process(
      {
        char: chars[index],
        result: ev.correctForTest ? 'correct' : 'wrong',
        orderError: ev.shapeOk && !ev.orderOk,
        directionError: ev.shapeOk && !ev.directionOk,
        score: ev.score,
      },
      ev,
      strokes,
      boxSize
    )
  }

  const handleUnknown = () => {
    if (busyRef.current || flash) return
    void process({ char: chars[index], result: 'unknown', orderError: false, directionError: false, score: 0 }, null, null, 0)
  }

  if (phase === 'init') return <LoadingView />

  if (phase === 'askResume') {
    return (
      <div className="screen">
        <TopBar title={title} back={backRoute} />
        <div className="center-panel">
          <div className="card resume-card">
            <p>
              とちゅうまで やった きろくが あるよ（{savedSession?.currentIndex ?? 0} / {chars.length}問）
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
    const wrongs = items.filter((i) => i.result === 'wrong')
    const unknowns = items.filter((i) => i.result === 'unknown')
    const orderMiss = items.filter((i) => i.orderError)
    const dirMiss = items.filter((i) => i.directionError)
    const rate = items.length > 0 ? Math.round((correct / items.length) * 100) : 0
    return (
      <div className="screen">
        <TopBar title={`${title} けっか`} back={backRoute} />
        <div className="result-wrap">
          <div className="card result-main">
            <div className="result-score">
              {items.length}問中 {correct}問 せいかい！
            </div>
            <div className="result-rate">せいとうりつ {rate}%</div>
            <div className="result-chips">
              {items.map((i, n) => (
                <KanjiChip key={n} char={i.char} state={i.result === 'correct' ? 'mastered' : 'unknown'} />
              ))}
            </div>
          </div>
          {(wrongs.length > 0 || unknowns.length > 0) && (
            <div className="card">
              <h3>わからなかった・まちがえた漢字</h3>
              <div className="result-chips">
                {[...unknowns, ...wrongs].map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="unknown" />
                ))}
              </div>
            </div>
          )}
          {orderMiss.length > 0 && (
            <div className="card">
              <h3>書き順ミスがあった漢字（形はOK）</h3>
              <div className="result-chips">
                {orderMiss.map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="practiced" />
                ))}
              </div>
            </div>
          )}
          {dirMiss.length > 0 && (
            <div className="card">
              <h3>書く方向ミスがあった漢字（形はOK）</h3>
              <div className="result-chips">
                {dirMiss.map((i, n) => (
                  <KanjiChip key={n} char={i.char} state="practiced" />
                ))}
              </div>
            </div>
          )}
          <div className="row gap">
            <Button variant="secondary" onClick={() => navigate(backRoute)}>
              もどる
            </Button>
            {(wrongs.length > 0 || unknowns.length > 0) && (
              <Button onClick={() => navigate({ name: 'review', mode: 'unknown' })}>わからなかった漢字を ふくしゅう</Button>
            )}
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
            <QuestionPrompt question={question} answered={flash === 'correct'} />
          ) : (
            <LoadingView label="もんだいを よういちゅう…" />
          )}
          <p className="test-note">お手本なしで 書いてみよう。わからないときは「わからない」でOK！</p>
        </div>
        <div className="split-right">
          <WritingPad
            char={chars[index]}
            resetKey={`${targetId}-${index}`}
            onEvaluated={handleEvaluated}
            disabled={flash != null}
            overlay={
              flash && (
                <div className={`judge-flash flash-${flash}`}>
                  {flash === 'correct' ? '○' : flash === 'wrong' ? '×' : '→'}
                </div>
              )
            }
            extraFooter={
              <Button variant="secondary" size="sm" onClick={handleUnknown} disabled={flash != null}>
                わからない
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
