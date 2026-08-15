// 効果音・BGM（Web Audio API合成。外部ファイル不使用＝オフラインでも鳴る）。
// 2026-08-08 第3回フィードバックで音色を全面刷新:
// - 「電子音っぽさ」対策: デチューンした2オシレータ＋倍音、オルゴール風の減衰エンベロープ、
//   生成インパルス応答によるリバーブ、ローパスフィルタ
// - 正解音: 「やった！」と感じるベルのアルペジオ
// - ジングル3段階: 完了 ＜ ５もんテスト100点 ＜ まとめテスト100点（差をつける）
// - コイン獲得音
// - BGM2曲（ホーム/練習、画面遷移で自動切替）
import { getAppFlags, setBgmOn, setSeOn } from '../config/appFlags'
import { bumpSound } from '../state/store'

let ctx: AudioContext | null = null
let out: BiquadFilterNode | null = null
let convolver: ConvolverNode | null = null
let reverbIn: GainNode | null = null

function makeImpulse(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 0.9)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
  }
  return buf
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    // まろやかにするローパス → 出力
    out = ctx.createBiquadFilter()
    out.type = 'lowpass'
    out.frequency.value = 4200
    out.Q.value = 0.4
    out.connect(ctx.destination)
    // 生成リバーブ
    convolver = ctx.createConvolver()
    convolver.buffer = makeImpulse(ctx)
    reverbIn = ctx.createGain()
    reverbIn.gain.value = 0.32
    reverbIn.connect(convolver)
    convolver.connect(out)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * オルゴール・ベル風の1音。
 * デチューンした基音2本 + 2倍音 + 4倍音、速いアタックと指数減衰、リバーブ送り。
 */
function bell(
  c: AudioContext,
  at: number,
  freq: number,
  dur: number,
  gain: number,
  opts: { detune?: number; p2?: number; p4?: number; type?: OscillatorType } = {}
) {
  const { detune = 5, p2 = 0.28, p4 = 0.1, type = 'sine' } = opts
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  g.connect(out!)
  g.connect(reverbIn!)
  const mk = (f: number, amt: number, det = 0) => {
    if (amt <= 0) return
    const o = c.createOscillator()
    const og = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, at)
    o.detune.setValueAtTime(det, at)
    og.gain.value = amt
    o.connect(og)
    og.connect(g)
    o.start(at)
    o.stop(at + dur + 0.05)
  }
  mk(freq, 0.6, -detune)
  mk(freq, 0.6, detune)
  mk(freq * 2, p2)
  mk(freq * 4, p4)
}

/** ベースなど柔らかい持続音 */
function soft(c: AudioContext, at: number, freq: number, dur: number, gain: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02)
  g.gain.setValueAtTime(gain, at + Math.max(0.02, dur * 0.55))
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g)
  g.connect(out!)
  o.start(at)
  o.stop(at + dur + 0.05)
}

function seEnabled(): boolean {
  return getAppFlags().seOn
}

const N = (semi: number, base = 523.25) => base * Math.pow(2, semi / 12) // C5基準

/** 正解: 「やった！」のベルアルペジオ（ド・ミ・ソ・ド↑） */
export function playCorrect() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(12), 0.5, 0.16) // C6
  bell(c, t + 0.07, N(16), 0.5, 0.16) // E6
  bell(c, t + 0.14, N(19), 0.55, 0.16) // G6
  bell(c, t + 0.21, N(24), 0.85, 0.2, { p2: 0.35, p4: 0.14 }) // C7 キラン
}

/** 不正解: やわらかい「おしい」2音 */
export function playWrong() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(-5), 0.22, 0.08, { p2: 0.15, p4: 0 })
  bell(c, t + 0.17, N(-9), 0.4, 0.07, { p2: 0.15, p4: 0 })
}

/** なぞり1画OK: 小さなポップ */
export function playStrokePop() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  bell(c, c.currentTime, N(19), 0.16, 0.06, { p2: 0.2, p4: 0 })
}

/** スター購入: キラリン */
export function playStarGet() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(19), 0.18, 0.13, { p2: 0.3, p4: 0.1 })
  bell(c, t + 0.11, N(26), 0.5, 0.15, { p2: 0.32, p4: 0.12 })
}

/** スターをあげたとき: もぐもぐ食べる音 */
export function playEat() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  bell(c, t, 196, 0.09, 0.09, { type: 'triangle', p2: 0.1, p4: 0 })
  bell(c, t + 0.14, 165, 0.09, 0.09, { type: 'triangle', p2: 0.1, p4: 0 })
  bell(c, t + 0.28, 196, 0.11, 0.08, { type: 'triangle', p2: 0.1, p4: 0 })
}

/** コイン獲得: チャリンチャリン */
export function playCoins() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  const freqs = [1976, 2349, 2093, 2637, 2349, 2794]
  freqs.forEach((f, i) => bell(c, t + i * 0.07, f, 0.14, 0.055, { p2: 0.12, p4: 0, detune: 3 }))
}

