import { useQuizApp } from '@/context/quiz-app-context'
import { RankingScreen } from '@/pages/RankingScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ranking')({
  component: RankingRoute,
})

function RankingRoute() {
  const { goHome, isRankingPreviewMode, rankingEntries, setRankings } = useQuizApp()

  return (
    <RankingScreen
      entries={rankingEntries}
      isPreviewMode={isRankingPreviewMode}
      onBack={goHome}
      onClear={() => setRankings([])}
    />
  )
}
