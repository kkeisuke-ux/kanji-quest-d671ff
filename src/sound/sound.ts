// 効果音・BGM（Web Audio APIによる合成。外部音源ファイル不使用＝オフラインでも鳴る）。
// - 正解: ピンポン / 不正解: やわらかい下降音（不快すぎない） / クリア: ファンファーレ
// - BGM: オルゴール風のやさしいループ
// - iOS Safariの自動再生制限のため、最初のタップでAudioContextを起こす
import { getAppFlags, setBgmOn, setSeOn } from '../config/appFlags'
import { bumpSound } from '../state/store'

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOpts {
  type?: OscillatorType
  gain?: number
  endFreq?: number
  attack?: number
  release?: number
}

function tone(c: AudioContext, at: number, freq: number, dur: number, opts: ToneOpts = {}) {
  const { type = 'sine', gain = 0.12, endFreq, attack = 0.008, release = Math.min(0.12, dur * 0.6) } = opts
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + attack)
  g.gain.setValueAtTime(gain, at + Math.max(attack, dur - release))
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

function seEnabled(): boolean {
  return getAppFlags().seOn
}

/** 正解: ピンポン！ */
export function playCorrect() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  tone(c, t, 784, 0.14, { gain: 0.16 })
  tone(c, t + 0.13, 1175, 0.3, { gain: 0.16 })
}

/** 不正解: やわらかい「おしい」音（ブーではない） */
export function playWrong() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  tone(c, t, 392, 0.16, { type: 'triangle', gain: 0.09 })
  tone(c, t + 0.16, 311, 0.26, { type: 'triangle', gain: 0.08 })
}

/** なぞり1画OK: 小さなポップ音 */
export function playStrokePop() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  tone(c, c.currentTime, 660, 0.07, { gain: 0.07, endFreq: 880 })
}

/** クリア: ファンファーレ */
export function playClear() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  const seq = [523.25, 659.25, 783.99, 1046.5]
  seq.forEach((f, i) => tone(c, t + i * 0.13, f, 0.16, { gain: 0.14 }))
  // 最後に和音
  tone(c, t + 0.55, 1046.5, 0.55, { gain: 0.12 })
  tone(c, t + 0.55, 783.99, 0.55, { gain: 0.09 })
  tone(c, t + 0.55, 659.25, 0.55, { gain: 0.08 })
}

// ---------------- BGM ----------------
// やさしいオルゴール風ループ（半音: C5基準, 拍数）
const BGM_SEQ: [number, number][] = [
  [0, 1], [4, 1], [7, 1], [9, 1], [7, 1], [4, 1], [0, 1], [-3, 1],
  [0, 1], [4, 1], [9, 1], [12, 1], [9, 1], [7, 1], [4, 2],
  [2, 1], [4, 1], [7, 1], [4, 1], [2, 1], [0, 1], [-3, 2],
  [-5, 1], [0, 1], [4, 1], [0, 1], [-3, 1], [-5, 1], [0, 2],
]
const BEAT = 0.4
let bgmTimer: number | null = null
let bgmNextTime = 0
let bgmIndex = 0

function scheduleBgm() {
  const c = ac()
  if (!c) return
  while (bgmNextTime < c.currentTime + 0.4) {
    const [semi, beats] = BGM_SEQ[bgmIndex % BGM_SEQ.length]
    const freq = 523.25 * Math.pow(2, semi / 12)
    const dur = beats * BEAT
    tone(c, bgmNextTime, freq, dur * 0.92, { gain: 0.038, attack: 0.01, release: dur * 0.5 })
    // 1オクターブ下の薄い伴音
    tone(c, bgmNextTime, freq / 2, dur * 0.92, { gain: 0.014, attack: 0.01, release: dur * 0.5 })
    bgmNextTime += dur
    bgmIndex++
  }
}

export function startBgm() {
  if (bgmTimer != null) return
  const c = ac()
  if (!c) return
  bgmNextTime = c.currentTime + 0.1
  bgmIndex = 0
  scheduleBgm()
  bgmTimer = window.setInterval(scheduleBgm, 150)
}

export function stopBgm() {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
}

function syncBgm() {
  if (getAppFlags().bgmOn) startBgm()
  else stopBgm()
}

// ---------------- 切り替え ----------------
export async function toggleAllSound(): Promise<void> {
  const { seOn, bgmOn } = getAppFlags()
  const anyOn = seOn || bgmOn
  await setSeOn(!anyOn)
  await setBgmOn(!anyOn)
  syncBgm()
  bumpSound()
}

export async function setSe(on: boolean): Promise<void> {
  await setSeOn(on)
  bumpSound()
}

export async function setBgm(on: boolean): Promise<void> {
  await setBgmOn(on)
  syncBgm()
  bumpSound()
}

/** 最初のユーザー操作でAudioContextを起こし、BGM設定に従って再生を始める */
export function initSoundOnGesture() {
  const handler = () => {
    ac()
    syncBgm()
  }
  window.addEventListener('pointerdown', handler, { passive: true })
}
