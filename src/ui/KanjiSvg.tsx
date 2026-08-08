// お手本漢字のSVG表示。
// - full: お手本全画
// - upTo/current/showRest: なぞり練習用（確定画・現在画・残り画）
// - current の画には始点マーカー（緑の丸）と進行方向アニメーション（青い点）を表示（仕様 §9）
import { useEffect, useMemo, useRef } from 'react'
import { getRefKanji, hasRefKanji } from '../core/refdata'
import { resample } from '../core/geometry'

interface Props {
  char: string
  className?: string
  upTo?: number
  current?: number
  showRest?: boolean
  full?: boolean
  numbers?: boolean
  color?: string
  ghostColor?: string
  restColor?: string
  strokeWidth?: number
  opacity?: number
}

export function KanjiSvg({
  char,
  className,
  upTo = 0,
  current,
  showRest = false,
  full = false,
  numbers = false,
  color = '#2c3a52',
  ghostColor = '#b9c6e8',
  restColor = '#e9edf5',
  strokeWidth = 5.5,
  opacity = 1,
}: Props) {
  const ref = useMemo(() => (hasRefKanji(char) ? getRefKanji(char) : null), [char])
  const dotRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    if (!ref || full || current == null) return
    const rs = ref.strokes[current]
    if (!rs) return
    const pts = resample(rs.raw109, 60)
    let raf = 0
    const startT = performance.now()
    const loop = (t: number) => {
      const period = 1500
      // rAFの初回タイムスタンプはstartTよりわずかに過去のことがあるため、負値を正規化する
      const elapsed = (((t - startT) % period) + period) % period
      const idx = Math.min(pts.length - 1, Math.max(0, Math.floor((elapsed / period) * pts.length)))
      const p = pts[idx]
      const dot = dotRef.current
      if (dot && p) {
        dot.setAttribute('cx', String(p.x))
        dot.setAttribute('cy', String(p.y))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ref, char, current, full])

  if (!ref) return <div className={className}>?</div>
  const cur = !full && current != null ? ref.strokes[current] : null

  return (
    <svg className={className} viewBox="0 0 109 109" style={{ opacity }}>
      {ref.strokes.map((rs, i) => {
        let strokeColor: string | null = null
        if (full || i < upTo) strokeColor = color
        else if (i === current) strokeColor = ghostColor
        else if (showRest) strokeColor = restColor
        if (!strokeColor) return null
        return (
          <path
            key={i}
            d={rs.d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {cur && cur.raw109.length > 0 && (
        <>
          <circle className="pulse-dot" cx={cur.raw109[0].x} cy={cur.raw109[0].y} r={5.2} fill="#43a047" />
          <circle ref={dotRef} cx={cur.raw109[0].x} cy={cur.raw109[0].y} r={3.1} fill="#4a67d8" />
        </>
      )}
      {numbers &&
        ref.strokes.map((rs, i) => (
          <g key={`n${i}`}>
            <circle cx={rs.raw109[0].x} cy={rs.raw109[0].y} r={6.4} fill="#ffffff" opacity={0.88} />
            <text
              x={rs.raw109[0].x}
              y={rs.raw109[0].y + 2.8}
              textAnchor="middle"
              fontSize={8}
              fill="#c94f4f"
              fontWeight={700}
            >
              {i + 1}
            </text>
          </g>
        ))}
    </svg>
  )
}
