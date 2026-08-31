// なかま画面（2026-08-08 第4回フィードバックで刷新）。
// - スターを「かう」→ なかまに「あげる」の2ボタンを分かりやすく
// - あげると星が飛んでいき、なかまがもぐもぐ食べるアクション
// - 「つぎのレベルまで スター○こ」を明示。必要数に達するとレベルアップ（=姿が変わる）
import { useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { MAX_LEVEL, getSpecies, nameForLevel, nextFormLevel, stageForLevel, starsNeededFor } from '../data/species'
import { buyStars, feedStars } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { playEat, playStarGet } from '../sound/sound'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { getProfile, listOwned, saveProfile } from '../storage/repo'
import { Button, Card, LoadingView, StarIcon, StarMeter, TopBar } from '../ui/components'
import { queueLevelUp } from '../ui/EvolutionModal'

export function Friends() {
  const profileId = useAppState((s) => s.profileId)
  const [buyAnim, setBuyAnim] = useState(0)
  const [feedingId, setFeedingId] = useState<number | null>(null)
  const busyRef = useRef(false)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const owned = await listOwned(profileId)
    owned.sort((a, b) => a.obtainedAt - b.obtainedAt)
    return { profile, owned }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, owned } = data

  const setBuddy = async (id: number) => {
    profile.buddyId = id
    await saveProfile(profile)
    bumpData()
    showToast('いっしょに べんきょうする なかまを かえたよ')
  }

  // 1回で買える上限。多すぎる数を一度に押しても困らないよう999で頭打ちにする
  const maxBuyable = Math.min(999, Math.floor(profile.coins / GAME_CONFIG.star.cost))

  const onBuyStars = async (count: number) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const res = await buyStars(profile.id, count)
      if (!res.ok) {
        showToast('コインが たりないよ')
        return
      }
      playStarGet()
      setBuyAnim((n) => n + 1)
      showToast(`スターを ${count}こ かった！`)
      bumpData()
    } finally {
      busyRef.current = false
    }
  }

  // 次に姿が変わるレベルを予告する（第57回: 姿は L3/L5/L20/L50/L99 で変わる）。
  // 「あと何レベルで変わるか」が見えていないと、途中で育てる手が止まりやすい
  const nextTease = (level: number): string | null => {
    if (level >= MAX_LEVEL) return `レベル${MAX_LEVEL}！ さいごの すがただ！`
    const nf = nextFormLevel(level)
    if (nf == null) return null
    const remain = nf - level
    if (remain === 1) return nf === MAX_LEVEL ? 'つぎは さいごの すがた…！ でんせつに なりそう！' : 'つぎのレベルで おおきく へんしんしそう…！'
    if (remain <= 3) return `あと ${remain}レベルで すがたが かわりそう…！`
    return `レベル${nf}で すがたが かわるよ（あと ${remain}）`
  }

  // count=1で1こ、count=5でまとめて（スター切れ・最大レベルで自動停止。第37回）
  const onFeedStar = async (ownedId: number, count: number) => {
    if (busyRef.current || feedingId != null) return
    if (profile.stars <= 0) {
      showToast('スターを もっていないよ。まず「スターを かう」！')
      return
    }
    busyRef.current = true
    setFeedingId(ownedId)
    playEat()
    // もぐもぐアニメーションを見せてから確定
    window.setTimeout(() => {
      void (async () => {
        try {
          const res = await feedStars(profile.id, ownedId, count)
          if (!res.ok) {
            if (res.reason === 'max') showToast('もう レベルMAXだよ！')
            else if (res.reason === 'noStars') showToast('スターを もっていないよ')
            setFeedingId(null)
            bumpData()
            return
          }
          if (res.leveledUp) {
            const rec = owned.find((o) => o.id === ownedId)
            if (rec) queueLevelUp(rec.speciesId, res.fromLevel, res.newLevel)
          } else {
            showToast(
              `もぐもぐ…！ スターを${res.fed}こ たべたよ。つぎのレベルまで あとスター${res.starsNeeded != null ? res.starsNeeded - res.starsFed : 0}こ`
            )
          }
          setFeedingId(null)
          bumpData()
        } finally {
          busyRef.current = false
        }
      })()
    }, 900)
  }

  return (
    <div className="screen">
      <TopBar title="なかま" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card className="star-shop">
          <div>
            <h3>スター</h3>
            <p className="tile-sub">
              スターを かって、なかまに あげよう。あげると レベルが あがって <b>すがたが かわる</b>よ！
            </p>
          </div>
          <div className="star-shop-buy row gap-sm wrap">
            {buyAnim > 0 && (
              <span key={buyAnim} className="star-pop" aria-hidden>
                <StarIcon size={30} />
              </span>
            )}
            <Button onClick={() => void onBuyStars(1)} disabled={profile.coins < GAME_CONFIG.star.cost}>
              1こ かう（{GAME_CONFIG.star.cost}コイン）
            </Button>
            <Button
              onClick={() => void onBuyStars(GAME_CONFIG.star.bulkCount)}
              disabled={profile.coins < GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount}
            >
              {GAME_CONFIG.star.bulkCount}こ かう（{GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount}コイン）
            </Button>
            <Button
              onClick={() => void onBuyStars(GAME_CONFIG.star.bulkCount2)}
              disabled={profile.coins < GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount2}
            >
              {GAME_CONFIG.star.bulkCount2}こ かう（{GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount2}コイン）
            </Button>
            {/* コインが たまってくると 1こずつでは 追いつかないので「かえるだけ」を用意する（第60回） */}
            <Button variant="accent" onClick={() => void onBuyStars(maxBuyable)} disabled={maxBuyable <= 0}>
              かえるだけ かう（{maxBuyable}こ・{maxBuyable * GAME_CONFIG.star.cost}コイン）
            </Button>
          </div>
        </Card>
        {owned.length === 0 ? (
          <Card>
            <p>まだ なかまが いないよ。</p>
            <Button onClick={() => navigate({ name: 'gacha' })}>ガチャへ いく</Button>
          </Card>
        ) : (
          <div className="friends-grid">
            {owned.map((o) => {
              const sp = getSpecies(o.speciesId)
              if (!sp || o.id == null) return null
              const isBuddy = profile.buddyId === o.id
              const feeding = feedingId === o.id
              const need = starsNeededFor(o.level)
              return (
                <Card key={o.id} className={`friend-card ${isBuddy ? 'friend-buddy' : ''}`}>
                  <div className={`friend-sprite ${feeding ? 'friend-eating' : ''}`}>
                    {feeding && (
                      <span className="feed-star" aria-hidden>
                        <StarIcon size={26} />
                      </span>
                    )}
                    <CharacterSprite speciesId={o.speciesId} level={o.level} size={110} />
                  </div>
                  <div className="friend-info">
                    <p className="friend-name">{nameForLevel(o.speciesId, o.level)}</p>
                    <p className="friend-line">
                      {sp.lineName}　<b>レベル {o.level}</b>
                      {o.level >= MAX_LEVEL ? '（MAX）' : ''}
                    </p>
                    <p className="friend-desc">{sp.stages[stageForLevel(o.level)].desc}</p>
                    {nextTease(o.level) && <p className="friend-tease">{nextTease(o.level)}</p>}
                    <StarMeter fed={o.starsFed ?? 0} need={need} />
                    <div className="row gap-sm wrap">
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => void onFeedStar(o.id!, 1)}
                        disabled={profile.stars <= 0 || o.level >= MAX_LEVEL || feedingId != null}
                      >
                        スターを あげる
                      </Button>
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => void onFeedStar(o.id!, 10)}
                        disabled={profile.stars < 1 || o.level >= MAX_LEVEL || feedingId != null}
                      >
                        10こ まとめて
                      </Button>
                      {/* レベル99まではスターが たくさん いるので、まとめて あげられるようにする（第60回） */}
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => void onFeedStar(o.id!, profile.stars)}
                        disabled={profile.stars < 1 || o.level >= MAX_LEVEL || feedingId != null}
                      >
                        ぜんぶ あげる（{profile.stars}こ）
                      </Button>
                      {isBuddy ? (
                        <span className="buddy-mark">いっしょに べんきょうちゅう</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => void setBuddy(o.id!)}>
                          いっしょに べんきょうする
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
