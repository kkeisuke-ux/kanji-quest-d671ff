import { useEffect, useState } from 'react'
import { loadAppFlags } from './config/appFlags'
import { loadJudgeOverrides } from './config/judgeRuntime'
import { migrateCoinDenomination } from './game/logic'
import { setBgmScene } from './sound/sound'
import { navigate, useAppState, type Route } from './state/store'
import { Toasts } from './ui/components'
import { EvolutionModal } from './ui/EvolutionModal'
import { ProfileSelect } from './screens/ProfileSelect'
import { Home } from './screens/Home'
import { StageMap } from './screens/StageMap'
import { TestsHub } from './screens/TestsHub'
import { LearnFlow } from './screens/LearnFlow'
import { StageTestScreen, TermTestScreen } from './screens/Tests'
import { Review } from './screens/Review'
import { UnknownList } from './screens/UnknownList'
import { Gacha } from './screens/Gacha'
import { Friends } from './screens/Friends'
import { Dex } from './screens/Dex'
import { Minna } from './screens/Minna'
import { Settings } from './screens/Settings'
import { PencilDiag } from './screens/PencilDiag'
import { JudgeDebug } from './screens/JudgeDebug'

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'profiles':
      return <ProfileSelect />
    case 'home':
      return <Home />
    case 'stages':
      return <StageMap />
    case 'tests':
      return <TestsHub />
    case 'learn':
      return <LearnFlow stageId={route.stageId} startIndex={route.startIndex} />
    case 'stageTest':
      return <StageTestScreen stageId={route.stageId} />
    case 'termTest':
      return <TermTestScreen termId={route.termId} />
    case 'review':
      return <Review source={route.source} chars={route.chars} />
    case 'unknownList':
      return <UnknownList />
    case 'gacha':
      return <Gacha />
    case 'friends':
      return <Friends />
    case 'dex':
      return <Dex />
    case 'minna':
      return <Minna />
    case 'settings':
      return <Settings />
    case 'pencilDiag':
      return <PencilDiag />
    case 'judgeDebug':
      return <JudgeDebug />
  }
}

export default function App() {
  const route = useAppState((s) => s.route)
  const profileId = useAppState((s) => s.profileId)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    void Promise.all([loadJudgeOverrides(), loadAppFlags()])
      .then(() => migrateCoinDenomination())
      .then(() => setBooted(true))
  }, [])

  useEffect(() => {
    if (booted && !profileId && route.name !== 'profiles') navigate({ name: 'profiles' })
  }, [booted, profileId, route])

  // BGMのシーン切替: 学習・テスト系の画面では練習用の曲、それ以外はホーム用の曲
  useEffect(() => {
    const practiceScreens = ['learn', 'stageTest', 'termTest', 'review', 'pencilDiag', 'judgeDebug']
    setBgmScene(practiceScreens.includes(route.name) ? 'practice' : 'home')
  }, [route])

  if (!booted) return <div className="loading-view">よみこみちゅう…</div>

  return (
    <div className="app">
      <RouteView route={route} />
      <Toasts />
      <EvolutionModal />
    </div>
  )
}
