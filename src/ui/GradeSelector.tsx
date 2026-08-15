// れんしゅう/テストページの学年切り替え（プロフィールの学年以外も自由に選べる）。
import { GRADE_OPTIONS } from '../data/curriculum'
import { setBrowseGrade, useAppState } from '../state/store'

export function GradeSelector({ ownGrade, effectiveGrade }: { ownGrade: number; effectiveGrade?: number }) {
  const browseGrade = useAppState((s) => s.browseGrade)
  // effectiveGrade: 画面側が既定学年を上書きしている場合（テストの「未クリア最小学年」等）に渡す
  const effective = effectiveGrade ?? browseGrade ?? Math.max(1, ownGrade)
  return (
    <div className="grade-selector">
      <span className="grade-selector-label">学年:</span>
      {/* ★（自分の学年マーク）は第41回で廃止: プロフィールの学年選択をやめたため */}
      {GRADE_OPTIONS.filter((o) => o.value >= 1).map((o) => (
        <button
          key={o.value}
          className={`grade-btn grade-btn-sm ${effective === o.value ? 'grade-btn-on' : ''}`}
          onClick={() => setBrowseGrade(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** いま表示すべき学年（選択がなければ自分の学年、未就学は小1） */
export function effectiveBrowseGrade(browseGrade: number | null, ownGrade: number): number {
  return browseGrade ?? Math.max(1, ownGrade)
}
