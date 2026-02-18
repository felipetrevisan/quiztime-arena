import { useQuizApp } from '@/context/quiz-app-context'
import { FinalScreen } from '@/pages/FinalScreen'
import { getBadge, getComment } from '@/utils/scoring'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bea/final')({
  component: BeaFinalRoute,
})

function BeaFinalRoute() {
  const {
    categoryTotals,
    finalPercent,
    frameRef,
    goCategories,
    handlePlayAgain,
    setSelectedLevelId,
  } = useQuizApp()

  return (
    <FinalScreen
      score={categoryTotals.score}
      total={categoryTotals.total}
      badge={getBadge(finalPercent)}
      comment={getComment(finalPercent)}
      frameRef={frameRef}
      onPlayAgain={handlePlayAgain}
      onChangeCategory={() => {
        setSelectedLevelId('')
        goCategories()
      }}
    />
  )
}
