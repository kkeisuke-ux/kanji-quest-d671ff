// 設定: バックアップ・診断・デバッグ・入力設定・ライセンス（仕様 §4, §32, §35）。
import { useRef, useState } from 'react'
import { getAppFlags, setAllowTouchInk } from '../config/appFlags'
import { useAsyncData } from '../state/hooks'
import { navigate, showToast, useAppState } from '../state/store'
import { downloadBackup, importAllData } from '../storage/backup'
import { getProfile } from '../storage/repo'
import { Button, Card, LoadingView, Modal, TopBar } from '../ui/components'

export function Settings() {
  const profileId = useAppState((s) => s.profileId)
  const { data: profile } = useAsyncData(async () => (profileId ? ((await getProfile(profileId)) ?? null) : null), [profileId])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const flags = getAppFlags()

  if (!profile) return <LoadingView />

  const onFile = async (f: File | null) => {
    if (!f) return
    const text = await f.text()
    setPendingImport(text)
  }

  const doImport = async () => {
    if (!pendingImport) return
    setBusy(true)
    try {
      const summary = await importAllData(pendingImport)
      showToast(`よみこみ完了（${summary.records}けん）。さいよみこみします…`)
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'よみこみに しっぱいしました')
      setBusy(false)
      setPendingImport(null)
    }
  }

  return (
    <div className="screen">
      <TopBar title="せってい" back={{ name: 'home' }} />
      <div className="map-scroll settings-list">
        <Card>
          <h3>プロフィール</h3>
          <p className="tile-sub">いま つかっているのは「{profile.name}」</p>
          <Button variant="secondary" onClick={() => navigate({ name: 'profiles' })}>
            プロフィールを きりかえる
          </Button>
        </Card>

        <Card>
          <h3>バックアップ</h3>
          <p className="tile-sub">
            データはこのiPadの中だけに保存されています。故障やSafariのデータ削除に備えて、ときどき書き出してください（全プロフィール分をまとめて書き出します）。
          </p>
          <div className="row gap wrap">
            <Button onClick={() => void downloadBackup()}>バックアップを書き出す</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              バックアップを読み込む
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                void onFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>
        </Card>

        <Card>
          <h3>開発・調整</h3>
          <div className="row gap wrap">
            <Button variant="secondary" onClick={() => navigate({ name: 'pencilDiag' })}>
              Apple Pencil診断
            </Button>
            <Button variant="secondary" onClick={() => navigate({ name: 'judgeDebug' })}>
              判定デバッグ
            </Button>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={flags.allowTouchInk}
              onChange={(e) => void setAllowTouchInk(e.target.checked)}
            />
            <span>
              指でも書けるようにする（検証用）
              <br />
              <small>通常はオフ。オフのとき、指や手のひらは線になりません（Apple Pencil専用）。</small>
            </span>
          </label>
        </Card>

        <Card>
          <h3>ライセンス・出典</h3>
          <p className="tile-sub">
            漢字の筆順データ: KanjiVG（Ulrich Apel氏作、
            <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">
              kanjivg.tagaini.net
            </a>
            ）を Creative Commons Attribution-Share Alike 3.0 ライセンスに基づき使用しています。
          </p>
        </Card>
      </div>

      <Modal open={pendingImport != null} onClose={() => !busy && setPendingImport(null)}>
        <h2>バックアップを読み込む</h2>
        <p className="danger-text">いまの ぜんいんの データを、ファイルの内容で <b>すべて置き換えます</b>。この操作は元に戻せません。</p>
        <div className="row gap">
          <Button variant="danger" onClick={() => void doImport()} disabled={busy}>
            {busy ? 'よみこみちゅう…' : '置き換えて読み込む'}
          </Button>
          <Button variant="ghost" onClick={() => setPendingImport(null)} disabled={busy}>
            やめる
          </Button>
        </div>
      </Modal>
    </div>
  )
}
