// わからなかった漢字リスト（2026-08-08 第6回で出どころ別に分離）。
// - ５もんテストで わからなかった漢字 / まとめテストで わからなかった漢字
// - ふくしゅうずみ／まだ が分かる
// - リストから消えるのは、その出どころのテストで正解したときだけ
import type { UnknownKanjiRecord } from '../storage/models'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listUnknown, type UnknownSource } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

function isReviewed(u: UnknownKanjiRecord): boolean {
  return u.lastReviewedAt != null && u.lastReviewedAt >= u.lastFailedAt
}

function Section({
  title,
  clearHint,
  source,
  items,
}: {
  title: string
  clearHint: string
  source: UnknownSource
  items: UnknownKanjiRecord[]
}) {
  return (
    <Card>
      <div className="unknown-section-head">
        <h3>
          {title}（{items.length}字）
        </h3>
        <Button
          size="sm"
          onClick={() => navigate({ name: 'review', source })}
          disabled={items.length === 0}
        >
          ぜんぶ ふくしゅうする
        </Button>
      </div>
      <p className="tile-sub">{clearHint}</p>
      {items.length === 0 ? (
        <p className="result-score unknown-zero">いまは ゼロ！ すごい！</p>
      ) : (
        <div className="unknown-grid">
          {items.map((u) => (
            <div key={u.char} className="unknown-card card">
              <span className="unknown-char">{u.char}</span>
              <span className={`unknown-reviewed ${isReviewed(u) ? 'is-reviewed' : ''}`}>
                {isReviewed(u) ? 'ふくしゅうずみ' : 'まだ ふくしゅうしていない'}
              </span>
              <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'review', source, chars: [u.char] })}>
                この字を ふくしゅう
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function UnknownList() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const [stage, term] = await Promise.all([listUnknown(profileId, 'stage'), listUnknown(profileId, 'term')])
    return { stage, term }
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="わからなかった漢字" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Section
          title="５もんテストで わからなかった漢字"
          clearHint="つぎに ５もんテストで せいかいすると、ここから きえるよ"
          source="stage"
          items={data.stage}
        />
        <Section
          title="まとめテストで わからなかった漢字"
          clearHint="つぎに まとめテストで せいかいすると、ここから きえるよ"
          source="term"
          items={data.term}
        />
      </div>
    </div>
  )
}
