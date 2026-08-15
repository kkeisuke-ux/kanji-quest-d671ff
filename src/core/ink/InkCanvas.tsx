// 手書き入力キャンバス（最重要コンポーネント。仕様 §3）
// - pointerType === 'pen'（＋開発用に 'mouse'）を基本にインク化する
// - 'touch'（指・手のひら）は既定でインク化しない（palm rejection）。設定で指も許可できる
// - getCoalescedEvents() が使えるブラウザではApple Pencilの細かな軌跡を取得
// - 1画 = pointerdown → pointermove → pointerup
//
// === 2026-08-15 「ペンだと反応しない」対策（重要）=========================
// 実機iPadでペンだけ反応が悪くなる主因は、ペン使用時に手のひらが画面に触れることにある。
// 手のひらのtouchを「線にしない」だけではSafariのジェスチャ認識は動き続けるため、
// Safariがスクロール等と判断した瞬間に、書いている最中のペンに pointercancel が飛ぶ。
// そこで以下を入れている。
//   (1) ペンで書いている間は touch の既定動作を document 全体で止める（cancelを起こさせない）
//   (2) cancelされても画は捨てない。直後に同じ場所から書き直せば同じ画として継続する
//   (3) pointerdown を取りこぼしても、接触中のpointermoveを検知したら画を開始する（復帰）
//   (4) pointermove/up/cancel は window で受ける（キャプチャが外れても画が切れない）
//   (5) 筆圧が取れない/弱いときに線が細くなりすぎないようにし、指と同じ太さを基準にする
// ==========================================================================
import { useEffect, useRef } from 'react'
import type React from 'react'
import type { Pt } from '../geometry'
import { emptyDiagnostics, type InkDiagnostics, type InkPoint, type InkStroke } from './types'

/** ペンを使った直後この時間はtouchを無視する（手のひら誤爆防止） */
const PEN_LOCK_MS = 1500
/** cancel後この時間内に近くから書き直したら同じ画として継続する */
const RESUME_MS = 300
/** 上記の「近く」の距離（CSS px） */
const RESUME_DIST = 34
/** 筆圧の平滑化係数（大きいほど追従、小さいほど滑らか） */
const PRESSURE_ALPHA = 0.35
/** ペンのイベントがこの時間途切れたら「もう書いていない」とみなす（touch抑止を必ず解除する） */
const PEN_STALE_MS = 1200
/** 書きかけの画がこの時間放置されたら自動で確定させる（イベント取りこぼしでUIが固まらないための保険） */
const STROKE_WATCHDOG_MS = 2000
/** タップを絶対に邪魔しない要素（ボタン等） */
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], .btn, .card-tap, .tile, .chip, .badge, .modal-back, .modal-panel, .evo-stage, .gacha-stage'

export interface InkCanvasHandle {
  clear(): void
  undo(): InkStroke | null
  getStrokes(): InkStroke[]
  /** キャンバスの一辺（CSS px） */
  getSize(): number
}

interface Props {
  disabled?: boolean
  /** trueにするとtouchでも書ける（既定false＝指では書けない）。trueでもペン使用中はtouchを無視する */
  allowTouchInk?: boolean
  penColor?: string
  baseWidth?: number
  /** 十字リーダー付きのマス目を表示 */
  showGrid?: boolean
  /** インクの下に敷くガイド（お手本SVG等） */
  guide?: React.ReactNode
  /** インクの上に重ねるオーバーレイ（採点表示等） */
  overlay?: React.ReactNode
  onStrokeEnd?: (stroke: InkStroke, all: InkStroke[]) => void
  onInkChange?: (all: InkStroke[]) => void
  onDiag?: (diag: InkDiagnostics) => void
  inkRef?: React.MutableRefObject<InkCanvasHandle | null>
  className?: string
}

export function strokesToPts(strokes: InkStroke[]): Pt[][] {
  return strokes.map((s) => s.points.map((p) => ({ x: p.x, y: p.y })))
}

