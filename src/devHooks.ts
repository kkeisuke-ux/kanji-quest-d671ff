// 開発・E2E検証用フック（window.__kanjiDev）。
// ブラウザ自動テストから判定エンジンとデータ層を直接検証するために公開している。
import { evaluateKanji, judgeTraceStroke } from './core/judge/evaluate'
import { runSelfTest } from './core/judge/selftest'
import { getRefKanji, listRefKanji } from './core/refdata'
import { getJudgeConfig } from './config/judgeRuntime'
import { bumpData, getState, navigate, selectProfile } from './state/store'
import * as repo from './storage/repo'

declare global {
  interface Window {
    __kanjiDev?: Record<string, unknown>
  }
}

window.__kanjiDev = {
  runSelfTest,
  evaluateKanji,
  judgeTraceStroke,
  getRefKanji,
  listRefKanji,
  getJudgeConfig,
  getState,
  navigate,
  selectProfile,
  bumpData,
  repo,
  grantCoins: async (n = 300) => {
    const s = getState()
    if (!s.profileId) return 'no profile selected'
    await repo.addCoins(s.profileId, n, 'デバッグ付与')
    bumpData()
    return 'ok'
  },
}
