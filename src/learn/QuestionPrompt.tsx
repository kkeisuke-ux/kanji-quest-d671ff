// 文脈・熟語問題の表示。空欄には読みがな付きの回答マスを表示する（仕様 §11）。
import type { Question } from '../data/questions'

export function QuestionPrompt({ question, answered = false }: { question: Question; answered?: boolean }) {
  return (
    <div className="q-prompt">
      {question.parts.map((p, i) =>
        p.text != null ? (
          <span key={i} className="q-text">
            {p.text}
          </span>
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
