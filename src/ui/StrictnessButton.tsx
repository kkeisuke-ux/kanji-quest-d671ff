// 練習・テスト画面から開けるクイック設定（判定のきびしさ・音）。
import { useState } from 'react'
import { getAppFlags } from '../config/appFlags'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { setBgm, setSe } from '../sound/sound'
import { useProfile } from '../state/hooks'
import { bumpData, showToast, useAppState } from '../state/store'
import { saveProfile } from '../storage/repo'
import { Button, Modal } from './components'

export function StrictnessButton() {
  const profile = useProfile()
  const [open, setOpen] = useState(false)
  useAppState((s) => s.soundVersion)
  const flags = getAppFlags()
  if (!profile) return null
  const current = profile.judgeStrictness ?? DEFAULT_STRICTNESS

  const change = async (level: number) => {
    profile.judgeStrictness = level
    await saveProfile(profile)
    setStrictnessRuntime(level)
    bumpData()
    showToast(`はんていを「${STRICTNESS_LABELS[level - 1]}」に かえたよ`)
  }

  return (
    <>
      <button className="strict-btn" onClick={() => setOpen(true)} title="せってい">
        ⚙ せってい
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2>クイックせってい</h2>
        <h3 className="quick-h3">はんていの きびしさ（いま: {STRICTNESS_LABELS[current - 1]}）</h3>
        <p className="tile-sub">○×の判定がきびしすぎる／あますぎると感じたら、ここで調整してね。</p>
        <div className="grade-picker">
          {STRICTNESS_LABELS.map((label, i) => (
            <button
              key={label}
              className={`grade-btn ${current === i + 1 ? 'grade-btn-on' : ''}`}
              onClick={() => void change(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="quick-h3">音</h3>
        <label className="check-row">
          <input type="checkbox" checked={flags.seOn} onChange={(e) => void setSe(e.target.checked)} />
          <span>こうかおん</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={flags.bgmOn} onChange={(e) => void setBgm(e.target.checked)} />
          <span>BGM</span>
        </label>
        <div className="row gap" style={{ marginTop: 14 }}>
          <Button onClick={() => setOpen(false)}>とじる</Button>
        </div>
      </Modal>
    </>
  )
}
