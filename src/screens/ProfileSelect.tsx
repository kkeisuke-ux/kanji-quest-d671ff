// プロフィール選択（起動画面）。最大5人、データは完全分離（仕様 §29）。
import { useState } from 'react'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { perfectStageIds, perfectTermTestIds, stageClearLevelLabel } from '../data/curriculum'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, selectProfile } from '../state/store'
import { MAX_PROFILES, createProfile, deleteProfileDeep, listProfiles, listTestResults, saveProfile } from '../storage/repo'
import type { Profile } from '../storage/models'
import { Button, LoadingView, Modal } from '../ui/components'
import { RankChip } from '../ui/RankBadge'

export function ProfileSelect() {
  // 各プロフィールの称号（まとめテスト100点の数）と到達レベル（5問テスト100点。第44回）も一緒に読む
  const { data } = useAsyncData(async () => {
    const list = await listProfiles()
    return Promise.all(
      list.map(async (p) => {
        const results = await listTestResults(p.id)
        return {
          profile: p,
          perfectCount: perfectTermTestIds(results).size,
          levelLabel: stageClearLevelLabel(perfectStageIds(results)),
        }
      })
    )
  }, [])
  const profiles = data?.map((d) => d.profile) ?? null
  const rankCountOf = new Map((data ?? []).map((d) => [d.profile.id, d.perfectCount]))
  const levelOf = new Map((data ?? []).map((d) => [d.profile.id, d.levelLabel]))
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!profiles) return <LoadingView />

  const pick = async (p: Profile) => {
    p.lastActiveAt = Date.now()
    await saveProfile(p)
    setStrictnessRuntime(p.judgeStrictness)
    selectProfile(p.id)
    navigate({ name: 'home' })
  }

  const create = async () => {
    const n = name.trim()
    if (!n) return
    // 学年選択は第41回で廃止（学年は進捗から自動判定されるため意味を持たない）。内部値は1固定
    const p = await createProfile(n, 1)
    setCreating(false)
    setName('')
    bumpData()
    selectProfile(p.id)
    navigate({ name: 'home' })
  }

  const saveEdit = async () => {
    if (!editing) return
    editing.name = name.trim() || editing.name
    await saveProfile(editing)
    setEditing(null)
    bumpData()
  }

  const doDelete = async () => {
    if (!editing) return
    await deleteProfileDeep(editing.id)
    setEditing(null)
    setConfirmDelete(false)
    bumpData()
  }

  return (
    <div className="screen profile-screen">
      <h1 className="app-logo">
        かんじクエスト
      </h1>
      <p className="profile-ask">だれが べんきょうする？</p>
      <div className="profile-grid">
        {profiles.map((p) => (
          <div key={p.id} className="profile-card card card-tap" onClick={() => void pick(p)}>
            <span className="avatar" style={{ background: p.color }}>
              {p.name.slice(0, 1)}
            </span>
            <span className="profile-name">{p.name}</span>
            {/* 称号バッジ（第36回。第43回でLvバッジは称号に一本化） */}
            <RankChip perfectCount={rankCountOf.get(p.id) ?? 0} />
            {/* 到達レベル（5問テスト100点が ぜんぶ そろっている ところまで。第44回） */}
            {levelOf.get(p.id) && <span className="badge profile-level level-chip">Lv {levelOf.get(p.id)}</span>}
            <button
              className="profile-edit"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(p)
                setName(p.name)
                setConfirmDelete(false)
              }}
            >
              へんこう
            </button>
          </div>
        ))}
        {profiles.length < MAX_PROFILES && (
          <div
            className="profile-card profile-card-add card card-tap"
            onClick={() => {
              setCreating(true)
              setName('')
            }}
          >
            <span className="avatar avatar-add">＋</span>
            <span className="profile-name">あたらしく はじめる</span>
          </div>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <h2>あたらしい プロフィール</h2>
        <label className="field-label">なまえ</label>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="なまえを いれてね" />
        <div className="row gap">
          <Button onClick={() => void create()} disabled={!name.trim()}>
            はじめる！
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            やめる
          </Button>
        </div>
      </Modal>

      <Modal open={editing != null} onClose={() => setEditing(null)}>
        <h2>プロフィールを へんこう</h2>
        <label className="field-label">なまえ</label>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="row gap">
          <Button onClick={() => void saveEdit()}>ほぞん</Button>
          <Button variant="ghost" onClick={() => setEditing(null)}>
            やめる
          </Button>
        </div>
        <hr className="sep" />
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            このプロフィールを けす…
          </Button>
        ) : (
          <div>
            <p className="danger-text">
              ほんとうに けす？ べんきょうの きろくも なかまも ぜんぶ きえて もとに もどせないよ。
            </p>
            <div className="row gap">
              <Button variant="danger" onClick={() => void doDelete()}>
                ぜんぶ けす
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                やっぱり やめる
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
