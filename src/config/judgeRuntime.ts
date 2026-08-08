// 判定設定のランタイム管理: 既定値 + 端末に保存した上書き（判定デバッグ画面で調整）。
import { DEFAULT_JUDGE_CONFIG, mergeJudgeConfig, type JudgeConfig, type JudgeConfigPatch } from './judgeConfig'
import { getSetting, putSetting } from '../storage/repo'
import { bumpData } from '../state/store'

const SETTING_KEY = 'judgeOverrides'

let overrides: JudgeConfigPatch | null = null
let merged: JudgeConfig = DEFAULT_JUDGE_CONFIG

/** アプリ起動時に一度呼ぶ */
export async function loadJudgeOverrides(): Promise<void> {
  try {
    overrides = (await getSetting<JudgeConfigPatch>(SETTING_KEY)) ?? null
  } catch {
    overrides = null
  }
  merged = mergeJudgeConfig(DEFAULT_JUDGE_CONFIG, overrides)
}

export function getJudgeConfig(): JudgeConfig {
  return merged
}

export function getJudgeOverrides(): JudgeConfigPatch | null {
  return overrides
}

export async function saveJudgeOverrides(patch: JudgeConfigPatch | null): Promise<void> {
  overrides = patch
  merged = mergeJudgeConfig(DEFAULT_JUDGE_CONFIG, overrides)
  await putSetting(SETTING_KEY, patch)
  bumpData()
}
