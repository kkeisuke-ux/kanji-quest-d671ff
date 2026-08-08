// 判定デバッグ画面（仕様 §32, §33）。
// - reference/user stroke・マッチング・順序・方向・スコアの可視化
// - 「本当は正解/不正解」の人間ラベル保存（しきい値調整用）
// - しきい値の編集と保存
// - 検証ケースA〜Fの自己テスト実行
import { useState } from 'react'
import type { Pt } from '../core/geometry'
import { strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { evaluateKanji, type KanjiEvaluation } from '../core/judge/evaluate'
import { runSelfTest, type SelfTestSummary } from '../core/judge/selftest'
import { getRefKanji, listRefKanji } from '../core/refdata'
import { getEffectiveJudgeConfig, getJudgeConfig, getJudgeOverrides, getStrictnessRuntime, saveJudgeOverrides } from '../config/judgeRuntime'
import { DEFAULT_JUDGE_CONFIG, STRICTNESS_LABELS } from '../config/judgeConfig'
import { WritingPad } from '../learn/WritingPad'
import { saveSample } from '../learn/sampleUtil'
import { useAsyncData } from '../state/hooks'
import { bumpData, showToast, useAppState } from '../state/store'
import { listStrokeSamples } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'
import { KanjiSvg } from '../ui/KanjiSvg'

function DebugOverlay({ ev, strokes, boxSize }: { ev: KanjiEvaluation; strokes: Pt[][]; boxSize: number }) {
  const k = 109 / Math.max(boxSize, 1)
  const color = (i: number) => `hsl(${(i * 47) % 360} 70% 42%)`
  const matchOfUser = new Map(ev.pairs.map((p) => [p.userIndex, p.refIndex]))
  const ref = getRefKanji(ev.char)
  return (
    <svg viewBox="0 0 109 109" className="debug-overlay-svg">
      {ref.strokes.map((rs, i) => (
        <path key={i} d={rs.d} stroke={color(i)} strokeWidth={3.4} fill="none" opacity={0.3} strokeLinecap="round" />
      ))}
      {strokes.map((s, u) => {
        if (s.length === 0) return null
        const r = matchOfUser.get(u)
        const pts = s.map((p) => `${(p.x * k).toFixed(1)},${(p.y * k).toFixed(1)}`).join(' ')
        return (
          <g key={u}>
            <polyline points={pts} fill="none" stroke={r != null ? color(r) : '#666'} strokeWidth={2.2} strokeDasharray="4 3" />
            <text x={s[0].x * k + 1.5} y={s[0].y * k - 1.5} fontSize={6.5} fill="#111" fontWeight={700}>
              U{u + 1}
              {r != null ? `→R${r + 1}` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function JudgeDebug() {
  const profileId = useAppState((s) => s.profileId)
  const chars = listRefKanji()
  const [char, setChar] = useState(chars[0] ?? '一')
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<KanjiEvaluation | null>(null)
  const [lastStrokes, setLastStrokes] = useState<InkStroke[] | null>(null)
  const [lastBox, setLastBox] = useState(0)
  const [selftest, setSelftest] = useState<SelfTestSummary | null>(null)
  const [running, setRunning] = useState(false)
  const cfg = getJudgeConfig()
  const [th, setTh] = useState({
    strokePassCost: cfg.strokePassCost,
    charAvgPassCost: cfg.charAvgPassCost,
    reverseMargin: cfg.reverseMargin,
    tracePassCost: cfg.trace.passCost,
    traceStartRadius: cfg.trace.startRadius,
  })
  const { data: samples } = useAsyncData(() => listStrokeSamples(), [])
  const inkHandle = { current: null as InkCanvasHandle | null }

  const onEvaluated = (ev: KanjiEvaluation, strokes: InkStroke[], boxSize: number) => {
    setEvalResult(ev)
    setLastStrokes(strokes)
    setLastBox(boxSize)
  }

  const reJudge = () => {
    if (!lastStrokes) return
    setEvalResult(evaluateKanji(char, strokesToPts(lastStrokes), lastBox, getEffectiveJudgeConfig()))
  }

  const label = async (humanLabel: 'correct' | 'incorrect') => {
    if (!evalResult || !lastStrokes || !profileId) return
    await saveSample(profileId, char, evalResult, lastStrokes, lastBox, 'debug', humanLabel)
    bumpData()
    showToast(`ラベル「${humanLabel === 'correct' ? '本当は正解' : '本当は不正解'}」を保存しました`)
  }

  const saveThresholds = async () => {
    await saveJudgeOverrides({
      strokePassCost: th.strokePassCost,
      charAvgPassCost: th.charAvgPassCost,
      reverseMargin: th.reverseMargin,
      trace: { passCost: th.tracePassCost, startRadius: th.traceStartRadius },
    })
    showToast('しきい値を保存しました')
  }

  const resetThresholds = async () => {
    await saveJudgeOverrides(null)
    setTh({
      strokePassCost: DEFAULT_JUDGE_CONFIG.strokePassCost,
      charAvgPassCost: DEFAULT_JUDGE_CONFIG.charAvgPassCost,
      reverseMargin: DEFAULT_JUDGE_CONFIG.reverseMargin,
      tracePassCost: DEFAULT_JUDGE_CONFIG.trace.passCost,
      traceStartRadius: DEFAULT_JUDGE_CONFIG.trace.startRadius,
    })
    showToast('初期値に戻しました')
  }

  const runTests = () => {
    setRunning(true)
    window.setTimeout(() => {
      try {
        setSelftest(runSelfTest(getJudgeOverrides() ?? undefined))
      } finally {
        setRunning(false)
      }
    }, 30)
  }

  const exportSamples = async () => {
    const all = await listStrokeSamples()
    const blob = new Blob([JSON.stringify(all)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanji-quest-samples-${Date.now()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const numField = (key: keyof typeof th, label: string, step = 0.01) => (
    <label className="th-field" key={key}>
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={th[key]}
        onChange={(e) => setTh({ ...th, [key]: Number(e.target.value) })}
      />
    </label>
  )

  const labeled = (samples ?? []).filter((s) => s.humanLabel != null)

  return (
    <div className="screen">
      <TopBar title="判定デバッグ" back={{ name: 'settings' }} />
      <div className="map-scroll debug-scroll">
        <Card>
          <div className="debug-chars">
            {chars.map((c) => (
              <button
                key={c}
                className={`kanji-chip chip-tap ${c === char ? 'chip-practiced' : 'chip-none'}`}
                onClick={() => {
                  setChar(c)
                  setEvalResult(null)
                  setLastStrokes(null)
                  setAttempt((a) => a + 1)
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </Card>

        <div className="debug-main">
          <div className="debug-left">
            <Card>
              <p className="model-caption">お手本（{getRefKanji(char).strokeCount}画）</p>
              <KanjiSvg char={char} full numbers className="model-kanji" />
              <div className="row gap-sm wrap">
                <Button size="sm" variant="secondary" onClick={() => setAttempt((a) => a + 1)}>
                  書き直す
                </Button>
                <Button size="sm" variant="secondary" onClick={reJudge} disabled={!lastStrokes}>
                  いまの字を再判定
                </Button>
                <Button size="sm" variant="accent" onClick={() => void label('correct')} disabled={!evalResult}>
                  本当は正解
                </Button>
                <Button size="sm" variant="danger" onClick={() => void label('incorrect')} disabled={!evalResult}>
                  本当は不正解
                </Button>
              </div>
            </Card>
            {evalResult && (
              <Card className="debug-result">
                <h3>
                  判定: {evalResult.verdict}（score {evalResult.score}）
                </h3>
                <p className="tile-sub">
                  画数 {evalResult.userCount}/{evalResult.refCount}
                  {evalResult.droppedTinyStrokes > 0 && `（極小${evalResult.droppedTinyStrokes}画を無視）`}　 shapeOk=
                  {String(evalResult.shapeOk)}　orderOk={String(evalResult.orderOk)}　dirOk={String(evalResult.directionOk)}　avgCost=
                  {Number.isFinite(evalResult.avgCost) ? evalResult.avgCost.toFixed(3) : '—'}　aspectΔ=
                  {evalResult.aspectLogDiff.toFixed(2)}
                </p>
                <p>書いた順→お手本: {evalResult.orderSeq.map((r, i) => `U${i + 1}→R${r + 1}`).join('  ') || '—'}</p>
                <ul className="feedback-msgs">
                  {evalResult.messages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                <table className="diag-table">
                  <thead>
                    <tr>
                      <th>U→R</th>
                      <th>cost</th>
                      <th>逆向き</th>
                      <th>dtw</th>
                      <th>fré</th>
                      <th>始</th>
                      <th>終</th>
                      <th>角</th>
                      <th>長</th>
                      <th>重心</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.pairs.map((p) => (
                      <tr key={p.userIndex} className={p.shapeOk ? '' : 'row-bad'}>
                        <td>
                          U{p.userIndex + 1}→R{p.refIndex + 1}
                        </td>
                        <td>{p.cost.toFixed(3)}</td>
                        <td>{p.reversed ? '逆' : ''}</td>
                        <td>{p.metrics.dtw.toFixed(3)}</td>
                        <td>{p.metrics.frechet.toFixed(3)}</td>
                        <td>{p.metrics.startDist.toFixed(3)}</td>
                        <td>{p.metrics.endDist.toFixed(3)}</td>
                        <td>{p.metrics.angleDiffNorm.toFixed(3)}</td>
                        <td>{p.metrics.lengthRatio.toFixed(3)}</td>
                        <td>{p.metrics.centroidDist.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
          <div className="debug-right">
            <WritingPad
              char={char}
              resetKey={`${char}-${attempt}`}
              onEvaluated={onEvaluated}
              overlay={
                evalResult && lastStrokes ? (
                  <DebugOverlay ev={evalResult} strokes={strokesToPts(lastStrokes)} boxSize={lastBox} />
                ) : null
              }
            />
          </div>
        </div>

        <Card>
          <h3>しきい値（単位: 文字サイズ=1の正規化空間）</h3>
          <div className="th-grid">
            {numField('strokePassCost', '1画の合格コスト上限')}
            {numField('charAvgPassCost', '平均コストの合格上限')}
            {numField('reverseMargin', '逆方向判定マージン')}
            {numField('tracePassCost', 'なぞり合格コスト', 0.05)}
            {numField('traceStartRadius', 'なぞり始点半径', 0.02)}
          </div>
          <div className="row gap">
            <Button size="sm" onClick={() => void saveThresholds()}>
              保存して適用
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void resetThresholds()}>
              初期値に戻す
            </Button>
          </div>
          <p className="tile-sub">
            全設定は src/config/judgeConfig.ts。ここでの保存は端末に上書き保存されます。実際の判定にはさらに、設定画面の「はんていのきびしさ」（現在:
            {STRICTNESS_LABELS[getStrictnessRuntime() - 1]}）の係数が掛かります。
          </p>
        </Card>

        <Card>
          <h3>エンジン自己テスト（検証ケースA〜F × 全{chars.length}字）</h3>
          <p className="tile-sub">
            A:正しく書く→正解 / B:書き順いれかえ→形OK+順序検出 / C:逆方向→形OK+方向検出 / D:1画不足→不正解 / E:1画過多→不正解 /
            F:雑に書く→正解。G(手のひら)・H(指)は「Apple Pencil診断」画面で実機確認。
          </p>
          <Button onClick={runTests} disabled={running}>
            {running ? '実行中…' : '自己テストを実行'}
          </Button>
          {selftest && (
            <div className="selftest-result">
              <p className={selftest.passedCases === selftest.totalCases ? 'st-allpass' : 'st-fail'}>
                合計: {selftest.passedCases} / {selftest.totalCases} 合格
              </p>
              <table className="diag-table">
                <thead>
                  <tr>
                    <th>ケース</th>
                    <th>合格</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selftest.byCase).map(([k, v]) => (
                    <tr key={k} className={v.passed === v.total ? '' : 'row-bad'}>
                      <td>{k}</td>
                      <td>
                        {v.passed} / {v.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selftest.results.filter((r) => !r.pass).length > 0 && (
                <details>
                  <summary>不合格の内訳</summary>
                  <ul className="feedback-msgs">
                    {selftest.results
                      .filter((r) => !r.pass)
                      .map((r, i) => (
                        <li key={i}>
                          「{r.char}」{r.caseId}: 期待[{r.expected}] → 実際[{r.actual}] avgCost={r.avgCost}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h3>人間ラベル付きサンプル（{labeled.length}件 / 全{(samples ?? []).length}件）</h3>
          {samples == null ? (
            <LoadingView />
          ) : (
            <>
              <ul className="feedback-msgs">
                {labeled.slice(0, 10).map((s) => (
                  <li key={s.id}>
                    「{s.char}」 {s.humanLabel === 'correct' ? '本当は正解' : '本当は不正解'} / エンジン判定:{s.summary.verdict}{' '}
                    (score {s.summary.score}) {new Date(s.at).toLocaleString('ja-JP')}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="secondary" onClick={() => void exportSamples()} disabled={(samples ?? []).length === 0}>
                全サンプルをJSONで書き出す
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
