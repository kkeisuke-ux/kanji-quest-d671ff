// はじめてのチュートリアル（第55回）。プロフィールごとに1回だけ、ホームに入る前に出す。
// ねらいは3つ:
//   1. 書き方（指も使うか、ペンだけか）を、意味が分かったうえで自分で選ばせる
//   2. 「なんで×になるの？」を先に知っておく（あとで理不尽に感じないように）
//   3. 何をがんばると何がもらえるか（称号・級）と、どこから始めるかが分かる
// 文章はぜんぶ小学生が読める言葉にする。漢字は使ってよいが、言い回しをやさしくする。
import { useState } from 'react'
import { getAppFlags, setAllowTouchInk } from '../config/appFlags'
import { navigate } from '../state/store'
import { Button } from '../ui/components'

interface Props {
  onDone: () => void
}

const LAST_STEP = 4

export function Tutorial({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [touch, setTouch] = useState(getAppFlags().allowTouchInk)

  const choose = async (value: boolean) => {
    setTouch(value)
    await setAllowTouchInk(value)
  }

  const finish = async (to: 'stages' | 'home') => {
    await onDone()
    navigate({ name: to === 'stages' ? 'stages' : 'home' })
  }

  return (
    <div className="screen tutorial-screen">
      <div className="tutorial-card">
        <div className="tutorial-dots">
          {Array.from({ length: LAST_STEP + 1 }, (_, i) => (
            <span key={i} className={`tutorial-dot${i === step ? ' on' : ''}${i < step ? ' done' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">✏️</p>
            <h2>かんじクエストへ ようこそ！</h2>
            <p className="tutorial-lead">
              かんじを 書いて れんしゅうして、テストで 100てんを めざすアプリだよ。
              かんじを おぼえると コインが たまって、なかまが ふえていくよ。
            </p>
            <p className="tutorial-note">はじめる まえに、4つだけ 大事なことを つたえるね。</p>
          </div>
        )}

        {step === 1 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🖊️</p>
            <h2>どうやって 書く？</h2>
            <p className="tutorial-lead">じぶんに あうほうを えらんでね。あとで「せってい」から かえられるよ。</p>
            <div className="tutorial-choices">
              <button
                className={`tutorial-choice${!touch ? ' selected' : ''}`}
                onClick={() => void choose(false)}
              >
                <span className="tutorial-choice-icon">🖊️</span>
                <span className="tutorial-choice-title">ペンだけで 書く</span>
                <span className="tutorial-choice-sub">
                  Apple Pencil だけが 線になるよ。
                  <b>手のひらを ついても、ゆびが あたっても、線に ならない</b>から、
                  えんぴつと おなじように 手を おいて 書けるよ。
                </span>
                <span className="tutorial-choice-rec">← ペンが あるなら こっち</span>
              </button>
              <button
                className={`tutorial-choice${touch ? ' selected' : ''}`}
                onClick={() => void choose(true)}
              >
                <span className="tutorial-choice-icon">👆</span>
                <span className="tutorial-choice-title">ゆびでも 書けるようにする</span>
                <span className="tutorial-choice-sub">
                  ペンが なくても ゆびで 書けるよ。
                  そのかわり <b>手のひらが 画面に ついたら、それも 線に なっちゃう</b>。
                  手を うかせて 書いてね。
                </span>
                <span className="tutorial-choice-rec">← ペンが ないときは こっち</span>
              </button>
            </div>
            <p className="tutorial-note">
              いま えらんでいるのは「{touch ? 'ゆびでも 書ける' : 'ペンだけ'}」だよ。
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🙅</p>
            <h2>×に なるのは どんなとき？</h2>
            <p className="tutorial-lead">かたちが あっていても、つぎのときは ×に なるよ。</p>
            <ul className="tutorial-list">
              <li>
                <b>かきじゅん</b>が ちがうとき
              </li>
              <li>
                <b>せんの むき</b>が ぎゃくのとき（右から左に 書いた など）
              </li>
              <li>
                かたちや <b>バランス</b>が くずれているとき（はみ出す・ちいさすぎる など）
              </li>
            </ul>
            <p className="tutorial-note">
              だから <b>「れんしゅうする」で お手本を よく見てから</b> 書くのが 近道だよ。
              なぞる れんしゅうでは かきじゅんの ○×は つけないから、あんしんして なぞってね。
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🏅</p>
            <h2>しょうごう と レベル</h2>
            <div className="tutorial-two">
              <div className="tutorial-half">
                <p className="tutorial-half-title">🏅 しょうごう</p>
                <p>
                  <b>まとめテストで 100てん</b>を とるたびに、しょうごうが 1つ 上がるよ。
                  さいしょは「級（きゅう）」、すすむと「段（だん）」になって、
                  いちばん上は <b>かんじ王</b>！ ぜんぶで 30こ あるよ。
                </p>
              </div>
              <div className="tutorial-half">
                <p className="tutorial-half-title">📗 レベル</p>
                <p>
                  <b>５もんテストで 100てん</b>を そろえていくと、
                  「1年生 一学期」のように <b>どこまで できたか</b>が レベルで 出るよ。
                </p>
              </div>
            </div>
            <p className="tutorial-note">
              しょうごうも レベルも、じぶんの なまえの よこに ついて、みんな画面でも 見られるよ。
            </p>
            <div className="tutorial-order">
              <p className="tutorial-order-title">すすめる じゅんばん</p>
              <div className="tutorial-order-row">
                <span className="tutorial-order-step">
                  <b>①</b> れんしゅう
                  <small>お手本を なぞって おぼえる</small>
                </span>
                <span className="tutorial-order-arrow">→</span>
                <span className="tutorial-order-step">
                  <b>②</b> ５もんテスト
                  <small>おぼえた 5字を ためす</small>
                </span>
                <span className="tutorial-order-arrow">→</span>
                <span className="tutorial-order-step">
                  <b>③</b> まとめテスト
                  <small>たくさん まとめて ためす</small>
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🎒</p>
            <h2>さいごに、2つだけ</h2>
            <ul className="tutorial-list">
              <li>
                <b>きろくは この タブレットの 中</b>に しまわれるよ。べつの タブレットで つかいたいときは、
                「せってい」から データを もっていけるよ。
              </li>
              <li>
                音を けしたり、○×の きびしさを かえたりも <b>「せってい」</b>で できるよ。
                ホームの 右上に あるからね。
              </li>
            </ul>
            <p className="tutorial-start-lead">じゅんび OK！ どこから はじめる？</p>
            <div className="tutorial-start">
              <button className="tutorial-start-main" onClick={() => void finish('stages')}>
                <span className="tutorial-start-icon">✏️</span>
                <span className="tutorial-start-title">れんしゅうする</span>
                <span className="tutorial-start-sub">まずは ここから。れんしゅう → ５もんテスト → まとめテスト の じゅんばん</span>
              </button>
              <button className="tutorial-start-sub-btn" onClick={() => void finish('home')}>
                ホームを 見てみる
              </button>
            </div>
          </div>
        )}

        {step < LAST_STEP && (
          <div className="tutorial-nav">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                もどる
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={() => setStep(step + 1)}>つぎへ</Button>
          </div>
        )}
      </div>
    </div>
  )
}
