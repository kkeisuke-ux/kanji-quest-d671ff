// アプリ全体のフラグ（設定画面から変更、IndexedDBに保存）。
import { getSetting, putSetting } from '../storage/repo'
import { bumpData } from '../state/store'

export interface AppFlags {
  /** 指（touch）でも書けるようにする。既定false＝Apple Pencil/マウスのみ（仕様 §3） */
  allowTouchInk: boolean
  /** 効果音 */
  seOn: boolean
  /** BGM */
  bgmOn: boolean
}

let flags: AppFlags = { allowTouchInk: false, seOn: true, bgmOn: true }

export async function loadAppFlags(): Promise<void> {
  try {
    flags = {
      allowTouchInk: (await getSetting<boolean>('allowTouchInk')) ?? false,
      seOn: (await getSetting<boolean>('seOn')) ?? true,
      bgmOn: (await getSetting<boolean>('bgmOn')) ?? true,
    }
  } catch {
    flags = { allowTouchInk: false, seOn: true, bgmOn: true }
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

export async function setSeOn(value: boolean): Promise<void> {
  flags = { ...flags, seOn: value }
  await putSetting('seOn', value)
}

export async function setBgmOn(value: boolean): Promise<void> {
  flags = { ...flags, bgmOn: value }
  await putSetting('bgmOn', value)
}
