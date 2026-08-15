// 共通UIコンポーネント。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { navigate, useAppState, type Route } from '../state/store'
import { perfectStageIds, perfectTermTestIds, stageClearLevelLabel } from '../data/curriculum'
import { getSpecies } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { getOwned, getProfile, listTestResults } from '../storage/repo'
import { RankChip, RankListModal } from './RankBadge'
import { SoundButton } from './SoundButton'

/** コイン・スター・称号・バディレベルの常設表示（全画面のTopBarに出る。仕様追加 2026-08-08、称号は第41回） */
export function StatusChips() {
  const profileId = useAppState((s) => s.profileId)
  const [showRanks, setShowRanks] = useState(false)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const p = await getProfile(profileId)
    if (!p) return null
    const buddy = p.buddyId != null ? ((await getOwned(p.buddyId)) ?? null) : null
    const results = await listTestResults(profileId)
    const termPerfectCount = perfectTermTestIds(results).size
    // 到達レベル（5問テスト100点が全部そろっている いちばん上の学年学期。第44回で復活）
    const levelLabel = stageClearLevelLabel(perfectStageIds(results))
    return {
      coins: p.coins,
      stars: p.stars,
      termPerfectCount,
      levelLabel,
      buddy: buddy && getSpecies(buddy.speciesId) ? { speciesId: buddy.speciesId, stage: buddy.stage, level: buddy.level } : null,
    }
  }, [profileId])

  // コイン・スターが増えたら「+N」を短くポップさせる（第15回: 獲得が分かる短いアクション）
  const prevRef = useRef<{ id: string; coins: number; stars: number } | null>(null)
  const [pop, setPop] = useState<{ kind: 'coins' | 'stars'; amount: number; key: number } | null>(null)
  const coins = data?.coins
  const stars = data?.stars
  useEffect(() => {
    if (coins == null || stars == null || !profileId) return
    const prev = prevRef.current
    prevRef.current = { id: profileId, coins, stars }
    if (!prev || prev.id !== profileId) return
    const ds = stars - prev.stars
    const dc = coins - prev.coins
    if (ds > 0) setPop({ kind: 'stars', amount: ds, key: Date.now() })
    else if (dc > 0) setPop({ kind: 'coins', amount: dc, key: Date.now() })
  }, [coins, stars, profileId])
  useEffect(() => {
    if (!pop) return
    const t = window.setTimeout(() => setPop(null), 1100)
    return () => window.clearTimeout(t)
  }, [pop])

  if (!data) return null
  return (
    <span className="status-chips">
      {pop && (
        <span key={pop.key} className={`chip-pop chip-pop-${pop.kind}`} aria-hidden>
          +{pop.amount}
          {pop.kind === 'stars' ? '⭐' : '🪙'}
        </span>
      )}
      {/* 称号バッジは常に上に出す（第41回） */}
      <RankChip perfectCount={data.termPerfectCount} onClick={() => setShowRanks(true)} />
      <RankListModal open={showRanks} perfectCount={data.termPerfectCount} onClose={() => setShowRanks(false)} />
      {data.levelLabel && (
        <span className="badge level-chip" title="5もんテスト100点が ぜんぶ そろっている ところまでのレベル">
          Lv {data.levelLabel}
        </span>
      )}
      <CoinBadge coins={data.coins} />
      <StarBadge stars={data.stars} />
      {data.buddy && (
        <button
          className="badge buddy-chip buddy-chip-btn"
          onClick={() => navigate({ name: 'friends' })}
          title="なかまのページへ（スターをかう・あげる）"
        >
          <CharacterSprite speciesId={data.buddy.speciesId} level={data.buddy.level} size={22} />
          <span>Lv.{data.buddy.level}</span>
        </button>
      )}
    </span>
  )
}

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
      <div className="topbar-right">
        {right}
        <StatusChips />
        <SoundButton />
      </div>
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

export function Card({
  children,
  className = '',
  onClick,
  ...rest
}: { children: ReactNode; className?: string; onClick?: () => void } & Record<`data-${string}`, string>) {
  return (
    <div className={`card ${onClick ? 'card-tap' : ''} ${className}`} onClick={onClick} {...rest}>
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
  // 四字熟語など複数文字はチップを横に広げる（第24回）
  const wide = [...char].length > 1
  return (
    <span className={`kanji-chip chip-${state} ${wide ? 'chip-wide' : ''} ${onClick ? 'chip-tap' : ''}`} onClick={onClick}>
      {char}
    </span>
  )
}

/** 次のレベルまでのスター進捗（★★☆☆☆）。needがnullなら最大レベル */
export function StarMeter({ fed, need }: { fed: number; need: number | null }) {
  if (need == null) return <span className="star-meter star-meter-max">レベルMAX！</span>
  return (
    <span className="star-meter" aria-label={`スター ${fed}/${need}`}>
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={i < fed ? 'star-on' : 'star-off'}>
          ★
        </span>
      ))}
      <span className="star-meter-text">
        つぎのレベルまで スター{need - fed}こ
      </span>
    </span>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title">{children}</h2>
}
