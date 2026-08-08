// みんな画面（仕様 §30）。兄弟姉妹のがんばりを見られる。順位付けはしない。
import { gradeLabelOf } from '../data/curriculum'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { listActivity, listDex, listProfiles, listProgress } from '../storage/repo'
import { Card, LoadingView, TopBar } from '../ui/components'

function timeAgo(at: number): string {
  const d = new Date(at)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `きょう ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  const days = Math.floor((now.getTime() - at) / 86400000)
  if (days <= 1) return 'きのう'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function Minna() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    const profiles = await listProfiles()
    const cards = await Promise.all(
      profiles.map(async (p) => {
        const [progress, dex] = await Promise.all([listProgress(p.id), listDex(p.id)])
        return {
          profile: p,
          mastered: progress.filter((x) => x.masteredAt != null).length,
          dexCount: dex.length,
        }
      })
    )
    const feed = await listActivity(40)
    return { cards, feed }
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="みんな" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub minna-note">じゅんいは ないよ。みんな それぞれの ペースで がんばろう！</p>
        <div className="minna-cards">
          {data.cards.map(({ profile, mastered, dexCount }) => (
            <Card key={profile.id} className="minna-card">
              <span className="avatar" style={{ background: profile.color }}>
                {profile.name.slice(0, 1)}
              </span>
              <div>
                <p className="minna-name">
                  {profile.name} <span className="minna-grade">{gradeLabelOf(profile.grade)}</span>
                </p>
                <p className="tile-sub">
                  マスター {mastered}字　なかま {dexCount}
                </p>
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <h3>できごと</h3>
          {data.feed.length === 0 ? (
            <p className="tile-sub">まだ できごとが ないよ</p>
          ) : (
            <ul className="feed-list">
              {data.feed.map((f) => (
                <li key={f.id}>
                  <span className="feed-time">{timeAgo(f.at)}</span>
                  <span>{f.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
