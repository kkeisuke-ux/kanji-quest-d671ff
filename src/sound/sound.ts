// 効果音・BGM（Web Audio APIによる合成。外部音源ファイル不使用＝オフラインでも鳴る）。
// - 正解: 心地よい「ピンポーン」チャイム / 不正解: やわらかい下降音 / クリア: ファンファーレ
// - BGM: 2曲構成。ホーム＝はずむアップテンポ曲、練習・テスト中＝集中できる明るい曲
//   （画面遷移で自動切替。App.tsxの setBgmScene 呼び出し）
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

/** 正解: 「ピンポーン」（玄関チャイム風の心地よい2音＋倍音） */
export function playCorrect() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  // ピン（E6）
  tone(c, t, 1318.5, 0.22, { gain: 0.15, release: 0.16 })
  tone(c, t, 2637, 0.18, { gain: 0.035, release: 0.14 })
  // ポーン（C6・長めに余韻）
  tone(c, t + 0.19, 1046.5, 0.65, { gain: 0.15, release: 0.5 })
  tone(c, t + 0.19, 2093, 0.5, { gain: 0.03, release: 0.4 })
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

/** クリア・100点: ファンファーレ */
export function playClear() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  const seq = [523.25, 659.25, 783.99, 1046.5]
  seq.forEach((f, i) => tone(c, t + i * 0.13, f, 0.16, { gain: 0.14 }))
  tone(c, t + 0.55, 1046.5, 0.6, { gain: 0.12 })
  tone(c, t + 0.55, 783.99, 0.6, { gain: 0.09 })
  tone(c, t + 0.55, 659.25, 0.6, { gain: 0.08 })
}

// ---------------- BGM（2曲・シーン切替） ----------------
export type BgmScene = 'home' | 'practice'

interface BgmTrack {
  beat: number
  gain: number
  type: OscillatorType
  /** [C5からの半音, 拍数]。休符は半音= null */
  melody: [number | null, number][]
  /** ベースライン（C4からの半音, 拍数） */
  bass: [number | null, number][]
}

// ホーム: はずむ・やる気の出るメジャー進行（I-V-vi-IV系）
const HOME_TRACK: BgmTrack = {
  beat: 0.26,
  gain: 0.05,
  type: 'triangle',
  melody: [
    [0, 0.5], [4, 0.5], [7, 0.5], [12, 0.5], [16, 0.5], [12, 0.5], [7, 0.5], [4, 0.5],
    [7, 0.5], [11, 0.5], [14, 0.5], [19, 0.5], [14, 0.5], [11, 0.5], [7, 1],
    [9, 0.5], [12, 0.5], [16, 0.5], [21, 0.5], [16, 0.5], [12, 0.5], [9, 1],
    [5, 0.5], [9, 0.5], [12, 0.5], [17, 0.5], [16, 0.5], [14, 0.5], [12, 0.5], [11, 0.5],
    [12, 0.5], [12, 0.5], [14, 0.5], [16, 0.5], [19, 1], [16, 0.5], [12, 0.5],
    [14, 0.5], [14, 0.5], [16, 0.5], [17, 0.5], [16, 1], [12, 0.5], [11, 0.5],
    [12, 1.5], [7, 0.5], [9, 1], [11, 1],
    [12, 2], [null, 1],
  ],
  bass: [
    [0, 2], [0, 2], [7, 2], [7, 2], [9, 2], [9, 2], [5, 2], [5, 2],
    [0, 2], [0, 2], [7, 2], [7, 2], [9, 2], [5, 2], [0, 2], [7, 2], [0, 1],
  ],
}

// 練習・テスト中: 集中できる明るいペンタトニック（少し落ち着いたテンポ）
const PRACTICE_TRACK: BgmTrack = {
  beat: 0.34,
  gain: 0.04,
  type: 'sine',
  melody: [
    [0, 1], [4, 0.5], [7, 0.5], [9, 1], [7, 0.5], [4, 0.5],
    [2, 1], [4, 0.5], [7, 0.5], [4, 2],
    [0, 1], [4, 0.5], [7, 0.5], [12, 1], [9, 0.5], [7, 0.5],
    [9, 1], [7, 0.5], [4, 0.5], [7, 2],
    [12, 1], [9, 0.5], [7, 0.5], [4, 1], [7, 0.5], [9, 0.5],
    [7, 1], [4, 0.5], [2, 0.5], [0, 2], [null, 1],
  ],
  bass: [
    [0, 2], [7, 2], [9, 2], [4, 2], [0, 2], [7, 2], [5, 2], [7, 2], [0, 3],
  ],
}

const TRACKS: Record<BgmScene, BgmTrack> = { home: HOME_TRACK, practice: PRACTICE_TRACK }

let currentScene: BgmScene = 'home'
let playingScene: BgmScene | null = null
let bgmTimer: number | null = null
let melIdx = 0
let melTime = 0
let bassIdx = 0
let bassTime = 0

function noteFreq(baseSemi: number, base: number): number {
  return base * Math.pow(2, baseSemi / 12)
}

function scheduleBgm() {
  const c = ac()
  if (!c || playingScene == null) return
  const track = TRACKS[playingScene]
  const horizon = c.currentTime + 0.45
  while (melTime < horizon) {
    const [semi, beats] = track.melody[melIdx % track.melody.length]
    const dur = beats * track.beat
    if (semi != null) {
      const f = noteFreq(semi, 523.25)
      tone(c, melTime, f, dur * 0.92, { type: track.type, gain: track.gain, attack: 0.01, release: dur * 0.45 })
      tone(c, melTime, f * 2, dur * 0.9, { type: 'sine', gain: track.gain * 0.22, attack: 0.01, release: dur * 0.45 })
    }
    melTime += dur
    melIdx++
  }
  while (bassTime < horizon) {
    const [semi, beats] = track.bass[bassIdx % track.bass.length]
    const dur = beats * track.beat
    if (semi != null) {
      tone(c, bassTime, noteFreq(semi, 130.81), dur * 0.9, { type: 'sine', gain: track.gain * 0.55, attack: 0.012, release: dur * 0.4 })
    }
    bassTime += dur
    bassIdx++
  }
}

export function startBgm() {
  const c = ac()
  if (!c) return
  if (bgmTimer != null && playingScene === currentScene) return
  stopBgm()
  playingScene = currentScene
  melIdx = 0
  bassIdx = 0
  melTime = c.currentTime + 0.08
  bassTime = c.currentTime + 0.08
  scheduleBgm()
  bgmTimer = window.setInterval(scheduleBgm, 140)
}

export function stopBgm() {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
  playingScene = null
}

function syncBgm() {
  if (getAppFlags().bgmOn) startBgm()
  else stopBgm()
}

/** 画面の種類に応じてBGMを切り替える（App.tsxから呼ぶ） */
export function setBgmScene(scene: BgmScene) {
  if (currentScene === scene) {
    if (getAppFlags().bgmOn && bgmTimer == null) syncBgm()
    return
  }
  currentScene = scene
  if (getAppFlags().bgmOn) startBgm()
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
