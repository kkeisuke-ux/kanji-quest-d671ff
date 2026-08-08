// 文脈・熟語問題の表示。空欄には読みがな付きの回答マス、漢字にはルビを表示する。
// meaning（ことばの意味）がある問題は、下にやさしい説明を出す（第15回）。
// 空欄が複数ある「全部書く」問題（四字熟語）は、書けた字を埋め、いま書く空欄を光らせる（第20回）。
import type { Question } from '../data/questions'

export function QuestionPrompt({
  question,
  answered = false,
  filled = 0,
}: {
  question: Question
  answered?: boolean
  /** 確定ずみの空欄の数（全部書く問題で、何文字目まで書けたか） */
  filled?: number
}) {
  let blankNo = -1
  return (
    <div className="q-prompt-wrap">
      <div className="q-prompt">
        {question.parts.map((p, i) => {
          if (p.text != null) {
            return p.ruby ? (
              <ruby key={i} className="q-ruby">
                {p.text}
                <rt>{p.ruby}</rt>
              </ruby>
            ) : (
              <span key={i} className="q-text">
                {p.text}
              </span>
            )
          }
          blankNo++
          const bChar = p.blank!.char ?? question.char
          const show = answered || blankNo < filled
          const isActive = !answered && blankNo === filled
          return (
            <span key={i} className="q-blank">
              <span className="q-reading">{p.blank!.reading}</span>
              <span className={`q-box ${show ? 'q-box-answered' : ''} ${isActive ? 'q-box-active' : ''}`}>
                {show ? bChar : ''}
              </span>
            </span>
          )
        })}
      </div>
      {question.meaning && <div className="q-meaning">💡 {question.meaning}</div>}
    </div>
  )
}
