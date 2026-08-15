// 1文字れんしゅうクリアのスター獲得スプラッシュ（2026-08-08 第11回フィードバック）:
// 「スターが入った」ことが大きな画面でハッキリ分かる演出。
import { useEffect } from 'react'
import { BuddyCorner } from '../learn/BuddyCorner'
import { playStarGet } from '../sound/sound'
import { Button } from './components'

export function StarSplash({
  char,
  stars,
  coins,
  remain,
  nextLabel,
  onNext,
}: {
  char: string
  stars: number
  coins: number
  /** のこりの字数（1以上。最後の字はステージ完了画面側で祝う） */
  remain: number
  /** 「つぎへ」ボタンの文言の上書き（四字熟語ステージ用。第21回） */
  nextLabel?: string
  onNext: () => void
}) {
  useEffect(() => {
    playStarGet()
  }, [])

  return (
    <div className="celebration-back">
      <div className="celebration-panel star-splash-panel">
        <div className="star-splash-star" aria-hidden>
          <span className="star-splash-core">★</span>
          <span className="star-splash-spark sp1">✦</span>
          <span className="star-splash-spark sp2">✦</span>
          <span className="star-splash-spark sp3">✦</span>
          <span className="star-splash-spark sp4">✦</span>
        </div>
        <div className="star-splash-gain">スター +{stars} ゲット！</div>
        <p className="celebration-title">
          「{char}」の れんしゅう クリア！（+{coins}コイン）
        </p>
        <BuddyCorner mood="celebrate" size={110} message="やったね！" />
        <Button size="lg" variant="accent" onClick={onNext}>
          {nextLabel ?? `つぎの かんじへ（あと${remain}字）`}
        </Button>
      </div>
    </div>
  )
}