interface XY {
  x: number
  y: number
}

const mid = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function InkCanvas(props: Props) {
  const {
    disabled = false,
    allowTouchInk = false,
    penColor = '#233047',
    baseWidth = 5,
    showGrid = false,
    guide,
    overlay,
    onStrokeEnd,
    onInkChange,
    onDiag,
    inkRef,
    className,
  } = props

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const strokesRef = useRef<InkStroke[]>([])
  const currentRef = useRef<InkStroke | null>(null)
  /** cancelされて確定保留中の画（RESUME_MS以内に書き直されたら継続、されなければ確定） */
  const pendingRef = useRef<InkStroke | null>(null)
  const pendingTimerRef = useRef<number | null>(null)
  const activeIdRef = useRef<number | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const sizeRef = useRef(300)
  const nextIdRef = useRef(1)
  const diagRef = useRef<InkDiagnostics>(emptyDiagnostics())
  const diagScheduledRef = useRef(false)
  /** 直近にペンのイベントを見た時刻（performance.now基準） */
  const lastPenTsRef = useRef(-1e9)
  /** 描画用の平滑化筆圧（現在の画） */
  const emaRef = useRef(0.5)
  const watchdogRef = useRef<number | null>(null)

  const cbRef = useRef({ onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, disabled, allowTouchInk })
  cbRef.current = { onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, disabled, allowTouchInk }

  const getCtx = (): CanvasRenderingContext2D | null => {
    if (ctxRef.current) return ctxRef.current
    const canvas = canvasRef.current
    if (!canvas) return null
    ctxRef.current = canvas.getContext('2d', { desynchronized: true }) as CanvasRenderingContext2D | null
    return ctxRef.current
  }

  // ---- 描画 -------------------------------------------------------------
  // 筆圧0（＝筆圧が取れない環境）でも指と同じ太さになるようにする。
  // 極端に細くならないよう下限を持たせ、変化幅も控えめにして「かすれ」感を無くす。
  const widthFor = (pressure: number, pointerType: string): number => {
    const base = cbRef.current.baseWidth
    if (pointerType !== 'pen') return base * 1.05
    const raw = pressure > 0 ? pressure : 0.5
    const p = Math.min(1, Math.max(0.15, raw))
    return base * (0.8 + 0.5 * p)
  }

  /** 点列の筆圧をEMAで平滑化（live描画と再描画で同じ結果になるよう純関数にしている） */
  const smoothedPressures = (points: InkPoint[]): number[] => {
    const out: number[] = []
    let ema = points.length > 0 && points[0].p > 0 ? points[0].p : 0.5
    for (const pt of points) {
      const v = pt.p > 0 ? pt.p : 0.5
      ema = ema + PRESSURE_ALPHA * (v - ema)
      out.push(ema)
    }
    return out
  }

  const applyStrokeStyle = (ctx: CanvasRenderingContext2D, w: number) => {
    ctx.strokeStyle = cbRef.current.penColor
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = w
  }

  const drawLine = (ctx: CanvasRenderingContext2D, a: XY, b: XY, w: number) => {
    applyStrokeStyle(ctx, w)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  const drawCurve = (ctx: CanvasRenderingContext2D, from: XY, ctrl: XY, to: XY, w: number) => {
    applyStrokeStyle(ctx, w)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y)
    ctx.stroke()
  }

  const drawDot = (ctx: CanvasRenderingContext2D, p: InkPoint, pointerType: string) => {
    ctx.fillStyle = cbRef.current.penColor
    ctx.beginPath()
    ctx.arc(p.x, p.y, widthFor(p.p, pointerType) / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  /** 画の途中（index i の点を足した直後）を滑らかに描く */
  const drawTip = (ctx: CanvasRenderingContext2D, s: InkStroke, i: number, w: number) => {
    const pts = s.points
    if (i === 1) {
      drawLine(ctx, pts[0], mid(pts[0], pts[1]), w)
    } else if (i >= 2) {
      drawCurve(ctx, mid(pts[i - 2], pts[i - 1]), pts[i - 1], mid(pts[i - 1], pts[i]), w)
    }
  }

  /** 画を最初から最後まで描く（再描画用。liveと同じ見た目になるようにしている） */
  const drawStrokeFull = (ctx: CanvasRenderingContext2D, s: InkStroke) => {
    const pts = s.points
    if (pts.length === 0) return
    if (pts.length === 1) {
      drawDot(ctx, pts[0], s.pointerType)
      return
    }
    const ws = smoothedPressures(pts).map((p) => widthFor(p, s.pointerType))
    for (let i = 1; i < pts.length; i++) drawTip(ctx, s, i, ws[i])
    const n = pts.length
    drawLine(ctx, mid(pts[n - 2], pts[n - 1]), pts[n - 1], ws[n - 1])
  }

  const ensureTransform = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const redrawAll = () => {
    const ctx = getCtx()
    if (!ctx) return
    ensureTransform(ctx)
    ctx.clearRect(0, 0, sizeRef.current, sizeRef.current)
    for (const s of strokesRef.current) drawStrokeFull(ctx, s)
    if (pendingRef.current) drawStrokeFull(ctx, pendingRef.current)
    if (currentRef.current) drawStrokeFull(ctx, currentRef.current)
  }

  const flushDiag = () => {
    if (diagScheduledRef.current) return
    diagScheduledRef.current = true
    requestAnimationFrame(() => {
      diagScheduledRef.current = false
      cbRef.current.onDiag?.({ ...diagRef.current })
    })
  }

  // ---- 画の確定・継続 ---------------------------------------------------
  const clearPendingTimer = () => {
    if (pendingTimerRef.current != null) {
      window.clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
  }

  const commitStroke = (s: InkStroke) => {
    strokesRef.current = [...strokesRef.current, s]
    diagRef.current.strokeCount = strokesRef.current.length
    cbRef.current.onInkChange?.(strokesRef.current)
    cbRef.current.onStrokeEnd?.(s, strokesRef.current)
    flushDiag()
  }

  /** 保留中の画があれば確定する */
  const flushPending = () => {
    clearPendingTimer()
    const p = pendingRef.current
    if (!p) return
    pendingRef.current = null
    commitStroke(p)
  }

  /** 画を終える。fromCancel のときはすぐ確定せず、書き直しに備えて少しだけ保留する */
  const finishStroke = (fromCancel: boolean) => {
    clearWatchdog()
    const cur = currentRef.current
    currentRef.current = null
    activeIdRef.current = null
    const d = diagRef.current
    d.currentStrokePoints = 0
    if (!cur) return
    cur.endedAt = Date.now()
    // 最後の点まで線を伸ばす（liveでは中点までしか描いていないため）
    const ctx = getCtx()
    if (ctx && cur.points.length >= 2) {
      const pts = cur.points
      const n = pts.length
      const ws = smoothedPressures(pts).map((p) => widthFor(p, cur.pointerType))
      drawLine(ctx, mid(pts[n - 2], pts[n - 1]), pts[n - 1], ws[n - 1])
    }
    if (fromCancel) {
      d.cancelledStrokes++
      // 中身が無い（ただの接触）ものだけ捨てる。点や短い横棒は捨てない。
      if (cur.points.length === 0) {
        redrawAll()
        flushDiag()
        return
      }
      flushPending()
      pendingRef.current = cur
      clearPendingTimer()
      pendingTimerRef.current = window.setTimeout(() => {
        pendingTimerRef.current = null
        flushPending()
      }, RESUME_MS)
      flushDiag()
      return
    }
    flushPending()
    commitStroke(cur)
  }

  // ---- 座標 -------------------------------------------------------------
  const refreshRect = () => {
    const canvas = canvasRef.current
    if (canvas) rectRef.current = canvas.getBoundingClientRect()
    return rectRef.current
  }

  const toPoint = (ev: PointerEvent): InkPoint => {
    const rect = rectRef.current
    const left = rect ? rect.left : 0
    const top = rect ? rect.top : 0
    return {
      x: ev.clientX - left,
      y: ev.clientY - top,
      t: ev.timeStamp,
      p: ev.pressure,
      tiltX: ev.tiltX ?? 0,
      tiltY: ev.tiltY ?? 0,
    }
  }

  const insideCanvas = (ev: PointerEvent): boolean => {
    const rect = refreshRect()
    if (!rect) return false
    const m = 2
    return (
      ev.clientX >= rect.left - m &&
      ev.clientX <= rect.right + m &&
      ev.clientY >= rect.top - m &&
      ev.clientY <= rect.bottom + m
    )
  }

  const updateDiagFrom = (ev: PointerEvent) => {
    const d = diagRef.current
    d.lastPointerType = ev.pointerType
    d.lastPressure = ev.pressure
    d.lastTiltX = ev.tiltX ?? 0
    d.lastTiltY = ev.tiltY ?? 0
  }

  /** いまペンで実際に書いている最中か */
  const penIsDrawing = (): boolean =>
    currentRef.current?.pointerType === 'pen' && performance.now() - lastPenTsRef.current < PEN_STALE_MS

  /** ボタン・リンク等の操作要素か（ペンでボタンが押せなくなるのを防ぐため、touch抑止から必ず除外する） */
  const isInteractiveTarget = (t: EventTarget | null): boolean =>
    t instanceof Element ? t.closest(INTERACTIVE_SELECTOR) != null : false

  /** 書きかけの画がイベント途絶で残った時に自動で確定させる（UIが固まらないための保険） */
  const armWatchdog = () => {
    if (watchdogRef.current != null) window.clearTimeout(watchdogRef.current)
    watchdogRef.current = window.setTimeout(() => {
      watchdogRef.current = null
      if (currentRef.current) finishStroke(false)
    }, STROKE_WATCHDOG_MS)
  }

  const clearWatchdog = () => {
    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  // ---- 画の開始 ---------------------------------------------------------
  const beginStroke = (ev: PointerEvent, recovered: boolean) => {
    const type = ev.pointerType
    refreshRect()
    activeIdRef.current = ev.pointerId
    try {
      canvasRef.current?.setPointerCapture(ev.pointerId)
    } catch {
      // capture不可でも続行（window側で拾う）
    }
    const ctx = getCtx()
    if (ctx) ensureTransform(ctx)
    const pt = toPoint(ev)

    // cancelされた直後に同じ場所から書き直した → 同じ画の続きとして扱う
    const pending = pendingRef.current
    if (
      pending &&
      pending.pointerType === type &&
      pending.points.length > 0 &&
      Date.now() - pending.endedAt < RESUME_MS &&
      Math.hypot(pt.x - pending.points[pending.points.length - 1].x, pt.y - pending.points[pending.points.length - 1].y) <
        RESUME_DIST
    ) {
      clearPendingTimer()
      pendingRef.current = null
      currentRef.current = pending
      armWatchdog()
      diagRef.current.resumedStrokes++
      emaRef.current = smoothedPressures(pending.points)[pending.points.length - 1]
      pushPoint(ev, pt)
      return
    }

    flushPending()
    currentRef.current = {
      id: nextIdRef.current++,
      pointerType: type,
      points: [pt],
      usedCoalesced: false,
      startedAt: Date.now(),
      endedAt: 0,
    }
    emaRef.current = pt.p > 0 ? pt.p : 0.5
    armWatchdog()
    diagRef.current.currentStrokePoints = 1
    if (recovered) diagRef.current.recoveredStrokes++
    if (ctx) drawDot(ctx, pt, type)
  }

  /** 現在の画に1点足して描く */
  const pushPoint = (ev: PointerEvent, pt?: InkPoint) => {
    const cur = currentRef.current
    if (!cur) return
    const point = pt ?? toPoint(ev)
    cur.points.push(point)
    const v = point.p > 0 ? point.p : 0.5
    emaRef.current = emaRef.current + PRESSURE_ALPHA * (v - emaRef.current)
    const ctx = getCtx()
    if (ctx) drawTip(ctx, cur, cur.points.length - 1, widthFor(emaRef.current, cur.pointerType))
    armWatchdog()
    diagRef.current.currentStrokePoints = cur.points.length
  }

  // ---- リサイズ対応（正方形はCSS aspect-ratioで担保）---------------------
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const apply = () => {
      const s = Math.round(wrap.clientWidth)
      if (s <= 0) return
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = s
      if (canvas.width !== Math.round(s * dpr) || canvas.height !== Math.round(s * dpr)) {
        canvas.width = Math.round(s * dpr)
        canvas.height = Math.round(s * dpr)
        canvas.style.width = `${s}px`
        canvas.style.height = `${s}px`
        redrawAll()
      }
      refreshRect()
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    window.addEventListener('scroll', refreshRect, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', refreshRect, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 外部操作ハンドル -------------------------------------------------
  useEffect(() => {
    if (!inkRef) return
    inkRef.current = {
      clear() {
        // 確定済みストロークのみ消す。書いている最中の画は殺さない
        // （速書き時に「消去タイマー」が書きかけの画を破棄して反応しなくなる問題の対策）
        clearPendingTimer()
        pendingRef.current = null
        strokesRef.current = []
        diagRef.current.strokeCount = 0
        redrawAll()
        cbRef.current.onInkChange?.([])
        flushDiag()
      },
      undo() {
        flushPending()
        const popped = strokesRef.current.pop() ?? null
        strokesRef.current = [...strokesRef.current]
        diagRef.current.strokeCount = strokesRef.current.length
        redrawAll()
        cbRef.current.onInkChange?.(strokesRef.current)
        flushDiag()
        return popped
      },
      getStrokes() {
        // 保留中の画があれば確定してから返す（「できた！」直後の取りこぼし防止）
        flushPending()
        return strokesRef.current
      },
      getSize() {
        return sizeRef.current
      },
    }
    return () => {
      if (inkRef) inkRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inkRef])

  // ---- 入力（ネイティブリスナ）-----------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (ev: PointerEvent) => {
      if (cbRef.current.disabled) return
      const type = ev.pointerType
      updateDiagFrom(ev)
      if (type === 'pen') lastPenTsRef.current = performance.now()

      if (type === 'touch') {
        // palm rejection: 指モードOFFなら常に無視。ONでもペン使用直後は手のひらとみなして無視。
        if (!cbRef.current.allowTouchInk || performance.now() - lastPenTsRef.current < PEN_LOCK_MS) {
          diagRef.current.rejectedTouchCount++
          ev.preventDefault()
          flushDiag()
          return
        }
      }

      // ペンが下りたら、書きかけのtouch（＝手のひら）は線ごと捨てる（ペン優先）
      if (type === 'pen' && currentRef.current?.pointerType === 'touch') {
        currentRef.current = null
        activeIdRef.current = null
        diagRef.current.palmDropped++
        redrawAll()
      }

      // 前のストロークが開きっぱなし（速いペン運びでpointerupを取り逃した等）なら、
      // ここで確定させてから新しい画を始める。以前は無視していたため、
      // 一度でもupを逃すと以降のペン入力が全部効かなくなっていた（速書きで反応しない問題）。
      if (activeIdRef.current !== null) finishStroke(false)

      beginStroke(ev, false)
      ev.preventDefault()
      flushDiag()
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType === 'pen') lastPenTsRef.current = performance.now()
      const cur = currentRef.current

      if (!cur || ev.pointerId !== activeIdRef.current) {
        // pointerdownを取りこぼしたまま接触して動いている場合の復帰
        // （ペン/マウスのみ。buttons&1 が「接触している」の判定）
        if (
          !cur &&
          !cbRef.current.disabled &&
          (ev.pointerType === 'pen' || ev.pointerType === 'mouse') &&
          (ev.buttons & 1) === 1 &&
          insideCanvas(ev)
        ) {
          updateDiagFrom(ev)
          beginStroke(ev, true)
          ev.preventDefault()
          flushDiag()
          return
        }
        // 書いていない時もホバー情報だけ診断向けに更新（Apple Pencilホバー対応機で有効）
        if (ev.pointerType === 'pen') {
          updateDiagFrom(ev)
          flushDiag()
        }
        return
      }

      let events: PointerEvent[]
      if (typeof ev.getCoalescedEvents === 'function') {
        const list = ev.getCoalescedEvents()
        if (list.length > 0) {
          events = list
          cur.usedCoalesced = true
        } else {
          events = [ev]
        }
      } else {
        events = [ev]
      }
      for (const e of events) pushPoint(e)
      const d = diagRef.current
      d.lastEventPointCount = events.length
      updateDiagFrom(ev)
      ev.preventDefault()
      flushDiag()
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerType === 'pen') lastPenTsRef.current = performance.now()
      if (ev.pointerId !== activeIdRef.current) return
      // 最後の点を取り込んでから終える
      if (currentRef.current) pushPoint(ev)
      finishStroke(false)
      ev.preventDefault()
      flushDiag()
    }

    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== activeIdRef.current) return
      finishStroke(true)
      flushDiag()
    }

    // ペンで書いている間はtouchの既定動作（スクロール/ジェスチャ）を全面的に止める。
    // これをやらないと、手のひら接触でSafariがジェスチャと判断してペンをcancelする。
    const blockTouch = (ev: TouchEvent) => {
      // ボタン・リンクのタップは何があっても邪魔しない（ペンでボタンが押せなくなる不具合の対策）
      if (isInteractiveTarget(ev.target)) return
      // ペンで書いている最中だけ、手のひら等のtouchを既定動作ごと止める（cancelの根本原因を断つ）。
      // ペンのイベントが途切れて PEN_STALE_MS 経過したら penIsDrawing() は false に戻るので、
      // 万一 pointerup を取りこぼしても抑止が残り続けることはない。
      if (penIsDrawing()) {
        ev.preventDefault()
        return
      }
      // 書いていない時は、キャンバス枠内の touchmove だけ止める（スクロール誤爆の防止）
      if (ev.type === 'touchmove' && ev.target instanceof Node && wrapRef.current?.contains(ev.target) === true) {
        ev.preventDefault()
      }
    }

    const onBlur = () => {
      if (currentRef.current) finishStroke(false)
    }

    canvas.addEventListener('pointerdown', onDown, { passive: false })
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp, { passive: false })
    window.addEventListener('pointercancel', onCancel, { passive: false })
    document.addEventListener('touchstart', blockTouch, { passive: false })
    document.addEventListener('touchmove', blockTouch, { passive: false })
    window.addEventListener('blur', onBlur)

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('touchstart', blockTouch)
      document.removeEventListener('touchmove', blockTouch)
      window.removeEventListener('blur', onBlur)
      clearPendingTimer()
      clearWatchdog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={wrapRef}
      className={`ink-wrap ${className ?? ''}`}
      style={{ position: 'relative', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showGrid && (
        <svg className="ink-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="0.6" y="0.6" width="98.8" height="98.8" fill="none" stroke="#d8cfc0" strokeWidth="1.2" rx="3" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#e4dccd" strokeWidth="0.7" strokeDasharray="3 2.4" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#e4dccd" strokeWidth="0.7" strokeDasharray="3 2.4" />
        </svg>
      )}
      {guide && <div className="ink-layer">{guide}</div>}
      <canvas
        ref={canvasRef}
        className="ink-canvas"
        style={{ position: 'relative', display: 'block', width: '100%', touchAction: 'none' }}
      />
      {overlay && <div className="ink-layer ink-layer-top">{overlay}</div>}
    </div>
  )
}
