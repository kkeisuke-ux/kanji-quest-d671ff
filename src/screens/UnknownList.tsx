// わからなかった漢字リスト（2026-08-08 第6回で出どころ別に分離）。
// - ５もんテストで わからなかった漢字 / まとめテストで わからなかった漢字
// - ふくしゅうを やりきる、またはその出どころのテストで正解すると消える（第12回で変更）
import type { UnknownKanjiRecord } from '../storage/models'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listUnknown, type UnknownSource } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'
import { useScrollMemory } from '../ui/scrollMemory'

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

  // ふくしゅうから戻ってきたとき、直前に見ていた位置をそのまま表示する（2026-08-14 第31回）
  const scrollRef = useScrollMemory(data ? `unknown:${profileId}` : null)

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="わからなかった漢字" back={{ name: 'home' }} />
      <div className="map-scroll" ref={scrollRef}>
        <Section
          title="５もんテストで わからなかった漢字"
          clearHint="ふくしゅうすると ここから きえるよ（５もんテストで せいかいしても きえるよ）"
          source="stage"
          items={data.stage}
        />
        <Section
          title="まとめテストで わからなかった漢字"
          clearHint="ふくしゅうすると ここから きえるよ（まとめテストで せいかいしても きえるよ）"
          source="term"
          items={data.term}
        />
      </div>
    </div>
  )
}