/** テスト完了（100点ではない）: ひかえめだが前向きなジングル */
export function playFinish() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(0), 0.4, 0.13)
  bell(c, t + 0.14, N(4), 0.4, 0.13)
  bell(c, t + 0.28, N(7), 0.7, 0.14)
  soft(c, t + 0.28, N(-12), 0.7, 0.05)
}

/** ５もんテスト100点・ステージ練習完了: 明るいファンファーレ */
export function playPerfect() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  // パ・パ・パ・パーン！
  bell(c, t, N(7), 0.14, 0.15)
  bell(c, t + 0.12, N(7), 0.14, 0.15)
  bell(c, t + 0.24, N(7), 0.14, 0.15)
  bell(c, t + 0.38, N(12), 0.8, 0.19, { p2: 0.32 })
  soft(c, t + 0.38, N(-12), 0.8, 0.06)
  // 和音
  bell(c, t + 0.85, N(12), 0.7, 0.13)
  bell(c, t + 0.85, N(16), 0.7, 0.11)
  bell(c, t + 0.85, N(19), 0.7, 0.11)
}

/** まとめテスト100点: いちばん豪華な大ファンファーレ */
export function playGrand() {
  const c = seEnabled() ? ac() : null
  if (!c) return
  const t = c.currentTime
  // かけ上がり
  const runUp = [0, 4, 7, 12, 16, 19]
  runUp.forEach((s, i) => bell(c, t + i * 0.055, N(s), 0.3, 0.11))
  // ファンファーレ
  bell(c, t + 0.4, N(19), 0.13, 0.16)
  bell(c, t + 0.52, N(19), 0.13, 0.16)
  bell(c, t + 0.64, N(19), 0.13, 0.16)
  bell(c, t + 0.78, N(24), 0.9, 0.2, { p2: 0.34, p4: 0.14 })
  soft(c, t + 0.78, N(0) / 2, 0.9, 0.07)
  // 大和音 + キラキラ
  const chord = [0, 7, 12, 16, 19, 24]
  chord.forEach((s) => bell(c, t + 1.35, N(s), 1.3, 0.1))
  soft(c, t + 1.35, N(-12) / 2, 1.4, 0.07)
  const sparkle = [24, 28, 31, 36, 31, 28]
  sparkle.forEach((s, i) => bell(c, t + 1.5 + i * 0.09, N(s), 0.35, 0.07, { p2: 0.2, p4: 0 }))
}

// ---------------- BGM（2曲・シーン切替・オルゴール風） ----------------
export type BgmScene = 'home' | 'practice'

interface BgmTrack {
  beat: number
  gain: number
  /** [C5からの半音, 拍数]。休符は半音= null */
  melody: [number | null, number][]
  /** ベースライン（C4からの半音, 拍数） */
  bass: [number | null, number][]
}

// ホーム: はずむ・やる気の出るメジャー進行
const HOME_TRACK: BgmTrack = {
  beat: 0.26,
  gain: 0.055,
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

// 練習・テスト中: 集中できる明るいペンタトニック
const PRACTICE_TRACK: BgmTrack = {
  beat: 0.34,
  gain: 0.042,
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

function scheduleBgm() {
  const c = ac()
  if (!c || playingScene == null) return
  const track = TRACKS[playingScene]
  const horizon = c.currentTime + 0.45
  while (melTime < horizon) {
    const [semi, beats] = track.melody[melIdx % track.melody.length]
    const dur = beats * track.beat
    if (semi != null) {
      // オルゴール風: 減衰は音価より長めに伸ばして余韻を残す
      bell(c, melTime, N(semi), Math.max(dur * 1.6, 0.3), track.gain, { p2: 0.25, p4: 0.08, detune: 4 })
    }
    melTime += dur
    melIdx++
  }
  while (bassTime < horizon) {
    const [semi, beats] = track.bass[bassIdx % track.bass.length]
    const dur = beats * track.beat
    if (semi != null) {
      soft(c, bassTime, N(semi, 130.81), dur * 0.92, track.gain * 0.5)
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

/**
 * 最初のユーザー操作でAudioContextを起こし、BGM設定に従って再生を始める。
 * 第42回: 起動直後に音が鳴らない不具合の修正（えいごクエスト第17回と同じ対策）。
 * 原因は `pointerdown` だけでは自動再生ポリシー上「有効なユーザー操作」と
 * 認識されないブラウザ／OSの組み合わせがあり、AudioContextが`suspended`のまま
 * 残っていたこと。pointerdown/pointerup/click/touchendの複数種類のイベントで試行し、
 * resume()に加えて無音バッファを1回再生して確実にrunning状態へ持っていく。
 */
export function initSoundOnGesture() {
  const handler = () => {
    const c = ac()
    if (c) {
      try {
        const src = c.createBufferSource()
        src.buffer = c.createBuffer(1, 1, c.sampleRate)
        src.connect(c.destination)
        src.start()
      } catch {
        // 無音バッファ再生に失敗してもresume()自体は試みているので致命的ではない
      }
    }
    syncBgm()
  }
  for (const type of ['pointerdown', 'pointerup', 'click', 'touchend'] as const) {
    window.addEventListener(type, handler, { passive: true })
  }
}
