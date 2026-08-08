// 文脈・熟語問題の表示。空欄には読みがな付きの回答マス、漢字にはルビを表示する。
import type { Question } from '../data/questions'

export function QuestionPrompt({ question, answered = false }: { question: Question; answered?: boolean }) {
  return (
    <div className="q-prompt">
      {question.parts.map((p, i) =>
        p.text != null ? (
          p.ruby ? (
            <ruby key={i} className="q-ruby">
              {p.text}
              <rt>{p.ruby}</rt>
            </ruby>
          ) : (
            <span key={i} className="q-text">
              {p.text}
            </span>
          )
        ) : (
          <span key={i} className="q-blank">
            <span className="q-reading">{p.blank!.reading}</span>
            <span className={`q-box ${answered ? 'q-box-answered' : ''}`}>{answered ? question.char : ''}</span>
          </span>
        )
      )}
    </div>
  )
}
