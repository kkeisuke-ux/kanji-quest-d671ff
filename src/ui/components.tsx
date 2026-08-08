// 共通UIコンポーネント。
import type { ReactNode } from 'react'
import { navigate, useAppState, type Route } from '../state/store'
import { expToNext } from '../game/logic'

export function TopBar({ title, back, right }: { title: string; back?: Route; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <button className="btn btn-ghost btn-back" onClick={() => navigate(back)}>
          ← もどる
        </button>
      ) : (
        <span className="btn-back-space" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card ${onClick ? 'card-tap' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#f2c33c" stroke="#d9a520" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.2" fill="none" stroke="#d9a520" strokeWidth="1.6" />
    </svg>
  )
}

export function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.3l-5.8 3 1.1-6.4L2.6 9.3l6.5-.9z"
        fill="#f7d154"
        stroke="#d9a520"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CoinBadge({ coins }: { coins: number }) {
  return (
    <span className="badge">
      <CoinIcon />
      <span>{coins}</span>
    </span>
  )
}

export function StarBadge({ stars }: { stars: number }) {
  return (
    <span className="badge">
      <StarIcon />
      <span>{stars}</span>
    </span>
  )
}

export function Toasts() {
  const toasts = useAppState((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function LoadingView({ label = 'よみこみちゅう…' }: { label?: string }) {
  return <div className="loading-view">{label}</div>
}

export type KanjiChipState = 'none' | 'practiced' | 'mastered' | 'unknown'

export function KanjiChip({ char, state = 'none', onClick }: { char: string; state?: KanjiChipState; onClick?: () => void }) {
  return (
    <span className={`kanji-chip chip-${state} ${onClick ? 'chip-tap' : ''}`} onClick={onClick}>
      {char}
    </span>
  )
}

export function ExpBar({ level, exp }: { level: number; exp: number }) {
  const need = expToNext(level)
  const pct = Math.min(100, Math.round((exp / need) * 100))
  return (
    <div className="expbar" title={`${exp}/${need}`}>
      <div className="expbar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title">{children}</h2>
}
