// なかま画面（2026-08-08 第4回フィードバックで刷新）。
// - スターを「かう」→ なかまに「あげる」の2ボタンを分かりやすく
// - あげると星が飛んでいき、なかまがもぐもぐ食べるアクション
// - 「つぎのレベルまで スター○こ」を明示。必要数に達するとレベルアップ（=姿が変わる）
import { useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { MAX_LEVEL, getSpecies, nameForLevel, stageForLevel, starsNeededFor } from '../data/species'
import { buyStars, feedStar } from '../game/logic'
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

  // 次のレベルのわくわく予告（L2→3, L4→5が大変身。L5→6は最終形態）
  const nextTease = (level: number): string | null => {
    if (level >= MAX_LEVEL) return null
    if (level === MAX_LEVEL - 1) return 'つぎは さいごの すがた…！ でんせつに なりそう！'
    return level % 2 === 0 ? 'つぎのレベルで おおきく へんしんしそう…！' : 'つぎのレベルで ちょっと おしゃれに なるよ'
  }

  const onFeedStar = async (ownedId: number) => {
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
          const res = await feedStar(profile.id, ownedId)
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
            showToast(`もぐもぐ…！ つぎのレベルまで あとスター${res.starsNeeded != null ? res.starsNeeded - res.starsFed : 0}こ`)
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
              スターを 1こ かう（{GAME_CONFIG.star.cost}コイン）
            </Button>
            <Button
              variant="accent"
              onClick={() => void onBuyStars(GAME_CONFIG.star.bulkCount)}
              disabled={profile.coins < GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount}
            >
              まとめて {GAME_CONFIG.star.bulkCount}こ かう（{GAME_CONFIG.star.cost * GAME_CONFIG.star.bulkCount}コイン）
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
                      {o.level >= MAX_LEVEL ? '（MAX）' : ` / ${MAX_LEVEL}`}
                    </p>
                    <p className="friend-desc">{sp.stages[stageForLevel(o.level)].desc}</p>
                    {nextTease(o.level) && <p className="friend-tease">{nextTease(o.level)}</p>}
                    <StarMeter fed={o.starsFed ?? 0} need={need} />
                    <div className="row gap-sm wrap">
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => void onFeedStar(o.id!)}
                        disabled={profile.stars <= 0 || o.level >= MAX_LEVEL || feedingId != null}
                      >
                        スターを あげる
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
