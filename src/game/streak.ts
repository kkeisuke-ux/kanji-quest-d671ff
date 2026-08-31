// べんきょうカレンダーの計算（第45回）。DBに触らない純粋関数だけを置く。
import type { StudyDayRecord } from '../storage/models'

/** ローカル時刻の YYYY-MM-DD。UTCに寄せると日本の深夜が前日扱いになるので必ずローカルで作る */
export function ymdOf(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function todayYmd(): string {
  return ymdOf(new Date())
}

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return ymdOf(new Date(y, m - 1, d + days))
}

export interface StudySummary {
  /** スタンプがついた日（YYYY-MM-DD） */
  days: Set<string>
  /** 連続日数 */
  streak: number
  /** きょうスタンプがついているか */
  studiedToday: boolean
  /** 表示中の月にスタンプがついた日数 */
  monthCount: number
  /** 直近30日（きょうを含む）でスタンプがついた日数 */
  last30: number
  /** これまでの合計日数 */
  total: number
}

/**
 * 連続日数は「きょう」から数える。まだきょう やっていない朝に 0 と出すと
 * 積み上げが消えたように見えて手が止まるので、その場合は「きのう」から数える。
 * （きのうも やっていなければ 0 で、これは実際に途切れている）
 */
export function studySummary(records: StudyDayRecord[], monthKey: string): StudySummary {
  const days = new Set(records.map((r) => r.ymd))
  const today = todayYmd()
  const studiedToday = days.has(today)
  let cursor = studiedToday ? today : shiftYmd(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = shiftYmd(cursor, -1)
  }
  const monthCount = [...days].filter((d) => d.startsWith(monthKey)).length
  const from = shiftYmd(today, -29)
  const last30 = [...days].filter((d) => d >= from && d <= today).length
  return { days, streak, studiedToday, monthCount, last30, total: days.size }
}

export interface CalendarCell {
  ymd: string
  day: number
  /** 月外の空きマス */
  blank: boolean
  stamped: boolean
  isToday: boolean
  future: boolean
}

/** monthKey は 'YYYY-MM'。日曜始まりの6週ぶんグリッド（欠けは blank） */
export function monthGrid(monthKey: string, days: Set<string>): CalendarCell[] {
  const [y, m] = monthKey.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const today = todayYmd()
  const cells: CalendarCell[] = []
  for (let i = 0; i < lead; i++) {
    cells.push({ ymd: '', day: 0, blank: true, stamped: false, isToday: false, future: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      ymd,
      day: d,
      blank: false,
      stamped: days.has(ymd),
      isToday: ymd === today,
      future: ymd > today,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: '', day: 0, blank: true, stamped: false, isToday: false, future: false })
  }
  return cells
}

export function monthKeyOf(ts: number | Date = new Date()): string {
  return ymdOf(ts).slice(0, 7)
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${y}年 ${m}月`
}

// ---------------- れんぞくボーナス（第52回） ----------------
export interface StreakBonus {
  /** 何日れんぞくで出たか */
  streak: number
  coins: number
  label: string
}

/**
 * その日数に到達したときだけ出るボーナス。
 * 3日で最初の1回 → あとは7日ごとに少しずつ増える → 30日ごとは大きく出す。
 * 「毎日ちょっとずつ」より「続けた人ほど得」を強くしたいので、週の重みを回数で増やしている。
 * 30は7の倍数ではないので、7日刻みとぶつからない。
 */
export function bonusForStreak(streak: number): StreakBonus | null {
  if (streak <= 0) return null
  if (streak % 30 === 0) {
    const months = streak / 30
    return {
      streak,
      coins: 500 + (months - 1) * 200,
      label: months === 1 ? '1か月れんぞく' : `${months}か月れんぞく`,
    }
  }
  if (streak % 7 === 0) {
    const weeks = streak / 7
    return { streak, coins: 70 + (weeks - 1) * 30, label: `${streak}日れんぞく` }
  }
  if (streak === 3) return { streak, coins: 30, label: '3日れんぞく' }
  return null
}

/** つぎのボーナスまであと何日か（ホームの案内用） */
export function nextBonus(streak: number): { inDays: number; bonus: StreakBonus } | null {
  for (let n = streak + 1; n <= streak + 31; n++) {
    const b = bonusForStreak(n)
    if (b) return { inDays: n - streak, bonus: b }
  }
  return null
}
