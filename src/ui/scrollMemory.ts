// 一覧画面のスクロール位置の記憶（2026-08-14 第31回）。
// れんしゅう/テストから一覧に戻ったとき、直前に見ていた場所（例: 小4のれんしゅう5付近）を
// そのまま再表示するために使う。iPadのPWAはバックグラウンドで終了されることがあるため、
// メモリだけでなくlocalStorageにも保存して再起動後も位置を復元する。
import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'kq-scroll-memory'

function loadAll(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

const positions: Record<string, number> = loadAll()
let flushTimer: number | null = null

function save(key: string, top: number) {
  positions[key] = top
  // スクロール中の連続書き込みを避け、止まってからまとめて保存
  if (flushTimer != null) window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
    } catch {
      // 保存できなくてもメモリ内の記憶で動く
    }
  }, 250)
}

/**
 * 返ってきたrefをスクロールコンテナ（.map-scroll等）に付けると、
 * key確定時に前回のスクロール位置へ復元し、以後のスクロールを記憶する。
 * keyがnullの間（データ読込中）は何もしない。keyは画面や学年ごとに分ける。
 */
export function useScrollMemory(key: string | null) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || key == null) return
    el.scrollTop = positions[key] ?? 0
    const onScroll = () => save(key, el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [key])
  return ref
}
