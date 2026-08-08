// 自由筆記用の手書きパッド。画数が揃うと自動判定（少し待つ）、
// 「できた！」ボタンでいつでも判定できる。undo/clearつき。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { evaluateKanji, type KanjiEvaluation } from '../core/judge/evaluate'
import { getRefKanji, hasRefKanji } from '../core/refdata'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { Button } from '../ui/components'

export interface WritingPadProps {
  char: string
  /** 変わるとキャンバスをリセット */
  resetKey: string | number
  onEvaluated: (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => void
  disabled?: boolean
  /** キャンバス上に重ねる表示（判定結果など） */
  overlay?: ReactNode
  /** フッターに追加するボタン（わからない等） */
  extraFooter?: ReactNode
}

export function WritingPad({ char, resetKey, onEvaluated, disabled = false, overlay, extraFooter }: WritingPadProps) {
  const inkRef = useRef<InkCanvasHandle | null>(null)
  const [strokeCount, setStrokeCount] = useState(0)
  const [judged, setJudged] = useState(false)
  const judgedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const cfg = getEffectiveJudgeConfig()
  const refCount = hasRefKanji(char) ? getRefKanji(char).strokeCount : 0

  const cancelTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    inkRef.current?.clear()
    setJudged(false)
    judgedRef.current = false
    setStrokeCount(0)
    cancelTimer()
    return cancelTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, char])

  const judgeNow = () => {
    if (judgedRef.current || disabled) return
    const ink = inkRef.current
    if (!ink) return
    const strokes = ink.getStrokes()
    if (strokes.length === 0) return
    cancelTimer()
    judgedRef.current = true
    setJudged(true)
    const ev = evaluateKanji(char, strokesToPts(strokes), ink.getSize(), cfg)
    onEvaluated(ev, strokes, ink.getSize())
  }

  const handleInkChange = (all: InkStroke[]) => {
    setStrokeCount(all.length)
    cancelTimer()
    if (!judgedRef.current && !disabled && refCount > 0 && all.length >= refCount) {
      timerRef.current = window.setTimeout(judgeNow, cfg.scoring.autoJudgeDelayMs)
    }
  }

  return (
    <div className="writing-pad">
      <InkCanvas
        inkRef={inkRef}
        showGrid
        disabled={disabled || judged}
        allowTouchInk={getAppFlags().allowTouchInk}
        onInkChange={handleInkChange}
        overlay={overlay}
        className="pad-box"
      />
      <div className="pad-footer">
        <Button variant="ghost" size="sm" onClick={() => !judged && inkRef.current?.undo()} disabled={judged || strokeCount === 0}>
          １かくけす
        </Button>
        <Button variant="ghost" size="sm" onClick={() => !judged && inkRef.current?.clear()} disabled={judged || strokeCount === 0}>
          ぜんぶけす
        </Button>
        <Button variant="primary" size="sm" onClick={judgeNow} disabled={judged || disabled || strokeCount === 0}>
          できた！
        </Button>
        {extraFooter}
      </div>
    </div>
  )
}
