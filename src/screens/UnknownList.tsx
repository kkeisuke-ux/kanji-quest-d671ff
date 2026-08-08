// わからなかった漢字リスト（仕様 §15）。
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listUnknown } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

export function UnknownList() {
  const profileId = useAppState((s) => s.profileId)
  const { data: list } = useAsyncData(async () => (profileId ? listUnknown(profileId) : []), [profileId])

  if (!list) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="わからなかった漢字" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card>
          <p>
            テストで「わからない」を おしたり まちがえたりした漢字が ここに あつまるよ。
            <b>つぎの テストで せいかいすると じどうで きえる</b>んだ。
          </p>
          <Button
            onClick={() => navigate({ name: 'review', mode: 'unknown' })}
            disabled={list.length === 0}
          >
            ぜんぶ ふくしゅうする（{list.length}字）
          </Button>
        </Card>
        {list.length === 0 ? (
          <Card>
            <p className="result-score">いまは ゼロ！ すごい！</p>
          </Card>
        ) : (
          <div className="unknown-grid">
            {list.map((u) => (
              <Card key={u.char} className="unknown-card">
                <span className="unknown-char">{u.char}</span>
                <span className="unknown-reason">{u.reason === 'unknown' ? '「わからない」をおした' : 'テストで まちがえた'}</span>
                <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'review', mode: 'unknown', chars: [u.char] })}>
                  この字を れんしゅう
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
