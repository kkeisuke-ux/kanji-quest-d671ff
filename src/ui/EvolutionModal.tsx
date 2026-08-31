// レベルアップ演出（2026-08-08 レベル=姿システムに対応）。
// レベルが上がるたびに姿が変わるので、毎回この演出でわくわくさせる。
// いまの姿 → 光 → 新しい姿。最終レベル到達時はいちばん豪華な音。
import { useEffect, useState } from 'react'
import { setPendingEvolution, useAppState, type PendingEvolution } from '../state/store'
import { FORM_LEVELS, MAX_LEVEL, nameForLevel, nextFormLevel, stageForLevel } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { playGrand, playPerfect } from '../sound/sound'
import { Button } from './components'

export function queueLevelUp(speciesId: string, fromLevel: number, toLevel: number) {
  setPendingEvolution({ speciesId, fromLevel, toLevel, name: nameForLevel(speciesId, fromLevel) })
}

export function EvolutionModal() {
  const pending = useAppState((s) => s.pendingEvolution)
  const [phase, setPhase] = useState<'before' | 'flash' | 'after'>('before')
  const [current, setCurrent] = useState<PendingEvolution | null>(null)

  useEffect(() => {
    if (!pending) {
      setCurrent(null)
      return
    }
    setCurrent(pending)
    setPhase('before')
    const t1 = window.setTimeout(() => setPhase('flash'), 1300)
    const t2 = window.setTimeout(() => setPhase('after'), 2100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [pending])

  useEffect(() => {
    if (phase !== 'after' || !current) return
    // 姿が変わった回はいちばん豪華な音（L3/L5/L20/L50/L99）
    if (FORM_LEVELS.includes(current.toLevel)) playGrand()
    else playPerfect()
  }, [phase, current])

  if (!current) return null
  const newName = nameForLevel(current.speciesId, current.toLevel)
  // 形態が変わった回だけ「すがたが かわった！」にする（レベルだけ上がった回と区別する）
  const formChanged = stageForLevel(current.toLevel) > stageForLevel(current.fromLevel)
  const nf = nextFormLevel(current.toLevel)

  const advance = () => {
    if (phase === 'before') setPhase('flash')
    else if (phase === 'flash') setPhase('after')
  }

  return (
    <div className="modal-back evo-back" onClick={advance}>
      <div className="modal-panel evo-panel" onClick={(e) => e.stopPropagation()}>
        {phase === 'before' && (
          <div className="evo-stage" onClick={advance}>
            <div className="evo-glow">
              <CharacterSprite speciesId={current.speciesId} level={current.fromLevel} size={150} />
            </div>
            <p className="evo-text">
              {formChanged ? `…おや？ ${current.name}の ようすが…！` : `${current.name}に ちからが みなぎる…！`}
            </p>
          </div>
        )}
        {phase === 'flash' && (
          <div className="evo-stage" onClick={advance}>
            <div className="evo-flash" />
            <p className="evo-text">！！</p>
          </div>
        )}
        {phase === 'after' && (
          <div className="evo-stage">
            <div className="evo-pop">
              <CharacterSprite speciesId={current.speciesId} level={current.toLevel} size={175} />
            </div>
            <p className="evo-text evo-text-big">
              {newName}は レベル{current.toLevel}に あがった！
            </p>
            <p className="evo-text">
              {formChanged ? 'すがたが かわった！' : 'もっと たくましく なった！'}
              {current.toLevel >= MAX_LEVEL
                ? '（さいごの すがた！）'
                : formChanged && nf != null
                  ? `（つぎは レベル${nf}で また かわるよ）`
                  : ''}
            </p>
            <Button onClick={() => setPendingEvolution(null)}>やったー！</Button>
          </div>
        )}
      </div>
    </div>
  )
}
