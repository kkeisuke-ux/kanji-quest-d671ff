// べんきょうカレンダー（第45回）。れんしゅう・テスト・ふくしゅうのどれかを1つやった日にスタンプが付く。
// 「きょうも やった」が一目で分かることと、連続日数が見えることが目的なので、
// 何をやったかの内訳は出さない（子どもが読む画面なので情報を増やしすぎない）。
import { useState } from 'react'
import { monthGrid, monthKeyOf, monthLabel, nextBonus, shiftMonth, studySummary } from '../game/streak'
import type { StudyDayRecord } from '../storage/models'

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  records: StudyDayRecord[]
  /** 月送りを出すか（ホームは出す、みんな画面のミニ表示は出さない） */
  navigable?: boolean
  compact?: boolean
  title?: string
}

export function StudyCalendar({ records, navigable = true, compact = false, title = 'べんきょうカレンダー' }: Props) {
  const [monthKey, setMonthKey] = useState(monthKeyOf())
  const sum = studySummary(records, monthKey)
  const cells = monthGrid(monthKey, sum.days)
  const thisMonth = monthKey === monthKeyOf()

  return (
    <div className={`studycal${compact ? ' studycal-compact' : ''}`}>
      <div className="studycal-cal">
        <div className="studycal-head">
          {navigable ? (
            <button className="studycal-nav" onClick={() => setMonthKey(shiftMonth(monthKey, -1))} aria-label="まえの月">
              ◀
            </button>
          ) : (
            <span className="studycal-nav studycal-nav-empty" />
          )}
          <span className="studycal-month">{compact ? monthLabel(monthKey).replace(/^\d+年 /, '') : monthLabel(monthKey)}</span>
          {navigable ? (
            <button
              className="studycal-nav"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
              disabled={thisMonth}
              aria-label="つぎの月"
            >
              ▶
            </button>
          ) : (
            <span className="studycal-nav studycal-nav-empty" />
          )}
        </div>
        <div className="studycal-grid">
          {WEEK.map((w, i) => (
            <span key={w} className={`studycal-wd${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}`}>
              {w}
            </span>
          ))}
          {cells.map((c, i) =>
            c.blank ? (
              <span key={`b${i}`} className="studycal-cell studycal-blank" />
            ) : (
              <span
                key={c.ymd}
                className={
                  'studycal-cell' +
                  (c.stamped ? ' stamped' : '') +
                  (c.isToday ? ' today' : '') +
                  (c.future ? ' future' : '')
                }
              >
                <span className="studycal-day">{c.day}</span>
                {c.stamped && <span className="studycal-stamp">💮</span>}
              </span>
            )
          )}
        </div>
      </div>

      <div className="studycal-stats">
        <div className="studycal-stat studycal-streak">
          <span className="studycal-stat-label">🔥 れんぞく</span>
          <span className="studycal-stat-num">
            {sum.streak}
            <small> 日</small>
          </span>
        </div>
        <div className="studycal-stat">
          <span className="studycal-stat-label">📅 {Number(monthKey.slice(5))}月</span>
          <span className="studycal-stat-num">
            {sum.monthCount}
            <small> 日</small>
          </span>
        </div>
        <div className="studycal-stat">
          <span className="studycal-stat-label">⭐ ぜんぶで</span>
          <span className="studycal-stat-num">
            {sum.total}
            <small> 日</small>
          </span>
        </div>
        {!compact && (
          <p className="studycal-hint">
            {(() => {
              const nb = nextBonus(sum.streak)
              // 「あと何日で いくらもらえるか」を出すのが いちばん次にやる気になる
              if (nb) {
                const more = sum.studiedToday ? nb.inDays : nb.inDays - 1
                if (more <= 0) return `きょう やれば ${nb.bonus.label}で ${nb.bonus.coins}コイン！`
                return `あと ${more}日 つづけると ${nb.bonus.label}で ${nb.bonus.coins}コイン！`
              }
              return sum.studiedToday ? 'きょうの スタンプ ゲット！' : 'きょうも やって スタンプを つけよう'
            })()}
          </p>
        )}
      </div>
    </div>
  )
}

/** みんな画面・プロフィール選択で使う一行サマリ */
export function StudyStreakChip({ records }: { records: StudyDayRecord[] }) {
  const sum = studySummary(records, monthKeyOf())
  if (sum.total === 0) return null
  return (
    <span className="badge streak-chip" title={`こんげつ ${sum.monthCount}日 / ぜんぶで ${sum.total}日`}>
      🔥 れんぞく {sum.streak}日
    </span>
  )
}
