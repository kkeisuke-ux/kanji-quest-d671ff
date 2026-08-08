// 「つかいかた」カード（2026-08-08 第10回フィードバック）:
// 練習中の漢字が「どんな言葉・文で使われるか」を例で見せる。
// 問題バンクの例文を流用し、練習対象の字は答え入り（読みがな付き・強調）で表示する。
import { useEffect, useState } from 'react'
import { questionProvider, type Question } from '../data/questions'

// 種類（熟語/文/読み…）が偏らないように先頭から選ぶ
function pickDiverse(list: Question[], max: number): Question[] {
  const out: Question[] = []
  const kinds = new Set<string>()
  for (const v of list) {
    if (out.length >= max) break
    if (!kinds.has(v.kind)) {
      out.push(v)
      kinds.add(v.kind)
    }
  }
  for (const v of list) {
    if (out.length >= max) break
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function UsageExamples({ char, max = 3 }: { char: string; max?: number }) {
  const [items, setItems] = useState<Question[]>([])

  useEffect(() => {
    let alive = true
    setItems([])
    void questionProvider.getVariants(char).then((list) => {
      if (alive) setItems(pickDiverse(list, max))
    })
    return () => {
      alive = false
    }
  }, [char, max])

  if (items.length === 0) return null

  return (
    <div className="usage-card card">
      <div className="usage-title">「{char}」は こんなときに つかうよ</div>
      <ul className="usage-list">
        {items.map((q) => (
          <li key={q.id} className="usage-line">
            {q.parts.map((p, i) =>
              p.text != null ? (
                p.ruby ? (
                  <ruby key={i} className="usage-ruby">
                    {p.text}
                    <rt>{p.ruby}</rt>
                  </ruby>
                ) : (
                  <span key={i}>{p.text}</span>
                )
              ) : (
                <ruby key={i} className="usage-ruby usage-target">
                  {q.char}
                  <rt>{p.blank!.reading}</rt>
                </ruby>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
