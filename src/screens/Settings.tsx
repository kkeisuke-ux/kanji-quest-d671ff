// 設定: 判定のきびしさ・音・バックアップ・診断・デバッグ・入力設定・ライセンス。
import { useRef, useState } from 'react'
import { getAppFlags, setAllowTouchInk } from '../config/appFlags'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { setBgm, setSe } from '../sound/sound'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import {
  canShareBackup,
  downloadBackup,
  downloadProfileBackup,
  importAllData,
  importProfileData,
  inspectBackup,
  shareBackup,
  shareProfileBackup,
  type BackupInfo,
} from '../storage/backup'
import { getProfile, saveProfile } from '../storage/repo'
import { Button, Card, LoadingView, Modal, TopBar } from '../ui/components'

export function Settings() {
  const profileId = useAppState((s) => s.profileId)
  useAppState((s) => s.soundVersion)
  const { data: profile } = useAsyncData(async () => (profileId ? ((await getProfile(profileId)) ?? null) : null), [profileId])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<{ text: string; info: BackupInfo; sameProfileExists: boolean } | null>(null)
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
    try {
      const info = inspectBackup(text)
      const sameProfileExists =
        info.scope === 'profile' && info.profileId != null ? (await getProfile(info.profileId)) != null : false
      setPendingImport({ text, info, sameProfileExists })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ファイルを読み取れません')
    }
  }

  const doImport = async () => {
    if (!pendingImport) return
    setBusy(true)
    try {
      if (pendingImport.info.scope === 'profile') {
        const summary = await importProfileData(pendingImport.text)
        showToast(`「${summary.profileName}」のデータを よみこみました（${summary.records}けん）。さいよみこみします…`)
      } else {
        const summary = await importAllData(pendingImport.text)
        showToast(`よみこみ完了（${summary.records}けん）。さいよみこみします…`)
      }
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
          <p className="tile-sub" style={{ marginTop: 12 }}>
            <b>ひとりだけ移すには:</b> 下のボタンで「{profile.name}」のデータだけを送れます。読み込んだ端末では{' '}
            <b>{profile.name}のデータだけが追加・上書き</b>され、ほかの人のデータはそのまま残ります（読み込みも上の「ファイルを読み込む」でOK。ファイルの種類は自動で見分けます）。
            べつの人を送りたいときは、その人のプロフィールに切り替えてから押してください。
          </p>
          <div className="row gap wrap">
            {canShareBackup() && (
              <Button
                variant="secondary"
                onClick={() =>
                  void shareProfileBackup(profile.id).then((ok) => {
                    if (!ok) showToast('この端末では共有できません。「ファイルに書き出す」を使ってください')
                  })
                }
              >
                「{profile.name}」だけ AirDropで おくる
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                void downloadProfileBackup(profile.id).then((ok) => {
                  if (!ok) showToast('プロフィールが みつかりませんでした')
                })
              }
            >
              「{profile.name}」だけ ファイルに書き出す
            </Button>
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
              指でも書けるようにする
              <br />
              <small>
                オフのとき、指や手のひらは線になりません（Apple Pencil専用）。
                オンにしても、Apple Pencilを使っている間は手のひら・指は線になりません（ペン優先）。
              </small>
            </span>
          </label>
        </Card>

        <Card>
          <h3>このアプリの りようじょうけん</h3>
          <p className="tile-sub">
            作者: 香村 恵介。コード・キャラクター・イラスト・手書きの問題文は{' '}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja" target="_blank" rel="noreferrer">
              CC BY-NC-SA 4.0
            </a>
            （出典を示せば自由に使ってよい／<b>販売など営利目的での利用は不可</b>／改変版も同じ条件で公開）。
            同梱している第三者データ（下記）は元のライセンスのままで、この非営利条件は付きません。
            学習の補助を目的とした個人制作物のため、判定精度や提供の継続は保証しません。
          </p>
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
        {pendingImport?.info.scope === 'profile' ? (
          <>
            <h2>「{pendingImport.info.profileName}」のデータを読み込む</h2>
            <p>
              ひとりぶんのバックアップです。<b>「{pendingImport.info.profileName}」のデータだけ</b>を この端末に入れます。ほかの人のデータは かわりません。
            </p>
            {pendingImport.sameProfileExists && (
              <p className="danger-text">
                この端末にも「{pendingImport.info.profileName}」がいます。その人のいまのデータは、ファイルの内容で <b>置き換わります</b>（元に戻せません）。
              </p>
            )}
            <div className="row gap">
              <Button
                variant={pendingImport.sameProfileExists ? 'danger' : 'accent'}
                onClick={() => void doImport()}
                disabled={busy}
              >
                {busy ? 'よみこみちゅう…' : pendingImport.sameProfileExists ? '置き換えて読み込む' : 'この人を追加する'}
              </Button>
              <Button variant="ghost" onClick={() => setPendingImport(null)} disabled={busy}>
                やめる
              </Button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </Modal>
    </div>
  )
}
