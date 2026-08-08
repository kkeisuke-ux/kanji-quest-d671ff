// 書き順なぞり練習（仕様 §9 + 2026-08-08フィードバック反映）。
// 3つのモード:
//   guided : 確定画は濃く、いまの画は薄く＋始点●＋方向アニメ（1回目）
//   numbers: 全画うすいグレー＋書き順の数字（2回目）
//   gray   : 全画うすいグレーのみ（3回目）
// いずれも1画ずつ正しい順で書く。判定は「きびしさ」設定を反映。
import { useEffect, useRef, useState } from 'react'
import { InkCanvas, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { judgeTraceStroke } from '../core/judge/evaluate'
import { getRefKanji, hasRefKanji } from '../core/refdata'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { playStrokePop, playWrong } from '../sound/sound'
import { KanjiSvg } from '../ui/KanjiSvg'

export type TraceMode = 'guided' | 'numbers' | 'gray'

export function TraceStep({
  char,
  mode = 'guided',
  onDone,
}: {
  char: string
  mode?: TraceMode
  onDone: () => void
}) {
  const [strokeIdx, setStrokeIdx] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const inkRef = useRef<InkCanvasHandle | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    setStrokeIdx(0)
    setHint(null)
    doneRef.current = false
    inkRef.current?.clear()
  }, [char, mode])

  const available = hasRefKanji(char)
  const ref = available ? getRefKanji(char) : null

  if (!ref) return <div className="loading-view">「{char}」のお手本データがありません</div>

  const handleStroke = (stroke: InkStroke) => {
    if (doneRef.current) return
    const ink = inkRef.current
    if (!ink) return
    const res = judgeTraceStroke(char, strokeIdx, stroke.points, ink.getSize(), getEffectiveJudgeConfig())
    if (res.ok) {
      ink.clear()
      setHint(null)
      const next = strokeIdx + 1
      if (next >= ref.strokeCount) {
        doneRef.current = true
        onDone()
      } else {
        playStrokePop()
        setStrokeIdx(next)
      }
    } else {
      playWrong()
      setHint(
        res.reversed
          ? mode === 'guided'
            ? 'はんたいむきだよ。みどりの●から かこう'
            : 'はんたいむきだよ。かきはじめの ばしょを かくにんしよう'
          : res.startTooFar
            ? mode === 'guided'
              ? 'みどりの●の ところから かきはじめよう'
              : `${strokeIdx + 1}画目の かきはじめの ばしょから かこう`
            : 'せんに そって なぞってみよう'
      )
      setShake(true)
      window.setTimeout(() => {
        ink.clear()
        setShake(false)
      }, 420)
    }
  }

  const guide =
    mode === 'guided' ? (
      <KanjiSvg
        char={char}
        upTo={strokeIdx}
        current={Math.min(strokeIdx, ref.strokeCount - 1)}
        showRest
        className="guide-svg"
      />
    ) : (
      <KanjiSvg
        char={char}
        upTo={strokeIdx}
        showRest
        restColor="#ccd4e2"
        numbers={mode === 'numbers'}
        className="guide-svg"
      />
    )

  return (
    <div className={`trace-wrap ${shake ? 'shake' : ''}`}>
      <InkCanvas
        inkRef={inkRef}
        showGrid
        allowTouchInk={getAppFlags().allowTouchInk}
        onStrokeEnd={handleStroke}
        className="pad-box"
        guide={guide}
      />
      <div className="trace-status">
        <span className="trace-count">
          {Math.min(strokeIdx + 1, ref.strokeCount)}画目 / ぜんぶで{ref.strokeCount}画
        </span>
        {hint && <span className="trace-hint">{hint}</span>}
      </div>
    </div>
  )
}
