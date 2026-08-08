// 設定: 判定のきびしさ・音・バックアップ・診断・デバッグ・入力設定・ライセンス。
import { useRef, useState } from 'react'
import { getAppFlags, setAllowTouchInk } from '../config/appFlags'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { setBgm, setSe } from '../sound/sound'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { canShareBackup, downloadBackup, importAllData, shareBackup } from '../storage/backup'
import { getProfile, saveProfile } from '../storage/repo'
import { Button, Card, LoadingView, Modal, TopBar } from '../ui/components'

export function Settings() {
  const profileId = useAppState((s) => s.profileId)
  useAppState((s) => s.soundVersion)
  const { data: profile } = useAsyncData(async () => (profileId ? ((await getProfile(profileId)) ?? null) : null), [profileId])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const flags = getAppFlags()

  if (!profile) return <LoadingView />

  const strictness = profile.judgeStrictness ?? DEFAULT_STRICTNESS

  const changeStrictness = async (level: number) => {
    profile.judgeStrictness = level
    await saveProfile(profile)
    setStrictnessRuntime(level)
    bumpData()
    showToast(`はんていを「${STRICTNESS_LABELS[level - 1]}」に かえたよ`)
  }

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
          <h3>はんていの きびしさ（{profile.name}用）</h3>
          <p className="tile-sub">
            ○×の判定がきびしすぎる／あますぎると感じたら、ここで調整してください。「あまい」でも別の漢字や画数ちがいは不正解になります。
          </p>
          <div className="grade-picker">
            {STRICTNESS_LABELS.map((label, i) => (
              <button
                key={label}
                className={`grade-btn ${strictness === i + 1 ? 'grade-btn-on' : ''}`}
                onClick={() => void changeStrictness(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3>音</h3>
          <label className="check-row">
            <input type="checkbox" checked={flags.seOn} onChange={(e) => void setSe(e.target.checked)} />
            <span>こうかおん（ピンポン・ファンファーレ）</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={flags.bgmOn} onChange={(e) => void setBgm(e.target.checked)} />
            <span>BGM</span>
          </label>
          <p className="tile-sub">各画面の右上のスピーカーボタンでも、まとめてオン/オフできます。</p>
        </Card>

        <Card>
          <h3>バックアップ・べつの端末への ひっこし</h3>
          <p className="tile-sub">
            データはこの端末の中だけに保存されています（外部のサーバーには置かない設計です）。故障やSafariのデータ削除に備えて、ときどき書き出してください（全プロフィール分をまとめて書き出します）。
          </p>
          <p className="tile-sub">
            <b>べつのiPadへデータを移すには:</b> ①「AirDropで おくる」を押して 相手のiPadを選ぶ → ②受け取ったファイルを「ファイル」に保存 →
            ③新しいiPadでこのアプリを開き、この画面の「ファイルを読み込む」で選ぶ。これだけで全員分がそのまま移ります。
          </p>
          <div className="row gap wrap">
            {canShareBackup() && (
              <Button
                onClick={() =>
                  void shareBackup().then((ok) => {
                    if (!ok) showToast('この端末では共有できません。「ファイルに書き出す」を使ってください')
                  })
                }
              >
                AirDropで おくる（共有）
              </Button>
            )}
            <Button variant={canShareBackup() ? 'secondary' : undefined} onClick={() => void downloadBackup()}>
              ファイルに書き出す
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              ファイルを読み込む
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
            ）を CC BY-SA 3.0 に基づき使用。学年配当・読み: KANJIDIC2、穴埋め問題の単語: JMdict（いずれも
            <a href="https://www.edrdg.org/" target="_blank" rel="noreferrer">
              EDRDG
            </a>
            の辞書ファイルを同グループのライセンス＝CC BY-SA 4.0 に基づき使用）。例文: Tanaka Corpus（EDRDG管理の対訳例文集）。ふりがな分割: JmdictFurigana プロジェクト。
            中学の漢字はKANJIDIC2の頻度情報に基づく独自編成です（公式の学年別配当はありません）。
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
