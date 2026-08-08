// 書き順なぞり練習（仕様 §9）。
// 次に書くstrokeを薄く表示し、始点の緑丸＋進行方向アニメーションで誘導する。
// 正しくなぞれたら確定して次のstrokeへ。間違えたら短いヒントと再提示。
import { useEffect, useRef, useState } from 'react'
import { InkCanvas, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { judgeTraceStroke } from '../core/judge/evaluate'
import { getRefKanji, hasRefKanji } from '../core/refdata'
import { getJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { KanjiSvg } from '../ui/KanjiSvg'

export function TraceStep({ char, onDone }: { char: string; onDone: () => void }) {
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
  }, [char])

  const available = hasRefKanji(char)
  const ref = available ? getRefKanji(char) : null

  if (!ref) return <div className="loading-view">「{char}」のお手本データがありません</div>

  const handleStroke = (stroke: InkStroke) => {
    if (doneRef.current) return
    const ink = inkRef.current
    if (!ink) return
    const res = judgeTraceStroke(char, strokeIdx, stroke.points, ink.getSize(), getJudgeConfig())
    if (res.ok) {
      ink.clear()
      setHint(null)
      const next = strokeIdx + 1
      if (next >= ref.strokeCount) {
        doneRef.current = true
        onDone()
      } else {
        setStrokeIdx(next)
      }
    } else {
      setHint(
        res.reversed
          ? 'はんたいむきだよ。みどりの●から かこう'
          : res.startTooFar
            ? 'みどりの●の ところから かきはじめよう'
            : 'うすい線に そって なぞってみよう'
      )
      setShake(true)
      window.setTimeout(() => {
        ink.clear()
        setShake(false)
      }, 420)
    }
  }

  return (
    <div className={`trace-wrap ${shake ? 'shake' : ''}`}>
      <InkCanvas
        inkRef={inkRef}
        showGrid
        allowTouchInk={getAppFlags().allowTouchInk}
        onStrokeEnd={handleStroke}
        className="pad-box"
        guide={
          <KanjiSvg
            char={char}
            upTo={strokeIdx}
            current={Math.min(strokeIdx, ref.strokeCount - 1)}
            showRest
            className="guide-svg"
          />
        }
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
