// アプリ全体のフラグ（設定画面から変更、IndexedDBに保存）。
import { getSetting, putSetting } from '../storage/repo'
import { bumpData } from '../state/store'

export interface AppFlags {
  /** 指（touch）でも書けるようにする。既定false＝Apple Pencil/マウスのみ（仕様 §3） */
  allowTouchInk: boolean
}

let flags: AppFlags = { allowTouchInk: false }

export async function loadAppFlags(): Promise<void> {
  try {
    flags = {
      allowTouchInk: (await getSetting<boolean>('allowTouchInk')) ?? false,
    }
  } catch {
    flags = { allowTouchInk: false }
  }
}

export function getAppFlags(): AppFlags {
  return flags
}

export async function setAllowTouchInk(value: boolean): Promise<void> {
  flags = { ...flags, allowTouchInk: value }
  await putSetting('allowTouchInk', value)
  bumpData()
}
